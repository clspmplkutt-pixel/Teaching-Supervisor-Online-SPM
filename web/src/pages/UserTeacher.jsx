import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import Swal from 'sweetalert2';
import { supabase } from '../supabaseClient';
import useUserLookups from '../hooks/useUserLookups';
import useSelect2 from '../hooks/useSelect2';
import useAppConfig from '../hooks/useAppConfig';

const UserTeacher = () => {
  const navigate = useNavigate();
  const { lookups, lists, loading: lookupsLoading } = useUserLookups();
  const { config } = useAppConfig();
  const areaCode = config.AREA_CODE10 || '1000650001';
  const [searchParams, setSearchParams] = useSearchParams();
  const [loading, setLoading] = useState(true);
  const [rows, setRows] = useState([]);

  const schoolId = searchParams.get('school_id') || '';
  const teachSubject = searchParams.get('Teach_Subject') || '';

  useSelect2([lookupsLoading, lists.school.length, lists.teachSubject.length]);

  const filteredSchools = useMemo(
    () => lists.school.filter((row) => row.school_id !== areaCode),
    [lists.school, areaCode]
  );

  const loadUsers = useCallback(async () => {
    setLoading(true);
    try {
      let query = supabase
        .from('tbl_Users')
        .select('*')
        .eq('level', 'teacher')
        .eq('register_isConfirm', '1')
        .eq('status', '1')
        .neq('school', areaCode);

      if (schoolId) query = query.eq('school', schoolId);
      if (teachSubject) query = query.eq('teach_subject', teachSubject);

      query = query.order('school', { ascending: true })
        .order('academic_id', { ascending: true })
        .order('position_id', { ascending: false });

      const { data, error } = await query;
      if (error) throw error;
      setRows(data || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [schoolId, teachSubject, areaCode]);

  useEffect(() => {
    loadUsers();
  }, [loadUsers]);

  const updateParam = (key, value) => {
    const next = new URLSearchParams(searchParams);
    if (value) next.set(key, value);
    else next.delete(key);
    setSearchParams(next);
  };

  const handleRemove = (peopleId) => {
    if (!peopleId) {
      Swal.fire('Error', 'ไม่พบเลขประจำตัวประชาชน', 'error');
      return;
    }
    Swal.fire({
      title: 'ลบข้อมูลหรือไม่ ?',
      text: 'คุณจะไม่สามารถยกเลิกได้หากทำการลบไปแล้ว !',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'ใช่, ลบข้อมูล!',
      cancelButtonText: 'ไม่ ยกเลิกการลบ!',
      reverseButtons: true,
    }).then((result) => {
      if (result.isConfirmed) {
        navigate(`/user_remove?people_id=${peopleId}&from=userteacher`);
      }
    });
  };

  if (loading || lookupsLoading) {
    return (
      <div className="text-center p-4">
        <div className="spinner-border text-primary" role="status"></div>
        <p className="mt-2">กำลังโหลดข้อมูล...</p>
      </div>
    );
  }

  return (
    <div className="row">
      <div className="col-sm-12 col-md-12 col-lg-12 col-xl-12">
        <div className="card card-info card-outline">
          <div className="card-body">
            <div className="row">
              <div className="col-sm-12 col-md-4 col-xl-4 col-lg-4">
                <Link className="btn btn-block btn-info" to="/register">
                  <i className="fa-solid fa-user-plus"></i> ลงทะเบียนครู
                </Link>
              </div>

              <div className="col-sm-12 col-md-4 col-xl-4 col-lg-4">
                <select className="form-control form-select-lg select2bs4" name="school_id" id="school_id" value={schoolId} onChange={(e) => updateParam('school_id', e.target.value)} required>
                  <option value="">โรงเรียน</option>
                  {filteredSchools.map((row) => (
                    <option key={row.school_id} value={row.school_id}>{row.school_name}</option>
                  ))}
                </select>
              </div>

              <div className="col-sm-12 col-md-4 col-xl-4 col-lg-4">
                <select className="form-control form-select-lg select2bs4" name="Teach_Subject" id="Teach_Subject" value={teachSubject} onChange={(e) => updateParam('Teach_Subject', e.target.value)} required>
                  <option value="">กลุ่มสาระ</option>
                  {lists.teachSubject.map((row) => (
                    <option key={row.teach_subject_id} value={row.teach_subject_id}>{row.teach_subject}</option>
                  ))}
                </select>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="col-sm-12 col-md-12 col-lg-12 col-xl-12">
        <div className="card card-success">
          <div className="card-header">
            <h3 className="card-title"><i className="fa-solid fa-school-circle-check"></i> ผู้เข้าใช้งานระบบ ครู</h3>
          </div>
          <div className="card-body">
            <div className="table-responsive">
              <table className="table table-bordered table-striped table-hover">
                <thead>
                  <tr>
                    <th>ที่</th>
                    <th>เลขประจำตัวประชาชน</th>
                    <th>ชื่อ - นามสกุล</th>
                    <th>โรงเรียน</th>
                    <th>กลุ่มสาระ</th>
                    <th>ตำแหน่ง</th>
                    <th>วิทยฐานะ</th>
                    <th>ประเภทบุคลากร</th>
                    <th>Operation</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.length === 0 && (
                    <tr>
                      <td colSpan="9" className="text-center">
                        <h2 className="text-danger">ยังไม่มีข้อมูล</h2>
                      </td>
                    </tr>
                  )}
                  {rows.map((row, idx) => (
                    <tr key={row.id}>
                      <td className="text-center">{idx + 1}</td>
                      <td>{row.people_id}</td>
                      <td>{(lookups.prefix[row.prefix] || '') + row.name + ' ' + row.lastname}</td>
                      <td>{lookups.school[row.school] || ''}</td>
                      <td>{lookups.teachSubject[row.teach_subject] || ''}</td>
                      <td>{lookups.position[row.position_id] || ''}</td>
                      <td>{lookups.academic[row.academic_id] || ''}</td>
                      <td>{lookups.personType[row.persontype_id] || ''}</td>
                      <td>
                        <div className="btn-group">
                          {row.people_id ? (
                            <Link to={`/teacher_edit?people_id=${row.people_id}`} className="btn btn-warning btn-sm">
                              <i className="fa-solid fa-pen-to-square"></i> แก้ไข
                            </Link>
                          ) : (
                            <Link to={`/teacher_edit?id=${row.id}`} className="btn btn-warning btn-sm">
                              <i className="fa-solid fa-pen-to-square"></i> แก้ไข
                            </Link>
                          )}
                          <button type="button" className="btn btn-danger btn-sm" onClick={() => handleRemove(row.people_id)}>
                            <i className="fa-solid fa-trash"></i> ลบ
                          </button>
                          <Link to={`/resetPwd?id=${row.id}&from_module=userteacher`} className="btn btn-info btn-sm">
                            <i className="fa-solid fa-key"></i> Reset
                          </Link>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default UserTeacher;
