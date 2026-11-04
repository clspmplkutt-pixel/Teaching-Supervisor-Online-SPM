import React from 'react';
import StatusToggleTable from '../components/StatusToggleTable';

const COLUMNS = [
  { key: 'id', label: 'ลำดับ', align: 'center' },
  { key: 'prefix_id', label: 'รหัสคำนำหน้า', align: 'center' },
  { key: 'prefix', label: 'คำนำหน้าชื่อ' },
];

const ORDER = [
  { field: 'prefix_status', ascending: false },
  { field: 'id', ascending: true },
];

const FORM_FIELDS = [
  { key: 'id', label: 'ลำดับ (ID)', type: 'number', required: false, readOnlyOnEdit: true },
  { key: 'prefix_id', label: 'รหัสคำนำหน้า', required: true, readOnlyOnEdit: true },
  { key: 'prefix', label: 'คำนำหน้าชื่อ', required: true },
];

const Prefix = () => (
  <StatusToggleTable
    title="จัดการข้อมูลคำนำหน้าชื่อ"
    icon="fa-id-badge"
    table="tbl_system_prefix"
    idField="id"
    statusField="prefix_status"
    columns={COLUMNS}
    order={ORDER}
    formFields={FORM_FIELDS}
  />
);

export default Prefix;
