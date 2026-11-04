import React from 'react';
import StatusToggleTable from '../components/StatusToggleTable';

const COLUMNS = [
  { key: 'id', label: 'ลำดับ', align: 'center' },
  { key: 'persontype_id', label: 'รหัสประเภท', align: 'center' },
  { key: 'persontype_name', label: 'ประเภทบุคลากร' },
];

const ORDER = [
  { field: 'persontype_status', ascending: false },
  { field: 'id', ascending: true },
];

const FORM_FIELDS = [
  { key: 'id', label: 'ลำดับ (ID)', type: 'number', required: false, readOnlyOnEdit: true },
  { key: 'persontype_id', label: 'รหัสประเภทบุคลากร', required: true, readOnlyOnEdit: true },
  { key: 'persontype_name', label: 'ชื่อประเภทบุคลากร', required: true },
];

const PersonType = () => (
  <StatusToggleTable
    title="จัดการประเภทบุคลากร"
    icon="fa-users-gear"
    table="tbl_system_PersonType"
    idField="id"
    statusField="persontype_status"
    columns={COLUMNS}
    order={ORDER}
    formFields={FORM_FIELDS}
  />
);

export default PersonType;
