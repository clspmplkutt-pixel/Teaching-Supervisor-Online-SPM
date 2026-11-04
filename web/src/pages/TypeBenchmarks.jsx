import React from 'react';
import StatusToggleTable from '../components/StatusToggleTable';

const COLUMNS = [
  { key: 'id', label: 'ลำดับ', align: 'center' },
  { key: 'indicator_id', label: 'รหัสประเภท', align: 'center' },
  { key: 'indicator_name', label: 'ประเภทตัวชี้วัด' },
];

const ORDER = [
  { field: 'indicator_status', ascending: false },
  { field: 'id', ascending: true },
];

const FORM_FIELDS = [
  { key: 'id', label: 'ลำดับ (ID)', type: 'number', required: false, readOnlyOnEdit: true },
  { key: 'indicator_id', label: 'รหัสประเภทตัวชี้วัด', required: true, readOnlyOnEdit: true },
  { key: 'indicator_name', label: 'ชื่อประเภทตัวชี้วัด (เช่น ระหว่างทาง / ปลายทาง)', required: true },
];

const TypeBenchmarks = () => (
  <StatusToggleTable
    title="จัดการประเภทตัวชี้วัด"
    icon="fa-tags"
    table="tbl_type_indicators"
    idField="id"
    statusField="indicator_status"
    columns={COLUMNS}
    order={ORDER}
    formFields={FORM_FIELDS}
  />
);

export default TypeBenchmarks;
