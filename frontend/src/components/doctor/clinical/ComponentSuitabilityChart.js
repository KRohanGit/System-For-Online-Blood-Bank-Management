import React, { useEffect, useRef } from 'react';
import Chart from 'chart.js/auto';

const ComponentSuitabilityChart = ({ data }) => {
  const chartRef = useRef(null);
  const chartInstance = useRef(null);

  useEffect(() => {
    if (!chartRef.current || !data || data.length === 0) return;

    const ctx = chartRef.current.getContext('2d');

    if (chartInstance.current) {
      chartInstance.current.destroy();
    }

    const labels = data.map(d => d.bloodGroup);
    const scores = data.map(d => d.suitabilityScore);

    chartInstance.current = new Chart(ctx, {
      type: 'bar',
      data: {
        labels,
        datasets: [{
          label: 'Suitability Score',
          data: scores,
          backgroundColor: scores.map(s =>
            s >= 75 ? '#44ff44' :
            s >= 50 ? '#ffaa00' :
            '#ff4444'
          ),
          borderWidth: 1
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        scales: {
          y: {
            beginAtZero: true,
            max: 100,
            title: {
              display: true,
              text: 'Suitability %'
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

export default ComponentSuitabilityChart;
