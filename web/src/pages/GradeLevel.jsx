import React from 'react';
import StatusToggleTable from '../components/StatusToggleTable';

const COLUMNS = [
  { key: 'id', label: 'ลำดับ', align: 'center' },
  { key: 'grade_level_id', label: 'รหัสระดับชั้น', align: 'center' },
  { key: 'grade_level_name', label: 'ระดับชั้นเรียน' },
  { key: 'grade_level_shortname', label: 'ชื่อย่อ', align: 'center' },
];

const ORDER = [
  { field: 'grade_level_status', ascending: false },
  { field: 'id', ascending: true },
];

const FORM_FIELDS = [
  { key: 'id', label: 'ลำดับ (ID)', type: 'number', required: false, readOnlyOnEdit: true },
  { key: 'grade_level_id', label: 'รหัสระดับชั้น (เช่น 301)', required: true, readOnlyOnEdit: true },
  { key: 'grade_level_name', label: 'ชื่อระดับชั้นเรียน', required: true },
  { key: 'grade_level_shortname', label: 'ชื่อย่อระดับชั้น (เช่น ม.1)', required: false },
];

const GradeLevel = () => (
  <StatusToggleTable
    title="จัดการระดับชั้นเรียน"
    icon="fa-stairs"
    table="tbl_system_GradeLevel"
    idField="id"
    statusField="grade_level_status"
    columns={COLUMNS}
    order={ORDER}
    formFields={FORM_FIELDS}
  />
);

export default GradeLevel;
