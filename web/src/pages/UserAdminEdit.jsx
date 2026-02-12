import React, { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import Swal from 'sweetalert2';
import { supabase } from '../supabaseClient';

const UserAdminEdit = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const userParam = searchParams.get('user') || '';
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ user: '', name: '', email: '', telephone: '' });

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
        if (!mounted) return;
        setForm({
          user: data.user || '',
          name: data.name || '',
          email: data.email || '',
          telephone: data.telephone || '',
        });
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
    setSaving(true);
    try {
      const { error } = await supabase.from('tbl_user').update({
        name: form.name,
        email: form.email,
        telephone: form.telephone,
        lastupdate: new Date().toISOString(),
      }).eq('user', form.user);
      if (error) throw error;
      Swal.fire('สำเร็จ', 'แก้ไขข้อมูลสำเร็จ', 'success');
      navigate('/ManageUserAdmin');
    } catch (err) {
      console.error(err);
      Swal.fire('Error', 'ไม่สามารถเพิ่มข้อมูลได้ เกิดข้อผิดพลาด', 'error');
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
            <h3 className="card-title"><i className="fa-solid fa-school-circle-check"></i> ปรับปรุงข้อมูลส่วนตัว</h3>
          </div>
          <div className="card-body">
            <form onSubmit={handleSubmit}>
              <div className="mb-3 mt-3">
                <label htmlFor="user">ชื่อผู้ใช้งาน:</label>
                <input type="text" className="form-control" id="user" placeholder="ชื่อผู้ใช้งาน" name="user" value={form.user} readOnly required />
              </div>
              <div className="mb-3">
                <label htmlFor="name">ชื่อ - นามสกุล :</label>
                <input type="text" className="form-control" id="name" placeholder="ชื่อ - นามสกุล" name="name" value={form.name} onChange={handleChange} required />
              </div>
              <div className="mb-3">
                <label htmlFor="email">Email :</label>
                <input type="email" className="form-control" id="email" placeholder="email" name="email" value={form.email} onChange={handleChange} />
              </div>
              <div className="mb-3">
                <label htmlFor="telephone">เบอร์โทรศัพท์ :</label>
                <input type="text" className="form-control" id="telephone" placeholder="เบอร์โทรศัพท์" name="telephone" value={form.telephone} onChange={handleChange} />
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

export default UserAdminEdit;
