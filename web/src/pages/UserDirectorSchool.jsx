import React, { useCallback } from 'react';
import { Link } from 'react-router-dom';
import UserDirectoryTable from '../components/UserDirectoryTable';

const DIRECTOR_POSITION_OPTIONS = [
  { value: '10007', label: 'ผู้อำนวยการสถานศึกษา' },
  { value: '10006', label: 'รองผู้อำนวยการสถานศึกษา' },
];

const DIRECTOR_ORDER = [
  { field: 'school', ascending: true },
  { field: 'position_id', ascending: false },
  { field: 'academic_id', ascending: true },
  { field: 'id', ascending: true },
];

const UserDirectorSchool = () => {
  const applyBaseFilter = useCallback((query) => {
    return query.in('position_id', ['10006', '10007']);
  }, []);

  return (
    <UserDirectoryTable
      title="ทำเนียบผู้อำนวยการและรองผู้อำนวยการสถานศึกษา"
      subtitle="รายชื่อผู้บริหารสถานศึกษาในสังกัด จัดการข้อมูลและรีเซ็ตรหัสผ่านอย่างปลอดภัย"
      icon="fa-building-user"
      accentColor="info"
      applyBaseFilter={applyBaseFilter}
      editVariant="directorschool"
      showSchoolFilter={true}
      showPositionFilter={true}
      positionFilterOptions={DIRECTOR_POSITION_OPTIONS}
      showAcademicFilter={true}
      showStatusFilter={true}
      orderBy={DIRECTOR_ORDER}
      columns={{
        thaiId: true,
        school: true,
        position: true,
        academic: true,
        schoolKhet: true,
        status: true,
      }}
      headerActions={
        <Link to="/register" className="btn btn-primary btn-sm px-3">
          <i className="fa-solid fa-user-plus mr-1"></i>
          ลงทะเบียนผู้บริหาร
        </Link>
      }
      emptyTitle="ไม่พบรายชื่อผู้บริหารสถานศึกษา"
      emptyMessage="ยังไม่มีข้อมูลผู้อำนวยการหรือรองผู้อำนวยการสถานศึกษาตามเงื่อนไขที่เลือก"
    />
  );
};

export default UserDirectorSchool;
