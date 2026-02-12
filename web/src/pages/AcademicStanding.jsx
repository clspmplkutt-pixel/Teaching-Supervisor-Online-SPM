import React from 'react';
import StatusToggleTable from '../components/StatusToggleTable';

const AcademicStanding = () => {
  return (
    <StatusToggleTable
      title="จัดการระดับวิทยฐานะ/ตำแหน่งทางวิชาการ"
      table="tbl_system_Academic_Standing"
      statusField="academic_status"
      columns={[
        { key: 'id', label: 'id', align: 'center' },
        { key: 'academic_id', label: 'รหัส', align: 'center' },
        { key: 'academic_standing', label: 'ระดับวิทยะฐานะ/ตำแหน่งทางวิชาการ' },
      ]}
      order={[
        { field: 'academic_status', ascending: false },
        { field: 'id', ascending: true },
      ]}
    />
  );
};

export default AcademicStanding;
