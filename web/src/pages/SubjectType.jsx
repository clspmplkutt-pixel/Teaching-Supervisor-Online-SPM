import React from 'react';
import StatusToggleTable from '../components/StatusToggleTable';

const COLUMNS = [
  { key: 'id', label: 'ลำดับ', align: 'center' },
  { key: 'subjecttype_id', label: 'รหัสประเภทวิชา', align: 'center' },
  { key: 'subjecttype_name', label: 'ประเภทรายวิชา' },
];

const ORDER = [
  { field: 'subjecttype_status', ascending: false },
  { field: 'id', ascending: true },
];

const FORM_FIELDS = [
  { key: 'id', label: 'ลำดับ (ID)', type: 'number', required: false, readOnlyOnEdit: true },
  { key: 'subjecttype_id', label: 'รหัสประเภทรายวิชา (เช่น 01)', required: true, readOnlyOnEdit: true },
  { key: 'subjecttype_name', label: 'ชื่อประเภทรายวิชา', required: true },
];

const SubjectType = () => (
  <StatusToggleTable
    title="จัดการประเภทรายวิชา"
    icon="fa-book"
    table="tbl_system_SubjectType"
    idField="id"
    statusField="subjecttype_status"
    columns={COLUMNS}
    order={ORDER}
    formFields={FORM_FIELDS}
  />
);

export default SubjectType;
