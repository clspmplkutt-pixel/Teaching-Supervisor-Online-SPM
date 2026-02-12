import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import Swal from 'sweetalert2';
import { supabase } from '../supabaseClient';

const ManageUserAdmin = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [rows, setRows] = useState([]);

  const loadUsers = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('tbl_user')
        .select('*')
        .eq('level_id', 'admin')
        .order('id', { ascending: true });
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

  const handleRemove = (user) => {
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
        navigate(`/user_remove?user=${user}`);
      }
    });
  };

  if (loading) {
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
            <h3 className="card-title"><i className="fa-solid fa-school-circle-check"></i> จัดการผู้ใช้งานระดับผู้ดูแลระบบ</h3>
          </div>
          <div className="card-body">
            <Link to="/UserAdmin_Add" className="btn btn-outline-primary btn-block">
              <i className="fa-solid fa-user-shield"></i> เพิ่มผู้ดูแลระบบ
            </Link>
            <div className="table-responsive mt-3">
              <table className="table table-bordered table-striped table-hover">
                <thead>
                  <tr>
                    <th>ชื่อ - นามสกุล</th>
                    <th>ชื่อผู้ใช้งาน</th>
                    <th>Last Login</th>
                    <th>Operation</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.length === 0 && (
                    <tr>
                      <td colSpan="4" className="text-center">
                        <h2 className="text-danger">ยังไม่มีข้อมูล</h2>
                      </td>
                    </tr>
                  )}
                  {rows.map((row) => (
                    <tr key={row.id}>
                      <td>{row.name}</td>
                      <td>{row.user}</td>
                      <td>{row.lastlog}</td>
                      <td>
                        <div className="btn-group">
                          <Link to={`/UserAdmin_Edit?user=${row.user}`} className="btn btn-sm btn-warning">
                            <i className="fa-regular fa-pen-to-square"></i> แก้ไข
                          </Link>
                          <button type="button" className="btn btn-sm btn-danger" onClick={() => handleRemove(row.user)}>
                            <i className="fa-regular fa-trash-can"></i> ลบ
                          </button>
                          <Link to={`/UserAdmin_Chgpwd?user=${row.user}`} className="btn btn-sm btn-info">
                            <i className="fa-solid fa-key"></i> รหัสผ่าน
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

export default ManageUserAdmin;
