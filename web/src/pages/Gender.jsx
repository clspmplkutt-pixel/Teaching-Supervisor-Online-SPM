import React from 'react';
import StatusToggleTable from '../components/StatusToggleTable';

const COLUMNS = [
  { key: 'id', label: 'ลำดับ', align: 'center' },
  { key: 'gender_id', label: 'รหัสเพศ', align: 'center' },
  { key: 'gender', label: 'เพศ' },
];

const ORDER = [{ field: 'id', ascending: true }];

const FORM_FIELDS = [
  { key: 'id', label: 'ลำดับ (ID)', type: 'number', required: false, readOnlyOnEdit: true },
  { key: 'gender_id', label: 'รหัสเพศ', required: true, readOnlyOnEdit: true },
  { key: 'gender', label: 'ชื่อเพศ', required: true },
];

const Gender = () => (
  <StatusToggleTable
    title="จัดการข้อมูลเพศ"
    icon="fa-venus-mars"
    table="tbl_system_gender"
    idField="id"
    statusField={null}
    columns={COLUMNS}
    order={ORDER}
    formFields={FORM_FIELDS}
  />
);

export default Gender;
