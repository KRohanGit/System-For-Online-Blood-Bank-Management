import React, { useState } from 'react';
import Sidebar from './Sidebar';
import TopNavbar from './TopNavbar';
import '../../styles/admin.css';

function DashboardLayout({ children, hospitalName }) {
  const [sidebarOpen, setSidebarOpen] = useState(true);

  const toggleSidebar = () => {
    setSidebarOpen(!sidebarOpen);
  };

  return (
    <div className={`dashboard-layout ${sidebarOpen ? '' : 'sidebar-collapsed'}`}>
      <Sidebar isOpen={sidebarOpen} toggleSidebar={toggleSidebar} />
      
      <div className="main-content">
        <TopNavbar toggleSidebar={toggleSidebar} hospitalName={hospitalName} />
        
        <main className="content-area">
          {children}
        </main>
      </div>
    </div>
  );
}

export default DashboardLayout;
