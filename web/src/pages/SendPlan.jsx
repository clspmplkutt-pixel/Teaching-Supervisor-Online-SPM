import React, { useEffect, useState, useMemo } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import Swal from 'sweetalert2';
import { supabase } from '../supabaseClient';
import { useAuth } from '../contexts/AuthContext';
import { useUserProfile } from '../hooks/useUserProfile';
import ThaiDatePicker from '../components/ThaiDatePicker';
import SearchableSelect from '../components/SearchableSelect';
import LoadingSpinner from '../components/LoadingSpinner';
import EmptyState from '../components/EmptyState';
import StatusBadge from '../components/StatusBadge';
import { uploadToDrive } from '../utils/driveUpload';
import { showToast } from '../utils/toast';
import { generateTeacherToDirectorMessage, showLineShareDialog } from '../utils/lineNotifyHelper';
import './SendPlan.css';

const MAX_PDF_MB = 25;
const MAX_PDF_BYTES = MAX_PDF_MB * 1024 * 1024;

const normalizeThaiDate = (value) => {
  if (!value) return '';
  const raw = String(value).trim();
  if (raw.includes('/')) {
    const [d, m, y] = raw.split('/');
    if (!d || !m || !y) return raw;
    let year = parseInt(y, 10);
    if (year > 2400) year -= 543;
    return `${year}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
  }
  if (raw.includes('-')) {
    const [y, m, d] = raw.slice(0, 10).split('-');
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

const INITIAL_FORM = {
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
};

const WIZARD_STEPS = [
  { id: 1, title: 'ข้อมูลรายวิชา', subtitle: 'กลุ่มสาระ, ชั้น, วันเวลา', icon: 'fa-book-open' },
  { id: 2, title: 'จุดประสงค์ & กิจกรรม', subtitle: 'K-P-A, สาระ, 3 ขั้นตอน', icon: 'fa-bullseye' },
  { id: 3, title: 'สมรรถนะ & สื่อ', subtitle: 'สมรรถนะ, ทักษะ 21, สื่อ', icon: 'fa-award' },
  { id: 4, title: 'ตัวชี้วัดหลักสูตร', subtitle: 'ระหว่างทาง & ปลายทาง', icon: 'fa-list-check' },
  { id: 5, title: 'การวัดและประเมินผล', subtitle: 'วิธีวัด, เครื่องมือ, เกณฑ์', icon: 'fa-clipboard-check' },
  { id: 6, title: 'ตรวจสอบ & แนบ PDF', subtitle: 'สรุปแผน & ส่งอนุมัติ', icon: 'fa-file-arrow-up' },
];

const SendPlan = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();
  const query = useMemo(() => new URLSearchParams(location.search), [location.search]);
  // Support both ?planid= and ?edit= seamlessly
  const planid = query.get('planid') || query.get('edit') || '';

  const { profile, loading: profileLoading } = useUserProfile();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploadStage, setUploadStage] = useState(0); // 0: idle, 1: reading, 2: uploading PDF, 3: saving DB
  const [uploadPercent, setUploadPercent] = useState(0);
  const [file, setFile] = useState(null);
  const [fileError, setFileError] = useState('');
  const [autoComplete, setAutoComplete] = useState({ subjectCodes: [], subjectNames: [] });
  const [existingPlanFile, setExistingPlanFile] = useState('');
  const [existingPlanStatus, setExistingPlanStatus] = useState('1');
  const [existingDsComment, setExistingDsComment] = useState('');
  const [existingOwnerId, setExistingOwnerId] = useState('');

  // Step & per-step validation state (NEVER apply .was-validated on mount!)
  const [currentStep, setCurrentStep] = useState(1);
  const [maxCompletedStep, setMaxCompletedStep] = useState(0);
  const [validatedSteps, setValidatedSteps] = useState({});

  // Step 4 Indicator search filters
  const [midSearch, setMidSearch] = useState('');
  const [finalSearch, setFinalSearch] = useState('');

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

  const [form, setForm] = useState(INITIAL_FORM);

  // Draft & Autosave state
  const [draftInfo, setDraftInfo] = useState(null);
  const [isDraftDismissed, setIsDraftDismissed] = useState(false);
  const [lastSavedTime, setLastSavedTime] = useState('');

  const draftKey = profile?.people_id ? `lmss_sendplan_draft_${profile.people_id}` : null;
  const activeRole = user?.level_id || user?.user_metadata?.role || profile?.level || 'teacher';
  const isAdmin = activeRole === 'admin' || activeRole === 'root';

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
        setLastSavedTime(
          `${String(dt.getHours()).padStart(2, '0')}:${String(dt.getMinutes()).padStart(2, '0')}:${String(dt.getSeconds()).padStart(2, '0')}`
        );
      } catch (e) {
        console.warn('Autosave failed', e);
      }
    }, 1000);

    return () => clearTimeout(timer);
  }, [form, draftKey, planid, loading]);

  const handleRestoreDraft = () => {
    if (draftInfo?.form) {
      setForm((prev) => ({
        ...prev,
        ...draftInfo.form,
      }));
      setIsDraftDismissed(true);
      showToast('กู้คืนข้อมูลร่างเรียบร้อยแล้ว', 'success');
    }
  };

  const handleDiscardDraft = async () => {
    const confirmRes = await Swal.fire({
      title: 'ยืนยันการล้างข้อมูลร่าง?',
      text: 'ข้อมูลที่กรอกค้างไว้ในแบบร่างจะถูกล้างทั้งหมดเพื่อเริ่มต้นใหม่',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#dc2626',
      cancelButtonColor: '#64748b',
      confirmButtonText: 'ใช่, ล้างข้อมูลร่าง',
      cancelButtonText: 'ยกเลิก',
    });

    if (!confirmRes.isConfirmed) return;

    if (draftKey) {
      localStorage.removeItem(draftKey);
    }
    setDraftInfo(null);
    setIsDraftDismissed(true);
    setLastSavedTime('');
    setValidatedSteps({});
    setCurrentStep(1);
    setMaxCompletedStep(0);
    setFile(null);
    setFileError('');
    setForm({
      ...INITIAL_FORM,
      teach_subject_id: profile?.teach_subject ? String(profile.teach_subject) : '',
    });
    showToast('ล้างข้อมูลร่างเรียบร้อยแล้ว', 'info');
  };

  // ประเภทวิชาที่ไม่ต้องมีตัวชี้วัดระหว่างทาง/ปลายทาง
  const SUBJECT_TYPES_NO_INDICATORS = ['02', '08', '09'];
  const needsIndicators = !SUBJECT_TYPES_NO_INDICATORS.includes(form.subject_type);

  // Load master lookups
  useEffect(() => {
    let mounted = true;

    const loadData = async () => {
      setLoading(true);
      try {
        const [
          configRes,
          subjectRes,
          gradeRes,
          competencyRes,
          abilityRes,
          desirableRes,
          modelRes,
          prefixRes,
          positionRes,
          academicRes,
          schoolRes,
          teachSubjectRes,
          subjectTypeRes,
        ] = await Promise.all([
          supabase.from('tbl_config').select('config_name, config_value'),
          supabase
            .from('tbl_system_Teach_Subject')
            .select('teach_subject_id, teach_subject')
            .eq('teach_subject_status', '1')
            .order('teach_subject_id', { ascending: true }),
          supabase
            .from('tbl_system_GradeLevel')
            .select('grade_level_id, grade_level_name')
            .eq('grade_level_status', '1')
            .neq('grade_level_id', '499')
            .order('grade_level_id', { ascending: true }),
          supabase
            .from('tbl_system_Competency')
            .select('competency_id, competency_name')
            .eq('competency_status', '1')
            .order('competency_id', { ascending: true }),
          supabase
            .from('tbl_ability21')
            .select('ability21_id, ability21_name_th')
            .eq('ability21_status', '1')
            .order('id', { ascending: true }),
          supabase
            .from('tbl_system_Desirable')
            .select('desirable_id, desirable_name')
            .eq('desirable_status', '1')
            .order('desirable_id', { ascending: true }),
          supabase
            .from('tbl_learningModel')
            .select('model_id, model_name')
            .eq('model_status', '1')
            .order('model_name', { ascending: true }),
          supabase.from('tbl_system_prefix').select('prefix_id, prefix'),
          supabase.from('tbl_system_PersonPositionType').select('position_id, position_name'),
          supabase.from('tbl_system_Academic_Standing').select('academic_id, academic_standing'),
          supabase.from('tbl_school').select('school_id, school_name'),
          supabase.from('tbl_system_Teach_Subject').select('teach_subject_id, teach_subject'),
          supabase
            .from('tbl_system_SubjectType')
            .select('subjecttype_id, subjecttype_name')
            .eq('subjecttype_status', '1')
            .order('id', { ascending: true }),
        ]);

        const configMap = {};
        configRes.data?.forEach((c) => {
          configMap[c.config_name] = c.config_value;
        });

        const prefixMap = {};
        prefixRes.data?.forEach((p) => {
          prefixMap[p.prefix_id] = p.prefix;
        });
        const positionMap = {};
        positionRes.data?.forEach((p) => {
          positionMap[p.position_id] = p.position_name;
        });
        const academicMap = {};
        academicRes.data?.forEach((a) => {
          academicMap[a.academic_id] = a.academic_standing;
        });
        const schoolMap = {};
        schoolRes.data?.forEach((s) => {
          schoolMap[s.school_id] = s.school_name;
        });
        const teachSubjectMap = {};
        teachSubjectRes.data?.forEach((t) => {
          teachSubjectMap[t.teach_subject_id] = t.teach_subject;
        });

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
    return () => {
      mounted = false;
    };
  }, []);

  // Prefill teach_subject from profile on new plan
  useEffect(() => {
    if (planid || !profile || !options.teachSubject.length) return;
    if (!form.teach_subject_id && profile.teach_subject) {
      setForm((prev) => ({ ...prev, teach_subject_id: String(profile.teach_subject) }));
    }
  }, [planid, profile, options.teachSubject.length, form.teach_subject_id]);

  // Subject autocomplete hints from teacher's past plans
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
    return () => {
      mounted = false;
    };
  }, [profile]);

  // Load existing plan when editing (?planid= or ?edit=)
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
          setExistingPlanStatus(String(data.plan_status || '1'));
          setExistingDsComment(data.plan_ds_comment || '');
          setExistingOwnerId(data.people_id || '');
          setMaxCompletedStep(6);
          setForm({
            teach_subject_id: data.teach_subject_id ? String(data.teach_subject_id) : '',
            grade_level_id: data.grade_level_id ? String(data.grade_level_id) : '',
            subject_type: data.subject_type || '01',
            subject_code: data.subject_code || '',
            subject_name: data.subject_name || '',
            subject_content: data.subject_content || '',
            subject_name_plan: data.subject_name_plan || '',
            teach_date: normalizeThaiDate(data.teach_date || ''),
            teach_timestart: data.teach_timestart || '',
            teach_timeend: data.teach_timeend || '',
            teach_minute: data.teach_minute ? String(data.teach_minute) : '',
            learning_model: data.learning_model || '',
            competency: data.competency ? String(data.competency).split(',').filter(Boolean) : [],
            ability21: data.ability21 ? String(data.ability21).split(',').filter(Boolean) : [],
            desirable: data.desirable ? String(data.desirable).split(',').filter(Boolean) : [],
            objectives_knowledge: data.objectives_knowledge || '',
            objectives_process: data.objectives_process || '',
            objectives_attribute: data.objectives_attribute || '',
            learning_outcomes: data.learning_outcomes || '',
            learning_content: data.learning_content || '',
            learning_activities: data.learning_activities || '',
            instructional_media: data.instructional_media || '',
            Measurement_how: data.measurement_how ?? data.Measurement_how ?? '',
            Measurement_tools: data.measurement_tools ?? data.Measurement_tools ?? '',
            Measurement_scoring: data.measurement_scoring ?? data.Measurement_scoring ?? '',
            Measurement_outcomes: data.measurement_outcomes ?? data.Measurement_outcomes ?? '',
            indicators_mid: data.indicators_mid ? String(data.indicators_mid).split(',').filter(Boolean) : [],
            indicators_final: data.indicators_final ? String(data.indicators_final).split(',').filter(Boolean) : [],
          });
        }
      } catch (err) {
        console.error('Error fetching existing plan:', err);
        Swal.fire('เกิดข้อผิดพลาด', 'ไม่สามารถโหลดข้อมูลแผนการสอนเดิมได้', 'error');
      }
    };
    fetchExistingPlan();
    return () => {
      mounted = false;
    };
  }, [planid]);

  // Load curriculum indicators when subject area & grade level change
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
    return () => {
      mounted = false;
    };
  }, [teachSubjectId, gradeLevelId]);

  // SearchableSelect option arrays
  const teachSubjectSelectOptions = useMemo(
    () =>
      options.teachSubject.map((row) => ({
        value: String(row.teach_subject_id),
        label: row.teach_subject,
      })),
    [options.teachSubject]
  );

  const gradeLevelSelectOptions = useMemo(
    () =>
      options.gradeLevel.map((row) => ({
        value: String(row.grade_level_id),
        label: row.grade_level_name,
      })),
    [options.gradeLevel]
  );

  // Filtered indicators for Step 4 live search
  const filteredMidIndicators = useMemo(() => {
    const q = midSearch.trim().toLowerCase();
    if (!q) return indicators.mid;
    return indicators.mid.filter(
      (ind) =>
        String(ind.indicators_name || '').toLowerCase().includes(q) ||
        String(ind.indicator_group || '').toLowerCase().includes(q) ||
        String(ind.indicators_details || '').toLowerCase().includes(q)
    );
  }, [indicators.mid, midSearch]);

  const filteredFinalIndicators = useMemo(() => {
    const q = finalSearch.trim().toLowerCase();
    if (!q) return indicators.final;
    return indicators.final.filter(
      (ind) =>
        String(ind.indicators_name || '').toLowerCase().includes(q) ||
        String(ind.indicator_group || '').toLowerCase().includes(q) ||
        String(ind.indicators_details || '').toLowerCase().includes(q)
    );
  }, [indicators.final, finalSearch]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => {
      const updated = { ...prev, [name]: value };
      if ((name === 'teach_timestart' || name === 'teach_timeend') && updated.teach_timestart && updated.teach_timeend) {
        const [sh, sm] = updated.teach_timestart.split(':').map(Number);
        const [eh, em] = updated.teach_timeend.split(':').map(Number);
        const diff = eh * 60 + em - (sh * 60 + sm);
        if (diff > 0) {
          updated.teach_minute = String(diff);
        }
      }
      return updated;
    });
  };

  const toggleArrayField = (fieldName, itemValue) => {
    setForm((prev) => {
      const current = new Set(Array.isArray(prev[fieldName]) ? prev[fieldName] : []);
      if (current.has(itemValue)) {
        current.delete(itemValue);
      } else {
        current.add(itemValue);
      }
      return { ...prev, [fieldName]: Array.from(current) };
    });
  };

  const handleSelectVisibleIndicators = (fieldName, visibleList) => {
    setForm((prev) => {
      const next = new Set(Array.isArray(prev[fieldName]) ? prev[fieldName] : []);
      visibleList.forEach((ind) => {
        if (ind.indicators_name) next.add(ind.indicators_name);
      });
      return { ...prev, [fieldName]: Array.from(next) };
    });
    showToast(`เลือกตัวชี้วัดที่แสดงจำนวน ${visibleList.length} รายการแล้ว`, 'success');
  };

  const handleClearIndicators = (fieldName) => {
    setForm((prev) => ({ ...prev, [fieldName]: [] }));
    showToast('ล้างการเลือกตัวชี้วัดแล้ว', 'info');
  };

  const handleAutoCalcMinutes = () => {
    if (!form.teach_timestart || !form.teach_timeend) {
      showToast('กรุณาระบุเวลาเริ่มและเวลาเสร็จก่อนคำนวณ', 'info');
      return;
    }
    const [sh, sm] = form.teach_timestart.split(':').map(Number);
    const [eh, em] = form.teach_timeend.split(':').map(Number);
    const diff = eh * 60 + em - (sh * 60 + sm);
    if (diff > 0) {
      setForm((prev) => ({ ...prev, teach_minute: String(diff) }));
      showToast(`คำนวณเวลาสอนได้ ${diff} นาที`, 'success');
    } else {
      showToast('เวลาเสร็จต้องมากกว่าเวลาเริ่มสอน', 'warning');
    }
  };

  const validateStep = (stepNumber) => {
    setValidatedSteps((prev) => ({ ...prev, [stepNumber]: true }));

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
        showToast('กรุณาระบุเวลาเริ่มและเวลาเสร็จให้ครบถ้วน', 'warning');
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
    } else if (stepNumber === 6) {
      if (!file && !existingPlanFile) {
        setFileError('กรุณาเลือกไฟล์แผนการจัดการเรียนรู้ (.pdf) ขนาดไม่เกิน 25 MB');
        showToast('กรุณาแนบไฟล์แผนการจัดการเรียนรู้ (PDF)', 'warning');
        return false;
      }
      if (fileError) {
        showToast(fileError, 'warning');
        return false;
      }
    }
    return true;
  };

  const handleApplyKPAPreset = () => {
    setForm((prev) => ({
      ...prev,
      objectives_knowledge:
        prev.objectives_knowledge ||
        `ผู้เรียนมีความรู้ความเข้าใจเกี่ยวกับ ${prev.subject_content || 'เนื้อหาบทเรียน'} และสามารถอธิบายหลักการสำคัญได้อย่างถูกต้อง`,
      objectives_process:
        prev.objectives_process ||
        `ผู้เรียนสามารถฝึกปฏิบัติ คิดวิเคราะห์ และประยุกต์ใช้กระบวนการทำงานร่วมกับผู้อื่นได้อย่างมีประสิทธิภาพ`,
      objectives_attribute: prev.objectives_attribute || `ผู้เรียนมีวินัย ใฝ่เรียนรู้ และมุ่งมั่นในการทำงาน`,
    }));
    showToast('แทรกข้อความตัวอย่าง K-P-A เรียบร้อยแล้ว', 'success');
  };

  const handleApplyActivitiesPreset = () => {
    const totalMin = form.teach_minute ? parseInt(form.teach_minute, 10) : 50;
    const introMin = Math.round(totalMin * 0.2);
    const bodyMin = Math.round(totalMin * 0.6);
    const conclMin = totalMin - introMin - bodyMin;

    setForm((prev) => ({
      ...prev,
      learning_activities:
        prev.learning_activities ||
        `1. ขั้นนำเข้าสู่บทเรียน (${introMin} นาที):\n- ครูทบทวนความรู้เดิม กระตุ้นความสนใจด้วยคำถามหรือสถานการณ์จำลอง\n- แจ้งจุดประสงค์การเรียนรู้และกิจกรรมที่จะปฏิบัติ\n\n` +
          `2. ขั้นจัดกิจกรรมการเรียนรู้ (${bodyMin} นาที):\n- นักเรียนศึกษาใบความรู้/สื่อการเรียนรู้ และร่วมกันอภิปรายในกลุ่ม\n- นักเรียนลงมือปฏิบัติกิจกรรม/ทำใบงาน โดยครูคอยให้คำแนะนำและอำนวยความสะดวก\n- ตัวแทนกลุ่มนำเสนอผลงานและร่วมกันแลกเปลี่ยนเรียนรู้\n\n` +
          `3. ขั้นสรุปและประเมินผล (${conclMin} นาที):\n- ครูและนักเรียนร่วมกันสรุปองค์ความรู้สำคัญของบทเรียน\n- ทำแบบทดสอบท้ายบทหรือประเมินผลงานตามเกณฑ์รูบริกส์`,
    }));
    showToast('แทรกตัวอย่างขั้นตอนการจัดกิจกรรม 3 ขั้น เรียบร้อยแล้ว', 'success');
  };

  const handleApplyMeasurementPreset = () => {
    setForm((prev) => ({
      ...prev,
      Measurement_how:
        prev.Measurement_how ||
        `1. การตรวจใบงานและชิ้นงาน\n2. การสังเกตพฤติกรรมการมีส่วนร่วมในการจัดกิจกรรม\n3. การประเมินการนำเสนอผลงานกลุ่ม`,
      Measurement_tools:
        prev.Measurement_tools ||
        `1. แบบประเมินใบงาน/ชิ้นงาน\n2. แบบสังเกตพฤติกรรมการทำงานกลุ่ม\n3. แบบประเมินคุณลักษณะอันพึงประสงค์`,
      Measurement_scoring:
        prev.Measurement_scoring ||
        `เกณฑ์รูบริกส์ (Rubric Assessment) 4 ระดับคุณภาพ:\n- ระดับ 4 (ดีมาก) = ได้คะแนนร้อยละ 80 ขึ้นไป\n- ระดับ 3 (ดี) = ได้คะแนนร้อยละ 70 - 79\n- ระดับ 2 (พอใช้) = ได้คะแนนร้อยละ 60 - 69\n- ระดับ 1 (ปรับปรุง) = ได้คะแนนต่ำกว่าร้อยละ 60`,
      Measurement_outcomes:
        prev.Measurement_outcomes ||
        `ผู้เรียนต้องได้ผลการประเมินในระดับคุณภาพ 2 (พอใช้) ขึ้นไป หรือคิดเป็นร้อยละ 70 ของคะแนนเต็ม จึงจะถือว่าผ่านเกณฑ์การประเมิน`,
    }));
    showToast('แทรกตัวอย่างการวัดและประเมินผลเรียบร้อยแล้ว', 'success');
  };

  const handleApplyMediaPreset = () => {
    setForm((prev) => ({
      ...prev,
      instructional_media:
        prev.instructional_media ||
        `1. สไลด์นำเสนอประกอบการสอน (Canva / PowerPoint)\n2. ใบความรู้และใบกิจกรรมการเรียนรู้\n3. วีดิทัศน์ประกอบการจัดการเรียนรู้ (YouTube)\n4. แหล่งเรียนรู้ออนไลน์และห้องสมุดโรงเรียน`,
    }));
    showToast('แทรกตัวอย่างสื่อและแหล่งเรียนรู้เรียบร้อยแล้ว', 'success');
  };

  const handleNextStep = () => {
    if (!validateStep(currentStep)) return;
    setMaxCompletedStep((prev) => Math.max(prev, currentStep));
    if (currentStep < WIZARD_STEPS.length) {
      setCurrentStep((prev) => prev + 1);
      window.scrollTo({ top: 100, behavior: 'smooth' });
    }
  };

  const handlePrevStep = () => {
    if (currentStep > 1) {
      setCurrentStep((prev) => prev - 1);
      window.scrollTo({ top: 100, behavior: 'smooth' });
    }
  };

  const handleStepClick = (targetStep) => {
    if (targetStep === currentStep) return;
    if (targetStep > currentStep) {
      for (let s = currentStep; s < targetStep; s += 1) {
        if (!validateStep(s)) {
          setCurrentStep(s);
          return;
        }
        setMaxCompletedStep((prev) => Math.max(prev, s));
      }
    }
    setCurrentStep(targetStep);
    window.scrollTo({ top: 100, behavior: 'smooth' });
  };

  const handleFileChange = (e) => {
    const selected = e.target.files?.[0] || null;
    setFileError('');
    if (!selected) {
      setFile(null);
      return;
    }
    if (!selected.name.toLowerCase().endsWith('.pdf') && selected.type !== 'application/pdf') {
      setFile(null);
      setFileError('อนุญาตเฉพาะไฟล์เอกสารนามสกุล .pdf เท่านั้น');
      e.target.value = '';
      showToast('ไฟล์ต้องเป็นนามสกุล .pdf เท่านั้น', 'error');
      return;
    }
    if (selected.size > MAX_PDF_BYTES) {
      const sizeMb = (selected.size / (1024 * 1024)).toFixed(2);
      setFile(null);
      setFileError(`ขนาดไฟล์ (${sizeMb} MB) เกินขีดจำกัดสูงสุด ${MAX_PDF_MB} MB กรุณาบีบอัดไฟล์ PDF ก่อนอัปโหลด`);
      e.target.value = '';
      showToast(`ขนาดไฟล์เกิน ${MAX_PDF_MB} MB`, 'error');
      return;
    }
    setFile(selected);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    for (let s = 1; s <= WIZARD_STEPS.length; s += 1) {
      if (!validateStep(s)) {
        setCurrentStep(s);
        return;
      }
    }

    if (!profile?.people_id) {
      Swal.fire('ข้อผิดพลาด', 'ไม่พบข้อมูลผู้ใช้งาน กรุณาเข้าสู่ระบบใหม่อีกครั้ง', 'error');
      return;
    }

    if (planid && existingOwnerId && !isAdmin && String(existingOwnerId) !== String(profile.people_id)) {
      Swal.fire('ไม่มีสิทธิ์แก้ไข', 'ท่านสามารถแก้ไขได้เฉพาะแผนการจัดการเรียนรู้ของตนเองเท่านั้น', 'error');
      return;
    }

    if (planid && !isAdmin && !['1', '3', '4'].includes(String(existingPlanStatus))) {
      Swal.fire('ไม่สามารถแก้ไขได้', 'แผนการสอนนี้ผ่านการอนุมัติหรือเข้าสู่การประเมินแล้ว จึงถูกล็อคการแก้ไข', 'warning');
      return;
    }

    setSaving(true);
    setUploadStage(file ? 1 : 3);
    setUploadPercent(file ? 20 : 75);

    try {
      let driveUrl = existingPlanFile;
      if (file) {
        setUploadStage(2);
        setUploadPercent(55);
        const planFilename = `${profile.people_id}_${getFileTimestamp()}.pdf`;
        driveUrl = await uploadToDrive(file, { filename: planFilename });
        setUploadPercent(85);
      }

      setUploadStage(3);
      setUploadPercent(92);

      const eduYear = parseInt(config.EDUYEAR, 10) || new Date().getFullYear() + 543;
      const eduTerm = parseInt(config.EDUROUND, 10) || 1;
      const budgetYear = parseInt(config.BUDGET_YEAR, 10) || eduYear;
      const teachDate = normalizeThaiDate(form.teach_date);

      // Re-submitting a rejected plan (status '3') resets plan_status back to '1' (รอ ผอ. ตรวจ)
      const nextStatus = planid
        ? String(existingPlanStatus) === '3'
          ? '1'
          : String(existingPlanStatus || '1')
        : '1';

      const payload = {
        people_id: planid && existingOwnerId ? existingOwnerId : profile.people_id,
        school_code: profile.school,
        teach_subject_id: form.teach_subject_id,
        grade_level_id: form.grade_level_id,
        subject_type: form.subject_type,
        edu_year: eduYear,
        edu_term: eduTerm,
        budget_year: budgetYear,
        subject_code: form.subject_code.trim(),
        subject_name: form.subject_name.trim(),
        subject_content: form.subject_content.trim(),
        subject_name_plan: form.subject_name_plan.trim(),
        teach_date: teachDate || null,
        teach_timestart: form.teach_timestart,
        teach_timeend: form.teach_timeend,
        teach_minute: parseInt(form.teach_minute, 10) || 0,
        learning_model: form.learning_model.trim(),
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
        plan_status: nextStatus,
        ...(String(existingPlanStatus) === '3' ? { plan_approve: '' } : {}),
      };

      let insertedPlanId = planid;
      if (planid) {
        const { error } = await supabase.from('tbl_sendplan').update(payload).eq('planid', planid);
        if (error) throw error;
      } else {
        const { data: insertedData, error } = await supabase
          .from('tbl_sendplan')
          .insert([
            {
              ...payload,
              plan_clip: '',
              committee1: '',
              committee2: '',
              committee3: '',
              committee4: '',
              committee5: '',
            },
          ])
          .select('planid')
          .single();
        if (error) throw error;
        if (insertedData) {
          insertedPlanId = insertedData.planid;
        }
      }

      setUploadPercent(100);

      if (draftKey && !planid) {
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
        title: planid
          ? String(existingPlanStatus) === '3'
            ? 'แก้ไขและส่งแผนการสอนใหม่สำเร็จ!'
            : 'บันทึกการแก้ไขแผนสำเร็จ!'
          : 'ส่งแผนการจัดการเรียนรู้สำเร็จ!',
        subtitle: 'ท่านสามารถส่งการแจ้งเตือนหาผู้อำนวยการโรงเรียนผ่าน LINE เพื่อให้ตรวจอนุมัติได้ทันที',
        messageText: lineMsg,
        onClose: () => {
          navigate('/statusplan');
        },
      });
    } catch (err) {
      console.error(err);
      Swal.fire('เกิดข้อผิดพลาด', err.message || 'ไม่สามารถบันทึกแผนการสอนได้ กรุณาลองอีกครั้ง', 'error');
    } finally {
      setSaving(false);
      setUploadStage(0);
    }
  };

  const renderNavActions = (stepNum) => (
    <div className="wizard-nav-actions mt-3">
      <div className="d-flex align-items-center flex-wrap" style={{ gap: '8px' }}>
        {stepNum > 1 && (
          <button type="button" className="btn btn-light border font-weight-bold px-3" onClick={handlePrevStep} disabled={saving}>
            <i className="fa-solid fa-arrow-left mr-1"></i> ย้อนกลับ
          </button>
        )}
        <span className="text-muted small">
          ขั้นตอนที่ <strong>{stepNum}</strong> จาก <strong>{WIZARD_STEPS.length}</strong>
        </span>
      </div>

      <div className="d-flex align-items-center flex-wrap" style={{ gap: '8px' }}>
        {!planid && (
          <button
            type="button"
            className="btn btn-outline-secondary btn-sm font-weight-semibold"
            onClick={handleDiscardDraft}
            disabled={saving}
            title="ล้างข้อมูลร่างในฟอร์มเพื่อเริ่มใหม่"
          >
            <i className="fa-solid fa-eraser mr-1"></i> ล้างข้อมูลร่าง
          </button>
        )}
        <Link to="/statusplan" className="btn btn-outline-danger btn-sm font-weight-semibold">
          <i className="fa-solid fa-xmark mr-1"></i> ยกเลิก
        </Link>
        {stepNum < WIZARD_STEPS.length ? (
          <button type="button" className="btn btn-primary font-weight-bold px-4 shadow-sm" onClick={handleNextStep}>
            ถัดไป <i className="fa-solid fa-arrow-right ml-1"></i>
          </button>
        ) : (
          <button
            type="submit"
            className="btn btn-success font-weight-bold px-4 shadow-sm"
            id="btn_submit"
            disabled={saving || (planid && !isAdmin && !['1', '3', '4'].includes(String(existingPlanStatus)))}
          >
            {saving ? (
              <>
                <span className="spinner-border spinner-border-sm mr-2" role="status" aria-hidden="true"></span>
                กำลังอัปโหลดและบันทึก...
              </>
            ) : (
              <>
                <i className={planid ? 'fa-solid fa-paper-plane mr-1' : 'fa-solid fa-paper-plane mr-1'}></i>
                {planid
                  ? String(existingPlanStatus) === '3'
                    ? 'บันทึกการแก้ไขและส่งตรวจใหม่'
                    : 'บันทึกการแก้ไขแผน'
                  : 'ส่งแผนการจัดการเรียนรู้'}
              </>
            )}
          </button>
        )}
      </div>
    </div>
  );

  if (profileLoading || loading) {
    return <LoadingSpinner message="กำลังเตรียมแบบฟอร์มแผนการจัดการเรียนรู้..." />;
  }

  if (!profile) {
    return <EmptyState title="ไม่พบข้อมูลผู้ใช้งาน" message="กรุณาเข้าสู่ระบบใหม่อีกครั้งเพื่อจัดส่งแผนการจัดการเรียนรู้" type="warning" />;
  }

  const isRevisionMode = Boolean(planid && (String(existingPlanStatus) === '3' || existingDsComment.trim()));
  const isLockedEdit = Boolean(planid && !isAdmin && !['1', '3', '4'].includes(String(existingPlanStatus)));
  const isStep1Validated = Boolean(validatedSteps[1]);
  const isStep3Validated = Boolean(validatedSteps[3]);
  const isStep6Validated = Boolean(validatedSteps[6]);

  return (
    <div className="sendplan">
      <div className="row">
        <div className="col-12">
          {/* Revision Alert Banner for Rejected Plans (plan_status === '3' or plan_ds_comment) */}
          {isRevisionMode && (
            <div className="sendplan-revision-banner" role="alert">
              <div className="d-flex justify-content-between align-items-start flex-wrap gap-2">
                <div className="d-flex align-items-center gap-2">
                  <span
                    className="rounded-circle d-inline-flex align-items-center justify-content-center bg-danger text-white flex-shrink-0"
                    style={{ width: '36px', height: '36px' }}
                  >
                    <i className="fa-solid fa-rotate-left"></i>
                  </span>
                  <div>
                    <h5 className="font-weight-bold text-danger mb-0" style={{ fontSize: '1.02rem' }}>
                      {String(existingPlanStatus) === '3'
                        ? `แผนการสอน #${planid} ถูกส่งกลับให้แก้ไขปรับปรุง`
                        : `ข้อเสนอแนะจากผู้อำนวยการสถานศึกษา (แผน #${planid})`}
                    </h5>
                    <small className="text-muted">
                      เมื่อท่านปรับปรุงข้อมูลหรืออัปโหลดไฟล์ PDF ใหม่แล้ว กดปุ่ม &ldquo;บันทึกการแก้ไขและส่งตรวจใหม่&rdquo; ระบบจะส่งให้ ผอ. พิจารณาอีกครั้งโดยอัตโนมัติ
                    </small>
                  </div>
                </div>
                <StatusBadge status={existingPlanStatus} />
              </div>

              {existingDsComment.trim() ? (
                <div className="sendplan-revision-comment">
                  <div className="small font-weight-bold text-danger mb-1">
                    <i className="fa-solid fa-comment-dots mr-1"></i> ข้อเสนอแนะจากผู้อำนวยการ:
                  </div>
                  {existingDsComment}
                </div>
              ) : (
                <div className="sendplan-revision-comment">
                  กรุณาตรวจสอบความครบถ้วนของแผนการจัดการเรียนรู้และไฟล์แนบ PDF ก่อนส่งให้ผู้อำนวยการตรวจอีกครั้ง
                </div>
              )}
            </div>
          )}

          {isLockedEdit && (
            <div className="alert alert-warning border shadow-sm mb-3">
              <i className="fa-solid fa-lock mr-2"></i>
              <strong>แผนการสอนนี้ถูกล็อคการแก้ไข:</strong> เนื่องจากแผนได้รับการอนุมัติหรืออยู่ระหว่างการประเมินของคณะกรรมการแล้ว
            </div>
          )}

          {/* Restore Draft Banner (New Plan Only) */}
          {draftInfo && !isDraftDismissed && !planid && (
            <div
              className="alert alert-light border shadow-sm mb-3 d-flex flex-wrap align-items-center justify-content-between p-3"
              style={{ borderLeft: '4px solid #4f46e5', borderRadius: '12px' }}
            >
              <div>
                <h6 className="font-weight-bold mb-1 text-dark">
                  <i className="fa-solid fa-cloud-arrow-down mr-2 text-primary"></i>
                  พบแบบร่างแผนการสอนที่บันทึกอัตโนมัติไว้ล่าสุด
                </h6>
                <div className="small text-muted">
                  บันทึกเมื่อ: {new Date(draftInfo.savedAt).toLocaleDateString('th-TH')} เวลา{' '}
                  {new Date(draftInfo.savedAt).toLocaleTimeString('th-TH')}
                  {draftInfo.form?.subject_name_plan ? ` • แผน: "${draftInfo.form.subject_name_plan}"` : ''}
                </div>
              </div>
              <div className="mt-2 mt-md-0 d-flex" style={{ gap: '8px' }}>
                <button type="button" className="btn btn-sm btn-primary font-weight-bold" onClick={handleRestoreDraft}>
                  <i className="fa-solid fa-rotate-left mr-1"></i> กู้คืนข้อมูลร่าง
                </button>
                <button type="button" className="btn btn-sm btn-outline-secondary" onClick={handleDiscardDraft}>
                  <i className="fa-solid fa-trash-can mr-1"></i> ล้างข้อมูลร่าง
                </button>
              </div>
            </div>
          )}

          {/* Unified SaaS Step Wizard */}
          <div className="wizard-stepper-container">
            <div className="wizard-top-meta">
              <div className="d-flex align-items-center flex-wrap" style={{ gap: '8px' }}>
                <span className="wizard-step-counter">
                  <i className="fa-solid fa-layer-group mr-1"></i>
                  ขั้นตอนที่ {currentStep} จาก {WIZARD_STEPS.length}: {WIZARD_STEPS[currentStep - 1]?.title}
                </span>
                {planid && (
                  <span className="badge badge-light border text-dark px-2 py-1">
                    โหมดแก้ไขแผน #{planid}
                  </span>
                )}
              </div>

              {lastSavedTime ? (
                <span className="wizard-autosave-pill">
                  <i className="fa-solid fa-cloud-check mr-1"></i>
                  บันทึกร่างอัตโนมัติเมื่อ {lastSavedTime}
                </span>
              ) : !planid ? (
                <span className="text-muted small">
                  <i className="fa-regular fa-floppy-disk mr-1"></i> ระบบบันทึกร่างให้อัตโนมัติขณะพิมพ์
                </span>
              ) : null}
            </div>

            <div className="wizard-progress-bar">
              <div
                className="wizard-progress-fill"
                style={{ width: `${((currentStep - 1) / (WIZARD_STEPS.length - 1)) * 100}%` }}
              />
            </div>

            <div className="wizard-steps">
              {WIZARD_STEPS.map((step) => {
                const isCompleted = step.id < currentStep || step.id <= maxCompletedStep;
                const isActive = currentStep === step.id;
                return (
                  <button
                    key={step.id}
                    type="button"
                    className={`wizard-step-item ${isActive ? 'active' : ''} ${!isActive && isCompleted ? 'completed' : ''}`}
                    onClick={() => handleStepClick(step.id)}
                  >
                    <div className="wizard-step-badge">
                      {!isActive && isCompleted ? <i className="fa-solid fa-check"></i> : step.id}
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

          {/* Compact Teacher Context Strip */}
          <div className="card border shadow-none mb-3" style={{ borderRadius: '12px', background: '#f8fafc' }}>
            <div className="card-body py-2 px-3">
              <div className="row align-items-center small">
                <div className="col-md-6 col-lg-3 py-1">
                  <span className="text-muted">ผู้จัดทำแผน:</span>{' '}
                  <strong className="text-dark">
                    {lookups.prefix[profile.prefix] || ''}
                    {profile.name} {profile.lastname}
                  </strong>
                </div>
                <div className="col-md-6 col-lg-3 py-1">
                  <span className="text-muted">ตำแหน่ง/วิทยฐานะ:</span>{' '}
                  <span className="text-dark">
                    {lookups.position[profile.position_id] || 'ครู'}
                    {lookups.academic[profile.academic_id] ? ` (${lookups.academic[profile.academic_id]})` : ''}
                  </span>
                </div>
                <div className="col-md-6 col-lg-3 py-1">
                  <span className="text-muted">สถานศึกษา:</span>{' '}
                  <span className="text-dark">{lookups.school[profile.school] || '-'}</span>
                </div>
                <div className="col-md-6 col-lg-3 py-1">
                  <span className="text-muted">กลุ่มสาระฯ:</span>{' '}
                  <span className="text-dark">{lookups.teachSubject[profile.teach_subject] || '-'}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Main Wizard Form — NO premature .was-validated on mount! */}
          <form onSubmit={handleSubmit} noValidate autoComplete="off">
            {/* ================= STEP 1: ข้อมูลรายวิชา & กำหนดการสอน ================= */}
            {currentStep === 1 && (
              <div className={isStep1Validated ? 'step-validated' : ''}>
                <div className="sendplan-section-card">
                  <div className="sendplan-section-header">
                    <h4 className="sendplan-section-title">
                      <span className="sendplan-section-icon">
                        <i className="fa-solid fa-graduation-cap"></i>
                      </span>
                      กลุ่มสาระการเรียนรู้ ระดับชั้น และประเภทรายวิชา
                    </h4>
                  </div>
                  <div className="sendplan-section-body">
                    <div className="row">
                      <div className="col-lg-4 mb-3">
                        <label className="font-weight-semibold">
                          กลุ่มสาระการเรียนรู้ <span className="text-danger">*</span>
                        </label>
                        <SearchableSelect
                          id="teach_subject_id"
                          name="teach_subject_id"
                          options={teachSubjectSelectOptions}
                          value={form.teach_subject_id}
                          onChange={(val) => setForm((prev) => ({ ...prev, teach_subject_id: val || '' }))}
                          placeholder="-- เลือกกลุ่มสาระการเรียนรู้ --"
                          searchPlaceholder="พิมพ์ชื่อกลุ่มสาระ..."
                          className={isStep1Validated && !form.teach_subject_id ? 'sendplan-invalid-field rounded' : ''}
                        />
                        {isStep1Validated && !form.teach_subject_id && (
                          <span className="sendplan-error-text">กรุณาเลือกกลุ่มสาระการเรียนรู้</span>
                        )}
                      </div>

                      <div className="col-lg-4 mb-3">
                        <label className="font-weight-semibold">
                          ระดับชั้นที่ทำการสอน <span className="text-danger">*</span>
                        </label>
                        <SearchableSelect
                          id="grade_level_id"
                          name="grade_level_id"
                          options={gradeLevelSelectOptions}
                          value={form.grade_level_id}
                          onChange={(val) => setForm((prev) => ({ ...prev, grade_level_id: val || '' }))}
                          placeholder="-- เลือกระดับชั้น --"
                          searchPlaceholder="พิมพ์ระดับชั้น เช่น ม.1..."
                          className={isStep1Validated && !form.grade_level_id ? 'sendplan-invalid-field rounded' : ''}
                        />
                        {isStep1Validated && !form.grade_level_id && (
                          <span className="sendplan-error-text">กรุณาเลือกระดับชั้นที่ทำการสอน</span>
                        )}
                      </div>

                      <div className="col-lg-4 mb-3">
                        <label htmlFor="subject_type" className="font-weight-semibold">
                          ประเภทวิชา <span className="text-danger">*</span>
                        </label>
                        <select
                          name="subject_type"
                          id="subject_type"
                          className="custom-select"
                          value={form.subject_type}
                          onChange={handleChange}
                        >
                          {options.subjectTypes.map((row) => (
                            <option key={row.subjecttype_id} value={row.subjecttype_id}>
                              {row.subjecttype_name}
                            </option>
                          ))}
                        </select>
                        {!needsIndicators && (
                          <small className="text-info mt-1 d-block">
                            <i className="fa-solid fa-circle-info mr-1"></i>
                            ประเภทรายวิชานี้ไม่บังคับระบุตัวชี้วัดระหว่างทาง/ปลายทาง
                          </small>
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                <div className="sendplan-section-card">
                  <div className="sendplan-section-header">
                    <h4 className="sendplan-section-title">
                      <span className="sendplan-section-icon">
                        <i className="fa-solid fa-book-bookmark"></i>
                      </span>
                      ข้อมูลรายวิชา วันเวลาที่สอน และรูปแบบการจัดการเรียนรู้
                    </h4>
                  </div>
                  <div className="sendplan-section-body">
                    <div className="row">
                      <div className="col-lg-3 mb-3">
                        <label htmlFor="subject_code" className="font-weight-semibold">
                          รหัสวิชา <span className="text-danger">*</span>
                        </label>
                        <input
                          list="subject_code_list"
                          type="text"
                          id="subject_code"
                          name="subject_code"
                          className={`form-control ${isStep1Validated && !form.subject_code.trim() ? 'sendplan-invalid-field' : ''}`}
                          placeholder="เช่น ท21101, ว31101"
                          value={form.subject_code}
                          onChange={handleChange}
                        />
                        <datalist id="subject_code_list">
                          {autoComplete.subjectCodes.map((code) => (
                            <option key={code} value={code} />
                          ))}
                        </datalist>
                        {isStep1Validated && !form.subject_code.trim() && (
                          <span className="sendplan-error-text">กรุณาระบุรหัสวิชา</span>
                        )}
                      </div>

                      <div className="col-lg-3 mb-3">
                        <label htmlFor="subject_name" className="font-weight-semibold">
                          ชื่อรายวิชา <span className="text-danger">*</span>
                        </label>
                        <input
                          list="subject_name_list"
                          type="text"
                          id="subject_name"
                          name="subject_name"
                          className={`form-control ${isStep1Validated && !form.subject_name.trim() ? 'sendplan-invalid-field' : ''}`}
                          placeholder="เช่น ภาษาไทยพื้นฐาน 1"
                          value={form.subject_name}
                          onChange={handleChange}
                        />
                        <datalist id="subject_name_list">
                          {autoComplete.subjectNames.map((name) => (
                            <option key={name} value={name} />
                          ))}
                        </datalist>
                        {isStep1Validated && !form.subject_name.trim() && (
                          <span className="sendplan-error-text">กรุณาระบุชื่อรายวิชา</span>
                        )}
                      </div>

                      <div className="col-lg-3 mb-3">
                        <label htmlFor="subject_content" className="font-weight-semibold">
                          ชื่อหน่วยการเรียนรู้ <span className="text-danger">*</span>
                        </label>
                        <input
                          type="text"
                          id="subject_content"
                          name="subject_content"
                          className={`form-control ${isStep1Validated && !form.subject_content.trim() ? 'sendplan-invalid-field' : ''}`}
                          placeholder="ระบุชื่อหน่วยการเรียนรู้"
                          value={form.subject_content}
                          onChange={handleChange}
                        />
                        {isStep1Validated && !form.subject_content.trim() && (
                          <span className="sendplan-error-text">กรุณาระบุหน่วยการเรียนรู้</span>
                        )}
                      </div>

                      <div className="col-lg-3 mb-3">
                        <label htmlFor="subject_name_plan" className="font-weight-semibold">
                          ชื่อแผนการจัดการเรียนรู้ <span className="text-danger">*</span>
                        </label>
                        <input
                          type="text"
                          id="subject_name_plan"
                          name="subject_name_plan"
                          className={`form-control ${isStep1Validated && !form.subject_name_plan.trim() ? 'sendplan-invalid-field' : ''}`}
                          placeholder="ระบุชื่อแผนการสอน"
                          value={form.subject_name_plan}
                          onChange={handleChange}
                        />
                        {isStep1Validated && !form.subject_name_plan.trim() && (
                          <span className="sendplan-error-text">กรุณาระบุชื่อแผนการสอน</span>
                        )}
                      </div>
                    </div>

                    <div className="row">
                      <div className="col-lg-5 mb-3">
                        <label className="font-weight-semibold">
                          วันที่ทำการสอน (พ.ศ.) <span className="text-danger">*</span>
                        </label>
                        <ThaiDatePicker
                          id="teach_date"
                          value={normalizeThaiDate(form.teach_date)}
                          onChange={(isoStr) => setForm((prev) => ({ ...prev, teach_date: isoStr }))}
                          mode="general"
                        />
                        {isStep1Validated && !form.teach_date && (
                          <span className="sendplan-error-text">กรุณาเลือกวันที่ทำการสอน</span>
                        )}
                      </div>

                      <div className="col-lg-2 col-sm-6 mb-3">
                        <label htmlFor="teach_timestart" className="font-weight-semibold">
                          เริ่มเวลา <span className="text-danger">*</span>
                        </label>
                        <input
                          type="time"
                          id="teach_timestart"
                          name="teach_timestart"
                          className={`form-control ${isStep1Validated && !form.teach_timestart ? 'sendplan-invalid-field' : ''}`}
                          value={form.teach_timestart}
                          onChange={handleChange}
                        />
                      </div>

                      <div className="col-lg-2 col-sm-6 mb-3">
                        <label htmlFor="teach_timeend" className="font-weight-semibold">
                          เสร็จเวลา <span className="text-danger">*</span>
                        </label>
                        <input
                          type="time"
                          id="teach_timeend"
                          name="teach_timeend"
                          className={`form-control ${isStep1Validated && !form.teach_timeend ? 'sendplan-invalid-field' : ''}`}
                          value={form.teach_timeend}
                          onChange={handleChange}
                        />
                      </div>

                      <div className="col-lg-3 mb-3">
                        <label htmlFor="teach_minute" className="font-weight-semibold">
                          เวลาที่ใช้สอน (นาที) <span className="text-danger">*</span>
                        </label>
                        <div className="input-group">
                          <input
                            type="number"
                            id="teach_minute"
                            name="teach_minute"
                            className={`form-control ${isStep1Validated && (!form.teach_minute || Number(form.teach_minute) <= 0) ? 'sendplan-invalid-field' : ''}`}
                            min="1"
                            max="300"
                            step="1"
                            placeholder="เช่น 50"
                            value={form.teach_minute}
                            onChange={handleChange}
                          />
                          <div className="input-group-append">
                            <button
                              type="button"
                              className="btn btn-outline-primary"
                              onClick={handleAutoCalcMinutes}
                              title="คำนวณนาทีอัตโนมัติ"
                            >
                              <i className="fa-solid fa-calculator"></i>
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="row">
                      <div className="col-12">
                        <label htmlFor="learning_model" className="font-weight-semibold">
                          วิธีการสอน / รูปแบบการจัดการเรียนรู้ <span className="text-danger">*</span>
                        </label>
                        <input
                          list="learning_model_list"
                          type="text"
                          id="learning_model"
                          name="learning_model"
                          className={`form-control ${isStep1Validated && !form.learning_model.trim() ? 'sendplan-invalid-field' : ''}`}
                          placeholder="เช่น การจัดการเรียนรู้เชิงรุก (Active Learning), สืบเสาะหาความรู้ 5Es, GPAS 5 Steps, PBL"
                          value={form.learning_model}
                          onChange={handleChange}
                        />
                        <datalist id="learning_model_list">
                          {options.learningModel.map((row) => (
                            <option key={row.model_id} value={row.model_name} />
                          ))}
                        </datalist>
                        {isStep1Validated && !form.learning_model.trim() && (
                          <span className="sendplan-error-text">กรุณาระบุวิธีการสอน / รูปแบบการจัดการเรียนรู้</span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                {renderNavActions(1)}
              </div>
            )}

            {/* ================= STEP 2: จุดประสงค์ & กิจกรรม (K-P-A) ================= */}
            {currentStep === 2 && (
              <div>
                <div className="sendplan-section-card">
                  <div className="sendplan-section-header">
                    <h4 className="sendplan-section-title">
                      <span className="sendplan-section-icon">
                        <i className="fa-solid fa-bullseye"></i>
                      </span>
                      จุดประสงค์การเรียนรู้ (K - P - A)
                    </h4>
                    <button
                      type="button"
                      className="btn btn-sm btn-outline-primary font-weight-semibold"
                      onClick={handleApplyKPAPreset}
                    >
                      <i className="fa-solid fa-wand-magic-sparkles mr-1"></i> แทรกโครงสร้าง K-P-A ตัวอย่าง
                    </button>
                  </div>
                  <div className="sendplan-section-body">
                    <div className="mb-3">
                      <label htmlFor="objectives_knowledge" className="font-weight-semibold text-dark">
                        1. ด้านความรู้ (Knowledge - K)
                      </label>
                      <textarea
                        className="form-control"
                        name="objectives_knowledge"
                        id="objectives_knowledge"
                        rows="3"
                        placeholder="ระบุองค์ความรู้หรือมโนทัศน์สำคัญที่ผู้เรียนจะได้รับ..."
                        value={form.objectives_knowledge}
                        onChange={handleChange}
                      />
                    </div>
                    <div className="mb-3">
                      <label htmlFor="objectives_process" className="font-weight-semibold text-dark">
                        2. ด้านทักษะและกระบวนการ (Process - P)
                      </label>
                      <textarea
                        className="form-control"
                        name="objectives_process"
                        id="objectives_process"
                        rows="3"
                        placeholder="ระบุทักษะการคิด การแก้ปัญหา หรือการลงมือปฏิบัติ..."
                        value={form.objectives_process}
                        onChange={handleChange}
                      />
                    </div>
                    <div>
                      <label htmlFor="objectives_attribute" className="font-weight-semibold text-dark">
                        3. ด้านคุณลักษณะอันพึงประสงค์ / เจตคติ (Attribute - A)
                      </label>
                      <textarea
                        className="form-control"
                        name="objectives_attribute"
                        id="objectives_attribute"
                        rows="3"
                        placeholder="ระบุคุณลักษณะหรือเจตคติที่ดีต่อการเรียนรู้..."
                        value={form.objectives_attribute}
                        onChange={handleChange}
                      />
                    </div>
                  </div>
                </div>

                <div className="sendplan-section-card">
                  <div className="sendplan-section-header">
                    <h4 className="sendplan-section-title">
                      <span className="sendplan-section-icon">
                        <i className="fa-solid fa-person-chalkboard"></i>
                      </span>
                      มาตรฐาน สาระสำคัญ และขั้นตอนการจัดกิจกรรมการเรียนรู้
                    </h4>
                    <button
                      type="button"
                      className="btn btn-sm btn-outline-primary font-weight-semibold"
                      onClick={handleApplyActivitiesPreset}
                    >
                      <i className="fa-solid fa-wand-magic-sparkles mr-1"></i> แทรกโครงสร้างกิจกรรม 3 ขั้น
                    </button>
                  </div>
                  <div className="sendplan-section-body">
                    <div className="row">
                      <div className="col-lg-6 mb-3">
                        <label htmlFor="learning_outcomes" className="font-weight-semibold">
                          มาตรฐานการเรียนรู้ / ผลการเรียนรู้
                        </label>
                        <textarea
                          className="form-control"
                          name="learning_outcomes"
                          id="learning_outcomes"
                          rows="4"
                          placeholder="ระบุมาตรฐานการเรียนรู้หรือผลการเรียนรู้ที่คาดหวัง..."
                          value={form.learning_outcomes}
                          onChange={handleChange}
                        />
                      </div>
                      <div className="col-lg-6 mb-3">
                        <label htmlFor="learning_content" className="font-weight-semibold">
                          สาระการเรียนรู้ / สาระสำคัญ
                        </label>
                        <textarea
                          className="form-control"
                          name="learning_content"
                          id="learning_content"
                          rows="4"
                          placeholder="ระบุสาระสำคัญหรือเนื้อหาหลักของบทเรียน..."
                          value={form.learning_content}
                          onChange={handleChange}
                        />
                      </div>
                    </div>

                    <div>
                      <label htmlFor="learning_activities" className="font-weight-semibold">
                        ขั้นตอนการจัดกิจกรรมการเรียนรู้และเวลาที่ใช้ (นาที)
                      </label>
                      <textarea
                        className="form-control"
                        name="learning_activities"
                        id="learning_activities"
                        rows="7"
                        placeholder="เช่น ขั้นนำ (10 นาที), ขั้นจัดกิจกรรมการเรียนรู้เชิงรุก (30 นาที), ขั้นสรุปและสะท้อนคิด (10 นาที)..."
                        value={form.learning_activities}
                        onChange={handleChange}
                      />
                    </div>
                  </div>
                </div>

                {renderNavActions(2)}
              </div>
            )}

            {/* ================= STEP 3: สมรรถนะ & สื่อการเรียนรู้ ================= */}
            {currentStep === 3 && (
              <div className={isStep3Validated ? 'step-validated' : ''}>
                <div className="sendplan-section-card">
                  <div className="sendplan-section-header">
                    <h4 className="sendplan-section-title">
                      <span className="sendplan-section-icon">
                        <i className="fa-solid fa-award"></i>
                      </span>
                      สมรรถนะสำคัญของผู้เรียน <span className="text-danger ml-1">*</span>
                    </h4>
                    <span className="badge badge-primary px-2 py-1">
                      เลือกแล้ว {form.competency.length} รายการ
                    </span>
                  </div>
                  <div className="sendplan-section-body">
                    <div className="sendplan-chip-grid">
                      {options.competency.map((row) => {
                        const val = String(row.competency_id);
                        const checked = form.competency.includes(val);
                        return (
                          <label key={val} className={`sendplan-chip-option ${checked ? 'selected' : ''}`}>
                            <input
                              type="checkbox"
                              className="mt-1"
                              checked={checked}
                              onChange={() => toggleArrayField('competency', val)}
                            />
                            <span>
                              <strong>{row.competency_id}.</strong> {row.competency_name}
                            </span>
                          </label>
                        );
                      })}
                    </div>
                    {isStep3Validated && form.competency.length === 0 && (
                      <span className="sendplan-error-text mt-2">
                        กรุณาเลือกสมรรถนะสำคัญของผู้เรียนอย่างน้อย 1 รายการ
                      </span>
                    )}
                  </div>
                </div>

                <div className="sendplan-section-card">
                  <div className="sendplan-section-header">
                    <h4 className="sendplan-section-title">
                      <span className="sendplan-section-icon">
                        <i className="fa-solid fa-lightbulb"></i>
                      </span>
                      ทักษะในศตวรรษที่ 21 (3Rs 8Cs) และคุณลักษณะอันพึงประสงค์
                    </h4>
                  </div>
                  <div className="sendplan-section-body">
                    <div className="mb-4">
                      <div className="d-flex justify-content-between align-items-center mb-2">
                        <label className="font-weight-semibold m-0">ทักษะในศตวรรษที่ 21 (3Rs 8Cs)</label>
                        <span className="badge badge-light border">เลือกแล้ว {form.ability21.length} รายการ</span>
                      </div>
                      <div className="sendplan-chip-grid">
                        {options.ability21.map((row) => {
                          const val = String(row.ability21_id);
                          const checked = form.ability21.includes(val);
                          return (
                            <label key={val} className={`sendplan-chip-option ${checked ? 'selected' : ''}`}>
                              <input
                                type="checkbox"
                                className="mt-1"
                                checked={checked}
                                onChange={() => toggleArrayField('ability21', val)}
                              />
                              <span>
                                <strong>{row.ability21_id}:</strong> {row.ability21_name_th}
                              </span>
                            </label>
                          );
                        })}
                      </div>
                    </div>

                    <div className="mb-4">
                      <div className="d-flex justify-content-between align-items-center mb-2">
                        <label className="font-weight-semibold m-0">คุณลักษณะอันพึงประสงค์</label>
                        <span className="badge badge-light border">เลือกแล้ว {form.desirable.length} รายการ</span>
                      </div>
                      <div className="sendplan-chip-grid">
                        {options.desirable.map((row) => {
                          const val = String(row.desirable_id);
                          const checked = form.desirable.includes(val);
                          return (
                            <label key={val} className={`sendplan-chip-option ${checked ? 'selected' : ''}`}>
                              <input
                                type="checkbox"
                                className="mt-1"
                                checked={checked}
                                onChange={() => toggleArrayField('desirable', val)}
                              />
                              <span>
                                <strong>{row.desirable_id}.</strong> {row.desirable_name}
                              </span>
                            </label>
                          );
                        })}
                      </div>
                    </div>

                    <div>
                      <div className="d-flex justify-content-between align-items-center mb-2">
                        <label htmlFor="instructional_media" className="font-weight-semibold m-0">
                          สื่อ นวัตกรรม และแหล่งการเรียนรู้
                        </label>
                        <button
                          type="button"
                          className="btn btn-sm btn-outline-secondary font-weight-semibold"
                          onClick={handleApplyMediaPreset}
                        >
                          <i className="fa-solid fa-wand-magic-sparkles mr-1"></i> แทรกตัวอย่างสื่อ
                        </button>
                      </div>
                      <textarea
                        className="form-control"
                        name="instructional_media"
                        id="instructional_media"
                        rows="3"
                        placeholder="เช่น สื่อนำเสนอ Canva, ใบกิจกรรม, ชุดฝึกปฏิบัติ, แหล่งเรียนรู้ในชุมชน..."
                        value={form.instructional_media}
                        onChange={handleChange}
                      />
                    </div>
                  </div>
                </div>

                {renderNavActions(3)}
              </div>
            )}

            {/* ================= STEP 4: ตัวชี้วัดระหว่างทาง & ปลายทาง ================= */}
            {currentStep === 4 && (
              <div>
                {!needsIndicators ? (
                  <div className="sendplan-section-card">
                    <div className="sendplan-section-header">
                      <h4 className="sendplan-section-title">
                        <span className="sendplan-section-icon">
                          <i className="fa-solid fa-circle-info"></i>
                        </span>
                        หมายเหตุสำหรับประเภทรายวิชาที่เลือก
                      </h4>
                    </div>
                    <div className="sendplan-section-body">
                      <div className="alert alert-info mb-0" style={{ borderRadius: '10px' }}>
                        <i className="fa-solid fa-circle-info mr-2"></i>
                        รายวิชาประเภท{' '}
                        <strong>
                          {options.subjectTypes.find((t) => t.subjecttype_id === form.subject_type)?.subjecttype_name ||
                            form.subject_type}
                        </strong>{' '}
                        ไม่จำเป็นต้องเลือกตัวชี้วัดระหว่างทางและตัวชี้วัดปลายทาง (สามารถใช้ผลการเรียนรู้ที่ระบุไว้ในขั้นตอนที่ 2 และกด &ldquo;ถัดไป&rdquo; ได้เลย)
                      </div>
                    </div>
                  </div>
                ) : !teachSubjectId || !gradeLevelId ? (
                  <EmptyState
                    title="ยังไม่ได้เลือกกลุ่มสาระหรือระดับชั้น"
                    message="กรุณาย้อนกลับไปขั้นตอนที่ 1 เพื่อเลือกกลุ่มสาระการเรียนรู้และระดับชั้นก่อนเลือกตัวชี้วัด"
                    type="warning"
                    actionLabel="ไปขั้นตอนที่ 1"
                    onAction={() => setCurrentStep(1)}
                  />
                ) : (
                  <>
                    {/* ตัวชี้วัดระหว่างทาง */}
                    <div className="sendplan-section-card">
                      <div className="sendplan-section-header">
                        <div className="d-flex align-items-center flex-wrap" style={{ gap: '8px' }}>
                          <h4 className="sendplan-section-title">
                            <span className="sendplan-section-icon">
                              <i className="fa-solid fa-flag"></i>
                            </span>
                            ตัวชี้วัดระหว่างทาง (Formative Indicators)
                          </h4>
                          <span className="badge badge-success px-2 py-1">
                            เลือกแล้ว {form.indicators_mid.length} / {indicators.mid.length} รายการ
                          </span>
                        </div>

                        <div className="d-flex flex-wrap align-items-center" style={{ gap: '6px' }}>
                          <button
                            type="button"
                            className="btn btn-xs btn-outline-primary font-weight-semibold px-2 py-1"
                            disabled={filteredMidIndicators.length === 0}
                            onClick={() => handleSelectVisibleIndicators('indicators_mid', filteredMidIndicators)}
                          >
                            <i className="fa-solid fa-check-double mr-1"></i> เลือกทั้งหมดที่แสดง ({filteredMidIndicators.length})
                          </button>
                          <button
                            type="button"
                            className="btn btn-xs btn-outline-secondary font-weight-semibold px-2 py-1"
                            disabled={form.indicators_mid.length === 0}
                            onClick={() => handleClearIndicators('indicators_mid')}
                          >
                            <i className="fa-solid fa-rotate-left mr-1"></i> ล้างการเลือก
                          </button>
                        </div>
                      </div>

                      <div className="sendplan-section-body">
                        <div className="input-group input-group-sm mb-3">
                          <div className="input-group-prepend">
                            <span className="input-group-text bg-white">
                              <i className="fa-solid fa-magnifying-glass text-muted"></i>
                            </span>
                          </div>
                          <input
                            type="text"
                            className="form-control"
                            placeholder="ค้นหารหัสตัวชี้วัด หรือคำสำคัญในตัวชี้วัดระหว่างทาง..."
                            value={midSearch}
                            onChange={(e) => setMidSearch(e.target.value)}
                          />
                          {midSearch && (
                            <div className="input-group-append">
                              <button type="button" className="btn btn-outline-secondary" onClick={() => setMidSearch('')}>
                                <i className="fa-solid fa-xmark"></i>
                              </button>
                            </div>
                          )}
                        </div>

                        {indicators.mid.length === 0 ? (
                          <div className="text-muted small py-3 text-center">
                            ไม่พบข้อมูลตัวชี้วัดระหว่างทางสำหรับกลุ่มสาระและระดับชั้นนี้
                          </div>
                        ) : filteredMidIndicators.length === 0 ? (
                          <div className="text-muted small py-3 text-center">
                            ไม่พบตัวชี้วัดระหว่างทางที่ตรงกับคำค้นหา &ldquo;{midSearch}&rdquo;
                          </div>
                        ) : (
                          <div className="indicator-scroll-box">
                            <div className="row">
                              {filteredMidIndicators.map((ind, idx) => {
                                const checked = form.indicators_mid.includes(ind.indicators_name);
                                return (
                                  <div className="col-lg-6 mb-2" key={`mid-${ind.indicators_name}-${idx}`}>
                                    <label className={`indicator-item-card ${checked ? 'checked' : ''}`}>
                                      <input
                                        type="checkbox"
                                        className="mt-1"
                                        checked={checked}
                                        onChange={() => toggleArrayField('indicators_mid', ind.indicators_name)}
                                      />
                                      <span className="small" style={{ lineHeight: 1.5 }}>
                                        <strong className="text-dark">{ind.indicators_name}</strong>
                                        {ind.indicator_group ? (
                                          <span className="badge badge-light border ml-1">{ind.indicator_group}</span>
                                        ) : null}
                                        <span className="d-block text-secondary mt-1">{ind.indicators_details}</span>
                                      </span>
                                    </label>
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* ตัวชี้วัดปลายทาง */}
                    <div className="sendplan-section-card">
                      <div className="sendplan-section-header">
                        <div className="d-flex align-items-center flex-wrap" style={{ gap: '8px' }}>
                          <h4 className="sendplan-section-title">
                            <span className="sendplan-section-icon">
                              <i className="fa-solid fa-flag-checkered"></i>
                            </span>
                            ตัวชี้วัดปลายทาง (Summative Indicators)
                          </h4>
                          <span className="badge badge-success px-2 py-1">
                            เลือกแล้ว {form.indicators_final.length} / {indicators.final.length} รายการ
                          </span>
                        </div>

                        <div className="d-flex flex-wrap align-items-center" style={{ gap: '6px' }}>
                          <button
                            type="button"
                            className="btn btn-xs btn-outline-primary font-weight-semibold px-2 py-1"
                            disabled={filteredFinalIndicators.length === 0}
                            onClick={() => handleSelectVisibleIndicators('indicators_final', filteredFinalIndicators)}
                          >
                            <i className="fa-solid fa-check-double mr-1"></i> เลือกทั้งหมดที่แสดง ({filteredFinalIndicators.length})
                          </button>
                          <button
                            type="button"
                            className="btn btn-xs btn-outline-secondary font-weight-semibold px-2 py-1"
                            disabled={form.indicators_final.length === 0}
                            onClick={() => handleClearIndicators('indicators_final')}
                          >
                            <i className="fa-solid fa-rotate-left mr-1"></i> ล้างการเลือก
                          </button>
                        </div>
                      </div>

                      <div className="sendplan-section-body">
                        <div className="input-group input-group-sm mb-3">
                          <div className="input-group-prepend">
                            <span className="input-group-text bg-white">
                              <i className="fa-solid fa-magnifying-glass text-muted"></i>
                            </span>
                          </div>
                          <input
                            type="text"
                            className="form-control"
                            placeholder="ค้นหารหัสตัวชี้วัด หรือคำสำคัญในตัวชี้วัดปลายทาง..."
                            value={finalSearch}
                            onChange={(e) => setFinalSearch(e.target.value)}
                          />
                          {finalSearch && (
                            <div className="input-group-append">
                              <button type="button" className="btn btn-outline-secondary" onClick={() => setFinalSearch('')}>
                                <i className="fa-solid fa-xmark"></i>
                              </button>
                            </div>
                          )}
                        </div>

                        {indicators.final.length === 0 ? (
                          <div className="text-muted small py-3 text-center">
                            ไม่พบข้อมูลตัวชี้วัดปลายทางสำหรับกลุ่มสาระและระดับชั้นนี้
                          </div>
                        ) : filteredFinalIndicators.length === 0 ? (
                          <div className="text-muted small py-3 text-center">
                            ไม่พบตัวชี้วัดปลายทางที่ตรงกับคำค้นหา &ldquo;{finalSearch}&rdquo;
                          </div>
                        ) : (
                          <div className="indicator-scroll-box">
                            <div className="row">
                              {filteredFinalIndicators.map((ind, idx) => {
                                const checked = form.indicators_final.includes(ind.indicators_name);
                                return (
                                  <div className="col-lg-6 mb-2" key={`final-${ind.indicators_name}-${idx}`}>
                                    <label className={`indicator-item-card ${checked ? 'checked' : ''}`}>
                                      <input
                                        type="checkbox"
                                        className="mt-1"
                                        checked={checked}
                                        onChange={() => toggleArrayField('indicators_final', ind.indicators_name)}
                                      />
                                      <span className="small" style={{ lineHeight: 1.5 }}>
                                        <strong className="text-dark">{ind.indicators_name}</strong>
                                        {ind.indicator_group ? (
                                          <span className="badge badge-light border ml-1">{ind.indicator_group}</span>
                                        ) : null}
                                        <span className="d-block text-secondary mt-1">{ind.indicators_details}</span>
                                      </span>
                                    </label>
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  </>
                )}

                {renderNavActions(4)}
              </div>
            )}

            {/* ================= STEP 5: การวัดและประเมินผลการเรียนรู้ ================= */}
            {currentStep === 5 && (
              <div>
                <div className="sendplan-section-card">
                  <div className="sendplan-section-header">
                    <h4 className="sendplan-section-title">
                      <span className="sendplan-section-icon">
                        <i className="fa-solid fa-clipboard-check"></i>
                      </span>
                      การวัดและประเมินผลการเรียนรู้ (ครบทั้ง 4 มิติ)
                    </h4>
                    <button
                      type="button"
                      className="btn btn-sm btn-outline-primary font-weight-semibold"
                      onClick={handleApplyMeasurementPreset}
                    >
                      <i className="fa-solid fa-wand-magic-sparkles mr-1"></i> แทรกตัวอย่างเกณฑ์การวัดผล
                    </button>
                  </div>
                  <div className="sendplan-section-body">
                    <div className="row">
                      <div className="col-lg-6 mb-3">
                        <label htmlFor="Measurement_how" className="font-weight-semibold">
                          1. วิธีการวัดและประเมินผล
                        </label>
                        <textarea
                          className="form-control"
                          name="Measurement_how"
                          id="Measurement_how"
                          rows="4"
                          placeholder="เช่น การตรวจชิ้นงาน/ใบงาน, การสังเกตพฤติกรรมการทำงานกลุ่ม..."
                          value={form.Measurement_how}
                          onChange={handleChange}
                        />
                      </div>
                      <div className="col-lg-6 mb-3">
                        <label htmlFor="Measurement_tools" className="font-weight-semibold">
                          2. เครื่องมือวัดและประเมินผล
                        </label>
                        <textarea
                          className="form-control"
                          name="Measurement_tools"
                          id="Measurement_tools"
                          rows="4"
                          placeholder="เช่น แบบประเมินรูบริกส์ชิ้นงาน, แบบสังเกตพฤติกรรม..."
                          value={form.Measurement_tools}
                          onChange={handleChange}
                        />
                      </div>
                      <div className="col-lg-6 mb-3 mb-lg-0">
                        <label htmlFor="Measurement_scoring" className="font-weight-semibold">
                          3. เกณฑ์การให้คะแนน (Scoring Rubric)
                        </label>
                        <textarea
                          className="form-control"
                          name="Measurement_scoring"
                          id="Measurement_scoring"
                          rows="4"
                          placeholder="เช่น ระดับคุณภาพ 4 ระดับ (ดีมาก, ดี, พอใช้, ปรับปรุง)..."
                          value={form.Measurement_scoring}
                          onChange={handleChange}
                        />
                      </div>
                      <div className="col-lg-6">
                        <label htmlFor="Measurement_outcomes" className="font-weight-semibold">
                          4. เกณฑ์การตัดสินผลการเรียนรู้
                        </label>
                        <textarea
                          className="form-control"
                          name="Measurement_outcomes"
                          id="Measurement_outcomes"
                          rows="4"
                          placeholder="เช่น ผู้เรียนได้คะแนนร้อยละ 70 ขึ้นไป หรือระดับพอใช้ขึ้นไปถือว่าผ่านเกณฑ์..."
                          value={form.Measurement_outcomes}
                          onChange={handleChange}
                        />
                      </div>
                    </div>
                  </div>
                </div>

                {renderNavActions(5)}
              </div>
            )}

            {/* ================= STEP 6: ตรวจสอบสรุป & แนบไฟล์ PDF ================= */}
            {currentStep === 6 && (
              <div className={isStep6Validated ? 'step-validated' : ''}>
                {/* Summary Review Card */}
                <div className="sendplan-section-card">
                  <div className="sendplan-section-header">
                    <h4 className="sendplan-section-title">
                      <span className="sendplan-section-icon">
                        <i className="fa-solid fa-magnifying-glass-chart"></i>
                      </span>
                      สรุปข้อมูลสำคัญของแผนการจัดการเรียนรู้ (ตรวจสอบก่อนยืนยันส่ง)
                    </h4>
                    <button
                      type="button"
                      className="btn btn-xs btn-outline-secondary"
                      onClick={() => setCurrentStep(1)}
                    >
                      <i className="fa-solid fa-pen mr-1"></i> แก้ไขข้อมูลวิชา
                    </button>
                  </div>
                  <div className="sendplan-section-body">
                    <div className="row small" style={{ rowGap: '10px' }}>
                      <div className="col-md-6">
                        <span className="text-muted">รายวิชา:</span>{' '}
                        <strong className="text-dark">
                          {form.subject_code || '-'} {form.subject_name || '-'}
                        </strong>
                      </div>
                      <div className="col-md-6">
                        <span className="text-muted">กลุ่มสาระ / ชั้น:</span>{' '}
                        <strong className="text-dark">
                          {lookups.teachSubject[form.teach_subject_id] || '-'} •{' '}
                          {options.gradeLevel.find((g) => String(g.grade_level_id) === String(form.grade_level_id))
                            ?.grade_level_name || '-'}
                        </strong>
                      </div>
                      <div className="col-md-6">
                        <span className="text-muted">หน่วยการเรียนรู้:</span>{' '}
                        <strong className="text-dark">{form.subject_content || '-'}</strong>
                      </div>
                      <div className="col-md-6">
                        <span className="text-muted">ชื่อแผนการสอน:</span>{' '}
                        <strong className="text-primary">{form.subject_name_plan || '-'}</strong>
                      </div>
                      <div className="col-md-6">
                        <span className="text-muted">กำหนดการสอน:</span>{' '}
                        <strong className="text-dark">
                          {form.teach_date || '-'} ({form.teach_timestart || '--:--'} - {form.teach_timeend || '--:--'} น. •{' '}
                          {form.teach_minute || 0} นาที)
                        </strong>
                      </div>
                      <div className="col-md-6">
                        <span className="text-muted">รูปแบบการจัดการเรียนรู้:</span>{' '}
                        <strong className="text-dark">{form.learning_model || '-'}</strong>
                      </div>
                      <div className="col-md-12 pt-2 border-top d-flex flex-wrap" style={{ gap: '8px' }}>
                        <span className="badge badge-light border px-2 py-1">
                          สมรรถนะสำคัญ: <strong>{form.competency.length}</strong> รายการ
                        </span>
                        <span className="badge badge-light border px-2 py-1">
                          ทักษะศตวรรษที่ 21: <strong>{form.ability21.length}</strong> รายการ
                        </span>
                        <span className="badge badge-light border px-2 py-1">
                          คุณลักษณะฯ: <strong>{form.desirable.length}</strong> รายการ
                        </span>
                        {needsIndicators && (
                          <>
                            <span className="badge badge-light border px-2 py-1">
                              ตัวชี้วัดระหว่างทาง: <strong>{form.indicators_mid.length}</strong> ข้อ
                            </span>
                            <span className="badge badge-light border px-2 py-1">
                              ตัวชี้วัดปลายทาง: <strong>{form.indicators_final.length}</strong> ข้อ
                            </span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                {/* File Upload Card */}
                <div className="sendplan-section-card">
                  <div className="sendplan-section-header">
                    <h4 className="sendplan-section-title">
                      <span className="sendplan-section-icon">
                        <i className="fa-solid fa-file-pdf text-danger"></i>
                      </span>
                      แนบไฟล์เอกสารแผนการจัดการเรียนรู้ฉบับเต็ม (.PDF){' '}
                      {!existingPlanFile && <span className="text-danger ml-1">*</span>}
                    </h4>
                    <span className="badge badge-light border text-muted">ขนาดไฟล์สูงสุดไม่เกิน {MAX_PDF_MB} MB</span>
                  </div>

                  <div className="sendplan-section-body">
                    {planid && existingPlanFile && (
                      <div
                        className="alert alert-light border d-flex justify-content-between align-items-center flex-wrap mb-3"
                        style={{ borderRadius: '10px', gap: '10px' }}
                      >
                        <div>
                          <i className="fa-solid fa-file-circle-check text-success mr-2"></i>
                          <strong>มีไฟล์แผนการสอนเดิมในระบบแล้ว</strong>
                          <span className="text-muted small d-block">
                            หากไม่ต้องการเปลี่ยนไฟล์ สามารถกดบันทึกการแก้ไขได้ทันที หรือเลือกไฟล์ใหม่ด้านล่างเพื่อทับไฟล์เดิม
                          </span>
                        </div>
                        <a
                          href={existingPlanFile}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="btn btn-sm btn-outline-primary font-weight-bold"
                        >
                          <i className="fa-regular fa-file-pdf mr-1 text-danger"></i> เปิดดูไฟล์ PDF เดิม
                        </a>
                      </div>
                    )}

                    <div
                      className={`sendplan-upload-zone ${file ? 'has-file' : ''} ${
                        isStep6Validated && !file && !existingPlanFile ? 'sendplan-invalid-field' : ''
                      }`}
                    >
                      <div className="mb-2">
                        <i
                          className={`fa-solid ${file ? 'fa-file-circle-check text-success' : 'fa-cloud-arrow-up text-primary'}`}
                          style={{ fontSize: '2.2rem' }}
                        ></i>
                      </div>
                      <h6 className="font-weight-bold text-dark mb-1">
                        {file ? `พร้อมอัปโหลด: ${file.name}` : 'เลือกไฟล์แผนการจัดการเรียนรู้ (.pdf)'}
                      </h6>
                      <p className="text-muted small mb-3">
                        {file
                          ? `ขนาดไฟล์ ${(file.size / (1024 * 1024)).toFixed(2)} MB • นามสกุล PDF ถูกต้อง`
                          : `รองรับเฉพาะไฟล์ .pdf ขนาดไม่เกิน ${MAX_PDF_MB} MB`}
                      </p>

                      <div className="d-flex justify-content-center align-items-center flex-wrap" style={{ gap: '8px' }}>
                        <label htmlFor="plan_file" className="btn btn-primary btn-sm font-weight-bold px-3 m-0" style={{ cursor: 'pointer' }}>
                          <i className="fa-solid fa-folder-open mr-1"></i> {file ? 'เปลี่ยนไฟล์ PDF' : 'เลือกไฟล์ PDF จากเครื่อง'}
                        </label>
                        {file && !saving && (
                          <button
                            type="button"
                            className="btn btn-outline-secondary btn-sm"
                            onClick={() => {
                              setFile(null);
                              const inputEl = document.getElementById('plan_file');
                              if (inputEl) inputEl.value = '';
                            }}
                          >
                            <i className="fa-solid fa-xmark mr-1"></i> ยกเลิกไฟล์ที่เลือก
                          </button>
                        )}
                      </div>

                      <input
                        type="file"
                        name="plan_file"
                        id="plan_file"
                        className="d-none"
                        accept="application/pdf,.pdf"
                        onChange={handleFileChange}
                        disabled={saving}
                      />
                    </div>

                    {fileError && (
                      <div className="alert alert-danger py-2 px-3 mt-3 mb-0 small" style={{ borderRadius: '10px' }}>
                        <i className="fa-solid fa-triangle-exclamation mr-1"></i> {fileError}
                      </div>
                    )}

                    {/* Smooth Visual Upload Progress Stepper while saving */}
                    {saving && (
                      <div className="sendplan-upload-progress">
                        <div className="d-flex justify-content-between align-items-center mb-2">
                          <strong className="text-primary small">
                            <span className="spinner-border spinner-border-sm mr-2" role="status" aria-hidden="true"></span>
                            {uploadStage === 1 && 'ขั้นตอน 1/3: กำลังตรวจสอบและเตรียมไฟล์ PDF...'}
                            {uploadStage === 2 && 'ขั้นตอน 2/3: กำลังอัปโหลดไฟล์ PDF ขึ้นระบบจัดเก็บเอกสารออนไลน์...'}
                            {uploadStage === 3 && 'ขั้นตอน 3/3: กำลังบันทึกข้อมูลแผนการสอนลงฐานข้อมูล...'}
                          </strong>
                          <span className="badge badge-primary">{uploadPercent}%</span>
                        </div>
                        <div className="progress" style={{ height: '8px', borderRadius: '999px' }}>
                          <div
                            className="progress-bar progress-bar-striped progress-bar-animated bg-primary"
                            role="progressbar"
                            style={{ width: `${uploadPercent}%` }}
                            aria-valuenow={uploadPercent}
                            aria-valuemin="0"
                            aria-valuemax="100"
                          />
                        </div>
                        <div className="d-flex justify-content-between text-muted mt-2" style={{ fontSize: '0.75rem' }}>
                          <span className={uploadStage >= 1 ? 'text-primary font-weight-bold' : ''}>
                            1. เตรียมเอกสาร
                          </span>
                          <span className={uploadStage >= 2 ? 'text-primary font-weight-bold' : ''}>
                            2. อัปโหลดไฟล์ PDF
                          </span>
                          <span className={uploadStage >= 3 ? 'text-success font-weight-bold' : ''}>
                            3. บันทึกแผนสำเร็จ
                          </span>
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {renderNavActions(6)}
              </div>
            )}
          </form>
        </div>
      </div>
    </div>
  );
};

export default SendPlan;
