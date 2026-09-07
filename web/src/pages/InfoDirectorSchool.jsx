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
    if (score >= 90) return { label: 'ดีเยี่ยม (Excellent)', color: 'bg-success text-white' };
    if (score >= 80) return { label: 'ดีมาก (Very Good)', color: 'bg-primary text-white' };
    if (score >= 70) return { label: 'ดี (Good)', color: 'bg-info text-dark' };
    if (score >= 60) return { label: 'พอใช้ (Fair)', color: 'bg-warning text-dark' };
    if (score > 0) return { label: 'ควรปรับปรุง', color: 'bg-danger text-white' };
    return { label: 'รอดำเนินการนิเทศ', color: 'bg-secondary text-white' };
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
      expertSpecial: 0, // เชี่ยวชาญพิเศษ (18)
      expert: 0, // เชี่ยวชาญ (17)
      special: 0, // ชำนาญการพิเศษ (16)
      senior: 0, // ชำนาญการ (15)
      practitioner: 0, // ครู คศ.1
      assistant: 0, // ครูผู้ช่วย
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

  // Retirement Calculation (Official Thai Fiscal Year: Sep 30 cutoff)
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

      // Official rule: Born on or before Oct 1 retires at year + 60; Born after Oct 1 retires at year + 61
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

  // Education Level Breakdown
  const educationStats = useMemo(() => {
    const counts = { bachelor: 0, master: 0, doctorate: 0, others: 0 };
    personnel.forEach((p) => {
      const edu = String(p.edu_level);
      if (edu === '20' || edu.includes('เอก')) counts.doctorate++;
      else if (edu === '18' || edu.includes('โท')) counts.master++;
      else if (edu === '16' || edu.includes('ตรี')) counts.bachelor++;
      else counts.others++;
    });
    return counts;
  }, [personnel]);

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

    const entries = Object.entries(counts).sort((a, b) => b[1] - a[1]);
    return entries;
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
  // Unsubmitted teachers
  const unsubmittedTeachers = useMemo(() => {
    return teachersOnly.filter((t) => !submittedPeopleIds.has(String(t.people_id).trim()));
  }, [teachersOnly, submittedPeopleIds]);

  // Pending plans
  const pendingPlans = useMemo(() => {
    return filteredPlans.filter((p) => {
      const s = Number(p.plan_status);
      return s === 1 || s === 4 || !p.committee1 || s === 5 || s === 6;
    });
  }, [filteredPlans]);

  // Completed supervision plans with scores
  const completedSupervisionList = useMemo(() => {
    return filteredPlans.filter((p) => Number(p.plan_status) === 7);
  }, [filteredPlans]);

  // Searchable Personnel Directory
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

  // Copy unsubmitted teachers to clipboard
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

  const handlePrint = () => {
    window.print();
  };

  const isLoading = profileLoading || lookupsLoading || loading;

  if (isLoading) {
    return (
      <div className="text-center p-5">
        <div className="spinner-border text-primary" style={{ width: '3rem', height: '3rem' }} role="status"></div>
        <h5 className="mt-3 font-weight-bold text-secondary">กำลังประมวลผลสารสนเทศเพื่อการบริหารจัดการ...</h5>
        <p className="text-muted">กำลังรวบรวมข้อมูลครู แผนการสอน และผลการนิเทศสถานศึกษา</p>
      </div>
    );
  }

  return (
    <div className="executive-dashboard-container">
      {/* 1. Header & Controls */}
      <div className="dashboard-hero">
        <div className="row align-items-center">
          <div className="col-lg-8 mb-3 mb-lg-0">
            <span className="badge bg-warning text-dark mb-2 px-3 py-1 font-weight-bold">
              <i className="fa-solid fa-chart-line me-1"></i> Executive Information System (EIS)
            </span>
            <h2 className="font-weight-bold mb-1">
              {schoolData?.school_name ? `โรงเรียน${schoolData.school_name}` : 'สารสนเทศสถานศึกษา'}
            </h2>
            <p className="mb-0 text-white-50">
              ระบบสารสนเทศเพื่อการบริหารจัดการสถานศึกษาเชิงรุก (Data-Driven School Management) • ผู้อำนวยการ:{' '}
              <strong className="text-white">
                {(lookups.prefix[profile?.prefix] || '') + profile?.name + ' ' + (profile?.lastname || '')}
              </strong>
            </p>
          </div>
          <div className="col-lg-4 text-lg-end no-print">
            <div className="d-flex flex-wrap justify-content-lg-end gap-2">
              <div className="input-group input-group-sm" style={{ width: 'auto' }}>
                <span className="input-group-text bg-white text-dark font-weight-bold">ปีการศึกษา</span>
                <select
                  className="form-select form-select-sm"
                  value={selectedYear}
                  onChange={(e) => setSelectedYear(e.target.value)}
                >
                  <option value="ALL">ทั้งหมดทุกปี</option>
                  {academicYears.map((yr) => (
                    <option key={yr} value={yr}>
                      ปีการศึกษา {yr}
                    </option>
                  ))}
                </select>
              </div>
              <button className="btn btn-sm btn-light font-weight-bold shadow-sm" onClick={handlePrint} title="พิมพ์รายงานสรุป">
                <i className="fa-solid fa-print me-1 text-primary"></i> พิมพ์รายงาน
              </button>
              <button className="btn btn-sm btn-outline-light" onClick={loadDashboardData} title="รีเฟรชข้อมูล">
                <i className="fa-solid fa-arrows-rotate"></i>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Print-only Formal Header */}
      <div className="print-only text-center mb-4">
        <h3 className="font-weight-bold mb-1">รายงานสารสนเทศเพื่อการบริหารจัดการสถานศึกษา</h3>
        <h4>โรงเรียน{schoolData?.school_name || ''} สพม.อุบลราชธานี อำนาจเจริญ</h4>
        <p className="text-muted">ข้อมูล ณ วันที่ {new Date().toLocaleDateString('th-TH', { dateStyle: 'long' })}</p>
        <hr />
      </div>

      {/* ========================================================================= */}
      {/* DIMENSION 1: สารสนเทศด้านการจัดการเรียนรู้และการนิเทศ (Academic & Supervision) */}
      {/* ========================================================================= */}
      <div className="d-flex align-items-center mb-3">
        <span className="dimension-badge bg-primary text-white me-2">มิติที่ 1</span>
        <h4 className="font-weight-bold m-0 text-dark">
          <i className="fa-solid fa-chalkboard-user text-primary me-2"></i>
          การจัดการเรียนรู้และการนิเทศ (Academic & Supervision)
        </h4>
      </div>

      {/* 4 Core KPI Cards */}
      <div className="row g-3 mb-4">
        <div className="col-sm-6 col-xl-3">
          <div className="card kpi-card kpi-card-blue h-100 p-3">
            <div className="d-flex justify-content-between">
              <div>
                <p className="mb-1 text-white-50 font-weight-bold">บุคลากรทั้งหมด</p>
                <h2 className="font-weight-bold mb-0">{personnel.length} <span className="fs-6 fw-normal">คน</span></h2>
                <small className="text-white-50">
                  ครูผู้สอน {totalTeachersCount} คน • ชาย {maleCount} / หญิง {femaleCount}
                </small>
              </div>
            </div>
            <i className="fa-solid fa-users kpi-icon-bg"></i>
          </div>
        </div>

        <div className="col-sm-6 col-xl-3">
          <div className="card kpi-card kpi-card-green h-100 p-3">
            <div className="d-flex justify-content-between">
              <div>
                <p className="mb-1 text-white-50 font-weight-bold">อัตราการส่งแผนการสอน</p>
                <h2 className="font-weight-bold mb-0">{submissionRate}%</h2>
                <small className="text-white-50">
                  ส่งแล้ว {submittedTeachersCount} จาก {totalTeachersCount} คน ({totalPlansCount} แผน)
                </small>
              </div>
            </div>
            <i className="fa-solid fa-file-circle-check kpi-icon-bg"></i>
          </div>
        </div>

        <div className="col-sm-6 col-xl-3">
          <div className="card kpi-card kpi-card-orange h-100 p-3">
            <div className="d-flex justify-content-between">
              <div>
                <p className="mb-1 text-white-50 font-weight-bold">รอ ผอ. ตรวจสอบ/อนุมัติ</p>
                <h2 className="font-weight-bold mb-0">{pendingDirectorCount} <span className="fs-6 fw-normal">แผน</span></h2>
                <small className="text-white-50">
                  {pendingDirectorCount > 0 ? 'มีแผนการสอนรอรับการพิจารณา' : 'ตรวจสอบครบถ้วนทุกแผนแล้ว'}
                </small>
              </div>
            </div>
            <i className="fa-solid fa-clock-rotate-left kpi-icon-bg"></i>
          </div>
        </div>

        <div className="col-sm-6 col-xl-3">
          <div className="card kpi-card kpi-card-purple h-100 p-3">
            <div className="d-flex justify-content-between">
              <div>
                <p className="mb-1 text-white-50 font-weight-bold">นิเทศเสร็จสิ้นแล้ว</p>
                <h2 className="font-weight-bold mb-0">{completedPlansCount} <span className="fs-6 fw-normal">แผน</span></h2>
                <small className="text-white-50">
                  {averageSchoolScore > 0 ? (
                    <span>คะแนนเฉลี่ย: <strong>{averageSchoolScore}/100</strong></span>
                  ) : (
                    'อยู่ระหว่างดำเนินการนิเทศ'
                  )}
                </small>
              </div>
            </div>
            <i className="fa-solid fa-award kpi-icon-bg"></i>
          </div>
        </div>
      </div>

      {/* Supervision Pipeline Progression Bar */}
      <div className="card shadow-sm border-0 mb-4">
        <div className="card-body p-3">
          <h6 className="font-weight-bold text-secondary mb-3">
            <i className="fa-solid fa-diagram-project text-primary me-2"></i>
            เส้นทางความก้าวหน้าการนิเทศแผนการสอน (Supervision Pipeline)
          </h6>
          <div className="row g-2 text-center">
            <div className="col-6 col-md-3">
              <div className="pipeline-step active">
                <span className="badge bg-primary px-2 py-1 mb-1">ขั้นตอนที่ 1</span>
                <div className="font-weight-bold text-dark fs-5">{totalPlansCount} แผน</div>
                <small className="text-muted">ครูส่งแผนการสอน</small>
              </div>
            </div>
            <div className="col-6 col-md-3">
              <div className="pipeline-step active">
                <span className="badge bg-info text-dark px-2 py-1 mb-1">ขั้นตอนที่ 2</span>
                <div className="font-weight-bold text-dark fs-5">{approvedPlansCount} แผน</div>
                <small className="text-muted">ผอ.อนุมัติให้ใช้แผน</small>
              </div>
            </div>
            <div className="col-6 col-md-3">
              <div className="pipeline-step active">
                <span className="badge bg-warning text-dark px-2 py-1 mb-1">ขั้นตอนที่ 3</span>
                <div className="font-weight-bold text-dark fs-5">{evaluatingPlansCount} แผน</div>
                <small className="text-muted">คกก. กำลังประเมิน</small>
              </div>
            </div>
            <div className="col-6 col-md-3">
              <div className="pipeline-step active">
                <span className="badge bg-success px-2 py-1 mb-1">ขั้นตอนที่ 4</span>
                <div className="font-weight-bold text-dark fs-5">{completedPlansCount} แผน</div>
                <small className="text-muted">นิเทศเสร็จสิ้นสมบูรณ์</small>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Department Breakdown Table */}
      <div className="card shadow-sm border-0 mb-4">
        <div className="card-header bg-white border-bottom d-flex align-items-center justify-content-between">
          <h6 className="font-weight-bold m-0 text-dark">
            <i className="fa-solid fa-layer-group text-primary me-2"></i>
            สถิติการส่งแผนและผลการนิเทศ จำแนกตาม 8 กลุ่มสาระการเรียนรู้
          </h6>
          <span className="text-muted small">เปรียบเทียบอัตราการส่งแผนและการนิเทศ</span>
        </div>
        <div className="card-body p-0">
          <div className="table-responsive">
            <table className="table table-hover table-striped align-middle m-0 table-custom">
              <thead>
                <tr>
                  <th style={{ width: '50px' }} className="text-center">ที่</th>
                  <th>กลุ่มสาระการเรียนรู้</th>
                  <th className="text-center" style={{ width: '100px' }}>จำนวนครู</th>
                  <th className="text-center" style={{ width: '110px' }}>ครูที่ส่งแผน</th>
                  <th style={{ width: '180px' }}>ความก้าวหน้าการส่ง</th>
                  <th className="text-center" style={{ width: '110px' }}>จำนวนแผน</th>
                  <th className="text-center" style={{ width: '120px' }}>นิเทศเสร็จสิ้น</th>
                </tr>
              </thead>
              <tbody>
                {departmentStats.map((dept, idx) => (
                  <tr key={dept.id}>
                    <td className="text-center">{idx + 1}</td>
                    <td className="font-weight-bold">{dept.name}</td>
                    <td className="text-center">{dept.teacherCount} คน</td>
                    <td className="text-center font-weight-bold">
                      <span className={dept.submittedTeachers === dept.teacherCount && dept.teacherCount > 0 ? 'text-success' : 'text-primary'}>
                        {dept.submittedTeachers} คน
                      </span>
                    </td>
                    <td>
                      <div className="d-flex align-items-center gap-2">
                        <div className="progress flex-grow-1 progress-thin">
                          <div
                            className={`progress-bar ${dept.rate === 100 ? 'bg-success' : dept.rate >= 50 ? 'bg-primary' : 'bg-warning'}`}
                            role="progressbar"
                            style={{ width: `${dept.rate}%` }}
                            aria-valuenow={dept.rate}
                            aria-valuemin="0"
                            aria-valuemax="100"
                          ></div>
                        </div>
                        <span className="small font-weight-bold">{dept.rate}%</span>
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
          <div className="d-flex align-items-center mb-3">
            <span className="dimension-badge bg-success text-white me-2">มิติที่ 2</span>
            <h4 className="font-weight-bold m-0 text-dark">
              <i className="fa-solid fa-id-card-clip text-success me-2"></i>
              อัตรากำลังและพัฒนาการบุคลากร (HR Analytics)
            </h4>
          </div>

          <div className="card shadow-sm border-0 h-100">
            <div className="card-body">
              {/* Academic Standing */}
              <h6 className="font-weight-bold text-secondary mb-3">
                <i className="fa-solid fa-ranking-star text-warning me-2"></i>
                สัดส่วนวิทยฐานะของครูในสถานศึกษา (ว.PA)
              </h6>
              <div className="mb-3">
                <div className="d-flex justify-content-between small mb-1">
                  <span>ชำนาญการพิเศษ (คศ.3): <strong>{academicStandingStats.special} คน</strong></span>
                  <span className="text-muted">{personnel.length > 0 ? Math.round((academicStandingStats.special / personnel.length) * 100) : 0}%</span>
                </div>
                <div className="progress progress-thin mb-3">
                  <div className="progress-bar bg-primary" style={{ width: `${(academicStandingStats.special / (personnel.length || 1)) * 100}%` }}></div>
                </div>

                <div className="d-flex justify-content-between small mb-1">
                  <span>ชำนาญการ (คศ.2): <strong>{academicStandingStats.senior} คน</strong></span>
                  <span className="text-muted">{personnel.length > 0 ? Math.round((academicStandingStats.senior / personnel.length) * 100) : 0}%</span>
                </div>
                <div className="progress progress-thin mb-3">
                  <div className="progress-bar bg-info" style={{ width: `${(academicStandingStats.senior / (personnel.length || 1)) * 100}%` }}></div>
                </div>

                <div className="d-flex justify-content-between small mb-1">
                  <span>ครู (คศ.1): <strong>{academicStandingStats.practitioner} คน</strong></span>
                  <span className="text-muted">{personnel.length > 0 ? Math.round((academicStandingStats.practitioner / personnel.length) * 100) : 0}%</span>
                </div>
                <div className="progress progress-thin mb-3">
                  <div className="progress-bar bg-success" style={{ width: `${(academicStandingStats.practitioner / (personnel.length || 1)) * 100}%` }}></div>
                </div>

                <div className="d-flex justify-content-between small mb-1">
                  <span>ครูผู้ช่วย: <strong>{academicStandingStats.assistant} คน</strong></span>
                  <span className="text-muted">{personnel.length > 0 ? Math.round((academicStandingStats.assistant / personnel.length) * 100) : 0}%</span>
                </div>
                <div className="progress progress-thin">
                  <div className="progress-bar bg-warning" style={{ width: `${(academicStandingStats.assistant / (personnel.length || 1)) * 100}%` }}></div>
                </div>
              </div>

              <hr className="my-3" />

              {/* Retirement Forecast */}
              <div className="d-flex justify-content-between align-items-center mb-2">
                <h6 className="font-weight-bold text-secondary m-0">
                  <i className="fa-solid fa-hourglass-half text-danger me-2"></i>
                  การคาดการณ์การเกษียณอายุราชการ (1-5 ปีล่วงหน้า)
                </h6>
                <span className="badge bg-light text-dark border">ปีปัจจุบัน พ.ศ. {retirementStats.currentYearBE}</span>
              </div>
              <div className="row g-2 mb-3 text-center">
                <div className="col-4">
                  <div className="p-2 border rounded bg-light">
                    <span className="text-danger font-weight-bold d-block fs-5">{retirementStats.thisYear} คน</span>
                    <small className="text-muted">เกษียณปีนี้ ({retirementStats.currentYearBE})</small>
                  </div>
                </div>
                <div className="col-4">
                  <div className="p-2 border rounded bg-light">
                    <span className="text-warning font-weight-bold d-block fs-5">{retirementStats.next1to3} คน</span>
                    <small className="text-muted">เกษียณใน 1–3 ปี</small>
                  </div>
                </div>
                <div className="col-4">
                  <div className="p-2 border rounded bg-light">
                    <span className="text-info font-weight-bold d-block fs-5">{retirementStats.next4to5} คน</span>
                    <small className="text-muted">เกษียณใน 4–5 ปี</small>
                  </div>
                </div>
              </div>

              {/* Upcoming Retirees Table */}
              {retirementStats.list.length > 0 && (
                <div className="table-responsive" style={{ maxHeight: '160px', overflowY: 'auto' }}>
                  <table className="table table-sm table-bordered m-0 small">
                    <thead className="table-light">
                      <tr>
                        <th>ชื่อ - นามสกุล</th>
                        <th>กลุ่มสาระฯ</th>
                        <th>เกษียณ พ.ศ.</th>
                        <th>อีก (ปี)</th>
                      </tr>
                    </thead>
                    <tbody>
                      {retirementStats.list.map((r) => (
                        <tr key={r.id}>
                          <td>{r.name}</td>
                          <td>{r.subject}</td>
                          <td className="text-center font-weight-bold text-danger">{r.retireYearBE}</td>
                          <td className="text-center">{r.yearsRemaining === 0 ? 'ปีนี้' : `${r.yearsRemaining} ปี`}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              <hr className="my-3" />

              {/* Certified Evaluators in school */}
              <div className="d-flex justify-content-between align-items-center">
                <div>
                  <h6 className="font-weight-bold m-0 text-dark">
                    <i className="fa-solid fa-user-check text-success me-2"></i>
                    ผู้นิเทศที่ได้รับการแต่งตั้งในโรงเรียน
                  </h6>
                  <small className="text-muted">ครูที่ผ่านการอนุมัติแต่งตั้งให้เป็นกรรมการนิเทศ</small>
                </div>
                <span className="badge bg-success fs-6 px-3 py-2">
                  {certifiedEvaluatorTeachers.length} คน
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* DIMENSION 3: นวัตกรรมและสื่อดิจิทัล */}
        <div className="col-lg-6">
          <div className="d-flex align-items-center mb-3">
            <span className="dimension-badge bg-info text-dark me-2">มิติที่ 3</span>
            <h4 className="font-weight-bold m-0 text-dark">
              <i className="fa-solid fa-lightbulb text-info me-2"></i>
              นวัตกรรมและสื่อการสอน (Active Learning & Media)
            </h4>
          </div>

          <div className="card shadow-sm border-0 h-100">
            <div className="card-body">
              {/* Learning Models */}
              <h6 className="font-weight-bold text-secondary mb-3">
                <i className="fa-solid fa-cube text-primary me-2"></i>
                รูปแบบการจัดการเรียนรู้เชิงรุกยอดนิยม (Learning Models)
              </h6>
              {learningModelStats.length === 0 ? (
                <p className="text-muted small fst-italic">ยังไม่มีข้อมูลรูปแบบการจัดการเรียนรู้ในภาคเรียนนี้</p>
              ) : (
                <div className="mb-4">
                  {learningModelStats.slice(0, 5).map(([model, count]) => {
                    const pct = totalPlansCount > 0 ? Math.round((count / totalPlansCount) * 100) : 0;
                    return (
                      <div key={model} className="mb-2">
                        <div className="d-flex justify-content-between small mb-1">
                          <span className="font-weight-bold text-dark">{model}</span>
                          <span><strong>{count} แผน</strong> ({pct}%)</span>
                        </div>
                        <div className="progress progress-thin">
                          <div className="progress-bar bg-info" style={{ width: `${pct}%` }}></div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              <hr className="my-3" />

              {/* Digital Media & Clips */}
              <h6 className="font-weight-bold text-secondary mb-3">
                <i className="fa-solid fa-video text-danger me-2"></i>
                การใช้คลิปวิดีโอการสอนและสื่อดิจิทัล (Digital Media Integration)
              </h6>
              <div className="row g-2 mb-3">
                <div className="col-6">
                  <div className="p-3 border rounded text-center bg-light">
                    <i className="fa-brands fa-youtube text-danger fa-2x mb-2"></i>
                    <h4 className="font-weight-bold text-dark mb-0">{clipStats.withClip} <span className="fs-6 fw-normal">แผน</span></h4>
                    <small className="text-muted">มีคลิปการสอนประกอบแผน ({clipStats.rate}%)</small>
                  </div>
                </div>
                <div className="col-6">
                  <div className="p-3 border rounded text-center bg-light">
                    <i className="fa-solid fa-file-pdf text-primary fa-2x mb-2"></i>
                    <h4 className="font-weight-bold text-dark mb-0">{totalPlansCount} <span className="fs-6 fw-normal">แผน</span></h4>
                    <small className="text-muted">มีไฟล์เอกสารแผนการสอน (100%)</small>
                  </div>
                </div>
              </div>

              <hr className="my-3" />

              {/* Quality & Score summary */}
              <h6 className="font-weight-bold text-secondary mb-2">
                <i className="fa-solid fa-star text-warning me-2"></i>
                การประเมินคุณภาพภาพรวมของสถานศึกษา
              </h6>
              <div className="p-3 rounded bg-light d-flex align-items-center justify-content-between">
                <div>
                  <span className="text-muted small d-block">ระดับคุณภาพการจัดการเรียนรู้</span>
                  <strong className="fs-5">{getQualityBadge(averageSchoolScore).label}</strong>
                </div>
                <div className="text-end">
                  <span className="text-muted small d-block">คะแนนประเมินเฉลี่ย</span>
                  <span className="fs-4 font-weight-bold text-primary">{averageSchoolScore} / 100</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* DIMENSION 4: Actionable Insights & Drilldown Tables */}
      {/* ========================================================================= */}
      <div className="d-flex align-items-center mb-3">
        <span className="dimension-badge bg-warning text-dark me-2">มิติที่ 4</span>
        <h4 className="font-weight-bold m-0 text-dark">
          <i className="fa-solid fa-list-check text-warning me-2"></i>
          เครื่องมือติดตามและอำนวยความสะดวกสำหรับผู้บริหาร (Actionable Insights)
        </h4>
      </div>

      <div className="card shadow-sm border-0 mb-5">
        <div className="card-header bg-white border-bottom p-2">
          <ul className="nav nav-tabs custom-nav-tabs border-0 no-print" role="tablist">
            <li className="nav-item">
              <button
                className={`nav-link ${activeTab === 'unsubmitted' ? 'active' : ''}`}
                onClick={() => setActiveTab('unsubmitted')}
              >
                <i className="fa-solid fa-user-xmark text-danger me-1"></i> ครูที่ยังไม่ส่งแผน ({unsubmittedTeachers.length})
              </button>
            </li>
            <li className="nav-item">
              <button
                className={`nav-link ${activeTab === 'pending' ? 'active' : ''}`}
                onClick={() => setActiveTab('pending')}
              >
                <i className="fa-solid fa-clock text-warning me-1"></i> แผนที่รอดำเนินการ ({pendingPlans.length})
              </button>
            </li>
            <li className="nav-item">
              <button
                className={`nav-link ${activeTab === 'completed' ? 'active' : ''}`}
                onClick={() => setActiveTab('completed')}
              >
                <i className="fa-solid fa-circle-check text-success me-1"></i> ผลการนิเทศและข้อเสนอแนะ ({completedSupervisionList.length})
              </button>
            </li>
            <li className="nav-item">
              <button
                className={`nav-link ${activeTab === 'directory' ? 'active' : ''}`}
                onClick={() => setActiveTab('directory')}
              >
                <i className="fa-solid fa-address-book text-primary me-1"></i> ทำเนียบบุคลากรทั้งหมด ({personnel.length})
              </button>
            </li>
          </ul>
        </div>

        <div className="card-body">
          {/* TAB 1: ครูที่ยังไม่ส่งแผน */}
          {activeTab === 'unsubmitted' && (
            <div>
              <div className="d-flex justify-content-between align-items-center mb-3 flex-wrap gap-2">
                <p className="text-muted m-0 small">
                  รายชื่อครูผู้สอนที่ยังไม่มีประวัติการส่งแผนการสอนในภาคเรียนนี้ ({unsubmittedTeachers.length} คน)
                </p>
                {unsubmittedTeachers.length > 0 && (
                  <button className="btn btn-sm btn-outline-secondary" onClick={handleCopyUnsubmitted}>
                    <i className="fa-regular fa-copy me-1"></i> คัดลอกรายชื่อส่งกลุ่มไลน์
                  </button>
                )}
              </div>

              {unsubmittedTeachers.length === 0 ? (
                <div className="text-center py-5">
                  <i className="fa-solid fa-circle-check text-success fa-3x mb-3"></i>
                  <h5 className="font-weight-bold text-success">ครูทุกคนส่งแผนการสอนครบถ้วน 100%!</h5>
                  <p className="text-muted mb-0">ไม่มีครูค้างส่งแผนการสอนในภาคเรียนนี้</p>
                </div>
              ) : (
                <div className="table-responsive">
                  <table className="table table-hover table-striped align-middle table-bordered table-custom">
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
                            <td className="text-center">{idx + 1}</td>
                            <td className="font-weight-bold">{name}</td>
                            <td>{lookups.teachSubject[t.teach_subject] || t.teach_subject_name || '-'}</td>
                            <td>{lookups.position[t.position_id] || t.level || 'ครู'} ({lookups.academic[t.academic_id] || 'ไม่มีวิทยฐานะ'})</td>
                            <td>
                              {t.phone ? (
                                <a href={`tel:${t.phone}`} className="btn btn-xs btn-outline-primary me-2">
                                  <i className="fa-solid fa-phone me-1"></i> {t.phone}
                                </a>
                              ) : (
                                <span className="text-muted small">- ไม่มีเบอร์ -</span>
                              )}
                              {t.email && (
                                <a href={`mailto:${t.email}`} className="btn btn-xs btn-outline-secondary" title={t.email}>
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
                  <h5 className="font-weight-bold text-success">ไม่มีแผนค้างดำเนินการ!</h5>
                  <p className="text-muted mb-0">แผนการสอนทั้งหมดได้รับการตรวจสอบและแต่งตั้งกรรมการเรียบร้อยแล้ว</p>
                </div>
              ) : (
                <div className="table-responsive">
                  <table className="table table-hover table-striped align-middle table-bordered table-custom">
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
                          <td className="text-center">{idx + 1}</td>
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
                              <Link to={`/Plan_Check?planid=${p.planid}`} className="btn btn-sm btn-primary">
                                <i className="fa-solid fa-file-signature me-1"></i> ตรวจแผน
                              </Link>
                            ) : !p.committee1 ? (
                              <Link to={`/appointment?planid=${p.planid}`} className="btn btn-sm btn-warning">
                                <i className="fa-solid fa-user-plus me-1"></i> แต่งตั้ง
                              </Link>
                            ) : (
                              <Link to={`/view_scoring?planid=${p.planid}`} className="btn btn-sm btn-outline-info">
                                <i className="fa-solid fa-eye me-1"></i> ดูสถานะ
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

          {/* TAB 3: ผลการนิเทศและข้อเสนอแนะ */}
          {activeTab === 'completed' && (
            <div>
              <p className="text-muted small mb-3">
                แผนการสอนที่ผ่านการประเมินนิเทศเสร็จสิ้นสมบูรณ์ ({completedSupervisionList.length} แผน)
              </p>
              {completedSupervisionList.length === 0 ? (
                <div className="text-center py-5">
                  <i className="fa-solid fa-clock-rotate-left text-muted fa-3x mb-3"></i>
                  <h5 className="text-secondary font-weight-bold">ยังไม่มีแผนที่นิเทศเสร็จสิ้นสมบูรณ์</h5>
                  <p className="text-muted mb-0">เมื่อกรรมการบันทึกผลการนิเทศครบถ้วน ระบบจะสรุปผลสัมฤทธิ์ที่นี่</p>
                </div>
              ) : (
                <div className="table-responsive">
                  <table className="table table-hover table-striped align-middle table-bordered table-custom">
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
                          <td className="text-center">{idx + 1}</td>
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
                                className="btn btn-xs btn-outline-danger"
                              >
                                <i className="fa-brands fa-youtube me-1"></i> ดูคลิป
                              </a>
                            ) : (
                              <span className="text-muted small">- ไม่มีคลิป -</span>
                            )}
                          </td>
                          <td className="text-center">
                            <Link to={`/view_scoring?planid=${p.planid}`} className="btn btn-sm btn-success">
                              <i className="fa-solid fa-chart-simple me-1"></i> ดูคะแนน
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
                      placeholder="ค้นหาชื่อ, กลุ่มสาระ, ตำแหน่ง, วิทยฐานะ..."
                      value={searchDirectory}
                      onChange={(e) => setSearchDirectory(e.target.value)}
                    />
                    {searchDirectory && (
                      <button className="btn btn-outline-secondary" onClick={() => setSearchDirectory('')}>
                        <i className="fa-solid fa-times"></i>
                      </button>
                    )}
                  </div>
                </div>
              </div>

              <div className="table-responsive">
                <table className="table table-hover table-striped align-middle table-bordered table-custom">
                  <thead>
                    <tr>
                      <th style={{ width: '50px' }} className="text-center">ที่</th>
                      <th>ชื่อ - นามสกุล</th>
                      <th>ตำแหน่ง</th>
                      <th>วิทยฐานะ</th>
                      <th>กลุ่มสาระฯ</th>
                      <th className="text-center">หัวหน้ากลุ่ม</th>
                      <th className="text-center">ปีเกษียณ</th>
                      <th className="text-center">สถานะส่งแผน</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredDirectory.map((p, idx) => {
                      const name = (lookups.prefix[p.prefix] || '') + p.name + ' ' + p.lastname;
                      const hasSubmitted = submittedPeopleIds.has(String(p.people_id));

                      let retireText = '-';
                      if (p.birthday) {
                        const bParts = String(p.birthday).split('-');
                        if (bParts.length === 3) {
                          const y = parseInt(bParts[0], 10);
                          const m = parseInt(bParts[1], 10);
                          const d = parseInt(bParts[2], 10);
                          let rAD = y + 60;
                          if (m > 10 || (m === 10 && d > 1)) rAD += 1;
                          retireText = `${rAD + 543}`;
                        }
                      }

                      return (
                        <tr key={p.id || p.people_id}>
                          <td className="text-center">{idx + 1}</td>
                          <td className="font-weight-bold">{name}</td>
                          <td>{lookups.position[p.position_id] || p.level || 'ครู'}</td>
                          <td>{lookups.academic[p.academic_id] || '-'}</td>
                          <td>{lookups.teachSubject[p.teach_subject] || '-'}</td>
                          <td className="text-center">
                            {p.headDepartment === '1' || p.headDepartment === 1 ? (
                              <i className="fa-solid fa-circle-check text-success" title="หัวหน้ากลุ่มสาระฯ"></i>
                            ) : (
                              '-'
                            )}
                          </td>
                          <td className="text-center font-weight-bold text-secondary">{retireText}</td>
                          <td className="text-center">
                            {hasSubmitted ? (
                              <span className="badge bg-success">ส่งแล้ว</span>
                            ) : (
                              <span className="badge bg-danger">ยังไม่ส่ง</span>
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

      {/* Print Signature Box */}
      <div className="print-only mt-5 pt-4">
        <div className="row">
          <div className="col-6 text-center">
            <p>รายงานข้อมูลโดย</p>
            <br /><br />
            <p>( ................................................................ )</p>
            <p>หัวหน้าฝ่ายบริหารงานวิชาการ</p>
          </div>
          <div className="col-6 text-center">
            <p>รับรองความถูกต้องของรายงาน</p>
            <br /><br />
            <p>
              ( {(lookups.prefix[profile?.prefix] || '') + profile?.name + ' ' + (profile?.lastname || '')} )
            </p>
            <p>ผู้อำนวยการโรงเรียน{schoolData?.school_name || ''}</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default InfoDirectorSchool;
