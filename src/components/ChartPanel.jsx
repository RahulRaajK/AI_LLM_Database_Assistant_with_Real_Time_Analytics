import React, { useMemo } from 'react';
import {
    Chart as ChartJS,
    CategoryScale,
    LinearScale,
    BarElement,
    LineElement,
    PointElement,
    ArcElement,
    Title,
    Tooltip,
    Legend,
    Filler,
} from 'chart.js';
import { Bar, Line, Pie } from 'react-chartjs-2';

ChartJS.register(
    CategoryScale,
    LinearScale,
    BarElement,
    LineElement,
    PointElement,
    ArcElement,
    Title,
    Tooltip,
    Legend,
    Filler
);

const CHART_COLORS = [
    '#4f6ef7', '#7c5cf7', '#a855f7', '#ec4899', '#f43f5e',
    '#f97316', '#eab308', '#22c55e', '#14b8a6', '#06b6d4',
    '#3b82f6', '#8b5cf6', '#d946ef', '#f472b6', '#fb923c',
];

function ChartPanel({ data, type }) {
    const chartData = useMemo(() => {
        if (!data || data.length === 0) return null;

        const columns = Object.keys(data[0]);

        // Find a good label column (first string-like column) and a value column (first numeric column)
        let labelCol = null;
        let valueCols = [];

        for (const col of columns) {
            const sample = data[0][col];
            if (typeof sample === 'number' || !isNaN(Number(sample))) {
                valueCols.push(col);
            } else if (!labelCol) {
                labelCol = col;
            }
        }

        // If no string column for labels, use the first column
        if (!labelCol) {
            labelCol = columns[0];
            valueCols = valueCols.filter((c) => c !== labelCol);
        }

        // If no numeric columns, try to convert
        if (valueCols.length === 0) {
            // Take second column as values
            valueCols = columns.length > 1 ? [columns[1]] : [columns[0]];
        }

        const labels = data.slice(0, 50).map((row) => {
            const val = row[labelCol];
            if (val === null || val === undefined) return 'N/A';
            const str = String(val);
            return str.length > 25 ? str.substring(0, 22) + '...' : str;
        });

        if (type === 'pie') {
            // For pie, use the first value column
            const vCol = valueCols[0];
            const values = data.slice(0, 15).map((row) => Number(row[vCol]) || 0);
            const pieLabels = labels.slice(0, 15);

            return {
                labels: pieLabels,
                datasets: [
                    {
                        data: values,
                        backgroundColor: CHART_COLORS.slice(0, pieLabels.length),
                        borderWidth: 2,
                        borderColor: '#ffffff',
                    },
                ],
            };
        }

        // For bar and line charts
        const datasets = valueCols.slice(0, 3).map((col, i) => ({
            label: col,
            data: data.slice(0, 50).map((row) => Number(row[col]) || 0),
            backgroundColor: type === 'line'
                ? `${CHART_COLORS[i]}22`
                : CHART_COLORS[i],
            borderColor: CHART_COLORS[i],
            borderWidth: 2,
            borderRadius: type === 'bar' ? 6 : 0,
            fill: type === 'line',
            tension: 0.4,
            pointRadius: 3,
            pointHoverRadius: 6,
        }));

        return { labels, datasets };
    }, [data, type]);

    if (!chartData) {
        return (
            <div className="empty-state">
                <div className="empty-state-icon">📊</div>
                <div className="empty-state-title">No data to chart</div>
            </div>
        );
    }

    const commonOptions = {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
            legend: {
                position: 'top',
                labels: {
                    font: { family: 'Inter', size: 12, weight: 500 },
                    color: '#5a607a',
                    usePointStyle: true,
                    padding: 16,
                },
            },
            tooltip: {
                backgroundColor: '#1a1d2e',
                titleFont: { family: 'Inter', size: 12, weight: 600 },
                bodyFont: { family: 'JetBrains Mono', size: 11 },
                padding: 12,
                cornerRadius: 8,
                displayColors: true,
            },
        },
        scales: type !== 'pie' ? {
            x: {
                grid: { color: '#eef1f8' },
                ticks: { font: { family: 'Inter', size: 10 }, color: '#8b90a8', maxRotation: 45 },
            },
            y: {
                grid: { color: '#eef1f8' },
                ticks: { font: { family: 'JetBrains Mono', size: 11 }, color: '#8b90a8' },
                beginAtZero: true,
            },
        } : undefined,
    };

    return (
        <div className="chart-container">
            {type === 'bar' && <Bar data={chartData} options={commonOptions} />}
            {type === 'line' && <Line data={chartData} options={commonOptions} />}
            {type === 'pie' && (
                <div style={{ width: 400, height: 300 }}>
                    <Pie data={chartData} options={{ ...commonOptions, plugins: { ...commonOptions.plugins, legend: { ...commonOptions.plugins.legend, position: 'right' } } }} />
                </div>
            )}
        </div>
    );
}

export default ChartPanel;
