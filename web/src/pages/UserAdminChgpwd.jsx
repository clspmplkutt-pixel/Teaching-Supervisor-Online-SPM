import React, { useEffect, useState } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import Swal from 'sweetalert2';
import { supabase } from '../supabaseClient';
import { encryptLegacyPassword } from '../utils/legacyCrypto';
import LoadingSpinner from '../components/LoadingSpinner';

const UserAdminChgpwd = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const userParam = searchParams.get('user') || '';
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ user: '', newpwd1: '', newpwd2: '' });

  useEffect(() => {
    let mounted = true;
    const loadUser = async () => {
      if (!userParam) {
        setLoading(false);
        return;
      }
      setLoading(true);
      try {
        const { data, error } = await supabase.from('tbl_user').select('*').eq('user', userParam).maybeSingle();
        if (error) throw error;
        if (!data) {
          Swal.fire('Error', 'ไม่พบข้อมูลผู้ใช้งาน', 'error');
          return;
        }
        if (mounted) setForm((prev) => ({ ...prev, user: data.user }));
      } catch (err) {
        console.error(err);
      } finally {
        if (mounted) setLoading(false);
      }
    };
    loadUser();
    return () => { mounted = false; };
  }, [userParam]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (saving) return;
    if (form.newpwd1.length < 6) {
      Swal.fire('ข้อผิดพลาด', 'รหัสผ่านต้องมีอย่างน้อย 6 ตัวอักษร', 'warning');
      return;
    }
    if (form.newpwd1 !== form.newpwd2) {
      Swal.fire('ข้อผิดพลาด', 'รหัสผ่านใหม่และการยืนยันรหัสผ่านไม่ตรงกัน', 'warning');
      return;
    }
    setSaving(true);
    try {
      const encrypted = encryptLegacyPassword(form.newpwd1);
      const { error } = await supabase.from('tbl_user').update({
        passwd: encrypted,
        lastupdate: new Date().toISOString(),
      }).eq('user', form.user);
      if (error) throw error;
      Swal.fire('สำเร็จ', 'เปลี่ยนรหัสผ่านผู้ดูแลระบบเรียบร้อยแล้ว', 'success');
      navigate('/ManageUserAdmin');
    } catch (err) {
      console.error(err);
      Swal.fire('Error', 'ไม่สามารถเปลี่ยนรหัสผ่านได้: ' + err.message, 'error');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <LoadingSpinner title="เปลี่ยนรหัสผ่านผู้ดูแลระบบ" message="กำลังโหลดข้อมูล..." />;
  }

  if (!userParam) {
    return (
      <div className="container py-4 text-center">
        <p className="text-danger">ไม่พบรหัสผู้ใช้งานที่ต้องการเปลี่ยนรหัสผ่าน</p>
        <Link to="/ManageUserAdmin" className="btn btn-secondary btn-sm">กลับหน้ารายการ</Link>
      </div>
    );
  }

  return (
    <div className="container-fluid py-3">
      <div className="row justify-content-center">
        <div className="col-lg-6">
          <div className="card shadow-sm border-0" style={{ borderRadius: '12px' }}>
            <div className="card-header bg-white py-3 border-bottom">
              <h5 className="font-weight-bold mb-0 text-dark">
                <i className="fa-solid fa-key text-info mr-2"></i> เปลี่ยนรหัสผ่านผู้ดูแลระบบ (@{form.user})
              </h5>
            </div>
            <div className="card-body p-4">
              <form onSubmit={handleSubmit}>
                <div className="mb-3">
                  <label className="font-weight-bold small text-muted">ชื่อผู้ใช้งาน:</label>
                  <input type="text" className="form-control" value={form.user} readOnly disabled />
                </div>
                <div className="mb-3">
                  <label className="font-weight-bold small text-muted">รหัสผ่านใหม่ (อย่างน้อย 6 ตัวอักษร):</label>
                  <input
                    type="password"
                    className="form-control"
                    name="newpwd1"
                    placeholder="กรอกรหัสผ่านใหม่"
                    value={form.newpwd1}
                    onChange={handleChange}
                    required
                  />
                </div>
                <div className="mb-3">
                  <label className="font-weight-bold small text-muted">ยืนยันรหัสผ่านใหม่อีกครั้ง:</label>
                  <input
                    type="password"
                    className="form-control"
                    name="newpwd2"
                    placeholder="กรอกรหัสผ่านใหม่อีกครั้ง"
                    value={form.newpwd2}
                    onChange={handleChange}
                    required
                  />
                </div>

                <div className="d-flex justify-content-end gap-2 mt-4 pt-3 border-top">
                  <Link to="/ManageUserAdmin" className="btn btn-secondary px-3">
                    ยกเลิก
                  </Link>
                  <button type="submit" className="btn btn-primary font-weight-bold px-4" disabled={saving}>
                    {saving ? 'กำลังบันทึก...' : 'เปลี่ยนรหัสผ่าน'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default UserAdminChgpwd;
