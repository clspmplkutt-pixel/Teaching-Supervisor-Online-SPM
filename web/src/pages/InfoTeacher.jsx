import React, { useEffect, useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import Swal from 'sweetalert2';
import { supabase } from '../supabaseClient';
import { useAuth } from '../contexts/AuthContext';
import { useUserProfile } from '../hooks/useUserProfile';
import useUserLookups from '../hooks/useUserLookups';
import './TeacherDashboard.css';

const PLAN_STATUS_NAMES = {
  '1': 'รอผู้อำนวยการอนุมัติแผน',
  '2': 'ผู้อำนวยการอนุมัติแล้ว (รอคลิป/บันทึก)',
  '3': 'ไม่อนุมัติ / กรุณาแก้ไขแผน',
  '4': 'แก้ไขแผนแล้ว รอ ผอ. ตรวจสอบ',
  '5': 'ส่งคลิป/บันทึกแล้ว รอคกก. นิเทศ',
  '6': 'คณะกรรมการกำลังดำเนินการประเมิน',
  '7': 'คณะกรรมการประเมินเสร็จสิ้น',
};

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

  // Academic Years list
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

  // KPI Metrics
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

  // Map scores by plan (Scale to 100%)
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
      // Max score is 4 per criterion in the 4-level rubrics
      const maxScore = item.count * 4;
      const percentage = maxScore > 0 ? (item.total / maxScore) * 100 : 0;
      result[pid] = Math.min(100, Math.round(percentage * 10) / 10);
    });
    return result;
  }, [scores]);

  // Overall Average Score
  const overallAvgScore = useMemo(() => {
    const pids = Object.keys(planScoreMap);
    if (pids.length === 0) return 0;
    const sum = pids.reduce((acc, pid) => acc + planScoreMap[pid], 0);
    return Math.round((sum / pids.length) * 10) / 10;
  }, [planScoreMap]);

  const getQualityBadge = (score) => {
    if (score >= 90) return { label: 'ดีเยี่ยม (Excellent)', color: 'bg-success text-white', icon: 'fa-trophy' };
    if (score >= 80) return { label: 'ดีมาก (Very Good)', color: 'bg-primary text-white', icon: 'fa-star' };
    if (score >= 70) return { label: 'ดี (Good)', color: 'bg-info text-dark', icon: 'fa-thumbs-up' };
    if (score >= 60) return { label: 'พอใช้ (Fair)', color: 'bg-warning text-dark', icon: 'fa-check' };
    if (score > 0) return { label: 'ควรปรับปรุง', color: 'bg-danger text-white', icon: 'fa-triangle-exclamation' };
    return { label: 'รอดำเนินการประเมิน', color: 'bg-secondary text-white', icon: 'fa-clock' };
  };

  // Plans requiring urgent action
  const revisionPlans = useMemo(() => {
    return filteredPlans.filter((p) => Number(p.plan_status) === 3);
  }, [filteredPlans]);

  const pendingClipPlans = useMemo(() => {
    return filteredPlans.filter((p) => Number(p.plan_status) === 2);
  }, [filteredPlans]);

  const handlePrintCertificate = (plan) => {
    setSelectedPlanForCert(plan);
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
      <div className="text-center p-5 my-5">
        <div className="spinner-grow text-primary" style={{ width: '3.5rem', height: '3.5rem' }} role="status"></div>
        <h4 className="mt-4 font-weight-bold text-dark">กำลังโหลดศูนย์การจัดการเรียนรู้ของครู...</h4>
        <p className="text-muted">กำลังรวบรวมแผนการจัดการเรียนรู้ ผลการนิเทศ และประวัติเอกสาร ว.PA</p>
      </div>
    );
  }

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

  return (
    <div className="teacher-workspace-container">
      {/* ========================================================================= */}
      {/* 1. HERO BANNER: AURORA GLASSMORPHISM                                      */}
      {/* ========================================================================= */}
      <div className="teacher-hero-ultra no-print">
        <div className="row align-items-center g-3">
          <div className="col-lg-8">
            <div className="d-flex align-items-center gap-3 mb-2">
              <div className="teacher-avatar-ring">
                <i className="fa-solid fa-chalkboard-user"></i>
              </div>
              <div>
                <div className="d-flex flex-wrap align-items-center gap-2 mb-1">
                  <span className="hero-pill-badge">
                    <i className="fa-solid fa-award text-warning"></i> Teacher Workspace
                  </span>
                  <span className="hero-pill-badge">
                    <i className="fa-solid fa-school text-info"></i> {schoolName}
                  </span>
                </div>
                <h2 className="font-weight-bold mb-0 text-white" style={{ letterSpacing: '-0.02em' }}>
                  สวัสดีครับ, คุณครู{teacherDisplayName}
                </h2>
              </div>
            </div>
            <p className="text-white-50 mt-2 mb-0" style={{ fontSize: '0.95rem' }}>
              วิทยฐานะ: <span className="text-white font-weight-bold">{academicName}</span> • กลุ่มสาระการเรียนรู้: <span className="text-white font-weight-bold">{subjectAreaName}</span>
            </p>
          </div>

          <div className="col-lg-4 text-lg-end">
            <div className="d-flex flex-column align-items-lg-end gap-3">
              {/* Year Segmented Switcher */}
              <div className="year-pills-container">
                <button
                  type="button"
                  onClick={() => setSelectedYear('ALL')}
                  className={`year-pill-btn ${selectedYear === 'ALL' ? 'active' : ''}`}
                >
                  ทุกปี
                </button>
                {academicYears.map((yr) => (
                  <button
                    key={yr}
                    type="button"
                    onClick={() => setSelectedYear(yr)}
                    className={`year-pill-btn ${selectedYear === yr ? 'active' : ''}`}
                  >
                    ปี {yr}
                  </button>
                ))}
              </div>

              {/* Action Button */}
              <Link to="/sendplan" className="btn-hero-primary">
                <i className="fa-solid fa-plus-circle"></i> ส่งแผนการสอนใหม่
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 2. BENTO STATS KPI CARDS                                                  */}
      {/* ========================================================================= */}
      <div className="row g-3 mb-4 no-print">
        {/* Card 1: Total Plans */}
        <div className="col-sm-6 col-xl-3">
          <div className="bento-kpi-card">
            <div>
              <div className="kpi-icon-box kpi-icon-indigo">
                <i className="fa-solid fa-folder-open"></i>
              </div>
              <p className="kpi-label-text">แผนการสอนทั้งหมด</p>
              <div className="d-flex align-items-baseline">
                <span className="kpi-value-text">{totalPlansCount}</span>
                <span className="kpi-unit-text">แผน</span>
              </div>
            </div>
            <div>
              <span className="kpi-sub-badge indigo">
                <i className="fa-solid fa-clock-rotate-left"></i> บันทึกในระบบ
              </span>
            </div>
          </div>
        </div>

        {/* Card 2: Approved by Director */}
        <div className="col-sm-6 col-xl-3">
          <div className="bento-kpi-card">
            <div>
              <div className="kpi-icon-box kpi-icon-emerald">
                <i className="fa-solid fa-circle-check"></i>
              </div>
              <p className="kpi-label-text">ผอ. อนุมัติแผนแล้ว</p>
              <div className="d-flex align-items-baseline">
                <span className="kpi-value-text">{approvedCount}</span>
                <span className="kpi-unit-text">แผน</span>
              </div>
            </div>
            <div>
              <span className="kpi-sub-badge emerald">
                <i className="fa-solid fa-video"></i> พร้อมแนบคลิปสอน
              </span>
            </div>
          </div>
        </div>

        {/* Card 3: In Progress / Evaluating */}
        <div className="col-sm-6 col-xl-3">
          <div className="bento-kpi-card">
            <div>
              <div className="kpi-icon-box kpi-icon-amber">
                <i className="fa-solid fa-hourglass-half"></i>
              </div>
              <p className="kpi-label-text">อยู่ระหว่างการนิเทศ</p>
              <div className="d-flex align-items-baseline">
                <span className="kpi-value-text">{evaluatingCount}</span>
                <span className="kpi-unit-text">แผน</span>
              </div>
            </div>
            <div>
              <span className="kpi-sub-badge amber">
                <i className="fa-solid fa-users-viewfinder"></i> คกก. กำลังประเมิน
              </span>
            </div>
          </div>
        </div>

        {/* Card 4: Completed & Score */}
        <div className="col-sm-6 col-xl-3">
          <div className="bento-kpi-card">
            <div>
              <div className="kpi-icon-box kpi-icon-purple">
                <i className="fa-solid fa-award"></i>
              </div>
              <p className="kpi-label-text">นิเทศเสร็จสมบูรณ์</p>
              <div className="d-flex align-items-baseline">
                <span className="kpi-value-text">{completedCount}</span>
                <span className="kpi-unit-text">แผน</span>
              </div>
            </div>
            <div>
              <span className="kpi-sub-badge purple">
                <i className="fa-solid fa-star"></i> {overallAvgScore > 0 ? `เฉลี่ย ${overallAvgScore}/100` : 'พร้อมพิมพ์ ว.PA'}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 3. URGENT ACTIONS / TO-DO BENTO                                           */}
      {/* ========================================================================= */}
      {revisionPlans.length > 0 && (
        <div className="no-print">
          {revisionPlans.map((rp) => (
            <div key={rp.planid} className="alert-bento-card alert-bento-danger">
              <div className="d-flex align-items-center gap-3">
                <div className="bg-danger text-white rounded-circle d-flex align-items-center justify-content-center" style={{ width: '42px', height: '42px', flexShrink: 0 }}>
                  <i className="fa-solid fa-triangle-exclamation fs-5"></i>
                </div>
                <div>
                  <h6 className="font-weight-bold text-danger mb-1">
                    ผู้อำนวยการแจ้งให้แก้ไขแผนการสอน: <u>{rp.subject_name} ({rp.subject_code})</u>
                  </h6>
                  <p className="mb-0 text-dark small">
                    <strong>ข้อเสนอแนะของ ผอ.:</strong> "{rp.plan_ds_comment || 'กรุณาปรับปรุงรายละเอียดตามข้อเสนอแนะ'}"
                  </p>
                </div>
              </div>
              <Link to="/statusplan" className="btn btn-sm btn-danger font-weight-bold px-3 py-2 text-nowrap" style={{ borderRadius: '10px' }}>
                <i className="fa-solid fa-pen-to-square me-1"></i> แก้ไขแผนนี้
              </Link>
            </div>
          ))}
        </div>
      )}

      {pendingClipPlans.length > 0 && (
        <div className="no-print">
          {pendingClipPlans.map((pc) => (
            <div key={pc.planid} className="alert-bento-card alert-bento-warning">
              <div className="d-flex align-items-center gap-3">
                <div className="bg-warning text-dark rounded-circle d-flex align-items-center justify-content-center" style={{ width: '42px', height: '42px', flexShrink: 0 }}>
                  <i className="fa-solid fa-video fs-5"></i>
                </div>
                <div>
                  <h6 className="font-weight-bold text-dark mb-1">
                    ผอ. อนุมัติแผนแล้ว! กรุณาแนบคลิปวิดีโอ & บันทึกหลังสอน: <u>{pc.subject_name} ({pc.subject_code})</u>
                  </h6>
                  <p className="mb-0 text-muted small">
                    แนบคลิป YouTube เพื่อให้คณะกรรมการสามารถเข้าตรวจนิเทศและบันทึกคะแนนประเมินได้
                  </p>
                </div>
              </div>
              <Link to="/send_clip" className="btn btn-sm btn-warning font-weight-bold px-3 py-2 text-nowrap" style={{ borderRadius: '10px' }}>
                <i className="fa-solid fa-cloud-arrow-up me-1"></i> แนบคลิป/บันทึก
              </Link>
            </div>
          ))}
        </div>
      )}

      {/* ========================================================================= */}
      {/* 4. PLANS STREAM & INTERACTIVE TIMELINE                                     */}
      {/* ========================================================================= */}
      <div className="d-flex align-items-center justify-content-between mb-3 no-print">
        <div>
          <h4 className="font-weight-bold m-0 text-dark" style={{ letterSpacing: '-0.02em' }}>
            <i className="fa-solid fa-list-check text-primary me-2"></i>
            แผนการจัดการเรียนรู้และการประเมิน ว.PA
          </h4>
          <p className="text-muted small mb-0">ติดตามความก้าวหน้าการนิเทศและพิมพ์เอกสารรับรองรายแผน</p>
        </div>
        <span className="badge bg-white text-secondary border px-3 py-2" style={{ borderRadius: '10px' }}>
          ทั้งหมด {filteredPlans.length} รายการ
        </span>
      </div>

      {filteredPlans.length === 0 ? (
        <div className="plan-stream-card text-center py-5 no-print">
          <i className="fa-solid fa-folder-open text-muted fa-3x mb-3" style={{ opacity: 0.4 }}></i>
          <h5 className="font-weight-bold text-dark mb-1">ยังไม่มีข้อมูลแผนการจัดการเรียนรู้ในปีการศึกษานี้</h5>
          <p className="text-muted mb-4 small">คุณครูสามารถเริ่มต้นส่งแผนการสอนเข้าสู่ระบบเพื่อขอรับการนิเทศได้ทันที</p>
          <Link to="/sendplan" className="btn btn-primary font-weight-bold px-4 py-2" style={{ borderRadius: '12px' }}>
            <i className="fa-solid fa-plus-circle me-1"></i> ส่งแผนการจัดการเรียนรู้ใหม่
          </Link>
        </div>
      ) : (
        <div className="no-print">
          {filteredPlans.map((p) => {
            const currentStep = getTimelineStep(p.plan_status);
            const planScore = planScoreMap[String(p.planid)];
            const quality = planScore ? getQualityBadge(planScore) : null;
            const hasClip = p.plan_clip && String(p.plan_clip).trim() !== '';

            return (
              <div key={p.planid} className="plan-stream-card">
                {/* Header Row: Subject, Tags, Actions */}
                <div className="d-flex justify-content-between align-items-start flex-wrap gap-2 mb-3">
                  <div>
                    <div className="d-flex flex-wrap align-items-center gap-2 mb-2">
                      <span className="subject-tag-pill blue">
                        <i className="fa-solid fa-calendar-days"></i> ปี {p.edu_year} (เทอม {p.edu_term})
                      </span>
                      <span className="subject-tag-pill emerald">
                        <i className="fa-solid fa-book-open"></i> {lookups?.teachSubject?.[p.teach_subject_id] || 'ทั่วไป'}
                      </span>
                      {p.learning_model && (
                        <span className="subject-tag-pill purple">
                          <i className="fa-solid fa-shapes"></i> {p.learning_model}
                        </span>
                      )}
                    </div>
                    <h5 className="font-weight-bold text-dark mb-1" style={{ fontSize: '1.2rem' }}>
                      {p.subject_name} ({p.subject_code})
                      <span className="text-muted fw-normal ms-2">• {p.subject_name_plan || p.subject_content}</span>
                    </h5>
                    <div className="text-muted small">
                      <i className="fa-regular fa-clock me-1"></i>
                      วันที่สอน: <strong>{p.teach_date || '-'}</strong> ({p.teach_timestart || ''} - {p.teach_timeend || ''}) • {p.teach_minute || 50} นาที
                    </div>
                  </div>

                  {/* Status / Score Badge */}
                  <div className="text-end">
                    {Number(p.plan_status) === 7 ? (
                      <div className="d-flex flex-column align-items-end gap-1">
                        <span className={`badge px-3 py-2 ${quality ? quality.color : 'bg-success'}`} style={{ borderRadius: '10px', fontSize: '0.9rem' }}>
                          <i className={`fa-solid ${quality?.icon || 'fa-star'} me-1`}></i> {quality ? quality.label : 'ผ่านการประเมิน'}
                        </span>
                        {planScore && (
                          <div className="font-weight-bold text-primary" style={{ fontSize: '1.1rem' }}>
                            {planScore} <span className="small text-muted">/ 100 คะแนน</span>
                          </div>
                        )}
                      </div>
                    ) : Number(p.plan_status) === 3 ? (
                      <span className="badge bg-danger px-3 py-2" style={{ borderRadius: '10px', fontSize: '0.88rem' }}>
                        <i className="fa-solid fa-circle-xmark me-1"></i> ให้แก้ไขแผน
                      </span>
                    ) : (
                      <span className="badge bg-light text-dark border px-3 py-2" style={{ borderRadius: '10px', fontSize: '0.88rem' }}>
                        <i className="fa-solid fa-circle-notch fa-spin text-primary me-1"></i> {PLAN_STATUS_NAMES[String(p.plan_status)] || 'อยู่ระหว่างดำเนินการ'}
                      </span>
                    )}
                  </div>
                </div>

                {/* Modern Progress Timeline */}
                <div className="timeline-modern-wrapper">
                  <div className="timeline-modern-bar">
                    <div
                      className="timeline-modern-progress"
                      style={{ width: currentStep === 1 ? '10%' : currentStep === 2 ? '40%' : currentStep === 3 ? '70%' : '100%' }}
                    ></div>
                  </div>

                  <div className={`timeline-step-node ${currentStep >= 1 ? 'completed' : 'active'}`}>
                    <div className="timeline-circle">
                      <i className="fa-solid fa-file-arrow-up"></i>
                    </div>
                    <span className="timeline-step-label">1. ส่งแผน</span>
                  </div>

                  <div className={`timeline-step-node ${currentStep >= 2 ? 'completed' : currentStep === 1 ? 'active' : ''}`}>
                    <div className="timeline-circle">
                      <i className="fa-solid fa-user-check"></i>
                    </div>
                    <span className="timeline-step-label">2. ผอ. อนุมัติ</span>
                  </div>

                  <div className={`timeline-step-node ${currentStep >= 3 ? 'completed' : currentStep === 2 ? 'active' : ''}`}>
                    <div className="timeline-circle">
                      <i className="fa-solid fa-video"></i>
                    </div>
                    <span className="timeline-step-label">3. คลิป/บันทึก</span>
                  </div>

                  <div className={`timeline-step-node ${currentStep >= 4 ? 'completed' : currentStep === 3 ? 'active' : ''}`}>
                    <div className="timeline-circle">
                      <i className="fa-solid fa-list-check"></i>
                    </div>
                    <span className="timeline-step-label">4. คกก. นิเทศ</span>
                  </div>

                  <div className={`timeline-step-node ${currentStep >= 4 ? 'completed' : ''}`}>
                    <div className="timeline-circle">
                      <i className="fa-solid fa-award"></i>
                    </div>
                    <span className="timeline-step-label">5. สำเร็จ</span>
                  </div>
                </div>

                {/* Footer Meta Row: Committee Members & Quick Actions */}
                <div className="d-flex align-items-center justify-content-between flex-wrap gap-3 pt-3 border-top mt-3">
                  {/* Committee chips */}
                  <div className="d-flex align-items-center gap-2 flex-wrap">
                    <span className="text-secondary small font-weight-bold">
                      <i className="fa-solid fa-users text-primary opacity-75 me-1"></i> คณะกรรมการนิเทศ:
                    </span>
                    {[p.committee1, p.committee2, p.committee3].filter(Boolean).length === 0 ? (
                      <span className="badge bg-light text-muted border px-3 py-1 font-weight-normal" style={{ borderRadius: '8px', fontSize: '0.8rem' }}>
                        <i className="fa-regular fa-clock me-1 text-warning"></i> อยู่ระหว่างรอแต่งตั้งคณะกรรมการ
                      </span>
                    ) : (
                      [p.committee1, p.committee2, p.committee3].filter(Boolean).map((cid, i) => {
                        const cm = committeeProfiles[String(cid)];
                        const cName = cm ? `${lookups?.prefix?.[cm.prefix] || ''}${cm.name} ${cm.lastname}` : `กรรมการ ${i + 1}`;
                        return (
                          <div key={cid} className="committee-chip">
                            <div className="committee-avatar-micro">{i + 1}</div>
                            <span>{cName}</span>
                          </div>
                        );
                      })
                    )}
                  </div>

                  {/* Actions: Video / File / PA Cert */}
                  <div className="d-flex align-items-center gap-2">
                    {p.plan_file && (
                      <a
                        href={p.plan_file}
                        target="_blank"
                        rel="noreferrer"
                        className="btn-plan-action btn-plan-doc"
                      >
                        <i className="fa-solid fa-file-pdf me-1 text-danger"></i> เอกสารแผนการสอน
                      </a>
                    )}

                    {hasClip && (
                      <a
                        href={`https://www.youtube.com/watch?v=${p.plan_clip}`}
                        target="_blank"
                        rel="noreferrer"
                        className="btn-plan-action btn-plan-video"
                      >
                        <i className="fa-brands fa-youtube me-1 text-danger"></i> วิดีโอการสอน
                      </a>
                    )}

                    {Number(p.plan_status) === 7 && (
                      <button
                        type="button"
                        onClick={() => handlePrintCertificate(p)}
                        className="btn-pa-cert"
                      >
                        <i className="fa-solid fa-certificate"></i> ใบรับรองผล ว.PA
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ========================================================================= */}
      {/* 5. OFFICIAL PRINTABLE ว.PA CERTIFICATE MODAL                               */}
      {/* ========================================================================= */}
      {selectedPlanForCert && (
        <div className="certificate-modal-overlay">
          <div className="certificate-paper">
            {/* Modal Actions Bar (No Print) */}
            <div className="d-flex justify-content-between align-items-center mb-4 no-print border-bottom pb-3">
              <div>
                <h5 className="font-weight-bold m-0 text-dark">
                  <i className="fa-solid fa-certificate text-warning me-2"></i>
                  ใบรายงานผลการนิเทศการจัดการเรียนรู้ (แบบรายงาน ว.PA)
                </h5>
                <small className="text-muted">เอกสารรับรองสำหรับแนบประกอบการประเมินวิทยฐานะ</small>
              </div>
              <div className="d-flex gap-2">
                <button
                  type="button"
                  onClick={() => window.print()}
                  className="btn btn-primary font-weight-bold px-3 py-2"
                  style={{ borderRadius: '10px' }}
                >
                  <i className="fa-solid fa-print me-1"></i> พิมพ์เอกสาร (Print A4)
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedPlanForCert(null)}
                  className="btn btn-light border font-weight-bold px-3 py-2"
                  style={{ borderRadius: '10px' }}
                >
                  <i className="fa-solid fa-xmark me-1"></i> ปิดหน้าต่าง
                </button>
              </div>
            </div>

            {/* Official Certificate Formatted View */}
            <div className="certificate-double-border">
              {/* Garuda Emblem */}
              <img src="/images/obec.png" alt="Emblem" className="garuda-emblem" />

              <div className="text-center mb-4">
                <h4 className="font-weight-bold mb-1" style={{ fontSize: '1.4rem' }}>
                  ใบรายงานผลการนิเทศการจัดการเรียนรู้
                </h4>
                <p className="mb-0 text-secondary" style={{ fontSize: '1.05rem' }}>
                  ตามข้อตกลงในการพัฒนางาน (Performance Agreement: PA)
                </p>
                <p className="text-muted small">สำนักงานเขตพื้นที่การศึกษามัธยมศึกษา</p>
              </div>

              <div className="mb-4" style={{ lineHeight: '1.9', fontSize: '1rem' }}>
                <p className="mb-2">
                  เอกสารฉบับนี้ให้ไว้เพื่อรับรองว่า <strong>ครู{teacherFullName}</strong> ตำแหน่ง <strong>{lookups?.position?.[profile?.position_id] || 'ครู'}</strong> วิทยฐานะ <strong>{academicName}</strong>
                </p>
                <p className="mb-2">
                  สังกัด <strong>โรงเรียน{schoolName}</strong> กลุ่มสาระการเรียนรู้ <strong>{subjectAreaName}</strong>
                </p>
                <p className="mb-2">
                  ได้รับการนิเทศติดตามการจัดการเรียนรู้ รายวิชา <strong>{selectedPlanForCert.subject_name}</strong> รหัสวิชา <strong>{selectedPlanForCert.subject_code}</strong>
                </p>
                <p className="mb-2">
                  หน่วยการเรียนรู้/เรื่อง: <strong>{selectedPlanForCert.subject_name_plan || selectedPlanForCert.subject_content}</strong>
                </p>
                <p className="mb-2">
                  รูปแบบการจัดการเรียนรู้: <strong>{selectedPlanForCert.learning_model || 'Active Learning'}</strong> • ปีการศึกษา <strong>{selectedPlanForCert.edu_year}</strong> ภาคเรียนที่ <strong>{selectedPlanForCert.edu_term}</strong>
                </p>
              </div>

              {/* Score Highlight Box */}
              <div className="p-3 border rounded mb-4 text-center" style={{ background: '#f8fafc', borderColor: '#cbd5e1' }}>
                <p className="mb-1 text-secondary font-weight-bold">ผลการประเมินการจัดการเรียนรู้โดยคณะกรรมการ</p>
                <h2 className="font-weight-bold text-primary mb-1">
                  {planScoreMap[String(selectedPlanForCert.planid)] || 100} / 100 คะแนน
                </h2>
                <span className="badge bg-success px-3 py-2 fs-6">
                  ระดับคุณภาพ: ดีเยี่ยม (Excellent)
                </span>
              </div>

              {/* Committee Listing */}
              <div className="mb-4 small">
                <p className="font-weight-bold mb-1">คณะกรรมการผู้ตรวจนิเทศและประเมินผล:</p>
                <ol className="ps-3 mb-0">
                  {[selectedPlanForCert.committee1, selectedPlanForCert.committee2, selectedPlanForCert.committee3].filter(Boolean).map((cid, i) => {
                    const cm = committeeProfiles[String(cid)];
                    return (
                      <li key={cid} className="mb-1">
                        {cm ? `${lookups?.prefix?.[cm.prefix] || ''}${cm.name} ${cm.lastname}` : `กรรมการนิเทศ ${i + 1}`}
                        {cm?.academic_id && ` (${lookups?.academic?.[cm.academic_id] || ''})`}
                      </li>
                    );
                  })}
                </ol>
              </div>

              {/* Signatures */}
              <div className="row text-center mt-5 pt-3">
                <div className="col-6">
                  <p className="mb-4">ลงชื่อ..........................................................</p>
                  <p className="mb-1 font-weight-bold">
                    (..........................................................)
                  </p>
                  <p className="text-muted small">ประธานคณะกรรมการนิเทศ</p>
                </div>
                <div className="col-6">
                  <p className="mb-4">ลงชื่อ..........................................................</p>
                  <p className="mb-1 font-weight-bold">
                    (..........................................................)
                  </p>
                  <p className="text-muted small">ผู้อำนวยการโรงเรียน{schoolName}</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default InfoTeacher;
