import React, { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import Swal from 'sweetalert2';
import { supabase } from '../supabaseClient';
import { useAuth } from '../contexts/AuthContext';
import { encryptLegacyPassword, encryptLegacyPasswordPHP } from '../utils/legacyCrypto';

const ChangePassword = () => {
  const { user, logout } = useAuth();
  const [oldpwd, setOldpwd] = useState('');
  const [newpwd1, setNewpwd1] = useState('');
  const [newpwd2, setNewpwd2] = useState('');
  const [showOld, setShowOld] = useState(false);
  const [showNew1, setShowNew1] = useState(false);
  const [showNew2, setShowNew2] = useState(false);
  const [saving, setSaving] = useState(false);

  const role = user?.level_id || user?.user_metadata?.role || '';
  const isAdminAccount = role === 'admin' || role === 'root';
  const loginId = user?.user || user?.email || user?.user_metadata?.people_id || '';
  const peopleIdClean = String(user?.user_metadata?.people_id || loginId).replace(/\D/g, '');

  const checks = useMemo(() => {
    const hasMinLength = newpwd1.length >= 6;
    const notSameAsOld = Boolean(newpwd1) && newpwd1 !== oldpwd;
    const notSameAsId =
      Boolean(newpwd1) &&
      newpwd1 !== loginId &&
      (!peopleIdClean || newpwd1.replace(/\D/g, '') !== peopleIdClean) &&
      newpwd1 !== '123456';
    const isConfirmed = Boolean(newpwd1) && newpwd1 === newpwd2;
    return {
      hasMinLength,
      notSameAsOld,
      notSameAsId,
      isConfirmed,
      allValid: Boolean(oldpwd) && hasMinLength && notSameAsOld && notSameAsId && isConfirmed,
    };
  }, [oldpwd, newpwd1, newpwd2, loginId, peopleIdClean]);

  const validate = () => {
    if (!oldpwd) {
      Swal.fire('ข้อมูลไม่ครบถ้วน', 'กรุณากรอกรหัสผ่านปัจจุบัน', 'warning');
      return false;
    }
    if (!newpwd1) {
      Swal.fire('ข้อมูลไม่ครบถ้วน', 'กรุณากรอกรหัสผ่านใหม่', 'warning');
      return false;
    }
    if (newpwd1.length < 6) {
      Swal.fire('รหัสผ่านสั้นเกินไป', 'รหัสผ่านใหม่ต้องมีความยาวอย่างน้อย 6 ตัวอักษร', 'warning');
      return false;
    }
    if (newpwd1 === oldpwd) {
      Swal.fire('รหัสผ่านซ้ำกับรหัสเดิม', 'กรุณาตั้งรหัสผ่านใหม่ให้แตกต่างจากรหัสผ่านปัจจุบัน', 'warning');
      return false;
    }
    if (
      newpwd1 === loginId ||
      (peopleIdClean && newpwd1.replace(/\D/g, '') === peopleIdClean) ||
      newpwd1 === '123456'
    ) {
      Swal.fire(
        'รหัสผ่านคาดเดาง่ายเกินไป',
        'กรุณาอย่าใช้เลขประจำตัวประชาชน 13 หลัก หรือ 123456 เป็นรหัสผ่านใหม่',
        'warning'
      );
      return false;
    }
    if (!newpwd2 || newpwd1 !== newpwd2) {
      Swal.fire('รหัสผ่านไม่ตรงกัน', 'รหัสผ่านใหม่และยืนยันรหัสผ่านใหม่ไม่ตรงกัน', 'error');
      return false;
    }
    return true;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (saving) return;
    if (!validate()) return;
    if (!loginId) {
      Swal.fire('ข้อผิดพลาด', 'ไม่พบข้อมูลบัญชีผู้ใช้งาน กรุณาเข้าสู่ระบบใหม่อีกครั้ง', 'error');
      return;
    }

    setSaving(true);
    try {
      const table = isAdminAccount ? 'tbl_user' : 'tbl_Users';
      const hasNumericRowId =
        !isAdminAccount &&
        user?.id != null &&
        /^\d+$/.test(String(user.id)) &&
        String(user.id).length < 13;
      const idColumn = isAdminAccount ? 'user' : hasNumericRowId ? 'id' : 'people_id';
      const idValue = isAdminAccount ? loginId : hasNumericRowId ? Number(user.id) : loginId;

      const { data: rows, error: fetchError } = await supabase
        .from(table)
        .select('passwd')
        .eq(idColumn, idValue)
        .limit(1);

      if (fetchError) throw fetchError;
      const existing = rows?.[0];

      const oldOk =
        existing &&
        (existing.passwd === encryptLegacyPassword(oldpwd) ||
          existing.passwd === encryptLegacyPasswordPHP(oldpwd));

      if (!oldOk) {
        Swal.fire('รหัสผ่านไม่ถูกต้อง', 'รหัสผ่านปัจจุบันไม่ถูกต้อง กรุณาตรวจสอบอีกครั้ง', 'error');
        setSaving(false);
        return;
      }

      const newEncrypted = encryptLegacyPassword(newpwd1);
      const { error: updateError } = await supabase
        .from(table)
        .update({ passwd: newEncrypted, lastupdate: new Date().toISOString() })
        .eq(idColumn, idValue);

      if (updateError) throw updateError;

      setSaving(false);
      await Swal.fire({
        icon: 'success',
        title: 'เปลี่ยนรหัสผ่านสำเร็จ!',
        text: 'ระบบได้บันทึกรหัสผ่านใหม่ของท่านแล้ว กรุณาเข้าสู่ระบบอีกครั้งด้วยรหัสผ่านใหม่',
        confirmButtonText: 'เข้าสู่ระบบใหม่',
        confirmButtonColor: '#2563eb',
        allowOutsideClick: false,
      });
      await logout();
    } catch (err) {
      console.error(err);
      Swal.fire('เกิดข้อผิดพลาด', err.message || 'ไม่สามารถเปลี่ยนรหัสผ่านได้ กรุณาลองใหม่อีกครั้ง', 'error');
      setSaving(false);
    }
  };

  const renderCheckItem = (passed, active, text) => (
    <li className="d-flex align-items-center mb-1" style={{ fontSize: '0.82rem' }}>
      <i
        className={`fa-solid ${
          !active ? 'fa-circle text-muted' : passed ? 'fa-circle-check text-success' : 'fa-circle-xmark text-danger'
        } mr-2`}
        style={{ fontSize: !active ? '0.45rem' : '0.85rem' }}
      ></i>
      <span className={!active ? 'text-muted' : passed ? 'text-success font-weight-bold' : 'text-danger'}>
        {text}
      </span>
    </li>
  );

  return (
    <div className="container-fluid py-3">
      <div className="row justify-content-center">
        <div className="col-12 col-md-8 col-lg-6 mx-auto">
          <div className="card border-0 shadow-sm" style={{ borderRadius: '14px' }}>
            <div
              className="card-header bg-white border-bottom py-3 px-4"
              style={{ borderRadius: '14px 14px 0 0' }}
            >
              <h5 className="font-weight-bold text-dark m-0">
                <i className="fa-solid fa-shield-halved text-primary mr-2"></i>
                เปลี่ยนรหัสผ่านเข้าใช้งาน
              </h5>
              <small className="text-muted">
                ตั้งรหัสผ่านใหม่ที่ปลอดภัยและจดจำง่าย เพื่อปกป้องข้อมูลส่วนบุคคลของท่าน
              </small>
            </div>

            <form onSubmit={handleSubmit}>
              <div className="card-body p-4">
                {/* Current Password */}
                <div className="form-group mb-3">
                  <label htmlFor="oldpwd" className="small font-weight-bold text-dark">
                    รหัสผ่านปัจจุบัน <span className="text-danger">*</span>
                  </label>
                  <div className="input-group">
                    <input
                      type={showOld ? 'text' : 'password'}
                      className="form-control border-right-0"
                      id="oldpwd"
                      placeholder="ระบุรหัสผ่านปัจจุบันของท่าน"
                      value={oldpwd}
                      onChange={(e) => setOldpwd(e.target.value)}
                      required
                    />
                    <div className="input-group-append">
                      <button
                        type="button"
                        className="btn btn-outline-secondary border-left-0 bg-white text-muted"
                        style={{ borderColor: '#ced4da' }}
                        onClick={() => setShowOld((prev) => !prev)}
                        title={showOld ? 'ซ่อนรหัสผ่าน' : 'แสดงรหัสผ่าน'}
                      >
                        <i className={`fa-solid ${showOld ? 'fa-eye-slash' : 'fa-eye'}`}></i>
                      </button>
                    </div>
                  </div>
                </div>

                {/* New Password */}
                <div className="form-group mb-3">
                  <label htmlFor="newpwd1" className="small font-weight-bold text-dark">
                    รหัสผ่านใหม่ <span className="text-danger">*</span>
                  </label>
                  <div className="input-group">
                    <input
                      type={showNew1 ? 'text' : 'password'}
                      className="form-control border-right-0"
                      id="newpwd1"
                      placeholder="อย่างน้อย 6 ตัวอักษร"
                      value={newpwd1}
                      onChange={(e) => setNewpwd1(e.target.value)}
                      required
                    />
                    <div className="input-group-append">
                      <button
                        type="button"
                        className="btn btn-outline-secondary border-left-0 bg-white text-muted"
                        style={{ borderColor: '#ced4da' }}
                        onClick={() => setShowNew1((prev) => !prev)}
                        title={showNew1 ? 'ซ่อนรหัสผ่าน' : 'แสดงรหัสผ่าน'}
                      >
                        <i className={`fa-solid ${showNew1 ? 'fa-eye-slash' : 'fa-eye'}`}></i>
                      </button>
                    </div>
                  </div>
                </div>

                {/* Confirm New Password */}
                <div className="form-group mb-3">
                  <label htmlFor="newpwd2" className="small font-weight-bold text-dark">
                    ยืนยันรหัสผ่านใหม่ <span className="text-danger">*</span>
                  </label>
                  <div className="input-group">
                    <input
                      type={showNew2 ? 'text' : 'password'}
                      className="form-control border-right-0"
                      id="newpwd2"
                      placeholder="กรอกรหัสผ่านใหม่อีกครั้งให้ตรงกัน"
                      value={newpwd2}
                      onChange={(e) => setNewpwd2(e.target.value)}
                      required
                    />
                    <div className="input-group-append">
                      <button
                        type="button"
                        className="btn btn-outline-secondary border-left-0 bg-white text-muted"
                        style={{ borderColor: '#ced4da' }}
                        onClick={() => setShowNew2((prev) => !prev)}
                        title={showNew2 ? 'ซ่อนรหัสผ่าน' : 'แสดงรหัสผ่าน'}
                      >
                        <i className={`fa-solid ${showNew2 ? 'fa-eye-slash' : 'fa-eye'}`}></i>
                      </button>
                    </div>
                  </div>
                </div>

                {/* Live Password Validation Checklist */}
                <div className="p-3 rounded border bg-light" style={{ borderRadius: '10px' }}>
                  <div className="small font-weight-bold text-dark mb-2">
                    <i className="fa-solid fa-list-check text-primary mr-1"></i>เงื่อนไขความปลอดภัยของรหัสผ่าน
                  </div>
                  <ul className="list-unstyled mb-0">
                    {renderCheckItem(checks.hasMinLength, newpwd1.length > 0, 'ความยาวอย่างน้อย 6 ตัวอักษร')}
                    {renderCheckItem(checks.notSameAsOld, newpwd1.length > 0 && oldpwd.length > 0, 'ไม่ซ้ำกับรหัสผ่านปัจจุบัน')}
                    {renderCheckItem(checks.notSameAsId, newpwd1.length > 0, 'ไม่ตรงกับเลขบัตรประชาชน 13 หลัก หรือ 123456')}
                    {renderCheckItem(checks.isConfirmed, newpwd2.length > 0, 'ยืนยันรหัสผ่านใหม่ตรงกัน')}
                  </ul>
                </div>
              </div>

              <div
                className="card-footer bg-light border-top py-3 px-4 d-flex justify-content-end align-items-center"
                style={{ gap: '8px', borderRadius: '0 0 14px 14px' }}
              >
                <Link to="/" className="btn btn-outline-secondary font-weight-bold px-4">
                  ยกเลิก
                </Link>
                <button
                  type="submit"
                  className="btn btn-primary font-weight-bold px-4 shadow-sm"
                  disabled={saving}
                >
                  {saving ? (
                    <span>
                      <span className="spinner-border spinner-border-sm mr-2"></span>กำลังบันทึก...
                    </span>
                  ) : (
                    <span>
                      <i className="fa-solid fa-key mr-2"></i>บันทึกรหัสผ่านใหม่
                    </span>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ChangePassword;
