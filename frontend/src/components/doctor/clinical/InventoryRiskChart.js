import React, { useEffect, useRef } from 'react';
import Chart from 'chart.js/auto';

const InventoryRiskChart = ({ advisories }) => {
  const chartRef = useRef(null);
  const chartInstance = useRef(null);

  useEffect(() => {
    if (!chartRef.current || !advisories || advisories.length === 0) return;

    const ctx = chartRef.current.getContext('2d');

    if (chartInstance.current) {
      chartInstance.current.destroy();
    }

    const critical = advisories.filter(a => a.severity === 'critical').length;
    const medium = advisories.filter(a => a.severity === 'medium').length;
    const safe = Math.max(8 - critical - medium, 0);

    chartInstance.current = new Chart(ctx, {
      type: 'doughnut',
      data: {
        labels: ['Critical', 'Medium', 'Safe'],
        datasets: [{
          data: [critical, medium, safe],
          backgroundColor: ['#ff4444', '#ffaa00', '#44ff44'],
          borderWidth: 2,
          borderColor: '#fff'
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            position: 'bottom'
          },
          tooltip: {
            callbacks: {
              label: (context) => {
                return `${context.label}: ${context.raw} blood groups`;
              }
            }
          }
        }
      }
    });

    return () => {
      if (chartInstance.current) {
        chartInstance.current.destroy();
      }
    };
  }, [advisories]);

  return (
    <div style={{ height: '250px', position: 'relative' }}>
      <canvas ref={chartRef}></canvas>
    </div>
  );
};

export default InventoryRiskChart;
