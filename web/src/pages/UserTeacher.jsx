import React, { useCallback } from 'react';
import { Link } from 'react-router-dom';
import UserDirectoryTable from '../components/UserDirectoryTable';

const UserTeacher = () => {
  const applyBaseFilter = useCallback((query, { areaCode }) => {
    return query.eq('level', 'teacher').neq('school', areaCode);
  }, []);

  return (
    <UserDirectoryTable
      title="ทะเบียนครูผู้สอนทั้งหมด"
      subtitle="จัดการข้อมูลครูผู้สอน รีเซ็ตรหัสผ่าน และตรวจสอบสถานะการใช้งานแบบแบ่งหน้าอัตโนมัติ"
      icon="fa-chalkboard-user"
      accentColor="success"
      applyBaseFilter={applyBaseFilter}
      editVariant="teacher"
      showSchoolFilter={true}
      showSubjectFilter={true}
      showAcademicFilter={true}
      showStatusFilter={true}
      columns={{
        thaiId: true,
        school: true,
        subject: true,
        position: true,
        academic: true,
        status: true,
      }}
      headerActions={
        <Link to="/register" className="btn btn-primary btn-sm px-3">
          <i className="fa-solid fa-user-plus mr-1"></i>
          ลงทะเบียนครูใหม่
        </Link>
      }
      emptyTitle="ไม่พบรายชื่อครูผู้สอน"
      emptyMessage="ยังไม่มีรายชื่อครูผู้สอนในสถานศึกษาหรือเงื่อนไขที่เลือก"
    />
  );
};

export default UserTeacher;
