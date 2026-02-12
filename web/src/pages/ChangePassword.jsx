import React, { useState } from 'react';
import Swal from 'sweetalert2';
import { supabase } from '../supabaseClient';
import { useAuth } from '../contexts/AuthContext';
import { encryptLegacyPassword } from '../utils/legacyCrypto';

const ChangePassword = () => {
  const { user, logout } = useAuth();
  const [oldpwd, setOldpwd] = useState('');
  const [newpwd1, setNewpwd1] = useState('');
  const [newpwd2, setNewpwd2] = useState('');
  const [saving, setSaving] = useState(false);

  const role = user?.level_id || user?.user_metadata?.role || '';
  const isAdminAccount = role === 'admin' || role === 'root';
  const loginId = user?.email || user?.user_metadata?.people_id || '';

  const validate = () => {
    if (!oldpwd) {
      Swal.fire('Warning', 'กรุณากรอกรหัสผ่านเก่า', 'info');
      return false;
    }
    if (!newpwd1) {
      Swal.fire('Warning', 'กรุณากรอกรหัสผ่านใหม่', 'info');
      return false;
    }
    if (!newpwd2) {
      Swal.fire('Warning', 'กรุณากรอกยืนยันรหัสผ่านใหม่', 'info');
      return false;
    }
    if (newpwd1 !== newpwd2) {
      Swal.fire('Error', 'รหัสผ่านใหม่และยืนยันรหัสผ่านไม่ตรงกัน', 'error');
      return false;
    }
    return true;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validate()) return;
    if (!loginId) {
      Swal.fire('Error', 'ไม่พบข้อมูลผู้ใช้งาน', 'error');
      return;
    }

    setSaving(true);
    try {
      const table = isAdminAccount ? 'tbl_user' : 'tbl_Users';
      const idColumn = isAdminAccount ? 'user' : 'people_id';

      const { data: existing, error: fetchError } = await supabase
        .from(table)
        .select('passwd')
        .eq(idColumn, loginId)
        .maybeSingle();

      if (fetchError) throw fetchError;

      const oldEncrypted = encryptLegacyPassword(oldpwd);
      if (!existing || existing.passwd !== oldEncrypted) {
        Swal.fire('Error', 'รหัสผ่านเก่าไม่ถูกต้อง', 'error');
        setSaving(false);
        return;
      }

      const newEncrypted = encryptLegacyPassword(newpwd1);
      const { error: updateError } = await supabase
        .from(table)
        .update({ passwd: newEncrypted, lastupdate: new Date().toISOString() })
        .eq(idColumn, loginId);

      if (updateError) throw updateError;

      Swal.fire('สำเร็จ', 'แก้ไขข้อมูลสำเร็จ กรุณาเข้าสู่ระบบใหม่', 'success');
      setTimeout(() => {
        logout();
      }, 1200);
    } catch (err) {
      console.error(err);
      Swal.fire('Error', 'ไม่สามารถแก้ไขข้อมูลได้ เกิดข้อผิดพลาด', 'error');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="row">
      <div className="col-sm-12 col-md-12 col-lg-8 col-xl-8">
        <div className="card card-success">
          <div className="card-header">
            <h3 className="card-title"><i className="fa-solid fa-school-circle-check"></i> เปลี่ยนรหัสผ่าน</h3>
          </div>
          <div className="card-body">
            <form onSubmit={handleSubmit}>
              <div className="mb-3">
                <label htmlFor="oldpwd">รหัสผ่านเดิม :</label>
                <input type="password" className="form-control" id="oldpwd" placeholder="รหัสผ่านเดิม" value={oldpwd} onChange={(e) => setOldpwd(e.target.value)} />
              </div>
              <div className="mb-3">
                <label htmlFor="newpwd1">รหัสผ่านใหม่ :</label>
                <input type="password" className="form-control" id="newpwd1" placeholder="รหัสผ่านใหม่" value={newpwd1} onChange={(e) => setNewpwd1(e.target.value)} />
              </div>
              <div className="mb-3">
                <label htmlFor="newpwd2">ยืนยันรหัสผ่านใหม่ :</label>
                <input type="password" className="form-control" id="newpwd2" placeholder="ยืนยันรหัสผ่านใหม่" value={newpwd2} onChange={(e) => setNewpwd2(e.target.value)} />
              </div>

              <div className="mb-3">
                <button type="submit" className="btn btn-primary mt-3" disabled={saving}>บันทึก</button>
                <a href="/" className="btn btn-danger mt-3 ml-2">ยกเลิก</a>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ChangePassword;
