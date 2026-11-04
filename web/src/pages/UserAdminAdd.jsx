import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import Swal from 'sweetalert2';
import { supabase } from '../supabaseClient';
import { encryptLegacyPassword } from '../utils/legacyCrypto';

const UserAdminAdd = () => {
  const navigate = useNavigate();
  const [form, setForm] = useState({
    user: '',
    name: '',
    email: '',
    telephone: '',
    passwd: '',
  });
  const [saving, setSaving] = useState(false);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (saving) return;
    if (form.passwd.length < 6) {
      Swal.fire('ข้อผิดพลาด', 'รหัสผ่านต้องมีอย่างน้อย 6 ตัวอักษร', 'warning');
      return;
    }
    setSaving(true);
    try {
      const encrypted = encryptLegacyPassword(form.passwd);
      const { error } = await supabase.from('tbl_user').insert([{
        level_id: 'admin',
        user: form.user.trim(),
        name: form.name.trim(),
        email: form.email.trim(),
        telephone: form.telephone.trim(),
        createUser: new Date().toISOString(),
        passwd: encrypted,
      }]);
      if (error) throw error;
      Swal.fire('สำเร็จ', 'เพิ่มผู้ดูแลระบบเรียบร้อยแล้ว', 'success');
      navigate('/ManageUserAdmin');
    } catch (err) {
      console.error(err);
      Swal.fire('Error', 'ไม่สามารถเพิ่มข้อมูลได้: ' + err.message, 'error');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="container-fluid py-3">
      <div className="row justify-content-center">
        <div className="col-lg-8">
          <div className="card shadow-sm border-0" style={{ borderRadius: '12px' }}>
            <div className="card-header bg-white py-3 border-bottom">
              <h5 className="font-weight-bold mb-0 text-dark">
                <i className="fa-solid fa-user-plus text-primary mr-2"></i> เพิ่มผู้ดูแลระบบ (Admin)
              </h5>
            </div>
            <div className="card-body p-4">
              <form onSubmit={handleSubmit}>
                <div className="row">
                  <div className="col-md-6 mb-3">
                    <label className="font-weight-bold small text-muted">ชื่อผู้ใช้งาน (Username):</label>
                    <input
                      type="text"
                      className="form-control"
                      name="user"
                      placeholder="เช่น admin_edu"
                      value={form.user}
                      onChange={handleChange}
                      required
                    />
                  </div>
                  <div className="col-md-6 mb-3">
                    <label className="font-weight-bold small text-muted">ชื่อ - นามสกุล:</label>
                    <input
                      type="text"
                      className="form-control"
                      name="name"
                      placeholder="ระบุชื่อและนามสกุล"
                      value={form.name}
                      onChange={handleChange}
                      required
                    />
                  </div>
                  <div className="col-md-6 mb-3">
                    <label className="font-weight-bold small text-muted">อีเมล:</label>
                    <input
                      type="email"
                      className="form-control"
                      name="email"
                      placeholder="admin@example.com"
                      value={form.email}
                      onChange={handleChange}
                    />
                  </div>
                  <div className="col-md-6 mb-3">
                    <label className="font-weight-bold small text-muted">เบอร์โทรศัพท์:</label>
                    <input
                      type="tel"
                      className="form-control"
                      name="telephone"
                      placeholder="08xxxxxxxx"
                      value={form.telephone}
                      onChange={handleChange}
                    />
                  </div>
                  <div className="col-md-12 mb-3">
                    <label className="font-weight-bold small text-muted">รหัสผ่านเริ่มต้น (อย่างน้อย 6 ตัวอักษร):</label>
                    <input
                      type="password"
                      className="form-control"
                      name="passwd"
                      placeholder="ระบุรหัสผ่าน"
                      value={form.passwd}
                      onChange={handleChange}
                      required
                    />
                  </div>
                </div>

                <div className="d-flex justify-content-end gap-2 mt-3 pt-3 border-top">
                  <Link to="/ManageUserAdmin" className="btn btn-secondary px-3">
                    ยกเลิก
                  </Link>
                  <button type="submit" className="btn btn-primary font-weight-bold px-4" disabled={saving}>
                    {saving ? 'กำลังบันทึก...' : 'บันทึกข้อมูล'}
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

export default UserAdminAdd;
