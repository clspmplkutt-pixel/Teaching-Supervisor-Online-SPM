import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import Swal from 'sweetalert2';
import { supabase } from '../supabaseClient';
import { useAuth } from '../contexts/AuthContext';
import { useUserProfile } from '../hooks/useUserProfile';
import { showToast } from '../utils/toast';
import LoadingSpinner from '../components/LoadingSpinner';
import ThaiDatePicker from '../components/ThaiDatePicker';
import SearchableSelect from '../components/SearchableSelect';

const isValidPeopleId = (value) => /^\d{13}$/.test(value || '');
const NON_TEACHING_ROLES = ['directorschool', 'supervisor', 'districdirector'];
const NON_TEACHING_POSITIONS = ['10006', '10007', '10008', '10009', '10010'];
const DISTRICT_POSITIONS = ['10008', '10009', '10010'];

const EditProfile = () => {
  const { user } = useAuth();
  const { profile, loading: profileLoading, reloadProfile } = useUserProfile();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [options, setOptions] = useState({
    prefix: [],
    gender: [],
    eduLevel: [],
    personType: [],
    position: [],
    academic: [],
    school: [],
    teachSubject: [],
    gradeLevel: [],
  });

  const [form, setForm] = useState({
    people_id: '',
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

  const activeRole = profile?.level || user?.level_id || user?.user_metadata?.role || '';

  const isNonTeaching = useMemo(() => {
    return (
      NON_TEACHING_ROLES.includes(String(activeRole)) ||
      NON_TEACHING_POSITIONS.includes(String(form.position_id))
    );
  }, [activeRole, form.position_id]);

  const isDistrictPosition = useMemo(
    () => DISTRICT_POSITIONS.includes(String(form.position_id)),
    [form.position_id]
  );

  const peopleIdReadOnly = useMemo(() => {
    if (!profile?.people_id) return false;
    return isValidPeopleId(profile.people_id);
  }, [profile]);

  const schoolSelectOptions = useMemo(
    () =>
      options.school.map((row) => ({
        value: String(row.school_id),
        label: row.school_name,
      })),
    [options.school]
  );

  useEffect(() => {
    let mounted = true;

    const loadOptions = async () => {
      setLoading(true);
      try {
        const [
          prefixRes,
          genderRes,
          eduRes,
          personRes,
          positionRes,
          academicRes,
          schoolRes,
          subjectRes,
          gradeRes,
        ] = await Promise.all([
          supabase.from('tbl_system_prefix').select('prefix_id, prefix').eq('prefix_status', '1').order('id', { ascending: true }),
          supabase.from('tbl_system_gender').select('*').order('id', { ascending: true }),
          supabase.from('tbl_system_EducationLevel').select('educationlevel_id, educationlevel_name').eq('educationlevel_status', '1').order('id', { ascending: true }),
          supabase.from('tbl_system_PersonType').select('persontype_id, persontype_name').eq('persontype_status', '1').order('persontype_id', { ascending: true }),
          supabase.from('tbl_system_PersonPositionType').select('position_id, position_name').eq('position_status', '1').order('position_id', { ascending: true }),
          supabase.from('tbl_system_Academic_Standing').select('academic_id, academic_standing').eq('academic_status', '1').order('academic_id', { ascending: true }),
          supabase.from('tbl_school').select('school_id, school_name').order('school_name', { ascending: true }),
          supabase.from('tbl_system_Teach_Subject').select('teach_subject_id, teach_subject').eq('teach_subject_status', '1').order('teach_subject_id', { ascending: true }),
          supabase
            .from('tbl_system_GradeLevel')
            .select('grade_level_id, grade_level_name')
            .eq('grade_level_status', '1')
            .neq('grade_level_id', '499')
            .order('grade_level_id', { ascending: true }),
        ]);

        if (!mounted) return;
        const activeGenders = (genderRes.data || []).filter(
          (r) => r.gender_status == null || String(r.gender_status) === '1'
        );

        setOptions({
          prefix: prefixRes.data || [],
          gender: activeGenders,
          eduLevel: eduRes.data || [],
          personType: personRes.data || [],
          position: positionRes.data || [],
          academic: academicRes.data || [],
          school: schoolRes.data || [],
          teachSubject: subjectRes.data || [],
          gradeLevel: gradeRes.data || [],
        });
      } catch (err) {
        console.error('EditProfile load options error:', err);
      } finally {
        if (mounted) setLoading(false);
      }
    };

    loadOptions();
    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    if (!profile) return;
    setForm((prev) => ({
      ...prev,
      people_id: profile.people_id || '',
      prefix: profile.prefix != null ? String(profile.prefix) : '',
      name: profile.name || '',
      lastname: profile.lastname || '',
      persontype_id: profile.persontype_id != null ? String(profile.persontype_id) : '',
      position_id: profile.position_id != null ? String(profile.position_id) : '',
      academic_id: profile.academic_id != null ? String(profile.academic_id) : '',
      gender: profile.gender != null ? String(profile.gender) : '',
      birthday: profile.birthday || '',
      school: profile.school != null ? String(profile.school) : '',
      edu_level: profile.edu_level != null ? String(profile.edu_level) : '',
      headDepartment: profile.headDepartment != null ? String(profile.headDepartment) : '0',
      teach_subject: profile.teach_subject != null ? String(profile.teach_subject) : '',
      teach_subject_name: profile.teach_subject_name || '',
      teach_level: profile.teach_level
        ? String(profile.teach_level)
            .split(',')
            .map((s) => s.trim())
            .filter(Boolean)
        : [],
      phone: profile.phone || '',
      email: profile.email || '',
    }));
  }, [profile]);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    if (type === 'checkbox' && name === 'teach_level') {
      setForm((prev) => {
        const currentLevels = Array.isArray(prev.teach_level) ? prev.teach_level : [];
        if (checked) {
          return { ...prev, teach_level: [...currentLevels, String(value)] };
        }
        return { ...prev, teach_level: currentLevels.filter((v) => v !== String(value)) };
      });
      return;
    }

    setForm((prev) => {
      const next = { ...prev, [name]: value };
      if (name === 'position_id' && DISTRICT_POSITIONS.includes(String(value)) && !prev.school) {
        next.school = '1000650001';
      }
      return next;
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (saving) return;

    if (!form.people_id) {
      Swal.fire('ข้อมูลไม่ครบถ้วน', 'กรุณากรอกเลขประจำตัวประชาชน', 'warning');
      return;
    }

    if (!form.school && !isDistrictPosition) {
      Swal.fire('ข้อมูลไม่ครบถ้วน', 'กรุณาเลือกสถานศึกษาสังกัด', 'warning');
      return;
    }

    setSaving(true);
    try {
      let cleanBirthday = form.birthday ? String(form.birthday).trim() : '';
      if (cleanBirthday) {
        const parts = cleanBirthday.split('-');
        if (parts.length === 3) {
          let y = parseInt(parts[0], 10);
          if (y >= 2400 && y <= 2600) {
            y -= 543;
            cleanBirthday = `${y}-${parts[1].padStart(2, '0')}-${parts[2].padStart(2, '0')}`;
          }
        }
      }

      // IMPORTANT: Never overwrite `chairman` here — preserves existing chairman assignment!
      const updatePayload = {
        people_id: String(form.people_id).trim(),
        prefix: form.prefix,
        name: String(form.name || '').trim(),
        lastname: String(form.lastname || '').trim(),
        persontype_id: form.persontype_id,
        position_id: form.position_id,
        academic_id: form.academic_id,
        gender: form.gender,
        birthday: cleanBirthday,
        school: isDistrictPosition && !form.school ? '1000650001' : form.school,
        edu_level: form.edu_level,
        headDepartment: form.headDepartment,
        teach_subject: form.teach_subject,
        teach_subject_name: String(form.teach_subject_name || '').trim(),
        teach_level: Array.isArray(form.teach_level) ? form.teach_level.join(',') : form.teach_level,
        phone: String(form.phone || '').trim(),
        email: String(form.email || '').trim(),
        lastupdate: new Date().toISOString(),
      };

      let query = supabase.from('tbl_Users').update(updatePayload);
      if (profile?.id != null) {
        query = query.eq('id', profile.id);
      } else {
        query = query.eq('people_id', profile.people_id);
      }

      const { error } = await query;
      if (error) throw error;

      await reloadProfile?.();
      showToast('บันทึกข้อมูลส่วนตัวเรียบร้อยแล้ว', 'success');
    } catch (err) {
      console.error(err);
      Swal.fire('เกิดข้อผิดพลาด', err.message || 'ไม่สามารถแก้ไขข้อมูลได้ กรุณาลองใหม่อีกครั้ง', 'error');
    } finally {
      setSaving(false);
    }
  };

  if (profileLoading || loading) {
    return <LoadingSpinner message="กำลังโหลดข้อมูลส่วนตัว..." />;
  }

  if (!profile) {
    return (
      <div className="alert alert-warning m-3">
        <i className="fa-solid fa-triangle-exclamation mr-2"></i>
        ไม่พบข้อมูลผู้ใช้งานในระบบ กรุณาเข้าสู่ระบบใหม่อีกครั้ง
      </div>
    );
  }

  return (
    <div className="container-fluid py-2">
      <div className="row justify-content-center">
        <div className="col-12 col-xl-10">
          <form onSubmit={handleSubmit}>
            {/* Section 1: Personal Information */}
            <div className="card border-0 shadow-sm mb-4" style={{ borderRadius: '14px' }}>
              <div className="card-header bg-white border-bottom py-3 px-4 d-flex justify-content-between align-items-center flex-wrap" style={{ borderRadius: '14px 14px 0 0' }}>
                <div>
                  <h5 className="font-weight-bold text-dark m-0">
                    <i className="fa-solid fa-id-card text-primary mr-2"></i>ข้อมูลส่วนบุคคล
                  </h5>
                  <small className="text-muted">ตรวจสอบและปรับปรุงข้อมูลพื้นฐานสำหรับการออกเกียรติบัตรและเอกสารราชการ</small>
                </div>
                {peopleIdReadOnly && (
                  <span className="badge badge-light border text-secondary px-3 py-2">
                    <i className="fa-solid fa-shield-check text-success mr-1"></i> ยืนยันเลขบัตร 13 หลักแล้ว
                  </span>
                )}
              </div>

              <div className="card-body p-4">
                <div className="row">
                  <div className="col-md-5 mb-3">
                    <label htmlFor="people_id" className="small font-weight-bold text-dark">
                      เลขประจำตัวประชาชน <span className="text-danger">*</span>
                    </label>
                    <input
                      type="text"
                      className={`form-control ${peopleIdReadOnly ? 'bg-light text-muted' : ''}`}
                      id="people_id"
                      name="people_id"
                      value={form.people_id}
                      onChange={handleChange}
                      readOnly={peopleIdReadOnly}
                      required
                    />
                  </div>
                  <div className="col-md-3 mb-3">
                    <label htmlFor="prefix" className="small font-weight-bold text-dark">
                      คำนำหน้า <span className="text-danger">*</span>
                    </label>
                    <select
                      name="prefix"
                      id="prefix"
                      className="custom-select form-control"
                      value={form.prefix}
                      onChange={handleChange}
                      required
                    >
                      <option value="">-- เลือกคำนำหน้า --</option>
                      {options.prefix.map((row) => (
                        <option key={row.prefix_id} value={String(row.prefix_id)}>
                          {row.prefix}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="col-md-4 mb-3">
                    <label htmlFor="gender" className="small font-weight-bold text-dark">
                      เพศ <span className="text-danger">*</span>
                    </label>
                    <select
                      name="gender"
                      id="gender"
                      className="custom-select form-control"
                      value={form.gender}
                      onChange={handleChange}
                      required
                    >
                      <option value="">-- เลือกเพศ --</option>
                      {options.gender.map((row) => (
                        <option key={row.gender_id || row.id} value={String(row.gender_id || row.id)}>
                          {row.gender}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="row">
                  <div className="col-md-6 mb-3">
                    <label htmlFor="name" className="small font-weight-bold text-dark">
                      ชื่อ <span className="text-danger">*</span>
                    </label>
                    <input
                      type="text"
                      className="form-control"
                      id="name"
                      name="name"
                      value={form.name}
                      onChange={handleChange}
                      required
                    />
                  </div>
                  <div className="col-md-6 mb-3">
                    <label htmlFor="lastname" className="small font-weight-bold text-dark">
                      นามสกุล <span className="text-danger">*</span>
                    </label>
                    <input
                      type="text"
                      className="form-control"
                      id="lastname"
                      name="lastname"
                      value={form.lastname}
                      onChange={handleChange}
                      required
                    />
                  </div>
                </div>

                <div className="row">
                  <div className="col-lg-6 mb-3">
                    <label className="small font-weight-bold text-dark d-block">
                      วัน/เดือน/ปีเกิด <span className="text-danger">*</span>
                    </label>
                    <ThaiDatePicker
                      id="birthday"
                      mode="birthday"
                      value={form.birthday || ''}
                      onChange={(val) => setForm((prev) => ({ ...prev, birthday: val }))}
                      required
                    />
                  </div>
                  <div className="col-lg-6 mb-3">
                    <label htmlFor="edu_level" className="small font-weight-bold text-dark">
                      วุฒิการศึกษาสูงสุด <span className="text-danger">*</span>
                    </label>
                    <select
                      name="edu_level"
                      id="edu_level"
                      className="custom-select form-control"
                      value={form.edu_level}
                      onChange={handleChange}
                      required
                    >
                      <option value="">-- เลือกวุฒิการศึกษาสูงสุด --</option>
                      {options.eduLevel.map((row) => (
                        <option key={row.educationlevel_id} value={String(row.educationlevel_id)}>
                          {row.educationlevel_name}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="row">
                  <div className="col-md-6 mb-2 mb-md-0">
                    <label htmlFor="phone" className="small font-weight-bold text-dark">
                      เบอร์โทรศัพท์ติดต่อ
                    </label>
                    <input
                      className="form-control"
                      type="tel"
                      id="phone"
                      name="phone"
                      value={form.phone}
                      onChange={handleChange}
                      placeholder="เช่น 0812345678"
                    />
                  </div>
                  <div className="col-md-6">
                    <label htmlFor="email" className="small font-weight-bold text-dark">
                      อีเมล (Email)
                    </label>
                    <input
                      className="form-control"
                      type="email"
                      id="email"
                      name="email"
                      value={form.email}
                      onChange={handleChange}
                      placeholder="example@school.ac.th"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Section 2: Affiliation & Position */}
            <div className="card border-0 shadow-sm mb-4" style={{ borderRadius: '14px' }}>
              <div className="card-header bg-white border-bottom py-3 px-4" style={{ borderRadius: '14px 14px 0 0' }}>
                <h5 className="font-weight-bold text-dark m-0">
                  <i className="fa-solid fa-building-columns text-primary mr-2"></i>สังกัดและตำแหน่งทางวิชาการ
                </h5>
              </div>
              <div className="card-body p-4">
                <div className="row">
                  <div className="col-md-4 mb-3">
                    <label htmlFor="persontype_id" className="small font-weight-bold text-dark">
                      ประเภทบุคลากร <span className="text-danger">*</span>
                    </label>
                    <select
                      name="persontype_id"
                      id="persontype_id"
                      className="custom-select form-control"
                      value={form.persontype_id}
                      onChange={handleChange}
                      required
                    >
                      <option value="">-- ประเภทบุคลากร --</option>
                      {options.personType.map((row) => (
                        <option key={row.persontype_id} value={String(row.persontype_id)}>
                          {row.persontype_name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="col-md-4 mb-3">
                    <label htmlFor="position_id" className="small font-weight-bold text-dark">
                      ตำแหน่ง <span className="text-danger">*</span>
                    </label>
                    <select
                      name="position_id"
                      id="position_id"
                      className="custom-select form-control"
                      value={form.position_id}
                      onChange={handleChange}
                      required
                    >
                      <option value="">-- เลือกตำแหน่ง --</option>
                      {options.position.map((row) => (
                        <option key={row.position_id} value={String(row.position_id)}>
                          {row.position_name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="col-md-4 mb-3">
                    <label htmlFor="academic_id" className="small font-weight-bold text-dark">
                      วิทยฐานะ <span className="text-danger">*</span>
                    </label>
                    <select
                      name="academic_id"
                      id="academic_id"
                      className="custom-select form-control"
                      value={form.academic_id}
                      onChange={handleChange}
                      required
                    >
                      <option value="">-- เลือกวิทยฐานะ --</option>
                      {options.academic.map((row) => (
                        <option key={row.academic_id} value={String(row.academic_id)}>
                          {row.academic_standing}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="row">
                  <div className="col-md-8">
                    <label htmlFor="school" className="small font-weight-bold text-dark">
                      สถานศึกษา / หน่วยงานสังกัด <span className="text-danger">*</span>
                    </label>
                    <SearchableSelect
                      id="school"
                      name="school"
                      options={schoolSelectOptions}
                      value={form.school}
                      onChange={(val) => setForm((prev) => ({ ...prev, school: val }))}
                      placeholder="-- ค้นหาหรือเลือกโรงเรียนสังกัด --"
                      searchPlaceholder="พิมพ์ชื่อโรงเรียนเพื่อค้นหา..."
                      required={!isDistrictPosition}
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Section 3: Teaching Assignment (Hidden for Executive/Supervisor roles) */}
            {!isNonTeaching && (
              <div className="card border-0 shadow-sm mb-4" style={{ borderRadius: '14px' }}>
                <div className="card-header bg-white border-bottom py-3 px-4" style={{ borderRadius: '14px 14px 0 0' }}>
                  <h5 className="font-weight-bold text-dark m-0">
                    <i className="fa-solid fa-chalkboard-user text-primary mr-2"></i>ข้อมูลการจัดการเรียนรู้
                  </h5>
                </div>
                <div className="card-body p-4">
                  <div className="row">
                    <div className="col-md-4 mb-3">
                      <label htmlFor="teach_subject" className="small font-weight-bold text-dark">
                        กลุ่มสาระการเรียนรู้ <span className="text-danger">*</span>
                      </label>
                      <select
                        name="teach_subject"
                        id="teach_subject"
                        className="custom-select form-control"
                        value={form.teach_subject}
                        onChange={handleChange}
                        required={!isNonTeaching}
                      >
                        <option value="">-- เลือกกลุ่มสาระ --</option>
                        {options.teachSubject.map((row) => (
                          <option key={row.teach_subject_id} value={String(row.teach_subject_id)}>
                            {row.teach_subject}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="col-md-4 mb-3">
                      <label htmlFor="headDepartment" className="small font-weight-bold text-dark">
                        บทบาทหัวหน้ากลุ่มสาระ
                      </label>
                      <select
                        name="headDepartment"
                        id="headDepartment"
                        className="custom-select form-control"
                        value={form.headDepartment}
                        onChange={handleChange}
                      >
                        <option value="0">ไม่ได้เป็นหัวหน้ากลุ่มสาระ</option>
                        <option value="1">เป็นหัวหน้ากลุ่มสาระการเรียนรู้</option>
                      </select>
                    </div>

                    <div className="col-md-4 mb-3">
                      <label htmlFor="teach_subject_name" className="small font-weight-bold text-dark">
                        รายวิชาที่ทำการสอน <span className="text-danger">*</span>
                      </label>
                      <input
                        className="form-control"
                        type="text"
                        id="teach_subject_name"
                        name="teach_subject_name"
                        value={form.teach_subject_name}
                        onChange={handleChange}
                        placeholder="เช่น วิทยาศาสตร์พื้นฐาน, ภาษาอังกฤษ"
                        required={!isNonTeaching}
                      />
                    </div>
                  </div>

                  <div>
                    <label className="small font-weight-bold text-dark d-block mb-2">
                      ระดับชั้นที่ทำการสอน <span className="text-muted font-weight-normal">(เลือกได้มากกว่า 1 ระดับชั้น)</span>
                    </label>
                    <div
                      className="border p-3 rounded bg-light d-flex flex-wrap"
                      style={{ gap: '10px 18px' }}
                    >
                      {options.gradeLevel.map((opt) => {
                        const gId = String(opt.grade_level_id);
                        const isChecked =
                          Array.isArray(form.teach_level) && form.teach_level.includes(gId);
                        return (
                          <div className="custom-control custom-checkbox" key={gId}>
                            <input
                              type="checkbox"
                              className="custom-control-input"
                              id={`edit_grade_${gId}`}
                              name="teach_level"
                              value={gId}
                              checked={isChecked}
                              onChange={handleChange}
                            />
                            <label
                              className="custom-control-label small font-weight-bold text-dark"
                              htmlFor={`edit_grade_${gId}`}
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

            {/* Action Bar */}
            <div className="d-flex justify-content-end align-items-center mb-4" style={{ gap: '10px' }}>
              <Link to="/" className="btn btn-outline-secondary px-4 font-weight-bold">
                ยกเลิก
              </Link>
              <button
                type="submit"
                className="btn btn-primary px-4 font-weight-bold shadow-sm"
                id="btn_submit"
                disabled={saving}
              >
                {saving ? (
                  <span>
                    <span className="spinner-border spinner-border-sm mr-2"></span>
                    กำลังบันทึก...
                  </span>
                ) : (
                  <span>
                    <i className="fa-solid fa-floppy-disk mr-2"></i>บันทึกการแก้ไขข้อมูล
                  </span>
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default EditProfile;
