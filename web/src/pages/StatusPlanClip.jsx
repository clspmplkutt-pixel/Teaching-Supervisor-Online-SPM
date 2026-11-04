import React from 'react';
import { Navigate } from 'react-router-dom';

/**
 * Legacy route `/statusplan_clip` consolidated into unified StatusPlan hub
 * pre-filtered to plans awaiting teaching clip submission (`?filter=clip`).
 */
const StatusPlanClip = () => {
  return <Navigate to="/statusplan?filter=clip" replace />;
};

export default StatusPlanClip;
