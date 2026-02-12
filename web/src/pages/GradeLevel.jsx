import React from 'react';
import StatusToggleTable from '../components/StatusToggleTable';

const GradeLevel = () => {
  return (
    <StatusToggleTable
      title="จัดการระดับชั้น"
      table="tbl_system_GradeLevel"
      statusField="grade_level_status"
      columns={[
        { key: 'id', label: 'id', align: 'center' },
        { key: 'grade_level_id', label: 'รหัส', align: 'center' },
        { key: 'grade_level_name', label: 'ระดับชั้น' },
      ]}
      order={[
        { field: 'grade_level_status', ascending: false },
        { field: 'id', ascending: true },
      ]}
    />
  );
};

export default GradeLevel;
