// components/performance_graph/DisciplineChart.tsx
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
import { computeAverageMarks } from "@/components/performance_graph/Data";
import { addThemeChangedListener, getChartThemePalette, withAlpha } from "@/components/performance_graph/chartTheme";

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

export default function DisciplineChart({ data: disciplineData }: { data: number[] }) {
  const chartRef = useRef<HTMLCanvasElement | null>(null);
  const chartInstance = useRef<any>(null);
  const [stats, setStats] = useState({
    highest: 0,
    average: 0,
    lowest: 0,
    highestTerm: "",
  });
  const [averageData] = useState(computeAverageMarks("discipline"));
  const [themeVersion, setThemeVersion] = useState(0);

  useEffect(() => {
    if (!Array.isArray(disciplineData) || disciplineData.length === 0) return;
    const highest = Math.max(...disciplineData);
    const average = disciplineData.reduce((a, b) => a + b, 0) / disciplineData.length;
    const lowest = Math.min(...disciplineData);
    const highestIndex = disciplineData.indexOf(highest);

    setStats({
      highest,
      average,
      lowest,
      highestTerm: labels[highestIndex] ?? `Term ${highestIndex + 1}`,
    });
  }, [disciplineData]);

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

    const gradientBg = ctx.createLinearGradient(0, 0, 0, 400);
    gradientBg.addColorStop(0, withAlpha(theme.primary, 0.15));
    gradientBg.addColorStop(1, withAlpha(theme.primary, 0));

    const gradientAvgBg = ctx.createLinearGradient(0, 0, 0, 400);
    gradientAvgBg.addColorStop(0, withAlpha(theme.destructive, 0.15));
    gradientAvgBg.addColorStop(1, withAlpha(theme.destructive, 0));

    chartInstance.current = new ChartJS(ctx as any, {
      type: "line",
      data: {
        labels: labels,
        datasets: [
          {
            label: "Cadet Discipline Score",
            data: disciplineData,
            borderColor: theme.primary,
            backgroundColor: gradientBg,
            borderWidth: 3,
            fill: true,
            tension: 0.4,
            pointRadius: 6,
            pointBackgroundColor: theme.primary,
            pointBorderColor: theme.pointBorder,
            pointBorderWidth: 2,
            pointHoverRadius: 8,
            pointHoverBackgroundColor: theme.info,
            hoverBorderWidth: 4,
          },
          {
            label: "Course Average",
            data: averageData,
            borderColor: theme.destructive,
            backgroundColor: gradientAvgBg,
            borderWidth: 3,
            fill: true,
            tension: 0.4,
            pointRadius: 6,
            pointBackgroundColor: theme.destructive,
            pointBorderColor: theme.pointBorder,
            pointBorderWidth: 2,
            pointHoverRadius: 8,
            pointHoverBackgroundColor: theme.destructive,
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
            borderColor: theme.primary,
            borderWidth: 1,
            callbacks: {
              label: function (context: any) {
                return `Score: ${context.parsed.y}/15`;
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
            max: 15,
            ticks: { stepSize: 5, font: { size: 11, weight: "500" as any }, color: theme.mutedForeground, padding: 8 },
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
        {/* Header */}
        <div className="bg-primary px-6 py-6">
          <h2 className="text-2xl font-bold text-primary-foreground tracking-tight">⚖️ DISCIPLINE</h2>
          <p className="text-primary-foreground/80 text-sm mt-1">Discipline Performance Tracking (Negative Points)</p>
        </div>

        {/* Chart Container */}
        <div className="p-6">
          <div className="relative w-full h-96 bg-background rounded-xl shadow-sm border border-border">
            <canvas ref={chartRef}></canvas>
          </div>
        </div>

        {/* Stats Footer */}
        <div className="grid grid-cols-3 gap-4 px-6 pb-6">
          <div className="bg-primary/10 rounded-lg p-4 border border-primary/20">
            <p className="text-xs font-semibold text-primary uppercase tracking-wide">Course Highest</p>
            <p className="text-2xl font-bold text-primary mt-1">{stats.highest}/15</p>
            <p className="text-xs text-primary mt-1">{stats.highestTerm}</p>
          </div>
          <div className="bg-success/10 rounded-lg p-4 border border-success/20">
            <p className="text-xs font-semibold text-success uppercase tracking-wide">Course Average</p>
            <p className="text-2xl font-bold text-success mt-1">{stats.average.toFixed(1)}</p>
            <p className="text-xs text-success mt-1">Overall</p>
          </div>
          <div className="bg-info/10 rounded-lg p-4 border border-info/20">
            <p className="text-xs font-semibold text-info uppercase tracking-wide">Course Lowest</p>
            <p className="text-2xl font-bold text-info mt-1">{stats.lowest}/15</p>
            <p className="text-xs text-info mt-1">Term 1</p>
          </div>
        </div>
      </div>
    </div>
  );
}
