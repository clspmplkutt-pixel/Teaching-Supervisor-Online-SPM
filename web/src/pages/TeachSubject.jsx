import React from 'react';
import StatusToggleTable from '../components/StatusToggleTable';

const COLUMNS = [
  { key: 'id', label: 'ลำดับ', align: 'center' },
  { key: 'teach_subject_id', label: 'รหัสกลุ่มสาระ', align: 'center' },
  { key: 'teach_subject', label: 'กลุ่มสาระการเรียนรู้' },
  { key: 'teach_subject_1', label: 'ชื่อย่อกลุ่มสาระ' },
  { key: 'teach_subject_short', label: 'อักษรย่อ', align: 'center' },
];

const ORDER = [
  { field: 'teach_subject_status', ascending: false },
  { field: 'id', ascending: true },
];

const FORM_FIELDS = [
  { key: 'id', label: 'ลำดับ (ID)', type: 'number', required: false, readOnlyOnEdit: true },
  { key: 'teach_subject_id', label: 'รหัสกลุ่มสาระ (เช่น 1000)', required: true, readOnlyOnEdit: true },
  { key: 'teach_subject', label: 'ชื่อกลุ่มสาระการเรียนรู้', required: true },
  { key: 'teach_subject_1', label: 'ชื่อกลุ่มสาระ (แบบย่อ)', required: false },
  { key: 'teach_subject_short', label: 'อักษรย่อ (เช่น ท, ค, ว)', required: false },
];

const TeachSubject = () => (
  <StatusToggleTable
    title="จัดการกลุ่มสาระการเรียนรู้"
    icon="fa-graduation-cap"
    table="tbl_system_Teach_Subject"
    idField="id"
    statusField="teach_subject_status"
    columns={COLUMNS}
    order={ORDER}
    formFields={FORM_FIELDS}
  />
);

export default TeachSubject;
