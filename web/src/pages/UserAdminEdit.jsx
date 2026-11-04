import React, { useEffect, useState } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import Swal from 'sweetalert2';
import { supabase } from '../supabaseClient';
import LoadingSpinner from '../components/LoadingSpinner';

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
    setSaving(true);
    try {
      const { error } = await supabase.from('tbl_user').update({
        name: form.name.trim(),
        email: form.email.trim(),
        telephone: form.telephone.trim(),
        lastupdate: new Date().toISOString(),
      }).eq('user', form.user);
      if (error) throw error;
      Swal.fire('สำเร็จ', 'แก้ไขข้อมูลผู้ดูแลระบบสำเร็จ', 'success');
      navigate('/ManageUserAdmin');
    } catch (err) {
      console.error(err);
      Swal.fire('Error', 'ไม่สามารถบันทึกข้อมูลได้', 'error');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <LoadingSpinner title="แก้ไขข้อมูลผู้ดูแลระบบ" message="กำลังโหลดข้อมูล..." />;
  }

  if (!userParam) {
    return (
      <div className="container py-4 text-center">
        <p className="text-danger">ไม่พบรหัสผู้ใช้งานที่ต้องการแก้ไข</p>
        <Link to="/ManageUserAdmin" className="btn btn-secondary btn-sm">กลับหน้ารายการ</Link>
      </div>
    );
  }

  return (
    <div className="container-fluid py-3">
      <div className="row justify-content-center">
        <div className="col-lg-8">
          <div className="card shadow-sm border-0" style={{ borderRadius: '12px' }}>
            <div className="card-header bg-white py-3 border-bottom">
              <h5 className="font-weight-bold mb-0 text-dark">
                <i className="fa-solid fa-user-pen text-warning mr-2"></i> แก้ไขข้อมูลผู้ดูแลระบบ (@{form.user})
              </h5>
            </div>
            <div className="card-body p-4">
              <form onSubmit={handleSubmit}>
                <div className="row">
                  <div className="col-md-6 mb-3">
                    <label className="font-weight-bold small text-muted">ชื่อผู้ใช้งาน (Username):</label>
                    <input type="text" className="form-control" name="user" value={form.user} readOnly disabled />
                  </div>
                  <div className="col-md-6 mb-3">
                    <label className="font-weight-bold small text-muted">ชื่อ - นามสกุล:</label>
                    <input
                      type="text"
                      className="form-control"
                      name="name"
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
                      value={form.telephone}
                      onChange={handleChange}
                    />
                  </div>
                </div>

                <div className="d-flex justify-content-end gap-2 mt-3 pt-3 border-top">
                  <Link to="/ManageUserAdmin" className="btn btn-secondary px-3">
                    ยกเลิก
                  </Link>
                  <button type="submit" className="btn btn-primary font-weight-bold px-4" disabled={saving}>
                    {saving ? 'กำลังบันทึก...' : 'บันทึกการแก้ไข'}
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

export default UserAdminEdit;
