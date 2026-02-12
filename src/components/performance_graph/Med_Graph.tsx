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

const data = [30, 20, 25, 42, 35, 38];


export default function MedGraph() {
    const chartRef = useRef<HTMLCanvasElement>(null);
    const chartInstance = useRef<ChartJS<"line", number[], string>>(null);
    const [stats, setStats] = useState({
        highest: 0,
        average: 0,
        progress: 0,
        highestTerm: "",
    });
    const [themeVersion, setThemeVersion] = useState(0);

    useEffect(() => {
        // Calculate stats dynamically
        const highest = Math.max(...data);
        const average = data.reduce((a, b) => a + b, 0) / data.length;
        const firstValue = data[0];
        const lastValue = data[data.length - 1];
        const progress = ((lastValue - firstValue) / firstValue) * 100;
        const highestIndex = data.indexOf(highest);

        setStats({
            highest: highest,
            average: average,
            progress: progress,
            highestTerm: labels[highestIndex],
        });
    }, []);

    useEffect(() => {
        const cleanup = addThemeChangedListener(() => {
            setThemeVersion((prev) => prev + 1);
        });
        return cleanup;
    }, []);

    useEffect(() => {
        if (chartRef.current) {
            if (chartInstance.current) {
                chartInstance.current.destroy();
            }

            const ctx = chartRef.current.getContext("2d");
            const theme = getChartThemePalette();

            // Create gradient background
            const gradientBg = ctx?.createLinearGradient(0, 0, 0, 400);
            gradientBg?.addColorStop(0, withAlpha(theme.primary, 0.15));
            gradientBg?.addColorStop(1, withAlpha(theme.primary, 0));

            chartInstance.current = new ChartJS(chartRef.current, {
                type: "line",
                data: {
                    labels: labels,
                    datasets: [
                        {
                            label: "Medical Score",
                            data: data,
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
                    ],
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    interaction: {
                        intersect: false,
                        mode: "index",
                    },
                    plugins: {
                        legend: {
                            display: true,
                            position: "top",
                            labels: {
                                font: {
                                    size: 12,
                                    weight: 600,
                                },
                                color: theme.mutedForeground,
                                padding: 20,
                                usePointStyle: true,
                                pointStyle: "circle",
                            },
                        },
                        tooltip: {
                            backgroundColor: theme.tooltipBackground,
                            titleFont: { size: 13, weight: "bold" },
                            bodyFont: { size: 12 },
                            padding: 12,
                            displayColors: true,
                            borderColor: theme.primary,
                            borderWidth: 1,
                            callbacks: {
                                label: function (context) {
                                    return `Score: ${context.parsed.y}/10`;
                                },
                            },
                        },
                    },
                    scales: {
                        x: {
                            grid: {
                                display: true,
                                color: withAlpha(theme.border, 0.55),
                            },
                            ticks: {
                                font: {
                                    size: 11,
                                    weight: 500,
                                },
                                color: theme.mutedForeground,
                                padding: 8,
                            },
                        },
                        y: {
                            beginAtZero: true,
                            max: 42,
                            ticks: {
                                stepSize: 14,
                                font: {
                                    size: 11,
                                    weight: 500,
                                },
                                color: theme.mutedForeground,
                                padding: 8,
                            },
                            grid: {
                                color: withAlpha(theme.border, 0.75),
                            },
                        },
                    },
                },
            });
        }

        return () => {
            if (chartInstance.current) {
                chartInstance.current.destroy();
            }
        };
    }, [themeVersion]);

    return (
        <div className="w-full max-w-4xl mx-auto p-6">
            <div className="bg-card rounded-2xl shadow-lg border border-border overflow-hidden">
                {/* Header */}
                <div className="bg-primary px-6 py-6">
                    <h2 className="text-2xl font-bold text-primary-foreground tracking-tight">
                        🏥 MEDICAL
                    </h2>
                    <p className="text-primary-foreground/80 text-sm mt-1">
                        Medical Fitness Performance Tracking
                    </p>
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
                        <p className="text-xs font-semibold text-primary uppercase tracking-wide">
                            Highest
                        </p>
                        <p className="text-2xl font-bold text-primary mt-1">{stats.highest}/42</p>
                        <p className="text-xs text-primary mt-1">{stats.highestTerm}</p>
                    </div>
                    <div className="bg-success/10 rounded-lg p-4 border border-success/20">
                        <p className="text-xs font-semibold text-success uppercase tracking-wide">
                            Average
                        </p>
                        <p className="text-2xl font-bold text-success mt-1">{stats.average.toFixed(1)}</p>
                        <p className="text-xs text-success mt-1">Overall</p>
                    </div>
                    <div className="bg-info/10 rounded-lg p-4 border border-info/20">
                        <p className="text-xs font-semibold text-info uppercase tracking-wide">
                            Progress
                        </p>
                        <p className="text-2xl font-bold text-info mt-1"> {stats.progress.toFixed(1)}%</p>
                        <p className="text-xs text-info mt-1">VI Term Growth</p>
                    </div>
                </div>
            </div>
        </div>
    );
}
