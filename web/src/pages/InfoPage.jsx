import React from 'react';
import { useAuth } from '../contexts/AuthContext';
import InfoSimple from './InfoSimple';
import InfoDirectorSchool from './InfoDirectorSchool';
import InfoTeacher from './InfoTeacher';

const getRoleId = (user) => {
  return user?.level_id || user?.user_metadata?.role || user?.user_metadata?.level || user?.role || user?.level || 'teacher';
};

const InfoPage = () => {
  const { user } = useAuth();
  const roleId = getRoleId(user);

  if (roleId === 'directorschool' || roleId === 'admin_school') {
    return <InfoDirectorSchool />;
  }

  if (roleId === 'teacher' || roleId === 'headdepartment') {
    return <InfoTeacher />;
  }

  return <InfoSimple />;
};

export default InfoPage;
