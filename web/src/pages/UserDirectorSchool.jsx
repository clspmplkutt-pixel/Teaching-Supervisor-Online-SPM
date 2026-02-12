import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import Swal from 'sweetalert2';
import { supabase } from '../supabaseClient';
import useUserLookups from '../hooks/useUserLookups';
import useSelect2 from '../hooks/useSelect2';
import useAppConfig from '../hooks/useAppConfig';

const UserDirectorSchool = () => {
  const navigate = useNavigate();
  const { lookups, lists, loading: lookupsLoading } = useUserLookups();
  const { config } = useAppConfig();
  const areaCode = config.AREA_CODE10 || '1000650001';
  const [searchParams, setSearchParams] = useSearchParams();
  const [loading, setLoading] = useState(true);
  const [rows, setRows] = useState([]);

  const schoolId = searchParams.get('school_id') || '';
  const positionId = searchParams.get('position_id') || '';

  useSelect2([lookupsLoading, lists.school.length]);

  const filteredSchools = useMemo(
    () => lists.school.filter((row) => row.school_id !== areaCode),
    [lists.school, areaCode]
  );

  const loadUsers = useCallback(async () => {
    setLoading(true);
    try {
      let query = supabase.from('tbl_Users').select('*');
      if (schoolId || positionId) {
        if (schoolId && !positionId) {
          query = query.eq('school', schoolId).in('position_id', ['10006', '10007']);
        }
        if (!schoolId && positionId) {
          query = query.eq('position_id', positionId);
        }
        if (schoolId && positionId) {
          query = query.eq('school', schoolId).eq('position_id', positionId);
        }
      } else {
        query = query.in('position_id', ['10006', '10007']);
      }

      query = query.order('school', { ascending: true })
        .order('position_id', { ascending: false })
        .order('academic_id', { ascending: true });

      const { data, error } = await query;
      if (error) throw error;
      setRows(data || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [schoolId, positionId]);

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
        navigate(`/user_remove?people_id=${peopleId}&from=userdirectorschool`);
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
                  <i className="fa-solid fa-user-plus"></i> ลงทะเบียนผู้บริหาร
                </Link>
              </div>
              <div className="col-sm-12 col-md-4 col-xl-4 col-lg-4">
                <select className="form-control form-select-lg select2bs4" name="school_id" id="school_id" value={schoolId} onChange={(e) => updateParam('school_id', e.target.value)} required>
                  <option value="">โรงเรียนทั้งหมด</option>
                  {filteredSchools.map((row) => (
                    <option key={row.school_id} value={row.school_id}>{row.school_name}</option>
                  ))}
                </select>
              </div>
              <div className="col-sm-12 col-md-4 col-xl-4 col-lg-4">
                <select className="form-control form-select-lg select2bs4" name="position_id" id="position_id" value={positionId} onChange={(e) => updateParam('position_id', e.target.value)} required>
                  <option value="">ทุกตำแหน่ง</option>
                  <option value="10007">ผู้อำนวยการสถานศึกษา</option>
                  <option value="10006">รองผู้อำนวยการสถานศึกษา</option>
                </select>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="col-sm-12 col-md-12 col-lg-12 col-xl-12">
        <div className="card card-success">
          <div className="card-header">
            <h3 className="card-title"><i className="fa-solid fa-school-circle-check"></i> ผู้เข้าใช้งานระบบ ผู้อำนวยการโรงเรียน/รองผู้อำนวยการโรงเรียน</h3>
          </div>
          <div className="card-body">
            <div className="table-responsive">
              <table className="table table-bordered table-striped table-hover">
                <thead>
                  <tr>
                    <th>ที่</th>
                    <th>เลขประจำตัวประชาชน</th>
                    <th>ชื่อ - นามสกุล</th>
                    <th>ตำแหน่ง</th>
                    <th>วิทยฐานะ</th>
                    <th>โรงเรียน</th>
                    <th>Operation</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.length === 0 && (
                    <tr>
                      <td colSpan="7" className="text-center">
                        <h2 className="text-danger">ยังไม่มีข้อมูล</h2>
                      </td>
                    </tr>
                  )}
                  {rows.map((row, idx) => (
                    <tr key={row.id}>
                      <td className="text-center">{idx + 1}</td>
                      <td>{row.people_id}</td>
                      <td>{(lookups.prefix[row.prefix] || '') + row.name + ' ' + row.lastname}</td>
                      <td>{lookups.position[row.position_id] || ''}</td>
                      <td>{lookups.academic[row.academic_id] || ''}</td>
                      <td>{lookups.school[row.school] || ''}</td>
                      <td>
                        <div className="btn-group">
                          {row.people_id ? (
                            <Link to={`/directorschool_edit?people_id=${row.people_id}`} className="btn btn-warning btn-sm">
                              <i className="fa-solid fa-pen-to-square"></i> แก้ไข
                            </Link>
                          ) : (
                            <Link to={`/directorschool_edit?id=${row.id}`} className="btn btn-warning btn-sm">
                              <i className="fa-solid fa-pen-to-square"></i> แก้ไข
                            </Link>
                          )}
                          <button type="button" className="btn btn-danger btn-sm" onClick={() => handleRemove(row.people_id)}>
                            <i className="fa-solid fa-trash"></i> ลบ
                          </button>
                          <Link to={`/resetPwd?id=${row.id}&from_module=userdirectorschool`} className="btn btn-info btn-sm">
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

export default UserDirectorSchool;
