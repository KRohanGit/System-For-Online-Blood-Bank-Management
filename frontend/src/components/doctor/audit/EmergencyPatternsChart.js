import React, { useEffect, useRef } from 'react';
import Chart from 'chart.js/auto';

const EmergencyPatternsChart = ({ data }) => {
  const chartRef = useRef(null);
  const chartInstance = useRef(null);

  useEffect(() => {
    if (!chartRef.current || !data || data.length === 0) return;

    const ctx = chartRef.current.getContext('2d');

    if (chartInstance.current) {
      chartInstance.current.destroy();
    }

    const labels = data.map(d => d.date);
    const critical = data.map(d => d.critical || 0);
    const urgent = data.map(d => d.urgent || 0);
    const moderate = data.map(d => d.moderate || 0);

    chartInstance.current = new Chart(ctx, {
      type: 'bar',
      data: {
        labels,
        datasets: [
          {
            label: 'Critical',
            data: critical,
            backgroundColor: '#ff4444',
            stack: 'Stack 0'
          },
          {
            label: 'Urgent',
            data: urgent,
            backgroundColor: '#ffaa00',
            stack: 'Stack 0'
          },
          {
            label: 'Moderate',
            data: moderate,
            backgroundColor: '#4488ff',
            stack: 'Stack 0'
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        scales: {
          y: {
            beginAtZero: true,
            stacked: true,
            title: {
              display: true,
              text: 'Count'
            }
          },
          x: {
            stacked: true
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

export default EmergencyPatternsChart;
