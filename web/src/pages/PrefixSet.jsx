import React from 'react';
import StatusSet from '../components/StatusSet';

const PrefixSet = () => (
  <StatusSet
    table="tbl_system_prefix"
    statusField="prefix_status"
    statusParam="prefix_status"
    redirectTo="/prefix"
  />
);

export default PrefixSet;
