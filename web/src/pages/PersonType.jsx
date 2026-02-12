import React from 'react';
import StatusToggleTable from '../components/StatusToggleTable';

const PersonType = () => {
  return (
    <StatusToggleTable
      title="จัดการประเภทบุคลากร"
      table="tbl_system_PersonType"
      statusField="persontype_status"
      columns={[
        { key: 'id', label: 'id', align: 'center' },
        { key: 'persontype_id', label: 'รหัส', align: 'center' },
        { key: 'persontype_name', label: 'ประเภทบุคลากร' },
      ]}
      order={[
        { field: 'persontype_status', ascending: false },
        { field: 'id', ascending: true },
      ]}
    />
  );
};

export default PersonType;
