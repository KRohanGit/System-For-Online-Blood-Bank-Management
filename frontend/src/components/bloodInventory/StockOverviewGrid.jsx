import React from 'react';
import StockCard from './StockCard';

const StockOverviewGrid = ({ stockOverview, onFilterByBloodGroup }) => {
  return (
    <div className="stock-overview-section">
      <h2>Stock Overview</h2>
      <div className="stock-grid">
        {stockOverview.map((stock) => (
          <StockCard
            key={stock.bloodGroup}
            bloodGroup={stock.bloodGroup}
            units={stock.availableUnits}
            status={stock.status}
            expiringSoon={stock.expiringSoon}
            lastUpdated={stock.lastUpdated}
            onAction={() => onFilterByBloodGroup(stock.bloodGroup)}
          />
        ))}
      </div>
    </div>
  );
};

export default StockOverviewGrid;
