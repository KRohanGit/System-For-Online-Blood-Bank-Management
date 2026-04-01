import { useMemo } from 'react';
import { getRoleConfig, mapTokenRoleToHospitalRole } from '../services/crisis/crisisAccessControl';

const CACHE_KEY = 'crisis_role_context';

function decodeToken() {
  try {
    const token = localStorage.getItem('token');
    if (!token) return null;
    return JSON.parse(atob(token.split('.')[1]));
  } catch {
    return null;
  }
}

export default function useHospitalRole() {
  return useMemo(() => {
    const cached = sessionStorage.getItem(CACHE_KEY);
    if (cached) {
      try {
        return JSON.parse(cached);
      } catch {
        sessionStorage.removeItem(CACHE_KEY);
      }
    }

    const payload = decodeToken() || {};
    const role = mapTokenRoleToHospitalRole(payload.hospitalRole || payload.role);
    const config = getRoleConfig(role);
    const roleContext = {
      role,
      accessLevel: config.accessLevel,
      canSee: config.canSee,
      canDo: config.canDo,
      refreshRateMs: config.refreshRateMs,
      alertThreshold: config.alertThreshold,
      user: {
        id: payload.userId || payload.id || payload._id || 'user-unknown',
        name: payload.name || payload.username || 'Unknown User',
        role,
        department: payload.department || 'general',
      },
    };

    sessionStorage.setItem(CACHE_KEY, JSON.stringify(roleContext));
    return roleContext;
  }, []);
}
