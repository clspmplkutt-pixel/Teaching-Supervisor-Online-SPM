import React, { useEffect, useState, useMemo, useCallback, lazy, Suspense } from 'react';
import { Link } from 'react-router-dom';
import Swal from 'sweetalert2';
import { supabase } from '../supabaseClient';
import { useAuth } from '../contexts/AuthContext';
import { useUserProfile } from '../hooks/useUserProfile';
import useUserLookups from '../hooks/useUserLookups';
import {
  calculatePlanScoreFromRows,
  getQualityBadge,
  extractYouTubeId,
  getYouTubeWatchUrl,
  getYouTubeEmbedUrl,
} from '../utils/scoreCalculator';
import './TeacherDashboard.css';

const CertificateModal = lazy(() => import('../components/CertificateModal'));

const PLAN_STATUS_NAMES = {
  '1': 'รอ ผอ. อนุมัติแผน',
  '2': 'ผอ. อนุมัติแล้ว • รอบันทึกคลิปการสอน',
  '3': 'ผอ. ส่งกลับให้แก้ไขแผนการสอน',
  '4': 'ส่งแก้ไขแล้ว • รอ ผอ. ตรวจซ้ำ',
  '5': 'ส่งคลิปแล้ว • รอคณะกรรมการนิเทศ',
  '6': 'คณะกรรมการกำลังประเมิน',
  '7': 'ประเมินเสร็จสมบูรณ์',
};

const TIMELINE_STEPS = [
  { key: 1, label: 'ส่งแผน', icon: 'fa-file-arrow-up' },
  { key: 2, label: 'ผอ. อนุมัติ', icon: 'fa-user-check' },
  { key: 3, label: 'คลิป/บันทึก', icon: 'fa-video' },
  { key: 4, label: 'กำลังประเมิน', icon: 'fa-list-check' },
  { key: 5, label: 'เสร็จสมบูรณ์', icon: 'fa-award' },
];

const getTimelineStep = (status) => {
  const s = Number(status);
  if (s === 3) return 2; // Rejected at Director review step
  if (s === 1 || s === 4) return 2; // Waiting for Director review
  if (s === 2) return 3; // Approved, waiting for clip
  if (s === 5 || s === 6) return 4; // Clip sent / Committee evaluating (NOT step 5!)
  if (s === 7) return 5; // Completed
  return 1;
};

/* ─── Skeleton Loader ─── */
const SkeletonLoader = () => (
  <div className="teacher-workspace-container" style={{ opacity: 0.6 }}>
    <div className="skeleton-hero" />
    <div className="row g-3 mb-4">
      {[1, 2, 3, 4].map((i) => (
        <div key={i} className="col-6 col-xl-3"><div className="skeleton-card" /></div>
      ))}
    </div>
    {[1, 2].map((i) => (
      <div key={i} className="skeleton-plan-card" />
    ))}
  </div>
);

/* ─── Donut Progress Ring ─── */
const ProgressRing = ({ value, size = 64, strokeWidth = 6, color = '#10b981' }) => {
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (value / 100) * circumference;

  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="progress-ring-svg">
      <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke="rgba(255,255,255,0.15)" strokeWidth={strokeWidth} />
      <circle
        cx={size / 2} cy={size / 2} r={radius}
        fill="none" stroke={color} strokeWidth={strokeWidth}
        strokeDasharray={circumference} strokeDashoffset={offset}
        strokeLinecap="round"
        transform={`rotate(-90 ${size / 2} ${size / 2})`}
        style={{ transition: 'stroke-dashoffset 1s cubic-bezier(0.16, 1, 0.3, 1)' }}
      />
      <text x="50%" y="50%" textAnchor="middle" dy="0.35em" fill="#fff" fontSize={size * 0.22} fontWeight="800">
        {Math.round(value)}%
      </text>
    </svg>
  );
};

/* ─── Compact Step Badge ─── */
const StepBadge = ({ status, currentStep, totalSteps = 5 }) => {
  const isRejected = Number(status) === 3;
  const stepInfo = TIMELINE_STEPS[currentStep - 1] || TIMELINE_STEPS[0];
  const isComplete = !isRejected && currentStep >= totalSteps;

  if (isRejected) {
    return (
      <div
        className="step-badge-compact step-rejected"
        aria-label="สถานะ: ผอ.ส่งกลับให้แก้ไข"
      >
        <div className="step-badge-dots">
          {TIMELINE_STEPS.map((s, i) => (
            <div
              key={s.key}
              className={`step-dot ${i === 0 ? 'filled' : ''} ${i === 1 ? 'rejected' : ''}`}
            />
          ))}
        </div>
        <span className="step-badge-label">
          <i className="fa-solid fa-rotate-left"></i>
          ผอ.ส่งกลับให้แก้ไข
        </span>
      </div>
    );
  }

  return (
    <div
      className={`step-badge-compact ${isComplete ? 'step-complete' : 'step-active'}`}
      aria-label={`ขั้นตอนที่ ${currentStep} จาก ${totalSteps}: ${stepInfo.label}`}
      role="progressbar"
      aria-valuenow={currentStep}
      aria-valuemin={1}
      aria-valuemax={totalSteps}
    >
      <div className="step-badge-dots">
        {TIMELINE_STEPS.map((s, i) => (
          <div
            key={s.key}
            className={`step-dot ${i + 1 < currentStep || isComplete ? 'filled' : ''} ${i + 1 === currentStep && !isComplete ? 'current' : ''}`}
          />
        ))}
      </div>
      <span className="step-badge-label">
        <i className={`fa-solid ${stepInfo.icon}`}></i>
        {isComplete ? 'เสร็จสมบูรณ์' : `${currentStep}/${totalSteps} • ${stepInfo.label}`}
      </span>
    </div>
  );
};

/* ═══════════════════════════════════════════════════════════════════════════
   MAIN COMPONENT
   ═══════════════════════════════════════════════════════════════════════════ */
const InfoTeacher = () => {
  const { user } = useAuth();
  const { profile, loading: profileLoading } = useUserProfile();
  const { lookups, loading: lookupsLoading } = useUserLookups();

  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(null);
  const [plans, setPlans] = useState([]);
  const [scores, setScores] = useState([]);
  const [committeeProfiles, setCommitteeProfiles] = useState({});
  const [directorProfile, setDirectorProfile] = useState(null);
  const [learningModelsMap, setLearningModelsMap] = useState({});
  const [selectedYear, setSelectedYear] = useState('ALL');
  const [selectedPlanForCert, setSelectedPlanForCert] = useState(null);
  const [expandedCards, setExpandedCards] = useState({});
  const [editClipModal, setEditClipModal] = useState({ open: false, plan: null });
  const [editClipUrl, setEditClipUrl] = useState('');
  const [activeTab, setActiveTab] = useState('active'); // 'active' | 'completed'

  const teacherPeopleId = profile?.people_id || user?.user_metadata?.people_id || user?.email || '';
  const teacherSchoolId = profile?.school || user?.user_metadata?.school || '';

  const toggleCardExpand = (planid) => {
    setExpandedCards((prev) => ({ ...prev, [planid]: !prev[planid] }));
  };

  const editClipVideoId = useMemo(() => extractYouTubeId(editClipUrl), [editClipUrl]);
  const editClipEmbedSrc = useMemo(() => getYouTubeEmbedUrl(editClipUrl), [editClipUrl]);

  /* ─── Open Edit Clip Modal ─── */
  const openEditClipModal = useCallback((plan) => {
    setEditClipUrl(plan.plan_clip ? getYouTubeWatchUrl(plan.plan_clip) : '');
    setEditClipModal({ open: true, plan });
  }, []);

  /* ─── Data Loading ─── */
  const loadTeacherData = useCallback(async () => {
    if (!teacherPeopleId) {
      setLoading(false);
      return;
    }

    setLoading(true);
    setLoadError(null);
    try {
      const [plansRes, modelsRes, dirRes] = await Promise.all([
        supabase
          .from('tbl_sendplan')
          .select('*')
          .eq('people_id', teacherPeopleId)
          .order('plan_senddate', { ascending: false }),
        supabase
          .from('tbl_learningModel')
          .select('model_id, model_name'),
        teacherSchoolId
          ? supabase
              .from('tbl_Users')
              .select('id, people_id, prefix, name, lastname, position_id, academic_id, school, signature, level')
              .eq('school', teacherSchoolId)
              .in('position_id', ['10007', '10006'])
          : Promise.resolve({ data: [] }),
      ]);

      if (plansRes.error) throw plansRes.error;
      const planList = plansRes.data || [];
      setPlans(planList);

      const mMap = {};
      (modelsRes.data || []).forEach((m) => {
        if (m.model_id != null) mMap[String(m.model_id)] = m.model_name;
      });
      setLearningModelsMap(mMap);

      // Prefer School Director (10007), fallback to Acting/Deputy if no 10007 row
      const dirCandidates = dirRes.data || [];
      const exactDirector =
        dirCandidates.find((d) => String(d.position_id) === '10007') ||
        dirCandidates[0] ||
        null;
      setDirectorProfile(exactDirector);

      const planIds = planList.map((p) => String(p.planid));
      if (planIds.length > 0) {
        const { data: scoreData, error: scoreErr } = await supabase
          .from('tbl_sendplan_score')
          .select('*')
          .in('planid', planIds);
        if (!scoreErr) setScores(scoreData || []);
      } else {
        setScores([]);
      }

      const committeeIds = new Set();
      planList.forEach((p) => {
        [p.committee1, p.committee2, p.committee3, p.committee4, p.committee5]
          .filter(Boolean)
          .forEach((c) => committeeIds.add(String(c).trim()));
      });

      if (committeeIds.size > 0) {
        const { data: cUsers } = await supabase
          .from('tbl_Users')
          .select('people_id, prefix, name, lastname, academic_id, position_id, school, signature')
          .in('people_id', Array.from(committeeIds));

        const cMap = {};
        (cUsers || []).forEach((u) => {
          cMap[String(u.people_id)] = u;
        });
        setCommitteeProfiles(cMap);
      } else {
        setCommitteeProfiles({});
      }
    } catch (err) {
      console.error('InfoTeacher load error:', err);
      setLoadError(err.message || 'เกิดข้อผิดพลาดในการโหลดข้อมูล');
    } finally {
      setLoading(false);
    }
  }, [teacherPeopleId, teacherSchoolId]);

  /* ─── Save Edited Clip ─── */
  const handleSaveClip = useCallback(async () => {
    const plan = editClipModal.plan;
    if (!plan) return;

    const clipId = extractYouTubeId(editClipUrl);
    if (!clipId) {
      Swal.fire({
        icon: 'warning',
        title: 'กรุณากรอกลิงก์ YouTube ที่ถูกต้อง',
        text: 'วาง URL ของ YouTube เพื่ออัปเดตคลิปการสอน',
        confirmButtonColor: '#6366f1',
      });
      return;
    }

    const result = await Swal.fire({
      icon: 'question',
      title: 'ยืนยันแก้ไขคลิป?',
      text: 'คลิปเดิมจะถูกแทนที่ด้วยลิงก์ใหม่',
      showCancelButton: true,
      confirmButtonText: 'ยืนยัน',
      cancelButtonText: 'ยกเลิก',
      confirmButtonColor: '#6366f1',
    });

    if (!result.isConfirmed) return;

    try {
      const { error } = await supabase
        .from('tbl_sendplan')
        .update({ plan_clip: clipId })
        .eq('planid', plan.planid);

      if (error) throw error;

      Swal.fire({
        icon: 'success',
        title: 'แก้ไขสำเร็จ',
        text: 'คลิปการสอนถูกอัปเดตเรียบร้อยแล้ว',
        timer: 2000,
        showConfirmButton: false,
      });
      setEditClipModal({ open: false, plan: null });
      loadTeacherData();
    } catch (err) {
      console.error('Edit clip error:', err);
      Swal.fire({ icon: 'error', title: 'เกิดข้อผิดพลาด', text: 'ไม่สามารถแก้ไขคลิปได้ กรุณาลองอีกครั้ง' });
    }
  }, [editClipModal, editClipUrl, loadTeacherData]);

  /* ─── Delete Clip ─── */
  const handleDeleteClip = useCallback(async (plan) => {
    const result = await Swal.fire({
      icon: 'warning',
      title: 'ลบคลิปการสอน?',
      html: `<p>คลิปวิดีโอของแผน <strong>${plan.subject_name}</strong> จะถูกลบ</p><p style="color:#64748b;font-size:0.9em">สถานะจะกลับเป็น "รอส่งคลิป" เพื่อให้คุณส่งคลิปใหม่ได้</p>`,
      showCancelButton: true,
      confirmButtonText: 'ลบคลิป',
      cancelButtonText: 'ยกเลิก',
      confirmButtonColor: '#dc2626',
    });

    if (!result.isConfirmed) return;

    try {
      const { error } = await supabase
        .from('tbl_sendplan')
        .update({ plan_clip: null, plan_status: '2' })
        .eq('planid', plan.planid);

      if (error) throw error;

      Swal.fire({
        icon: 'success',
        title: 'ลบคลิปสำเร็จ',
        text: 'คุณสามารถส่งคลิปใหม่ได้แล้ว',
        timer: 2000,
        showConfirmButton: false,
      });
      loadTeacherData();
    } catch (err) {
      console.error('Delete clip error:', err);
      Swal.fire({ icon: 'error', title: 'เกิดข้อผิดพลาด', text: 'ไม่สามารถลบคลิปได้ กรุณาลองอีกครั้ง' });
    }
  }, [loadTeacherData]);

  useEffect(() => {
    if (!profileLoading && teacherPeopleId) loadTeacherData();
  }, [profileLoading, teacherPeopleId, loadTeacherData]);

  /* ─── Close modals on Escape ─── */
  useEffect(() => {
    if (!editClipModal.open) return undefined;
    const handleEsc = (e) => {
      if (e.key === 'Escape') setEditClipModal({ open: false, plan: null });
    };
    window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
  }, [editClipModal.open]);

  /* ─── Computed Values ─── */
  const academicYears = useMemo(() => {
    const set = new Set();
    plans.forEach((p) => {
      if (p.edu_year) set.add(String(p.edu_year).trim());
    });
    return Array.from(set).sort().reverse();
  }, [plans]);

  const filteredPlans = useMemo(() => {
    if (selectedYear === 'ALL') return plans;
    return plans.filter((p) => String(p.edu_year).trim() === String(selectedYear).trim());
  }, [plans, selectedYear]);

  const activePlans = useMemo(() => filteredPlans.filter((p) => Number(p.plan_status) !== 7), [filteredPlans]);
  const completedPlans = useMemo(() => filteredPlans.filter((p) => Number(p.plan_status) === 7), [filteredPlans]);

  const totalPlansCount = filteredPlans.length;
  const approvedCount = useMemo(
    () =>
      filteredPlans.filter(
        (p) =>
          (p.plan_approve === '1' || p.plan_approve === 1 || Number(p.plan_status) >= 2) &&
          Number(p.plan_status) !== 3 &&
          Number(p.plan_status) !== 4
      ).length,
    [filteredPlans]
  );
  const evaluatingCount = useMemo(
    () => filteredPlans.filter((p) => [5, 6].includes(Number(p.plan_status))).length,
    [filteredPlans]
  );
  const completedCount = completedPlans.length;

  const planScoreMap = useMemo(() => {
    const rowsByPlan = {};
    scores.forEach((s) => {
      const pid = String(s.planid);
      if (!rowsByPlan[pid]) rowsByPlan[pid] = [];
      rowsByPlan[pid].push(s);
    });
    const result = {};
    Object.entries(rowsByPlan).forEach(([pid, rows]) => {
      const calc = calculatePlanScoreFromRows(rows);
      if (calc.evaluatorCount > 0 && calc.percentage > 0) {
        result[pid] = calc.percentage;
      }
    });
    return result;
  }, [scores]);

  const overallAvgScore = useMemo(() => {
    const filteredIds = new Set(filteredPlans.map((p) => String(p.planid)));
    const scoredValues = Object.entries(planScoreMap)
      .filter(([pid, val]) => filteredIds.has(pid) && val > 0)
      .map(([, val]) => val);
    if (scoredValues.length === 0) return 0;
    const sum = scoredValues.reduce((acc, v) => acc + v, 0);
    return Math.round((sum / scoredValues.length) * 10) / 10;
  }, [planScoreMap, filteredPlans]);

  const completionPercent = useMemo(() => {
    if (totalPlansCount === 0) return 0;
    return Math.round((completedCount / totalPlansCount) * 100);
  }, [completedCount, totalPlansCount]);

  // Urgent actions strictly requiring Teacher action (excludes status == 1 waiting for Director)
  const todoItems = useMemo(() => {
    const items = [];
    filteredPlans.forEach((p) => {
      const s = Number(p.plan_status);
      if (s === 3) {
        items.push({
          type: 'revision',
          plan: p,
          priority: 1,
          icon: 'fa-pen-to-square',
          color: '#dc2626',
          bgColor: '#fef2f2',
          borderColor: '#fecdd3',
          label: 'แก้ไขแผนตามข้อเสนอแนะ ผอ.',
          desc: p.plan_ds_comment || 'ผู้อำนวยการส่งกลับให้ปรับปรุงรายละเอียดแผนการจัดการเรียนรู้',
          link: `/sendplan?planid=${p.planid}`,
        });
      } else if (s === 2) {
        items.push({
          type: 'clip',
          plan: p,
          priority: 2,
          icon: 'fa-video',
          color: '#d97706',
          bgColor: '#fffbeb',
          borderColor: '#fde68a',
          label: 'บันทึกคลิปการสอนและบันทึกหลังสอน',
          desc: 'ผอ. อนุมัติแผนแล้ว — แนบลิงก์คลิป YouTube เพื่อให้คณะกรรมการดำเนินการประเมิน',
          link: `/send_clip?planid=${p.planid}`,
        });
      }
    });
    return items.sort((a, b) => a.priority - b.priority);
  }, [filteredPlans]);

  const enrichedLookups = useMemo(
    () => ({
      ...lookups,
      learningModel: {
        ...(lookups?.learningModel || {}),
        ...learningModelsMap,
      },
    }),
    [lookups, learningModelsMap]
  );

  /* ─── Loading State ─── */
  const isLoading = profileLoading || lookupsLoading || loading;
  if (isLoading) return <SkeletonLoader />;

  /* ─── Display Names ─── */
  const cleanTeacherTitle = (prefix, name, lastname) => {
    const rawPrefix = lookups?.prefix?.[prefix] || '';
    const cleanPrefix = rawPrefix.replace(/^(นาย|นางสาว|นาง)\s*/, '');
    const cleanName = (name || '').trim().replace(/^(นาย|นางสาว|นาง)\s*/, '');
    if (cleanPrefix) return `${cleanPrefix}${cleanName} ${lastname || ''}`.trim();
    return `${cleanName} ${lastname || ''}`.trim();
  };
  const teacherDisplayName = cleanTeacherTitle(profile?.prefix, profile?.name, profile?.lastname);
  const teacherFullName = `${lookups?.prefix?.[profile?.prefix] || ''}${profile?.name || ''} ${profile?.lastname || ''}`.trim();
  const schoolName = lookups?.school?.[profile?.school] || 'โรงเรียน';
  const academicName = lookups?.academic?.[profile?.academic_id] || 'ไม่มีวิทยฐานะ';
  const subjectAreaName = lookups?.teachSubject?.[profile?.teach_subject] || profile?.teach_subject_name || 'กลุ่มสาระการเรียนรู้';

  const currentPlans = activeTab === 'active' ? activePlans : completedPlans;

  /* ─── Greeting by Time ─── */
  const getGreeting = () => {
    const h = new Date().getHours();
    if (h < 12) return 'สวัสดีตอนเช้า';
    if (h < 17) return 'สวัสดีตอนบ่าย';
    return 'สวัสดีตอนเย็น';
  };

  /* ═══════════════════════════════════════════════════════
     RENDER
     ═══════════════════════════════════════════════════════ */
  return (
    <div className="teacher-workspace-container">

      {/* ─── COMPACT HERO ─── */}
      <div className="tw-hero no-print">
        <div className="tw-hero-content">
          <div className="tw-hero-left">
            <div className="tw-hero-avatar">
              <i className="fa-solid fa-chalkboard-user"></i>
            </div>
            <div className="tw-hero-info">
              <div className="tw-hero-badges">
                <span className="tw-hero-badge">
                  <i className="fa-solid fa-school"></i> {schoolName}
                </span>
                <span className="tw-hero-badge accent">
                  <i className="fa-solid fa-graduation-cap"></i> {academicName}
                </span>
              </div>
              <h2 className="tw-hero-title">{getGreeting()}, คุณครู{teacherDisplayName}</h2>
              <p className="tw-hero-subtitle">
                {subjectAreaName} • {totalPlansCount > 0 ? `${totalPlansCount} แผนในระบบ` : 'ยังไม่มีแผนในระบบ'}
              </p>
            </div>
          </div>
          <div className="tw-hero-right">
            {totalPlansCount > 0 && (
              <ProgressRing value={completionPercent} size={68} color="#34d399" />
            )}
            <div className="tw-hero-actions">
              <div className="tw-year-switcher">
                <button
                  type="button"
                  onClick={() => setSelectedYear('ALL')}
                  className={`tw-year-btn ${selectedYear === 'ALL' ? 'active' : ''}`}
                  aria-label="แสดงทุกปีการศึกษา"
                >
                  ทุกปี
                </button>
                {academicYears.map((yr) => (
                  <button
                    key={yr}
                    type="button"
                    onClick={() => setSelectedYear(yr)}
                    className={`tw-year-btn ${selectedYear === yr ? 'active' : ''}`}
                    aria-label={`แสดงปีการศึกษา ${yr}`}
                  >
                    {yr}
                  </button>
                ))}
              </div>
              <Link to="/sendplan" className="tw-btn-primary" aria-label="ส่งแผนการสอนใหม่">
                <i className="fa-solid fa-plus"></i> ส่งแผนใหม่
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* ─── ERROR RECOVERY ─── */}
      {loadError && (
        <div className="tw-error-banner no-print">
          <i className="fa-solid fa-circle-exclamation"></i>
          <span>{loadError}</span>
          <button type="button" onClick={loadTeacherData} className="tw-btn-retry">
            <i className="fa-solid fa-rotate-right"></i> ลองอีกครั้ง
          </button>
        </div>
      )}

      {/* ─── KPI CARDS (Show only when data exists) ─── */}
      {totalPlansCount > 0 && (
        <div className="tw-kpi-grid no-print">
          <div className="tw-kpi-card tw-kpi-highlight">
            <div className="tw-kpi-icon" style={{ background: 'linear-gradient(135deg, #6366f1, #818cf8)' }}>
              <i className="fa-solid fa-bullseye"></i>
            </div>
            <div className="tw-kpi-body">
              <span className="tw-kpi-value">{todoItems.length}</span>
              <span className="tw-kpi-label">งานด่วนต้องทำ</span>
            </div>
            {todoItems.length > 0 && <span className="tw-kpi-ping"></span>}
          </div>
          <div className="tw-kpi-card">
            <div className="tw-kpi-icon" style={{ background: 'linear-gradient(135deg, #10b981, #34d399)' }}>
              <i className="fa-solid fa-circle-check"></i>
            </div>
            <div className="tw-kpi-body">
              <span className="tw-kpi-value">
                {approvedCount}
                <span className="tw-kpi-unit">/{totalPlansCount}</span>
              </span>
              <span className="tw-kpi-label">ผอ. อนุมัติแล้ว</span>
            </div>
          </div>
          <div className="tw-kpi-card">
            <div className="tw-kpi-icon" style={{ background: 'linear-gradient(135deg, #f59e0b, #fbbf24)' }}>
              <i className="fa-solid fa-user-pen"></i>
            </div>
            <div className="tw-kpi-body">
              <span className="tw-kpi-value">{evaluatingCount}</span>
              <span className="tw-kpi-label">กำลังประเมิน</span>
            </div>
          </div>
          <div className="tw-kpi-card">
            <div className="tw-kpi-icon" style={{ background: 'linear-gradient(135deg, #8b5cf6, #a78bfa)' }}>
              <i className="fa-solid fa-trophy"></i>
            </div>
            <div className="tw-kpi-body">
              <span className="tw-kpi-value">{overallAvgScore > 0 ? overallAvgScore : '—'}</span>
              <span className="tw-kpi-label">{overallAvgScore > 0 ? 'คะแนนเฉลี่ย' : 'รอคะแนน'}</span>
            </div>
          </div>
        </div>
      )}

      {/* ─── TODAY'S TO-DO (Urgent Teacher Actions Only) ─── */}
      {todoItems.length > 0 && (
        <div className="tw-todo-section no-print">
          <div className="tw-section-header">
            <h3 className="tw-section-title">
              <i className="fa-solid fa-bell" style={{ color: '#f59e0b' }}></i>
              สิ่งที่ต้องดำเนินการทันที
              <span className="tw-todo-count">{todoItems.length}</span>
            </h3>
          </div>
          <div className="tw-todo-list">
            {todoItems.map((item) => (
              <div
                key={`${item.type}-${item.plan.planid}`}
                className="tw-todo-card"
                style={{ borderLeftColor: item.color }}
              >
                <div className="tw-todo-icon" style={{ background: item.bgColor, color: item.color }}>
                  <i className={`fa-solid ${item.icon}`}></i>
                </div>
                <div className="tw-todo-body">
                  <div className="tw-todo-title">
                    <strong>{item.label}</strong>
                    <span className="tw-todo-subject">
                      {item.plan.subject_name} ({item.plan.subject_code})
                    </span>
                  </div>
                  <p className="tw-todo-desc">{item.desc}</p>
                </div>
                {item.link && (
                  <Link
                    to={item.link}
                    className="tw-todo-action"
                    style={{ background: item.color }}
                    aria-label={item.label}
                  >
                    <i className="fa-solid fa-arrow-right"></i>
                  </Link>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ─── PLAN STREAM (Tabbed) ─── */}
      <div className="tw-plans-section no-print">
        <div className="tw-section-header">
          <h3 className="tw-section-title">
            <i className="fa-solid fa-list-check" style={{ color: '#6366f1' }}></i>
            แผนการจัดการเรียนรู้ของฉัน
          </h3>
          <div className="tw-tab-switcher">
            <button
              type="button"
              className={`tw-tab-btn ${activeTab === 'active' ? 'active' : ''}`}
              onClick={() => setActiveTab('active')}
            >
              <i className="fa-solid fa-spinner"></i> กำลังดำเนินการ
              {activePlans.length > 0 && <span className="tw-tab-count">{activePlans.length}</span>}
            </button>
            <button
              type="button"
              className={`tw-tab-btn ${activeTab === 'completed' ? 'active' : ''}`}
              onClick={() => setActiveTab('completed')}
            >
              <i className="fa-solid fa-circle-check"></i> เสร็จสมบูรณ์
              {completedPlans.length > 0 && <span className="tw-tab-count completed">{completedPlans.length}</span>}
            </button>
          </div>
        </div>

        {/* Welcome / Onboarding Empty State */}
        {totalPlansCount === 0 && (
          <div className="tw-empty-state">
            <div className="tw-empty-illustration">
              <i className="fa-solid fa-book-open-reader"></i>
            </div>
            <h4>ยินดีต้อนรับสู่พื้นที่ทำงานครูผู้สอน!</h4>
            <p>ยังไม่มีแผนการจัดการเรียนรู้ในระบบ — เริ่มต้นส่งแผนใหม่เพื่อขอรับการนิเทศ ว.PA ได้ทันที</p>
            <Link to="/sendplan" className="tw-btn-primary large">
              <i className="fa-solid fa-plus-circle"></i> ส่งแผนการจัดการเรียนรู้
            </Link>
          </div>
        )}

        {/* Tab-filtered Empty */}
        {totalPlansCount > 0 && currentPlans.length === 0 && (
          <div className="tw-empty-tab">
            <i className={`fa-solid ${activeTab === 'completed' ? 'fa-trophy' : 'fa-circle-check text-success'}`}></i>
            <p>
              {activeTab === 'completed'
                ? 'ยังไม่มีแผนที่ประเมินเสร็จสมบูรณ์ในภาคเรียนที่เลือก'
                : 'ยอดเยี่ยม! ทุกแผนการสอนของคุณดำเนินการเสร็จสมบูรณ์แล้ว'}
            </p>
          </div>
        )}

        {/* Plan Cards */}
        {currentPlans.map((p) => {
          const statusNum = Number(p.plan_status);
          const isRejected = statusNum === 3;
          const currentStep = getTimelineStep(p.plan_status);
          const planScore = planScoreMap[String(p.planid)];
          const quality = planScore ? getQualityBadge(planScore) : null;
          const clipWatchUrl = p.plan_clip ? getYouTubeWatchUrl(p.plan_clip) : '';
          const hasClip = Boolean(clipWatchUrl);
          const isExpanded = expandedCards[p.planid] || false;
          const committees = [
            p.committee1,
            p.committee2,
            p.committee3,
            p.committee4,
            p.committee5,
          ].filter(Boolean);

          return (
            <div
              key={p.planid}
              className={`tw-plan-card ${isExpanded ? 'expanded' : ''} ${isRejected ? 'tw-card-danger' : ''}`}
              role="article"
              aria-label={`แผน ${p.subject_name}`}
            >
              {/* Card Header — Clickable to expand, with primary CTA surfaced right on header */}
              <div className="tw-card-header" onClick={() => toggleCardExpand(p.planid)} style={{ cursor: 'pointer' }}>
                <div className="tw-card-left">
                  <div className="tw-card-tags">
                    <span className="tw-tag blue">
                      <i className="fa-solid fa-calendar-days"></i> {p.edu_year}/{p.edu_term}
                    </span>
                    <span className="tw-tag green">
                      <i className="fa-solid fa-book"></i> {lookups?.teachSubject?.[p.teach_subject_id] || 'ทั่วไป'}
                    </span>
                    {learningModelsMap[String(p.learning_model)] && (
                      <span className="tw-tag purple">
                        <i className="fa-solid fa-lightbulb"></i> {learningModelsMap[String(p.learning_model)]}
                      </span>
                    )}
                  </div>
                  <h4 className="tw-card-title">
                    {p.subject_name}
                    <span className="tw-card-code">({p.subject_code})</span>
                  </h4>
                  <p className="tw-card-subtitle">
                    {p.subject_name_plan || p.subject_content || ''}
                    {p.teach_date && (
                      <>
                        {' '}
                        • <i className="fa-regular fa-clock"></i> {p.teach_date}
                      </>
                    )}
                  </p>
                </div>

                <div className="tw-card-right">
                  {/* Primary Contextual CTA surfaced directly on collapsed card header */}
                  {statusNum === 3 && (
                    <Link
                      to={`/sendplan?planid=${p.planid}`}
                      onClick={(e) => e.stopPropagation()}
                      className="tw-action-btn danger tw-header-cta"
                      aria-label="แก้ไขแผนการสอน"
                    >
                      <i className="fa-solid fa-pen-to-square"></i> แก้ไขแผน
                    </Link>
                  )}
                  {statusNum === 2 && (
                    <Link
                      to={`/send_clip?planid=${p.planid}`}
                      onClick={(e) => e.stopPropagation()}
                      className="tw-action-btn warning tw-header-cta"
                      aria-label="แนบคลิปการสอน"
                    >
                      <i className="fa-solid fa-video"></i> แนบคลิปการสอน
                    </Link>
                  )}
                  {statusNum === 7 && (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedPlanForCert(p);
                      }}
                      className="tw-action-btn cert tw-header-cta"
                      aria-label="พิมพ์เกียรติบัตร"
                    >
                      <i className="fa-solid fa-certificate"></i> พิมพ์เกียรติบัตร
                    </button>
                  )}

                  {/* Score or Status Badge */}
                  {statusNum === 7 && quality ? (
                    <div
                      className="tw-score-badge"
                      style={{
                        background: quality.bg,
                        color: quality.color,
                        border: `1px solid ${quality.color}22`,
                      }}
                    >
                      <i className={`fa-solid ${quality.icon}`}></i>
                      <span className="tw-score-value">{planScore}</span>
                      <span className="tw-score-unit">/100</span>
                    </div>
                  ) : (
                    <StepBadge status={p.plan_status} currentStep={currentStep} />
                  )}

                  <button
                    type="button"
                    className="tw-expand-btn"
                    onClick={(e) => {
                      e.stopPropagation();
                      toggleCardExpand(p.planid);
                    }}
                    aria-label={isExpanded ? 'ย่อรายละเอียด' : 'แสดงรายละเอียด'}
                    aria-expanded={isExpanded}
                  >
                    <i className={`fa-solid fa-chevron-${isExpanded ? 'up' : 'down'}`}></i>
                  </button>
                </div>
              </div>

              {/* Expanded Content */}
              {isExpanded && (
                <div className="tw-card-expanded">
                  {/* Full Timeline */}
                  <div className="tw-timeline">
                    <div className="tw-timeline-track">
                      <div
                        className="tw-timeline-fill"
                        style={{
                          width: `${Math.min(100, ((currentStep - 1) / 4) * 100)}%`,
                          background: isRejected
                            ? 'linear-gradient(90deg, #10b981, #ef4444)'
                            : undefined,
                        }}
                      ></div>
                    </div>
                    {TIMELINE_STEPS.map((step, i) => {
                      const stepNumber = i + 1;
                      const isRejectedStep = isRejected && stepNumber === 2;
                      const isDone =
                        !isRejectedStep &&
                        (stepNumber < currentStep || (stepNumber === 5 && statusNum === 7));
                      const isCurrent = !isRejectedStep && !isDone && stepNumber === currentStep;

                      return (
                        <div
                          key={step.key}
                          className={`tw-timeline-node ${isDone ? 'done' : ''} ${isCurrent ? 'current' : ''} ${isRejectedStep ? 'rejected' : ''}`}
                          aria-label={`${step.label}: ${
                            isRejectedStep
                              ? 'ผอ.ส่งกลับให้แก้ไข'
                              : isDone
                                ? 'เสร็จแล้ว'
                                : isCurrent
                                  ? 'กำลังดำเนินการ'
                                  : 'ยังไม่ถึง'
                          }`}
                        >
                          <div className="tw-node-circle">
                            <i className={`fa-solid ${isRejectedStep ? 'fa-xmark' : step.icon}`}></i>
                          </div>
                          <span className="tw-node-label">
                            {isRejectedStep ? 'ส่งกลับแก้ไข' : step.label}
                          </span>
                        </div>
                      );
                    })}
                  </div>

                  {/* Rejection Feedback Banner when status == 3 */}
                  {isRejected && (
                    <div className="tw-rejection-banner">
                      <i className="fa-solid fa-triangle-exclamation mt-1"></i>
                      <div>
                        <strong>ผอ. ส่งกลับให้แก้ไขแผนการสอน:</strong>{' '}
                        {p.plan_ds_comment || 'กรุณาตรวจสอบและปรับปรุงรายละเอียดแผนการจัดการเรียนรู้แล้วส่งใหม่อีกครั้ง'}
                      </div>
                    </div>
                  )}

                  {/* Status Description */}
                  <div className="tw-status-desc">
                    <i className="fa-solid fa-circle-info"></i>
                    สถานะปัจจุบัน:{' '}
                    <strong>{PLAN_STATUS_NAMES[String(p.plan_status)] || 'อยู่ระหว่างดำเนินการ'}</strong>
                  </div>

                  {/* All 5 Committee Members */}
                  <div className="tw-card-meta">
                    <div className="tw-meta-group">
                      <span className="tw-meta-label">
                        <i className="fa-solid fa-users"></i> คณะกรรมการนิเทศ ({committees.length} ท่าน):
                      </span>
                      {committees.length === 0 ? (
                        <span className="tw-meta-empty">รอผู้อำนวยการแต่งตั้งคณะกรรมการ</span>
                      ) : (
                        <div className="tw-committee-list">
                          {committees.map((cid, i) => {
                            const cm = committeeProfiles[String(cid)];
                            const cName = cm
                              ? `${lookups?.prefix?.[cm.prefix] || ''}${cm.name} ${cm.lastname}`
                              : `กรรมการท่านที่ ${i + 1}`;
                            return (
                              <div key={`${cid}-${i}`} className="tw-committee-chip">
                                <div className="tw-chip-avatar">{i + 1}</div>
                                <span>{cName}</span>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Action Buttons */}
                  <div className="tw-card-actions">
                    {p.plan_file && (
                      <a
                        href={p.plan_file}
                        target="_blank"
                        rel="noreferrer"
                        className="tw-action-btn doc"
                        aria-label="เปิดเอกสารแผนการสอน"
                      >
                        <i className="fa-solid fa-file-pdf text-danger"></i> เอกสารแผน PDF
                      </a>
                    )}
                    {hasClip && (
                      <a
                        href={clipWatchUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="tw-action-btn video"
                        aria-label="ดูวิดีโอการสอน"
                      >
                        <i className="fa-brands fa-youtube"></i> วิดีโอการสอน
                      </a>
                    )}

                    {/* Edit Plan allowed in statuses 1, 3, 4 */}
                    {[1, 3, 4].includes(statusNum) && (
                      <Link
                        to={`/sendplan?planid=${p.planid}`}
                        className={`tw-action-btn ${isRejected ? 'danger' : 'doc'}`}
                        aria-label="แก้ไขแผนการสอน"
                      >
                        <i className="fa-solid fa-pen-to-square"></i>{' '}
                        {isRejected ? 'แก้ไขแผนตามข้อเสนอแนะ' : 'แก้ไขข้อมูลแผน'}
                      </Link>
                    )}

                    {/* Attach Clip (Status 2) */}
                    {statusNum === 2 && (
                      <Link
                        to={`/send_clip?planid=${p.planid}`}
                        className="tw-action-btn warning"
                        aria-label="แนบคลิปการสอน"
                      >
                        <i className="fa-solid fa-video"></i> แนบคลิปการสอน
                      </Link>
                    )}

                    {/* Edit/Delete Clip (Status 5) */}
                    {statusNum === 5 && hasClip && (
                      <>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            openEditClipModal(p);
                          }}
                          className="tw-action-btn edit-clip"
                          aria-label="แก้ไขคลิปวิดีโอ"
                        >
                          <i className="fa-solid fa-pen-to-square"></i> แก้ไขคลิป
                        </button>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeleteClip(p);
                          }}
                          className="tw-action-btn delete-clip"
                          aria-label="ลบคลิปวิดีโอ"
                        >
                          <i className="fa-solid fa-trash-can"></i> ลบคลิป
                        </button>
                      </>
                    )}

                    {/* View detailed scores when evaluation started or finished */}
                    {(statusNum === 6 || statusNum === 7 || planScore > 0) && (
                      <Link
                        to={`/view_scoring?planid=${p.planid}`}
                        className="tw-action-btn doc"
                        aria-label="ดูผลคะแนนรายตัวชี้วัด"
                      >
                        <i className="fa-solid fa-chart-simple text-primary"></i> ดูผลคะแนนละเอียด
                      </Link>
                    )}

                    {statusNum === 7 && (
                      <button
                        type="button"
                        onClick={() => setSelectedPlanForCert(p)}
                        className="tw-action-btn cert"
                        aria-label="พิมพ์ใบรับรองผล ว.PA"
                      >
                        <i className="fa-solid fa-certificate"></i> พิมพ์เกียรติบัตร ว.PA
                      </button>
                    )}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* ─── EDIT CLIP MODAL ─── */}
      {editClipModal.open && (
        <div
          className="tw-clip-modal-overlay"
          onClick={() => setEditClipModal({ open: false, plan: null })}
        >
          <div className="tw-clip-modal" onClick={(e) => e.stopPropagation()}>
            <div className="tw-clip-modal-header">
              <div className="tw-clip-modal-title">
                <i className="fa-solid fa-pen-to-square"></i>
                <div>
                  <h3>แก้ไขคลิปการสอน</h3>
                  <p>
                    {editClipModal.plan?.subject_name} ({editClipModal.plan?.subject_code})
                  </p>
                </div>
              </div>
              <button
                type="button"
                className="tw-clip-modal-close"
                onClick={() => setEditClipModal({ open: false, plan: null })}
                aria-label="ปิด"
              >
                <i className="fa-solid fa-xmark"></i>
              </button>
            </div>

            <div className="tw-clip-modal-body">
              <label className="tw-clip-label" htmlFor="edit-clip-url">
                <i className="fa-brands fa-youtube"></i> ลิงก์ YouTube
              </label>
              <input
                id="edit-clip-url"
                type="text"
                className="tw-clip-input"
                placeholder="วาง URL เช่น https://www.youtube.com/watch?v=..."
                value={editClipUrl}
                onChange={(e) => setEditClipUrl(e.target.value)}
                autoFocus
              />

              {/* YouTube Preview */}
              {editClipEmbedSrc && (
                <div className="tw-clip-preview">
                  <iframe
                    width="100%"
                    height="280"
                    src={editClipEmbedSrc}
                    title="YouTube Preview"
                    frameBorder="0"
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                    allowFullScreen
                    style={{ borderRadius: '12px' }}
                  ></iframe>
                </div>
              )}

              {!editClipVideoId && editClipUrl && (
                <div className="tw-clip-hint">
                  <i className="fa-solid fa-triangle-exclamation"></i>
                  ไม่สามารถแสดง Preview ได้ — กรุณาตรวจสอบลิงก์ YouTube อีกครั้ง
                </div>
              )}
            </div>

            <div className="tw-clip-modal-footer">
              <button
                type="button"
                className="tw-clip-btn cancel"
                onClick={() => setEditClipModal({ open: false, plan: null })}
              >
                ยกเลิก
              </button>
              <button
                type="button"
                className="tw-clip-btn save"
                onClick={handleSaveClip}
                disabled={!editClipVideoId}
              >
                <i className="fa-solid fa-check"></i> บันทึกการแก้ไข
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ─── CERTIFICATE MODAL (Lazy) ─── */}
      {selectedPlanForCert && (
        <Suspense
          fallback={
            <div className="certificate-modal-overlay">
              <div className="spinner-border text-light"></div>
            </div>
          }
        >
          <CertificateModal
            plan={selectedPlanForCert}
            teacherFullName={teacherFullName}
            schoolName={schoolName}
            academicName={academicName}
            subjectAreaName={subjectAreaName}
            planScoreMap={planScoreMap}
            committeeProfiles={committeeProfiles}
            directorProfile={directorProfile}
            lookups={enrichedLookups}
            profile={profile}
            onClose={() => setSelectedPlanForCert(null)}
          />
        </Suspense>
      )}
    </div>
  );
};

export default InfoTeacher;
