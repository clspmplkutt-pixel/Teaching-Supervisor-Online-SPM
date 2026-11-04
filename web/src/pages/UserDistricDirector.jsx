import React, { useCallback } from 'react';
import { Link } from 'react-router-dom';
import UserDirectoryTable from '../components/UserDirectoryTable';

const DD_POSITION_OPTIONS = [
  { value: '10009', label: 'ผู้อำนวยการสำนักงานเขตพื้นที่การศึกษา' },
  { value: '10008', label: 'รองผู้อำนวยการสำนักงานเขตพื้นที่การศึกษา' },
];

const DD_ORDER = [
  { field: 'position_id', ascending: false },
  { field: 'academic_id', ascending: true },
  { field: 'id', ascending: true },
];

const UserDistricDirector = () => {
  const applyBaseFilter = useCallback((query) => {
    return query.eq('level', 'districdirector');
  }, []);

  return (
    <UserDirectoryTable
      title="ทำเนียบผู้บริหารเขตพื้นที่การศึกษา"
      subtitle="ผู้อำนวยการและรองผู้อำนวยการสำนักงานเขตพื้นที่การศึกษา"
      icon="fa-user-tie"
      accentColor="primary"
      applyBaseFilter={applyBaseFilter}
      editVariant="dd"
      showSchoolFilter={false}
      showPositionFilter={true}
      positionFilterOptions={DD_POSITION_OPTIONS}
      showAcademicFilter={true}
      orderBy={DD_ORDER}
      columns={{
        thaiId: true,
        school: false,
        position: true,
        academic: true,
        status: true,
      }}
      headerActions={
        <Link to="/register" className="btn btn-primary btn-sm px-3">
          <i className="fa-solid fa-user-plus mr-1"></i>
          เพิ่มผู้บริหารเขตพื้นที่ฯ
        </Link>
      }
      emptyTitle="ไม่พบรายชื่อผู้บริหารเขตพื้นที่การศึกษา"
      emptyMessage="ยังไม่มีข้อมูลผู้บริหารเขตพื้นที่การศึกษาตามเงื่อนไขที่เลือก"
    />
  );
};

export default UserDistricDirector;
