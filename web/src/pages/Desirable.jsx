import React from 'react';
import StatusToggleTable from '../components/StatusToggleTable';

const COLUMNS = [
  { key: 'id', label: 'ลำดับ', align: 'center' },
  { key: 'desirable_id', label: 'รหัสคุณลักษณะ', align: 'center' },
  { key: 'desirable_name', label: 'คุณลักษณะอันพึงประสงค์' },
];

const ORDER = [
  { field: 'desirable_status', ascending: false },
  { field: 'id', ascending: true },
];

const FORM_FIELDS = [
  { key: 'id', label: 'ลำดับ (ID)', type: 'number', required: false, readOnlyOnEdit: true },
  { key: 'desirable_id', label: 'รหัสคุณลักษณะอันพึงประสงค์', required: true, readOnlyOnEdit: true },
  { key: 'desirable_name', label: 'ชื่อคุณลักษณะอันพึงประสงค์', required: true },
];

const Desirable = () => (
  <StatusToggleTable
    title="จัดการคุณลักษณะอันพึงประสงค์"
    icon="fa-heart"
    table="tbl_system_Desirable"
    idField="id"
    statusField="desirable_status"
    columns={COLUMNS}
    order={ORDER}
    formFields={FORM_FIELDS}
  />
);

export default Desirable;
