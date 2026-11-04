import React from 'react';
import StatusToggleTable from '../components/StatusToggleTable';

const COLUMNS = [
  { key: 'competency_id', label: 'รหัสสมรรถนะ', align: 'center' },
  { key: 'competency_name', label: 'สมรรถนะสำคัญของผู้เรียน' },
];

const ORDER = [
  { field: 'competency_status', ascending: false },
  { field: 'competency_id', ascending: true },
];

const FORM_FIELDS = [
  { key: 'competency_id', label: 'รหัสสมรรถนะสำคัญ', required: true, readOnlyOnEdit: true },
  { key: 'competency_name', label: 'ชื่อสมรรถนะสำคัญของผู้เรียน', required: true },
];

const Competency = () => (
  <StatusToggleTable
    title="จัดการสมรรถนะสำคัญของผู้เรียน"
    icon="fa-brain"
    table="tbl_system_Competency"
    idField="competency_id"
    statusField="competency_status"
    columns={COLUMNS}
    order={ORDER}
    formFields={FORM_FIELDS}
  />
);

export default Competency;
