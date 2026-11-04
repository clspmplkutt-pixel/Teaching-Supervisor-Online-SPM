import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Link } from 'react-router-dom';
import Swal from 'sweetalert2';
import { supabase } from '../supabaseClient';
import { encryptLegacyPassword } from '../utils/legacyCrypto';
import { formatThaiId, cleanThaiId, isValidThaiId } from '../utils/thaiId';
import { showToast } from '../utils/toast';
import ThaiDatePicker from '../components/ThaiDatePicker';
import SearchableSelect from '../components/SearchableSelect';

const DISTRICT_POSITION_IDS = ['10008', '10009', '10010'];
const EXECUTIVE_NON_TEACHING_IDS = ['10006', '10007', '10008', '10009', '10010'];

const STEPS = [
  { num: 1, title: 'ตรวจสอบเลขบัตรประชาชน', icon: 'fa-solid fa-id-card' },
  { num: 2, title: 'กรอกข้อมูลบุคลากร', icon: 'fa-solid fa-user-pen' },
  { num: 3, title: 'ลงทะเบียนสำเร็จ', icon: 'fa-solid fa-circle-check' },
];

const computePasswordFromIsoBirthday = (isoDate) => {
  if (!isoDate) return '';
  const parts = String(isoDate).trim().split('-');
  if (parts.length !== 3) return '';
  let y = parseInt(parts[0], 10);
  if (Number.isNaN(y)) return '';
  if (y >= 2400) y -= 543;
  return `${y}${parts[1].padStart(2, '0')}${parts[2].padStart(2, '0')}`;
};

const Register = () => {
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [checkingId, setCheckingId] = useState(false);
  const [generatedPassword, setGeneratedPassword] = useState('');
  const checkSeqRef = useRef(0);

  // Step 1 Data
  const [peopleId, setPeopleId] = useState('');
  const [peopleIdStatus, setPeopleIdStatus] = useState({ type: '', message: '' });
  const [isIdValid, setIsIdValid] = useState(false);

  // Step 2 Controlled Form State
  const [formData, setFormData] = useState({
    prefix: '',
    name: '',
    lastname: '',
    gender: '',
    birthday: '',
    edu_level: '',
    phone: '',
    email: '',
    persontype_id: '',
    position_id: '',
    academic_id: '',
    school: '',
    teach_subject: '',
    headDepartment: '0',
    teach_subject_name: '',
    teach_level: [],
  });

  // Active Lookup Options
  const [options, setOptions] = useState({
    prefixes: [],
    genders: [],
    eduLevels: [],
    personTypes: [],
    positions: [],
    academics: [],
    schools: [],
    studyGroups: [],
    gradeLevels: [],
  });

  const isDistrictPosition = DISTRICT_POSITION_IDS.includes(String(formData.position_id));
  const isNonTeachingPosition = EXECUTIVE_NON_TEACHING_IDS.includes(String(formData.position_id));

  const schoolSelectOptions = useMemo(
    () =>
      options.schools.map((opt) => ({
        value: String(opt.school_id || opt.id),
        label: opt.school_name,
      })),
    [options.schools]
  );

  const previewPassword = useMemo(
    () => computePasswordFromIsoBirthday(formData.birthday),
    [formData.birthday]
  );

  // Load Active Dropdown Data on mount
  useEffect(() => {
    let mounted = true;
    const fetchOptions = async () => {
      try {
        const [
          prefixRes,
          genderRes,
          eduRes,
          personTypeRes,
          posRes,
          acadRes,
          schoolRes,
          subjRes,
          gradeRes,
        ] = await Promise.all([
          supabase.from('tbl_system_prefix').select('*').eq('prefix_status', '1').order('id', { ascending: true }),
          supabase.from('tbl_system_gender').select('*').order('id', { ascending: true }),
          supabase.from('tbl_system_EducationLevel').select('*').eq('educationlevel_status', '1').order('id', { ascending: true }),
          supabase.from('tbl_system_PersonType').select('*').eq('persontype_status', '1').order('persontype_id', { ascending: true }),
          supabase.from('tbl_system_PersonPositionType').select('*').eq('position_status', '1').order('position_id', { ascending: true }),
          supabase.from('tbl_system_Academic_Standing').select('*').eq('academic_status', '1').order('academic_id', { ascending: true }),
          supabase.from('tbl_school').select('*').neq('school_flag', 0).order('school_name', { ascending: true }),
          supabase.from('tbl_system_Teach_Subject').select('*').eq('teach_subject_status', '1').order('teach_subject_id', { ascending: true }),
          supabase
            .from('tbl_system_GradeLevel')
            .select('*')
            .eq('grade_level_status', '1')
            .neq('grade_level_id', '499')
            .order('grade_level_id', { ascending: true }),
        ]);

        if (!mounted) return;
        const activeGenders = (genderRes.data || []).filter(
          (r) => r.gender_status == null || String(r.gender_status) === '1'
        );

        setOptions({
          prefixes: prefixRes.data || [],
          genders: activeGenders,
          eduLevels: eduRes.data || [],
          personTypes: personTypeRes.data || [],
          positions: posRes.data || [],
          academics: acadRes.data || [],
          schools: schoolRes.data || [],
          studyGroups: subjRes.data || [],
          gradeLevels: gradeRes.data || [],
        });
      } catch (err) {
        console.error('Register fetchOptions error:', err);
      }
    };
    fetchOptions();
    return () => {
      mounted = false;
    };
  }, []);

  // Handle People ID Input (Step 1)
  const handlePeopleIdChange = async (e) => {
    const clean = cleanThaiId(e.target.value);
    const formatted = formatThaiId(clean);
    setPeopleId(formatted);

    const seq = ++checkSeqRef.current;

    if (clean.length === 13) {
      if (isValidThaiId(clean)) {
        setCheckingId(true);
        setPeopleIdStatus({ type: 'info', message: 'กำลังตรวจสอบข้อมูลในระบบ...' });
        try {
          const { data, error } = await supabase
            .from('tbl_Users')
            .select('id')
            .eq('people_id', clean)
            .limit(1);

          if (seq !== checkSeqRef.current) return;
          if (error) throw error;

          if (data && data.length > 0) {
            setPeopleIdStatus({
              type: 'danger',
              message: 'เลขประจำตัวประชาชนนี้เป็นสมาชิกในระบบอยู่แล้ว ไม่สามารถลงทะเบียนซ้ำได้',
            });
            setIsIdValid(false);
          } else {
            setPeopleIdStatus({
              type: 'success',
              message: 'เลขประจำตัวประชาชนถูกต้อง และพร้อมสำหรับการลงทะเบียน',
            });
            setIsIdValid(true);
          }
        } catch (err) {
          console.error('Check people_id error:', err);
          if (seq === checkSeqRef.current) {
            setPeopleIdStatus({
              type: 'danger',
              message: 'ไม่สามารถตรวจสอบข้อมูลได้ชั่วคราว กรุณาลองใหม่อีกครั้ง',
            });
            setIsIdValid(false);
          }
        } finally {
          if (seq === checkSeqRef.current) {
            setCheckingId(false);
          }
        }
      } else {
        setPeopleIdStatus({
          type: 'warning',
          message: 'เลขประจำตัวประชาชนไม่ถูกต้องตามหลักการตรวจสอบ 13 หลัก',
        });
        setIsIdValid(false);
      }
    } else {
      setPeopleIdStatus({
        type: 'muted',
        message: clean.length > 0 ? `ระบุแล้ว ${clean.length}/13 หลัก` : '',
      });
      setIsIdValid(false);
    }
  };

  const handleNextStep = (e) => {
    if (e) e.preventDefault();
    if (isIdValid && !checkingId) {
      setStep(2);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    if (type === 'checkbox' && name === 'teach_level') {
      setFormData((prev) => {
        const currentLevels = Array.isArray(prev.teach_level) ? prev.teach_level : [];
        const strVal = String(value);
        if (checked) {
          return { ...prev, teach_level: [...currentLevels, strVal] };
        }
        return { ...prev, teach_level: currentLevels.filter((v) => String(v) !== strVal) };
      });
      return;
    }

    setFormData((prev) => {
      const next = { ...prev, [name]: value };
      if (name === 'position_id') {
        if (DISTRICT_POSITION_IDS.includes(String(value))) {
          next.school = '1000650001';
        } else if (prev.school === '1000650001') {
          next.school = '';
        }
        if (EXECUTIVE_NON_TEACHING_IDS.includes(String(value))) {
          next.headDepartment = '0';
        }
      }
      return next;
    });
  };

  const handleCopyCredentials = async (text, label = 'รหัสผ่าน') => {
    if (!text) return;
    try {
      await navigator.clipboard.writeText(text);
      showToast(`คัดลอก${label}เรียบร้อยแล้ว`, 'success');
    } catch {
      const textarea = document.createElement('textarea');
      textarea.value = text;
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand('copy');
      document.body.removeChild(textarea);
      showToast(`คัดลอก${label}เรียบร้อยแล้ว`, 'success');
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (loading) return;

    if (!formData.birthday) {
      Swal.fire({
        icon: 'warning',
        title: 'ข้อมูลไม่ครบถ้วน',
        text: 'กรุณาเลือกวัน/เดือน/ปีเกิด เพื่อสร้างรหัสผ่านเริ่มต้น',
      });
      return;
    }

    if (!isDistrictPosition && !formData.school) {
      Swal.fire({
        icon: 'warning',
        title: 'กรุณาเลือกโรงเรียน',
        text: 'โปรดระบุโรงเรียนสังกัดของท่านก่อนบันทึกการลงทะเบียน',
      });
      return;
    }

    setLoading(true);
    try {
      let level = 'teacher';
      let school = formData.school;
      const posId = parseInt(formData.position_id, 10);

      if ([10006, 10007].includes(posId)) level = 'directorschool';
      if ([10008, 10009].includes(posId)) {
        level = 'districdirector';
        school = '1000650001';
      }
      if (posId === 10010) {
        level = 'supervisor';
        school = '1000650001';
      }

      const dateParts = String(formData.birthday).trim().split('-');
      const rawYear = parseInt(dateParts[0], 10);
      const christianYear = rawYear >= 2400 ? rawYear - 543 : rawYear;
      const monthPadded = dateParts[1].padStart(2, '0');
      const dayPadded = dateParts[2].padStart(2, '0');
      const dbBirthday = `${christianYear}-${monthPadded}-${dayPadded}`;
      const pwdRaw = `${christianYear}${monthPadded}${dayPadded}`;

      const encryptedPass = encryptLegacyPassword(pwdRaw);

      const payload = {
        people_id: cleanThaiId(peopleId),
        prefix: formData.prefix,
        name: formData.name.trim(),
        lastname: formData.lastname.trim(),
        persontype_id: formData.persontype_id,
        position_id: formData.position_id,
        academic_id: formData.academic_id,
        gender: formData.gender,
        birthday: dbBirthday,
        passwd: encryptedPass,
        school,
        edu_level: formData.edu_level,
        headDepartment: isNonTeachingPosition ? '0' : formData.headDepartment,
        chairman: '0',
        teach_subject: isNonTeachingPosition ? '' : formData.teach_subject,
        teach_subject_name: isNonTeachingPosition ? '' : formData.teach_subject_name.trim(),
        teach_level: isNonTeachingPosition
          ? ''
          : Array.isArray(formData.teach_level)
          ? formData.teach_level.join(',')
          : formData.teach_level,
        phone: formData.phone.trim(),
        email: formData.email.trim(),
        level,
        register_isConfirm: 1,
        register_date: new Date().toISOString(),
      };

      const { error } = await supabase.from('tbl_Users').insert([payload]);
      if (error) throw error;

      setGeneratedPassword(pwdRaw);
      setStep(3);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (err) {
      console.error('Registration Error:', err);
      Swal.fire({
        icon: 'error',
        title: 'ลงทะเบียนไม่สำเร็จ',
        text: err.message || 'เกิดข้อผิดพลาดในการบันทึกข้อมูล กรุณาลองใหม่อีกครั้ง',
      });
    } finally {
      setLoading(false);
    }
  };

  const selectedPrefixLabel =
    options.prefixes.find((p) => String(p.prefix_id || p.id) === String(formData.prefix))?.prefix || '';

  return (
    <div
      className="min-vh-100 py-4 px-3"
      style={{
        background: 'linear-gradient(135deg, #f0f4ff 0%, #f8fafc 50%, #eef2ff 100%)',
        fontFamily: "'Kanit', 'Sarabun', sans-serif",
      }}
    >
      <div className="container" style={{ maxWidth: '960px' }}>
        {/* Page Header */}
        <div className="text-center mb-4">
          <div className="d-inline-flex align-items-center justify-content-center bg-white rounded-circle shadow-sm p-2 mb-2" style={{ width: '60px', height: '60px' }}>
            <img src="/images/obec.png" alt="OBEC" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
          </div>
          <h3 className="font-weight-bold text-dark mb-1" style={{ fontSize: '1.55rem' }}>
            ลงทะเบียนบุคลากรเข้าสู่ระบบนิเทศออนไลน์ (LMSS)
          </h3>
          <p className="text-muted small mb-0">
            สำนักงานเขตพื้นที่การศึกษามัธยมศึกษาพิษณุโลก อุตรดิตถ์
          </p>
        </div>

        {/* 3-Step Visual Stepper */}
        <div
          className="card border-0 shadow-sm mb-4"
          style={{ borderRadius: '16px' }}
        >
          <div className="card-body py-3 px-3 px-md-4">
            <div className="d-flex justify-content-between align-items-center position-relative">
              {STEPS.map((s, idx) => {
                const isDone = step > s.num;
                const isActive = step === s.num;
                return (
                  <React.Fragment key={s.num}>
                    <div className="d-flex align-items-center" style={{ zIndex: 1 }}>
                      <div
                        className="rounded-circle d-flex align-items-center justify-content-center font-weight-bold mr-2"
                        style={{
                          width: '38px',
                          height: '38px',
                          flexShrink: 0,
                          backgroundColor: isDone ? '#10b981' : isActive ? '#2563eb' : '#e2e8f0',
                          color: isDone || isActive ? '#ffffff' : '#64748b',
                          boxShadow: isActive ? '0 0 0 4px rgba(37, 99, 235, 0.16)' : 'none',
                        }}
                      >
                        {isDone ? <i className="fa-solid fa-check"></i> : s.num}
                      </div>
                      <div className="d-none d-sm-block">
                        <div
                          className="small font-weight-bold"
                          style={{
                            color: isActive ? '#1e3a8a' : isDone ? '#059669' : '#64748b',
                            lineHeight: 1.2,
                          }}
                        >
                          ขั้นตอนที่ {s.num}
                        </div>
                        <div className="small text-muted" style={{ fontSize: '0.78rem' }}>
                          {s.title}
                        </div>
                      </div>
                    </div>
                    {idx < STEPS.length - 1 && (
                      <div
                        className="flex-grow-1 mx-2 mx-md-3"
                        style={{
                          height: '3px',
                          borderRadius: '2px',
                          backgroundColor: step > s.num ? '#10b981' : '#e2e8f0',
                        }}
                      />
                    )}
                  </React.Fragment>
                );
              })}
            </div>
          </div>
        </div>

        {/* Main Content Card */}
        <div
          className="card border-0 shadow-sm"
          style={{ borderRadius: '18px', overflow: 'hidden' }}
        >
          {step === 1 && (
            <form onSubmit={handleNextStep}>
              <div className="card-header bg-white border-bottom py-3 px-4">
                <h5 className="font-weight-bold text-dark m-0">
                  <i className="fa-solid fa-id-card text-primary mr-2"></i>
                  ขั้นตอนที่ 1: ตรวจสอบเลขประจำตัวประชาชน
                </h5>
              </div>
              <div className="card-body p-4 p-md-5">
                <div className="mx-auto" style={{ maxWidth: '520px' }}>
                  <p className="text-muted small mb-3">
                    กรอกเลขประจำตัวประชาชน 13 หลัก เพื่อตรวจสอบสิทธิ์และสถานะการเป็นสมาชิกในระบบ (รองรับครูผู้สอน ผู้บริหารสถานศึกษา และศึกษานิเทศก์)
                  </p>

                  <div className="form-group mb-2">
                    <div className="d-flex justify-content-between align-items-center mb-1">
                      <label htmlFor="people_id" className="font-weight-bold text-dark mb-0">
                        เลขประจำตัวประชาชน 13 หลัก <span className="text-danger">*</span>
                      </label>
                      <span className="badge badge-light border text-muted">
                        {cleanThaiId(peopleId).length}/13 หลัก
                      </span>
                    </div>
                    <input
                      type="text"
                      className={`form-control form-control-lg ${
                        isIdValid
                          ? 'is-valid'
                          : peopleIdStatus.type === 'danger' || peopleIdStatus.type === 'warning'
                          ? 'is-invalid'
                          : ''
                      }`}
                      id="people_id"
                      value={peopleId}
                      onChange={handlePeopleIdChange}
                      placeholder="X-XXXX-XXXXX-XX-X"
                      autoFocus
                    />
                  </div>

                  <div style={{ minHeight: '28px' }} className="mt-2">
                    {peopleIdStatus.message && (
                      <div
                        className={`small font-weight-bold ${
                          peopleIdStatus.type === 'success'
                            ? 'text-success'
                            : peopleIdStatus.type === 'danger'
                            ? 'text-danger'
                            : peopleIdStatus.type === 'warning'
                            ? 'text-warning'
                            : peopleIdStatus.type === 'info'
                            ? 'text-primary'
                            : 'text-muted'
                        }`}
                      >
                        {checkingId && (
                          <span className="spinner-border spinner-border-sm mr-1" role="status"></span>
                        )}
                        {!checkingId && peopleIdStatus.type === 'success' && (
                          <i className="fa-solid fa-circle-check mr-1"></i>
                        )}
                        {!checkingId &&
                          (peopleIdStatus.type === 'danger' || peopleIdStatus.type === 'warning') && (
                            <i className="fa-solid fa-circle-exclamation mr-1"></i>
                          )}
                        {peopleIdStatus.message}
                      </div>
                    )}
                  </div>
                </div>
              </div>
              <div className="card-footer bg-light border-top py-3 px-4 d-flex justify-content-between align-items-center">
                <Link to="/login" className="btn btn-outline-secondary font-weight-bold">
                  <i className="fa-solid fa-arrow-left mr-1"></i> กลับหน้าเข้าสู่ระบบ
                </Link>
                <button
                  type="submit"
                  className="btn btn-primary px-4 font-weight-bold"
                  disabled={!isIdValid || checkingId || loading}
                >
                  ดำเนินการต่อ <i className="fa-solid fa-arrow-right ml-1"></i>
                </button>
              </div>
            </form>
          )}

          {step === 2 && (
            <form onSubmit={handleSubmit}>
              <div className="card-header bg-white border-bottom py-3 px-4 d-flex justify-content-between align-items-center flex-wrap" style={{ gap: '8px' }}>
                <div>
                  <h5 className="font-weight-bold text-dark m-0">
                    <i className="fa-solid fa-user-pen text-primary mr-2"></i>
                    ขั้นตอนที่ 2: กรอกข้อมูลบุคลากร
                  </h5>
                </div>
                <div className="d-flex align-items-center" style={{ gap: '8px' }}>
                  <span className="badge badge-primary px-3 py-2" style={{ fontSize: '0.85rem' }}>
                    <i className="fa-solid fa-id-card mr-1"></i> {peopleId}
                  </span>
                  <button
                    type="button"
                    className="btn btn-sm btn-outline-secondary font-weight-bold"
                    onClick={() => setStep(1)}
                  >
                    <i className="fa-solid fa-pen mr-1"></i> ย้อนกลับแก้ไขเลขบัตร
                  </button>
                </div>
              </div>

              <div className="card-body p-4">
                {/* Section 1: Personal Info */}
                <div className="mb-4 pb-3 border-bottom">
                  <h6 className="font-weight-bold text-primary mb-3">
                    <i className="fa-solid fa-address-card mr-2"></i>1. ข้อมูลส่วนบุคคลและรหัสผ่านเริ่มต้น
                  </h6>

                  <div className="row">
                    <div className="col-md-3 mb-3">
                      <label className="small font-weight-bold text-dark">
                        คำนำหน้า <span className="text-danger">*</span>
                      </label>
                      <select
                        name="prefix"
                        className="custom-select form-control"
                        value={formData.prefix}
                        onChange={handleChange}
                        required
                      >
                        <option value="">-- เลือก --</option>
                        {options.prefixes.map((opt) => (
                          <option key={opt.prefix_id || opt.id} value={opt.prefix_id || opt.id}>
                            {opt.prefix}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className="col-md-4 mb-3">
                      <label className="small font-weight-bold text-dark">
                        ชื่อ <span className="text-danger">*</span>
                      </label>
                      <input
                        type="text"
                        name="name"
                        className="form-control"
                        placeholder="ชื่อภาษาไทย (ไม่ต้องระบุคำนำหน้า)"
                        value={formData.name}
                        onChange={handleChange}
                        required
                      />
                    </div>
                    <div className="col-md-5 mb-3">
                      <label className="small font-weight-bold text-dark">
                        นามสกุล <span className="text-danger">*</span>
                      </label>
                      <input
                        type="text"
                        name="lastname"
                        className="form-control"
                        placeholder="นามสกุลภาษาไทย"
                        value={formData.lastname}
                        onChange={handleChange}
                        required
                      />
                    </div>
                  </div>

                  <div className="row">
                    <div className="col-lg-3 col-md-4 mb-3">
                      <label className="small font-weight-bold text-dark">
                        เพศ <span className="text-danger">*</span>
                      </label>
                      <select
                        name="gender"
                        className="custom-select form-control"
                        value={formData.gender}
                        onChange={handleChange}
                        required
                      >
                        <option value="">-- เลือกเพศ --</option>
                        {options.genders.map((opt) => (
                          <option key={opt.gender_id || opt.id} value={opt.gender_id || opt.id}>
                            {opt.gender}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="col-lg-5 col-md-8 mb-3">
                      <label className="small font-weight-bold text-dark d-block">
                        วัน/เดือน/ปีเกิด <span className="text-danger">*</span>
                      </label>
                      <ThaiDatePicker
                        mode="birthday"
                        value={formData.birthday}
                        onChange={(val) => setFormData((prev) => ({ ...prev, birthday: val }))}
                        required
                      />
                      <div
                        className="mt-2 px-3 py-2 rounded border"
                        style={{
                          backgroundColor: previewPassword ? '#eff6ff' : '#f8fafc',
                          borderColor: previewPassword ? '#bfdbfe' : '#e2e8f0',
                          fontSize: '0.82rem',
                        }}
                      >
                        {previewPassword ? (
                          <span className="text-primary font-weight-bold">
                            <i className="fa-solid fa-key mr-1"></i>
                            รหัสผ่านเริ่มต้นของคุณคือ:{' '}
                            <code className="font-weight-bold" style={{ fontSize: '0.95rem', color: '#1d4ed8' }}>
                              {previewPassword}
                            </code>{' '}
                            <span className="text-muted font-weight-normal">(ปี ค.ศ.เดือนวัน 8 หลัก)</span>
                          </span>
                        ) : (
                          <span className="text-muted">
                            <i className="fa-solid fa-circle-info mr-1 text-primary"></i>
                            รหัสผ่านเริ่มต้นจะสร้างจากวันเกิดเป็น <strong>ปี ค.ศ.เดือนวัน 8 หลัก</strong> (เช่น <code>19900514</code>)
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="col-lg-4 col-md-12 mb-3">
                      <label className="small font-weight-bold text-dark">
                        วุฒิการศึกษาสูงสุด <span className="text-danger">*</span>
                      </label>
                      <select
                        name="edu_level"
                        className="custom-select form-control"
                        value={formData.edu_level}
                        onChange={handleChange}
                        required
                      >
                        <option value="">-- เลือกวุฒิการศึกษา --</option>
                        {options.eduLevels.map((opt) => (
                          <option
                            key={opt.educationlevel_id || opt.id}
                            value={opt.educationlevel_id || opt.id}
                          >
                            {opt.educationlevel_name}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div className="row">
                    <div className="col-md-6 mb-3 mb-md-0">
                      <label className="small font-weight-bold text-dark">
                        เบอร์โทรศัพท์ติดต่อ <span className="text-danger">*</span>
                      </label>
                      <input
                        type="tel"
                        name="phone"
                        className="form-control"
                        placeholder="เช่น 0812345678"
                        value={formData.phone}
                        onChange={handleChange}
                        required
                      />
                    </div>
                    <div className="col-md-6">
                      <label className="small font-weight-bold text-dark">
                        อีเมล (Email) <span className="text-danger">*</span>
                      </label>
                      <input
                        type="email"
                        name="email"
                        className="form-control"
                        placeholder="example@school.ac.th"
                        value={formData.email}
                        onChange={handleChange}
                        required
                      />
                    </div>
                  </div>
                </div>

                {/* Section 2: Affiliation & Position */}
                <div className={isNonTeachingPosition ? 'mb-2' : 'mb-4 pb-3 border-bottom'}>
                  <h6 className="font-weight-bold text-primary mb-3">
                    <i className="fa-solid fa-building-user mr-2"></i>2. ตำแหน่งและหน่วยงานต้นสังกัด
                  </h6>

                  <div className="row">
                    <div className="col-md-4 mb-3">
                      <label className="small font-weight-bold text-dark">
                        ประเภทบุคลากร <span className="text-danger">*</span>
                      </label>
                      <select
                        name="persontype_id"
                        className="custom-select form-control"
                        value={formData.persontype_id}
                        onChange={handleChange}
                        required
                      >
                        <option value="">-- ประเภทบุคลากร --</option>
                        {options.personTypes.map((opt) => (
                          <option
                            key={opt.persontype_id || opt.id}
                            value={opt.persontype_id || opt.id}
                          >
                            {opt.persontype_name}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="col-md-4 mb-3">
                      <label className="small font-weight-bold text-dark">
                        ตำแหน่ง <span className="text-danger">*</span>
                      </label>
                      <select
                        name="position_id"
                        className="custom-select form-control"
                        value={formData.position_id}
                        onChange={handleChange}
                        required
                      >
                        <option value="">-- เลือกตำแหน่ง --</option>
                        {options.positions.map((opt) => (
                          <option key={opt.position_id || opt.id} value={opt.position_id || opt.id}>
                            {opt.position_name}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="col-md-4 mb-3">
                      <label className="small font-weight-bold text-dark">
                        วิทยฐานะ <span className="text-danger">*</span>
                      </label>
                      <select
                        name="academic_id"
                        className="custom-select form-control"
                        value={formData.academic_id}
                        onChange={handleChange}
                        required
                      >
                        <option value="">-- เลือกวิทยฐานะ --</option>
                        {options.academics.map((opt) => (
                          <option key={opt.academic_id || opt.id} value={opt.academic_id || opt.id}>
                            {opt.academic_standing}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div className="row">
                    <div className="col-md-8 mb-2">
                      <label className="small font-weight-bold text-dark">
                        สถานศึกษา / หน่วยงานต้นสังกัด <span className="text-danger">*</span>
                      </label>
                      {isDistrictPosition ? (
                        <input
                          type="text"
                          className="form-control bg-light text-muted"
                          value="สำนักงานเขตพื้นที่การศึกษามัธยมศึกษาพิษณุโลก อุตรดิตถ์ (กำหนดอัตโนมัติ)"
                          disabled
                          readOnly
                        />
                      ) : (
                        <SearchableSelect
                          name="school"
                          options={schoolSelectOptions}
                          value={formData.school}
                          onChange={(val) => setFormData((prev) => ({ ...prev, school: val }))}
                          placeholder="-- พิมพ์ค้นหาหรือเลือกโรงเรียน --"
                          searchPlaceholder="พิมพ์ชื่อโรงเรียนเพื่อค้นหา..."
                          required={!isDistrictPosition}
                        />
                      )}
                    </div>
                  </div>
                </div>

                {/* Section 3: Teaching Assignment (Hidden for Directors / Supervisors / District Executives) */}
                {!isNonTeachingPosition && (
                  <div>
                    <h6 className="font-weight-bold text-primary mb-3">
                      <i className="fa-solid fa-chalkboard-user mr-2"></i>3. ข้อมูลการจัดการเรียนรู้
                    </h6>

                    <div className="row">
                      <div className="col-md-4 mb-3">
                        <label className="small font-weight-bold text-dark">
                          กลุ่มสาระการเรียนรู้ <span className="text-danger">*</span>
                        </label>
                        <select
                          name="teach_subject"
                          className="custom-select form-control"
                          value={formData.teach_subject}
                          onChange={handleChange}
                          required={!isNonTeachingPosition}
                        >
                          <option value="">-- เลือกกลุ่มสาระ --</option>
                          {options.studyGroups.map((opt) => (
                            <option
                              key={opt.teach_subject_id || opt.id}
                              value={opt.teach_subject_id || opt.id}
                            >
                              {opt.teach_subject}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div className="col-md-4 mb-3">
                        <label className="small font-weight-bold text-dark">บทบาทหัวหน้ากลุ่มสาระ</label>
                        <select
                          name="headDepartment"
                          className="custom-select form-control"
                          value={formData.headDepartment}
                          onChange={handleChange}
                        >
                          <option value="0">ไม่ได้เป็นหัวหน้ากลุ่มสาระ</option>
                          <option value="1">เป็นหัวหน้ากลุ่มสาระการเรียนรู้</option>
                        </select>
                      </div>

                      <div className="col-md-4 mb-3">
                        <label className="small font-weight-bold text-dark">รายวิชาที่สอนหลัก</label>
                        <input
                          type="text"
                          name="teach_subject_name"
                          className="form-control"
                          placeholder="เช่น คณิตศาสตร์พื้นฐาน, ภาษาไทย"
                          value={formData.teach_subject_name}
                          onChange={handleChange}
                        />
                      </div>
                    </div>

                    <div className="row">
                      <div className="col-12">
                        <label className="small font-weight-bold text-dark d-block mb-2">
                          ระดับชั้นที่ทำการสอน <span className="text-muted font-weight-normal">(เลือกได้มากกว่า 1 ระดับชั้น)</span>
                        </label>
                        <div
                          className="p-3 border rounded bg-light d-flex flex-wrap"
                          style={{ gap: '10px 18px' }}
                        >
                          {options.gradeLevels.map((opt) => {
                            const gId = String(opt.grade_level_id || opt.id);
                            const isChecked =
                              Array.isArray(formData.teach_level) && formData.teach_level.includes(gId);
                            return (
                              <div className="custom-control custom-checkbox" key={gId}>
                                <input
                                  type="checkbox"
                                  className="custom-control-input"
                                  id={`reg_grade_${gId}`}
                                  name="teach_level"
                                  value={gId}
                                  checked={isChecked}
                                  onChange={handleChange}
                                />
                                <label
                                  className="custom-control-label small font-weight-bold text-dark"
                                  htmlFor={`reg_grade_${gId}`}
                                  style={{ cursor: 'pointer' }}
                                >
                                  {opt.grade_level_name}
                                </label>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              <div className="card-footer bg-light border-top py-3 px-4 d-flex justify-content-between align-items-center flex-wrap" style={{ gap: '10px' }}>
                <button
                  type="button"
                  className="btn btn-outline-secondary font-weight-bold"
                  onClick={() => setStep(1)}
                  disabled={loading}
                >
                  <i className="fa-solid fa-arrow-left mr-1"></i> ย้อนกลับแก้ไขเลขบัตร
                </button>
                <div className="d-flex align-items-center" style={{ gap: '8px' }}>
                  <Link to="/login" className="btn btn-outline-danger font-weight-bold">
                    ยกเลิก
                  </Link>
                  <button
                    type="submit"
                    className="btn btn-success px-4 font-weight-bold shadow-sm"
                    disabled={loading}
                  >
                    {loading ? (
                      <span>
                        <span className="spinner-border spinner-border-sm mr-2"></span>
                        กำลังบันทึกข้อมูล...
                      </span>
                    ) : (
                      <span>
                        <i className="fa-solid fa-check mr-2"></i>ยืนยันการลงทะเบียน
                      </span>
                    )}
                  </button>
                </div>
              </div>
            </form>
          )}

          {step === 3 && (
            <div className="card-body p-4 p-md-5 text-center">
              <div
                className="mx-auto mb-3 rounded-circle d-flex align-items-center justify-content-center"
                style={{
                  width: '76px',
                  height: '76px',
                  backgroundColor: '#dcfce7',
                  color: '#16a34a',
                  fontSize: '2.2rem',
                }}
              >
                <i className="fa-solid fa-circle-check"></i>
              </div>

              <h4 className="font-weight-bold text-dark mb-1">ลงทะเบียนเข้าสู่ระบบสำเร็จ!</h4>
              <p className="text-muted mb-4">
                ยินดีต้อนรับ <strong>{`${selectedPrefixLabel}${formData.name} ${formData.lastname}`.trim()}</strong> เข้าสู่ระบบนิเทศออนไลน์ (LMSS)
              </p>

              <div
                className="mx-auto text-left p-4 border rounded mb-4"
                style={{
                  maxWidth: '500px',
                  backgroundColor: '#f8fafc',
                  borderRadius: '14px',
                }}
              >
                <div className="small text-muted font-weight-bold mb-3 text-center">
                  <i className="fa-solid fa-shield-halved text-primary mr-1"></i>
                  กรุณาบันทึกข้อมูลสำหรับเข้าสู่ระบบของท่าน
                </div>

                <div className="d-flex justify-content-between align-items-center py-2 border-bottom">
                  <div>
                    <div className="text-muted" style={{ fontSize: '0.78rem' }}>
                      ชื่อผู้ใช้งาน (เลขประจำตัวประชาชน 13 หลัก)
                    </div>
                    <div className="font-weight-bold text-dark" style={{ fontSize: '1.1rem' }}>
                      {peopleId}
                    </div>
                  </div>
                  <button
                    type="button"
                    className="btn btn-sm btn-outline-secondary"
                    onClick={() => handleCopyCredentials(cleanThaiId(peopleId), 'เลขประจำตัวประชาชน')}
                  >
                    <i className="fa-regular fa-copy mr-1"></i> คัดลอก
                  </button>
                </div>

                <div className="d-flex justify-content-between align-items-center pt-3">
                  <div>
                    <div className="text-muted" style={{ fontSize: '0.78rem' }}>
                      รหัสผ่านเริ่มต้น (วันเกิด ค.ศ. YYYYMMDD)
                    </div>
                    <div
                      className="font-weight-bold text-primary"
                      style={{ fontSize: '1.35rem', letterSpacing: '2px' }}
                    >
                      {generatedPassword}
                    </div>
                  </div>
                  <button
                    type="button"
                    className="btn btn-sm btn-primary font-weight-bold"
                    onClick={() => handleCopyCredentials(generatedPassword, 'รหัสผ่านเริ่มต้น')}
                  >
                    <i className="fa-regular fa-copy mr-1"></i> คัดลอกรหัสผ่าน
                  </button>
                </div>
              </div>

              <div
                className="mx-auto alert alert-info text-left small mb-4"
                style={{ maxWidth: '500px', borderRadius: '12px' }}
              >
                <div className="mb-1 font-weight-bold">
                  <i className="fa-solid fa-circle-check text-success mr-1"></i> สถานะบัญชีพร้อมเข้าใช้งานได้ทันที
                </div>
                <div className="text-muted">
                  ท่านสามารถเข้าสู่ระบบได้ทันที และผู้ดูแลระบบระดับสถานศึกษาสามารถตรวจสอบหรือรับรองรายชื่อบุคลากรในสังกัดเพิ่มเติมได้ผ่านเมนูยืนยันบุคลากร
                </div>
              </div>

              <Link
                to="/login"
                className="btn btn-primary btn-lg px-5 font-weight-bold shadow-sm"
                style={{ borderRadius: '12px' }}
              >
                <i className="fa-solid fa-right-to-bracket mr-2"></i> ไปยังหน้าเข้าสู่ระบบ
              </Link>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Register;
