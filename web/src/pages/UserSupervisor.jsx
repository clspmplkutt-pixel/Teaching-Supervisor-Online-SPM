import React, { useCallback } from 'react';
import { Link } from 'react-router-dom';
import UserDirectoryTable from '../components/UserDirectoryTable';

const SUPERVISOR_ORDER = [
  { field: 'khet_code', ascending: true },
  { field: 'academic_id', ascending: true },
  { field: 'id', ascending: true },
];

const UserSupervisor = () => {
  const applyBaseFilter = useCallback((query) => {
    return query.eq('level', 'supervisor');
  }, []);

  return (
    <UserDirectoryTable
      title="ทำเนียบศึกษานิเทศก์"
      subtitle="รายชื่อศึกษานิเทศก์ประจำสหวิทยาเขตและกลุ่มสาระการเรียนรู้"
      icon="fa-user-graduate"
      accentColor="info"
      applyBaseFilter={applyBaseFilter}
      editVariant="supervisor"
      showSchoolFilter={false}
      showKhetFilter={true}
      showSubjectFilter={true}
      showAcademicFilter={true}
      orderBy={SUPERVISOR_ORDER}
      columns={{
        thaiId: true,
        school: false,
        subject: true,
        position: true,
        academic: true,
        khet: true,
        status: true,
      }}
      headerActions={
        <Link to="/register" className="btn btn-primary btn-sm px-3">
          <i className="fa-solid fa-user-plus mr-1"></i>
          เพิ่มศึกษานิเทศก์
        </Link>
      }
      emptyTitle="ไม่พบรายชื่อศึกษานิเทศก์"
      emptyMessage="ยังไม่มีข้อมูลศึกษานิเทศก์ตามเงื่อนไขที่ค้นหา"
    />
  );
};

export default UserSupervisor;
