import React, { useEffect, useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import Swal from 'sweetalert2';
import { supabase } from '../supabaseClient';
import { useUserProfile } from '../hooks/useUserProfile';
import useUserLookups from '../hooks/useUserLookups';
import './SchoolExecutiveDashboard.css';

const InfoDirectorSchool = () => {
  const { profile, loading: profileLoading } = useUserProfile();
  const { lookups, loading: lookupsLoading } = useUserLookups();

  const [loading, setLoading] = useState(true);
  const [schoolData, setSchoolData] = useState(null);
  const [personnel, setPersonnel] = useState([]);
  const [plans, setPlans] = useState([]);
  const [planScores, setPlanScores] = useState([]);
  const [evaluatorNominees, setEvaluatorNominees] = useState([]);

  // Filters & Tabs
  const [selectedYear, setSelectedYear] = useState('ALL');
  const [activeTab, setActiveTab] = useState('unsubmitted');
  const [searchDirectory, setSearchDirectory] = useState('');

  const loadDashboardData = async () => {
    if (!profile?.school) {
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      const [schoolRes, teachersRes, plansRes, nomineesRes] = await Promise.all([
        supabase
          .from('tbl_school')
          .select('school_id, school_name, khet_code')
          .eq('school_id', profile.school)
          .maybeSingle(),
        supabase
          .from('tbl_Users')
          .select('id, people_id, prefix, name, lastname, persontype_id, position_id, academic_id, teach_subject, teach_subject_name, headDepartment, gender, birthday, edu_level, phone, email, level')
          .eq('school', profile.school)
          .order('position_id', { ascending: false }),
        supabase
          .from('tbl_sendplan')
          .select('planid, people_id, school_code, teach_subject_id, grade_level_id, edu_year, edu_term, subject_code, subject_name, subject_name_plan, learning_model, plan_status, plan_approve, plan_clip, plan_file, plan_senddate, committee1, committee2, committee3, committee4, committee5, committee1_comment, committee2_comment, committee3_comment, committee4_comment, committee5_comment, date_scoring1, date_scoring2, date_scoring3, date_scoring4, date_scoring5')
          .eq('school_code', profile.school)
          .order('plan_senddate', { ascending: false }),
        supabase
          .from('tbl_EvaluatorNominations')
          .select('nominee_people_id, status')
          .eq('status', 'approved'),
      ]);

      setSchoolData(schoolRes.data || null);
      const userList = teachersRes.data || [];
      const planList = plansRes.data || [];
      setPersonnel(userList);
      setPlans(planList);
      setEvaluatorNominees(nomineesRes.data || []);

      // Fetch Scores for Plans
      const planIds = planList.map((p) => String(p.planid));
      if (planIds.length > 0) {
        const { data: scoreData, error: scoreErr } = await supabase
          .from('tbl_sendplan_score')
          .select('planid, score, score_weight')
          .in('planid', planIds);
        if (!scoreErr) {
          setPlanScores(scoreData || []);
        }
      } else {
        setPlanScores([]);
      }
    } catch (err) {
      console.error('Executive Dashboard load error:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!profileLoading && profile?.school) {
      loadDashboardData();
    }
  }, [profile, profileLoading]);

  // Available Academic Years from Plans
  const academicYears = useMemo(() => {
    const years = new Set();
    plans.forEach((p) => {
      if (p.edu_year) years.add(String(p.edu_year).trim());
    });
    return Array.from(years).sort().reverse();
  }, [plans]);

  // Filtered Plans by Year
  const filteredPlans = useMemo(() => {
    if (selectedYear === 'ALL') return plans;
    return plans.filter((p) => String(p.edu_year).trim() === String(selectedYear).trim());
  }, [plans, selectedYear]);

  // Only teachers (for plan submission rate)
  const teachersOnly = useMemo(() => {
    return personnel.filter((p) => p.level === 'teacher' || !p.level || p.level === 'admin_school');
  }, [personnel]);

  // ==========================================
  // DIMENSION 1: Academic & Supervision Metrics
  // ==========================================
  const totalTeachersCount = teachersOnly.length;
  const submittedPeopleIds = useMemo(() => {
    const set = new Set();
    filteredPlans.forEach((p) => {
      if (p.people_id) set.add(String(p.people_id).trim());
    });
    return set;
  }, [filteredPlans]);

  const submittedTeachersCount = submittedPeopleIds.size;
  const submissionRate = totalTeachersCount > 0 ? Math.round((submittedTeachersCount / totalTeachersCount) * 100) : 0;
  const totalPlansCount = filteredPlans.length;

  const pendingDirectorCount = useMemo(() => {
    return filteredPlans.filter((p) => p.plan_status === 1 || p.plan_status === '1' || p.plan_status === 4 || p.plan_status === '4').length;
  }, [filteredPlans]);

  const approvedPlansCount = useMemo(() => {
    return filteredPlans.filter((p) => p.plan_approve === '1' || p.plan_approve === 1 || Number(p.plan_status) >= 2).length;
  }, [filteredPlans]);

  const evaluatingPlansCount = useMemo(() => {
    return filteredPlans.filter((p) => Number(p.plan_status) === 5 || Number(p.plan_status) === 6).length;
  }, [filteredPlans]);

  const completedPlansCount = useMemo(() => {
    return filteredPlans.filter((p) => Number(p.plan_status) === 7).length;
  }, [filteredPlans]);

  const supervisionRate = totalPlansCount > 0 ? Math.round((completedPlansCount / totalPlansCount) * 100) : 0;

  // Average Score Calculation
  const averageSchoolScore = useMemo(() => {
    if (planScores.length === 0) return 0;
    const scoresByPlan = {};
    planScores.forEach((s) => {
      const pid = String(s.planid);
      if (!scoresByPlan[pid]) scoresByPlan[pid] = { total: 0, weight: 0 };
      scoresByPlan[pid].total += Number(s.score) || 0;
      scoresByPlan[pid].weight += Number(s.score_weight) || 0;
    });

    const planAverages = Object.values(scoresByPlan).map((item) => {
      return item.weight > 0 ? (item.total / item.weight) * 100 : item.total;
    });

    if (planAverages.length === 0) return 0;
    const sum = planAverages.reduce((a, b) => a + b, 0);
    return Math.round((sum / planAverages.length) * 10) / 10;
  }, [planScores]);

  const getQualityBadge = (score) => {
    if (score >= 90) return { label: 'ดีเยี่ยม (Excellent)', color: 'text-success' };
    if (score >= 80) return { label: 'ดีมาก (Very Good)', color: 'text-primary' };
    if (score >= 70) return { label: 'ดี (Good)', color: 'text-info' };
    if (score >= 60) return { label: 'พอใช้ (Fair)', color: 'text-warning' };
    if (score > 0) return { label: 'ควรปรับปรุง', color: 'text-danger' };
    return { label: 'รอดำเนินการนิเทศ', color: 'text-muted' };
  };

  // Department Breakdown (8 Learning Areas)
  const departmentStats = useMemo(() => {
    const subjectIds = ['1001', '1002', '1003', '1004', '1005', '1006', '1007', '1008'];
    return subjectIds.map((sid) => {
      const deptName = lookups.teachSubject[sid] || `กลุ่มสาระ ${sid}`;
      const deptTeachers = teachersOnly.filter((t) => String(t.teach_subject) === sid);
      const deptPlans = filteredPlans.filter((p) => String(p.teach_subject_id) === sid);

      const deptSubmittedIds = new Set(deptPlans.map((p) => p.people_id));
      const deptSubmittedCount = deptSubmittedIds.size;
      const deptTeacherCount = deptTeachers.length;
      const rate = deptTeacherCount > 0 ? Math.round((deptSubmittedCount / deptTeacherCount) * 100) : 0;
      const completed = deptPlans.filter((p) => Number(p.plan_status) === 7).length;

      return {
        id: sid,
        name: deptName,
        teacherCount: deptTeacherCount,
        planCount: deptPlans.length,
        submittedTeachers: deptSubmittedCount,
        rate,
        completed,
      };
    });
  }, [teachersOnly, filteredPlans, lookups.teachSubject]);

  // ==========================================
  // DIMENSION 2: HR & Personnel Analytics
  // ==========================================
  const maleCount = useMemo(() => personnel.filter((p) => String(p.gender) === '1').length, [personnel]);
  const femaleCount = useMemo(() => personnel.filter((p) => String(p.gender) === '2').length, [personnel]);

  // Academic Standing Breakdown
  const academicStandingStats = useMemo(() => {
    const counts = {
      expertSpecial: 0,
      expert: 0,
      special: 0,
      senior: 0,
      practitioner: 0,
      assistant: 0,
      others: 0,
    };

    personnel.forEach((p) => {
      const aid = Number(p.academic_id);
      const pos = String(p.position_id);
      if (aid === 18) counts.expertSpecial++;
      else if (aid === 17) counts.expert++;
      else if (aid === 16) counts.special++;
      else if (aid === 15) counts.senior++;
      else if (pos === '10000') counts.assistant++;
      else if (pos === '10001' || aid === 99) counts.practitioner++;
      else counts.others++;
    });

    return counts;
  }, [personnel]);

  // Retirement Calculation
  const retirementStats = useMemo(() => {
    const currentYearAD = new Date().getFullYear();
    const currentYearBE = currentYearAD + 543;

    const list = [];
    let thisYear = 0;
    let next1to3 = 0;
    let next4to5 = 0;

    personnel.forEach((p) => {
      if (!p.birthday) return;
      const parts = String(p.birthday).trim().split('-');
      if (parts.length !== 3) return;

      const birthYearAD = parseInt(parts[0], 10);
      const birthMonth = parseInt(parts[1], 10);
      const birthDay = parseInt(parts[2], 10);

      let retireYearAD = birthYearAD + 60;
      if (birthMonth > 10 || (birthMonth === 10 && birthDay > 1)) {
        retireYearAD += 1;
      }
      const retireYearBE = retireYearAD + 543;
      const yearsRemaining = retireYearAD - currentYearAD;

      if (yearsRemaining === 0) thisYear++;
      else if (yearsRemaining >= 1 && yearsRemaining <= 3) next1to3++;
      else if (yearsRemaining >= 4 && yearsRemaining <= 5) next4to5++;

      if (yearsRemaining >= 0 && yearsRemaining <= 5) {
        list.push({
          id: p.id,
          name: (lookups.prefix[p.prefix] || '') + p.name + ' ' + p.lastname,
          position: lookups.position[p.position_id] || p.level || 'ครู',
          academic: lookups.academic[p.academic_id] || 'ไม่มีวิทยฐานะ',
          subject: lookups.teachSubject[p.teach_subject] || '-',
          retireYearBE,
          yearsRemaining,
        });
      }
    });

    list.sort((a, b) => a.yearsRemaining - b.yearsRemaining);
    return { thisYear, next1to3, next4to5, list, currentYearBE };
  }, [personnel, lookups]);

  // Certified Evaluators in school
  const certifiedEvaluatorTeachers = useMemo(() => {
    const approvedIds = new Set(evaluatorNominees.map((n) => String(n.nominee_people_id)));
    return personnel.filter((p) => approvedIds.has(String(p.people_id)));
  }, [personnel, evaluatorNominees]);

  // ==========================================
  // DIMENSION 3: Learning Models & Media
  // ==========================================
  const learningModelStats = useMemo(() => {
    const counts = {};
    filteredPlans.forEach((p) => {
      let model = p.learning_model ? String(p.learning_model).trim() : 'ไม่ระบุรูปแบบ';
      if (model.includes('Active') || model === '6') model = 'Active Learning';
      else if (model.includes('5E') || model.includes('Inquiry') || model.includes('สืบเสาะ')) model = '5E / Inquiry Process';
      else if (model.includes('GPAS') || model.includes('5 Step') || model.includes('5Steps')) model = 'GPAS 5 Steps';
      else if (model.includes('CIPPA') || model.includes('ซิปปา')) model = 'CIPPA Model';
      else if (model.includes('Problem') || model.includes('PBL')) model = 'Problem-Based Learning';
      else if (model.includes('Cooperative')) model = 'Cooperative Learning';

      counts[model] = (counts[model] || 0) + 1;
    });

    return Object.entries(counts).sort((a, b) => b[1] - a[1]);
  }, [filteredPlans]);

  const clipStats = useMemo(() => {
    let withClip = 0;
    filteredPlans.forEach((p) => {
      if (p.plan_clip && String(p.plan_clip).trim() !== '') withClip++;
    });
    const total = filteredPlans.length;
    const rate = total > 0 ? Math.round((withClip / total) * 100) : 0;
    return { withClip, withoutClip: total - withClip, total, rate };
  }, [filteredPlans]);

  // ==========================================
  // DIMENSION 4: Actionable Lists
  // ==========================================
  const unsubmittedTeachers = useMemo(() => {
    return teachersOnly.filter((t) => !submittedPeopleIds.has(String(t.people_id).trim()));
  }, [teachersOnly, submittedPeopleIds]);

  const pendingPlans = useMemo(() => {
    return filteredPlans.filter((p) => {
      const s = Number(p.plan_status);
      return s === 1 || s === 4 || !p.committee1 || s === 5 || s === 6;
    });
  }, [filteredPlans]);

  const completedSupervisionList = useMemo(() => {
    return filteredPlans.filter((p) => Number(p.plan_status) === 7);
  }, [filteredPlans]);

  const filteredDirectory = useMemo(() => {
    if (!searchDirectory.trim()) return personnel;
    const q = searchDirectory.trim().toLowerCase();
    return personnel.filter((p) => {
      const name = `${p.name || ''} ${p.lastname || ''}`.toLowerCase();
      const subject = (lookups.teachSubject[p.teach_subject] || '').toLowerCase();
      const position = (lookups.position[p.position_id] || '').toLowerCase();
      const academic = (lookups.academic[p.academic_id] || '').toLowerCase();
      return name.includes(q) || subject.includes(q) || position.includes(q) || academic.includes(q);
    });
  }, [personnel, searchDirectory, lookups]);

  const handleCopyUnsubmitted = () => {
    if (unsubmittedTeachers.length === 0) return;
    const text = unsubmittedTeachers
      .map((t, i) => `${i + 1}. ${(lookups.prefix[t.prefix] || '')}${t.name} ${t.lastname} (${lookups.teachSubject[t.teach_subject] || 'ไม่ระบุกลุ่มสาระ'})`)
      .join('\n');
    navigator.clipboard.writeText(`รายชื่อครูที่ยังไม่ส่งแผนการสอน (${schoolData?.school_name || 'โรงเรียน'}):\n` + text);
    Swal.fire({
      icon: 'success',
      title: 'คัดลอกรายชื่อสำเร็จ',
      text: 'สามารถนำข้อความไปวางในกลุ่มไลน์เพื่อแจ้งเตือนครูได้ทันที',
      timer: 2000,
      showConfirmButton: false,
    });
  };

  const handleJumpToPending = (e) => {
    e.preventDefault();
    setActiveTab('pending');
    const el = document.getElementById('action-center-section');
    if (el) {
      el.scrollIntoView({ behavior: 'smooth' });
    }
  };

  const handlePrint = () => {
    window.print();
  };

  const isLoading = profileLoading || lookupsLoading || loading;

  if (isLoading) {
    return (
      <div className="executive-dashboard-container">
        {/* Shimmer Skeleton Hero */}
        <div className="ed-skeleton ed-skeleton-hero"></div>
        {/* Shimmer Skeleton KPIs */}
        <div className="ed-kpi-grid">
          <div className="ed-skeleton ed-skeleton-card"></div>
          <div className="ed-skeleton ed-skeleton-card"></div>
          <div className="ed-skeleton ed-skeleton-card"></div>
          <div className="ed-skeleton ed-skeleton-card"></div>
        </div>
      </div>
    );
  }

  // SVG Ring Calculations
  const ringCircumference = 125.66; // 2 * PI * 20
  const subDashOffset = ringCircumference - (ringCircumference * Math.min(100, Math.max(0, submissionRate))) / 100;
  const supDashOffset = ringCircumference - (ringCircumference * Math.min(100, Math.max(0, supervisionRate))) / 100;

  return (
    <div className="executive-dashboard-container">
      {/* 1. AURORA HERO BANNER */}
      <header className="ed-hero">
        <div className="ed-hero-glow-1"></div>
        <div className="ed-hero-glow-2"></div>

        <div className="ed-hero-content">
          <div className="ed-hero-info">
            <div className="ed-hero-badge">
              <i className="fa-solid fa-chart-line"></i> Executive Information System (EIS)
            </div>
            <h1 className="ed-hero-title">
              {schoolData?.school_name ? `โรงเรียน${schoolData.school_name}` : 'สารสนเทศสถานศึกษา'}
            </h1>
            <p className="ed-hero-subtitle">
              ระบบสารสนเทศเพื่อการบริหารจัดการสถานศึกษาเชิงรุก • ผู้อำนวยการ:{' '}
              <strong>{(lookups.prefix[profile?.prefix] || '') + profile?.name + ' ' + (profile?.lastname || '')}</strong>
            </p>
          </div>

          {/* Twin Donut Rings */}
          <div className="ed-hero-rings">
            {/* Ring 1: Submission Rate */}
            <div className="ed-ring-item">
              <div className="ed-ring-wrapper">
                <svg viewBox="0 0 48 48">
                  <circle cx="24" cy="24" r="20" fill="none" stroke="rgba(255,255,255,0.15)" strokeWidth="4" />
                  <circle
                    cx="24"
                    cy="24"
                    r="20"
                    fill="none"
                    stroke="#10b981"
                    strokeWidth="4"
                    strokeLinecap="round"
                    strokeDasharray={ringCircumference}
                    strokeDashoffset={subDashOffset}
                  />
                </svg>
                <span className="ed-ring-val">{submissionRate}%</span>
              </div>
              <div className="ed-ring-meta">
                <span className="ed-ring-label">อัตราส่งแผน</span>
                <span className="ed-ring-sub">{submittedTeachersCount}/{totalTeachersCount} คน</span>
              </div>
            </div>

            {/* Ring 2: Supervision Completion */}
            <div className="ed-ring-item">
              <div className="ed-ring-wrapper">
                <svg viewBox="0 0 48 48">
                  <circle cx="24" cy="24" r="20" fill="none" stroke="rgba(255,255,255,0.15)" strokeWidth="4" />
                  <circle
                    cx="24"
                    cy="24"
                    r="20"
                    fill="none"
                    stroke="#3b82f6"
                    strokeWidth="4"
                    strokeLinecap="round"
                    strokeDasharray={ringCircumference}
                    strokeDashoffset={supDashOffset}
                  />
                </svg>
                <span className="ed-ring-val">{supervisionRate}%</span>
              </div>
              <div className="ed-ring-meta">
                <span className="ed-ring-label">นิเทศสำเร็จ</span>
                <span className="ed-ring-sub">{completedPlansCount}/{totalPlansCount} แผน</span>
              </div>
            </div>
          </div>

          {/* Hero Controls */}
          <div className="ed-hero-controls no-print">
            {/* Year Switcher Pills */}
            <div className="ed-year-pills" role="tablist">
              <button
                type="button"
                className={`ed-year-pill ${selectedYear === 'ALL' ? 'active' : ''}`}
                onClick={() => setSelectedYear('ALL')}
              >
                ทุกปี
              </button>
              {academicYears.map((yr) => (
                <button
                  key={yr}
                  type="button"
                  className={`ed-year-pill ${selectedYear === yr ? 'active' : ''}`}
                  onClick={() => setSelectedYear(yr)}
                >
                  {yr}
                </button>
              ))}
            </div>

            {/* Quick Action: Pending Director Approval */}
            {pendingDirectorCount > 0 && (
              <a href="#action-center" className="ed-btn-quick-action" onClick={handleJumpToPending}>
                <i className="fa-solid fa-bolt"></i>
                <span>ตรวจอนุมัติแผนด่วน</span>
                <span className="badge-counter">{pendingDirectorCount}</span>
              </a>
            )}

            <button className="ed-btn-icon" onClick={handlePrint} title="พิมพ์รายงานผู้บริหาร">
              <i className="fa-solid fa-print"></i>
            </button>
            <button className="ed-btn-icon" onClick={loadDashboardData} title="รีเฟรชข้อมูล">
              <i className="fa-solid fa-arrows-rotate"></i>
            </button>
          </div>
        </div>
      </header>

      {/* Print-only Formal Header */}
      <div className="print-only text-center mb-4">
        <h3 className="fw-bold mb-1">รายงานสารสนเทศเพื่อการบริหารจัดการสถานศึกษา</h3>
        <h4>โรงเรียน{schoolData?.school_name || ''} สพม.อุบลราชธานี อำนาจเจริญ</h4>
        <p className="text-muted">ข้อมูล ณ วันที่ {new Date().toLocaleDateString('th-TH', { dateStyle: 'long' })}</p>
        <hr />
      </div>

      {/* ========================================================================= */}
      {/* DIMENSION 1: Academic & Supervision Metrics */}
      {/* ========================================================================= */}
      <div className="ed-section-header">
        <div className="ed-section-left">
          <span className="ed-dimension-badge ed-dim-1">มิติที่ 1</span>
          <h2 className="ed-section-title">
            <i className="fa-solid fa-chalkboard-user text-primary"></i>
            การจัดการเรียนรู้และการนิเทศ (Academic & Supervision Pipeline)
          </h2>
        </div>
      </div>

      {/* 4 Bento KPI Cards */}
      <div className="ed-kpi-grid">
        {/* KPI 1: Personnel */}
        <div className="ed-kpi-card">
          <div className="ed-kpi-header">
            <div className="ed-kpi-icon blue">
              <i className="fa-solid fa-users"></i>
            </div>
            <div className="ed-kpi-accent-dot"></div>
          </div>
          <div>
            <div className="ed-kpi-title">บุคลากรทางการศึกษา</div>
            <div className="ed-kpi-value-row">
              <span className="ed-kpi-value">{personnel.length}</span>
              <span className="ed-kpi-unit">คน</span>
            </div>
            <p className="ed-kpi-subtext">
              ครูผู้สอน {totalTeachersCount} คน • ชาย {maleCount} / หญิง {femaleCount}
            </p>
          </div>
        </div>

        {/* KPI 2: Submission Rate */}
        <div className="ed-kpi-card">
          <div className="ed-kpi-header">
            <div className="ed-kpi-icon green">
              <i className="fa-solid fa-file-circle-check"></i>
            </div>
            <div className="ed-kpi-accent-dot"></div>
          </div>
          <div>
            <div className="ed-kpi-title">อัตราการส่งแผนการสอน</div>
            <div className="ed-kpi-value-row">
              <span className="ed-kpi-value">{submissionRate}%</span>
            </div>
            <p className="ed-kpi-subtext">
              ส่งแล้ว {submittedTeachersCount} จาก {totalTeachersCount} คน ({totalPlansCount} แผน)
            </p>
          </div>
        </div>

        {/* KPI 3: Pending Director */}
        <div className="ed-kpi-card">
          <div className="ed-kpi-header">
            <div className="ed-kpi-icon amber">
              <i className="fa-solid fa-clock-rotate-left"></i>
            </div>
            <div className={`ed-kpi-accent-dot ${pendingDirectorCount > 0 ? 'has-pending' : ''}`}></div>
          </div>
          <div>
            <div className="ed-kpi-title">รอ ผอ. ตรวจสอบ/อนุมัติ</div>
            <div className="ed-kpi-value-row">
              <span className="ed-kpi-value">{pendingDirectorCount}</span>
              <span className="ed-kpi-unit">แผน</span>
            </div>
            <p className="ed-kpi-subtext">
              {pendingDirectorCount > 0 ? '⚡ มีแผนการสอนรอรับการพิจารณา' : 'ตรวจสอบครบถ้วนทุกแผนแล้ว'}
            </p>
          </div>
        </div>

        {/* KPI 4: Supervision Completed */}
        <div className="ed-kpi-card">
          <div className="ed-kpi-header">
            <div className="ed-kpi-icon purple">
              <i className="fa-solid fa-award"></i>
            </div>
            <div className="ed-kpi-accent-dot"></div>
          </div>
          <div>
            <div className="ed-kpi-title">นิเทศเสร็จสิ้นสมบูรณ์</div>
            <div className="ed-kpi-value-row">
              <span className="ed-kpi-value">{completedPlansCount}</span>
              <span className="ed-kpi-unit">แผน</span>
            </div>
            <p className="ed-kpi-subtext">
              {averageSchoolScore > 0 ? (
                <span>คะแนนเฉลี่ย: <strong className="text-primary">{averageSchoolScore}/100</strong></span>
              ) : (
                'อยู่ระหว่างดำเนินการนิเทศ'
              )}
            </p>
          </div>
        </div>
      </div>

      {/* Supervision Pipeline Progression Bar */}
      <div className="ed-pipeline-card">
        <div className="ed-pipeline-header">
          <h3 className="ed-pipeline-title">
            <i className="fa-solid fa-diagram-project text-primary me-2"></i>
            เส้นทางความก้าวหน้าการนิเทศแผนการสอน (Supervision Pipeline)
          </h3>
          <span className="text-muted small">ภาพรวมทั้งสถานศึกษา</span>
        </div>
        <div className="ed-pipeline-track">
          <div className="ed-pipeline-node">
            <span className="ed-node-tag bg-primary-subtle text-primary">ขั้นตอนที่ 1</span>
            <div className="ed-node-val">{totalPlansCount}</div>
            <div className="ed-node-label">ครูส่งแผนการสอน</div>
          </div>
          <div className="ed-pipeline-node">
            <span className="ed-node-tag bg-info-subtle text-info-emphasis">ขั้นตอนที่ 2</span>
            <div className="ed-node-val">{approvedPlansCount}</div>
            <div className="ed-node-label">ผอ.อนุมัติให้ใช้แผน</div>
          </div>
          <div className="ed-pipeline-node">
            <span className="ed-node-tag bg-warning-subtle text-warning-emphasis">ขั้นตอนที่ 3</span>
            <div className="ed-node-val">{evaluatingPlansCount}</div>
            <div className="ed-node-label">คกก. กำลังประเมิน</div>
          </div>
          <div className="ed-pipeline-node">
            <span className="ed-node-tag bg-success-subtle text-success">ขั้นตอนที่ 4</span>
            <div className="ed-node-val">{completedPlansCount}</div>
            <div className="ed-node-label">นิเทศเสร็จสมบูรณ์</div>
          </div>
        </div>
      </div>

      {/* Department Breakdown Table */}
      <div className="ed-card">
        <div className="ed-card-header">
          <h3 className="ed-card-title">
            <i className="fa-solid fa-layer-group text-primary"></i>
            สถิติการส่งแผนและผลการนิเทศ จำแนกตาม 8 กลุ่มสาระการเรียนรู้
          </h3>
          <span className="text-muted small">เปรียบเทียบอัตราการส่งแผนและการนิเทศ</span>
        </div>
        <div className="p-0">
          <div className="table-responsive">
            <table className="ed-table">
              <thead>
                <tr>
                  <th style={{ width: '50px' }} className="text-center">ที่</th>
                  <th>กลุ่มสาระการเรียนรู้</th>
                  <th className="text-center" style={{ width: '110px' }}>จำนวนครู</th>
                  <th className="text-center" style={{ width: '120px' }}>ครูที่ส่งแผน</th>
                  <th style={{ width: '200px' }}>ความก้าวหน้าการส่ง</th>
                  <th className="text-center" style={{ width: '110px' }}>จำนวนแผน</th>
                  <th className="text-center" style={{ width: '130px' }}>นิเทศเสร็จสิ้น</th>
                </tr>
              </thead>
              <tbody>
                {departmentStats.map((dept, idx) => (
                  <tr key={dept.id}>
                    <td className="text-center text-muted">{idx + 1}</td>
                    <td><strong>{dept.name}</strong></td>
                    <td className="text-center">{dept.teacherCount} คน</td>
                    <td className="text-center">
                      <span className={dept.submittedTeachers === dept.teacherCount && dept.teacherCount > 0 ? 'text-success fw-bold' : 'text-primary fw-bold'}>
                        {dept.submittedTeachers} คน
                      </span>
                    </td>
                    <td>
                      <div className="ed-progress-bar-wrap">
                        <div className="ed-progress-track">
                          <div
                            className={`ed-progress-fill ${dept.rate === 100 ? 'green' : dept.rate >= 50 ? 'blue' : 'amber'}`}
                            style={{ width: `${dept.rate}%` }}
                          ></div>
                        </div>
                        <span className="small fw-bold">{dept.rate}%</span>
                      </div>
                    </td>
                    <td className="text-center">{dept.planCount} แผน</td>
                    <td className="text-center">
                      <span className={`badge ${dept.completed > 0 ? 'bg-success' : 'bg-secondary'}`}>
                        {dept.completed} แผน
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* DIMENSION 2 & 3: HR Analytics & Learning Innovations (2 Columns) */}
      {/* ========================================================================= */}
      <div className="row g-4 mb-4">
        {/* DIMENSION 2: อัตรากำลังและพัฒนาการบุคลากร */}
        <div className="col-lg-6">
          <div className="ed-section-header mt-0">
            <div className="ed-section-left">
              <span className="ed-dimension-badge ed-dim-2">มิติที่ 2</span>
              <h2 className="ed-section-title">
                <i className="fa-solid fa-id-card-clip text-success"></i>
                อัตรากำลังและบุคลากร (HR Analytics)
              </h2>
            </div>
          </div>

          <div className="ed-card h-100 mb-0">
            <div className="ed-card-body">
              {/* Academic Standing */}
              <h4 className="ed-card-title mb-3 fs-6">
                <i className="fa-solid fa-ranking-star text-warning"></i>
                สัดส่วนวิทยฐานะของครูในสถานศึกษา (ว.PA)
              </h4>
              <div className="mb-4">
                <div className="ed-standing-item">
                  <div className="ed-standing-row">
                    <span className="ed-standing-name">ชำนาญการพิเศษ (คศ.3)</span>
                    <span className="ed-standing-count">{academicStandingStats.special} คน ({personnel.length > 0 ? Math.round((academicStandingStats.special / personnel.length) * 100) : 0}%)</span>
                  </div>
                  <div className="ed-progress-track">
                    <div className="ed-progress-fill blue" style={{ width: `${(academicStandingStats.special / (personnel.length || 1)) * 100}%` }}></div>
                  </div>
                </div>

                <div className="ed-standing-item">
                  <div className="ed-standing-row">
                    <span className="ed-standing-name">ชำนาญการ (คศ.2)</span>
                    <span className="ed-standing-count">{academicStandingStats.senior} คน ({personnel.length > 0 ? Math.round((academicStandingStats.senior / personnel.length) * 100) : 0}%)</span>
                  </div>
                  <div className="ed-progress-track">
                    <div className="ed-progress-fill green" style={{ width: `${(academicStandingStats.senior / (personnel.length || 1)) * 100}%` }}></div>
                  </div>
                </div>

                <div className="ed-standing-item">
                  <div className="ed-standing-row">
                    <span className="ed-standing-name">ครู (คศ.1)</span>
                    <span className="ed-standing-count">{academicStandingStats.practitioner} คน ({personnel.length > 0 ? Math.round((academicStandingStats.practitioner / personnel.length) * 100) : 0}%)</span>
                  </div>
                  <div className="ed-progress-track">
                    <div className="ed-progress-fill amber" style={{ width: `${(academicStandingStats.practitioner / (personnel.length || 1)) * 100}%` }}></div>
                  </div>
                </div>

                <div className="ed-standing-item">
                  <div className="ed-standing-row">
                    <span className="ed-standing-name">ครูผู้ช่วย</span>
                    <span className="ed-standing-count">{academicStandingStats.assistant} คน ({personnel.length > 0 ? Math.round((academicStandingStats.assistant / personnel.length) * 100) : 0}%)</span>
                  </div>
                  <div className="ed-progress-track">
                    <div className="ed-progress-fill purple" style={{ width: `${(academicStandingStats.assistant / (personnel.length || 1)) * 100}%` }}></div>
                  </div>
                </div>
              </div>

              <hr className="my-3 border-light-subtle" />

              {/* Retirement Forecast */}
              <div className="d-flex justify-content-between align-items-center mb-2">
                <h4 className="ed-card-title fs-6 m-0">
                  <i className="fa-solid fa-hourglass-half text-danger"></i>
                  การคาดการณ์การเกษียณอายุราชการ (1-5 ปี)
                </h4>
                <span className="badge bg-light text-dark border">พ.ศ. {retirementStats.currentYearBE}</span>
              </div>

              <div className="ed-retire-boxes">
                <div className="ed-retire-box">
                  <div className="ed-retire-val red">{retirementStats.thisYear}</div>
                  <div className="ed-retire-label">เกษียณปีนี้ ({retirementStats.currentYearBE})</div>
                </div>
                <div className="ed-retire-box">
                  <div className="ed-retire-val amber">{retirementStats.next1to3}</div>
                  <div className="ed-retire-label">เกษียณใน 1–3 ปี</div>
                </div>
                <div className="ed-retire-box">
                  <div className="ed-retire-val blue">{retirementStats.next4to5}</div>
                  <div className="ed-retire-label">เกษียณใน 4–5 ปี</div>
                </div>
              </div>

              {/* Upcoming Retirees Mini Table */}
              {retirementStats.list.length > 0 && (
                <div className="table-responsive" style={{ maxHeight: '150px', overflowY: 'auto' }}>
                  <table className="table table-sm table-bordered m-0 small">
                    <thead className="table-light">
                      <tr>
                        <th>ชื่อ - นามสกุล</th>
                        <th>กลุ่มสาระฯ</th>
                        <th className="text-center">เกษียณ</th>
                        <th className="text-center">อีก</th>
                      </tr>
                    </thead>
                    <tbody>
                      {retirementStats.list.map((r) => (
                        <tr key={r.id}>
                          <td>{r.name}</td>
                          <td>{r.subject}</td>
                          <td className="text-center fw-bold text-danger">{r.retireYearBE}</td>
                          <td className="text-center">{r.yearsRemaining === 0 ? 'ปีนี้' : `${r.yearsRemaining} ปี`}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              <hr className="my-3 border-light-subtle" />

              {/* Certified Evaluators in school */}
              <div className="d-flex justify-content-between align-items-center">
                <div>
                  <h4 className="ed-card-title fs-6 m-0">
                    <i className="fa-solid fa-user-check text-success"></i>
                    ผู้นิเทศที่ได้รับการแต่งตั้งในสถานศึกษา
                  </h4>
                  <small className="text-muted">ครูที่ผ่านการอนุมัติแต่งตั้งให้เป็นกรรมการนิเทศ</small>
                </div>
                <span className="badge bg-success fs-6 px-3 py-2">
                  {certifiedEvaluatorTeachers.length} คน
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* DIMENSION 3: นวัตกรรมและสื่อการสอน */}
        <div className="col-lg-6">
          <div className="ed-section-header mt-0">
            <div className="ed-section-left">
              <span className="ed-dimension-badge ed-dim-3">มิติที่ 3</span>
              <h2 className="ed-section-title">
                <i className="fa-solid fa-lightbulb text-info"></i>
                นวัตกรรมและสื่อการสอน (Active Learning & Media)
              </h2>
            </div>
          </div>

          <div className="ed-card h-100 mb-0">
            <div className="ed-card-body">
              {/* Learning Models */}
              <h4 className="ed-card-title mb-3 fs-6">
                <i className="fa-solid fa-cube text-primary"></i>
                รูปแบบการจัดการเรียนรู้เชิงรุกยอดนิยม (Learning Models)
              </h4>
              {learningModelStats.length === 0 ? (
                <p className="text-muted small fst-italic">ยังไม่มีข้อมูลรูปแบบการจัดการเรียนรู้ในภาคเรียนนี้</p>
              ) : (
                <div className="mb-4">
                  {learningModelStats.slice(0, 5).map(([model, count]) => {
                    const pct = totalPlansCount > 0 ? Math.round((count / totalPlansCount) * 100) : 0;
                    return (
                      <div key={model} className="mb-2">
                        <div className="d-flex justify-content-between small mb-1">
                          <span className="fw-bold text-dark">{model}</span>
                          <span><strong>{count} แผน</strong> ({pct}%)</span>
                        </div>
                        <div className="ed-progress-track">
                          <div className="ed-progress-fill purple" style={{ width: `${pct}%` }}></div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              <hr className="my-3 border-light-subtle" />

              {/* Digital Media & Clips */}
              <h4 className="ed-card-title mb-3 fs-6">
                <i className="fa-solid fa-video text-danger"></i>
                การใช้คลิปวิดีโอการสอนและสื่อดิจิทัล
              </h4>
              <div className="row g-2 mb-3">
                <div className="col-6">
                  <div className="p-3 border rounded text-center bg-light">
                    <i className="fa-brands fa-youtube text-danger fa-2x mb-2"></i>
                    <h4 className="fw-bold text-dark mb-0">{clipStats.withClip} <span className="fs-6 fw-normal">แผน</span></h4>
                    <small className="text-muted">มีคลิปการสอนประกอบ ({clipStats.rate}%)</small>
                  </div>
                </div>
                <div className="col-6">
                  <div className="p-3 border rounded text-center bg-light">
                    <i className="fa-solid fa-file-pdf text-primary fa-2x mb-2"></i>
                    <h4 className="fw-bold text-dark mb-0">{totalPlansCount} <span className="fs-6 fw-normal">แผน</span></h4>
                    <small className="text-muted">มีไฟล์เอกสารแผนการสอน (100%)</small>
                  </div>
                </div>
              </div>

              <hr className="my-3 border-light-subtle" />

              {/* Quality & Score summary */}
              <h4 className="ed-card-title mb-2 fs-6">
                <i className="fa-solid fa-star text-warning"></i>
                การประเมินคุณภาพภาพรวมของสถานศึกษา
              </h4>
              <div className="p-3 rounded bg-light d-flex align-items-center justify-content-between">
                <div>
                  <span className="text-muted small d-block">ระดับคุณภาพการจัดการเรียนรู้</span>
                  <strong className={`fs-5 ${getQualityBadge(averageSchoolScore).color}`}>
                    {getQualityBadge(averageSchoolScore).label}
                  </strong>
                </div>
                <div className="text-end">
                  <span className="text-muted small d-block">คะแนนประเมินเฉลี่ย</span>
                  <span className="fs-4 fw-bold text-primary">{averageSchoolScore} / 100</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* DIMENSION 4: Actionable Insights & Drilldown Tables */}
      {/* ========================================================================= */}
      <div className="ed-section-header" id="action-center-section">
        <div className="ed-section-left">
          <span className="ed-dimension-badge ed-dim-4">มิติที่ 4</span>
          <h2 className="ed-section-title">
            <i className="fa-solid fa-list-check text-warning"></i>
            ศูนย์ปฏิบัติการ & ติดตามเร่งด่วนสำหรับผู้บริหาร (Executive Action Center)
          </h2>
        </div>
      </div>

      <div className="ed-card mb-5">
        <div className="ed-card-header bg-white border-bottom p-2">
          {/* Tabs Navigation */}
          <div className="ed-tabs-nav no-print" role="tablist">
            <button
              type="button"
              className={`ed-tab-btn ${activeTab === 'unsubmitted' ? 'active' : ''}`}
              onClick={() => setActiveTab('unsubmitted')}
            >
              <i className="fa-solid fa-user-xmark text-danger"></i>
              <span>ครูที่ยังไม่ส่งแผน</span>
              <span className="ed-tab-badge danger">{unsubmittedTeachers.length}</span>
            </button>
            <button
              type="button"
              className={`ed-tab-btn ${activeTab === 'pending' ? 'active' : ''}`}
              onClick={() => setActiveTab('pending')}
            >
              <i className="fa-solid fa-clock text-warning"></i>
              <span>แผนที่รอดำเนินการ</span>
              <span className="ed-tab-badge warning">{pendingPlans.length}</span>
            </button>
            <button
              type="button"
              className={`ed-tab-btn ${activeTab === 'completed' ? 'active' : ''}`}
              onClick={() => setActiveTab('completed')}
            >
              <i className="fa-solid fa-circle-check text-success"></i>
              <span>ผลการนิเทศเสร็จสิ้น</span>
              <span className="ed-tab-badge success">{completedSupervisionList.length}</span>
            </button>
            <button
              type="button"
              className={`ed-tab-btn ${activeTab === 'directory' ? 'active' : ''}`}
              onClick={() => setActiveTab('directory')}
            >
              <i className="fa-solid fa-address-book text-primary"></i>
              <span>ทำเนียบบุคลากร</span>
              <span className="ed-tab-badge primary">{personnel.length}</span>
            </button>
          </div>
        </div>

        <div className="ed-card-body">
          {/* TAB 1: ครูที่ยังไม่ส่งแผน */}
          {activeTab === 'unsubmitted' && (
            <div>
              <div className="d-flex justify-content-between align-items-center mb-3 flex-wrap gap-2">
                <p className="text-muted m-0 small">
                  รายชื่อครูผู้สอนที่ยังไม่มีประวัติการส่งแผนการสอนในภาคเรียนนี้ ({unsubmittedTeachers.length} คน)
                </p>
                {unsubmittedTeachers.length > 0 && (
                  <button type="button" className="ed-btn ed-btn-outline" onClick={handleCopyUnsubmitted}>
                    <i className="fa-regular fa-copy text-primary"></i> คัดลอกรายชื่อส่งกลุ่มไลน์
                  </button>
                )}
              </div>

              {unsubmittedTeachers.length === 0 ? (
                <div className="text-center py-5">
                  <i className="fa-solid fa-circle-check text-success fa-3x mb-3"></i>
                  <h4 className="fw-bold text-success">ครูทุกคนส่งแผนการสอนครบถ้วน 100%!</h4>
                  <p className="text-muted mb-0">ไม่มีครูค้างส่งแผนการสอนในภาคเรียนนี้</p>
                </div>
              ) : (
                <div className="table-responsive">
                  <table className="ed-table">
                    <thead>
                      <tr>
                        <th style={{ width: '50px' }} className="text-center">ที่</th>
                        <th>ชื่อ - นามสกุล</th>
                        <th>กลุ่มสาระการเรียนรู้</th>
                        <th>ตำแหน่ง / วิทยฐานะ</th>
                        <th>ช่องทางติดต่อ</th>
                      </tr>
                    </thead>
                    <tbody>
                      {unsubmittedTeachers.map((t, idx) => {
                        const name = (lookups.prefix[t.prefix] || '') + t.name + ' ' + t.lastname;
                        return (
                          <tr key={t.id || t.people_id}>
                            <td className="text-center text-muted">{idx + 1}</td>
                            <td><strong>{name}</strong></td>
                            <td>{lookups.teachSubject[t.teach_subject] || t.teach_subject_name || '-'}</td>
                            <td>{lookups.position[t.position_id] || t.level || 'ครู'} ({lookups.academic[t.academic_id] || 'ไม่มีวิทยฐานะ'})</td>
                            <td>
                              {t.phone ? (
                                <a href={`tel:${t.phone}`} className="ed-btn ed-btn-outline me-2 py-1">
                                  <i className="fa-solid fa-phone text-primary"></i> {t.phone}
                                </a>
                              ) : (
                                <span className="text-muted small">- ไม่มีเบอร์ -</span>
                              )}
                              {t.email && (
                                <a href={`mailto:${t.email}`} className="ed-btn ed-btn-icon py-1" title={t.email}>
                                  <i className="fa-solid fa-envelope"></i>
                                </a>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* TAB 2: แผนที่รอดำเนินการ */}
          {activeTab === 'pending' && (
            <div>
              <p className="text-muted small mb-3">
                แผนการสอนที่รอ ผอ. อนุมัติ หรือรอการแต่งตั้งกรรมการนิเทศ ({pendingPlans.length} รายการ)
              </p>
              {pendingPlans.length === 0 ? (
                <div className="text-center py-5">
                  <i className="fa-solid fa-circle-check text-success fa-3x mb-3"></i>
                  <h4 className="fw-bold text-success">ไม่มีแผนค้างดำเนินการ!</h4>
                  <p className="text-muted mb-0">แผนการสอนทั้งหมดได้รับการตรวจสอบและแต่งตั้งกรรมการเรียบร้อยแล้ว</p>
                </div>
              ) : (
                <div className="table-responsive">
                  <table className="ed-table">
                    <thead>
                      <tr>
                        <th style={{ width: '50px' }} className="text-center">ที่</th>
                        <th>วิชา / รหัสวิชา</th>
                        <th>ชื่อแผนการจัดการเรียนรู้</th>
                        <th>กลุ่มสาระฯ</th>
                        <th>สถานะปัจจุบัน</th>
                        <th className="text-center" style={{ width: '130px' }}>การจัดการ</th>
                      </tr>
                    </thead>
                    <tbody>
                      {pendingPlans.map((p, idx) => (
                        <tr key={p.planid}>
                          <td className="text-center text-muted">{idx + 1}</td>
                          <td>
                            <strong>{p.subject_name}</strong>
                            <small className="text-muted d-block">{p.subject_code}</small>
                          </td>
                          <td>{p.subject_name_plan || p.subject_content || '-'}</td>
                          <td>{lookups.teachSubject[p.teach_subject_id] || '-'}</td>
                          <td>
                            {p.plan_status === 1 || p.plan_status === '1' ? (
                              <span className="badge bg-danger">รอ ผอ. ตรวจอนุมัติ</span>
                            ) : !p.committee1 ? (
                              <span className="badge bg-warning text-dark">รอแต่งตั้งกรรมการ</span>
                            ) : (
                              <span className="badge bg-info text-dark">อยู่ระหว่างนิเทศ</span>
                            )}
                          </td>
                          <td className="text-center">
                            {p.plan_status === 1 || p.plan_status === '1' ? (
                              <Link to={`/Plan_Check?planid=${p.planid}`} className="ed-btn ed-btn-primary">
                                <i className="fa-solid fa-file-signature"></i> ตรวจแผน
                              </Link>
                            ) : !p.committee1 ? (
                              <Link to={`/appointment?planid=${p.planid}`} className="ed-btn ed-btn-warning">
                                <i className="fa-solid fa-user-plus"></i> แต่งตั้ง
                              </Link>
                            ) : (
                              <Link to={`/view_scoring?planid=${p.planid}`} className="ed-btn ed-btn-outline">
                                <i className="fa-solid fa-eye text-info"></i> ดูสถานะ
                              </Link>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* TAB 3: ผลการนิเทศเสร็จสิ้น */}
          {activeTab === 'completed' && (
            <div>
              <p className="text-muted small mb-3">
                แผนการสอนที่ผ่านการประเมินนิเทศเสร็จสิ้นสมบูรณ์ ({completedSupervisionList.length} แผน)
              </p>
              {completedSupervisionList.length === 0 ? (
                <div className="text-center py-5">
                  <i className="fa-solid fa-clock-rotate-left text-muted fa-3x mb-3"></i>
                  <h4 className="text-secondary fw-bold">ยังไม่มีแผนที่นิเทศเสร็จสิ้นสมบูรณ์</h4>
                  <p className="text-muted mb-0">เมื่อกรรมการบันทึกผลการนิเทศครบถ้วน ระบบจะสรุปผลสัมฤทธิ์ที่นี่</p>
                </div>
              ) : (
                <div className="table-responsive">
                  <table className="ed-table">
                    <thead>
                      <tr>
                        <th style={{ width: '50px' }} className="text-center">ที่</th>
                        <th>วิชา / แผนการสอน</th>
                        <th>กลุ่มสาระฯ</th>
                        <th>รูปแบบการสอน</th>
                        <th className="text-center">คลิปการสอน</th>
                        <th className="text-center" style={{ width: '130px' }}>ดูผลการนิเทศ</th>
                      </tr>
                    </thead>
                    <tbody>
                      {completedSupervisionList.map((p, idx) => (
                        <tr key={p.planid}>
                          <td className="text-center text-muted">{idx + 1}</td>
                          <td>
                            <strong>{p.subject_name}</strong> ({p.subject_code})
                            <small className="text-muted d-block">{p.subject_name_plan}</small>
                          </td>
                          <td>{lookups.teachSubject[p.teach_subject_id] || '-'}</td>
                          <td>
                            <span className="badge bg-light text-dark border">{p.learning_model || 'Active Learning'}</span>
                          </td>
                          <td className="text-center">
                            {p.plan_clip ? (
                              <a
                                href={`https://www.youtube.com/watch?v=${p.plan_clip}`}
                                target="_blank"
                                rel="noreferrer"
                                className="ed-btn ed-btn-outline py-1"
                              >
                                <i className="fa-brands fa-youtube text-danger"></i> คลิป
                              </a>
                            ) : (
                              <span className="text-muted small">- ไม่มีคลิป -</span>
                            )}
                          </td>
                          <td className="text-center">
                            <Link to={`/view_scoring?planid=${p.planid}`} className="ed-btn ed-btn-success">
                              <i className="fa-solid fa-chart-simple"></i> ดูคะแนน
                            </Link>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* TAB 4: ทำเนียบบุคลากรทั้งหมด */}
          {activeTab === 'directory' && (
            <div>
              <div className="row mb-3 align-items-center">
                <div className="col-md-6 mb-2 mb-md-0">
                  <p className="text-muted small m-0">ทำเนียบครูและบุคลากรทางการศึกษาทั้งหมด ({personnel.length} คน)</p>
                </div>
                <div className="col-md-6">
                  <div className="input-group input-group-sm">
                    <span className="input-group-text bg-light"><i className="fa-solid fa-magnifying-glass"></i></span>
                    <input
                      type="text"
                      className="form-control"
                      placeholder="ค้นหาชื่อ, กลุ่มสาระฯ, ตำแหน่ง, วิทยฐานะ..."
                      value={searchDirectory}
                      onChange={(e) => setSearchDirectory(e.target.value)}
                    />
                    {searchDirectory && (
                      <button className="btn btn-outline-secondary" onClick={() => setSearchDirectory('')}>
                        <i className="fa-solid fa-xmark"></i>
                      </button>
                    )}
                  </div>
                </div>
              </div>

              <div className="table-responsive">
                <table className="ed-table">
                  <thead>
                    <tr>
                      <th style={{ width: '50px' }} className="text-center">ที่</th>
                      <th>ชื่อ - นามสกุล</th>
                      <th>กลุ่มสาระการเรียนรู้</th>
                      <th>ตำแหน่ง</th>
                      <th>วิทยฐานะ</th>
                      <th>การศึกษา</th>
                      <th className="text-center">สถานะ</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredDirectory.map((p, idx) => {
                      const name = (lookups.prefix[p.prefix] || '') + p.name + ' ' + p.lastname;
                      const hasSubmitted = submittedPeopleIds.has(String(p.people_id).trim());
                      return (
                        <tr key={p.id || p.people_id}>
                          <td className="text-center text-muted">{idx + 1}</td>
                          <td><strong>{name}</strong></td>
                          <td>{lookups.teachSubject[p.teach_subject] || p.teach_subject_name || '-'}</td>
                          <td>{lookups.position[p.position_id] || p.level || '-'}</td>
                          <td>{lookups.academic[p.academic_id] || '-'}</td>
                          <td>{lookups.eduLevel[p.edu_level] || '-'}</td>
                          <td className="text-center">
                            {hasSubmitted ? (
                              <span className="badge bg-success-subtle text-success">
                                <i className="fa-solid fa-check me-1"></i> ส่งแผนแล้ว
                              </span>
                            ) : (
                              <span className="badge bg-danger-subtle text-danger">
                                <i className="fa-solid fa-xmark me-1"></i> ยังไม่ส่ง
                              </span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default InfoDirectorSchool;
