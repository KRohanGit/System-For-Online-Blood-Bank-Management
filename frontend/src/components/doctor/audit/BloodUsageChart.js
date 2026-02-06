import React, { useEffect, useRef } from 'react';
import Chart from 'chart.js/auto';

const BloodUsageChart = ({ data }) => {
  const chartRef = useRef(null);
  const chartInstance = useRef(null);

  useEffect(() => {
    if (!chartRef.current || !data || data.length === 0) return;

    const ctx = chartRef.current.getContext('2d');

    if (chartInstance.current) {
      chartInstance.current.destroy();
    }

    const labels = data.map(d => d.bloodGroup);
    const used = data.map(d => d.used);
    const wasted = data.map(d => d.wasted);

    chartInstance.current = new Chart(ctx, {
      type: 'bar',
      data: {
        labels,
        datasets: [
          {
            label: 'Used',
            data: used,
            backgroundColor: '#44ff44',
            borderWidth: 1
          },
          {
            label: 'Wasted',
            data: wasted,
            backgroundColor: '#ff4444',
            borderWidth: 1
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        scales: {
          y: {
            beginAtZero: true,
            title: {
              display: true,
              text: 'Units'
            }
          },
          x: {
            stacked: false
          }
        },
        plugins: {
          legend: {
            position: 'bottom'
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

export default BloodUsageChart;
