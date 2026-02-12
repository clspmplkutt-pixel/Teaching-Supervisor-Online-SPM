import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '../supabaseClient';
import useUserLookups from '../hooks/useUserLookups';

const CheckupUser = () => {
  const { lookups, loading: lookupsLoading } = useUserLookups();
  const [loading, setLoading] = useState(true);
  const [rows, setRows] = useState([]);

  const loadUsers = async () => {
    setLoading(true);
    try {
      const limitYear = new Date().getFullYear() - 18;
      const cutoff = `${limitYear}-12-31`;
      const { data, error } = await supabase
        .from('tbl_Users')
        .select('*')
        .or(`people_id.is.null,people_id.eq.,birthday.gt.${cutoff}`)
        .order('school', { ascending: true })
        .order('academic_id', { ascending: true })
        .order('position_id', { ascending: false });
      if (error) throw error;
      setRows(data || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadUsers();
  }, []);

  if (loading || lookupsLoading) {
    return (
      <div className="text-center p-4">
        <div className="spinner-border text-primary" role="status"></div>
        <p className="mt-2">กำลังโหลดข้อมูล...</p>
      </div>
    );
  }

  const getEditModule = (level) => {
    if (level === 'teacher') return 'teacher_edit';
    if (level === 'directorschool') return 'directorschool_edit';
    return 'teacher_edit';
  };

  return (
    <div className="row">
      <div className="col-sm-12 col-md-12 col-lg-12 col-xl-12">
        <div className="card card-success">
          <div className="card-header">
            <h3 className="card-title"><i className="fa-solid fa-school-circle-check"></i> ผู้ใช้งานข้อมูลผิดพลาด</h3>
          </div>
          <div className="card-body">
            <div className="table-responsive">
              <table className="table table-bordered table-striped table-hover">
                <thead>
                  <tr>
                    <th>ที่</th>
                    <th>ชื่อ - นามสกุล</th>
                    <th>โรงเรียน</th>
                    <th>Level</th>
                    <th>ความผิดพลาด</th>
                    <th>แก้ไขข้อมูล</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.length === 0 && (
                    <tr>
                      <td colSpan="6" className="text-center">
                        <h2 className="text-danger">ยังไม่มีข้อมูล</h2>
                      </td>
                    </tr>
                  )}
                  {rows.map((row, idx) => {
                    const name = (lookups.prefix[row.prefix] || '') + row.name + ' ' + row.lastname;
                    const errorText = row.people_id ? `ปีเกิดผิดพลาด ${row.birthday} ข้าราชการต้องอายุมากกว่า 18 ปี` : 'ไม่มีเลขประจำตัวประชาชน';
                    const moduleEdit = getEditModule(row.level);
                    return (
                      <tr key={row.id}>
                        <td className="text-center">{idx + 1}</td>
                        <td>{name}</td>
                        <td>{lookups.school[row.school] || ''}</td>
                        <td>{row.level}</td>
                        <td><span className="text-danger">{errorText}</span></td>
                        <td>
                          <Link to={`/${moduleEdit}?id=${row.id}&peopleid_error=peopleidError`} className="btn btn-danger">
                            <i className="fa-regular fa-edit"></i> แก้ไข
                          </Link>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CheckupUser;
