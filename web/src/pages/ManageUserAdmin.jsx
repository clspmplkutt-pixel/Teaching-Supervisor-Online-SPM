import React, { useEffect, useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import Swal from 'sweetalert2';
import { supabase } from '../supabaseClient';
import LoadingSpinner from '../components/LoadingSpinner';

const ManageUserAdmin = () => {
  const [loading, setLoading] = useState(true);
  const [rows, setRows] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');

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

  const handleRemove = async (username, name) => {
    const result = await Swal.fire({
      title: 'ยืนยันการลบผู้ดูแลระบบ?',
      html: `คุณต้องการลบผู้ดูแลระบบ <b>${name || username}</b> (@${username}) ใช่หรือไม่?<br/><span class="text-danger small">การกระทำนี้ไม่สามารถยกเลิกได้</span>`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'ใช่, ลบข้อมูล',
      cancelButtonText: 'ยกเลิก',
      confirmButtonColor: '#ef4444',
      reverseButtons: true,
    });

    if (result.isConfirmed) {
      try {
        const { error } = await supabase
          .from('tbl_user')
          .delete()
          .eq('user', username);
        if (error) throw error;
        Swal.fire('สำเร็จ', 'ลบผู้ดูแลระบบเรียบร้อยแล้ว', 'success');
        loadUsers();
      } catch (err) {
        console.error('Delete admin error:', err);
        Swal.fire('ข้อผิดพลาด', 'ไม่สามารถลบข้อมูลได้: ' + err.message, 'error');
      }
    }
  };

  const filteredRows = useMemo(() => {
    if (!searchTerm.trim()) return rows;
    const q = searchTerm.toLowerCase();
    return rows.filter(r =>
      (r.name || '').toLowerCase().includes(q) ||
      (r.user || '').toLowerCase().includes(q) ||
      (r.email || '').toLowerCase().includes(q)
    );
  }, [rows, searchTerm]);

  if (loading) {
    return <LoadingSpinner title="จัดการผู้ใช้งานระดับผู้ดูแลระบบ" message="กำลังโหลดข้อมูล..." />;
  }

  return (
    <div className="container-fluid py-3">
      <div className="card shadow-sm border-0" style={{ borderRadius: '12px' }}>
        <div className="card-header bg-white py-3 border-bottom d-flex justify-content-between align-items-center flex-wrap gap-2">
          <div>
            <h5 className="font-weight-bold mb-0 text-dark">
              <i className="fa-solid fa-user-shield text-primary mr-2"></i> จัดการผู้ใช้งานระดับผู้ดูแลระบบ (Admin)
            </h5>
            <p className="text-muted small mb-0 mt-1">
              ผู้มีสิทธิ์ดูแลระบบและจัดการข้อมูลกลาง ({rows.length} บัญชี)
            </p>
          </div>

          <div className="d-flex align-items-center gap-2">
            <Link to="/UserAdmin_Add" className="btn btn-primary font-weight-bold btn-sm px-3" style={{ borderRadius: '20px' }}>
              <i className="fa-solid fa-user-plus mr-1"></i> เพิ่มผู้ดูแลระบบ
            </Link>
          </div>
        </div>

        <div className="card-body p-4">
          <div className="row mb-3">
            <div className="col-md-5 col-lg-4">
              <input
                type="text"
                className="form-control form-control-sm"
                placeholder="ค้นหาชื่อ, username, อีเมล..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
          </div>

          <div className="table-responsive">
            <table className="table table-hover align-middle mb-0">
              <thead className="bg-light">
                <tr>
                  <th style={{ width: '50px' }} className="text-center">#</th>
                  <th>ชื่อ - นามสกุล</th>
                  <th>ชื่อผู้ใช้งาน (Username)</th>
                  <th>อีเมล / เบอร์โทรศัพท์</th>
                  <th>เข้าใช้งานล่าสุด (Last Login)</th>
                  <th style={{ width: '220px' }} className="text-center">การจัดการ</th>
                </tr>
              </thead>
              <tbody>
                {filteredRows.length === 0 ? (
                  <tr>
                    <td colSpan="6" className="text-center py-4 text-muted">
                      {searchTerm ? 'ไม่พบข้อมูลที่ตรงกับคำค้นหา' : 'ยังไม่มีข้อมูลผู้ดูแลระบบ'}
                    </td>
                  </tr>
                ) : (
                  filteredRows.map((row, idx) => (
                    <tr key={row.id || row.user}>
                      <td className="text-center text-muted small">{idx + 1}</td>
                      <td>
                        <div className="font-weight-bold text-dark">{row.name || '-'}</div>
                      </td>
                      <td>
                        <code className="text-primary font-weight-bold">@{row.user}</code>
                      </td>
                      <td className="small text-muted">
                        <div>{row.email || '-'}</div>
                        {row.telephone && <div>{row.telephone}</div>}
                      </td>
                      <td className="small text-muted">
                        {row.lastlog || '-'}
                      </td>
                      <td className="text-center">
                        <div className="btn-group btn-group-sm">
                          <Link
                            to={`/UserAdmin_Edit?user=${encodeURIComponent(row.user)}`}
                            className="btn btn-outline-warning"
                            title="แก้ไขข้อมูล"
                          >
                            <i className="fa-regular fa-pen-to-square mr-1"></i> แก้ไข
                          </Link>
                          <Link
                            to={`/UserAdmin_Chgpwd?user=${encodeURIComponent(row.user)}`}
                            className="btn btn-outline-info"
                            title="เปลี่ยนรหัสผ่าน"
                          >
                            <i className="fa-solid fa-key mr-1"></i> รหัส
                          </Link>
                          <button
                            type="button"
                            className="btn btn-outline-danger"
                            onClick={() => handleRemove(row.user, row.name)}
                            title="ลบผู้ดูแลระบบ"
                          >
                            <i className="fa-regular fa-trash-can"></i>
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ManageUserAdmin;
