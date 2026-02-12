import React from 'react';
import StatusToggleTable from '../components/StatusToggleTable';

const PersonPositionType = () => {
  return (
    <StatusToggleTable
      title="จัดการชื่อตำแหน่งบุคลากร"
      table="tbl_system_PersonPositionType"
      statusField="position_status"
      columns={[
        { key: 'id', label: 'id', align: 'center' },
        { key: 'position_id', label: 'รหัส', align: 'center' },
        { key: 'position_name', label: 'ชื่อตำแหน่ง' },
      ]}
      order={[
        { field: 'position_status', ascending: false },
        { field: 'id', ascending: true },
      ]}
    />
  );
};

export default PersonPositionType;
