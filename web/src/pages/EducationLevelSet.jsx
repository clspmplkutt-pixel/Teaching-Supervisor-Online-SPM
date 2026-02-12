import React from 'react';
import StatusSet from '../components/StatusSet';

const EducationLevelSet = () => (
  <StatusSet
    table="tbl_system_EducationLevel"
    statusField="educationlevel_status"
    statusParam="educationlevel_status"
    redirectTo="/education_level"
  />
);

export default EducationLevelSet;
