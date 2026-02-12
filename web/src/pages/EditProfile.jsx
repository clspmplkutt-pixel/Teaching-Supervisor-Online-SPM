import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import Swal from 'sweetalert2';
import { supabase } from '../supabaseClient';
import { useUserProfile } from '../hooks/useUserProfile';

const isValidPeopleId = (value) => /^\d{13}$/.test(value || '');

const EditProfile = () => {
  const { profile, loading: profileLoading } = useUserProfile();
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
    teach_level: '',
  });

  const peopleIdReadOnly = useMemo(() => {
    if (!profile?.people_id) return false;
    return isValidPeopleId(profile.people_id);
  }, [profile]);

  useEffect(() => {
    let mounted = true;

    const loadOptions = async () => {
      setLoading(true);
      try {
        const [prefixRes, genderRes, eduRes, personRes, positionRes, academicRes, schoolRes, subjectRes, gradeRes] = await Promise.all([
          supabase.from('tbl_system_prefix').select('prefix_id, prefix').eq('prefix_status', '1'),
          supabase.from('tbl_system_gender').select('gender_id, gender'),
          supabase.from('tbl_system_EducationLevel').select('educationlevel_id, educationlevel_name').eq('educationlevel_status', '1'),
          supabase.from('tbl_system_PersonType').select('persontype_id, persontype_name').eq('persontype_status', '1'),
          supabase.from('tbl_system_PersonPositionType').select('position_id, position_name').eq('position_status', '1'),
          supabase.from('tbl_system_Academic_Standing').select('academic_id, academic_standing').eq('academic_status', '1'),
          supabase.from('tbl_school').select('school_id, school_name').order('school_name', { ascending: true }),
          supabase.from('tbl_system_Teach_Subject').select('teach_subject_id, teach_subject').eq('teach_subject_status', '1'),
          supabase.from('tbl_system_GradeLevel').select('grade_level_id, grade_level_name').eq('grade_level_status', '1').neq('grade_level_id', '499'),
        ]);

        if (!mounted) return;
        setOptions({
          prefix: prefixRes.data || [],
          gender: genderRes.data || [],
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
    return () => { mounted = false; };
  }, []);

  useEffect(() => {
    if (!profile) return;
    setForm((prev) => ({
      ...prev,
      people_id: profile.people_id || '',
      prefix: profile.prefix || '',
      name: profile.name || '',
      lastname: profile.lastname || '',
      persontype_id: profile.persontype_id || '',
      position_id: profile.position_id || '',
      academic_id: profile.academic_id || '',
      gender: profile.gender || '',
      birthday: profile.birthday || '',
      school: profile.school || '',
      edu_level: profile.edu_level || '',
      headDepartment: profile.headDepartment ?? '0',
      teach_subject: profile.teach_subject || '',
      teach_subject_name: profile.teach_subject_name || '',
      teach_level: profile.teach_level || '',
      phone: profile.phone || '',
      email: profile.email || '',
    }));
  }, [profile]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.people_id) {
      Swal.fire('Error', 'กรุณากรอกเลขประจำตัวประชาชน', 'error');
      return;
    }

    setSaving(true);
    try {
      const { error } = await supabase
        .from('tbl_Users')
        .update({
          people_id: form.people_id,
          prefix: form.prefix,
          name: form.name,
          lastname: form.lastname,
          persontype_id: form.persontype_id,
          position_id: form.position_id,
          academic_id: form.academic_id,
          gender: form.gender,
          birthday: form.birthday,
          school: form.school,
          edu_level: form.edu_level,
          headDepartment: form.headDepartment,
          chairman: '0',
          teach_subject: form.teach_subject,
          teach_subject_name: form.teach_subject_name,
          teach_level: form.teach_level,
          phone: form.phone,
          email: form.email,
          lastupdate: new Date().toISOString(),
        })
        .eq('people_id', profile.people_id);

      if (error) throw error;

      Swal.fire('สำเร็จ', 'แก้ไขข้อมูลสำเร็จ', 'success');
    } catch (err) {
      console.error(err);
      Swal.fire('Error', 'ไม่สามารถแก้ไขข้อมูลได้', 'error');
    } finally {
      setSaving(false);
    }
  };

  if (profileLoading || loading) {
    return (
      <div className="text-center p-4">
        <div className="spinner-border text-primary" role="status"></div>
        <p className="mt-2">กำลังโหลดข้อมูล...</p>
      </div>
    );
  }

  return (
    <div className="row">
      <div className="col-12">
        <form onSubmit={handleSubmit}>
          <div className="card card-success">
            <div className="card-header">
              <h4 className="card-title">แก้ไขข้อมูล</h4>
            </div>
            <div className="card-body">
              <div className="mb-3 mt-3">
                <label htmlFor="people_id">เลขประจำตัวประชาชน **</label>
                <input
                  type="text"
                  className="form-control"
                  id="people_id"
                  name="people_id"
                  value={form.people_id}
                  onChange={handleChange}
                  readOnly={peopleIdReadOnly}
                  required
                />
              </div>

              <div className="row">
                <div className="col-lg-2">
                  <div className="mb-3 mt-3">
                    <label htmlFor="prefix">คำนำหน้า</label>
                    <select name="prefix" id="prefix" className="custom-select select2bs4" value={form.prefix} onChange={handleChange} required>
                      <option value="">คำนำหน้า</option>
                      {options.prefix.map((row) => (
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
                      {options.gender.map((row) => (
                        <option key={row.gender_id} value={row.gender_id}>{row.gender}</option>
                      ))}
                    </select>
                  </div>
                </div>
                <div className="col-lg-4">
                  <div className="mb-3 mt-3">
                    <label htmlFor="birthday">วันเกิด</label>
                    <input className="form-control" type="date" id="birthday" name="birthday" value={form.birthday || ''} onChange={handleChange} required />
                  </div>
                </div>
                <div className="col-lg-4">
                  <div className="mb-3 mt-3">
                    <label htmlFor="edu_level">วุฒิการศึกษาสูงสุด</label>
                    <select name="edu_level" id="edu_level" className="custom-select select2bs4" value={form.edu_level} onChange={handleChange} required>
                      <option value="">วุฒิการศึกษาสูงสุด</option>
                      {options.eduLevel.map((row) => (
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
                    <input className="form-control" type="text" id="phone" name="phone" value={form.phone} onChange={handleChange} placeholder="เบอร์โทรศัพท์" />
                  </div>
                </div>
                <div className="col-lg-6">
                  <div className="mb-3 mt-3">
                    <label htmlFor="email">Email</label>
                    <input className="form-control" type="email" id="email" name="email" value={form.email} onChange={handleChange} placeholder="E-mail" />
                  </div>
                </div>
              </div>

              <div className="row">
                <div className="col-lg-4">
                  <div className="mb-3 mt-3">
                    <label htmlFor="persontype_id">ประเภทบุคลากร</label>
                    <select name="persontype_id" id="persontype_id" className="custom-select select2bs4" value={form.persontype_id} onChange={handleChange} required>
                      <option value="">ประเภทบุคลากร</option>
                      {options.personType.map((row) => (
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
                      {options.position.map((row) => (
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
                      {options.academic.map((row) => (
                        <option key={row.academic_id} value={row.academic_id}>{row.academic_standing}</option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>

              <div className="row">
                <div className="col-lg-4">
                  <div className="mb-3 mt-3">
                    <label htmlFor="school">โรงเรียน</label>
                    <select name="school" id="school" className="custom-select select2bs4" value={form.school} onChange={handleChange} required>
                      <option value="">โรงเรียน</option>
                      {options.school.map((row) => (
                        <option key={row.school_id} value={row.school_id}>{row.school_name}</option>
                      ))}
                    </select>
                  </div>
                </div>
                <div className="col-lg-4">
                  <div className="mb-3 mt-3">
                    <label htmlFor="teach_subject">กลุ่มสาระ</label>
                    <select name="teach_subject" id="teach_subject" className="custom-select select2bs4" value={form.teach_subject} onChange={handleChange} required>
                      <option value="">กลุ่มสาระ</option>
                      {options.teachSubject.map((row) => (
                        <option key={row.teach_subject_id} value={row.teach_subject_id}>{row.teach_subject}</option>
                      ))}
                    </select>
                  </div>
                </div>
                <div className="col-lg-4">
                  <div className="mb-3 mt-3">
                    <label htmlFor="headDepartment">หัวหน้ากลุ่มสาระ</label>
                    <select name="headDepartment" id="headDepartment" className="custom-select select2bs4" value={form.headDepartment} onChange={handleChange} required>
                      <option value="0">ไม่ได้เป็นหัวหน้ากลุ่มสาระ</option>
                      <option value="1">เป็นหัวหน้ากลุ่มสาระ</option>
                    </select>
                  </div>
                </div>
              </div>

              <div className="row">
                <div className="col-lg-4">
                  <div className="mb-3 mt-3">
                    <label htmlFor="teach_subject_name">วิชาที่ทำการสอน</label>
                    <input className="form-control" type="text" id="teach_subject_name" name="teach_subject_name" value={form.teach_subject_name} onChange={handleChange} placeholder="วิชาที่ทำการสอน" required />
                  </div>
                </div>
                <div className="col-lg-4">
                  <div className="mb-3 mt-3">
                    <label htmlFor="teach_level">ระดับชั้นที่ทำการสอน</label>
                    <select name="teach_level" id="teach_level" className="custom-select select2bs4" value={form.teach_level} onChange={handleChange} required>
                      <option value="">ระดับชั้นที่ทำการสอน</option>
                      {options.gradeLevel.map((row) => (
                        <option key={row.grade_level_id} value={row.grade_level_id}>{row.grade_level_name}</option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>
            </div>
            <div className="card-footer text-center">
              <button type="submit" className="btn btn-success" id="btn_submit" disabled={saving}>
                <i className="fa-solid fa-user-pen"></i> แก้ไขข้อมูล
              </button>
              <Link to="/userteacher" className="btn btn-danger ml-2">
                <i className="fa-solid fa-ban"></i> ยกเลิก
              </Link>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};

export default EditProfile;
