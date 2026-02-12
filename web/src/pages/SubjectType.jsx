import React from 'react';
import StatusToggleTable from '../components/StatusToggleTable';

const SubjectType = () => {
  return (
    <StatusToggleTable
      title="จัดการประเภทวิชา"
      table="tbl_system_SubjectType"
      statusField="subjecttype_status"
      columns={[
        { key: 'id', label: 'id', align: 'center' },
        { key: 'subjecttype_id', label: 'รหัส', align: 'center' },
        { key: 'subjecttype_name', label: 'ประเภทวิชา' },
      ]}
      order={[
        { field: 'subjecttype_status', ascending: false },
        { field: 'id', ascending: true },
      ]}
    />
  );
};

export default SubjectType;
