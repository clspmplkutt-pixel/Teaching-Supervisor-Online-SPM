import React from 'react';
import { useAuth } from '../contexts/AuthContext';
import InfoSimple from './InfoSimple';
import InfoDirectorSchool from './InfoDirectorSchool';

const getRoleId = (user) => {
  return user?.level_id || user?.user_metadata?.role || user?.user_metadata?.level || user?.role || user?.level || 'teacher';
};

const InfoPage = () => {
  const { user } = useAuth();
  const roleId = getRoleId(user);

  if (roleId === 'directorschool' || roleId === 'admin_school') {
    return <InfoDirectorSchool />;
  }

  return <InfoSimple />;
};

export default InfoPage;
