import React from 'react';
import StatusToggleTable from '../components/StatusToggleTable';

const COLUMNS = [
  { key: 'id', label: 'ลำดับ', align: 'center' },
  { key: 'educationlevel_id', label: 'รหัสวุฒิ', align: 'center' },
  { key: 'educationlevel_name', label: 'ระดับวุฒิการศึกษา' },
];

const ORDER = [
  { field: 'educationlevel_status', ascending: false },
  { field: 'id', ascending: true },
];

const FORM_FIELDS = [
  { key: 'id', label: 'ลำดับ (ID)', type: 'number', required: false, readOnlyOnEdit: true },
  { key: 'educationlevel_id', label: 'รหัสระดับการศึกษา', required: true, readOnlyOnEdit: true },
  { key: 'educationlevel_name', label: 'ชื่อระดับวุฒิการศึกษา', required: true },
];

const EducationLevel = () => (
  <StatusToggleTable
    title="จัดการระดับวุฒิการศึกษา"
    icon="fa-user-graduate"
    table="tbl_system_EducationLevel"
    idField="id"
    statusField="educationlevel_status"
    columns={COLUMNS}
    order={ORDER}
    formFields={FORM_FIELDS}
  />
);

export default EducationLevel;
