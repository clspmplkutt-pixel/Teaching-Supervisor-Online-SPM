import React, { useEffect, useState, useMemo, lazy, Suspense } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '../supabaseClient';
import { useAuth } from '../contexts/AuthContext';
import { useUserProfile } from '../hooks/useUserProfile';
import useUserLookups from '../hooks/useUserLookups';
import './TeacherDashboard.css';

const CertificateModal = lazy(() => import('../components/CertificateModal'));

const PLAN_STATUS_NAMES = {
  '1': 'รอ ผอ. อนุมัติแผน',
  '2': 'ผอ. อนุมัติแล้ว • รอคลิป',
  '3': 'ไม่อนุมัติ • กรุณาแก้ไข',
  '4': 'แก้ไขแล้ว • รอตรวจ',
  '5': 'ส่งคลิปแล้ว • รอนิเทศ',
  '6': 'คกก. กำลังประเมิน',
  '7': 'ประเมินเสร็จสิ้น',
};

const TIMELINE_STEPS = [
  { key: 1, label: 'ส่งแผน', icon: 'fa-file-arrow-up' },
  { key: 2, label: 'ผอ. อนุมัติ', icon: 'fa-user-check' },
  { key: 3, label: 'คลิป/บันทึก', icon: 'fa-video' },
  { key: 4, label: 'คกก. นิเทศ', icon: 'fa-list-check' },
  { key: 5, label: 'สำเร็จ', icon: 'fa-award' },
];

const getTimelineStep = (status) => {
  const s = Number(status);
  if (s === 1 || s === 4) return 1;
  if (s === 2) return 2;
  if (s === 5 || s === 6) return 3;
  if (s === 7) return 5;
  return 1;
};

const getQualityBadge = (score) => {
  if (score >= 90) return { label: 'ดีเยี่ยม', eng: 'Excellent', color: '#059669', bg: '#ecfdf5', icon: 'fa-trophy' };
  if (score >= 80) return { label: 'ดีมาก', eng: 'Very Good', color: '#2563eb', bg: '#eff6ff', icon: 'fa-star' };
  if (score >= 70) return { label: 'ดี', eng: 'Good', color: '#0891b2', bg: '#ecfeff', icon: 'fa-thumbs-up' };
  if (score >= 60) return { label: 'พอใช้', eng: 'Fair', color: '#d97706', bg: '#fffbeb', icon: 'fa-check' };
  if (score > 0) return { label: 'ควรปรับปรุง', eng: 'Needs Work', color: '#dc2626', bg: '#fef2f2', icon: 'fa-triangle-exclamation' };
  return null;
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
const StepBadge = ({ currentStep, totalSteps = 5 }) => {
  const stepInfo = TIMELINE_STEPS[currentStep - 1] || TIMELINE_STEPS[0];
  const isComplete = currentStep >= totalSteps;

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
            className={`step-dot ${i + 1 <= currentStep ? 'filled' : ''} ${i + 1 === currentStep ? 'current' : ''}`}
          />
        ))}
      </div>
      <span className="step-badge-label">
        <i className={`fa-solid ${stepInfo.icon}`}></i>
        {isComplete ? 'สำเร็จ' : `${currentStep}/${totalSteps} • ${stepInfo.label}`}
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
  const [selectedYear, setSelectedYear] = useState('ALL');
  const [selectedPlanForCert, setSelectedPlanForCert] = useState(null);
  const [expandedCards, setExpandedCards] = useState({});
  const [activeTab, setActiveTab] = useState('active'); // 'active' | 'completed'

  const teacherPeopleId = profile?.people_id || user?.user_metadata?.people_id || user?.email || '';

  const toggleCardExpand = (planid) => {
    setExpandedCards((prev) => ({ ...prev, [planid]: !prev[planid] }));
  };

  /* ─── Data Loading ─── */
  const loadTeacherData = async () => {
    if (!teacherPeopleId) { setLoading(false); return; }

    setLoading(true);
    setLoadError(null);
    try {
      const { data: myPlans, error: plansErr } = await supabase
        .from('tbl_sendplan').select('*')
        .eq('people_id', teacherPeopleId)
        .order('plan_senddate', { ascending: false });

      if (plansErr) throw plansErr;
      const planList = myPlans || [];
      setPlans(planList);

      const planIds = planList.map((p) => String(p.planid));
      if (planIds.length > 0) {
        const { data: scoreData, error: scoreErr } = await supabase
          .from('tbl_sendplan_score').select('*').in('planid', planIds);
        if (!scoreErr) setScores(scoreData || []);
      } else {
        setScores([]);
      }

      const committeeIds = new Set();
      planList.forEach((p) => {
        [p.committee1, p.committee2, p.committee3, p.committee4, p.committee5]
          .filter(Boolean).forEach((c) => committeeIds.add(String(c).trim()));
      });

      if (committeeIds.size > 0) {
        const { data: cUsers } = await supabase
          .from('tbl_Users')
          .select('people_id, prefix, name, lastname, academic_id, position_id, school')
          .in('people_id', Array.from(committeeIds));

        const cMap = {};
        (cUsers || []).forEach((u) => { cMap[String(u.people_id)] = u; });
        setCommitteeProfiles(cMap);
      }
    } catch (err) {
      console.error('InfoTeacher load error:', err);
      setLoadError(err.message || 'เกิดข้อผิดพลาดในการโหลดข้อมูล');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!profileLoading && teacherPeopleId) loadTeacherData();
  }, [profileLoading, teacherPeopleId]);

  /* ─── Computed Values ─── */
  const academicYears = useMemo(() => {
    const set = new Set();
    plans.forEach((p) => { if (p.edu_year) set.add(String(p.edu_year).trim()); });
    return Array.from(set).sort().reverse();
  }, [plans]);

  const filteredPlans = useMemo(() => {
    if (selectedYear === 'ALL') return plans;
    return plans.filter((p) => String(p.edu_year).trim() === String(selectedYear).trim());
  }, [plans, selectedYear]);

  const activePlans = useMemo(() => filteredPlans.filter((p) => Number(p.plan_status) !== 7), [filteredPlans]);
  const completedPlans = useMemo(() => filteredPlans.filter((p) => Number(p.plan_status) === 7), [filteredPlans]);

  const totalPlansCount = filteredPlans.length;
  const approvedCount = useMemo(() => filteredPlans.filter((p) => p.plan_approve === '1' || p.plan_approve === 1 || Number(p.plan_status) >= 2).length, [filteredPlans]);
  const evaluatingCount = useMemo(() => filteredPlans.filter((p) => [5, 6].includes(Number(p.plan_status))).length, [filteredPlans]);
  const completedCount = completedPlans.length;

  const planScoreMap = useMemo(() => {
    const map = {};
    scores.forEach((s) => {
      const pid = String(s.planid);
      if (!map[pid]) map[pid] = { total: 0, count: 0 };
      map[pid].total += Number(s.score) || 0;
      map[pid].count += 1;
    });
    const result = {};
    Object.keys(map).forEach((pid) => {
      const item = map[pid];
      const maxScore = item.count * 4;
      const percentage = maxScore > 0 ? (item.total / maxScore) * 100 : 0;
      result[pid] = Math.min(100, Math.round(percentage * 10) / 10);
    });
    return result;
  }, [scores]);

  const overallAvgScore = useMemo(() => {
    const pids = Object.keys(planScoreMap);
    if (pids.length === 0) return 0;
    const sum = pids.reduce((acc, pid) => acc + planScoreMap[pid], 0);
    return Math.round((sum / pids.length) * 10) / 10;
  }, [planScoreMap]);

  const completionPercent = useMemo(() => {
    if (totalPlansCount === 0) return 0;
    return Math.round((completedCount / totalPlansCount) * 100);
  }, [completedCount, totalPlansCount]);

  // To-Do Items: urgent actions needed
  const todoItems = useMemo(() => {
    const items = [];
    filteredPlans.forEach((p) => {
      const s = Number(p.plan_status);
      if (s === 3) {
        items.push({ type: 'revision', plan: p, priority: 1, icon: 'fa-pen-to-square', color: '#dc2626', bgColor: '#fef2f2', borderColor: '#fecdd3', label: 'แก้ไขแผนการสอน', desc: p.plan_ds_comment || 'กรุณาปรับปรุงรายละเอียดตามข้อเสนอแนะ', link: '/statusplan' });
      } else if (s === 2) {
        items.push({ type: 'clip', plan: p, priority: 2, icon: 'fa-cloud-arrow-up', color: '#d97706', bgColor: '#fffbeb', borderColor: '#fde68a', label: 'แนบคลิปวิดีโอ/บันทึก', desc: 'ผอ. อนุมัติแล้ว — แนบคลิป YouTube เพื่อให้ คกก. ประเมิน', link: '/send_clip' });
      } else if (s === 1) {
        items.push({ type: 'pending', plan: p, priority: 3, icon: 'fa-clock', color: '#6366f1', bgColor: '#eef2ff', borderColor: '#c7d2fe', label: 'รอ ผอ. ตรวจสอบ', desc: 'แผนถูกส่งเรียบร้อยแล้ว — รอผู้อำนวยการพิจารณาอนุมัติ', link: null });
      }
    });
    return items.sort((a, b) => a.priority - b.priority);
  }, [filteredPlans]);

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
              <p className="tw-hero-subtitle">{subjectAreaName} • {totalPlansCount > 0 ? `${totalPlansCount} แผนในระบบ` : 'ยังไม่มีแผนในระบบ'}</p>
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
                >ทุกปี</button>
                {academicYears.map((yr) => (
                  <button
                    key={yr} type="button"
                    onClick={() => setSelectedYear(yr)}
                    className={`tw-year-btn ${selectedYear === yr ? 'active' : ''}`}
                    aria-label={`แสดงปีการศึกษา ${yr}`}
                  >{yr}</button>
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
              <span className="tw-kpi-label">สิ่งที่ต้องทำ</span>
            </div>
            {todoItems.length > 0 && <span className="tw-kpi-ping"></span>}
          </div>
          <div className="tw-kpi-card">
            <div className="tw-kpi-icon" style={{ background: 'linear-gradient(135deg, #10b981, #34d399)' }}>
              <i className="fa-solid fa-circle-check"></i>
            </div>
            <div className="tw-kpi-body">
              <span className="tw-kpi-value">{approvedCount}<span className="tw-kpi-unit">/{totalPlansCount}</span></span>
              <span className="tw-kpi-label">อนุมัติแล้ว</span>
            </div>
          </div>
          <div className="tw-kpi-card">
            <div className="tw-kpi-icon" style={{ background: 'linear-gradient(135deg, #f59e0b, #fbbf24)' }}>
              <i className="fa-solid fa-spinner"></i>
            </div>
            <div className="tw-kpi-body">
              <span className="tw-kpi-value">{evaluatingCount}</span>
              <span className="tw-kpi-label">กำลังนิเทศ</span>
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

      {/* ─── TODAY'S TO-DO (Unified Urgent Actions) ─── */}
      {todoItems.length > 0 && (
        <div className="tw-todo-section no-print">
          <div className="tw-section-header">
            <h3 className="tw-section-title">
              <i className="fa-solid fa-bell" style={{ color: '#f59e0b' }}></i>
              สิ่งที่ต้องทำ
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
                    <span className="tw-todo-subject">{item.plan.subject_name} ({item.plan.subject_code})</span>
                  </div>
                  <p className="tw-todo-desc">{item.desc}</p>
                </div>
                {item.link && (
                  <Link to={item.link} className="tw-todo-action" style={{ background: item.color }} aria-label={item.label}>
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
            แผนการจัดการเรียนรู้
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
              <i className="fa-solid fa-circle-check"></i> เสร็จสิ้นแล้ว
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
            <h4>ยินดีต้อนรับสู่ Teacher Workspace!</h4>
            <p>ยังไม่มีแผนการจัดการเรียนรู้ในระบบ — เริ่มต้นส่งแผนใหม่เพื่อขอรับการนิเทศ ว.PA ได้ทันทีครับ</p>
            <Link to="/sendplan" className="tw-btn-primary large">
              <i className="fa-solid fa-plus-circle"></i> ส่งแผนการจัดการเรียนรู้
            </Link>
          </div>
        )}

        {/* Tab-filtered Empty */}
        {totalPlansCount > 0 && currentPlans.length === 0 && (
          <div className="tw-empty-tab">
            <i className={`fa-solid ${activeTab === 'completed' ? 'fa-party-horn' : 'fa-inbox'}`}></i>
            <p>{activeTab === 'completed' ? 'ยังไม่มีแผนที่นิเทศเสร็จสิ้น' : 'ทุกแผนดำเนินการเสร็จสิ้นแล้ว 🎉'}</p>
          </div>
        )}

        {/* Plan Cards */}
        {currentPlans.map((p) => {
          const currentStep = getTimelineStep(p.plan_status);
          const planScore = planScoreMap[String(p.planid)];
          const quality = planScore ? getQualityBadge(planScore) : null;
          const hasClip = p.plan_clip && String(p.plan_clip).trim() !== '';
          const isExpanded = expandedCards[p.planid] || false;
          const committees = [p.committee1, p.committee2, p.committee3].filter(Boolean);

          return (
            <div
              key={p.planid}
              className={`tw-plan-card ${isExpanded ? 'expanded' : ''} ${Number(p.plan_status) === 3 ? 'tw-card-danger' : ''}`}
              role="article"
              aria-label={`แผน ${p.subject_name}`}
            >
              {/* Card Header — Clickable to expand */}
              <div className="tw-card-header" onClick={() => toggleCardExpand(p.planid)} style={{ cursor: 'pointer' }}>
                <div className="tw-card-left">
                  <div className="tw-card-tags">
                    <span className="tw-tag blue">
                      <i className="fa-solid fa-calendar-days"></i> {p.edu_year}/{p.edu_term}
                    </span>
                    <span className="tw-tag green">
                      <i className="fa-solid fa-book"></i> {lookups?.teachSubject?.[p.teach_subject_id] || 'ทั่วไป'}
                    </span>
                  </div>
                  <h4 className="tw-card-title">
                    {p.subject_name}
                    <span className="tw-card-code">({p.subject_code})</span>
                  </h4>
                  <p className="tw-card-subtitle">
                    {p.subject_name_plan || p.subject_content || ''}
                    {p.teach_date && <> • <i className="fa-regular fa-clock"></i> {p.teach_date}</>}
                  </p>
                </div>
                <div className="tw-card-right">
                  {/* Score or Status Badge */}
                  {Number(p.plan_status) === 7 && quality ? (
                    <div className="tw-score-badge" style={{ background: quality.bg, color: quality.color, border: `1px solid ${quality.color}22` }}>
                      <i className={`fa-solid ${quality.icon}`}></i>
                      <span className="tw-score-value">{planScore}</span>
                      <span className="tw-score-unit">/100</span>
                    </div>
                  ) : (
                    <StepBadge currentStep={currentStep} />
                  )}
                  <button
                    type="button"
                    className="tw-expand-btn"
                    onClick={(e) => { e.stopPropagation(); toggleCardExpand(p.planid); }}
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
                      <div className="tw-timeline-fill" style={{ width: `${Math.min(100, ((currentStep - 1) / 4) * 100)}%` }}></div>
                    </div>
                    {TIMELINE_STEPS.map((step, i) => (
                      <div
                        key={step.key}
                        className={`tw-timeline-node ${i + 1 < currentStep ? 'done' : ''} ${i + 1 === currentStep ? 'current' : ''}`}
                        aria-label={`${step.label}: ${i + 1 < currentStep ? 'เสร็จแล้ว' : i + 1 === currentStep ? 'กำลังดำเนินการ' : 'ยังไม่ถึง'}`}
                      >
                        <div className="tw-node-circle">
                          <i className={`fa-solid ${step.icon}`}></i>
                        </div>
                        <span className="tw-node-label">{step.label}</span>
                      </div>
                    ))}
                  </div>

                  {/* Status Description */}
                  <div className="tw-status-desc">
                    <i className="fa-solid fa-circle-info"></i>
                    สถานะปัจจุบัน: <strong>{PLAN_STATUS_NAMES[String(p.plan_status)] || 'อยู่ระหว่างดำเนินการ'}</strong>
                  </div>

                  {/* Committee Members */}
                  <div className="tw-card-meta">
                    <div className="tw-meta-group">
                      <span className="tw-meta-label"><i className="fa-solid fa-users"></i> คณะกรรมการนิเทศ:</span>
                      {committees.length === 0 ? (
                        <span className="tw-meta-empty">รอแต่งตั้งคณะกรรมการ</span>
                      ) : (
                        <div className="tw-committee-list">
                          {committees.map((cid, i) => {
                            const cm = committeeProfiles[String(cid)];
                            const cName = cm ? `${lookups?.prefix?.[cm.prefix] || ''}${cm.name} ${cm.lastname}` : `กรรมการ ${i + 1}`;
                            return (
                              <div key={cid} className="tw-committee-chip">
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
                      <a href={p.plan_file} target="_blank" rel="noreferrer" className="tw-action-btn doc" aria-label="เปิดเอกสารแผนการสอน">
                        <i className="fa-solid fa-file-pdf"></i> เอกสารแผน
                      </a>
                    )}
                    {hasClip && (
                      <a href={`https://www.youtube.com/watch?v=${p.plan_clip}`} target="_blank" rel="noreferrer" className="tw-action-btn video" aria-label="ดูวิดีโอการสอน">
                        <i className="fa-brands fa-youtube"></i> วิดีโอการสอน
                      </a>
                    )}
                    {Number(p.plan_status) === 7 && (
                      <button type="button" onClick={() => setSelectedPlanForCert(p)} className="tw-action-btn cert" aria-label="พิมพ์ใบรับรองผล ว.PA">
                        <i className="fa-solid fa-certificate"></i> ใบรับรองผล ว.PA
                      </button>
                    )}
                    {Number(p.plan_status) === 3 && (
                      <Link to="/statusplan" className="tw-action-btn danger" aria-label="แก้ไขแผนการสอน">
                        <i className="fa-solid fa-pen-to-square"></i> แก้ไขแผน
                      </Link>
                    )}
                    {Number(p.plan_status) === 2 && (
                      <Link to="/send_clip" className="tw-action-btn warning" aria-label="แนบคลิปวิดีโอ">
                        <i className="fa-solid fa-cloud-arrow-up"></i> แนบคลิป
                      </Link>
                    )}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* ─── CERTIFICATE MODAL (Lazy) ─── */}
      {selectedPlanForCert && (
        <Suspense fallback={<div className="certificate-modal-overlay"><div className="spinner-border text-light"></div></div>}>
          <CertificateModal
            plan={selectedPlanForCert}
            teacherFullName={teacherFullName}
            schoolName={schoolName}
            academicName={academicName}
            subjectAreaName={subjectAreaName}
            planScoreMap={planScoreMap}
            committeeProfiles={committeeProfiles}
            lookups={lookups}
            profile={profile}
            onClose={() => setSelectedPlanForCert(null)}
          />
        </Suspense>
      )}
    </div>
  );
};

export default InfoTeacher;
