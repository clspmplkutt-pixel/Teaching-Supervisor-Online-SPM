import React, { useEffect, useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import Swal from 'sweetalert2';
import { supabase } from '../supabaseClient';
import { useAuth } from '../contexts/AuthContext';
import { useUserProfile } from '../hooks/useUserProfile';
import useUserLookups from '../hooks/useUserLookups';
import './TeacherDashboard.css';

const InfoTeacher = () => {
  const { user } = useAuth();
  const { profile, loading: profileLoading } = useUserProfile();
  const { lookups, loading: lookupsLoading } = useUserLookups();

  const [loading, setLoading] = useState(true);
  const [plans, setPlans] = useState([]);
  const [scores, setScores] = useState([]);
  const [committeeProfiles, setCommitteeProfiles] = useState({});
  const [selectedYear, setSelectedYear] = useState('ALL');
  const [selectedPlanForCert, setSelectedPlanForCert] = useState(null);

  const teacherPeopleId = profile?.people_id || user?.user_metadata?.people_id || user?.email || '';

  const loadTeacherData = async () => {
    if (!teacherPeopleId) {
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      // 1. Fetch Teacher's plans
      const { data: myPlans, error: plansErr } = await supabase
        .from('tbl_sendplan')
        .select('*')
        .eq('people_id', teacherPeopleId)
        .order('plan_senddate', { ascending: false });

      if (plansErr) throw plansErr;
      const planList = myPlans || [];
      setPlans(planList);

      // 2. Fetch Scores for Teacher's plans
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

      // 3. Fetch Committee profiles (names & academics)
      const committeeIds = new Set();
      planList.forEach((p) => {
        if (p.committee1) committeeIds.add(String(p.committee1).trim());
        if (p.committee2) committeeIds.add(String(p.committee2).trim());
        if (p.committee3) committeeIds.add(String(p.committee3).trim());
        if (p.committee4) committeeIds.add(String(p.committee4).trim());
        if (p.committee5) committeeIds.add(String(p.committee5).trim());
      });

      if (committeeIds.size > 0) {
        const { data: cUsers } = await supabase
          .from('tbl_Users')
          .select('people_id, prefix, name, lastname, academic_id, position_id, school')
          .in('people_id', Array.from(committeeIds));

        const cMap = {};
        (cUsers || []).forEach((u) => {
          cMap[String(u.people_id)] = u;
        });
        setCommitteeProfiles(cMap);
      }
    } catch (err) {
      console.error('InfoTeacher load error:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!profileLoading && teacherPeopleId) {
      loadTeacherData();
    }
  }, [profileLoading, teacherPeopleId]);

  // Academic Years
  const academicYears = useMemo(() => {
    const set = new Set();
    plans.forEach((p) => {
      if (p.edu_year) set.add(String(p.edu_year).trim());
    });
    return Array.from(set).sort().reverse();
  }, [plans]);

  // Filtered Plans by Year
  const filteredPlans = useMemo(() => {
    if (selectedYear === 'ALL') return plans;
    return plans.filter((p) => String(p.edu_year).trim() === String(selectedYear).trim());
  }, [plans, selectedYear]);

  // ==========================================
  // DIMENSION 1: Personal KPI Metrics
  // ==========================================
  const totalPlansCount = filteredPlans.length;

  const approvedCount = useMemo(() => {
    return filteredPlans.filter((p) => p.plan_approve === '1' || p.plan_approve === 1 || Number(p.plan_status) >= 2).length;
  }, [filteredPlans]);

  const evaluatingCount = useMemo(() => {
    return filteredPlans.filter((p) => Number(p.plan_status) === 5 || Number(p.plan_status) === 6).length;
  }, [filteredPlans]);

  const completedCount = useMemo(() => {
    return filteredPlans.filter((p) => Number(p.plan_status) === 7).length;
  }, [filteredPlans]);

  // Map scores by plan
  const planScoreMap = useMemo(() => {
    const map = {};
    scores.forEach((s) => {
      const pid = String(s.planid);
      if (!map[pid]) map[pid] = { total: 0, weight: 0, count: 0 };
      map[pid].total += Number(s.score) || 0;
      map[pid].weight += Number(s.score_weight) || 0;
      map[pid].count += 1;
    });

    const result = {};
    Object.keys(map).forEach((pid) => {
      const item = map[pid];
      const avg = item.weight > 0 ? (item.total / item.weight) * 100 : item.total;
      result[pid] = Math.round(avg * 10) / 10;
    });
    return result;
  }, [scores]);

  // Overall Average Score for Teacher
  const overallAvgScore = useMemo(() => {
    const pids = Object.keys(planScoreMap);
    if (pids.length === 0) return 0;
    const sum = pids.reduce((acc, pid) => acc + planScoreMap[pid], 0);
    return Math.round((sum / pids.length) * 10) / 10;
  }, [planScoreMap]);

  const getQualityBadge = (score) => {
    if (score >= 90) return { label: 'ดีเยี่ยม (Excellent)', color: 'bg-success text-white' };
    if (score >= 80) return { label: 'ดีมาก (Very Good)', color: 'bg-primary text-white' };
    if (score >= 70) return { label: 'ดี (Good)', color: 'bg-info text-dark' };
    if (score >= 60) return { label: 'พอใช้ (Fair)', color: 'bg-warning text-dark' };
    if (score > 0) return { label: 'ควรปรับปรุง', color: 'bg-danger text-white' };
    return { label: 'รอดำเนินการประเมิน', color: 'bg-secondary text-white' };
  };

  // ==========================================
  // DIMENSION 2: To-Do & Action Items
  // ==========================================
  // Plans that need revision (status = 3)
  const revisionPlans = useMemo(() => {
    return filteredPlans.filter((p) => Number(p.plan_status) === 3);
  }, [filteredPlans]);

  // Plans that need video clips / post-teaching reflection (status = 2)
  const pendingClipPlans = useMemo(() => {
    return filteredPlans.filter((p) => Number(p.plan_status) === 2);
  }, [filteredPlans]);

  // Plans waiting for Director approval (status = 1 or 4)
  const pendingDirectorApprovalPlans = useMemo(() => {
    return filteredPlans.filter((p) => Number(p.plan_status) === 1 || Number(p.plan_status) === 4);
  }, [filteredPlans]);

  // Print PA Supervision Certificate
  const handlePrintCertificate = (plan) => {
    setSelectedPlanForCert(plan);
    setTimeout(() => {
      window.print();
    }, 300);
  };

  const getTimelineStep = (status) => {
    const s = Number(status);
    if (s === 1 || s === 4) return 1;
    if (s === 2) return 2;
    if (s === 5 || s === 6) return 3;
    if (s === 7) return 4;
    return 1;
  };

  const isLoading = profileLoading || lookupsLoading || loading;

  if (isLoading) {
    return (
      <div className="text-center p-5">
        <div className="spinner-border text-success" style={{ width: '3rem', height: '3rem' }} role="status"></div>
        <h5 className="mt-3 font-weight-bold text-secondary">กำลังโหลดข้อมูลศูนย์การจัดการเรียนรู้ของครู...</h5>
        <p className="text-muted">กำลังรวบรวมแผนการสอน สถานะการนิเทศ และผลการประเมิน ว.PA</p>
      </div>
    );
  }

  const teacherFullName = `${lookups.prefix[profile?.prefix] || ''}${profile?.name || ''} ${profile?.lastname || ''}`;
  const schoolName = lookups.school[profile?.school] || 'โรงเรียน';
  const academicName = lookups.academic[profile?.academic_id] || 'ไม่มีวิทยฐานะ';
  const subjectAreaName = lookups.teachSubject[profile?.teach_subject] || profile?.teach_subject_name || 'ทั่วไป';

  return (
    <div className="teacher-workspace-container">
      {/* 1. Teacher Hero Header */}
      <div className="teacher-hero no-print">
        <div className="row align-items-center">
          <div className="col-lg-8 mb-3 mb-lg-0">
            <span className="badge bg-light text-dark mb-2 px-3 py-1 font-weight-bold">
              <i className="fa-solid fa-graduation-cap text-success me-1"></i> Teacher Supervision Workspace
            </span>
            <h2 className="font-weight-bold mb-1">ยินดีต้อนรับ, ครู{teacherFullName}</h2>
            <p className="mb-0 text-white-50">
              {schoolName} • วิทยฐานะ: <strong>{academicName}</strong> • กลุ่มสาระฯ: <strong>{subjectAreaName}</strong>
            </p>
          </div>
          <div className="col-lg-4 text-lg-end">
            <div className="d-flex flex-wrap justify-content-lg-end gap-2">
              <div className="input-group input-group-sm" style={{ width: 'auto' }}>
                <span className="input-group-text bg-white text-dark font-weight-bold">ปีการศึกษา</span>
                <select
                  className="form-select form-select-sm"
                  value={selectedYear}
                  onChange={(e) => setSelectedYear(e.target.value)}
                >
                  <option value="ALL">ทุกปีการศึกษา</option>
                  {academicYears.map((yr) => (
                    <option key={yr} value={yr}>
                      ปีการศึกษา {yr}
                    </option>
                  ))}
                </select>
              </div>
              <Link to="/sendplan" className="btn btn-sm btn-light font-weight-bold shadow-sm">
                <i className="fa-solid fa-plus-circle text-success me-1"></i> ส่งแผนใหม่
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* DIMENSION 4: Quick Action Shortcuts Bar */}
      {/* ========================================================================= */}
      <div className="row g-2 mb-4 quick-actions-bar no-print">
        <div className="col-md-4">
          <Link to="/sendplan" className="btn btn-outline-success w-100 p-3 text-start shadow-sm bg-white d-flex align-items-center">
            <div className="rounded-circle bg-success text-white p-3 me-3 d-flex align-items-center justify-content-center" style={{ width: '48px', height: '48px' }}>
              <i className="fa-solid fa-cloud-arrow-up fs-5"></i>
            </div>
            <div>
              <strong className="d-block text-dark">ส่งแผนการจัดการเรียนรู้</strong>
              <small className="text-muted">อัปโหลดแผนการสอนภาคเรียนใหม่</small>
            </div>
          </Link>
        </div>
        <div className="col-md-4">
          <Link to="/statusplan_clip" className="btn btn-outline-primary w-100 p-3 text-start shadow-sm bg-white d-flex align-items-center">
            <div className="rounded-circle bg-primary text-white p-3 me-3 d-flex align-items-center justify-content-center" style={{ width: '48px', height: '48px' }}>
              <i className="fa-solid fa-video fs-5"></i>
            </div>
            <div>
              <strong className="d-block text-dark">แนบคลิป & บันทึกหลังสอน</strong>
              <small className="text-muted">ส่งลิงก์คลิปการสอนและผลสะท้อนคิด</small>
            </div>
          </Link>
        </div>
        <div className="col-md-4">
          <Link to="/statusplan" className="btn btn-outline-info w-100 p-3 text-start shadow-sm bg-white d-flex align-items-center">
            <div className="rounded-circle bg-info text-white p-3 me-3 d-flex align-items-center justify-content-center" style={{ width: '48px', height: '48px' }}>
              <i className="fa-solid fa-list-check fs-5"></i>
            </div>
            <div>
              <strong className="d-block text-dark">ประวัติและสถานะแผนทั้งหมด</strong>
              <small className="text-muted">ตรวจสอบสถานะและคะแนนนิเทศ</small>
            </div>
          </Link>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* DIMENSION 2: To-Do & Alerts for Teacher (Action Items) */}
      {/* ========================================================================= */}
      {(revisionPlans.length > 0 || pendingClipPlans.length > 0) && (
        <div className="mb-4 no-print">
          <div className="d-flex align-items-center mb-2">
            <span className="badge bg-danger text-white me-2">มิติที่ 2: งานด่วน</span>
            <h5 className="font-weight-bold m-0 text-dark">
              <i className="fa-solid fa-bell text-danger me-2"></i> สิ่งที่ต้องดำเนินการ (Action Required)
            </h5>
          </div>

          {/* 1. Plans that need revision */}
          {revisionPlans.map((rp) => (
            <div key={rp.planid} className="card alert-todo-card alert-todo-danger p-3 mb-2">
              <div className="d-flex justify-content-between align-items-start flex-wrap gap-2">
                <div>
                  <span className="badge bg-danger mb-1">
                    <i className="fa-solid fa-triangle-exclamation me-1"></i> ผอ. ไม่อนุมัติแผน / กรุณาแก้ไข
                  </span>
                  <h6 className="font-weight-bold text-dark mb-1">
                    {rp.subject_name} ({rp.subject_code}) - {rp.subject_name_plan}
                  </h6>
                  <div className="p-2 bg-light rounded text-danger small mb-1">
                    <strong>ข้อเสนอแนะจาก ผอ.:</strong> {rp.plan_ds_comment || 'กรุณาปรับปรุงแก้ไขแผนตามข้อเสนอแนะ'}
                  </div>
                </div>
                <Link to={`/sendplan?planid=${rp.planid}&edit=true`} className="btn btn-sm btn-danger font-weight-bold">
                  <i className="fa-solid fa-pen-to-square me-1"></i> แก้ไขแผนนี้
                </Link>
              </div>
            </div>
          ))}

          {/* 2. Plans waiting for video clip & post-teaching note */}
          {pendingClipPlans.map((cp) => (
            <div key={cp.planid} className="card alert-todo-card alert-todo-warning p-3 mb-2">
              <div className="d-flex justify-content-between align-items-start flex-wrap gap-2">
                <div>
                  <span className="badge bg-warning text-dark mb-1">
                    <i className="fa-solid fa-clock me-1"></i> ผอ. อนุมัติแผนแล้ว • รอส่งคลิปและบันทึกหลังสอน
                  </span>
                  <h6 className="font-weight-bold text-dark mb-1">
                    {cp.subject_name} ({cp.subject_code}) - {cp.subject_name_plan}
                  </h6>
                  <p className="text-muted small mb-0">
                    เมื่อจัดการเรียนรู้เรียบร้อยแล้ว กรุณาแนบคลิปวิดีโอ (YouTube) และบันทึกผลหลังการจัดการเรียนรู้เพื่อส่งให้คณะกรรมการนิเทศ
                  </p>
                </div>
                <Link to={`/statusplan_clip?planid=${cp.planid}`} className="btn btn-sm btn-warning font-weight-bold text-dark">
                  <i className="fa-solid fa-video me-1"></i> แนบคลิป/บันทึก
                </Link>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ========================================================================= */}
      {/* DIMENSION 1: Personal KPI Cards & Progress */}
      {/* ========================================================================= */}
      <div className="d-flex align-items-center mb-3 no-print">
        <span className="badge bg-primary text-white me-2">มิติที่ 1</span>
        <h4 className="font-weight-bold m-0 text-dark">
          <i className="fa-solid fa-chart-pie text-primary me-2"></i>
          สถานะแผนการสอนของฉัน (My Plan & Supervision Status)
        </h4>
      </div>

      <div className="row g-3 mb-4 no-print">
        <div className="col-sm-6 col-xl-3">
          <div className="card teacher-kpi-card p-3 h-100 text-white" style={{ background: 'linear-gradient(135deg, #1d976c 0%, #93f9b9 100%)' }}>
            <p className="mb-1 text-white-50 font-weight-bold">แผนที่ส่งทั้งหมด</p>
            <h2 className="font-weight-bold mb-0">{totalPlansCount} <span className="fs-6 fw-normal">แผน</span></h2>
            <small className="text-white-50">ในภาคเรียนที่เลือก</small>
            <i className="fa-solid fa-file-lines kpi-icon-watermark"></i>
          </div>
        </div>

        <div className="col-sm-6 col-xl-3">
          <div className="card teacher-kpi-card p-3 h-100 text-white" style={{ background: 'linear-gradient(135deg, #2193b0 0%, #6dd5ed 100%)' }}>
            <p className="mb-1 text-white-50 font-weight-bold">ผอ. อนุมัติแผนแล้ว</p>
            <h2 className="font-weight-bold mb-0">{approvedCount} <span className="fs-6 fw-normal">แผน</span></h2>
            <small className="text-white-50">คิดเป็น {totalPlansCount > 0 ? Math.round((approvedCount / totalPlansCount) * 100) : 0}% ของแผนที่ส่ง</small>
            <i className="fa-solid fa-signature kpi-icon-watermark"></i>
          </div>
        </div>

        <div className="col-sm-6 col-xl-3">
          <div className="card teacher-kpi-card p-3 h-100 text-white" style={{ background: 'linear-gradient(135deg, #f7971e 0%, #ffd200 100%)' }}>
            <p className="mb-1 text-white-50 font-weight-bold">อยู่ระหว่างการนิเทศ</p>
            <h2 className="font-weight-bold mb-0">{evaluatingCount} <span className="fs-6 fw-normal">แผน</span></h2>
            <small className="text-white-50">กรรมการกำลังประเมินผล</small>
            <i className="fa-solid fa-users-viewfinder kpi-icon-watermark"></i>
          </div>
        </div>

        <div className="col-sm-6 col-xl-3">
          <div className="card teacher-kpi-card p-3 h-100 text-white" style={{ background: 'linear-gradient(135deg, #8a2387 0%, #e94057 50%, #f27121 100%)' }}>
            <p className="mb-1 text-white-50 font-weight-bold">นิเทศเสร็จสมบูรณ์</p>
            <h2 className="font-weight-bold mb-0">{completedCount} <span className="fs-6 fw-normal">แผน</span></h2>
            <small className="text-white-50">
              {overallAvgScore > 0 ? `คะแนนเฉลี่ย: ${overallAvgScore}/100` : 'พร้อมพิมพ์รายงาน ว.PA'}
            </small>
            <i className="fa-solid fa-trophy kpi-icon-watermark"></i>
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* DIMENSION 1 & 3: Interactive Lesson Plans List & PA Supervision Reports */}
      {/* ========================================================================= */}
      <div className="d-flex align-items-center justify-content-between mb-3 no-print">
        <div className="d-flex align-items-center">
          <span className="badge bg-success text-white me-2">มิติที่ 1 & 3</span>
          <h4 className="font-weight-bold m-0 text-dark">
            <i className="fa-solid fa-list-check text-success me-2"></i>
            รายการแผนการสอนและผลการนิเทศ (My Plans & PA Evaluation)
          </h4>
        </div>
        <span className="text-muted small">พบทั้งหมด {filteredPlans.length} แผน</span>
      </div>

      {filteredPlans.length === 0 ? (
        <div className="card shadow-sm border-0 p-5 text-center mb-4 no-print">
          <i className="fa-solid fa-folder-open text-muted fa-3x mb-3"></i>
          <h5 className="font-weight-bold text-secondary">ยังไม่มีข้อมูลแผนการจัดการเรียนรู้</h5>
          <p className="text-muted mb-3">คุณครูสามารถเริ่มต้นส่งแผนการสอนเข้าสู่ระบบเพื่อขอรับการนิเทศได้ทันที</p>
          <div>
            <Link to="/sendplan" className="btn btn-success font-weight-bold">
              <i className="fa-solid fa-plus-circle me-1"></i> ส่งแผนการจัดการเรียนรู้ใหม่
            </Link>
          </div>
        </div>
      ) : (
        <div className="row g-3 mb-4 no-print">
          {filteredPlans.map((p) => {
            const currentStep = getTimelineStep(p.plan_status);
            const planScore = planScoreMap[String(p.planid)];
            const quality = planScore ? getQualityBadge(planScore) : null;
            const hasClip = p.plan_clip && String(p.plan_clip).trim() !== '';

            return (
              <div key={p.planid} className="col-12">
                <div className="card shadow-sm border-0">
                  <div className="card-body">
                    {/* Top Row: Subject & Status */}
                    <div className="d-flex justify-content-between align-items-start flex-wrap gap-2 mb-2">
                      <div>
                        <span className="badge bg-light text-dark border me-2">
                          ปีการศึกษา {p.edu_year} (ภาคเรียนที่ {p.edu_term})
                        </span>
                        <span className="badge bg-light text-primary border me-2">
                          {lookups.teachSubject[p.teach_subject_id] || 'กลุ่มสาระทั่วไป'}
                        </span>
                        <span className="badge bg-light text-secondary border">
                          รูปแบบ: {p.learning_model || 'Active Learning'}
                        </span>
                        <h5 className="font-weight-bold text-dark mt-2 mb-1">
                          {p.subject_name} ({p.subject_code}) • {p.subject_name_plan || p.subject_content}
                        </h5>
                        <small className="text-muted">
                          วันที่สอน: {p.teach_date || '-'} ({p.teach_timestart || ''} - {p.teach_timeend || ''}) • {p.teach_minute || 50} นาที
                        </small>
                      </div>

                      {/* Score or Status Badge */}
                      <div className="text-end">
                        {Number(p.plan_status) === 7 ? (
                          <div>
                            <span className={`badge px-3 py-2 fs-6 mb-1 ${quality ? quality.color : 'bg-success'}`}>
                              <i className="fa-solid fa-star me-1"></i> {quality ? quality.label : 'ผ่านการประเมิน'}
                            </span>
                            {planScore && (
                              <div className="font-weight-bold text-primary fs-5">
                                {planScore} <span className="fs-6 text-muted">/ 100 คะแนน</span>
                              </div>
                            )}
                          </div>
                        ) : Number(p.plan_status) === 3 ? (
                          <span className="badge bg-danger px-3 py-2 fs-6">
                            <i className="fa-solid fa-circle-xmark me-1"></i> ให้แก้ไขแผน
                          </span>
                        ) : (
                          <span className="badge bg-info text-dark px-3 py-2 fs-6">
                            {lookups.status[String(p.plan_status)] || 'อยู่ระหว่างดำเนินการ'}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Timeline Tracker */}
                    <div className="timeline-track my-3">
                      <div className="text-center">
                        <div className={`timeline-node ${currentStep >= 1 ? 'done' : ''}`}>1</div>
                        <span className="timeline-label">ส่งแผน</span>
                      </div>
                      <div className="text-center">
                        <div className={`timeline-node ${currentStep >= 2 ? 'done' : currentStep === 1 ? 'current' : ''}`}>2</div>
                        <span className="timeline-label">ผอ.อนุมัติ</span>
                      </div>
                      <div className="text-center">
                        <div className={`timeline-node ${currentStep >= 3 ? 'done' : currentStep === 2 ? 'current' : ''}`}>3</div>
                        <span className="timeline-label">ส่งคลิป/บันทึก</span>
                      </div>
                      <div className="text-center">
                        <div className={`timeline-node ${currentStep >= 4 ? 'done' : currentStep === 3 ? 'current' : ''}`}>4</div>
                        <span className="timeline-label">คกก.นิเทศ</span>
                      </div>
                      <div className="text-center">
                        <div className={`timeline-node ${currentStep >= 4 ? 'done' : ''}`}>
                          <i className="fa-solid fa-check"></i>
                        </div>
                        <span className="timeline-label">เสร็จสิ้น</span>
                      </div>
                    </div>

                    {/* Committee members */}
                    <div className="p-2 bg-light rounded mb-3 small d-flex align-items-center justify-content-between flex-wrap gap-2">
                      <div>
                        <strong className="text-secondary">คณะกรรมการนิเทศ: </strong>
                        {[p.committee1, p.committee2, p.committee3, p.committee4, p.committee5].filter(Boolean).length === 0 ? (
                          <span className="text-muted fst-italic">รอ ผอ. แต่งตั้งคณะกรรมการ</span>
                        ) : (
                          <span>
                            {[p.committee1, p.committee2, p.committee3].filter(Boolean).map((cid, i) => {
                              const cm = committeeProfiles[String(cid)];
                              const cName = cm ? `${lookups.prefix[cm.prefix] || ''}${cm.name} ${cm.lastname}` : `กรรมการ ${i + 1}`;
                              return (
                                <span key={cid} className="badge bg-white text-dark border me-1">
                                  <i className="fa-solid fa-user-check text-primary me-1"></i> {cName}
                                </span>
                              );
                            })}
                          </span>
                        )}
                      </div>

                      {/* Links to Plan file & Video Clip */}
                      <div className="d-flex gap-2">
                        {p.plan_file && (
                          <a href={p.plan_file} target="_blank" rel="noreferrer" className="btn btn-xs btn-outline-secondary">
                            <i className="fa-solid fa-file-pdf text-danger me-1"></i> เอกสารแผน
                          </a>
                        )}
                        {hasClip && (
                          <a href={`https://www.youtube.com/watch?v=${p.plan_clip}`} target="_blank" rel="noreferrer" className="btn btn-xs btn-outline-danger">
                            <i className="fa-brands fa-youtube me-1"></i> คลิปการสอน
                          </a>
                        )}
                      </div>
                    </div>

                    {/* Bottom Action Bar */}
                    <div className="d-flex justify-content-between align-items-center flex-wrap gap-2 pt-2 border-top">
                      <div className="small text-muted">
                        {Number(p.plan_status) === 2 && (
                          <span className="text-warning font-weight-bold">
                            <i className="fa-solid fa-arrow-right me-1"></i> ขั้นตอนต่อไป: จัดกิจกรรมการเรียนรู้และแนบคลิป/บันทึกหลังสอน
                          </span>
                        )}
                        {Number(p.plan_status) === 7 && (
                          <span className="text-success font-weight-bold">
                            <i className="fa-solid fa-circle-check me-1"></i> นิเทศเสร็จสิ้นสมบูรณ์ • พร้อมนำไปใช้เป็นหลักฐาน ว.PA
                          </span>
                        )}
                      </div>

                      <div className="d-flex gap-2">
                        {/* PA Report Certificate Button */}
                        {Number(p.plan_status) === 7 && (
                          <button
                            className="btn btn-sm btn-success font-weight-bold"
                            onClick={() => handlePrintCertificate(p)}
                            title="พิมพ์ใบรายงานผลการนิเทศสำหรับแนบ ว.PA"
                          >
                            <i className="fa-solid fa-certificate me-1"></i> ใบรายงานผล ว.PA
                          </button>
                        )}

                        {/* View Score Details Link */}
                        <Link to={`/view_scoring?planid=${p.planid}`} className="btn btn-sm btn-outline-primary">
                          <i className="fa-solid fa-chart-simple me-1"></i> ดูรายละเอียดผลประเมิน
                        </Link>

                        {/* Add Clip / Note Link */}
                        {Number(p.plan_status) === 2 && (
                          <Link to={`/statusplan_clip?planid=${p.planid}`} className="btn btn-sm btn-warning text-dark font-weight-bold">
                            <i className="fa-solid fa-video me-1"></i> แนบคลิป/บันทึก
                          </Link>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ========================================================================= */}
      {/* PRINT-ONLY: Official Supervision Certificate for ว.PA (PA 1/ส) */}
      {/* ========================================================================= */}
      {selectedPlanForCert && (
        <div className="certificate-print-view">
          <div className="text-center mb-4">
            <img src="/images/obec.png" alt="OBEC" style={{ height: '70px', marginBottom: '10px' }} />
            <h3 className="font-weight-bold mb-1">ใบรายงานผลการนิเทศการจัดการเรียนรู้</h3>
            <h4 className="font-weight-bold mb-1">ประกอบการประเมินผลการปฏิบัติงานตามข้อตกลงในการพัฒนางาน (ว.PA)</h4>
            <p className="text-muted mb-0">สำนักงานเขตพื้นที่การศึกษามัธยมศึกษาอุบลราชธานี อำนาจเจริญ</p>
          </div>

          <div className="mb-4">
            <p className="fs-6 mb-2">
              เอกสารฉบับนี้ให้ไว้เพื่อรับรองว่า <strong>ครู{teacherFullName}</strong> ตำแหน่ง <strong>{lookups.position[profile?.position_id] || 'ครู'}</strong> วิทยฐานะ <strong>{academicName}</strong>
            </p>
            <p className="fs-6 mb-2">
              สังกัด <strong>โรงเรียน{schoolName}</strong> กลุ่มสาระการเรียนรู้ <strong>{subjectAreaName}</strong>
            </p>
            <p className="fs-6 mb-2">
              ได้รับการนิเทศติดตามการจัดการเรียนรู้ รายวิชา <strong>{selectedPlanForCert.subject_name}</strong> รหัสวิชา <strong>{selectedPlanForCert.subject_code}</strong>
            </p>
            <p className="fs-6 mb-2">
              หน่วยการเรียนรู้/เรื่อง: <strong>{selectedPlanForCert.subject_name_plan || selectedPlanForCert.subject_content}</strong>
            </p>
            <p className="fs-6 mb-2">
              รูปแบบการจัดการเรียนรู้: <strong>{selectedPlanForCert.learning_model || 'Active Learning'}</strong> • ปีการศึกษา <strong>{selectedPlanForCert.edu_year}</strong> ภาคเรียนที่ <strong>{selectedPlanForCert.edu_term}</strong>
            </p>
          </div>

          <div className="p-3 border rounded mb-4 text-center bg-light">
            <h5 className="font-weight-bold mb-1">ผลการประเมินการนิเทศ</h5>
            <h3 className="font-weight-bold text-primary mb-1">
              คะแนน {planScoreMap[String(selectedPlanForCert.planid)] || 0} / 100 คะแนน
            </h3>
            <h4>ระดับคุณภาพ: <strong>{getQualityBadge(planScoreMap[String(selectedPlanForCert.planid)] || 0).label}</strong></h4>
          </div>

          {/* Supervisor Comments */}
          {(selectedPlanForCert.committee1_comment || selectedPlanForCert.committee2_comment || selectedPlanForCert.committee3_comment) && (
            <div className="mb-4 p-3 border rounded">
              <h6 className="font-weight-bold mb-2">สรุปข้อเสนอแนะและเสียงสะท้อนจากคณะกรรมการนิเทศ:</h6>
              {selectedPlanForCert.committee1_comment && <p className="mb-1 small">• {selectedPlanForCert.committee1_comment}</p>}
              {selectedPlanForCert.committee2_comment && <p className="mb-1 small">• {selectedPlanForCert.committee2_comment}</p>}
              {selectedPlanForCert.committee3_comment && <p className="mb-1 small">• {selectedPlanForCert.committee3_comment}</p>}
            </div>
          )}

          {/* Signatures */}
          <div className="row mt-5 pt-3">
            <div className="col-6 text-center">
              <p>ลงชื่อ ..............................................................</p>
              <p>( .............................................................. )</p>
              <p>ประธานคณะกรรมการนิเทศ</p>
            </div>
            <div className="col-6 text-center">
              <p>ลงชื่อ ..............................................................</p>
              <p>( .............................................................. )</p>
              <p>ผู้อำนวยการโรงเรียน{schoolName}</p>
            </div>
          </div>
          <div className="text-center mt-4">
            <small className="text-muted">ออกรายงานผ่านระบบนิเทศการจัดการเรียนรู้ออนไลน์ (LMSS) ณ วันที่ {new Date().toLocaleDateString('th-TH', { dateStyle: 'long' })}</small>
          </div>
        </div>
      )}
    </div>
  );
};

export default InfoTeacher;
