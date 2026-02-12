import React from 'react';
import StatusSet from '../components/StatusSet';

const PersonTypeSet = () => (
  <StatusSet
    table="tbl_system_PersonType"
    statusField="persontype_status"
    statusParam="persontype_status"
    redirectTo="/person_type"
  />
);

export default PersonTypeSet;
