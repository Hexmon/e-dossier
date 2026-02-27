"use client";

import { useRef, useEffect, useState } from "react";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  LineController,
  Filler,
} from "chart.js";
import { labels } from "@/constants/app.constants";
import {
  addThemeChangedListener,
  getChartThemePalette,
  withAlpha,
} from "@/components/performance_graph/chartTheme";

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  LineController,
  Filler
);

export default function DisciplineChart({
  data: disciplineData,
  averageData,
  cadetTermPresence,
}: {
  data: number[];
  averageData: number[];
  cadetTermPresence: boolean[];
}) {
  const chartRef = useRef<HTMLCanvasElement | null>(null);
  const chartInstance = useRef<any>(null);
  const [stats, setStats] = useState({
    highest: 0,
    average: 0,
    lowest: null as number | null,
    highestTerm: "",
    lowestTerm: "",
  });
  const [themeVersion, setThemeVersion] = useState(0);

  useEffect(() => {
    if (!Array.isArray(disciplineData) || disciplineData.length === 0) return;
    const available = disciplineData
      .map((value, index) => ({ value, index }))
      .filter((item) => Boolean(cadetTermPresence[item.index]));
    if (!available.length) {
      setStats({
        highest: 0,
        average: 0,
        lowest: null,
        highestTerm: "-",
        lowestTerm: "-",
      });
      return;
    }
    const values = available.map((item) => item.value);
    const highest = Math.max(...values);
    const average = values.reduce((a, b) => a + b, 0) / values.length;
    const lowest = values.length < 2 ? null : Math.min(...values);
    const highestIndex = available.find((item) => item.value === highest)?.index ?? 0;
    const lowestIndex =
      lowest === null
        ? -1
        : available.find((item) => item.value === lowest)?.index ?? -1;

    setStats({
      highest,
      average,
      lowest,
      highestTerm: labels[highestIndex] ?? `Term ${highestIndex + 1}`,
      lowestTerm: lowestIndex < 0 ? "-" : labels[lowestIndex] ?? `Term ${lowestIndex + 1}`,
    });
  }, [disciplineData, cadetTermPresence]);

  useEffect(() => {
    const cleanup = addThemeChangedListener(() => {
      setThemeVersion((prev) => prev + 1);
    });
    return cleanup;
  }, []);

  useEffect(() => {
    if (!chartRef.current) return;

    if (chartInstance.current) {
      chartInstance.current.destroy();
      chartInstance.current = null;
    }

    const ctx = chartRef.current.getContext("2d");
    if (!ctx) return;
    const theme = getChartThemePalette();
    const cadetLineColor = theme.primary;
    const averageLineColor = theme.destructive;

    const gradientBg = ctx.createLinearGradient(0, 0, 0, 400);
    gradientBg.addColorStop(0, withAlpha(cadetLineColor, 0.15));
    gradientBg.addColorStop(1, withAlpha(cadetLineColor, 0));

    const gradientAvgBg = ctx.createLinearGradient(0, 0, 0, 400);
    gradientAvgBg.addColorStop(0, withAlpha(averageLineColor, 0.15));
    gradientAvgBg.addColorStop(1, withAlpha(averageLineColor, 0));

    chartInstance.current = new ChartJS(ctx as any, {
      type: "line",
      data: {
        labels: labels,
        datasets: [
          {
            label: "Cadet Discipline Score",
            data: disciplineData,
            borderColor: cadetLineColor,
            backgroundColor: gradientBg,
            borderWidth: 3,
            fill: true,
            tension: 0.4,
            pointRadius: 6,
            pointBackgroundColor: cadetLineColor,
            pointBorderColor: theme.pointBorder,
            pointBorderWidth: 2,
            pointHoverRadius: 8,
            pointHoverBackgroundColor: cadetLineColor,
            hoverBorderWidth: 4,
          },
          {
            label: "Course Average",
            data: averageData,
            borderColor: averageLineColor,
            backgroundColor: gradientAvgBg,
            borderWidth: 3,
            fill: true,
            tension: 0.4,
            pointRadius: 6,
            pointBackgroundColor: averageLineColor,
            pointBorderColor: theme.pointBorder,
            pointBorderWidth: 2,
            pointHoverRadius: 8,
            pointHoverBackgroundColor: averageLineColor,
            hoverBorderWidth: 4,
            borderDash: [6, 6],
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        interaction: { intersect: false, mode: "index" },
        plugins: {
          legend: {
            display: true,
            position: "top",
            labels: {
              font: { size: 12, weight: "600" as any },
              color: theme.mutedForeground,
              padding: 20,
              usePointStyle: true,
              pointStyle: "circle",
            },
          },
          tooltip: {
            backgroundColor: theme.tooltipBackground,
            titleFont: { size: 13, weight: "bold" as any },
            bodyFont: { size: 12 },
            padding: 12,
            displayColors: true,
            borderColor: cadetLineColor,
            borderWidth: 1,
            callbacks: {
              label: function (context: any) {
                return `${context.dataset.label}: ${context.parsed.y}/126`;
              },
            },
          },
        },
        scales: {
          x: {
            grid: { display: true, color: withAlpha(theme.border, 0.55) },
            ticks: {
              font: { size: 11, weight: "500" as any },
              color: theme.mutedForeground,
              padding: 8,
            },
          },
          y: {
            beginAtZero: true,
            max: 126,
            ticks: {
              stepSize: 21,
              font: { size: 11, weight: "500" as any },
              color: theme.mutedForeground,
              padding: 8,
            },
            grid: { color: withAlpha(theme.border, 0.75) },
          },
        },
      },
    });

    return () => {
      if (chartInstance.current) {
        chartInstance.current.destroy();
        chartInstance.current = null;
      }
    };
  }, [disciplineData, averageData, themeVersion]);

  return (
    <div className="w-full max-w-4xl mx-auto p-6">
      <div className="bg-card rounded-2xl shadow-lg border border-border overflow-hidden">
        <div className="bg-primary px-6 py-6">
          <h2 className="text-2xl font-bold text-primary-foreground tracking-tight">
            DISCIPLINE
          </h2>
          <p className="text-primary-foreground/80 text-sm mt-1">
            Discipline performance tracking (negative points)
          </p>
        </div>

        <div className="p-6">
          <div className="relative w-full h-96 bg-background rounded-xl shadow-sm border border-border">
            <canvas ref={chartRef}></canvas>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-4 px-6 pb-6">
          <div className="bg-primary/10 rounded-lg p-4 border border-primary/20">
            <p className="text-xs font-semibold text-primary uppercase tracking-wide">
              Highest
            </p>
            <p className="text-2xl font-bold text-primary mt-1">{stats.highest}/126</p>
            <p className="text-xs text-primary mt-1">{stats.highestTerm}</p>
          </div>
          <div className="bg-success/10 rounded-lg p-4 border border-success/20">
            <p className="text-xs font-semibold text-success uppercase tracking-wide">
              Average
            </p>
            <p className="text-2xl font-bold text-success mt-1">
              {stats.average.toFixed(1)}
            </p>
            <p className="text-xs text-success mt-1">Overall</p>
          </div>
          <div className="bg-info/10 rounded-lg p-4 border border-info/20">
            <p className="text-xs font-semibold text-info uppercase tracking-wide">
              Lowest
            </p>
            <p className="text-2xl font-bold text-info mt-1">
              {stats.lowest === null ? "-" : `${stats.lowest}/126`}
            </p>
            <p className="text-xs text-info mt-1">{stats.lowestTerm}</p>
          </div>
        </div>
      </div>
    </div>
  );
}
