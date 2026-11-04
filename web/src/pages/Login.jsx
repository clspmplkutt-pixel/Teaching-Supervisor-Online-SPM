import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import Swal from 'sweetalert2';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../supabaseClient';
import { encryptLegacyPassword } from '../utils/legacyCrypto';
import { formatThaiId, cleanThaiId, getThaiIdInfo } from '../utils/thaiId';
import { findUsersByPeopleId } from '../utils/userLookup';
import { showToast } from '../utils/toast';
import ThaiDatePicker from '../components/ThaiDatePicker';

const MANUAL_LINKS = [
  {
    title: 'คู่มือสำหรับครู',
    subtitle: 'ส่งแผน & คลิปการสอน',
    href: 'https://img2.pic.in.th/2078e38cfd7ff5093.jpg',
    icon: 'fa-solid fa-chalkboard-user',
    accent: '#2563eb',
    bg: '#eff6ff',
  },
  {
    title: 'คู่มือผู้อำนวยการโรงเรียน',
    subtitle: 'อนุมัติ & แต่งตั้งกรรมการ',
    href: 'https://drive.google.com/file/d/1Q2x2mGiqbTy_O5J8sQGohyvBODhfzPG-/view?usp=sharing',
    icon: 'fa-solid fa-user-tie',
    accent: '#059669',
    bg: '#ecfdf5',
  },
  {
    title: 'คู่มือคณะกรรมการประเมิน',
    subtitle: 'ตรวจแผน & ประเมินคลิป',
    href: 'https://img1.pic.in.th/images/4924ed7f823622c84.jpg',
    icon: 'fa-solid fa-clipboard-check',
    accent: '#7c3aed',
    bg: '#f5f3ff',
  },
];

const Login = () => {
  const [loginData, setLoginData] = useState({
    user: '',
    password: '',
    level: '',
  });
  const [error, setError] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  // Forgot Password State
  const [showForgotModal, setShowForgotModal] = useState(false);
  const [forgotId, setForgotId] = useState('');
  const [forgotDob, setForgotDob] = useState('');
  const [forgotResult, setForgotResult] = useState(null);
  const [forgotError, setForgotError] = useState('');
  const [forgotLoading, setForgotLoading] = useState(false);

  const closeForgotModal = () => {
    setShowForgotModal(false);
    setForgotId('');
    setForgotDob('');
    setForgotResult(null);
    setForgotError('');
  };

  useEffect(() => {
    if (!showForgotModal) return undefined;
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        closeForgotModal();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [showForgotModal]);

  const handleCopyPassword = async (pwd) => {
    if (!pwd) return;
    try {
      await navigator.clipboard.writeText(pwd);
      showToast('คัดลอกรหัสผ่านใหม่เรียบร้อยแล้ว', 'success');
    } catch {
      const textarea = document.createElement('textarea');
      textarea.value = pwd;
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand('copy');
      document.body.removeChild(textarea);
      showToast('คัดลอกรหัสผ่านใหม่เรียบร้อยแล้ว', 'success');
    }
  };

  const handleForgotSubmit = async (e) => {
    e.preventDefault();
    setForgotError('');
    setForgotResult(null);
    setForgotLoading(true);

    const cleanForgotId = cleanThaiId(forgotId);
    try {
      const { data: candidates, error: lookupErr } = await findUsersByPeopleId(supabase, cleanForgotId);

      if (lookupErr) throw lookupErr;

      if (!candidates.length) {
        setForgotError('ไม่พบข้อมูลผู้ใช้งานนี้ในระบบ กรุณาตรวจสอบเลขประจำตัวประชาชน');
      } else {
        const checkBirthdayMatch = (dbDate, inputDate) => {
          if (!dbDate || !inputDate) return false;

          const normalizeDate = (d) => String(d).trim().replace(/\//g, '-');
          const dbNorm = normalizeDate(dbDate);
          const inNorm = normalizeDate(inputDate);

          if (dbNorm === inNorm) return true;

          const dbParts = dbNorm.split('-');
          const inParts = inNorm.split('-');

          if (dbParts.length !== 3 || inParts.length !== 3) return false;

          const dbY = parseInt(dbParts[0], 10);
          const dbM = parseInt(dbParts[1], 10);
          const dbD = parseInt(dbParts[2], 10);
          const inY = parseInt(inParts[0], 10);
          const inM = parseInt(inParts[1], 10);
          const inD = parseInt(inParts[2], 10);

          if (dbM !== inM || dbD !== inD) return false;

          return dbY === inY || Math.abs(dbY - inY) === 543;
        };

        // Only accounts whose own birthday matches (protects other people sharing this ID)
        const matchedUsers = candidates.filter((u) => checkBirthdayMatch(u.birthday, forgotDob));
        const matchedUser = matchedUsers[0];

        if (!matchedUser) {
          setForgotError('วัน/เดือน/ปีเกิด ไม่ตรงกับข้อมูลในระบบ กรุณาตรวจสอบอีกครั้ง');
        } else {
          // Reset password to YYYYMMDD (Christian Era) automatically
          const rawBday = String(matchedUser.birthday || '').trim().replace(/\//g, '-');
          const bdParts = rawBday.split('-');
          let birthdayAD = rawBday.replace(/-/g, '');
          if (bdParts.length === 3) {
            let y = parseInt(bdParts[0], 10);
            if (y >= 2400) y -= 543;
            birthdayAD = `${y}${bdParts[1].padStart(2, '0')}${bdParts[2].padStart(2, '0')}`;
          }

          const encrypted = encryptLegacyPassword(birthdayAD);

          const { error: updateError } = await supabase
            .from('tbl_Users')
            .update({ passwd: encrypted })
            .in('id', matchedUsers.map((u) => u.id));

          if (updateError) throw updateError;

          let prefixName = '';
          if (matchedUser.prefix) {
            const { data: preData } = await supabase
              .from('tbl_system_prefix')
              .select('prefix')
              .eq('prefix_id', matchedUser.prefix)
              .maybeSingle();
            if (preData) prefixName = preData.prefix;
          }

          let schoolName = 'ไม่ระบุ';
          if (matchedUser.school) {
            const { data: sData } = await supabase
              .from('tbl_school')
              .select('school_name')
              .eq('school_id', matchedUser.school)
              .maybeSingle();
            if (sData) schoolName = sData.school_name;
          }

          setForgotResult({
            success: true,
            name: `${prefixName}${matchedUser.name || ''} ${matchedUser.lastname || ''}`.trim(),
            school: schoolName,
            newPassword: birthdayAD,
          });
        }
      }
    } catch (err) {
      console.error(err);
      setForgotError('เกิดข้อผิดพลาดในการดำเนินการ กรุณาลองใหม่อีกครั้ง');
    } finally {
      setForgotLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (submitting) return;
    setError('');
    setSubmitting(true);

    const rawUser = (loginData.user || '').trim();
    const effectiveUser = /^[\d-]/.test(rawUser) ? cleanThaiId(rawUser) : rawUser;

    // ถ้าไม่ได้เลือกระดับ → ลองตรวจ auto-detect
    let effectiveLevel = loginData.level;

    try {
      if (!effectiveLevel) {
        if (effectiveUser === 'admin' || effectiveUser === 'root') {
          effectiveLevel = effectiveUser;
        } else {
          try {
            const { data: userRows } = await findUsersByPeopleId(
              supabase,
              effectiveUser,
              'level, headDepartment, register_isConfirm, people_id'
            );
            const userData = userRows && userRows.length ? userRows[0] : null;

            if (!userData) {
              const { data: adminData } = await supabase
                .from('tbl_user')
                .select('user, level_id')
                .eq('user', effectiveUser)
                .maybeSingle();

              if (adminData) {
                effectiveLevel = adminData.level_id || 'admin';
              } else {
                setError('ไม่พบบัญชีผู้ใช้งานนี้ในระบบ กรุณาตรวจสอบเลขประจำตัวประชาชน หรือลงทะเบียนก่อน');
                setSubmitting(false);
                return;
              }
            } else {
              if (userRows.every((r) => String(r.register_isConfirm) === '0')) {
                setError('บัญชีของคุณยังไม่ได้รับการอนุมัติจากผู้ดูแลระบบ กรุณารอการอนุมัติ หรือติดต่อผู้ดูแลระบบสถานศึกษา');
                setSubmitting(false);
                return;
              }
              effectiveLevel = userData.level || 'teacher';
            }
          } catch {
            effectiveLevel = 'teacher';
          }
        }
      }

      const effectivePassword = (loginData.password || '').trim();
      const data = await login(effectiveUser, effectivePassword, effectiveLevel);

      // Check default password logic (YYYYMMDD or DDMMYYYY or 123456)
      if (data && data.birthday) {
        const bdayNoHyphen = String(data.birthday).replace(/-/g, '');
        const defaultPassAD = bdayNoHyphen; // YYYYMMDD
        const defaultPassReverse = String(data.birthday).split('-').reverse().join(''); // DDMMYYYY
        const bdParts = String(data.birthday).split('-');
        const thaiYear = bdParts.length === 3 ? String(parseInt(bdParts[0], 10) + 543) : '';
        const defaultPassThai = bdParts.length === 3 ? `${bdParts[2]}${bdParts[1]}${thaiYear}` : '';

        if (
          effectivePassword === defaultPassAD ||
          effectivePassword === defaultPassReverse ||
          effectivePassword === defaultPassThai ||
          effectivePassword === '123456' ||
          effectivePassword === data.people_id ||
          effectivePassword.replace(/\D/g, '') === data.people_id
        ) {
          setSubmitting(false);
          Swal.fire({
            title: 'คำแนะนำด้านความปลอดภัย',
            text: 'คุณกำลังใช้รหัสผ่านเริ่มต้น ซึ่งคาดเดาได้ง่าย กรุณาเปลี่ยนรหัสผ่านใหม่เพื่อความปลอดภัยของข้อมูล!',
            icon: 'warning',
            confirmButtonText: 'เปลี่ยนรหัสผ่านทันที',
            confirmButtonColor: '#2563eb',
            allowOutsideClick: false,
          }).then(() => {
            navigate('/chgpasswd');
          });
          return;
        }
      }

      navigate('/');
    } catch (err) {
      console.error(err);
      if (err.message === 'Invalid role selected for this user') {
        setError('ระดับการใช้งานที่เลือกไม่ตรงกับบัญชีของคุณ ลองเลือกระดับอื่น หรือเว้นว่างไว้เพื่อให้ระบบตรวจอัตโนมัติ');
      } else if (err.message === 'Account not confirmed') {
        setError('บัญชีของคุณยังไม่ได้รับการอนุมัติจากผู้ดูแลระบบสถานศึกษา กรุณารอการยืนยัน');
      } else if (err.message === 'Invalid credentials') {
        setError('รหัสผ่านไม่ถูกต้อง กรุณาลองใหม่ หรือกดปุ่ม "ลืมรหัสผ่าน?" เพื่อรีเซ็ตรหัสผ่านด้วยตนเอง');
      } else {
        setError('ชื่อผู้ใช้งานหรือรหัสผ่านไม่ถูกต้อง หรือยังไม่ได้รับการยืนยันจากแอดมิน');
      }
    } finally {
      setSubmitting(false);
    }
  };

  const handleUserChange = (e) => {
    const val = e.target.value;
    if (/^[\d-]/.test(val)) {
      setLoginData((prev) => ({ ...prev, user: formatThaiId(val) }));
    } else {
      setLoginData((prev) => ({ ...prev, user: val }));
    }
  };

  const handleChange = (e) => {
    setLoginData({ ...loginData, [e.target.name]: e.target.value });
  };

  const isIdInput = /^[\d-]/.test(loginData.user || '');
  const idInfo = isIdInput ? getThaiIdInfo(loginData.user) : null;
  const forgotIdInfo = forgotId ? getThaiIdInfo(forgotId) : null;

  return (
    <div
      className="min-vh-100 d-flex flex-column justify-content-center align-items-center py-4 px-3"
      style={{
        background: 'linear-gradient(135deg, #f0f4ff 0%, #f8fafc 45%, #eef2ff 100%)',
        fontFamily: "'Kanit', 'Sarabun', sans-serif",
      }}
    >
      <div className="container" style={{ maxWidth: '980px' }}>
        <div
          className="card border-0 overflow-hidden"
          style={{
            borderRadius: '20px',
            boxShadow: '0 20px 50px -12px rgba(15, 23, 42, 0.14)',
          }}
        >
          <div className="row no-gutters">
            {/* Left Branding Panel */}
            <div
              className="col-lg-5 text-white p-4 p-md-5 d-flex flex-column justify-content-between"
              style={{
                background: 'linear-gradient(160deg, #1e3a8a 0%, #1d4ed8 55%, #0f172a 100%)',
                position: 'relative',
              }}
            >
              <div>
                <div className="d-flex align-items-center mb-4">
                  <div
                    className="bg-white rounded-circle d-flex align-items-center justify-content-center shadow-sm mr-3"
                    style={{ width: '68px', height: '68px', flexShrink: 0, padding: '6px' }}
                  >
                    <img
                      src="/images/obec.png"
                      alt="ตราสำนักงานคณะกรรมการการศึกษาขั้นพื้นฐาน"
                      style={{ width: '100%', height: '100%', objectFit: 'contain' }}
                    />
                  </div>
                  <div>
                    <span
                      className="badge px-2 py-1 mb-1"
                      style={{
                        backgroundColor: 'rgba(255,255,255,0.16)',
                        color: '#e0f2fe',
                        fontSize: '0.72rem',
                        letterSpacing: '0.5px',
                      }}
                    >
                      LMSS PORTAL
                    </span>
                    <h5 className="font-weight-bold mb-0" style={{ lineHeight: 1.25 }}>
                      ระบบนิเทศการศึกษาออนไลน์
                    </h5>
                  </div>
                </div>

                <p className="mb-3" style={{ color: '#dbeafe', fontSize: '0.93rem', lineHeight: 1.65 }}>
                  Learning Management &amp; Supervision System สำหรับการบริหารจัดการแผนการจัดการเรียนรู้ คลิปการสอน และการประเมินผลการนิเทศอย่างครบวงจร
                </p>

                <div
                  className="p-3 rounded mb-4"
                  style={{
                    backgroundColor: 'rgba(255, 255, 255, 0.1)',
                    border: '1px solid rgba(255, 255, 255, 0.16)',
                    borderRadius: '14px',
                  }}
                >
                  <div className="font-weight-bold mb-2" style={{ fontSize: '0.86rem', color: '#bfdbfe' }}>
                    <i className="fa-solid fa-circle-info mr-1"></i> คำแนะนำการเข้าสู่ระบบ
                  </div>
                  <ul className="list-unstyled mb-0 small" style={{ color: '#eff6ff', lineHeight: 1.75 }}>
                    <li>
                      <i className="fa-solid fa-id-card mr-2 text-warning"></i>
                      <strong>ชื่อผู้ใช้:</strong> เลขประจำตัวประชาชน 13 หลัก
                    </li>
                    <li>
                      <i className="fa-solid fa-key mr-2 text-warning"></i>
                      <strong>รหัสผ่านเริ่มต้น:</strong> วันเกิด ค.ศ. <code className="text-white font-weight-bold">YYYYMMDD</code> (เช่น <code className="text-white">19820930</code>)
                    </li>
                    <li>
                      <i className="fa-solid fa-wand-magic-sparkles mr-2 text-warning"></i>
                      <strong>ระดับผู้ใช้งาน:</strong> ระบบตรวจจับสิทธิ์ให้อัตโนมัติ
                    </li>
                  </ul>
                </div>
              </div>

              <div className="pt-3" style={{ borderTop: '1px solid rgba(255,255,255,0.15)' }}>
                <div className="font-weight-bold" style={{ fontSize: '0.88rem' }}>
                  <i className="fa-solid fa-building-columns mr-2 text-info"></i>
                  สพม.พิษณุโลก อุตรดิตถ์
                </div>
                <div className="small" style={{ color: '#cbd5e1', fontSize: '0.78rem' }}>
                  สำนักงานเขตพื้นที่การศึกษามัธยมศึกษาพิษณุโลก อุตรดิตถ์
                </div>
                <div className="mt-2" style={{ color: '#94a3b8', fontSize: '0.74rem' }}>
                  พัฒนาโดย ดร.อิทธิพงษ์ ตั้งสกุลเรืองไล (ศึกษานิเทศก์ชำนาญการพิเศษ)
                </div>
              </div>
            </div>

            {/* Right Login Form Panel */}
            <div className="col-lg-7 bg-white p-4 p-md-5">
              <div className="mb-4">
                <h4 className="font-weight-bold text-dark mb-1">เข้าสู่ระบบผู้ใช้งาน</h4>
                <p className="text-muted small mb-0">
                  กรอกเลขประจำตัวประชาชนและรหัสผ่านเพื่อเข้าใช้งานระบบนิเทศออนไลน์
                </p>
              </div>

              {error && (
                <div
                  className="alert alert-danger d-flex align-items-start justify-content-between py-2 px-3 mb-3"
                  style={{ borderRadius: '10px', fontSize: '0.88rem' }}
                  role="alert"
                >
                  <div>
                    <i className="fa-solid fa-circle-exclamation mr-2 mt-1"></i>
                    <span>{error}</span>
                  </div>
                  <button
                    type="button"
                    className="close ml-2"
                    onClick={() => setError('')}
                    aria-label="ปิดข้อความแจ้งเตือน"
                  >
                    <span aria-hidden="true">&times;</span>
                  </button>
                </div>
              )}

              <form onSubmit={handleSubmit}>
                <div className="form-group mb-2">
                  <label htmlFor="login_user" className="small font-weight-bold text-dark mb-1">
                    ชื่อผู้ใช้งาน / เลขประจำตัวประชาชน 13 หลัก
                  </label>
                  <div className="input-group">
                    <div className="input-group-prepend">
                      <span className="input-group-text bg-light border-right-0">
                        <i className="fa-solid fa-user text-secondary"></i>
                      </span>
                    </div>
                    <input
                      id="login_user"
                      type="text"
                      className="form-control border-left-0"
                      placeholder="X-XXXX-XXXXX-XX-X"
                      name="user"
                      value={loginData.user}
                      onChange={handleUserChange}
                      disabled={submitting}
                      required
                      autoFocus
                    />
                  </div>
                </div>

                <div style={{ minHeight: '22px' }} className="mb-2 pl-1 small">
                  {idInfo && idInfo.length > 0 && (
                    <>
                      {idInfo.isComplete && idInfo.isValid && (
                        <span className="text-success font-weight-bold">
                          <i className="fa-solid fa-circle-check mr-1"></i>เลขประจำตัวประชาชนถูกต้อง
                        </span>
                      )}
                      {idInfo.isComplete && !idInfo.isValid && (
                        <span className="text-warning font-weight-bold">
                          <i className="fa-solid fa-triangle-exclamation mr-1"></i>เลขบัตรไม่ถูกต้องตามหลักตรวจสอบ
                        </span>
                      )}
                      {!idInfo.isComplete && (
                        <span className="text-muted">
                          <i className="fa-solid fa-id-card mr-1"></i>ระบุแล้ว {idInfo.length}/13 หลัก
                        </span>
                      )}
                    </>
                  )}
                </div>

                <div className="form-group mb-3">
                  <div className="d-flex justify-content-between align-items-center mb-1">
                    <label htmlFor="login_password" className="small font-weight-bold text-dark mb-0">
                      รหัสผ่าน
                    </label>
                    <button
                      type="button"
                      className="btn btn-link btn-sm p-0 text-primary font-weight-bold"
                      style={{ fontSize: '0.82rem' }}
                      onClick={() => setShowForgotModal(true)}
                    >
                      <i className="fa-solid fa-key mr-1"></i>ลืมรหัสผ่าน? (รีเซ็ตเอง)
                    </button>
                  </div>
                  <div className="input-group">
                    <div className="input-group-prepend">
                      <span className="input-group-text bg-light border-right-0">
                        <i className="fa-solid fa-lock text-secondary"></i>
                      </span>
                    </div>
                    <input
                      id="login_password"
                      type={showPassword ? 'text' : 'password'}
                      className="form-control border-left-0 border-right-0"
                      placeholder="รหัสผ่าน (เช่น วันเกิด ค.ศ. 19820930)"
                      name="password"
                      value={loginData.password}
                      onChange={handleChange}
                      disabled={submitting}
                      required
                    />
                    <div className="input-group-append">
                      <button
                        type="button"
                        className="btn btn-outline-secondary border-left-0 bg-white text-muted"
                        style={{ borderColor: '#ced4da' }}
                        onClick={() => setShowPassword((prev) => !prev)}
                        title={showPassword ? 'ซ่อนรหัสผ่าน' : 'แสดงรหัสผ่าน'}
                      >
                        <i className={`fa-solid ${showPassword ? 'fa-eye-slash' : 'fa-eye'}`}></i>
                      </button>
                    </div>
                  </div>
                </div>

                <div className="form-group mb-4">
                  <label htmlFor="login_level" className="small font-weight-bold text-dark mb-1">
                    ระดับสิทธิ์การใช้งาน <span className="text-muted font-weight-normal">(ไม่บังคับ)</span>
                  </label>
                  <select
                    id="login_level"
                    name="level"
                    className="custom-select form-control"
                    onChange={handleChange}
                    value={loginData.level}
                    disabled={submitting}
                  >
                    <option value="">ตรวจจับสิทธิ์อัตโนมัติ (แนะนำ)</option>
                    <option value="teacher">ครูผู้สอน</option>
                    <option value="headdepartment">หัวหน้ากลุ่มสาระการเรียนรู้</option>
                    <option value="admin_school">ผู้ดูแลระบบสถานศึกษา (School Admin)</option>
                    <option value="directorschool">ผู้อำนวยการโรงเรียน / รองผู้อำนวยการ</option>
                    <option value="chairman">ประธานสหวิทยาเขต</option>
                    <option value="supervision">ผู้นิเทศ / คณะกรรมการประเมิน</option>
                    <option value="supervisor">ศึกษานิเทศก์</option>
                    <option value="districdirector">ผู้อำนวยการเขตพื้นที่ / รอง ผอ.เขต</option>
                    <option value="admin">ผู้ดูแลระบบเขตพื้นที่ (Admin เขต)</option>
                  </select>
                </div>

                <button
                  type="submit"
                  className="btn btn-primary btn-block font-weight-bold py-2 shadow-sm"
                  style={{ borderRadius: '10px', fontSize: '1rem' }}
                  disabled={submitting}
                >
                  {submitting ? (
                    <span>
                      <span className="spinner-border spinner-border-sm mr-2" role="status" aria-hidden="true"></span>
                      กำลังเข้าสู่ระบบ...
                    </span>
                  ) : (
                    <span>
                      <i className="fa-solid fa-right-to-bracket mr-2"></i>เข้าสู่ระบบ
                    </span>
                  )}
                </button>

                <div className="row mt-3">
                  <div className="col-sm-6 mb-2 mb-sm-0">
                    <Link
                      to="/register"
                      className="btn btn-outline-primary btn-block font-weight-bold"
                      style={{ borderRadius: '10px', fontSize: '0.9rem' }}
                    >
                      <i className="fa-solid fa-user-plus mr-1"></i> ลงทะเบียนบุคลากรใหม่
                    </Link>
                  </div>
                  <div className="col-sm-6">
                    <button
                      type="button"
                      className="btn btn-outline-secondary btn-block font-weight-bold"
                      style={{ borderRadius: '10px', fontSize: '0.9rem' }}
                      onClick={() => setShowForgotModal(true)}
                    >
                      <i className="fa-solid fa-rotate mr-1"></i> ลืมรหัสผ่าน?
                    </button>
                  </div>
                </div>
              </form>

              {/* User Manuals */}
              <div className="mt-4 pt-3 border-top">
                <div className="d-flex align-items-center justify-content-between mb-2">
                  <span className="small font-weight-bold text-secondary">
                    <i className="fa-solid fa-book-open mr-1 text-primary"></i> คู่มือการใช้งานระบบ
                  </span>
                </div>
                <div className="row mx-n1">
                  {MANUAL_LINKS.map((item) => (
                    <div className="col-12 col-sm-4 px-1 mb-2 mb-sm-0" key={item.title}>
                      <a
                        href={item.href}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="d-flex flex-column justify-content-center p-2 rounded border text-decoration-none h-100"
                        style={{
                          backgroundColor: item.bg,
                          borderColor: 'rgba(15, 23, 42, 0.08)',
                          borderRadius: '10px',
                          transition: 'transform 0.15s ease, box-shadow 0.15s ease',
                        }}
                      >
                        <div className="d-flex align-items-center mb-1">
                          <i
                            className={`${item.icon} mr-2`}
                            style={{ color: item.accent, fontSize: '0.95rem' }}
                          ></i>
                          <span
                            className="font-weight-bold text-dark"
                            style={{ fontSize: '0.8rem', lineHeight: 1.2 }}
                          >
                            {item.title}
                          </span>
                        </div>
                        <span className="text-muted" style={{ fontSize: '0.72rem' }}>
                          {item.subtitle}
                        </span>
                      </a>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Forgot Password Modal - Self-Service Reset */}
      {showForgotModal && (
        <div
          className="modal fade show d-block"
          tabIndex="-1"
          role="dialog"
          aria-modal="true"
          style={{ backgroundColor: 'rgba(15, 23, 42, 0.55)', zIndex: 1055 }}
          onClick={(e) => {
            if (e.target === e.currentTarget) closeForgotModal();
          }}
        >
          <div className="modal-dialog modal-dialog-centered" role="document">
            <div className="modal-content border-0 shadow-lg" style={{ borderRadius: '16px', overflow: 'hidden' }}>
              <div className="modal-header bg-primary text-white border-0 py-3">
                <h5 className="modal-title font-weight-bold m-0">
                  <i className="fa-solid fa-key mr-2"></i>รีเซ็ตรหัสผ่านด้วยตนเอง (Self-Service)
                </h5>
                <button
                  type="button"
                  className="close text-white"
                  onClick={closeForgotModal}
                  aria-label="ปิดหน้าต่าง"
                >
                  <span aria-hidden="true">&times;</span>
                </button>
              </div>

              <div className="modal-body p-4">
                {!forgotResult ? (
                  <form onSubmit={handleForgotSubmit}>
                    <div className="alert alert-light border small mb-3" style={{ borderRadius: '10px' }}>
                      <i className="fa-solid fa-shield-halved text-primary mr-1"></i>
                      ยืนยันตัวตนด้วย <strong>เลขประจำตัวประชาชน</strong> และ <strong>วัน/เดือน/ปีเกิด</strong> ระบบจะรีเซ็ตรหัสผ่านกลับเป็นค่าเริ่มต้นให้ทันที
                    </div>

                    <div className="form-group mb-3">
                      <label htmlFor="forgot_people_id" className="font-weight-bold small text-dark">
                        เลขประจำตัวประชาชน 13 หลัก <span className="text-danger">*</span>
                      </label>
                      <input
                        id="forgot_people_id"
                        type="text"
                        className="form-control"
                        value={forgotId}
                        onChange={(e) => setForgotId(formatThaiId(e.target.value))}
                        required
                        autoFocus
                        placeholder="X-XXXX-XXXXX-XX-X"
                      />
                      {forgotIdInfo && (
                        <div className="small mt-1 pl-1">
                          {forgotIdInfo.isComplete && forgotIdInfo.isValid && (
                            <span className="text-success font-weight-bold">
                              <i className="fa-solid fa-circle-check mr-1"></i>เลขประจำตัวประชาชนถูกต้อง
                            </span>
                          )}
                          {forgotIdInfo.isComplete && !forgotIdInfo.isValid && (
                            <span className="text-warning font-weight-bold">
                              <i className="fa-solid fa-triangle-exclamation mr-1"></i>เลขบัตรไม่ถูกต้องตามหลักตรวจสอบ
                            </span>
                          )}
                          {!forgotIdInfo.isComplete && (
                            <span className="text-muted">ระบุแล้ว {forgotIdInfo.length}/13 หลัก</span>
                          )}
                        </div>
                      )}
                    </div>

                    <div className="form-group mb-3">
                      <label className="font-weight-bold small text-dark d-block">
                        วัน/เดือน/ปีเกิด <span className="text-danger">*</span>
                      </label>
                      <ThaiDatePicker
                        mode="birthday"
                        value={forgotDob}
                        onChange={setForgotDob}
                        required
                      />
                    </div>

                    {forgotError && (
                      <div className="alert alert-danger py-2 px-3 small" style={{ borderRadius: '10px' }}>
                        <i className="fa-solid fa-circle-exclamation mr-1"></i> {forgotError}
                      </div>
                    )}

                    <button
                      type="submit"
                      className="btn btn-primary btn-block font-weight-bold py-2 mt-2"
                      style={{ borderRadius: '10px' }}
                      disabled={forgotLoading || cleanThaiId(forgotId).length !== 13 || !forgotDob}
                    >
                      {forgotLoading ? (
                        <span>
                          <span className="spinner-border spinner-border-sm mr-2"></span>กำลังตรวจสอบและรีเซ็ต...
                        </span>
                      ) : (
                        <span>
                          <i className="fa-solid fa-rotate mr-1"></i> ยืนยันและรีเซ็ตรหัสผ่าน
                        </span>
                      )}
                    </button>
                  </form>
                ) : (
                  <div>
                    <div
                      className="p-3 mb-3 border rounded"
                      style={{ backgroundColor: '#f0fdf4', borderColor: '#bbf7d0', borderRadius: '12px' }}
                    >
                      <h6 className="font-weight-bold text-success mb-2">
                        <i className="fa-solid fa-circle-check mr-1"></i> รีเซ็ตรหัสผ่านสำเร็จ!
                      </h6>
                      <div className="small text-dark mb-1">
                        <strong>ชื่อ-สกุล:</strong> {forgotResult.name}
                      </div>
                      <div className="small text-dark">
                        <strong>สังกัด:</strong> {forgotResult.school}
                      </div>
                    </div>

                    <div
                      className="text-center p-3 border rounded bg-light mb-3"
                      style={{ borderRadius: '12px' }}
                    >
                      <div className="text-muted small mb-1">
                        รหัสผ่านใหม่ของคุณคือ <strong>วันเกิด ค.ศ. (YYYYMMDD)</strong>
                      </div>
                      <div className="d-flex align-items-center justify-content-center flex-wrap" style={{ gap: '8px' }}>
                        <span
                          className="font-weight-bold text-primary"
                          style={{ fontSize: '1.65rem', letterSpacing: '2.5px' }}
                        >
                          {forgotResult.newPassword}
                        </span>
                        <button
                          type="button"
                          className="btn btn-sm btn-outline-primary font-weight-bold"
                          onClick={() => handleCopyPassword(forgotResult.newPassword)}
                        >
                          <i className="fa-regular fa-copy mr-1"></i> คัดลอกรหัสผ่าน
                        </button>
                      </div>
                    </div>

                    <div className="alert alert-warning py-2 px-3 small mb-0" style={{ borderRadius: '10px' }}>
                      <i className="fa-solid fa-lightbulb mr-1"></i>
                      <strong>คำแนะนำ:</strong> หลังเข้าสู่ระบบ ระบบจะนำท่านไปตั้งรหัสผ่านใหม่เพื่อความปลอดภัย
                    </div>
                  </div>
                )}
              </div>

              <div className="modal-footer bg-light border-0">
                {forgotResult && (
                  <button
                    type="button"
                    className="btn btn-success font-weight-bold"
                    onClick={() => {
                      const recoveredId = formatThaiId(forgotId);
                      const recoveredPass = forgotResult.newPassword;
                      closeForgotModal();
                      setLoginData((prev) => ({
                        ...prev,
                        user: recoveredId,
                        password: recoveredPass,
                      }));
                    }}
                  >
                    <i className="fa-solid fa-right-to-bracket mr-1"></i> นำไปเข้าสู่ระบบ
                  </button>
                )}
                <button type="button" className="btn btn-secondary" onClick={closeForgotModal}>
                  ปิดหน้าต่าง
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Login;
