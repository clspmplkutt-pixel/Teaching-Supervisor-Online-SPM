import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import Swal from 'sweetalert2';
import { supabase } from '../supabaseClient';
import { useAuth } from '../contexts/AuthContext';
import useUserLookups from '../hooks/useUserLookups';
import useSelect2 from '../hooks/useSelect2';
import useAppConfig from '../hooks/useAppConfig';
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

const UserEdit = ({ variant }) => {
  const navigate = useNavigate();
  const { user } = useAuth();
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
    teach_subject: '',
    teach_subject_name: '',
    teach_level: '',
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

  useSelect2([
    lookupsLoading,
    lists.prefix.length,
    lists.position.length,
    lists.academic.length,
    lists.personType.length,
    lists.school.length,
    lists.teachSubject.length,
    lists.eduLevel.length,
    lists.gradeLevel.length,
    lists.khet.length,
    lists.gender.length,
  ]);

  useEffect(() => {
    const $ = window.$;
    if (!$ || !$.fn || !$.fn.datepicker) return;
    const picker = $('#birthday');
    picker.datepicker({
      format: 'yyyy-mm-dd',
      autoclose: true,
      language: 'th-th',
      thaiyear: true,
    });
    return () => {
      try { picker.datepicker('destroy'); } catch { /* noop */ }
    };
  }, [loading]);

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
          birthday: data.birthday || '',
          school: data.school || '',
          edu_level: data.edu_level || '',
          headDepartment: data.headDepartment || '0',
          chairman: data.chairman || '0',
          teach_subject: data.teach_subject || '',
          teach_subject_name: data.teach_subject_name || '',
          teach_level: data.teach_level || '',
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
  }, [peopleIdParam, idParam, peopleIdError]);

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
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
    if (name === 'people_id') {
      validatePeopleId(value);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (saving) return;
    if (!form.people_id || !isValidThaiId(form.people_id)) {
      Swal.fire('Error', 'เลขประจำตัวประชาชนไม่ถูกต้อง', 'error');
      return;
    }
    if (peopleIdStatus.duplicate) {
      Swal.fire('Error', 'เลขประจำตัวประชาชนซ้ำ', 'error');
      return;
    }

    const level = levelFromPosition(form.position_id) || form.level || '';
    let schoolValue = form.school;
    if (level === 'districdirector' || level === 'supervisor') {
      schoolValue = areaCode;
    }

    const payload = {
      prefix: form.prefix,
      name: form.name,
      lastname: form.lastname,
      persontype_id: form.persontype_id,
      position_id: form.position_id,
      academic_id: form.academic_id,
      gender: form.gender,
      birthday: form.birthday,
      edu_level: form.edu_level,
      phone: form.phone,
      email: form.email,
      level,
      lastupdate: getLocalTimestamp(),
      update_by: user?.email || user?.user_metadata?.people_id || user?.id || '',
    };

    if (variant === 'teacher') {
      payload.school = schoolValue;
      payload.headDepartment = form.headDepartment;
      payload.chairman = '0';
      payload.teach_subject = form.teach_subject;
      payload.teach_subject_name = form.teach_subject_name;
      payload.teach_level = form.teach_level;
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

      Swal.fire('สำเร็จ', 'เพิ่มข้อมูลสำเร็จ', 'success');
      navigate(`/${backModule}`);
    } catch (err) {
      console.error(err);
      Swal.fire('Error', 'ไม่สามารถเพิ่มข้อมูลได้ เกิดข้อผิดพลาด', 'error');
    } finally {
      setSaving(false);
    }
  };

  if (loading || lookupsLoading) {
    return (
      <div className="text-center p-4">
        <div className="spinner-border text-primary" role="status"></div>
        <p className="mt-2">กำลังโหลดข้อมูล...</p>
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
    <div className="row">
      <div className="col-sm-12 col-md-12 col-lg-12 col-xl-12">
        <form onSubmit={handleSubmit}>
          <div className="card card-success">
            <div className="card-header">
              <h4 className="card-title">{title}</h4>
            </div>
            <div className="card-body">
              <div className="mb-3 mt-3">
                <label htmlFor="people_id">เลขประจำตัวประชาชน ** <span id="msg_people_id" className="text-danger">{peopleIdStatus.message}</span></label>
                <input type="text" className="form-control" id="people_id" name="people_id" value={form.people_id} onChange={handleChange} required readOnly={isPeopleIdReadonly} />
              </div>

              <div className="row">
                <div className="col-lg-2">
                  <div className="mb-3 mt-3">
                    <label htmlFor="prefix">คำนำหน้า</label>
                    <select name="prefix" id="prefix" className="custom-select select2bs4" value={form.prefix} onChange={handleChange} required>
                      <option value="">คำนำหน้า</option>
                      {lists.prefix.map((row) => (
                        <option key={row.prefix_id} value={row.prefix_id}>{row.prefix}</option>
                      ))}
                    </select>
                  </div>
                </div>
                <div className="col-lg-5">
                  <div className="mb-3 mt-3">
                    <label htmlFor="name">ชื่อ</label>
                    <input type="text" className="form-control" id="name" name="name" value={form.name} onChange={handleChange} required />
                  </div>
                </div>
                <div className="col-lg-5">
                  <div className="mb-3 mt-3">
                    <label htmlFor="lastname">นามสกุล</label>
                    <input type="text" className="form-control" id="lastname" name="lastname" value={form.lastname} onChange={handleChange} required />
                  </div>
                </div>
              </div>

              <div className="row">
                <div className="col-lg-4">
                  <div className="mb-3 mt-3">
                    <label htmlFor="gender">เพศ</label>
                    <select name="gender" id="gender" className="custom-select select2bs4" value={form.gender} onChange={handleChange} required>
                      <option value="">เพศ</option>
                      {lists.gender.map((row) => (
                        <option key={row.gender_id} value={row.gender_id}>{row.gender}</option>
                      ))}
                    </select>
                  </div>
                </div>
                <div className="col-lg-4">
                  <div className="mb-3 mt-3">
                    <label htmlFor="birthday">วันเกิด</label> <span className="text-danger">เช่น 1979-07-19</span>
                    <input className="form-control" type="text" id="birthday" name="birthday" value={form.birthday} onChange={handleChange} required />
                  </div>
                </div>
                <div className="col-lg-4">
                  <div className="mb-3 mt-3">
                    <label htmlFor="edu_level">วุฒิการศึกษาสูงสุด</label>
                    <select name="edu_level" id="edu_level" className="custom-select select2bs4" value={form.edu_level} onChange={handleChange} required>
                      <option value="">วุฒิการศึกษาสูงสุด</option>
                      {lists.eduLevel.map((row) => (
                        <option key={row.educationlevel_id} value={row.educationlevel_id}>{row.educationlevel_name}</option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>

              <div className="row">
                <div className="col-lg-6">
                  <div className="mb-3 mt-3">
                    <label htmlFor="phone">เบอร์โทรศัพท์</label>
                    <input className="form-control" type="text" id="phone" name="phone" placeholder="เบอร์โทรศัพท์" value={form.phone} onChange={handleChange} />
                  </div>
                </div>
                <div className="col-lg-6">
                  <div className="mb-3 mt-3">
                    <label htmlFor="email">Email</label>
                    <input className="form-control" type="email" id="email" name="email" placeholder="E-mail" value={form.email} onChange={handleChange} />
                  </div>
                </div>
              </div>

              <div className="row">
                <div className="col-lg-4">
                  <div className="mb-3 mt-3">
                    <label htmlFor="persontype_id">ประเภทบุคลากร</label>
                    <select name="persontype_id" id="persontype_id" className="custom-select select2bs4" value={form.persontype_id} onChange={handleChange} required>
                      <option value="">ประเภทบุคลากร</option>
                      {lists.personType.map((row) => (
                        <option key={row.persontype_id} value={row.persontype_id}>{row.persontype_name}</option>
                      ))}
                    </select>
                  </div>
                </div>
                <div className="col-lg-4">
                  <div className="mb-3 mt-3">
                    <label htmlFor="position_id">ตำแหน่ง</label>
                    <select name="position_id" id="position_id" className="custom-select select2bs4" value={form.position_id} onChange={handleChange} required>
                      <option value="">ตำแหน่ง</option>
                      {lists.position.map((row) => (
                        <option key={row.position_id} value={row.position_id}>{row.position_name}</option>
                      ))}
                    </select>
                  </div>
                </div>
                <div className="col-lg-4">
                  <div className="mb-3 mt-3">
                    <label htmlFor="academic_id">วิทยฐานะ</label>
                    <select name="academic_id" id="academic_id" className="custom-select select2bs4" value={form.academic_id} onChange={handleChange} required>
                      <option value="">วิทยฐานะ</option>
                      {lists.academic.map((row) => (
                        <option key={row.academic_id} value={row.academic_id}>{row.academic_standing}</option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>

              {showSchool && (
                <div className="row">
                  <div className="col-lg-4">
                    <div className="mb-3 mt-3">
                      <label htmlFor="school">โรงเรียน</label>
                      <select name="school" id="school" className="custom-select select2bs4" value={form.school} onChange={handleChange} required>
                        <option value="">โรงเรียน</option>
                        {lists.school.map((row) => (
                          <option key={row.school_id} value={row.school_id}>{row.school_name}</option>
                        ))}
                      </select>
                    </div>
                  </div>

                  {showHeadDepartment && (
                    <div className="col-lg-4">
                      <div className="mb-3 mt-3">
                        <label htmlFor="headDepartment">หัวหน้ากลุ่มสาระ</label>
                        <select name="headDepartment" id="headDepartment" className="custom-select select2bs4" value={form.headDepartment || '0'} onChange={handleChange} required>
                          <option value="0">ไม่ได้เป็นหัวหน้ากลุ่มสาระ</option>
                          <option value="1">เป็นหัวหน้ากลุ่มสาระ</option>
                        </select>
                      </div>
                    </div>
                  )}

                  {showChairman && (
                    <div className="col-lg-4">
                      <div className="mb-3 mt-3">
                        <label htmlFor="chairman">หัวหน้ากลุ่มสาระ</label>
                        <select name="chairman" id="chairman" className="custom-select select2bs4" value={form.chairman || '0'} onChange={handleChange} required>
                          <option value="0">ไม่ได้เป็นประธานสหวิทยาเขต</option>
                          <option value="1">เป็นประธานสหวิทยาเขต</option>
                        </select>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {showTeachSubject && (
                <div className="row">
                  <div className="col-lg-4">
                    <div className="mb-3 mt-3">
                      <label htmlFor="teach_subject">กลุ่มสาระ</label>
                      <select name="teach_subject" id="teach_subject" className="custom-select select2bs4" value={form.teach_subject} onChange={handleChange} required>
                        <option value="">กลุ่มสาระ</option>
                        {lists.teachSubject.map((row) => (
                          <option key={row.teach_subject_id} value={row.teach_subject_id}>{row.teach_subject}</option>
                        ))}
                      </select>
                    </div>
                  </div>

                  {showKhet && (
                    <div className="col-lg-4">
                      <div className="mb-3 mt-3">
                        <label htmlFor="khet_code">สหวิทยาเขต</label>
                        <select name="khet_code" id="khet_code" className="custom-select select2bs4" value={form.khet_code} onChange={handleChange} required>
                          <option value=""></option>
                          {lists.khet.map((row) => (
                            <option key={row.khet_code} value={row.khet_code}>{row.khet_name}</option>
                          ))}
                        </select>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {showTeachSubjectName && (
                <div className="row">
                  <div className="col-lg-4">
                    <div className="mb-3 mt-3">
                      <label htmlFor="teach_subject_name">วิชาที่ทำการสอน</label>
                      <input className="form-control" type="text" id="teach_subject_name" name="teach_subject_name" placeholder="วิชาที่ทำการสอน" value={form.teach_subject_name} onChange={handleChange} required />
                    </div>
                  </div>

                  {showTeachLevel && (
                    <div className="col-lg-4">
                      <div className="mb-3 mt-3">
                        <label htmlFor="teach_level">ระดับชั้นที่ทำการสอน</label>
                        <select name="teach_level" id="teach_level" className="custom-select select2bs4" value={form.teach_level} onChange={handleChange} required>
                          <option value="">ระดับชั้นที่ทำการสอน</option>
                          {lists.gradeLevel.filter((row) => row.grade_level_id !== '499').map((row) => (
                            <option key={row.grade_level_id} value={row.grade_level_id}>{row.grade_level_name}</option>
                          ))}
                        </select>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
            <div className="card-footer text-center">
              <button type="submit" className="btn btn-success" id="btn_submit" disabled={saving || !peopleIdStatus.valid || peopleIdStatus.duplicate}>
                <i className="fa-solid fa-user-pen"></i> แก้ไขข้อมูล
              </button>
              <button type="button" className="btn btn-danger ml-2" onClick={() => navigate(`/${backModule}`)}>
                <i className="fa-solid fa-ban"></i> ยกเลิก
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};

export default UserEdit;
