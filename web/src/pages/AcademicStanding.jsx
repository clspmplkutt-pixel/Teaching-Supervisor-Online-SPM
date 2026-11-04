import React from 'react';
import StatusToggleTable from '../components/StatusToggleTable';

const COLUMNS = [
  { key: 'id', label: 'ลำดับ', align: 'center' },
  { key: 'academic_id', label: 'รหัสวิทยฐานะ', align: 'center' },
  { key: 'academic_standing', label: 'ระดับวิทยฐานะ / ตำแหน่งทางวิชาการ' },
];

const ORDER = [
  { field: 'academic_status', ascending: false },
  { field: 'id', ascending: true },
];

const FORM_FIELDS = [
  { key: 'id', label: 'ลำดับ (ID)', type: 'number', required: false, readOnlyOnEdit: true },
  { key: 'academic_id', label: 'รหัสวิทยฐานะ', required: true, readOnlyOnEdit: true },
  { key: 'academic_standing', label: 'ชื่อระดับวิทยฐานะ / ตำแหน่งทางวิชาการ', required: true },
];

const AcademicStanding = () => (
  <StatusToggleTable
    title="จัดการระดับวิทยฐานะและตำแหน่งทางวิชาการ"
    icon="fa-ranking-star"
    table="tbl_system_Academic_Standing"
    idField="id"
    statusField="academic_status"
    columns={COLUMNS}
    order={ORDER}
    formFields={FORM_FIELDS}
  />
);

export default AcademicStanding;
