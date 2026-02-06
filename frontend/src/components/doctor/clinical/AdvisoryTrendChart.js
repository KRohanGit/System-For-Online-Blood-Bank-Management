import React, { useEffect, useRef } from 'react';
import Chart from 'chart.js/auto';

const AdvisoryTrendChart = ({ data }) => {
  const chartRef = useRef(null);
  const chartInstance = useRef(null);

  useEffect(() => {
    if (!chartRef.current || !data || data.length === 0) return;

    const ctx = chartRef.current.getContext('2d');

    if (chartInstance.current) {
      chartInstance.current.destroy();
    }

    const labels = data.map(d => d.date);
    const accepted = data.map(d => d.accepted || 0);
    const overridden = data.map(d => d.overridden || 0);
    const deferred = data.map(d => d.deferred || 0);

    chartInstance.current = new Chart(ctx, {
      type: 'line',
      data: {
        labels,
        datasets: [
          {
            label: 'Accepted',
            data: accepted,
            borderColor: '#44ff44',
            backgroundColor: 'rgba(68, 255, 68, 0.1)',
            tension: 0.4
          },
          {
            label: 'Overridden',
            data: overridden,
            borderColor: '#ff4444',
            backgroundColor: 'rgba(255, 68, 68, 0.1)',
            tension: 0.4
          },
          {
            label: 'Deferred',
            data: deferred,
            borderColor: '#ffaa00',
            backgroundColor: 'rgba(255, 170, 0, 0.1)',
            tension: 0.4
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
              text: 'Count'
            }
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

export default AdvisoryTrendChart;
