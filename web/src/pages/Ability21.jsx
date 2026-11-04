import React from 'react';
import StatusToggleTable from '../components/StatusToggleTable';

const COLUMNS = [
  { key: 'id', label: 'ลำดับ', align: 'center' },
  { key: 'ability21_id', label: 'รหัสทักษะ', align: 'center' },
  { key: 'ability21_name_th', label: 'ชื่อทักษะ (ภาษาไทย)' },
  { key: 'ability21_name_en', label: 'ชื่อทักษะ (ภาษาอังกฤษ)' },
];

const ORDER = [
  { field: 'ability21_status', ascending: false },
  { field: 'id', ascending: true },
];

const FORM_FIELDS = [
  { key: 'id', label: 'ลำดับ (ID)', type: 'number', required: false, readOnlyOnEdit: true },
  { key: 'ability21_id', label: 'รหัสทักษะในศตวรรษที่ 21', required: true, readOnlyOnEdit: true },
  { key: 'ability21_name_th', label: 'ชื่อทักษะ (ภาษาไทย)', required: true },
  { key: 'ability21_name_en', label: 'ชื่อทักษะ (ภาษาอังกฤษ)', required: false },
];

const Ability21 = () => (
  <StatusToggleTable
    title="จัดการทักษะในศตวรรษที่ 21"
    icon="fa-rocket"
    table="tbl_ability21"
    idField="id"
    statusField="ability21_status"
    columns={COLUMNS}
    order={ORDER}
    formFields={FORM_FIELDS}
  />
);

export default Ability21;
