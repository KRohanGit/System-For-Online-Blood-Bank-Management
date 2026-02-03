import React from 'react';
import AdminHeader from './AdminHeader';
import AdminNavigation from './AdminNavigation';
import './AdminLayout.css';

const AdminLayout = ({ children, title, user }) => {
  return (
    <div className="admin-layout">
      <AdminHeader title={title} user={user} />
      <div className="admin-container">
        <aside className="admin-sidebar">
          <AdminNavigation />
        </aside>
        <main className="admin-content">
          {children}
        </main>
      </div>
    </div>
  );
};

export default AdminLayout;
