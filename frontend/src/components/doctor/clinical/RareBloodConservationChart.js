import React, { useEffect, useRef } from 'react';
import Chart from 'chart.js/auto';

const RareBloodConservationChart = ({ data }) => {
  const chartRef = useRef(null);
  const chartInstance = useRef(null);

  useEffect(() => {
    if (!chartRef.current) return;

    const ctx = chartRef.current.getContext('2d');

    if (chartInstance.current) {
      chartInstance.current.destroy();
    }

    const labels = data.map(d => d.bloodGroup);
    const stockData = data.map(d => d.currentStock);
    const thresholds = data.map(() => 25);

    chartInstance.current = new Chart(ctx, {
      type: 'bar',
      data: {
        labels,
        datasets: [
          {
            label: 'Current Stock',
            data: stockData,
            backgroundColor: '#4488ff',
            borderWidth: 1
          },
          {
            label: 'Optimal Threshold',
            data: thresholds,
            backgroundColor: '#ffaa00',
            borderWidth: 1,
            type: 'line',
            borderDash: [5, 5]
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

export default RareBloodConservationChart;
