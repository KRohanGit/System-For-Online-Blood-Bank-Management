import React from 'react';
import '../../styles/admin.css';

function BloodStockChart({ data = [] }) {
  // Default blood groups if no data provided
  const defaultData = [
    { bloodGroup: 'A+', units: 0 },
    { bloodGroup: 'A-', units: 0 },
    { bloodGroup: 'B+', units: 0 },
    { bloodGroup: 'B-', units: 0 },
    { bloodGroup: 'AB+', units: 0 },
    { bloodGroup: 'AB-', units: 0 },
    { bloodGroup: 'O+', units: 0 },
    { bloodGroup: 'O-', units: 0 }
  ];

  const chartData = data.length > 0 ? data : defaultData;
  const maxValue = Math.max(...chartData.map(item => item.units), 1); // Ensure at least 1

  return (
    <div className="blood-stock-chart">
      {chartData.length === 0 || chartData.every(item => item.units === 0) ? (
        <div style={{ padding: '40px', textAlign: 'center', color: '#6b7280' }}>
          <p>📊 No blood inventory data available</p>
          <p style={{ fontSize: '14px', marginTop: '8px' }}>Blood stock data will appear here once inventory is updated</p>
        </div>
      ) : (
        <>
          <div className="chart-bars">
            {chartData.map((item, index) => {
              const percentage = (item.units / maxValue) * 100;
              const isLow = item.units < 10 && item.units > 0;
              const isCritical = item.units < 5 && item.units > 0;
              
              return (
                <div key={index} className="chart-bar-wrapper">
                  <div className="chart-bar-container">
                    <div 
                      className={`chart-bar ${isCritical ? 'critical' : isLow ? 'low' : ''}`}
                      style={{ height: item.units === 0 ? '10px' : `${percentage}%` }}
                    >
                      <span className="bar-value">{item.units}</span>
                    </div>
                  </div>
                  <div className="chart-label">
                    <span className="blood-group">{item.bloodGroup}</span>
                    <span className="unit-text">units</span>
                  </div>
                </div>
              );
            })}
          </div>
          
          <div className="chart-legend">
            <div className="legend-item">
              <span className="legend-color normal"></span>
              <span>Adequate Stock</span>
            </div>
            <div className="legend-item">
              <span className="legend-color low"></span>
              <span>Low Stock (&lt; 10 units)</span>
            </div>
            <div className="legend-item">
              <span className="legend-color critical"></span>
              <span>Critical (&lt; 5 units)</span>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

export default BloodStockChart;
