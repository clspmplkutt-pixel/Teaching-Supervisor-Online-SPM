import React, { useEffect, useState, useMemo } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import Swal from 'sweetalert2';
import { supabase } from '../supabaseClient';
import { useUserProfile } from '../hooks/useUserProfile';
import useSelect2 from '../hooks/useSelect2';
import { uploadToDrive } from '../utils/driveUpload';
import { showToast } from '../utils/toast';
import { generateTeacherToDirectorMessage, showLineShareDialog } from '../utils/lineNotifyHelper';
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
  const location = useLocation();
  const query = useMemo(() => new URLSearchParams(location.search), [location.search]);
  const planid = query.get('planid');

  const { profile, loading: profileLoading } = useUserProfile();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [file, setFile] = useState(null);
  const [autoComplete, setAutoComplete] = useState({ subjectCodes: [], subjectNames: [] });
  const [existingPlanFile, setExistingPlanFile] = useState('');
  const [existingPlanStatus, setExistingPlanStatus] = useState('1');

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

  // Smart 4-Step Wizard State
  const [currentStep, setCurrentStep] = useState(1);

  const WIZARD_STEPS = [
    { id: 1, title: 'ข้อมูลวิชา & เวลาสอน', subtitle: 'กลุ่มสาระ, ชั้น, เวลา', icon: 'fa-book-open' },
    { id: 2, title: 'จุดประสงค์ & สาระ (K-P-A)', subtitle: 'K-P-A, กิจกรรม', icon: 'fa-bullseye' },
    { id: 3, title: 'สมรรถนะ & วัดผล', subtitle: 'สมรรถนะ, การประเมิน', icon: 'fa-clipboard-check' },
    { id: 4, title: 'ตัวชี้วัด & แนบไฟล์', subtitle: 'ตัวชี้วัด, ส่งแผน PDF', icon: 'fa-file-arrow-up' },
  ];

  // Draft & Autosave state
  const [draftInfo, setDraftInfo] = useState(null);
  const [isDraftDismissed, setIsDraftDismissed] = useState(false);
  const [lastSavedTime, setLastSavedTime] = useState('');

  const draftKey = profile?.people_id ? `lmss_sendplan_draft_${profile.people_id}` : null;

  // Check existing draft on mount (only for new plan)
  useEffect(() => {
    if (!draftKey || planid) return;
    try {
      const savedRaw = localStorage.getItem(draftKey);
      if (savedRaw) {
        const parsed = JSON.parse(savedRaw);
        if (parsed && parsed.form) {
          setDraftInfo(parsed);
        }
      }
    } catch (e) {
      console.warn('Failed to read draft', e);
    }
  }, [draftKey, planid]);

  // Debounced autosave
  useEffect(() => {
    if (!draftKey || planid || loading) return;
    const hasData = form.subject_code || form.subject_name || form.subject_name_plan || form.subject_content;
    if (!hasData) return;

    const timer = setTimeout(() => {
      try {
        const payload = {
          form,
          savedAt: new Date().toISOString(),
        };
        localStorage.setItem(draftKey, JSON.stringify(payload));
        const dt = new Date();
        setLastSavedTime(`${String(dt.getHours()).padStart(2, '0')}:${String(dt.getMinutes()).padStart(2, '0')}:${String(dt.getSeconds()).padStart(2, '0')}`);
      } catch (e) {
        console.warn('Autosave failed', e);
      }
    }, 1200);

    return () => clearTimeout(timer);
  }, [form, draftKey, planid, loading]);

  const handleRestoreDraft = () => {
    if (draftInfo?.form) {
      setForm((prev) => ({
        ...prev,
        ...draftInfo.form,
      }));
      setIsDraftDismissed(true);
      showToast('กู้คืนข้อมูลร่างเรียบร้อยแล้ว');
    }
  };

  const handleDiscardDraft = () => {
    if (draftKey) {
      localStorage.removeItem(draftKey);
    }
    setDraftInfo(null);
    setIsDraftDismissed(true);
    setLastSavedTime('');
    setForm({
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
    showToast('ล้างข้อมูลร่างเรียบร้อยแล้ว', 'info');
  };

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
    $('#competency').val(form.competency || []).trigger('change.select2');
    $('[name="ability21"]').val(form.ability21 || []).trigger('change.select2');
    $('[name="desirable"]').val(form.desirable || []).trigger('change.select2');
  }, [
    form.teach_subject_id,
    form.grade_level_id,
    form.competency,
    form.ability21,
    form.desirable,
    options.teachSubject.length,
    options.gradeLevel.length,
    options.competency.length,
    options.ability21.length,
    options.desirable.length,
  ]);

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

  useEffect(() => {
    if (!planid) return;
    let mounted = true;
    const fetchExistingPlan = async () => {
      try {
        const { data, error } = await supabase
          .from('tbl_sendplan')
          .select('*')
          .eq('planid', planid)
          .maybeSingle();
        if (error) throw error;
        if (data && mounted) {
          setExistingPlanFile(data.plan_file || '');
          setExistingPlanStatus(data.plan_status || '1');
          setForm({
            teach_subject_id: data.teach_subject_id ? String(data.teach_subject_id) : '',
            grade_level_id: data.grade_level_id ? String(data.grade_level_id) : '',
            subject_type: data.subject_type || '01',
            subject_code: data.subject_code || '',
            subject_name: data.subject_name || '',
            subject_content: data.subject_content || '',
            subject_name_plan: data.subject_name_plan || '',
            teach_date: data.teach_date || '',
            teach_timestart: data.teach_timestart || '',
            teach_timeend: data.teach_timeend || '',
            teach_minute: data.teach_minute ? String(data.teach_minute) : '',
            learning_model: data.learning_model || '',
            competency: data.competency ? data.competency.split(',') : [],
            ability21: data.ability21 ? data.ability21.split(',') : [],
            desirable: data.desirable ? data.desirable.split(',') : [],
            objectives_knowledge: data.objectives_knowledge || '',
            objectives_process: data.objectives_process || '',
            objectives_attribute: data.objectives_attribute || '',
            learning_outcomes: data.learning_outcomes || '',
            learning_content: data.learning_content || '',
            learning_activities: data.learning_activities || '',
            instructional_media: data.instructional_media || '',
            Measurement_how: data.measurement_how || '',
            Measurement_tools: data.measurement_tools || '',
            Measurement_scoring: data.measurement_scoring || '',
            Measurement_outcomes: data.measurement_outcomes || '',
            indicators_mid: data.indicators_mid ? data.indicators_mid.split(',') : [],
            indicators_final: data.indicators_final ? data.indicators_final.split(',') : [],
          });
        }
      } catch (err) {
        console.error('Error fetching existing plan:', err);
        Swal.fire('Error', 'ไม่สามารถโหลดข้อมูลแผนการสอนเดิมได้', 'error');
      }
    };
    fetchExistingPlan();
    return () => { mounted = false; };
  }, [planid]);

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

  // Adjust Select2 width after switching steps
  useEffect(() => {
    const $ = window.$;
    if (!$ || !$.fn || !$.fn.select2) return;
    const timer = setTimeout(() => {
      $('.select2bs4').each(function () {
        if ($(this).data('select2')) {
          $(this).trigger('change.select2');
        }
      });
    }, 60);
    return () => clearTimeout(timer);
  }, [currentStep]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => {
      const updated = { ...prev, [name]: value };
      if ((name === 'teach_timestart' || name === 'teach_timeend') && updated.teach_timestart && updated.teach_timeend) {
        const [sh, sm] = updated.teach_timestart.split(':').map(Number);
        const [eh, em] = updated.teach_timeend.split(':').map(Number);
        const diff = (eh * 60 + em) - (sh * 60 + sm);
        if (diff > 0 && (!prev.teach_minute || prev.teach_minute === '0')) {
          updated.teach_minute = String(diff);
        }
      }
      return updated;
    });
  };

  const handleAutoCalcMinutes = () => {
    if (!form.teach_timestart || !form.teach_timeend) {
      showToast('กรุณาระบุเวลาเริ่มและเวลาเสร็จก่อนคำนวณ', 'info');
      return;
    }
    const [sh, sm] = form.teach_timestart.split(':').map(Number);
    const [eh, em] = form.teach_timeend.split(':').map(Number);
    const diff = (eh * 60 + em) - (sh * 60 + sm);
    if (diff > 0) {
      setForm((prev) => ({ ...prev, teach_minute: String(diff) }));
      showToast(`คำนวณเวลาสอนได้ ${diff} นาที`, 'success');
    } else {
      showToast('เวลาเสร็จต้องมากกว่าเวลาเริ่มสอน', 'warning');
    }
  };

  const validateStep = (stepNumber) => {
    if (stepNumber === 1) {
      if (!form.teach_subject_id) {
        showToast('กรุณาเลือกกลุ่มสาระการเรียนรู้', 'warning');
        return false;
      }
      if (!form.grade_level_id) {
        showToast('กรุณาเลือกระดับชั้นที่ทำการสอน', 'warning');
        return false;
      }
      if (!form.subject_code || !form.subject_code.trim()) {
        showToast('กรุณาระบุรหัสวิชา', 'warning');
        return false;
      }
      if (!form.subject_name || !form.subject_name.trim()) {
        showToast('กรุณาระบุชื่อวิชา', 'warning');
        return false;
      }
      if (!form.subject_content || !form.subject_content.trim()) {
        showToast('กรุณาระบุหน่วยการเรียนรู้', 'warning');
        return false;
      }
      if (!form.subject_name_plan || !form.subject_name_plan.trim()) {
        showToast('กรุณาระบุชื่อแผนการสอน', 'warning');
        return false;
      }
      if (!form.teach_date) {
        showToast('กรุณาระบุวันที่ทำการสอน', 'warning');
        return false;
      }
      if (!form.teach_timestart || !form.teach_timeend) {
        showToast('กรุณาระบุเวลาที่ทำการสอนให้ครบถ้วน', 'warning');
        return false;
      }
      if (!form.teach_minute || parseInt(form.teach_minute, 10) <= 0) {
        showToast('กรุณาระบุจำนวนนาทีที่ใช้ในการสอน', 'warning');
        return false;
      }
      if (!form.learning_model || !form.learning_model.trim()) {
        showToast('กรุณาระบุวิธีการสอน / รูปแบบการจัดการเรียนรู้', 'warning');
        return false;
      }
    } else if (stepNumber === 3) {
      if (!form.competency || form.competency.length === 0) {
        showToast('กรุณาเลือกสมรรถนะสำคัญของผู้เรียนอย่างน้อย 1 รายการ', 'warning');
        return false;
      }
    }
    return true;
  };

  const handleNextStep = () => {
    if (!validateStep(currentStep)) return;
    if (currentStep < 4) {
      setCurrentStep((prev) => prev + 1);
      window.scrollTo({ top: 120, behavior: 'smooth' });
    }
  };

  const handlePrevStep = () => {
    if (currentStep > 1) {
      setCurrentStep((prev) => prev - 1);
      window.scrollTo({ top: 120, behavior: 'smooth' });
    }
  };

  const handleStepClick = (targetStep) => {
    if (targetStep === currentStep) return;
    if (targetStep > currentStep) {
      for (let s = currentStep; s < targetStep; s++) {
        if (!validateStep(s)) return;
      }
    }
    setCurrentStep(targetStep);
    window.scrollTo({ top: 120, behavior: 'smooth' });
  };

  const renderNavActions = (stepNum) => (
    <div className="wizard-nav-actions mt-3">
      <div className="d-flex align-items-center" style={{ gap: '8px' }}>
        {stepNum > 1 && (
          <button
            type="button"
            className="btn btn-secondary font-weight-bold"
            onClick={handlePrevStep}
          >
            <i className="fa-solid fa-arrow-left mr-1"></i> ย้อนกลับ
          </button>
        )}
        {lastSavedTime && (
          <span className="text-success small font-weight-bold ml-2 d-none d-sm-inline">
            <i className="fa-solid fa-cloud-arrow-up mr-1"></i>
            บันทึกร่างแล้ว ({lastSavedTime})
          </span>
        )}
      </div>

      <div className="d-flex align-items-center flex-wrap" style={{ gap: '8px' }}>
        {!planid && (
          <button
            type="button"
            className="btn btn-outline-secondary btn-sm"
            onClick={handleDiscardDraft}
            title="ล้างข้อมูลในฟอร์มเพื่อเริ่มใหม่"
          >
            <i className="fa-solid fa-eraser mr-1"></i> ล้างร่าง
          </button>
        )}
        <Link to="/statusplan" className="btn btn-outline-danger btn-sm">
          <i className="fa-solid fa-ban mr-1"></i> ยกเลิก
        </Link>
        {stepNum < 4 ? (
          <button
            type="button"
            className="btn btn-primary font-weight-bold px-4"
            onClick={handleNextStep}
          >
            ขั้นตอนถัดไป <i className="fa-solid fa-arrow-right ml-1"></i>
          </button>
        ) : (
          <button
            type="submit"
            className="btn btn-success font-weight-bold px-4 shadow-sm"
            id="btn_submit"
            disabled={saving}
          >
            <i className={planid ? "fa-solid fa-save mr-1" : "fa-solid fa-paper-plane mr-1"}></i>{' '}
            {saving ? "กำลังส่งข้อมูล..." : (planid ? "บันทึกการแก้ไข" : "ส่งแผนการสอน")}
          </button>
        )}
      </div>
    </div>
  );

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
    if (!file && !planid) {
      Swal.fire('Error', 'กรุณาเลือกไฟล์แผนการสอน (PDF)', 'error');
      return;
    }
    if (file) {
      if (!file.name.toLowerCase().endsWith('.pdf')) {
        Swal.fire('Error', 'ไฟล์ต้องเป็น PDF เท่านั้น', 'error');
        return;
      }
      if (file.size > 31457280) {
        Swal.fire('Error', 'ขนาดไฟล์ใหญ่กว่า 30MB', 'error');
        return;
      }
    }

    setSaving(true);
    try {
      let driveUrl = existingPlanFile;
      if (file) {
        const planFilename = `${profile.people_id}_${getFileTimestamp()}.pdf`;
        driveUrl = await uploadToDrive(file, { filename: planFilename });
      }
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
        plan_status: planid ? (existingPlanStatus === '3' ? '4' : existingPlanStatus) : '1',
      };

      let insertedPlanId = planid;
      if (planid) {
        const { error } = await supabase
          .from('tbl_sendplan')
          .update(payload)
          .eq('planid', planid);
        if (error) throw error;
      } else {
        const { data: insertedData, error } = await supabase
          .from('tbl_sendplan')
          .insert([{
            ...payload,
            plan_clip: '',
            committee1: '',
            committee2: '',
            committee3: '',
            committee4: '',
            committee5: '',
          }])
          .select('planid')
          .single();
        if (error) throw error;
        if (insertedData) {
          insertedPlanId = insertedData.planid;
        }
      }

      if (draftKey) {
        localStorage.removeItem(draftKey);
      }

      const teacherPrefix = lookups?.prefix?.[profile?.prefix] || profile?.prefix || '';
      const teacherName = `${teacherPrefix}${profile?.name || ''} ${profile?.lastname || ''}`.trim();
      const schoolName = lookups?.school?.[profile?.school] || profile?.school_name || '';

      const lineMsg = generateTeacherToDirectorMessage({
        teacherName,
        schoolName,
        subjectName: form.subject_name,
        subjectCode: form.subject_code,
        planName: form.subject_name_plan,
        planId: insertedPlanId || '',
      });

      showLineShareDialog({
        title: planid ? 'แก้ไขแผนสำเร็จแล้ว!' : 'ส่งแผนการสอนสำเร็จแล้ว!',
        subtitle: 'ท่านสามารถส่งการแจ้งเตือนหาผู้อำนวยการโรงเรียนผ่าน LINE เพื่อให้ตรวจอนุมัติได้ทันท่วงที',
        messageText: lineMsg,
        onClose: () => {
          navigate('/statusplan');
        },
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
          {draftInfo && !isDraftDismissed && !planid && (
            <div
              className="alert alert-info shadow-sm mb-3 d-flex flex-wrap align-items-center justify-content-between p-3"
              style={{ borderLeft: '5px solid #0ea5e9' }}
            >
              <div>
                <h6 className="font-weight-bold mb-1 text-dark">
                  <i className="fa-solid fa-floppy-disk mr-2 text-info"></i>
                  พบข้อมูลร่างแผนการสอนที่บันทึกไว้ในเครื่อง
                </h6>
                <div className="small text-muted">
                  บันทึกล่าสุดเมื่อ: {new Date(draftInfo.savedAt).toLocaleDateString('th-TH')} เวลา{' '}
                  {new Date(draftInfo.savedAt).toLocaleTimeString('th-TH')}
                  {draftInfo.form?.subject_name_plan ? ` (แผน: "${draftInfo.form.subject_name_plan}")` : ''}
                </div>
              </div>
              <div className="mt-2 mt-md-0 d-flex" style={{ gap: '8px' }}>
                <button type="button" className="btn btn-sm btn-info text-white" onClick={handleRestoreDraft}>
                  <i className="fa-solid fa-rotate-left mr-1"></i> กู้คืนข้อมูลร่าง
                </button>
                <button type="button" className="btn btn-sm btn-outline-secondary" onClick={handleDiscardDraft}>
                  <i className="fa-solid fa-trash mr-1"></i> ล้างร่าง/เริ่มใหม่
                </button>
              </div>
            </div>
          )}

          {/* Smart Wizard Stepper */}
          <div className="wizard-stepper-container">
            <div className="wizard-progress-bar">
              <div
                className="wizard-progress-fill"
                style={{ width: `${((currentStep - 1) / (WIZARD_STEPS.length - 1)) * 100}%` }}
              />
            </div>
            <div className="wizard-steps">
              {WIZARD_STEPS.map((step) => {
                const isCompleted = currentStep > step.id;
                const isActive = currentStep === step.id;
                return (
                  <button
                    key={step.id}
                    type="button"
                    className={`wizard-step-item ${isActive ? 'active' : ''} ${isCompleted ? 'completed' : ''}`}
                    onClick={() => handleStepClick(step.id)}
                  >
                    <div className="wizard-step-badge">
                      {isCompleted ? <i className="fa-solid fa-check text-white"></i> : step.id}
                    </div>
                    <div className="wizard-step-text">
                      <span className="wizard-step-title">{step.title}</span>
                      <span className="wizard-step-subtitle">{step.subtitle}</span>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Compact Teacher Profile Info */}
          <div className="card card-outline card-success mb-3 shadow-sm">
            <div className="card-body py-2 px-3">
              <div className="row align-items-center">
                <div className="col-md-6 col-lg-3 small mb-1 mb-lg-0">
                  <span className="text-muted">ผู้จัดทำ:</span> <strong className="text-dark">{lookups.prefix[profile.prefix] || ''}{profile.name} {profile.lastname}</strong>
                </div>
                <div className="col-md-6 col-lg-3 small mb-1 mb-lg-0">
                  <span className="text-muted">ตำแหน่ง:</span> <span className="text-dark">{lookups.position[profile.position_id] || ''} ({lookups.academic[profile.academic_id] || ''})</span>
                </div>
                <div className="col-md-6 col-lg-3 small mb-1 mb-lg-0">
                  <span className="text-muted">โรงเรียน:</span> <span className="text-dark">{lookups.school[profile.school] || ''}</span>
                </div>
                <div className="col-md-6 col-lg-3 small">
                  <span className="text-muted">กลุ่มสาระ:</span> <span className="text-dark">{lookups.teachSubject[profile.teach_subject] || ''}</span>
                </div>
              </div>
            </div>
          </div>

          <form onSubmit={handleFormSubmit} className="form-horizontal was-validated" autoComplete="off">
            {/* ================= STEP 1: ข้อมูลวิชา & เวลาสอน ================= */}
            <div style={{ display: currentStep === 1 ? 'block' : 'none' }}>
              <div className="card card-teal">
                <div className="card-header">
                  <h4 className="card-title font-weight-bold">
                    <i className="fa-solid fa-graduation-cap mr-2"></i> กลุ่มสาระ / ระดับชั้น / ประเภทวิชา
                  </h4>
                </div>
                <div className="card-body">
                  <div className="row">
                    <div className="col-lg-4">
                      <div className="mb-3 mt-1">
                        <label htmlFor="teach_subject_id">กลุ่มสาระ : <span className="text-danger">*</span></label>
                        <select name="teach_subject_id" id="teach_subject_id" className="select2bs4" value={form.teach_subject_id} onChange={handleChange} style={{ width: '100%' }} required>
                          <option value=""></option>
                          {options.teachSubject.map((row) => (
                            <option key={row.teach_subject_id} value={row.teach_subject_id}>{row.teach_subject}</option>
                          ))}
                        </select>
                      </div>
                    </div>
                    <div className="col-lg-4">
                      <div className="mb-3 mt-1">
                        <label htmlFor="grade_level_id">ระดับชั้นที่ทำการสอน : <span className="text-danger">*</span></label>
                        <select name="grade_level_id" id="grade_level_id" className="select2bs4" value={form.grade_level_id} onChange={handleChange} style={{ width: '100%' }} required>
                          <option value=""></option>
                          {options.gradeLevel.map((row) => (
                            <option key={row.grade_level_id} value={row.grade_level_id}>{row.grade_level_name}</option>
                          ))}
                        </select>
                      </div>
                    </div>
                    <div className="col-lg-4">
                      <div className="mb-3 mt-1">
                        <label htmlFor="subject_type">ประเภทวิชา : <span className="text-danger">*</span></label>
                        <select name="subject_type" id="subject_type" className="form-control" value={form.subject_type} onChange={handleChange} required>
                          {options.subjectTypes.map((row) => (
                            <option key={row.subjecttype_id} value={row.subjecttype_id}>{row.subjecttype_name}</option>
                          ))}
                        </select>
                        {!needsIndicators && (
                          <small className="text-info mt-1 d-block">
                            <i className="fa-solid fa-info-circle"></i> ประเภทนี้ไม่จำเป็นต้องระบุตัวชี้วัดระหว่างทาง/ปลายทาง
                          </small>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="card card-primary card-outline">
                <div className="card-header">
                  <h4 className="card-title font-weight-bold text-primary">
                    <i className="fa-solid fa-book-bookmark mr-2"></i> ข้อมูลรายวิชาและกำหนดการสอน
                  </h4>
                </div>
                <div className="card-body">
                  <div className="row">
                    <div className="col-lg-2">
                      <div className="mb-3">
                        <label htmlFor="subject_code">รหัสวิชา : <span className="text-danger">*</span></label>
                        <input list="subject_code_list" type="text" id="subject_code" name="subject_code" className="form-control" placeholder="เช่น ท31101" value={form.subject_code} onChange={handleChange} required />
                        <datalist id="subject_code_list">
                          {autoComplete.subjectCodes.map((code) => (
                            <option key={code} value={code} />
                          ))}
                        </datalist>
                      </div>
                    </div>
                    <div className="col-lg-4">
                      <div className="mb-3">
                        <label htmlFor="subject_name">ชื่อวิชา : <span className="text-danger">*</span></label>
                        <input list="subject_name_list" type="text" id="subject_name" name="subject_name" className="form-control" placeholder="ชื่อรายวิชา" value={form.subject_name} onChange={handleChange} required />
                        <datalist id="subject_name_list">
                          {autoComplete.subjectNames.map((name) => (
                            <option key={name} value={name} />
                          ))}
                        </datalist>
                      </div>
                    </div>
                    <div className="col-lg-3">
                      <div className="mb-3">
                        <label htmlFor="subject_content">หน่วยการเรียนรู้ : <span className="text-danger">*</span></label>
                        <input type="text" id="subject_content" name="subject_content" className="form-control" placeholder="ชื่อหน่วยการเรียนรู้" value={form.subject_content} onChange={handleChange} required />
                      </div>
                    </div>
                    <div className="col-lg-3">
                      <div className="mb-3">
                        <label htmlFor="subject_name_plan">ชื่อแผนการสอน : <span className="text-danger">*</span></label>
                        <input type="text" id="subject_name_plan" name="subject_name_plan" className="form-control" placeholder="ชื่อแผนการสอน" value={form.subject_name_plan} onChange={handleChange} required />
                      </div>
                    </div>
                  </div>

                  <div className="row">
                    <div className="col-lg-3">
                      <div className="mb-3">
                        <label htmlFor="teach_date">วันที่ทำการสอน : <span className="text-danger">*</span></label>
                        <input className="form-control datethai" type="date" id="teach_date" name="teach_date" value={form.teach_date} onChange={handleChange} required />
                      </div>
                    </div>
                    <div className="col-lg-3">
                      <div className="mb-3">
                        <label htmlFor="teach_timestart">เริ่มเวลา : <span className="text-danger">*</span></label>
                        <input type="time" id="teach_timestart" name="teach_timestart" className="form-control" min="07:00" max="17:00" value={form.teach_timestart} onChange={handleChange} required />
                      </div>
                    </div>
                    <div className="col-lg-3">
                      <div className="mb-3">
                        <label htmlFor="teach_timeend">เสร็จเวลา : <span className="text-danger">*</span></label>
                        <input type="time" id="teach_timeend" name="teach_timeend" className="form-control" min="07:00" max="17:00" value={form.teach_timeend} onChange={handleChange} required />
                      </div>
                    </div>
                    <div className="col-lg-3">
                      <div className="mb-3">
                        <label htmlFor="teach_minute">เวลาที่ใช้สอน (นาที) : <span className="text-danger">*</span></label>
                        <div className="input-group">
                          <input type="number" id="teach_minute" name="teach_minute" className="form-control" min="0" max="240" step="1" value={form.teach_minute} onChange={handleChange} required />
                          <div className="input-group-append">
                            <button
                              type="button"
                              className="btn btn-outline-primary"
                              onClick={handleAutoCalcMinutes}
                              title="คำนวณจำนวนนาทีจากเวลาเริ่มและเวลาเสร็จอัตโนมัติ"
                            >
                              <i className="fa-solid fa-calculator mr-1"></i> คำนวณ
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="row">
                    <div className="col-lg-12">
                      <div className="mb-3">
                        <label htmlFor="learning_model">วิธีการสอน / รูปแบบการจัดการเรียนรู้ : <span className="text-danger">*</span></label>
                        <input list="learning_model_list" type="text" id="learning_model" name="learning_model" className="form-control" placeholder="เช่น การเรียนรู้เชิงรุก (Active Learning), รูปแบบการสืบเสาะหาความรู้ 5E" value={form.learning_model} onChange={handleChange} required />
                        <datalist id="learning_model_list">
                          {options.learningModel.map((row) => (
                            <option key={row.model_id} value={row.model_name} />
                          ))}
                        </datalist>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
              {renderNavActions(1)}
            </div>

            {/* ================= STEP 2: จุดประสงค์ & สาระ (K-P-A) ================= */}
            <div style={{ display: currentStep === 2 ? 'block' : 'none' }}>
              <div className="card card-primary card-outline">
                <div className="card-header bg-light">
                  <h4 className="card-title font-weight-bold text-primary">
                    <i className="fa-solid fa-bullseye mr-2"></i> จุดประสงค์การเรียนรู้ (K-P-A)
                  </h4>
                </div>
                <div className="card-body">
                  <div className="row">
                    <div className="col-lg-12">
                      <div className="mb-3">
                        <label htmlFor="objectives_knowledge" className="font-weight-bold text-dark">
                          1. ด้านความรู้ (Knowledge - K) :
                        </label>
                        <textarea className="form-control notemini" name="objectives_knowledge" id="objectives_knowledge" rows="4" placeholder="ระบุความรู้ที่ผู้เรียนจะได้รับ..." value={form.objectives_knowledge} onChange={handleChange}></textarea>
                      </div>
                    </div>
                    <div className="col-lg-12">
                      <div className="mb-3">
                        <label htmlFor="objectives_process" className="font-weight-bold text-dark">
                          2. ด้านทักษะ/กระบวนการ (Process - P) :
                        </label>
                        <textarea className="form-control notemini" name="objectives_process" id="objectives_process" rows="4" placeholder="ระบุทักษะหรือกระบวนการคิด/ปฏิบัติ..." value={form.objectives_process} onChange={handleChange}></textarea>
                      </div>
                    </div>
                    <div className="col-lg-12">
                      <div className="mb-3">
                        <label htmlFor="objectives_attribute" className="font-weight-bold text-dark">
                          3. ด้านคุณลักษณะ (Attribute - A) :
                        </label>
                        <textarea className="form-control notemini" name="objectives_attribute" id="objectives_attribute" rows="4" placeholder="ระบุเจตคติหรือคุณลักษณะที่ส่งเสริม..." value={form.objectives_attribute} onChange={handleChange}></textarea>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="card card-info card-outline">
                <div className="card-header bg-light">
                  <h4 className="card-title font-weight-bold text-info">
                    <i className="fa-solid fa-book-open-reader mr-2"></i> มาตรฐาน สาระการเรียนรู้ และกิจกรรม
                  </h4>
                </div>
                <div className="card-body">
                  <div className="row">
                    <div className="col-lg-6">
                      <div className="mb-3">
                        <label htmlFor="learning_outcomes">มาตรฐานการเรียนรู้ ตัวชี้วัด/ผลการเรียนรู้ :</label>
                        <textarea className="form-control notemini" name="learning_outcomes" id="learning_outcomes" rows="5" placeholder="ระบุมาตรฐาน/ผลการเรียนรู้..." value={form.learning_outcomes} onChange={handleChange}></textarea>
                      </div>
                    </div>
                    <div className="col-lg-6">
                      <div className="mb-3">
                        <label htmlFor="learning_content">สาระการเรียนรู้ :</label>
                        <textarea className="form-control notemini" name="learning_content" id="learning_content" rows="5" placeholder="ระบุสาระสำคัญ/เนื้อหาบทเรียน..." value={form.learning_content} onChange={handleChange}></textarea>
                      </div>
                    </div>
                  </div>

                  <div className="row">
                    <div className="col-lg-12">
                      <div className="mb-3">
                        <label htmlFor="learning_activities">ขั้นตอนการจัดกิจกรรมการเรียนรู้ / เวลา (นาที) :</label>
                        <textarea className="form-control notemini" name="learning_activities" id="learning_activities" rows="6" placeholder="เช่น ขั้นนำ (10 นาที), ขั้นสอน/กิจกรรม (30 นาที), ขั้นสรุป (10 นาที)..." value={form.learning_activities} onChange={handleChange}></textarea>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
              {renderNavActions(2)}
            </div>

            {/* ================= STEP 3: สมรรถนะ & การประเมินผล ================= */}
            <div style={{ display: currentStep === 3 ? 'block' : 'none' }}>
              <div className="card card-primary card-outline">
                <div className="card-header bg-light">
                  <h4 className="card-title font-weight-bold text-primary">
                    <i className="fa-solid fa-award mr-2"></i> สมรรถนะ ทักษะ และคุณลักษณะอันพึงประสงค์
                  </h4>
                </div>
                <div className="card-body">
                  <div className="row">
                    <div className="col-lg-12">
                      <div className="mb-3">
                        <label htmlFor="competency">สมรรถนะสำคัญของผู้เรียน : <span className="text-danger">*</span></label>
                        <select name="competency" id="competency" className="custom-select select2bs4" multiple data-placeholder="เลือกสมรรถนะสำคัญ" value={form.competency} onChange={(e) => handleMultiChange('competency', e.target.selectedOptions)} required>
                          {options.competency.map((row) => (
                            <option key={row.competency_id} value={row.competency_id}>{row.competency_id} : {row.competency_name}</option>
                          ))}
                        </select>
                      </div>
                    </div>
                  </div>
                  <div className="row">
                    <div className="col-lg-6">
                      <div className="mb-3">
                        <label htmlFor="ability21">ทักษะในศตวรรษที่ 21 (3Rs 8Cs) :</label>
                        <select className="select2bs4" multiple name="ability21" data-placeholder="เลือกทักษะในศตวรรษที่ 21" value={form.ability21} onChange={(e) => handleMultiChange('ability21', e.target.selectedOptions)} style={{ width: '100%' }}>
                          {options.ability21.map((row) => (
                            <option key={row.ability21_id} value={row.ability21_id}>{row.ability21_id} : {row.ability21_name_th}</option>
                          ))}
                        </select>
                      </div>
                    </div>
                    <div className="col-lg-6">
                      <div className="mb-3">
                        <label htmlFor="desirable">คุณลักษณะอันพึงประสงค์ :</label>
                        <select className="select2bs4" multiple name="desirable" data-placeholder="เลือกคุณลักษณะอันพึงประสงค์" value={form.desirable} onChange={(e) => handleMultiChange('desirable', e.target.selectedOptions)} style={{ width: '100%' }}>
                          {options.desirable.map((row) => (
                            <option key={row.desirable_id} value={row.desirable_id}>{row.desirable_id} : {row.desirable_name}</option>
                          ))}
                        </select>
                      </div>
                    </div>
                  </div>
                  <div className="row">
                    <div className="col-lg-12">
                      <div className="mb-3">
                        <label htmlFor="instructional_media">สื่อ / แหล่งการเรียนรู้ :</label>
                        <textarea className="form-control notemini" name="instructional_media" id="instructional_media" rows="3" placeholder="เช่น สื่อนำเสนอ Canva, ใบงาน, วีดิทัศน์ YouTube, แหล่งเรียนรู้ในชุมชน..." value={form.instructional_media} onChange={handleChange}></textarea>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="card card-navy">
                <div className="card-header">
                  <h4 className="card-title font-weight-bold">
                    <i className="fa-solid fa-list-check mr-2"></i> การวัดและประเมินผลการเรียนรู้
                  </h4>
                </div>
                <div className="card-body">
                  <div className="row">
                    <div className="col-lg-6">
                      <div className="mb-3">
                        <label htmlFor="Measurement_how">1. วิธีการวัดและประเมินผล :</label>
                        <textarea className="form-control notemini" name="Measurement_how" id="Measurement_how" rows="4" placeholder="เช่น การสังเกตพฤติกรรม, การตรวจใบงาน..." value={form.Measurement_how} onChange={handleChange}></textarea>
                      </div>
                    </div>
                    <div className="col-lg-6">
                      <div className="mb-3">
                        <label htmlFor="Measurement_tools">2. เครื่องมือวัดและประเมินผล :</label>
                        <textarea className="form-control notemini" name="Measurement_tools" id="Measurement_tools" rows="4" placeholder="เช่น แบบประเมินใบงาน, แบบสังเกตพฤติกรรมการทำงานกลุ่ม..." value={form.Measurement_tools} onChange={handleChange}></textarea>
                      </div>
                    </div>
                    <div className="col-lg-6">
                      <div className="mb-3">
                        <label htmlFor="Measurement_scoring">3. เกณฑ์การให้คะแนน :</label>
                        <textarea className="form-control notemini" name="Measurement_scoring" id="Measurement_scoring" rows="4" placeholder="เช่น รูบริกส์ (Rubric Assessment) ระดับดีมาก ดี พอใช้ ปรับปรุง..." value={form.Measurement_scoring} onChange={handleChange}></textarea>
                      </div>
                    </div>
                    <div className="col-lg-6">
                      <div className="mb-3">
                        <label htmlFor="Measurement_outcomes">4. การตัดสินผลการเรียนรู้ :</label>
                        <textarea className="form-control notemini" name="Measurement_outcomes" id="Measurement_outcomes" rows="4" placeholder="เช่น ได้ระดับคุณภาพดีขึ้นไปถือว่าผ่านเกณฑ์..." value={form.Measurement_outcomes} onChange={handleChange}></textarea>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
              {renderNavActions(3)}
            </div>

            {/* ================= STEP 4: ตัวชี้วัด & แนบไฟล์ ================= */}
            <div style={{ display: currentStep === 4 ? 'block' : 'none' }}>
              {/* Summary Review Card */}
              <div className="card card-outline card-primary shadow-sm mb-3">
                <div className="card-header bg-light">
                  <h5 className="card-title m-0 text-primary font-weight-bold">
                    <i className="fa-solid fa-clipboard-check mr-2"></i> สรุปภาพรวมแผนการสอน (ก่อนยืนยันส่ง)
                  </h5>
                </div>
                <div className="card-body p-3">
                  <div className="row">
                    <div className="col-md-6 mb-2">
                      <span className="text-muted">วิชา:</span> <strong>{form.subject_code} {form.subject_name}</strong>
                    </div>
                    <div className="col-md-6 mb-2">
                      <span className="text-muted">ระดับชั้น:</span> <strong>{options.gradeLevel.find(g => String(g.grade_level_id) === String(form.grade_level_id))?.grade_level_name || ''}</strong>
                    </div>
                    <div className="col-md-6 mb-2">
                      <span className="text-muted">หน่วยการเรียนรู้:</span> <strong>{form.subject_content}</strong>
                    </div>
                    <div className="col-md-6 mb-2">
                      <span className="text-muted">ชื่อแผนการสอน:</span> <strong className="text-primary">{form.subject_name_plan}</strong>
                    </div>
                    <div className="col-md-6 mb-2">
                      <span className="text-muted">วันที่และเวลาสอน:</span> <strong>{form.teach_date} ({form.teach_timestart} - {form.teach_timeend}, {form.teach_minute} นาที)</strong>
                    </div>
                    <div className="col-md-6 mb-2">
                      <span className="text-muted">วิธีการสอน:</span> <strong>{form.learning_model}</strong>
                    </div>
                    <div className="col-md-6 mb-2">
                      <span className="text-muted">สมรรถนะ:</span> <span className="badge badge-info">{form.competency?.length || 0} รายการ</span>
                    </div>
                    <div className="col-md-6 mb-2">
                      <span className="text-muted">ทักษะศตวรรษที่ 21:</span> <span className="badge badge-secondary">{form.ability21?.length || 0} รายการ</span>
                    </div>
                  </div>
                </div>
              </div>

              {teachSubjectId && gradeLevelId && needsIndicators && (
                <div className="card card-pink">
                  <div className="card-header">
                    <h4 className="card-title font-weight-bold">
                      <i className="fa-solid fa-flag-checkered mr-2"></i> ตัวชี้วัดระหว่างทาง
                    </h4>
                  </div>
                  <div className="card-body">
                    <div className="row">
                      {indicators.mid.length === 0 && (
                        <div className="col-12 text-danger">ไม่พบตัวชี้วัดระหว่างทางสำหรับกลุ่มสาระและระดับชั้นนี้</div>
                      )}
                      {indicators.mid.map((ind, idx) => (
                        <div className="col-lg-4" key={`mid-${idx}`}>
                          <div className="mb-3">
                            <label className="d-flex align-items-start" style={{ cursor: 'pointer', gap: '8px' }}>
                              <input
                                type="checkbox"
                                name="indicators_mid"
                                className="mt-1"
                                value={ind.indicators_name}
                                checked={Array.isArray(form.indicators_mid) && form.indicators_mid.includes(ind.indicators_name)}
                                onChange={(e) => {
                                  const value = e.target.value;
                                  setForm((prev) => {
                                    const next = new Set(prev.indicators_mid);
                                    if (e.target.checked) next.add(value); else next.delete(value);
                                    return { ...prev, indicators_mid: Array.from(next) };
                                  });
                                }}
                              />
                              <span>
                                <strong>{ind.indicators_name}</strong> ({ind.indicator_group}) : {ind.indicators_details}
                              </span>
                            </label>
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
                    <h4 className="card-title font-weight-bold">
                      <i className="fa-solid fa-bullseye mr-2"></i> ตัวชี้วัดปลายทาง
                    </h4>
                  </div>
                  <div className="card-body">
                    <div className="row">
                      {indicators.final.length === 0 && (
                        <div className="col-12 text-danger">ไม่พบตัวชี้วัดปลายทางสำหรับกลุ่มสาระและระดับชั้นนี้</div>
                      )}
                      {indicators.final.map((ind, idx) => (
                        <div className="col-lg-4" key={`final-${idx}`}>
                          <div className="mb-3">
                            <label className="d-flex align-items-start" style={{ cursor: 'pointer', gap: '8px' }}>
                              <input
                                type="checkbox"
                                name="indicators_final"
                                className="mt-1"
                                value={ind.indicators_name}
                                checked={Array.isArray(form.indicators_final) && form.indicators_final.includes(ind.indicators_name)}
                                onChange={(e) => {
                                  const value = e.target.value;
                                  setForm((prev) => {
                                    const next = new Set(prev.indicators_final);
                                    if (e.target.checked) next.add(value); else next.delete(value);
                                    return { ...prev, indicators_final: Array.from(next) };
                                  });
                                }}
                              />
                              <span>
                                <strong>{ind.indicators_name}</strong> ({ind.indicator_group}) : {ind.indicators_details}
                              </span>
                            </label>
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
                    <h4 className="card-title font-weight-bold"><i className="fa-solid fa-circle-info mr-2"></i> หมายเหตุประเภทรายวิชา</h4>
                  </div>
                  <div className="card-body">
                    <div className="alert alert-info mb-0">
                      <i className="fa-solid fa-info-circle mr-1"></i>
                      รายวิชาประเภท <strong>{options.subjectTypes.find(t => t.subjecttype_id === form.subject_type)?.subjecttype_name || form.subject_type}</strong> ไม่จำเป็นต้องระบุตัวชี้วัดระหว่างทาง และตัวชี้วัดปลายทาง
                      <br />สามารถระบุ <strong>ผลการเรียนรู้</strong> ในขั้นตอนที่ 2 ได้
                    </div>
                  </div>
                </div>
              )}

              <div className="card card-olive">
                <div className="card-header">
                  <h4 className="card-title text-white font-weight-bold">
                    <i className="fa-solid fa-file-pdf mr-2"></i> แนบไฟล์แผนการสอน (PDF) : <span className="text-warning">*</span>
                  </h4>
                </div>
                <div className="card-body">
                  <div className="form-group mb-2">
                    <input
                      type="file"
                      name="plan_file"
                      id="plan_file"
                      className="form-control-file"
                      accept="application/pdf"
                      onChange={handleFileChange}
                      required={!planid}
                    />
                    <small className="form-text text-muted">
                      รองรับไฟล์เอกสารนามสกุล <strong>.pdf</strong> เท่านั้น ขนาดไม่เกิน 30 MB
                    </small>
                  </div>
                  {file && (
                    <div className="alert alert-success py-2 px-3 mb-2 small">
                      <i className="fa-solid fa-check-circle mr-1"></i> เลือกไฟล์แล้ว: <strong>{file.name}</strong> ({(file.size / (1024 * 1024)).toFixed(2)} MB)
                    </div>
                  )}
                  {planid && existingPlanFile && (
                    <div className="mt-2 text-info small">
                      <i className="fa-regular fa-file-pdf mr-1"></i> ไฟล์ปัจจุบันในระบบ: <a href={existingPlanFile} target="_blank" rel="noreferrer" className="font-weight-bold text-info">คลิกดูไฟล์เดิม</a> (หากไม่ต้องการเปลี่ยนไฟล์ใหม่ ไม่ต้องแนบไฟล์ใหม่)
                    </div>
                  )}
                </div>
              </div>

              {renderNavActions(4)}
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default SendPlan;
