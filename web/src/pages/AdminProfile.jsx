import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import Swal from 'sweetalert2';
import { supabase } from '../supabaseClient';
import { useAuth } from '../contexts/AuthContext';
import { showToast } from '../utils/toast';
import LoadingSpinner from '../components/LoadingSpinner';

const AdminProfile = () => {
  const { user } = useAuth();
  const username = user?.user || user?.email || user?.user_metadata?.people_id || '';
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showToken, setShowToken] = useState(false);
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
        const { data, error } = await supabase
          .from('tbl_user')
          .select('*')
          .eq('user', username)
          .limit(1);
        if (error) throw error;
        const row = data?.[0];
        if (!row) {
          if (mounted) {
            Swal.fire('ไม่พบข้อมูล', 'ไม่พบข้อมูลบัญชีผู้ดูแลระบบในระบบ', 'warning');
          }
          return;
        }
        if (!mounted) return;
        setForm({
          user: row.user || '',
          name: row.name || '',
          email: row.email || '',
          telephone: row.telephone || '',
          line_token: row.line_token || '',
        });
      } catch (err) {
        console.error('AdminProfile load error:', err);
      } finally {
        if (mounted) setLoading(false);
      }
    };
    loadProfile();
    return () => {
      mounted = false;
    };
  }, [username]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (saving) return;
    if (!form.user) {
      Swal.fire('ไม่สามารถบันทึกได้', 'ไม่พบชื่อผู้ใช้งาน กรุณาเข้าสู่ระบบใหม่อีกครั้ง', 'error');
      return;
    }

    setSaving(true);
    try {
      const { data, error } = await supabase
        .from('tbl_user')
        .update({
          name: String(form.name || '').trim(),
          email: String(form.email || '').trim(),
          telephone: String(form.telephone || '').trim(),
          line_token: String(form.line_token || '').trim(),
          lastupdate: new Date().toISOString(),
        })
        .eq('user', form.user)
        .select();

      if (error) throw error;

      if (!data || data.length === 0) {
        Swal.fire(
          'ไม่สามารถบันทึกข้อมูลได้',
          'บัญชีผู้ใช้งานนี้ไม่มีสิทธิ์แก้ไขข้อมูล หรือเซสชันหมดอายุ กรุณาเข้าสู่ระบบใหม่อีกครั้ง',
          'warning'
        );
        return;
      }

      showToast('บันทึกข้อมูลผู้ดูแลระบบเรียบร้อยแล้ว', 'success');
    } catch (err) {
      console.error(err);
      Swal.fire('เกิดข้อผิดพลาด', err.message || 'ไม่สามารถแก้ไขข้อมูลได้ กรุณาลองใหม่อีกครั้ง', 'error');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <LoadingSpinner message="กำลังโหลดข้อมูลผู้ดูแลระบบ..." />;
  }

  return (
    <div className="container-fluid py-3">
      <div className="row justify-content-center">
        <div className="col-12 col-md-9 col-lg-7 mx-auto">
          <div className="card border-0 shadow-sm" style={{ borderRadius: '14px' }}>
            <div
              className="card-header bg-white border-bottom py-3 px-4 d-flex justify-content-between align-items-center"
              style={{ borderRadius: '14px 14px 0 0' }}
            >
              <div>
                <h5 className="font-weight-bold text-dark m-0">
                  <i className="fa-solid fa-user-shield text-primary mr-2"></i>
                  ข้อมูลส่วนตัวผู้ดูแลระบบ
                </h5>
                <small className="text-muted">ปรับปรุงข้อมูลการติดต่อและการเชื่อมต่อแจ้งเตือนระบบ</small>
              </div>
              <span className="badge badge-primary px-3 py-1">
                {form.user || username || 'Admin'}
              </span>
            </div>

            <form onSubmit={handleSubmit}>
              <div className="card-body p-4">
                <div className="form-group mb-3">
                  <label htmlFor="user" className="small font-weight-bold text-dark">
                    ชื่อบัญชีผู้ใช้งาน (Username)
                  </label>
                  <input
                    type="text"
                    className="form-control bg-light text-muted"
                    id="user"
                    name="user"
                    value={form.user}
                    readOnly
                    required
                  />
                </div>

                <div className="form-group mb-3">
                  <label htmlFor="name" className="small font-weight-bold text-dark">
                    ชื่อ - นามสกุล / ชื่อแสดงผล <span className="text-danger">*</span>
                  </label>
                  <input
                    type="text"
                    className="form-control"
                    id="name"
                    name="name"
                    value={form.name}
                    onChange={handleChange}
                    placeholder="ระบุชื่อ-นามสกุลผู้ดูแลระบบ"
                    required
                  />
                </div>

                <div className="row">
                  <div className="col-md-6 form-group mb-3">
                    <label htmlFor="email" className="small font-weight-bold text-dark">
                      อีเมลติดต่อ (Email)
                    </label>
                    <input
                      type="email"
                      className="form-control"
                      id="email"
                      name="email"
                      value={form.email}
                      onChange={handleChange}
                      placeholder="admin@sesao39.go.th (ไม่บังคับ)"
                    />
                  </div>
                  <div className="col-md-6 form-group mb-3">
                    <label htmlFor="telephone" className="small font-weight-bold text-dark">
                      เบอร์โทรศัพท์ติดต่อ
                    </label>
                    <input
                      type="tel"
                      className="form-control"
                      id="telephone"
                      name="telephone"
                      value={form.telephone}
                      onChange={handleChange}
                      placeholder="เช่น 055-000000 (ไม่บังคับ)"
                    />
                  </div>
                </div>

                <div className="form-group mb-1">
                  <label htmlFor="line_token" className="small font-weight-bold text-dark">
                    รหัสเชื่อมต่อแจ้งเตือน LINE (Token / Reference Key)
                  </label>
                  <div className="input-group">
                    <input
                      type={showToken ? 'text' : 'password'}
                      className="form-control border-right-0"
                      id="line_token"
                      name="line_token"
                      value={form.line_token}
                      onChange={handleChange}
                      placeholder="ระบุ Token สำหรับการแจ้งเตือนระบบ (หากมี)"
                    />
                    <div className="input-group-append">
                      <button
                        type="button"
                        className="btn btn-outline-secondary border-left-0 bg-white text-muted"
                        style={{ borderColor: '#ced4da' }}
                        onClick={() => setShowToken((prev) => !prev)}
                        title={showToken ? 'ซ่อนรหัส Token' : 'แสดงรหัส Token'}
                      >
                        <i className={`fa-solid ${showToken ? 'fa-eye-slash' : 'fa-eye'}`}></i>
                      </button>
                    </div>
                  </div>
                  <small className="text-muted d-block mt-1">
                    <i className="fa-solid fa-circle-info text-primary mr-1"></i>
                    ใช้สำหรับบันทึกคีย์อ้างอิงการแจ้งเตือนผ่าน LINE ของผู้ดูแลระบบระดับเขตพื้นที่ (ไม่บังคับ)
                  </small>
                </div>
              </div>

              <div className="card-footer bg-light border-top py-3 px-4 d-flex justify-content-end align-items-center" style={{ gap: '8px', borderRadius: '0 0 14px 14px' }}>
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
                      <i className="fa-solid fa-floppy-disk mr-2"></i>บันทึกการเปลี่ยนแปลง
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

export default AdminProfile;
