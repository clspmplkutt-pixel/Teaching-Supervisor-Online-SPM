import React from 'react';
import StatusToggleTable from '../components/StatusToggleTable';

const COLUMNS = [
  { key: 'id', label: 'ลำดับ', align: 'center' },
  { key: 'position_id', label: 'รหัสตำแหน่ง', align: 'center' },
  { key: 'position_name', label: 'ชื่อตำแหน่งบุคลากร' },
];

const ORDER = [
  { field: 'position_status', ascending: false },
  { field: 'id', ascending: true },
];

const FORM_FIELDS = [
  { key: 'id', label: 'ลำดับ (ID)', type: 'number', required: false, readOnlyOnEdit: true },
  { key: 'position_id', label: 'รหัสตำแหน่ง', required: true, readOnlyOnEdit: true },
  { key: 'position_name', label: 'ชื่อตำแหน่งบุคลากร', required: true },
];

const PersonPositionType = () => (
  <StatusToggleTable
    title="จัดการชื่อตำแหน่งบุคลากร"
    icon="fa-briefcase"
    table="tbl_system_PersonPositionType"
    idField="id"
    statusField="position_status"
    columns={COLUMNS}
    order={ORDER}
    formFields={FORM_FIELDS}
  />
);

export default PersonPositionType;
