import React, { useEffect, useRef } from 'react';
import Chart from 'chart.js/auto';

const OverrideFrequencyChart = ({ data }) => {
  const chartRef = useRef(null);
  const chartInstance = useRef(null);

  useEffect(() => {
    if (!chartRef.current || !data || data.length === 0) return;

    const ctx = chartRef.current.getContext('2d');

    if (chartInstance.current) {
      chartInstance.current.destroy();
    }

    const labels = data.map(d => d.date);
    const overrides = data.map(d => d.overrides);

    chartInstance.current = new Chart(ctx, {
      type: 'line',
      data: {
        labels,
        datasets: [{
          label: 'Overrides',
          data: overrides,
          borderColor: '#ff4444',
          backgroundColor: 'rgba(255, 68, 68, 0.1)',
          tension: 0.4,
          fill: true
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        scales: {
          y: {
            beginAtZero: true,
            title: {
              display: true,
              text: 'Count'
            }
          }
        },
        plugins: {
          legend: {
            display: false
          }
        }
      }
    });

    return () => {
      if (chartInstance.current) {
        chartInstance.current.destroy();
      }
    };
  }, [data]);

  return (
    <div style={{ height: '250px', position: 'relative' }}>
      <canvas ref={chartRef}></canvas>
    </div>
  );
};

export default OverrideFrequencyChart;
