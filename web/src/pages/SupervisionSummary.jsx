import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { supabase } from '../supabaseClient';
import LoadingSpinner from '../components/LoadingSpinner';
import EmptyState from '../components/EmptyState';
import { calculatePlanScoreFromRows, getQualityBadge } from '../utils/scoreCalculator';

const SupervisionSummary = () => {
  const [activeTab, setActiveTab] = useState('live'); // 'live' | 'research'
  const [loading, setLoading] = useState(true);
  const [plans, setPlans] = useState([]);
  const [scores, setScores] = useState([]);
  const [schools, setSchools] = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [models, setModels] = useState([]);
  const [selectedYear, setSelectedYear] = useState('ALL');

  // Exact figures from research report (Table 12, 13, 19, 20, 21)
  const reportData = {
    quantitative: {
      teachers: 57,
      schools: 57,
      onlineSchools: 51,
      onsiteSchools: 6,
      onlineClips: 102,
      onsiteVisits: 12,
      rounds: 2,
      evaluationItems: 52
    },
    evaluationKSA: {
      knowledge: { pre: 9.70, post: 16.75, diff: 7.05, prePct: 48.51, postPct: 83.77 },
      skills: { total: 4.30, sd: 0.60, learner: 4.35, process: 4.32, teacher: 4.24 },
      attitude: { round1: 3.52, round2: 4.54, diff: 1.02, highestItem: 4.65 }
    },
    competencies: {
      total: 4.09,
      tech: 4.18,
      think: 4.12,
      solve: 4.10,
      communicate: 4.05,
      life: 4.02
    },
    satisfaction: {
      total: 4.43,
      sd: 0.57,
      high1: 4.61,
      high2: 4.58,
      high3: 4.56,
      lowest: 4.25
    },
    expertProcess: {
      total: 4.39,
      stepT: 4.61
    }
  };

  const loadLiveData = useCallback(async () => {
    setLoading(true);
    try {
      const [plansRes, scoresRes, schoolsRes, subjectsRes, modelsRes] = await Promise.all([
        supabase.from('tbl_sendplan').select('planid, people_id, school_code, teach_subject_id, grade_level_id, edu_year, edu_term, subject_code, subject_name, subject_name_plan, learning_model, plan_status, plan_clip, plan_file, plan_senddate'),
        supabase.from('tbl_sendplan_score').select('planid, policy_id, score, score_weight, supervision'),
        supabase.from('tbl_school').select('school_id, school_name, school_province, khet_code').neq('school_flag', 0),
        supabase.from('tbl_system_Teach_Subject').select('teach_subject_id, teach_subject'),
        supabase.from('tbl_learningModel').select('model_id, model_name'),
      ]);

      setPlans(plansRes.data || []);
      setScores(scoresRes.data || []);
      setSchools(schoolsRes.data || []);
      setSubjects(subjectsRes.data || []);
      setModels(modelsRes.data || []);
    } catch (err) {
      console.error('SupervisionSummary load error:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadLiveData();
  }, [loadLiveData]);

  // Extract distinct academic years
  const availableYears = useMemo(() => {
    const set = new Set();
    plans.forEach((p) => {
      if (p.edu_year) set.add(String(p.edu_year).trim());
    });
    return Array.from(set).sort().reverse();
  }, [plans]);

  // Filter plans by selected academic year
  const filteredPlans = useMemo(() => {
    if (selectedYear === 'ALL') return plans;
    return plans.filter((p) => String(p.edu_year).trim() === String(selectedYear).trim());
  }, [plans, selectedYear]);

  // Map scores by planid
  const scoresByPlan = useMemo(() => {
    const map = {};
    scores.forEach((s) => {
      const pid = String(s.planid);
      if (!map[pid]) map[pid] = [];
      map[pid].push(s);
    });
    return map;
  }, [scores]);

  // Live KPI Summary
  const liveKPI = useMemo(() => {
    const total = filteredPlans.length;
    let pendingApproval = 0; // 1, 4
    let waitingClip = 0; // 2
    let rejected = 0; // 3
    let evaluating = 0; // 5, 6
    let completed = 0; // 7
    let withClip = 0;
    let withFile = 0;

    filteredPlans.forEach((p) => {
      const s = String(p.plan_status);
      if (s === '1' || s === '4') pendingApproval++;
      else if (s === '2') waitingClip++;
      else if (s === '3') rejected++;
      else if (s === '5' || s === '6') evaluating++;
      else if (s === '7') completed++;

      if (p.plan_clip) withClip++;
      if (p.plan_file) withFile++;
    });

    // Score calculations for completed/evaluated plans
    const evaluatedScores = [];
    const qualityCounts = {
      excellent: 0, // >= 90
      veryGood: 0,  // >= 80
      good: 0,      // >= 70
      fair: 0,      // >= 60
      needsWork: 0, // < 60
    };

    filteredPlans.forEach((p) => {
      const pScores = scoresByPlan[String(p.planid)];
      if (pScores && pScores.length > 0) {
        const { percentage, evaluatorCount } = calculatePlanScoreFromRows(pScores);
        if (evaluatorCount > 0 && percentage > 0) {
          evaluatedScores.push(percentage);
          if (percentage >= 90) qualityCounts.excellent++;
          else if (percentage >= 80) qualityCounts.veryGood++;
          else if (percentage >= 70) qualityCounts.good++;
          else if (percentage >= 60) qualityCounts.fair++;
          else qualityCounts.needsWork++;
        }
      }
    });

    const avgScore = evaluatedScores.length > 0
      ? Math.round((evaluatedScores.reduce((a, b) => a + b, 0) / evaluatedScores.length) * 10) / 10
      : 0;

    return {
      total,
      pendingApproval,
      waitingClip,
      rejected,
      evaluating,
      completed,
      withClip,
      withFile,
      avgScore,
      evaluatedCount: evaluatedScores.length,
      qualityCounts,
      overallBadge: getQualityBadge(avgScore),
    };
  }, [filteredPlans, scoresByPlan]);

  // Subject breakdown
  const subjectBreakdown = useMemo(() => {
    const sMap = {};
    subjects.forEach((s) => { sMap[String(s.teach_subject_id)] = s.teach_subject; });

    const counts = {};
    filteredPlans.forEach((p) => {
      const sid = String(p.teach_subject_id || 'other');
      if (!counts[sid]) counts[sid] = { id: sid, name: sMap[sid] || 'กลุ่มสาระอื่น ๆ', total: 0, completed: 0 };
      counts[sid].total++;
      if (String(p.plan_status) === '7') counts[sid].completed++;
    });

    return Object.values(counts).sort((a, b) => b.total - a.total);
  }, [filteredPlans, subjects]);

  // Learning model breakdown
  const modelBreakdown = useMemo(() => {
    const mMap = {};
    models.forEach((m) => { mMap[String(m.model_id)] = m.model_name; });

    const counts = {};
    filteredPlans.forEach((p) => {
      const mid = String(p.learning_model || '');
      const name = mMap[mid] || (mid && mid !== '0' ? mid : 'Active Learning (ทั่วไป)');
      counts[name] = (counts[name] || 0) + 1;
    });

    return Object.entries(counts).sort((a, b) => b[1] - a[1]);
  }, [filteredPlans, models]);

  const handlePrint = () => {
    window.print();
  };

  if (loading) {
    return <LoadingSpinner title="สารสนเทศสรุปผลการนิเทศ" message="กำลังคำนวณและประมวลผลข้อมูลการนิเทศล่าสุด..." />;
  }

  return (
    <div className="supervision-summary container-fluid py-3">
      {/* Top Header Card */}
      <div className="d-flex justify-content-between align-items-center flex-wrap mb-3 p-3 bg-white rounded shadow-sm border">
        <div>
          <h4 className="font-weight-bold text-dark m-0">
            <i className="fa-solid fa-chart-pie text-primary mr-2"></i>
            สารสนเทศสรุปผลการนิเทศการจัดการเรียนรู้
          </h4>
          <p className="text-muted small mb-0 mt-1">
            กลุ่มนิเทศ ติดตาม และประเมินผลการจัดการศึกษา สำนักงานเขตพื้นที่การศึกษามัธยมศึกษาพิษณุโลก อุตรดิตถ์
          </p>
        </div>
        <div className="d-flex align-items-center gap-2 mt-2 mt-sm-0 no-print">
          <div className="btn-group btn-group-sm">
            <button
              type="button"
              className={`btn ${activeTab === 'live' ? 'btn-primary font-weight-bold' : 'btn-outline-secondary'}`}
              onClick={() => setActiveTab('live')}
            >
              <i className="fa-solid fa-satellite-dish mr-1"></i> ข้อมูลจริงในระบบ ({filteredPlans.length} แผน)
            </button>
            <button
              type="button"
              className={`btn ${activeTab === 'research' ? 'btn-info font-weight-bold text-white' : 'btn-outline-secondary'}`}
              onClick={() => setActiveTab('research')}
            >
              <i className="fa-solid fa-book-bookmark mr-1"></i> งานวิจัยต้นแบบ ADAACE_T
            </button>
          </div>
          <button type="button" className="btn btn-outline-secondary btn-sm" onClick={handlePrint} title="พิมพ์รายงาน">
            <i className="fa-solid fa-print mr-1"></i> พิมพ์
          </button>
        </div>
      </div>

      {/* TAB 1: Live System Analytics */}
      {activeTab === 'live' && (
        <>
          {/* Year Filter Bar */}
          <div className="d-flex justify-content-between align-items-center mb-3 flex-wrap gap-2 no-print bg-light p-2 rounded border">
            <div className="d-flex align-items-center gap-2">
              <span className="font-weight-bold small text-muted">เลือกปีการศึกษา:</span>
              <div className="btn-group btn-group-sm">
                <button
                  type="button"
                  className={`btn ${selectedYear === 'ALL' ? 'btn-primary font-weight-bold' : 'btn-outline-secondary bg-white'}`}
                  onClick={() => setSelectedYear('ALL')}
                >
                  ทุกปีการศึกษา ({plans.length})
                </button>
                {availableYears.map((yr) => (
                  <button
                    key={yr}
                    type="button"
                    className={`btn ${selectedYear === yr ? 'btn-primary font-weight-bold' : 'btn-outline-secondary bg-white'}`}
                    onClick={() => setSelectedYear(yr)}
                  >
                    ปี {yr}
                  </button>
                ))}
              </div>
            </div>
            <div className="small text-muted">
              อัปเดตข้อมูลล่าสุด ณ วันที่ {new Date().toLocaleDateString('th-TH', { dateStyle: 'long' })}
            </div>
          </div>

          {/* KPI Bento Grid */}
          <div className="row g-3 mb-4">
            <div className="col-xl-3 col-md-6 col-12">
              <div className="card border-0 shadow-sm h-100 p-3" style={{ borderLeft: '4px solid #3b82f6', borderRadius: '10px' }}>
                <div className="d-flex justify-content-between align-items-center">
                  <div>
                    <div className="text-muted small font-weight-bold">แผนการจัดการเรียนรู้ทั้งหมด</div>
                    <div className="fs-3 fw-bold text-primary">{liveKPI.total.toLocaleString()} <span className="small text-muted font-weight-normal">แผน</span></div>
                    <small className="text-muted">แนบไฟล์ PDF {liveKPI.withFile} แผน ({liveKPI.total > 0 ? Math.round((liveKPI.withFile / liveKPI.total) * 100) : 0}%)</small>
                  </div>
                  <div className="p-3 bg-primary-subtle text-primary rounded-circle">
                    <i className="fa-solid fa-file-lines fa-xl"></i>
                  </div>
                </div>
              </div>
            </div>

            <div className="col-xl-3 col-md-6 col-12">
              <div className="card border-0 shadow-sm h-100 p-3" style={{ borderLeft: '4px solid #f59e0b', borderRadius: '10px' }}>
                <div className="d-flex justify-content-between align-items-center">
                  <div>
                    <div className="text-muted small font-weight-bold">แนบคลิปวิดีโอการสอน</div>
                    <div className="fs-3 fw-bold text-warning">{liveKPI.withClip.toLocaleString()} <span className="small text-muted font-weight-normal">คลิป</span></div>
                    <small className="text-muted">อัตราส่งคลิป {liveKPI.total > 0 ? Math.round((liveKPI.withClip / liveKPI.total) * 100) : 0}% ของแผนทั้งหมด</small>
                  </div>
                  <div className="p-3 bg-warning-subtle text-warning rounded-circle">
                    <i className="fa-brands fa-youtube fa-xl"></i>
                  </div>
                </div>
              </div>
            </div>

            <div className="col-xl-3 col-md-6 col-12">
              <div className="card border-0 shadow-sm h-100 p-3" style={{ borderLeft: '4px solid #10b981', borderRadius: '10px' }}>
                <div className="d-flex justify-content-between align-items-center">
                  <div>
                    <div className="text-muted small font-weight-bold">นิเทศเสร็จสิ้นสมบูรณ์</div>
                    <div className="fs-3 fw-bold text-success">{liveKPI.completed.toLocaleString()} <span className="small text-muted font-weight-normal">แผน</span></div>
                    <small className="text-muted">คิดเป็น {liveKPI.total > 0 ? Math.round((liveKPI.completed / liveKPI.total) * 100) : 0}% ของแผนทั้งหมด</small>
                  </div>
                  <div className="p-3 bg-success-subtle text-success rounded-circle">
                    <i className="fa-solid fa-award fa-xl"></i>
                  </div>
                </div>
              </div>
            </div>

            <div className="col-xl-3 col-md-6 col-12">
              <div className="card border-0 shadow-sm h-100 p-3" style={{ borderLeft: '4px solid #8b5cf6', borderRadius: '10px' }}>
                <div className="d-flex justify-content-between align-items-center">
                  <div>
                    <div className="text-muted small font-weight-bold">คะแนนเฉลี่ยระดับเขตพื้นที่ฯ</div>
                    <div className="fs-3 fw-bold text-purple" style={{ color: '#8b5cf6' }}>
                      {liveKPI.avgScore > 0 ? `${liveKPI.avgScore}%` : '-'}
                    </div>
                    {liveKPI.overallBadge && (
                      <span className={`badge ${liveKPI.overallBadge.badgeClass} mt-1`}>
                        {liveKPI.overallBadge.label}
                      </span>
                    )}
                  </div>
                  <div className="p-3 text-white rounded-circle shadow-sm" style={{ backgroundColor: '#8b5cf6' }}>
                    <i className="fa-solid fa-chart-simple fa-xl"></i>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Workflow Status Funnel & Quality Distribution */}
          <div className="row g-3 mb-4">
            {/* Status Funnel */}
            <div className="col-lg-6 col-12">
              <div className="card border-0 shadow-sm h-100">
                <div className="card-header bg-white py-3 border-bottom font-weight-bold">
                  <i className="fa-solid fa-filter text-primary mr-2"></i>
                  สถานะการดำเนินงานในกระบวนการนิเทศ (Supervision Pipeline)
                </div>
                <div className="card-body p-3">
                  <div className="mb-3">
                    <div className="d-flex justify-content-between small font-weight-bold mb-1">
                      <span>1. รอ ผอ. ตรวจอนุมัติแผน (Status 1/4)</span>
                      <span className="text-danger">{liveKPI.pendingApproval} แผน</span>
                    </div>
                    <div className="progress" style={{ height: '8px' }}>
                      <div className="progress-bar bg-danger" style={{ width: `${liveKPI.total > 0 ? (liveKPI.pendingApproval / liveKPI.total) * 100 : 0}%` }}></div>
                    </div>
                  </div>

                  <div className="mb-3">
                    <div className="d-flex justify-content-between small font-weight-bold mb-1">
                      <span>2. อนุมัติแล้ว • รอครูแนบคลิปการสอน (Status 2)</span>
                      <span className="text-warning">{liveKPI.waitingClip} แผน</span>
                    </div>
                    <div className="progress" style={{ height: '8px' }}>
                      <div className="progress-bar bg-warning" style={{ width: `${liveKPI.total > 0 ? (liveKPI.waitingClip / liveKPI.total) * 100 : 0}%` }}></div>
                    </div>
                  </div>

                  <div className="mb-3">
                    <div className="d-flex justify-content-between small font-weight-bold mb-1">
                      <span>3. แนบคลิปแล้ว • อยู่ระหว่างกรรมการประเมิน (Status 5/6)</span>
                      <span className="text-info">{liveKPI.evaluating} แผน</span>
                    </div>
                    <div className="progress" style={{ height: '8px' }}>
                      <div className="progress-bar bg-info" style={{ width: `${liveKPI.total > 0 ? (liveKPI.evaluating / liveKPI.total) * 100 : 0}%` }}></div>
                    </div>
                  </div>

                  <div className="mb-3">
                    <div className="d-flex justify-content-between small font-weight-bold mb-1">
                      <span>4. กรรมการประเมินครบถ้วน • เสร็จสมบูรณ์ (Status 7)</span>
                      <span className="text-success">{liveKPI.completed} แผน</span>
                    </div>
                    <div className="progress" style={{ height: '8px' }}>
                      <div className="progress-bar bg-success" style={{ width: `${liveKPI.total > 0 ? (liveKPI.completed / liveKPI.total) * 100 : 0}%` }}></div>
                    </div>
                  </div>

                  {liveKPI.rejected > 0 && (
                    <div className="mb-1">
                      <div className="d-flex justify-content-between small font-weight-bold mb-1">
                        <span>ส่งกลับแก้ไข (Status 3)</span>
                        <span className="text-secondary">{liveKPI.rejected} แผน</span>
                      </div>
                      <div className="progress" style={{ height: '8px' }}>
                        <div className="progress-bar bg-secondary" style={{ width: `${liveKPI.total > 0 ? (liveKPI.rejected / liveKPI.total) * 100 : 0}%` }}></div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Quality Distribution */}
            <div className="col-lg-6 col-12">
              <div className="card border-0 shadow-sm h-100">
                <div className="card-header bg-white py-3 border-bottom font-weight-bold">
                  <i className="fa-solid fa-trophy text-warning mr-2"></i>
                  การกระจายตัวของระดับคุณภาพแผนที่ได้รับการประเมิน ({liveKPI.evaluatedCount} แผน)
                </div>
                <div className="card-body p-3">
                  {liveKPI.evaluatedCount === 0 ? (
                    <EmptyState message="ยังไม่มีแผนที่ได้รับการประเมินคะแนนในปีการศึกษาที่เลือก" />
                  ) : (
                    <div className="d-flex flex-column gap-3">
                      <div className="d-flex justify-content-between align-items-center p-2 rounded bg-success-subtle">
                        <span className="font-weight-bold text-success"><i className="fa-solid fa-award mr-2"></i>ดีเยี่ยม (90 - 100%)</span>
                        <span className="badge badge-success px-2 py-1">{liveKPI.qualityCounts.excellent} แผน</span>
                      </div>
                      <div className="d-flex justify-content-between align-items-center p-2 rounded bg-primary-subtle">
                        <span className="font-weight-bold text-primary"><i className="fa-solid fa-star mr-2"></i>ดีมาก (80 - 89.9%)</span>
                        <span className="badge badge-primary px-2 py-1">{liveKPI.qualityCounts.veryGood} แผน</span>
                      </div>
                      <div className="d-flex justify-content-between align-items-center p-2 rounded bg-info-subtle">
                        <span className="font-weight-bold text-info"><i className="fa-solid fa-thumbs-up mr-2"></i>ดี (70 - 79.9%)</span>
                        <span className="badge badge-info px-2 py-1">{liveKPI.qualityCounts.good} แผน</span>
                      </div>
                      <div className="d-flex justify-content-between align-items-center p-2 rounded bg-warning-subtle">
                        <span className="font-weight-bold text-warning"><i className="fa-solid fa-check mr-2"></i>พอใช้ (60 - 69.9%)</span>
                        <span className="badge badge-warning px-2 py-1 text-dark">{liveKPI.qualityCounts.fair} แผน</span>
                      </div>
                      <div className="d-flex justify-content-between align-items-center p-2 rounded bg-danger-subtle">
                        <span className="font-weight-bold text-danger"><i className="fa-solid fa-triangle-exclamation mr-2"></i>ควรปรับปรุง (&lt; 60%)</span>
                        <span className="badge badge-danger px-2 py-1">{liveKPI.qualityCounts.needsWork} แผน</span>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Tables: Subject Breakdown & Top Learning Models */}
          <div className="row g-3">
            <div className="col-lg-7 col-12">
              <div className="card border-0 shadow-sm h-100">
                <div className="card-header bg-white py-3 border-bottom font-weight-bold">
                  <i className="fa-solid fa-layer-group text-primary mr-2"></i>
                  จำแนกตามกลุ่มสาระการเรียนรู้ (8 กลุ่มสาระ)
                </div>
                <div className="table-responsive">
                  <table className="table table-hover table-striped mb-0">
                    <thead className="bg-light">
                      <tr>
                        <th style={{ width: '5%' }}>ที่</th>
                        <th>กลุ่มสาระการเรียนรู้</th>
                        <th className="text-right">แผนที่ส่ง</th>
                        <th className="text-right">ประเมินเสร็จ</th>
                        <th className="text-right">ความสำเร็จ</th>
                      </tr>
                    </thead>
                    <tbody>
                      {subjectBreakdown.map((sb, idx) => {
                        const pct = sb.total > 0 ? Math.round((sb.completed / sb.total) * 100) : 0;
                        return (
                          <tr key={sb.id}>
                            <td className="text-center font-weight-bold">{idx + 1}</td>
                            <td>{sb.name}</td>
                            <td className="text-right font-weight-bold text-primary">{sb.total}</td>
                            <td className="text-right font-weight-bold text-success">{sb.completed}</td>
                            <td className="text-right">
                              <span className={`badge ${pct === 100 ? 'badge-success' : pct > 0 ? 'badge-info' : 'badge-secondary'}`}>
                                {pct}%
                              </span>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>

            <div className="col-lg-5 col-12">
              <div className="card border-0 shadow-sm h-100">
                <div className="card-header bg-white py-3 border-bottom font-weight-bold">
                  <i className="fa-solid fa-lightbulb text-warning mr-2"></i>
                  รูปแบบการจัดการเรียนรู้ยอดนิยม (Innovation Models)
                </div>
                <div className="table-responsive">
                  <table className="table table-hover mb-0">
                    <thead className="bg-light">
                      <tr>
                        <th style={{ width: '8%' }}>ที่</th>
                        <th>รูปแบบการจัดการเรียนรู้</th>
                        <th className="text-right">จำนวนแผน</th>
                      </tr>
                    </thead>
                    <tbody>
                      {modelBreakdown.map(([modelName, count], idx) => (
                        <tr key={idx}>
                          <td className="text-center font-weight-bold">{idx + 1}</td>
                          <td><strong>{modelName}</strong></td>
                          <td className="text-right font-weight-bold text-indigo">{count} แผน</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </div>
        </>
      )}

      {/* TAB 2: Research Benchmark Data (ADAACE_T 2568) */}
      {activeTab === 'research' && (
        <div className="research-benchmark-panel">
          {/* Research Hero Alert */}
          <div
            className="card text-white mb-4 border-0 shadow-sm"
            style={{
              background: 'linear-gradient(135deg, #0f172a 0%, #1e3a8a 100%)',
              borderRadius: '12px',
            }}
          >
            <div className="card-body p-4">
              <div className="d-flex align-items-center mb-2">
                <span className="badge badge-warning text-dark font-weight-bold px-2 py-1 mr-2">
                  งานวิจัยระดับชาติ
                </span>
                <span className="text-white-50 small">สำนักงานเลขาธิการคุรุสภา ร่วมกับ สพม.พิษณุโลก อุตรดิตถ์</span>
              </div>
              <h4 className="font-weight-bold mb-2">
                รายงานผลการวิจัยและพัฒนานวัตกรรมการนิเทศการจัดการเรียนรู้ Active Coding (ADAACE_T)
              </h4>
              <p className="text-white-50 mb-0 small">
                การพัฒนารูปแบบการนิเทศการจัดการเรียนรู้เชิงรุก (Active Learning) ด้านวิทยาการคำนวณ โดยใช้แพลตฟอร์ม LMSS
                เป็นเครื่องมือขับเคลื่อนการประเมินออนไลน์ 57 สถานศึกษา
              </p>
            </div>
          </div>

          {/* Research Quantitative KPI Row */}
          <div className="row g-3 mb-4">
            <div className="col-md-3 col-6">
              <div className="p-3 bg-white rounded shadow-sm border text-center">
                <div className="text-muted small">กลุ่มตัวอย่างครูผู้สอน</div>
                <div className="fs-3 fw-bold text-primary">{reportData.quantitative.teachers} <span className="fs-6 fw-normal text-muted">คน</span></div>
                <small className="text-muted">57 สถานศึกษา (100%)</small>
              </div>
            </div>
            <div className="col-md-3 col-6">
              <div className="p-3 bg-white rounded shadow-sm border text-center">
                <div className="text-muted small">คลิปวิดีโอการสอนในการวิจัย</div>
                <div className="fs-3 fw-bold text-success">{reportData.quantitative.onlineClips} <span className="fs-6 fw-normal text-muted">คลิป</span></div>
                <small className="text-muted">นิเทศ 2 รอบสมบูรณ์</small>
              </div>
            </div>
            <div className="col-md-3 col-6">
              <div className="p-3 bg-white rounded shadow-sm border text-center">
                <div className="text-muted small">คะแนนความพึงพอใจภาพรวม</div>
                <div className="fs-3 fw-bold text-warning">{reportData.satisfaction.total} <span className="fs-6 fw-normal text-muted">/ 5.00</span></div>
                <small className="text-success font-weight-bold">ระดับมากที่สุด (S.D. = {reportData.satisfaction.sd})</small>
              </div>
            </div>
            <div className="col-md-3 col-6">
              <div className="p-3 bg-white rounded shadow-sm border text-center">
                <div className="text-muted small">การประเมินแพลตฟอร์ม LMSS</div>
                <div className="fs-3 fw-bold text-indigo" style={{ color: '#6366f1' }}>{reportData.expertProcess.stepT} <span className="fs-6 fw-normal text-muted">/ 5.00</span></div>
                <small className="text-indigo font-weight-bold">ระดับความเหมาะสมสูงสุด</small>
              </div>
            </div>
          </div>

          {/* KSA & Competencies Breakdown */}
          <div className="row g-3">
            <div className="col-lg-6 col-12">
              <div className="card border-0 shadow-sm h-100">
                <div className="card-header bg-white py-3 border-bottom font-weight-bold">
                  <i className="fa-solid fa-brain text-primary mr-2"></i>
                  ผลการพัฒนาสมรรถนะการจัดการเรียนรู้ (K / S / A)
                </div>
                <div className="card-body p-3">
                  <table className="table table-sm table-bordered">
                    <thead className="bg-light text-center">
                      <tr>
                        <th>ด้านการประเมิน</th>
                        <th>ก่อนพัฒนา</th>
                        <th>หลังพัฒนา</th>
                        <th>ผลการเปลี่ยนแปลง</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr>
                        <td><strong>ความรู้ความเข้าใจ (Knowledge)</strong></td>
                        <td className="text-center">{reportData.evaluationKSA.knowledge.pre} ({reportData.evaluationKSA.knowledge.prePct}%)</td>
                        <td className="text-center text-success font-weight-bold">{reportData.evaluationKSA.knowledge.post} ({reportData.evaluationKSA.knowledge.postPct}%)</td>
                        <td className="text-center font-weight-bold text-success">+{reportData.evaluationKSA.knowledge.diff} คะแนน</td>
                      </tr>
                      <tr>
                        <td><strong>ทักษะการจัดการเรียนรู้ (Skills)</strong></td>
                        <td className="text-center text-muted">-</td>
                        <td className="text-center text-primary font-weight-bold">{reportData.evaluationKSA.skills.total} / 5.00</td>
                        <td className="text-center"><span className="badge badge-success">ระดับมาก</span></td>
                      </tr>
                      <tr>
                        <td><strong>เจตคติต่อการจัดการเรียนรู้ (Attitude)</strong></td>
                        <td className="text-center">{reportData.evaluationKSA.attitude.round1}</td>
                        <td className="text-center text-success font-weight-bold">{reportData.evaluationKSA.attitude.round2} / 5.00</td>
                        <td className="text-center font-weight-bold text-success">+{reportData.evaluationKSA.attitude.diff} คะแนน</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>
            </div>

            <div className="col-lg-6 col-12">
              <div className="card border-0 shadow-sm h-100">
                <div className="card-header bg-white py-3 border-bottom font-weight-bold">
                  <i className="fa-solid fa-users-gear text-success mr-2"></i>
                  สมรรถนะสำคัญของผู้เรียน 5 ด้าน (Student Competencies)
                </div>
                <div className="card-body p-3">
                  <div className="mb-2">
                    <div className="d-flex justify-content-between small font-weight-bold mb-1">
                      <span>1. ความสามารถในการใช้เทคโนโลยี</span>
                      <span className="text-primary">{reportData.competencies.tech} / 5.00 (สูงสุด)</span>
                    </div>
                    <div className="progress" style={{ height: '7px' }}>
                      <div className="progress-bar bg-primary" style={{ width: `${(reportData.competencies.tech / 5) * 100}%` }}></div>
                    </div>
                  </div>

                  <div className="mb-2">
                    <div className="d-flex justify-content-between small font-weight-bold mb-1">
                      <span>2. ความสามารถในการคิด</span>
                      <span className="text-success">{reportData.competencies.think} / 5.00</span>
                    </div>
                    <div className="progress" style={{ height: '7px' }}>
                      <div className="progress-bar bg-success" style={{ width: `${(reportData.competencies.think / 5) * 100}%` }}></div>
                    </div>
                  </div>

                  <div className="mb-2">
                    <div className="d-flex justify-content-between small font-weight-bold mb-1">
                      <span>3. ความสามารถในการแก้ปัญหา</span>
                      <span className="text-info">{reportData.competencies.solve} / 5.00</span>
                    </div>
                    <div className="progress" style={{ height: '7px' }}>
                      <div className="progress-bar bg-info" style={{ width: `${(reportData.competencies.solve / 5) * 100}%` }}></div>
                    </div>
                  </div>

                  <div className="mb-2">
                    <div className="d-flex justify-content-between small font-weight-bold mb-1">
                      <span>4. ความสามารถในการสื่อสาร</span>
                      <span className="text-warning">{reportData.competencies.communicate} / 5.00</span>
                    </div>
                    <div className="progress" style={{ height: '7px' }}>
                      <div className="progress-bar bg-warning" style={{ width: `${(reportData.competencies.communicate / 5) * 100}%` }}></div>
                    </div>
                  </div>

                  <div className="mb-1">
                    <div className="d-flex justify-content-between small font-weight-bold mb-1">
                      <span>5. ความสามารถในการใช้ทักษะชีวิต</span>
                      <span className="text-secondary">{reportData.competencies.life} / 5.00</span>
                    </div>
                    <div className="progress" style={{ height: '7px' }}>
                      <div className="progress-bar bg-secondary" style={{ width: `${(reportData.competencies.life / 5) * 100}%` }}></div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SupervisionSummary;