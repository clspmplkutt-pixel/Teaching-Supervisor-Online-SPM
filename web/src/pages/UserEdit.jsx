import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import Swal from 'sweetalert2';
import { supabase } from '../supabaseClient';
import { useAuth } from '../contexts/AuthContext';
import { useUserProfile } from '../hooks/useUserProfile';
import useUserLookups from '../hooks/useUserLookups';
import useAppConfig from '../hooks/useAppConfig';
import ThaiDatePicker from '../components/ThaiDatePicker';
import { isValidThaiId } from '../utils/thaiId';

const getLocalTimestamp = () => {
  const dt = new Date();
  const pad = (n) => String(n).padStart(2, '0');
  return `${dt.getFullYear()}-${pad(dt.getMonth() + 1)}-${pad(dt.getDate())} ${pad(dt.getHours())}:${pad(dt.getMinutes())}:${pad(dt.getSeconds())}`;
};

const levelFromPosition = (positionId) => {
  if (positionId === '10008' || positionId === '10009') return 'districdirector';
  if (positionId === '10010') return 'supervisor';
  if (positionId === '10007' || positionId === '10006') return 'directorschool';
  if (positionId === '10000' || positionId === '10001' || positionId === '10999') return 'teacher';
  return '';
};

const normalizeBirthdayToAD = (val) => {
  if (!val) return '';
  const parts = String(val).trim().split('-');
  if (parts.length === 3) {
    let y = parseInt(parts[0], 10);
    if (y >= 2400 && y <= 2600) {
      y -= 543;
      return `${y}-${parts[1]}-${parts[2]}`;
    }
  }
  return String(val).trim();
};

const UserEdit = ({ variant }) => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { profile } = useUserProfile();
  const [searchParams] = useSearchParams();
  const peopleIdParam = searchParams.get('people_id') || '';
  const idParam = searchParams.get('id') || '';
  const peopleIdError = searchParams.get('peopleid_error') || '';

  const hasPeopleId = peopleIdParam ? 1 : 0;
  const { lists, loading: lookupsLoading } = useUserLookups();
  const { config } = useAppConfig();
  const areaCode = config.AREA_CODE10 || '1000650001';

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [originalPeopleId, setOriginalPeopleId] = useState('');
  const [peopleIdStatus, setPeopleIdStatus] = useState({ message: '', valid: true, duplicate: false });
  const [isPeopleIdReadonly, setIsPeopleIdReadonly] = useState(true);

  const [form, setForm] = useState({
    people_id: '',
    prefix: '',
    name: '',
    lastname: '',
    persontype_id: '',
    position_id: '',
    academic_id: '',
    gender: '',
    birthday: '',
    school: '',
    edu_level: '',
    headDepartment: '0',
    chairman: '0',
    level: '',
    teach_subject: '',
    teach_subject_name: '',
    teach_level: [],
    khet_code: '',
    phone: '',
    email: '',
  });

  const title = useMemo(() => {
    if (variant === 'teacher') return 'แก้ไขข้อมูลครู';
    return 'แก้ไขข้อมูลผู้อำนวยการ/รองผู้อำนวยการ';
  }, [variant]);

  const backModule = useMemo(() => {
    if (variant === 'teacher') return 'userteacher';
    if (variant === 'directorschool') return 'userdirectorschool';
    if (variant === 'supervisor') return 'usersupervisor';
    if (variant === 'dd') return 'userDistricDirector';
    return 'info';
  }, [variant]);

  useEffect(() => {
    let mounted = true;
    const loadUser = async () => {
      setLoading(true);
      try {
        if (!peopleIdParam && !idParam) {
          setLoading(false);
          return;
        }
        let query = supabase.from('tbl_Users').select('*');
        if (peopleIdParam) query = query.eq('people_id', peopleIdParam);
        if (!peopleIdParam && idParam) query = query.eq('id', idParam);
        const { data, error } = await query.maybeSingle();
        if (error) throw error;
        if (!data) {
          Swal.fire('Error', 'ไม่พบข้อมูลผู้ใช้งาน', 'error');
          return;
        }

        // Scope check for admin_school
        if (profile?.level === 'admin_school' && profile?.school && String(data.school) !== String(profile.school)) {
          Swal.fire('ไม่มีสิทธิ์', 'คุณสามารถแก้ไขได้เฉพาะบุคลากรในสถานศึกษาของคุณเท่านั้น', 'warning');
          navigate(`/${backModule}`);
          return;
        }

        if (!mounted) return;
        setOriginalPeopleId(data.people_id || '');
        setForm({
          people_id: data.people_id || '',
          prefix: data.prefix || '',
          name: data.name || '',
          lastname: data.lastname || '',
          persontype_id: data.persontype_id || '',
          position_id: data.position_id || '',
          academic_id: data.academic_id || '',
          gender: data.gender || '',
          birthday: normalizeBirthdayToAD(data.birthday),
          school: data.school || '',
          edu_level: data.edu_level || '',
          headDepartment: data.headDepartment || '0',
          chairman: data.chairman || '0',
          level: data.level || '',
          teach_subject: data.teach_subject || '',
          teach_subject_name: data.teach_subject_name || '',
          teach_level: data.teach_level ? data.teach_level.split(',') : [],
          khet_code: data.khet_code || '',
          phone: data.phone || '',
          email: data.email || '',
        });

        const isValid = data.people_id ? isValidThaiId(data.people_id) : false;
        const shouldReadonly = data.people_id && !peopleIdError && isValid;
        setIsPeopleIdReadonly(Boolean(shouldReadonly));
        if (peopleIdError === 'peopleidError') {
          setPeopleIdStatus({ message: 'ไม่ได้ระบุเลขประจำตัวประชาชน', valid: false, duplicate: false });
        } else if (peopleIdError === 'peopleidDup') {
          setPeopleIdStatus({ message: 'เลขประจำตัวประชาชนซ้ำ', valid: false, duplicate: true });
        } else if (data.people_id && !isValid) {
          setPeopleIdStatus({ message: 'เลขประจำตัวประชาชนไม่ถูกต้อง', valid: false, duplicate: false });
        } else {
          setPeopleIdStatus({ message: '', valid: true, duplicate: false });
        }
      } catch (err) {
        console.error(err);
      } finally {
        if (mounted) setLoading(false);
      }
    };
    loadUser();
    return () => { mounted = false; };
  }, [peopleIdParam, idParam, peopleIdError, profile, backModule, navigate]);

  const validatePeopleId = async (value) => {
    const trimmed = String(value || '').trim();
    if (!trimmed) {
      setPeopleIdStatus({ message: '(กรุณากรอกเลขประจำตัวประชาชน)', valid: false, duplicate: false });
      return;
    }
    if (trimmed.length !== 13) {
      setPeopleIdStatus({ message: '', valid: false, duplicate: false });
      return;
    }
    if (!isValidThaiId(trimmed)) {
      setPeopleIdStatus({ message: '(เลขประจำตัวประชาชนไม่ถูกต้อง)', valid: false, duplicate: false });
      return;
    }

    if (!hasPeopleId || trimmed !== originalPeopleId) {
      const { data } = await supabase
        .from('tbl_Users')
        .select('id, people_id')
        .eq('people_id', trimmed)
        .maybeSingle();
      if (data && String(data.people_id) === trimmed && String(data.id) !== String(idParam || data.id)) {
        setPeopleIdStatus({ message: 'เป็นสมาชิกอยู่แล้ว ไม่สามารถสมัครได้', valid: false, duplicate: true });
        return;
      }
    }

    setPeopleIdStatus({ message: 'เลขประจำตัวประชาชนถูกต้อง', valid: true, duplicate: false });
  };

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    if (type === 'checkbox' && name === 'teach_level') {
      setForm((prev) => {
        const currentLevels = Array.isArray(prev.teach_level) ? prev.teach_level : [];
        if (checked) {
          return { ...prev, teach_level: [...currentLevels, String(value)] };
        } else {
          return { ...prev, teach_level: currentLevels.filter(v => v !== String(value)) };
        }
      });
      return;
    }
    setForm((prev) => ({ ...prev, [name]: value }));
    if (name === 'people_id') {
      validatePeopleId(value);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (saving) return;
    if (!form.people_id || !isValidThaiId(form.people_id)) {
      Swal.fire('ข้อผิดพลาด', 'เลขประจำตัวประชาชนไม่ถูกต้อง', 'error');
      return;
    }
    if (peopleIdStatus.duplicate) {
      Swal.fire('ข้อผิดพลาด', 'เลขประจำตัวประชาชนซ้ำกับผู้อื่นในระบบ', 'error');
      return;
    }

    const level = form.level === 'admin_school' ? 'admin_school' : (levelFromPosition(form.position_id) || form.level || '');
    let schoolValue = form.school;
    if (level === 'districdirector' || level === 'supervisor') {
      schoolValue = areaCode;
    }

    const payload = {
      prefix: form.prefix,
      name: form.name.trim(),
      lastname: form.lastname.trim(),
      persontype_id: form.persontype_id,
      position_id: form.position_id,
      academic_id: form.academic_id,
      gender: form.gender,
      birthday: normalizeBirthdayToAD(form.birthday),
      edu_level: form.edu_level,
      phone: form.phone.trim(),
      email: form.email.trim(),
      level,
      lastupdate: getLocalTimestamp(),
      update_by: user?.email || user?.user_metadata?.people_id || user?.id || '',
    };

    if (variant === 'teacher') {
      payload.school = schoolValue;
      payload.headDepartment = form.headDepartment;
      payload.teach_subject = form.teach_subject;
      payload.teach_subject_name = form.teach_subject_name;
      payload.teach_level = Array.isArray(form.teach_level) ? form.teach_level.join(',') : form.teach_level;
    }

    if (variant === 'directorschool') {
      payload.school = schoolValue;
      payload.chairman = form.chairman;
    }

    if (variant === 'supervisor') {
      payload.khet_code = form.khet_code;
      payload.teach_subject = form.teach_subject;
    }

    setSaving(true);
    try {
      if (!hasPeopleId) {
        if (!idParam) {
          Swal.fire('Error', 'ไม่พบข้อมูลผู้ใช้งาน', 'error');
          setSaving(false);
          return;
        }
        const { data: exists } = await supabase
          .from('tbl_Users')
          .select('id')
          .eq('people_id', form.people_id)
          .maybeSingle();
        if (exists && String(exists.id) !== String(idParam)) {
          Swal.fire('Error', 'มีสมาชิกท่านนี้อยู่แล้วครับ', 'error');
          navigate(`/${backModule}`);
          setSaving(false);
          return;
        }
        const { error } = await supabase
          .from('tbl_Users')
          .update({ ...payload, people_id: form.people_id })
          .eq('id', idParam);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('tbl_Users')
          .update(payload)
          .eq('people_id', originalPeopleId);
        if (error) throw error;
      }

      Swal.fire('สำเร็จ', 'บันทึกการแก้ไขข้อมูลเรียบร้อยแล้ว', 'success');
      navigate(`/${backModule}`);
    } catch (err) {
      console.error(err);
      Swal.fire('Error', 'ไม่สามารถบันทึกข้อมูลได้: ' + err.message, 'error');
    } finally {
      setSaving(false);
    }
  };

  if (loading || lookupsLoading) {
    return (
      <div className="text-center p-4">
        <div className="spinner-border text-primary" role="status"></div>
        <p className="mt-2">กำลังโหลดข้อมูลผู้ใช้งาน...</p>
      </div>
    );
  }

  if (!form) {
    return <div className="alert alert-warning">ไม่พบข้อมูลผู้ใช้งาน</div>;
  }

  const showSchool = variant === 'teacher' || variant === 'directorschool';
  const showChairman = variant === 'directorschool';
  const showHeadDepartment = variant === 'teacher';
  const showTeachSubject = variant === 'teacher' || variant === 'supervisor';
  const showTeachSubjectName = variant === 'teacher';
  const showTeachLevel = variant === 'teacher';
  const showKhet = variant === 'supervisor';

  return (
    <div className="container-fluid py-3">
      <div className="row justify-content-center">
        <div className="col-12 col-xl-10">
          <form onSubmit={handleSubmit}>
            <div className="card shadow-sm border-0 mb-4" style={{ borderRadius: '12px' }}>
              <div className="card-header bg-white py-3 border-bottom d-flex justify-content-between align-items-center">
                <h5 className="font-weight-bold mb-0 text-dark">
                  <i className="fa-solid fa-user-pen text-primary mr-2"></i> {title}
                </h5>
                <span className="badge badge-light border">
                  ID #{idParam || form.people_id}
                </span>
              </div>

              <div className="card-body p-4">
                {/* 1. Identification Section */}
                <div className="mb-4 pb-3 border-bottom">
                  <h6 className="font-weight-bold text-muted mb-3" style={{ fontSize: '13px', textTransform: 'uppercase' }}>
                    1. ข้อมูลประจำตัวและชื่อ-สกุล
                  </h6>
                  <div className="row">
                    <div className="col-md-6 mb-3">
                      <label className="font-weight-bold small text-muted">
                        เลขประจำตัวประชาชน: <span className="text-danger">{peopleIdStatus.message}</span>
                      </label>
                      <input
                        type="text"
                        className="form-control"
                        id="people_id"
                        name="people_id"
                        value={form.people_id}
                        onChange={handleChange}
                        required
                        readOnly={isPeopleIdReadonly}
                      />
                    </div>
                  </div>

                  <div className="row">
                    <div className="col-md-2 mb-3">
                      <label className="font-weight-bold small text-muted">คำนำหน้า:</label>
                      <select
                        name="prefix"
                        className="form-control"
                        value={form.prefix}
                        onChange={handleChange}
                        required
                      >
                        <option value="">คำนำหน้า</option>
                        {lists.prefix.map((row) => (
                          <option key={row.prefix_id} value={row.prefix_id}>{row.prefix}</option>
                        ))}
                      </select>
                    </div>

                    <div className="col-md-5 mb-3">
                      <label className="font-weight-bold small text-muted">ชื่อ:</label>
                      <input
                        type="text"
                        className="form-control"
                        name="name"
                        value={form.name}
                        onChange={handleChange}
                        required
                      />
                    </div>

                    <div className="col-md-5 mb-3">
                      <label className="font-weight-bold small text-muted">นามสกุล:</label>
                      <input
                        type="text"
                        className="form-control"
                        name="lastname"
                        value={form.lastname}
                        onChange={handleChange}
                        required
                      />
                    </div>
                  </div>

                  <div className="row">
                    <div className="col-md-4 mb-3">
                      <label className="font-weight-bold small text-muted">เพศ:</label>
                      <select
                        name="gender"
                        className="form-control"
                        value={form.gender}
                        onChange={handleChange}
                        required
                      >
                        <option value="">เพศ</option>
                        {lists.gender.map((row) => (
                          <option key={row.gender_id} value={row.gender_id}>{row.gender}</option>
                        ))}
                      </select>
                    </div>

                    <div className="col-md-4 mb-3">
                      <label className="font-weight-bold small text-muted">วันเกิด:</label>
                      <ThaiDatePicker
                        mode="birthday"
                        value={form.birthday}
                        onChange={(isoVal) => setForm(prev => ({ ...prev, birthday: isoVal }))}
                      />
                    </div>

                    <div className="col-md-4 mb-3">
                      <label className="font-weight-bold small text-muted">วุฒิการศึกษาสูงสุด:</label>
                      <select
                        name="edu_level"
                        className="form-control"
                        value={form.edu_level}
                        onChange={handleChange}
                        required
                      >
                        <option value="">วุฒิการศึกษา</option>
                        {lists.eduLevel.map((row) => (
                          <option key={row.educationlevel_id} value={row.educationlevel_id}>{row.educationlevel_name}</option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div className="row">
                    <div className="col-md-6 mb-3">
                      <label className="font-weight-bold small text-muted">เบอร์โทรศัพท์:</label>
                      <input
                        className="form-control"
                        type="tel"
                        name="phone"
                        placeholder="08xxxxxxxx"
                        value={form.phone}
                        onChange={handleChange}
                      />
                    </div>
                    <div className="col-md-6 mb-3">
                      <label className="font-weight-bold small text-muted">อีเมล:</label>
                      <input
                        className="form-control"
                        type="email"
                        name="email"
                        placeholder="user@example.com"
                        value={form.email}
                        onChange={handleChange}
                      />
                    </div>
                  </div>
                </div>

                {/* 2. Position & School Section */}
                <div className="mb-4 pb-3 border-bottom">
                  <h6 className="font-weight-bold text-muted mb-3" style={{ fontSize: '13px', textTransform: 'uppercase' }}>
                    2. ตำแหน่ง วิทยฐานะ และสังกัด
                  </h6>
                  <div className="row">
                    <div className="col-md-4 mb-3">
                      <label className="font-weight-bold small text-muted">ประเภทบุคลากร:</label>
                      <select
                        name="persontype_id"
                        className="form-control"
                        value={form.persontype_id}
                        onChange={handleChange}
                        required
                      >
                        <option value="">ประเภทบุคลากร</option>
                        {lists.personType.map((row) => (
                          <option key={row.persontype_id} value={row.persontype_id}>{row.persontype_name}</option>
                        ))}
                      </select>
                    </div>

                    <div className="col-md-4 mb-3">
                      <label className="font-weight-bold small text-muted">ตำแหน่ง:</label>
                      <select
                        name="position_id"
                        className="form-control"
                        value={form.position_id}
                        onChange={handleChange}
                        required
                      >
                        <option value="">ตำแหน่ง</option>
                        {lists.position.map((row) => (
                          <option key={row.position_id} value={row.position_id}>{row.position_name}</option>
                        ))}
                      </select>
                    </div>

                    <div className="col-md-4 mb-3">
                      <label className="font-weight-bold small text-muted">วิทยฐานะ:</label>
                      <select
                        name="academic_id"
                        className="form-control"
                        value={form.academic_id}
                        onChange={handleChange}
                        required
                      >
                        <option value="">วิทยฐานะ</option>
                        {lists.academic.map((row) => (
                          <option key={row.academic_id} value={row.academic_id}>{row.academic_standing}</option>
                        ))}
                      </select>
                    </div>
                  </div>

                  {showSchool && (
                    <div className="row">
                      <div className="col-md-4 mb-3">
                        <label className="font-weight-bold small text-muted">สถานศึกษา:</label>
                        <select
                          name="school"
                          className="form-control"
                          value={form.school}
                          onChange={handleChange}
                          required
                          disabled={profile?.level === 'admin_school'}
                        >
                          <option value="">โรงเรียน</option>
                          {lists.school.map((row) => (
                            <option key={row.school_id} value={row.school_id}>{row.school_name}</option>
                          ))}
                        </select>
                      </div>

                      {showHeadDepartment && (
                        <>
                          <div className="col-md-4 mb-3">
                            <label className="font-weight-bold small text-muted">หัวหน้ากลุ่มสาระฯ:</label>
                            <select
                              name="headDepartment"
                              className="form-control"
                              value={form.headDepartment || '0'}
                              onChange={handleChange}
                              required
                            >
                              <option value="0">ไม่ได้เป็นหัวหน้ากลุ่มสาระ</option>
                              <option value="1">เป็นหัวหน้ากลุ่มสาระ</option>
                            </select>
                          </div>

                          <div className="col-md-4 mb-3">
                            <label className="font-weight-bold small text-muted">สิทธิ์ School Admin:</label>
                            <select
                              name="school_admin_level"
                              className="form-control"
                              value={form.level === 'admin_school' ? '1' : '0'}
                              onChange={(e) => setForm(prev => ({ ...prev, level: e.target.value === '1' ? 'admin_school' : 'teacher' }))}
                            >
                              <option value="0">ผู้ใช้ทั่วไป (ครู)</option>
                              <option value="1">ผู้ดูแลระบบสถานศึกษา (School Admin)</option>
                            </select>
                          </div>
                        </>
                      )}

                      {showChairman && (
                        <div className="col-md-4 mb-3">
                          <label className="font-weight-bold small text-muted">ประธานสหวิทยาเขต:</label>
                          <select
                            name="chairman"
                            className="form-control"
                            value={form.chairman || '0'}
                            onChange={handleChange}
                            required
                          >
                            <option value="0">ไม่ได้เป็นประธานสหวิทยาเขต</option>
                            <option value="1">เป็นประธานสหวิทยาเขต</option>
                          </select>
                        </div>
                      )}
                    </div>
                  )}

                  {showTeachSubject && (
                    <div className="row">
                      <div className="col-md-4 mb-3">
                        <label className="font-weight-bold small text-muted">กลุ่มสาระการเรียนรู้:</label>
                        <select
                          name="teach_subject"
                          className="form-control"
                          value={form.teach_subject}
                          onChange={handleChange}
                          required
                        >
                          <option value="">กลุ่มสาระ</option>
                          {lists.teachSubject.map((row) => (
                            <option key={row.teach_subject_id} value={row.teach_subject_id}>{row.teach_subject}</option>
                          ))}
                        </select>
                      </div>

                      {showKhet && (
                        <div className="col-md-4 mb-3">
                          <label className="font-weight-bold small text-muted">สหวิทยาเขต:</label>
                          <select
                            name="khet_code"
                            className="form-control"
                            value={form.khet_code}
                            onChange={handleChange}
                            required
                          >
                            <option value="">สหวิทยาเขต</option>
                            {lists.khet.map((row) => (
                              <option key={row.khet_code} value={row.khet_code}>{row.khet_name}</option>
                            ))}
                          </select>
                        </div>
                      )}
                    </div>
                  )}

                  {showTeachSubjectName && (
                    <div className="row">
                      <div className="col-md-4 mb-3">
                        <label className="font-weight-bold small text-muted">วิชาที่ทำการสอน:</label>
                        <input
                          className="form-control"
                          type="text"
                          name="teach_subject_name"
                          placeholder="เช่น คณิตศาสตร์เพิ่มเติม"
                          value={form.teach_subject_name}
                          onChange={handleChange}
                          required
                        />
                      </div>

                      {showTeachLevel && (
                        <div className="col-md-8 mb-3">
                          <label className="font-weight-bold small text-muted">ระดับชั้นที่ทำการสอน:</label>
                          <div className="d-flex flex-wrap gap-2 p-2 border rounded bg-light">
                            {lists.gradeLevel.filter((row) => row.grade_level_id !== '499').map((row) => (
                              <div className="custom-control custom-checkbox mr-3" key={row.grade_level_id}>
                                <input
                                  type="checkbox"
                                  className="custom-control-input"
                                  id={`grade_${row.grade_level_id}`}
                                  name="teach_level"
                                  value={row.grade_level_id}
                                  checked={Array.isArray(form.teach_level) && form.teach_level.includes(String(row.grade_level_id))}
                                  onChange={handleChange}
                                />
                                <label className="custom-control-label small" htmlFor={`grade_${row.grade_level_id}`}>
                                  {row.grade_level_name}
                                </label>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* Actions Toolbar */}
                <div className="d-flex justify-content-end gap-2 pt-3">
                  <button
                    type="button"
                    className="btn btn-secondary px-3"
                    onClick={() => navigate(`/${backModule}`)}
                  >
                    ยกเลิก
                  </button>
                  <button
                    type="submit"
                    className="btn btn-success font-weight-bold px-4"
                    disabled={saving || !peopleIdStatus.valid || peopleIdStatus.duplicate}
                  >
                    <i className="fa-solid fa-save mr-1"></i> {saving ? 'กำลังบันทึก...' : 'บันทึกการแก้ไข'}
                  </button>
                </div>
              </div>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default UserEdit;
