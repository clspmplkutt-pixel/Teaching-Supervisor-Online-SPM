import React from 'react';
import StatusSet from '../components/StatusSet';

const AcademicStandingSet = () => (
  <StatusSet
    table="tbl_system_Academic_Standing"
    statusField="academic_status"
    statusParam="academic_status"
    redirectTo="/academic_standing"
  />
);

export default AcademicStandingSet;
