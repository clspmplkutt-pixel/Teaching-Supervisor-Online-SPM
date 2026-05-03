import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import Swal from 'sweetalert2';
import { supabase } from '../supabaseClient';
import { useUserProfile } from '../hooks/useUserProfile';
import useSelect2 from '../hooks/useSelect2';
import { uploadToDrive } from '../utils/driveUpload';
import './SendPlan.css';

const normalizeThaiDate = (value) => {
  if (!value) return '';
  const raw = value.trim();
  if (raw.includes('/')) {
    const [d, m, y] = raw.split('/');
    if (!d || !m || !y) return raw;
    let year = parseInt(y, 10);
    if (year > 2400) year -= 543;
    return `${year}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
  }
  if (raw.includes('-')) {
    const [y, m, d] = raw.split('-');
    if (!y || !m || !d) return raw;
    let year = parseInt(y, 10);
    if (year > 2400) year -= 543;
    return `${year}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
  }
  return raw;
};

const getLocalTimestamp = () => {
  const dt = new Date();
  const pad = (n) => String(n).padStart(2, '0');
  return `${dt.getFullYear()}-${pad(dt.getMonth() + 1)}-${pad(dt.getDate())} ${pad(dt.getHours())}:${pad(dt.getMinutes())}:${pad(dt.getSeconds())}`;
};

const getFileTimestamp = () => {
  const dt = new Date();
  const pad = (n) => String(n).padStart(2, '0');
  return `${pad(dt.getDate())}${pad(dt.getMonth() + 1)}${dt.getFullYear()}${pad(dt.getHours())}${pad(dt.getMinutes())}${pad(dt.getSeconds())}`;
};

const SendPlan = () => {
  const navigate = useNavigate();
  const { profile, loading: profileLoading } = useUserProfile();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [file, setFile] = useState(null);
  const [autoComplete, setAutoComplete] = useState({ subjectCodes: [], subjectNames: [] });

  const [options, setOptions] = useState({
    teachSubject: [],
    gradeLevel: [],
    competency: [],
    ability21: [],
    desirable: [],
    learningModel: [],
    subjectTypes: [],
  });

  const [indicators, setIndicators] = useState({ mid: [], final: [] });
  const [config, setConfig] = useState({});
  const [lookups, setLookups] = useState({
    prefix: {},
    position: {},
    academic: {},
    school: {},
    teachSubject: {},
  });

  const [form, setForm] = useState({
    teach_subject_id: '',
    grade_level_id: '',
    subject_type: '01',
    subject_code: '',
    subject_name: '',
    subject_content: '',
    subject_name_plan: '',
    teach_date: '',
    teach_timestart: '',
    teach_timeend: '',
    teach_minute: '',
    learning_model: '',
    competency: [],
    ability21: [],
    desirable: [],
    objectives_knowledge: '',
    objectives_process: '',
    objectives_attribute: '',
    learning_outcomes: '',
    learning_content: '',
    learning_activities: '',
    instructional_media: '',
    Measurement_how: '',
    Measurement_tools: '',
    Measurement_scoring: '',
    Measurement_outcomes: '',
    indicators_mid: [],
    indicators_final: [],
  });

  // ประเภทวิชาที่ไม่ต้องมีตัวชี้วัดระหว่างทาง/ปลายทาง
  const SUBJECT_TYPES_NO_INDICATORS = ['02', '08', '09'];
  const needsIndicators = !SUBJECT_TYPES_NO_INDICATORS.includes(form.subject_type);

  useEffect(() => {
    let mounted = true;

    const loadData = async () => {
      setLoading(true);
      try {
        const [configRes, subjectRes, gradeRes, competencyRes, abilityRes, desirableRes, modelRes, prefixRes, positionRes, academicRes, schoolRes, teachSubjectRes, subjectTypeRes] = await Promise.all([
          supabase.from('tbl_config').select('config_name, config_value'),
          supabase.from('tbl_system_Teach_Subject').select('teach_subject_id, teach_subject').eq('teach_subject_status', '1').order('teach_subject_id', { ascending: true }),
          supabase.from('tbl_system_GradeLevel').select('grade_level_id, grade_level_name').eq('grade_level_status', '1').neq('grade_level_id', '499').order('grade_level_id', { ascending: true }),
          supabase.from('tbl_system_Competency').select('competency_id, competency_name').eq('competency_status', '1').order('competency_id', { ascending: true }),
          supabase.from('tbl_ability21').select('ability21_id, ability21_name_th').eq('ability21_status', '1').order('id', { ascending: true }),
          supabase.from('tbl_system_Desirable').select('desirable_id, desirable_name').eq('desirable_status', '1').order('desirable_id', { ascending: true }),
          supabase.from('tbl_learningModel').select('model_id, model_name').eq('model_status', '1').order('model_name', { ascending: true }),
          supabase.from('tbl_system_prefix').select('prefix_id, prefix'),
          supabase.from('tbl_system_PersonPositionType').select('position_id, position_name'),
          supabase.from('tbl_system_Academic_Standing').select('academic_id, academic_standing'),
          supabase.from('tbl_school').select('school_id, school_name'),
          supabase.from('tbl_system_Teach_Subject').select('teach_subject_id, teach_subject'),
          supabase.from('tbl_system_SubjectType').select('subjecttype_id, subjecttype_name').eq('subjecttype_status', '1').order('id', { ascending: true }),
        ]);

        const configMap = {};
        configRes.data?.forEach((c) => { configMap[c.config_name] = c.config_value; });

        const prefixMap = {};
        prefixRes.data?.forEach((p) => { prefixMap[p.prefix_id] = p.prefix; });
        const positionMap = {};
        positionRes.data?.forEach((p) => { positionMap[p.position_id] = p.position_name; });
        const academicMap = {};
        academicRes.data?.forEach((a) => { academicMap[a.academic_id] = a.academic_standing; });
        const schoolMap = {};
        schoolRes.data?.forEach((s) => { schoolMap[s.school_id] = s.school_name; });
        const teachSubjectMap = {};
        teachSubjectRes.data?.forEach((t) => { teachSubjectMap[t.teach_subject_id] = t.teach_subject; });

        if (mounted) {
          setConfig(configMap);
          setOptions({
            teachSubject: subjectRes.data || [],
            gradeLevel: gradeRes.data || [],
            competency: competencyRes.data || [],
            ability21: abilityRes.data || [],
            desirable: desirableRes.data || [],
            learningModel: modelRes.data || [],
            subjectTypes: subjectTypeRes.data || [],
          });
          setLookups({
            prefix: prefixMap,
            position: positionMap,
            academic: academicMap,
            school: schoolMap,
            teachSubject: teachSubjectMap,
          });
        }
      } catch (err) {
        console.error('SendPlan load error:', err);
      } finally {
        if (mounted) setLoading(false);
      }
    };

    loadData();

    return () => { mounted = false; };
  }, []);

  useEffect(() => {
    const $ = window.$;
    if (!$ || !$.fn || !$.fn.datepicker) return;
    const picker = $('#teach_date');
    if (picker.attr('type') === 'date') return;
    picker.datepicker({
      format: 'dd/mm/yyyy',
      autoclose: true,
      language: 'th-th',
      thaiyear: true,
    }).on('changeDate', function () {
      if (this.value) {
        const nativeInputValueSetter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set;
        if (nativeInputValueSetter) {
          nativeInputValueSetter.call(this, this.value);
        }
        this.dispatchEvent(new Event('input', { bubbles: true }));
      }
    });
    return () => {
      try { picker.datepicker('destroy'); } catch { /* noop */ }
    };
  }, []);

  useSelect2([
    loading,
    options.teachSubject.length,
    options.gradeLevel.length,
    options.competency.length,
    options.ability21.length,
    options.desirable.length,
  ]);

  // Prefill teach_subject from profile to match legacy PHP behavior
  useEffect(() => {
    if (!profile || !options.teachSubject.length) return;
    if (!form.teach_subject_id && profile.teach_subject) {
      setForm((prev) => ({ ...prev, teach_subject_id: String(profile.teach_subject) }));
    }
  }, [profile, options.teachSubject.length, form.teach_subject_id]);

  // Keep select2 UI in sync when state changes programmatically
  useEffect(() => {
    const $ = window.$;
    if (!$ || !$.fn || !$.fn.select2) return;
    $('#teach_subject_id').val(form.teach_subject_id || '').trigger('change.select2');
    $('#grade_level_id').val(form.grade_level_id || '').trigger('change.select2');
  }, [form.teach_subject_id, form.grade_level_id, options.teachSubject.length, options.gradeLevel.length]);

  useEffect(() => {
    const $ = window.$;
    if (!$) return;
    const $teach = $('#teach_subject_id');
    const $grade = $('#grade_level_id');
    const $competency = $('#competency');
    const $ability21 = $('[name="ability21"]');
    const $desirable = $('[name="desirable"]');

    const handleTeach = (e) => {
      const value = e.target?.value ?? '';
      setForm((prev) => ({ ...prev, teach_subject_id: value }));
    };
    const handleGrade = (e) => {
      const value = e.target?.value ?? '';
      setForm((prev) => ({ ...prev, grade_level_id: value }));
    };
    const handleCompetency = () => {
      const values = $competency.val() || [];
      setForm((prev) => ({ ...prev, competency: Array.isArray(values) ? values : [values] }));
    };
    const handleAbility21 = () => {
      const values = $ability21.val() || [];
      setForm((prev) => ({ ...prev, ability21: Array.isArray(values) ? values : [values] }));
    };
    const handleDesirable = () => {
      const values = $desirable.val() || [];
      setForm((prev) => ({ ...prev, desirable: Array.isArray(values) ? values : [values] }));
    };

    $teach.on('change', handleTeach);
    $grade.on('change', handleGrade);
    $competency.on('change', handleCompetency);
    $ability21.on('change', handleAbility21);
    $desirable.on('change', handleDesirable);

    return () => {
      $teach.off('change', handleTeach);
      $grade.off('change', handleGrade);
      $competency.off('change', handleCompetency);
      $ability21.off('change', handleAbility21);
      $desirable.off('change', handleDesirable);
    };
  }, []);

  useEffect(() => {
    let mounted = true;
    const loadSubjectHints = async () => {
      if (!profile?.people_id) return;
      const { data } = await supabase
        .from('tbl_sendplan')
        .select('subject_code, subject_name')
        .eq('people_id', profile.people_id);
      const subjectCodes = Array.from(new Set((data || []).map((row) => row.subject_code).filter(Boolean))).sort();
      const subjectNames = Array.from(new Set((data || []).map((row) => row.subject_name).filter(Boolean))).sort();
      if (mounted) setAutoComplete({ subjectCodes, subjectNames });
    };
    loadSubjectHints();
    return () => { mounted = false; };
  }, [profile]);

  const teachSubjectId = form.teach_subject_id;
  const gradeLevelId = form.grade_level_id;

  useEffect(() => {
    let mounted = true;

    const loadIndicators = async () => {
      if (!teachSubjectId || !gradeLevelId) {
        setIndicators({ mid: [], final: [] });
        return;
      }

      const fetchIndicators = async (gradeId) => {
        const { data, error } = await supabase
          .from('tbl_indicators')
          .select('indicators_name, indicator_group, indicators_details, indicator_id')
          .eq('teach_subject_id', teachSubjectId)
          .eq('grade_level_id', gradeId)
          .order('indicators_name', { ascending: true });
        if (error) {
          console.error('Indicators load error:', error);
        }
        return data || [];
      };

      let rows = await fetchIndicators(gradeLevelId);
      if (rows.length === 0) {
        rows = await fetchIndicators('499');
      }

      const mid = rows.filter((row) => String(row.indicator_id) === '1');
      const final = rows.filter((row) => String(row.indicator_id) === '2');

      if (mounted) setIndicators({ mid, final });
    };

    loadIndicators();

    return () => { mounted = false; };
  }, [teachSubjectId, gradeLevelId]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleMultiChange = (name, optionsList) => {
    const values = Array.from(optionsList).map((opt) => opt.value).filter(Boolean);
    setForm((prev) => ({ ...prev, [name]: values }));
  };

  const handleFileChange = (e) => {
    const selected = e.target.files?.[0] || null;
    setFile(selected);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!profile?.people_id) {
      Swal.fire('Error', 'ไม่พบข้อมูลผู้ใช้งาน', 'error');
      return;
    }
    if (!file) {
      Swal.fire('Error', 'กรุณาเลือกไฟล์แผนการสอน (PDF)', 'error');
      return;
    }
    if (!file.name.toLowerCase().endsWith('.pdf')) {
      Swal.fire('Error', 'ไฟล์ต้องเป็น PDF เท่านั้น', 'error');
      return;
    }
    if (file.size > 104857600) {
      Swal.fire('Error', 'ขนาดไฟล์ใหญ่กว่า 100MB', 'error');
      return;
    }

    setSaving(true);
    try {
      const planFilename = `${profile.people_id}_${getFileTimestamp()}.pdf`;
      const driveUrl = await uploadToDrive(file, { filename: planFilename });
      const eduYear = parseInt(config.EDUYEAR) || new Date().getFullYear() + 543;
      const eduTerm = parseInt(config.EDUROUND) || 1;
      const budgetYear = parseInt(config.BUDGET_YEAR) || eduYear;
      const teachDate = normalizeThaiDate(form.teach_date);
      const payload = {
        people_id: profile.people_id,
        school_code: profile.school,
        teach_subject_id: form.teach_subject_id,
        grade_level_id: form.grade_level_id,
        subject_type: form.subject_type,
        edu_year: eduYear,
        edu_term: eduTerm,
        budget_year: budgetYear,
        subject_code: form.subject_code,
        subject_name: form.subject_name,
        subject_content: form.subject_content,
        subject_name_plan: form.subject_name_plan,
        teach_date: teachDate || null,
        teach_timestart: form.teach_timestart,
        teach_timeend: form.teach_timeend,
        teach_minute: parseInt(form.teach_minute) || 0,
        learning_model: form.learning_model,
        competency: form.competency.join(','),
        ability21: form.ability21.join(','),
        desirable: form.desirable.join(','),
        learning_outcomes: form.learning_outcomes,
        learning_content: form.learning_content,
        learning_activities: form.learning_activities,
        instructional_media: form.instructional_media,
        indicators_mid: needsIndicators ? form.indicators_mid.join(',') : '',
        indicators_final: needsIndicators ? form.indicators_final.join(',') : '',
        measurement_how: form.Measurement_how,
        measurement_tools: form.Measurement_tools,
        measurement_scoring: form.Measurement_scoring,
        measurement_outcomes: form.Measurement_outcomes,
        objectives_knowledge: form.objectives_knowledge,
        objectives_process: form.objectives_process,
        objectives_attribute: form.objectives_attribute,
        plan_file: driveUrl,
        plan_senddate: getLocalTimestamp(),
        plan_status: '1',
        plan_clip: '',
        committee1: '',
        committee2: '',
        committee3: '',
        committee4: '',
        committee5: '',
      };

      const { error } = await supabase.from('tbl_sendplan').insert([payload]);
      if (error) throw error;

      Swal.fire({
        title: 'ส่งสำเร็จแล้ว',
        text: 'ระบบกำลังนำท่านกลับไปหน้าแรก',
        icon: 'success',
      }).then(() => {
        navigate('/statusplan');
      });
    } catch (err) {
      console.error(err);
      Swal.fire('Error', err.message || 'ไม่สามารถส่งแผนได้', 'error');
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
  if (!profile) {
    return <div className="alert alert-warning">ไม่พบข้อมูลผู้ใช้งาน</div>;
  }

  return (
    <div className="sendplan">
      <div className="row">
        <div className="col-12">
          <form onSubmit={handleSubmit} className="form-horizontal was-validated" autoComplete="off">
            <div className="card card-success">
              <div className="card-header">
                <h4 className="card-title">ข้อมูลผู้จัดทำแผน</h4>
              </div>
              <div className="card-body">
                <div className="row">
                  <div className="col-lg-6">
                    ชื่อผู้จัดทำแผน : <span className="text-success">{lookups.prefix[profile.prefix] || ''}{profile.name} {profile.lastname} ({profile.people_id})</span>
                  </div>
                  <div className="col-lg-6">
                    ตำแหน่ง : <span className="text-success">{lookups.position[profile.position_id] || ''} (วิทยฐานะ {lookups.academic[profile.academic_id] || ''})</span>
                  </div>
                </div>
                <div className="row mt-2">
                  <div className="col-lg-6">
                    โรงเรียน : <span className="text-success">{lookups.school[profile.school] || ''}</span>
                  </div>
                  <div className="col-lg-6">
                    กลุ่มสาระ : <span className="text-success">{lookups.teachSubject[profile.teach_subject] || ''}</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="card card-teal">
              <div className="card-header">
                <h4 className="card-title">กลุ่มสาระ/ระดับชั้น/ประเภทวิชา</h4>
              </div>
              <div className="card-body">
                <div className="row">
                  <div className="col-lg-4">
                    <div className="mb-3 mt-3">
                      <label htmlFor="teach_subject_id">กลุ่มสาระ :</label>
                      <select name="teach_subject_id" id="teach_subject_id" className="select2bs4" value={form.teach_subject_id} onChange={handleChange} style={{ width: '100%' }} required>
                        <option value=""></option>
                        {options.teachSubject.map((row) => (
                          <option key={row.teach_subject_id} value={row.teach_subject_id}>{row.teach_subject}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                  <div className="col-lg-4">
                    <div className="mb-3 mt-3">
                      <label htmlFor="grade_level_id">ระดับชั้นที่ทำการสอน :</label>
                      <select name="grade_level_id" id="grade_level_id" className="select2bs4" value={form.grade_level_id} onChange={handleChange} style={{ width: '100%' }} required>
                        <option value=""></option>
                        {options.gradeLevel.map((row) => (
                          <option key={row.grade_level_id} value={row.grade_level_id}>{row.grade_level_name}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                  <div className="col-lg-4">
                    <div className="mb-3 mt-3">
                      <label htmlFor="subject_type">ประเภทวิชา :</label>
                      <select name="subject_type" id="subject_type" className="form-control" value={form.subject_type} onChange={handleChange} required>
                        {options.subjectTypes.map((row) => (
                          <option key={row.subjecttype_id} value={row.subjecttype_id}>{row.subjecttype_name}</option>
                        ))}
                      </select>
                      {!needsIndicators && (
                        <small className="text-info">
                          <i className="fa-solid fa-info-circle"></i> ประเภทนี้ไม่จำเป็นต้องระบุตัวชี้วัดระหว่างทาง/ปลายทาง
                        </small>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="card card-info">
              <div className="card-header">
                <h4 className="card-title">ข้อมูลแผนการสอน</h4>
              </div>
              <div className="card-body">
                <div className="row">
                  <div className="col-lg-1">
                    <div className="mb-3 mt-3">
                      <label htmlFor="subject_code">รหัสวิชา :</label>
                      <input list="subject_code_list" type="text" id="subject_code" name="subject_code" className="form-control" placeholder="รหัสวิชา" value={form.subject_code} onChange={handleChange} required />
                      <datalist id="subject_code_list">
                        {autoComplete.subjectCodes.map((code) => (
                          <option key={code} value={code} />
                        ))}
                      </datalist>
                    </div>
                  </div>
                  <div className="col-lg-4">
                    <div className="mb-3 mt-3">
                      <label htmlFor="subject_name">ชื่อวิชา :</label>
                      <input list="subject_name_list" type="text" id="subject_name" name="subject_name" className="form-control" placeholder="ชื่อวิชา" value={form.subject_name} onChange={handleChange} required />
                      <datalist id="subject_name_list">
                        {autoComplete.subjectNames.map((name) => (
                          <option key={name} value={name} />
                        ))}
                      </datalist>
                    </div>
                  </div>
                  <div className="col-lg-2">
                    <div className="mb-3 mt-3">
                      <label htmlFor="subject_content">หน่วยการเรียนรู้ :</label>
                      <input type="text" id="subject_content" name="subject_content" className="form-control" placeholder="หน่วยการเรียนรู้" value={form.subject_content} onChange={handleChange} required />
                    </div>
                  </div>
                  <div className="col-lg-5">
                    <div className="mb-3 mt-3">
                      <label htmlFor="subject_name_plan">ชื่อแผนการสอน :</label>
                      <input type="text" id="subject_name_plan" name="subject_name_plan" className="form-control" placeholder="ชื่อแผนการสอน" value={form.subject_name_plan} onChange={handleChange} required />
                    </div>
                  </div>
                </div>
                <div className="row">
                  <div className="col-lg-3">
                    <div className="mb-3 mt-3">
                      <label htmlFor="teach_date">วันที่ทำการสอน :</label>
                      <input className="form-control datethai" type="date" id="teach_date" name="teach_date" value={form.teach_date} onChange={handleChange} required />
                    </div>
                  </div>
                  <div className="col-lg-3">
                    <div className="mb-3 mt-3">
                      <label htmlFor="teach_timestart">เริ่มเวลา :</label>
                      <input type="time" id="teach_timestart" name="teach_timestart" className="form-control" min="07:00" max="17:00" value={form.teach_timestart} onChange={handleChange} required />
                    </div>
                  </div>
                  <div className="col-lg-3">
                    <div className="mb-3 mt-3">
                      <label htmlFor="teach_timeend">เสร็จเวลา :</label>
                      <input type="time" id="teach_timeend" name="teach_timeend" className="form-control" min="07:00" max="17:00" value={form.teach_timeend} onChange={handleChange} required />
                    </div>
                  </div>
                  <div className="col-lg-3">
                    <div className="mb-3 mt-3">
                      <label htmlFor="teach_minute">เวลาที่ใช้ในการสอน (จำนวนนาที) :</label>
                      <input type="number" id="teach_minute" name="teach_minute" className="form-control" min="0" max="240" step="1" value={form.teach_minute} onChange={handleChange} required />
                    </div>
                  </div>
                </div>
                <div className="row">
                  <div className="col-lg-6">
                    <div className="mb-3 mt-3">
                      <label htmlFor="learning_model">วิธีการสอน :</label>
                      <input list="learning_model_list" type="text" id="learning_model" name="learning_model" className="form-control" placeholder="วิธีการสอน" value={form.learning_model} onChange={handleChange} required />
                      <datalist id="learning_model_list">
                        {options.learningModel.map((row) => (
                          <option key={row.model_id} value={row.model_name} />
                        ))}
                      </datalist>
                    </div>
                  </div>
                  <div className="col-lg-6">
                    <div className="mb-3 mt-3">
                      <label htmlFor="competency">สมรรถนะ :</label>
                      <select name="competency" id="competency" className="custom-select select2bs4" multiple data-placeholder="สมรรถนะ" value={form.competency} onChange={(e) => handleMultiChange('competency', e.target.selectedOptions)} required>
                        {options.competency.map((row) => (
                          <option key={row.competency_id} value={row.competency_id}>{row.competency_id} : {row.competency_name}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                </div>
                <div className="row">
                  <div className="col-lg-6">
                    <div className="mb-3 mt-3">
                      <label htmlFor="ability21">ทักษะในศตวรรษที่ 21 :</label>
                      <select className="select2bs4" multiple name="ability21" data-placeholder="ทักษะในศตวรรษที่ 21" value={form.ability21} onChange={(e) => handleMultiChange('ability21', e.target.selectedOptions)} style={{ width: '100%' }}>
                        {options.ability21.map((row) => (
                          <option key={row.ability21_id} value={row.ability21_id}>{row.ability21_id} : {row.ability21_name_th}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                  <div className="col-lg-6">
                    <div className="mb-3 mt-3">
                      <label htmlFor="desirable">คุณลักษณะอันพึงประสงค์ :</label>
                      <select className="select2bs4" multiple name="desirable" data-placeholder="คุณลักษณะอันพึงประสงค์" value={form.desirable} onChange={(e) => handleMultiChange('desirable', e.target.selectedOptions)} style={{ width: '100%' }}>
                        {options.desirable.map((row) => (
                          <option key={row.desirable_id} value={row.desirable_id}>{row.desirable_id} : {row.desirable_name}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                </div>
                <hr />
                <div className="row">
                  <div className="col-lg-12">
                    <div className="card">
                      <div className="card-header">
                        <h4 className="card-title">จุดประสงค์การเรียนรู้</h4>
                      </div>
                      <div className="card-body">
                        <div className="row">
                          <div className="col-lg-12">
                            <div className="mb-3 mt-3">
                              <label htmlFor="objectives_knowledge">1. ด้านความรู้ (K) :</label>
                              <textarea className="form-control notemini" name="objectives_knowledge" id="objectives_knowledge" rows="6" value={form.objectives_knowledge} onChange={handleChange}></textarea>
                            </div>
                          </div>
                          <div className="col-lg-12">
                            <div className="mb-3 mt-3">
                              <label htmlFor="objectives_process">2. ด้านทักษะ/กระบวนการ (P) :</label>
                              <textarea className="form-control notemini" name="objectives_process" id="objectives_process" rows="6" value={form.objectives_process} onChange={handleChange}></textarea>
                            </div>
                          </div>
                          <div className="col-lg-12">
                            <div className="mb-3 mt-3">
                              <label htmlFor="objectives_attribute">3. ด้านคุณลักษณะ (A) :</label>
                              <textarea className="form-control notemini" name="objectives_attribute" id="objectives_attribute" rows="6" value={form.objectives_attribute} onChange={handleChange}></textarea>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="row">
                  <div className="col-lg-6">
                    <div className="mb-3 mt-3">
                      <label htmlFor="learning_outcomes">มาตรฐานการเรียนรู้ ตัวชี้วัด/ผลการเรียนรู้ :</label>
                      <textarea className="form-control notemini" name="learning_outcomes" id="learning_outcomes" rows="6" value={form.learning_outcomes} onChange={handleChange}></textarea>
                    </div>
                  </div>
                  <div className="col-lg-6">
                    <div className="mb-3 mt-3">
                      <label htmlFor="learning_content">สาระการเรียนรู้ :</label>
                      <textarea className="form-control notemini" name="learning_content" id="learning_content" rows="6" value={form.learning_content} onChange={handleChange}></textarea>
                    </div>
                  </div>
                </div>

                <div className="row">
                  <div className="col-lg-6">
                    <div className="mb-3 mt-3">
                      <label htmlFor="learning_activities">ขั้นตอนการจัดกิจกรรมการเรียนรู้/เวลา (นาที) :</label>
                      <textarea className="form-control notemini" name="learning_activities" id="learning_activities" rows="6" value={form.learning_activities} onChange={handleChange}></textarea>
                    </div>
                  </div>
                  <div className="col-lg-6">
                    <div className="mb-3 mt-3">
                      <label htmlFor="instructional_media">สื่อ/แหล่งเรียนรู้ :</label>
                      <textarea className="form-control notemini" name="instructional_media" id="instructional_media" rows="6" value={form.instructional_media} onChange={handleChange}></textarea>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="card card-navy">
              <div className="card-header">
                <h4 className="card-title">การวัดผลประเมินผล</h4>
              </div>
              <div className="card-body">
                <div className="row">
                  <div className="col-lg-6">
                    <div className="mb-3 mt-3">
                      <label htmlFor="Measurement_how">1. วิธีการวัดและประเมินผล :</label>
                      <textarea className="form-control notemini" name="Measurement_how" id="Measurement_how" rows="6" value={form.Measurement_how} onChange={handleChange}></textarea>
                    </div>
                  </div>
                  <div className="col-lg-6">
                    <div className="mb-3 mt-3">
                      <label htmlFor="Measurement_tools">2. เครื่องมือวัดและประเมินผล :</label>
                      <textarea className="form-control notemini" name="Measurement_tools" id="Measurement_tools" rows="6" value={form.Measurement_tools} onChange={handleChange}></textarea>
                    </div>
                  </div>
                  <div className="col-lg-6">
                    <div className="mb-3 mt-3">
                      <label htmlFor="Measurement_scoring">3. เกณฑ์การให้คะแนน :</label>
                      <textarea className="form-control notemini" name="Measurement_scoring" id="Measurement_scoring" rows="6" value={form.Measurement_scoring} onChange={handleChange}></textarea>
                    </div>
                  </div>
                  <div className="col-lg-6">
                    <div className="mb-3 mt-3">
                      <label htmlFor="Measurement_outcomes">4. การตัดสินผลการเรียนรู้ :</label>
                      <textarea className="form-control notemini" name="Measurement_outcomes" id="Measurement_outcomes" rows="6" value={form.Measurement_outcomes} onChange={handleChange}></textarea>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {teachSubjectId && gradeLevelId && needsIndicators && (
              <div className="card card-pink">
                <div className="card-header">
                  <h4 className="card-title">ตัวชี้วัดระหว่างทาง</h4>
                </div>
                <div className="card-body">
                  <div className="row">
                    {indicators.mid.length === 0 && (
                      <div className="col-12 text-danger">ไม่พบตัวชี้วัดระหว่างทาง</div>
                    )}
                    {indicators.mid.map((ind, idx) => (
                      <div className="col-lg-4" key={`mid-${idx}`}>
                        <div className="mb-3 mt-3">
                          <input type="checkbox" name="indicators_mid" value={ind.indicators_name} onChange={(e) => {
                            const value = e.target.value;
                            setForm((prev) => {
                              const next = new Set(prev.indicators_mid);
                              if (e.target.checked) next.add(value); else next.delete(value);
                              return { ...prev, indicators_mid: Array.from(next) };
                            });
                          }} /> {ind.indicators_name} ({ind.indicator_group}) : {ind.indicators_details}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {teachSubjectId && gradeLevelId && needsIndicators && (
              <div className="card card-purple">
                <div className="card-header">
                  <h4 className="card-title">ตัวชี้วัดปลายทาง</h4>
                </div>
                <div className="card-body">
                  <div className="row">
                    {indicators.final.length === 0 && (
                      <div className="col-12 text-danger">ไม่พบตัวชี้วัดปลายทาง</div>
                    )}
                    {indicators.final.map((ind, idx) => (
                      <div className="col-lg-4" key={`final-${idx}`}>
                        <div className="mb-3 mt-3">
                          <input type="checkbox" name="indicators_final" value={ind.indicators_name} onChange={(e) => {
                            const value = e.target.value;
                            setForm((prev) => {
                              const next = new Set(prev.indicators_final);
                              if (e.target.checked) next.add(value); else next.delete(value);
                              return { ...prev, indicators_final: Array.from(next) };
                            });
                          }} /> {ind.indicators_name} ({ind.indicator_group}) : {ind.indicators_details}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {!needsIndicators && (
              <div className="card card-warning">
                <div className="card-header">
                  <h4 className="card-title"><i className="fa-solid fa-circle-info"></i> หมายเหตุ</h4>
                </div>
                <div className="card-body">
                  <div className="alert alert-info mb-0">
                    <i className="fa-solid fa-info-circle"></i>&nbsp;
                    รายวิชาประเภท <strong>{options.subjectTypes.find(t => t.subjecttype_id === form.subject_type)?.subjecttype_name || form.subject_type}</strong> ไม่จำเป็นต้องระบุตัวชี้วัดระหว่างทาง และตัวชี้วัดปลายทาง
                    <br />สามารถระบุ <strong>ผลการเรียนรู้</strong> ได้ในช่อง "มาตรฐานการเรียนรู้ ตัวชี้วัด/ผลการเรียนรู้" ด้านบนแทน
                  </div>
                </div>
              </div>
            )}

            <div className="card card-olive">
              <div className="card-header">
                <h4 className="card-title text-white">แนบไฟล์แผนการสอน :</h4>
              </div>
              <div className="card-body">
                <input type="file" name="plan_file" id="plan_file" accept="application/pdf" onChange={handleFileChange} required />
              </div>
              <div className="card-footer text-center">
                <button type="submit" className="btn btn-success" id="btn_submit" disabled={saving}>
                  <i className="fa-regular fa-paper-plane"></i> ส่งแผนการสอน
                </button>
                <Link to="/" className="btn btn-danger ml-2">
                  <i className="fa-solid fa-ban"></i> ยกเลิก
                </Link>
              </div>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default SendPlan;
