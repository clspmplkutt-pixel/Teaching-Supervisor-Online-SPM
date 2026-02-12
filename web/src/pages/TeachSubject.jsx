import React from 'react';
import StatusToggleTable from '../components/StatusToggleTable';

const TeachSubject = () => {
  return (
    <StatusToggleTable
      title="จัดการกลุ่มสาระการเรียนรู้"
      table="tbl_system_Teach_Subject"
      statusField="teach_subject_status"
      columns={[
        { key: 'id', label: 'id', align: 'center' },
        { key: 'teach_subject_id', label: 'รหัส', align: 'center' },
        { key: 'teach_subject', label: 'กลุ่มสาระ' },
        { key: 'teach_subject_1', label: 'กลุ่มสาระ (ย่อ)' },
        { key: 'teach_subject_short', label: 'กลุ่มสาระ (ตัวอักษรย่อ)' },
      ]}
      order={[
        { field: 'teach_subject_status', ascending: false },
        { field: 'id', ascending: true },
      ]}
    />
  );
};

export default TeachSubject;
