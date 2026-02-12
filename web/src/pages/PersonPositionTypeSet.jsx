import React from 'react';
import StatusSet from '../components/StatusSet';

const PersonPositionTypeSet = () => (
  <StatusSet
    table="tbl_system_PersonPositionType"
    statusField="position_status"
    statusParam="position_status"
    redirectTo="/person_position_type"
  />
);

export default PersonPositionTypeSet;
