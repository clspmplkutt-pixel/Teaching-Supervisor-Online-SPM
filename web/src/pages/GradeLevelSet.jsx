import React from 'react';
import StatusSet from '../components/StatusSet';

const GradeLevelSet = () => (
  <StatusSet
    table="tbl_system_GradeLevel"
    statusField="grade_level_status"
    statusParam="grade_level_status"
    redirectTo="/grade_level"
  />
);

export default GradeLevelSet;
