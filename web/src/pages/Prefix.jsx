import React from 'react';
import StatusToggleTable from '../components/StatusToggleTable';

const Prefix = () => {
  return (
    <StatusToggleTable
      title="แก้ไขข้อมูลคำนำหน้า"
      table="tbl_system_prefix"
      statusField="prefix_status"
      columns={[
        { key: 'id', label: 'id', align: 'center' },
        { key: 'prefix_id', label: 'รหัส', align: 'center' },
        { key: 'prefix', label: 'คำนำหน้า' },
      ]}
      order={[
        { field: 'prefix_status', ascending: false },
        { field: 'id', ascending: true },
      ]}
    />
  );
};

export default Prefix;
