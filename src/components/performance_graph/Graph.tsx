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


export default function Graph( { data: academics }: { data: number[] }) {
    const chartRef = useRef<HTMLCanvasElement>(null);
    const chartInstance = useRef<ChartJS<"line", number[], string>>(null);
    const [stats, setStats] = useState({
        highest: 0,
        average: 0,
        progress: 0,
        highestTerm: "",
    });
    const [averageData] = useState(computeAverageMarks("academics"));




    useEffect(() => {
        // Calculate stats dynamically
        const highest = Math.max(...academics);
        const average = academics.reduce((a, b) => a + b, 0) / academics.length;
        const firstValue = academics[0];
        const lastValue = academics[academics.length - 1];
        const progress = ((lastValue - firstValue) / firstValue) * 100;
        const highestIndex = academics.indexOf(highest);


        setStats({
            highest: highest,
            average: average,
            progress: progress,
            highestTerm: labels[highestIndex],
        });
    }, []);


    useEffect(() => {
        if (chartRef.current) {
            if (chartInstance.current) {
                chartInstance.current.destroy();
            }


            const ctx = chartRef.current.getContext("2d");


            // Create gradient background
            const gradientBg = ctx?.createLinearGradient(0, 0, 0, 400);
            gradientBg?.addColorStop(0, "rgba(99, 102, 241, 0.15)");
            gradientBg?.addColorStop(1, "rgba(99, 102, 241, 0)");

            // Create gradient background for average line
            const gradientAvgBg = ctx?.createLinearGradient(0, 0, 0, 400);
            gradientAvgBg?.addColorStop(0, "rgba(239, 68, 68, 0.15)");
            gradientAvgBg?.addColorStop(1, "rgba(239, 68, 68, 0)");


            chartInstance.current = new ChartJS(chartRef.current, {
                type: "line",
                data: {
                    labels: labels,
                    datasets: [
                        {
                            label: "GPA Score",
                            data: academics,
                            borderColor: "rgb(99, 102, 241)",
                            backgroundColor: gradientBg,
                            borderWidth: 3,
                            fill: true,
                            tension: 0.4,
                            pointRadius: 6,
                            pointBackgroundColor: "rgb(99, 102, 241)",
                            pointBorderColor: "#fff",
                            pointBorderWidth: 2,
                            pointHoverRadius: 8,
                            pointHoverBackgroundColor: "rgb(67, 56, 202)",
                            hoverBorderWidth: 4,
                        },
                        {
                            label: "Average Marks",
                            data: averageData,
                            borderColor: "rgb(239, 68, 68)",
                            backgroundColor: gradientAvgBg,
                            borderWidth: 3,
                            fill: true,
                            tension: 0.4,
                            pointRadius: 6,
                            pointBackgroundColor: "rgb(239, 68, 68)",
                            pointBorderColor: "#fff",
                            pointBorderWidth: 2,
                            pointHoverRadius: 8,
                            pointHoverBackgroundColor: "rgb(220, 38, 38)",
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
                                color: "rgb(75, 85, 99)",
                                padding: 20,
                                usePointStyle: true,
                                pointStyle: "circle",
                            },
                        },
                        tooltip: {
                            backgroundColor: "rgba(0, 0, 0, 0.8)",
                            titleFont: { size: 13, weight: "bold" },
                            bodyFont: { size: 12 },
                            padding: 12,
                            displayColors: true,
                            borderColor: "rgb(99, 102, 241)",
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
                                color: "rgba(0, 0, 0, 0.05)",
                            },
                            ticks: {
                                font: {
                                    size: 11,
                                    weight: 500,
                                },
                                color: "rgb(75, 85, 99)",
                                padding: 8,
                            },
                        },
                        y: {
                            beginAtZero: true,
                            max: 12,
                            ticks: {
                                stepSize: 3,
                                font: {
                                    size: 11,
                                    weight: 500,
                                },
                                color: "rgb(75, 85, 99)",
                                padding: 8,
                            },
                            grid: {
                                color: "rgba(0, 0, 0, 0.08)",
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
    }, [chartInstance, chartRef, academics, labels, averageData]);


    return (
        <div className="w-full max-w-4xl mx-auto p-6">
            <div className="bg-linear-to-br from-white to-slate-50 rounded-2xl shadow-lg border border-slate-100 overflow-hidden">
                {/* Header */}
                <div className="bg-linear-to-r from-indigo-600 to-indigo-700 px-6 py-6">
                    <h2 className="text-2xl font-bold text-white tracking-tight">
                        📚 ACADEMICS
                    </h2>
                    <p className="text-indigo-100 text-sm mt-1">
                        Academic Performance Tracking
                    </p>
                </div>


                {/* Chart Container */}
                <div className="p-6">
                    <div className="relative w-full h-96 bg-white rounded-xl shadow-sm border border-slate-100">
                        <canvas ref={chartRef}></canvas>
                    </div>
                </div>


                {/* Stats Footer */}
                <div className="grid grid-cols-3 gap-4 px-6 pb-6">
                    <div className="bg-indigo-50 rounded-lg p-4 border border-indigo-100">
                        <p className="text-xs font-semibold text-indigo-700 uppercase tracking-wide">
                            Highest
                        </p>
                        <p className="text-2xl font-bold text-indigo-600 mt-1">{stats.highest}/10</p>
                        <p className="text-xs text-indigo-600 mt-1">{stats.highestTerm}</p>
                    </div>
                    <div className="bg-green-50 rounded-lg p-4 border border-green-100">
                        <p className="text-xs font-semibold text-green-700 uppercase tracking-wide">
                            Average
                        </p>
                        <p className="text-2xl font-bold text-green-600 mt-1">{stats.average.toFixed(1)}</p>
                        <p className="text-xs text-green-600 mt-1">Overall</p>
                    </div>
                    <div className="bg-blue-50 rounded-lg p-4 border border-blue-100">
                        <p className="text-xs font-semibold text-blue-700 uppercase tracking-wide">
                            Progress
                        </p>
                        <p className="text-2xl font-bold text-blue-600 mt-1"> {stats.progress.toFixed(1)}%</p>
                        <p className="text-xs text-blue-600 mt-1">VI Term Growth</p>
                    </div>
                </div>
            </div>
        </div>
    );
}