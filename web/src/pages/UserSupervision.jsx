import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import Swal from 'sweetalert2';
import { supabase } from '../supabaseClient';
import useUserLookups from '../hooks/useUserLookups';

const UserSupervision = () => {
  const navigate = useNavigate();
  const { lookups, loading: lookupsLoading } = useUserLookups();
  const [loading, setLoading] = useState(true);
  const [rows, setRows] = useState([]);

  const loadUsers = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('tbl_Users')
        .select('*')
        .eq('level', 'supervision')
        .order('position_id', { ascending: false })
        .order('academic_id', { ascending: true });
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
        navigate(`/user_remove?people_id=${peopleId}&from=usersupervision`);
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
        <div className="card card-success">
          <div className="card-header">
            <h3 className="card-title"><i className="fa-solid fa-school-circle-check"></i> ผู้เข้าใช้งานระบบ ผู้ประเมิน</h3>
          </div>
          <div className="card-body">
            <div className="table-responsive">
              <table className="table table-bordered table-striped table-hover">
                <thead>
                  <tr>
                    <th>ที่</th>
                    <th>ชื่อ - นามสกุล</th>
                    <th>ตำแหน่ง</th>
                    <th>วิทยฐานะ</th>
                    <th>Operation</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.length === 0 && (
                    <tr>
                      <td colSpan="5" className="text-center">
                        <h2 className="text-danger">ยังไม่มีข้อมูล</h2>
                      </td>
                    </tr>
                  )}
                  {rows.map((row, idx) => (
                    <tr key={row.id}>
                      <td className="text-center">{idx + 1}</td>
                      <td>{(lookups.prefix[row.prefix] || '') + row.name + ' ' + row.lastname}</td>
                      <td>{lookups.position[row.position_id] || ''}</td>
                      <td>{lookups.academic[row.academic_id] || ''}</td>
                      <td>
                        <div className="btn-group">
                          {row.people_id ? (
                            <Link to={`/supervisor_edit?people_id=${row.people_id}`} className="btn btn-warning btn-sm">
                              <i className="fa-solid fa-pen-to-square"></i> แก้ไข
                            </Link>
                          ) : (
                            <Link to={`/supervisor_edit?id=${row.id}`} className="btn btn-warning btn-sm">
                              <i className="fa-solid fa-pen-to-square"></i> แก้ไข
                            </Link>
                          )}
                          <button type="button" className="btn btn-danger btn-sm" onClick={() => handleRemove(row.people_id)}>
                            <i className="fa-solid fa-trash"></i> ลบ
                          </button>
                          <Link to={`/resetPwd?id=${row.id}&from_module=usersupervision`} className="btn btn-info btn-sm">
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

export default UserSupervision;
