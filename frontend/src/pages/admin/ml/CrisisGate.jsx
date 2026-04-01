import React from 'react';
import { canRoleSeeFeature, isFeatureReadOnly } from '../../../services/crisis/crisisAccessControl';

export default function CrisisGate({ feature, role, children }) {
  if (!canRoleSeeFeature(role, feature)) {
    return null;
  }

  const readOnly = isFeatureReadOnly(role, feature);
  if (typeof children === 'function') {
    return children({ readOnly });
  }
  return children;
}
