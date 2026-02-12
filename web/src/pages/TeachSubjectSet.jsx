import React from 'react';
import StatusSet from '../components/StatusSet';

const TeachSubjectSet = () => (
  <StatusSet
    table="tbl_system_Teach_Subject"
    statusField="teach_subject_status"
    statusParam="teach_subject_status"
    redirectTo="/teach_subject"
  />
);

export default TeachSubjectSet;
