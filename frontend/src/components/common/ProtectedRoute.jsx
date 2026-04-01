import React from 'react';
import { Navigate } from 'react-router-dom';

const ProtectedRoute = ({ children, allowedRoles }) => {
  const token = localStorage.getItem('token');

  if (!token) {
    return <Navigate to="/signin" replace />;
  }

  if (allowedRoles && allowedRoles.length > 0) {
    try {
      const payload = JSON.parse(atob(token.split('.')[1]));
      const userRole = String(payload.role || '').toLowerCase();
      const normalizedAllowedRoles = allowedRoles.map((role) => String(role).toLowerCase());

      if (!normalizedAllowedRoles.includes(userRole)) {
        return <Navigate to="/signin" replace />;
      }
    } catch {
      localStorage.removeItem('token');
      return <Navigate to="/signin" replace />;
    }
  }

  return children;
};

export default ProtectedRoute;
