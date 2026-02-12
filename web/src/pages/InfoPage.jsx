import React from 'react';
import { useAuth } from '../contexts/AuthContext';
import InfoSimple from './InfoSimple';
import InfoDirectorSchool from './InfoDirectorSchool';

const getRoleId = (user) => {
  return user?.level_id || user?.user_metadata?.role || user?.role || 'teacher';
};

const InfoPage = () => {
  const { user } = useAuth();
  const roleId = getRoleId(user);

  if (roleId === 'directorschool') {
    return <InfoDirectorSchool />;
  }

  return <InfoSimple />;
};

export default InfoPage;
