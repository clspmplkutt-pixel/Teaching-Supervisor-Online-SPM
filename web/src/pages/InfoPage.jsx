import React, { lazy, Suspense } from 'react';
import { useAuth } from '../contexts/AuthContext';
import LoadingSpinner from '../components/LoadingSpinner';

const InfoTeacher = lazy(() => import('./InfoTeacher'));
const InfoDirectorSchool = lazy(() => import('./InfoDirectorSchool'));
const InfoSimple = lazy(() => import('./InfoSimple'));

const getRoleId = (user) => {
  return (
    user?.level_id ||
    user?.user_metadata?.role ||
    user?.user_metadata?.level ||
    user?.role ||
    user?.level ||
    'teacher'
  );
};

const InfoPage = () => {
  const { user } = useAuth();
  const activeRole = getRoleId(user);

  return (
    <Suspense fallback={<LoadingSpinner message="กำลังโหลดแดชบอร์ด..." />}>
      {activeRole === 'directorschool' || activeRole === 'admin_school' ? (
        <InfoDirectorSchool roleId={activeRole} />
      ) : activeRole === 'teacher' || activeRole === 'headdepartment' ? (
        <InfoTeacher roleId={activeRole} />
      ) : (
        <InfoSimple roleId={activeRole} />
      )}
    </Suspense>
  );
};

export default InfoPage;
