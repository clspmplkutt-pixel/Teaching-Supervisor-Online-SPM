import React from 'react';
import StatusSet from '../components/StatusSet';

const SubjectTypeSet = () => (
  <StatusSet
    table="tbl_system_SubjectType"
    statusField="subjecttype_status"
    statusParam="subjecttype_status"
    redirectTo="/subject_type"
  />
);

export default SubjectTypeSet;
