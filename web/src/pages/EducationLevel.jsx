import React from 'react';
import StatusToggleTable from '../components/StatusToggleTable';

const EducationLevel = () => {
  return (
    <StatusToggleTable
      title="จัดการระดับการศึกษา"
      table="tbl_system_EducationLevel"
      statusField="educationlevel_status"
      columns={[
        { key: 'id', label: 'id', align: 'center' },
        { key: 'educationlevel_id', label: 'รหัส', align: 'center' },
        { key: 'educationlevel_name', label: 'ระดับการศึกษา' },
      ]}
      order={[
        { field: 'educationlevel_status', ascending: false },
        { field: 'id', ascending: true },
      ]}
    />
  );
};

export default EducationLevel;
