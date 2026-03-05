import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Swal from 'sweetalert2';
import { supabase } from '../supabaseClient';
import { useAuth } from '../contexts/AuthContext';

const AdminProfile = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  // legacy login stores username in .email field
  const username = user?.email || user?.user_metadata?.people_id || '';
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    user: '',
    name: '',
    email: '',
    telephone: '',
    line_token: '',
  });

  useEffect(() => {
    let mounted = true;
    const loadProfile = async () => {
      setLoading(true);
      try {
        if (!username) return;
        const { data, error } = await supabase.from('tbl_user').select('*').eq('user', username).maybeSingle();
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
          line_token: data.line_token || '',
        });
      } catch (err) {
        console.error(err);
      } finally {
        if (mounted) setLoading(false);
      }
    };
    loadProfile();
    return () => { mounted = false; };
  }, [username]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (saving) return;
    if (!form.user) {
      Swal.fire('Error', 'ไม่พบชื่อผู้ใช้งาน กรุณา Login ใหม่', 'error');
      return;
    }
    setSaving(true);
    try {
      const { data, error } = await supabase
        .from('tbl_user')
        .update({
          name: form.name,
          email: form.email,
          telephone: form.telephone,
          line_token: form.line_token,
          lastupdate: new Date().toISOString(),
        })
        .eq('user', form.user)
        .select();

      if (error) throw error;

      if (!data || data.length === 0) {
        // RLS บล็อก — ต้องแก้ใน Supabase dashboard
        Swal.fire({
          title: 'ไม่สามารถบันทึกได้',
          html: 'ระบบความปลอดภัย (RLS) บล็อกการแก้ไข<br/>กรุณาไปที่ <b>Supabase Dashboard → SQL Editor</b> แล้วรัน:<br/><code style="font-size:11px">ALTER TABLE tbl_user DISABLE ROW LEVEL SECURITY;</code>',
          icon: 'warning',
          confirmButtonText: 'เข้าใจแล้ว'
        });
        return;
      }

      Swal.fire('สำเร็จ ✅', 'แก้ไขข้อมูลสำเร็จ', 'success');
      navigate('/profile');
    } catch (err) {
      console.error(err);
      Swal.fire('Error', err.message || 'ไม่สามารถแก้ไขข้อมูลได้ เกิดข้อผิดพลาด', 'error');
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
                <input type="text" className="form-control" id="user" name="user" value={form.user} readOnly required />
              </div>
              <div className="mb-3">
                <label htmlFor="name">ชื่อ - นามสกุล:</label>
                <input type="text" className="form-control" id="name" name="name" value={form.name} onChange={handleChange} required />
              </div>
              <div className="mb-3">
                <label htmlFor="email">Email:</label>
                <input type="email" className="form-control" id="email" name="email" value={form.email} onChange={handleChange} placeholder="(ไม่บังคับ)" />
              </div>
              <div className="mb-3">
                <label htmlFor="telephone">เบอร์โทรศัพท์:</label>
                <input type="text" className="form-control" id="telephone" name="telephone" value={form.telephone} onChange={handleChange} placeholder="(ไม่บังคับ)" />
              </div>
              <div className="mb-3">
                <label htmlFor="line_token">line token:</label>
                <input type="text" className="form-control" id="line_token" name="line_token" value={form.line_token} onChange={handleChange} />
              </div>
              <div className="mb-3">
                <button type="submit" className="btn btn-primary mt-3" disabled={saving}>บันทึก</button>
                <button type="button" className="btn btn-danger mt-3 ml-2" onClick={() => navigate('/')}>ยกเลิก</button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminProfile;
