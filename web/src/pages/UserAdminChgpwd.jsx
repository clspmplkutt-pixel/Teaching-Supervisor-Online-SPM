import React, { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import Swal from 'sweetalert2';
import { supabase } from '../supabaseClient';
import { encryptLegacyPassword } from '../utils/legacyCrypto';

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
    if (userParam) loadUser();
    return () => { mounted = false; };
  }, [userParam]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (saving) return;
    if (form.newpwd1 !== form.newpwd2) {
      Swal.fire('Error', 'รหัสผ่านใหม่ไม่ตรงกัน', 'error');
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
      Swal.fire('สำเร็จ', 'แก้ไขข้อมูลสำเร็จ', 'success');
      navigate('/ManageUserAdmin');
    } catch (err) {
      console.error(err);
      Swal.fire('Error', 'ไม่สามารถแก้ไขข้อมูลได้ เกิดข้อผิดพลาด', 'error');
    } finally {
      setSaving(false);
    }
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
      <div className="col-sm-12 col-md-12 col-lg-8 col-xl-8">
        <div className="card card-success">
          <div className="card-header">
            <h3 className="card-title"><i className="fa-solid fa-school-circle-check"></i> เปลี่ยนรหัสผ่าน User : {form.user}</h3>
          </div>
          <div className="card-body">
            <form onSubmit={handleSubmit}>
              <div className="mb-3 mt-3">
                <label htmlFor="user">ชื่อผู้ใช้งาน:</label>
                <input type="text" className="form-control" id="user" name="user" value={form.user} readOnly required />
              </div>
              <div className="mb-3">
                <label htmlFor="newpwd1">รหัสผ่านใหม่ :</label>
                <input type="password" className="form-control" id="newpwd1" name="newpwd1" value={form.newpwd1} onChange={handleChange} required />
              </div>
              <div className="mb-3">
                <label htmlFor="newpwd2">ยืนยันรหัสผ่านใหม่ :</label>
                <input type="password" className="form-control" id="newpwd2" name="newpwd2" value={form.newpwd2} onChange={handleChange} required />
              </div>
              <div className="mb-3">
                <button type="submit" className="btn btn-primary mt-3" disabled={saving}>บันทึก</button>
                <button type="button" className="btn btn-danger mt-3 ml-2" onClick={() => navigate('/ManageUserAdmin')}>ยกเลิก</button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
};

export default UserAdminChgpwd;
