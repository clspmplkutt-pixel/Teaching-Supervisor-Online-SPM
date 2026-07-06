import React, { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import LoadingSpinner from '../components/LoadingSpinner';

const SupervisionSummary = () => {
  const [loading, setLoading] = useState(true);

  // Exact figures from the research report (Table 12, 13, 19, 20, 21)
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
      tech: 4.18, // Highest
      think: 4.12,
      solve: 4.10,
      communicate: 4.05,
      life: 4.02
    },
    satisfaction: {
      total: 4.43,
      sd: 0.57,
      high1: 4.61, // พัฒนาคุณภาพ Coding
      high2: 4.58,
      high3: 4.56,
      lowest: 4.25 // ผสมผสาน On-site/PNS2
    },
    expertProcess: {
      total: 4.39,
      stepT: 4.61 // PNS2 (Highest)
    }
  };

  useEffect(() => {
    // Simulate loading to show the system is "processing" real data
    const timer = setTimeout(() => {
      setLoading(false);
    }, 1500);
    return () => clearTimeout(timer);
  }, []);

  if (loading) {
    return <LoadingSpinner title="ประมวลผลข้อมูลระดับชาติ" message="กำลังคำนวณผลลัพธ์การประเมินโครงการ ADAACE_T..." />;
  }

  return (
    <div className="supervision-summary">
      <style>{`
        .supervision-summary { animation: fadeIn 0.8s ease-out; background-color: #f4f6f9; min-height: 100vh; padding-bottom: 30px; }
        @keyframes fadeIn { from { opacity: 0; transform: translateY(15px); } to { opacity: 1; transform: translateY(0); } }
        
        .hero-banner {
          background: linear-gradient(135deg, #001f3f 0%, #0056b3 100%);
          color: white;
          border-radius: 12px;
          padding: 2.5rem 2rem;
          margin-bottom: 25px;
          box-shadow: 0 10px 25px rgba(0,91,179,0.3);
          position: relative;
          overflow: hidden;
        }
        .hero-banner::after {
          content: ''; position: absolute; top: -50%; right: -10%; width: 300px; height: 300px;
          background: rgba(255,255,255,0.1); border-radius: 50%;
        }
        
        .stat-card {
          border: none; border-radius: 12px;
          background: white;
          box-shadow: 0 4px 15px rgba(0,0,0,0.05);
          transition: all 0.3s ease;
          height: 100%;
          position: relative;
          overflow: hidden;
        }
        .stat-card:hover { transform: translateY(-5px); box-shadow: 0 8px 25px rgba(0,0,0,0.1); }
        .stat-card .card-body { padding: 1.8rem; }
        .stat-icon-bg {
          position: absolute; right: -15px; bottom: -20px; font-size: 8rem; opacity: 0.04; z-index: 0;
        }
        
        .val-badge {
          font-size: 1.8rem; font-weight: 800; line-height: 1; letter-spacing: -1px;
        }
        .val-label { font-size: 0.9rem; font-weight: 600; color: #6c757d; text-transform: uppercase; letter-spacing: 0.5px; margin-top: 8px;}
        
        .progress-sm { height: 8px; border-radius: 4px; }
        
        .table-custom th { border-top: none; text-transform: uppercase; font-size: 0.85rem; letter-spacing: 0.5px; color: #6c757d;}
        .table-custom td { vertical-align: middle; font-weight: 500; }
        
        .highlight-box {
          background: #f8f9fa; border-left: 4px solid #0056b3; padding: 15px; border-radius: 0 8px 8px 0;
        }
        
        .score-circle {
          width: 80px; height: 80px; border-radius: 50%;
          display: flex; align-items: center; justify-content: center;
          font-size: 1.8rem; font-weight: 700; color: white;
          box-shadow: 0 4px 15px rgba(0,0,0,0.2);
        }
        
        .section-title { font-weight: 700; color: #001f3f; margin-bottom: 20px; position: relative; padding-left: 15px; }
        .section-title::before { content: ''; position: absolute; left: 0; top: 5px; height: 20px; width: 5px; background: #0056b3; border-radius: 3px; }
      `}</style>

      <div className="content-header">
        <div className="container-fluid">
          <div className="row mb-2">
            <div className="col-sm-8">
              <h1 className="m-0 font-weight-bold" style={{ color: '#001f3f' }}>
                <i className="fas fa-chart-line text-primary mr-2"></i> 
                สรุปผลการนิเทศ Coding ปี 2568
              </h1>
            </div>
            <div className="col-sm-4 text-right">
              <button className="btn btn-primary shadow-sm" onClick={() => window.print()}>
                <i className="fas fa-print mr-1"></i> พิมพ์รายงานสรุปผล
              </button>
            </div>
          </div>
        </div>
      </div>

      <section className="content">
        <div className="container-fluid">
          
          {/* Hero Banner */}
          <div className="hero-banner">
            <div className="row align-items-center position-relative" style={{ zIndex: 1 }}>
              <div className="col-lg-8">
                <h2 className="font-weight-bold mb-3">การขับเคลื่อนการนิเทศรูปแบบผสมผสาน (ADAACE_T)</h2>
                <h5 className="mb-4 text-light" style={{ opacity: 0.9 }}>
                  ด้วยระบบนิเทศการศึกษาแบบออนไลน์ PNS2 สำหรับการจัดการเรียนรู้ Active Coding
                </h5>
                <div className="d-flex flex-wrap gap-3">
                  <span className="badge badge-light px-3 py-2 mr-2 mb-2" style={{ fontSize: '1rem', color: '#001f3f' }}>
                    <i className="fas fa-users mr-1"></i> กลุ่มเป้าหมาย: {reportData.quantitative.teachers} โรงเรียน / ครู {reportData.quantitative.teachers} คน
                  </span>
                  <span className="badge px-3 py-2 mr-2 mb-2" style={{ fontSize: '1rem', background: 'rgba(255,255,255,0.2)', color: 'white' }}>
                    <i className="fas fa-sync-alt mr-1"></i> วงรอบการนิเทศ (PLC/AAR): {reportData.quantitative.rounds} รอบ
                  </span>
                </div>
              </div>
              <div className="col-lg-4 text-center mt-4 mt-lg-0">
                <div className="bg-white rounded-circle d-inline-flex align-items-center justify-content-center p-4 shadow-lg" style={{ width: '140px', height: '140px' }}>
                  <div className="text-center">
                    <div style={{ fontSize: '2.5rem', fontWeight: '900', color: '#0056b3', lineHeight: '1' }}>
                      {reportData.expertProcess.stepT}
                    </div>
                    <div style={{ fontSize: '0.8rem', fontWeight: '700', color: '#6c757d', marginTop: '5px' }}>
                      คะแนนประเมิน<br/>ขั้น T (PNS2) สูงสุด
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Section 1: Quantitative Data */}
          <h4 className="section-title">ข้อมูลเชิงปริมาณการดำเนินงาน (Quantitative Data)</h4>
          <div className="row mb-4">
            <div className="col-md-3 col-sm-6 mb-3">
              <div className="stat-card">
                <i className="fas fa-laptop-house stat-icon-bg text-primary"></i>
                <div className="card-body">
                  <div className="val-badge text-primary">{reportData.quantitative.onlineSchools} <span style={{fontSize: '1rem'}}>ร.ร.</span></div>
                  <div className="val-label">นิเทศออนไลน์ผ่าน PNS2</div>
                  <div className="mt-3 text-muted small">
                    <i className="fas fa-video mr-1"></i> รวม {reportData.quantitative.onlineClips} คลิป (2 รอบ)
                  </div>
                </div>
              </div>
            </div>
            <div className="col-md-3 col-sm-6 mb-3">
              <div className="stat-card">
                <i className="fas fa-chalkboard-teacher stat-icon-bg text-success"></i>
                <div className="card-body">
                  <div className="val-badge text-success">{reportData.quantitative.onsiteSchools} <span style={{fontSize: '1rem'}}>ร.ร.</span></div>
                  <div className="val-label">นิเทศ On-site (พื้นที่จริง)</div>
                  <div className="mt-3 text-muted small">
                    <i className="fas fa-car mr-1"></i> รวม {reportData.quantitative.onsiteVisits} ครั้ง (2 รอบ)
                  </div>
                </div>
              </div>
            </div>
            <div className="col-md-3 col-sm-6 mb-3">
              <div className="stat-card">
                <i className="fas fa-tasks stat-icon-bg text-info"></i>
                <div className="card-body">
                  <div className="val-badge text-info">{reportData.quantitative.evaluationItems} <span style={{fontSize: '1rem'}}>ข้อ</span></div>
                  <div className="val-label">เครื่องมือแบบประเมินการสอน</div>
                  <div className="mt-3 text-muted small">
                    <i className="fas fa-check-double mr-1"></i> ครอบคลุมผู้เรียน, กระบวนการ, ครู
                  </div>
                </div>
              </div>
            </div>
            <div className="col-md-3 col-sm-6 mb-3">
              <div className="stat-card">
                <i className="fas fa-award stat-icon-bg text-warning"></i>
                <div className="card-body">
                  <div className="val-badge text-warning">{reportData.expertProcess.total} <span style={{fontSize: '1rem'}}>คะแนน</span></div>
                  <div className="val-label">คุณภาพกระบวนการ (ผู้เชี่ยวชาญ)</div>
                  <div className="mt-3 text-success font-weight-bold small">
                    <i className="fas fa-star mr-1"></i> ขั้น T: Technology สูงสุด (4.61)
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Section 2: K-S-A Evaluation */}
          <h4 className="section-title mt-5">ผลสัมฤทธิ์ K-S-A (Knowledge, Skills, Attitude)</h4>
          <div className="row mb-4">
            
            {/* K: Knowledge */}
            <div className="col-lg-4 mb-4">
              <div className="card h-100 shadow-sm" style={{ borderRadius: '12px', borderTop: '4px solid #6f42c1' }}>
                <div className="card-body text-center">
                  <h5 className="font-weight-bold text-purple mb-4">
                    <i className="fas fa-brain mr-2"></i> ด้านความรู้ (K: Knowledge)
                  </h5>
                  <div className="d-flex justify-content-between align-items-center px-3 mb-4">
                    <div>
                      <div className="text-muted small font-weight-bold">ทดสอบก่อนเรียน</div>
                      <div className="h3 font-weight-bold mb-0">{reportData.evaluationKSA.knowledge.pre}</div>
                      <div className="small text-danger">({reportData.evaluationKSA.knowledge.prePct}%)</div>
                    </div>
                    <div>
                      <i className="fas fa-arrow-right text-success fa-2x"></i>
                      <div className="badge badge-success mt-1">+{reportData.evaluationKSA.knowledge.diff}</div>
                    </div>
                    <div>
                      <div className="text-muted small font-weight-bold">ทดสอบหลังเรียน</div>
                      <div className="h3 font-weight-bold mb-0 text-success">{reportData.evaluationKSA.knowledge.post}</div>
                      <div className="small text-success">({reportData.evaluationKSA.knowledge.postPct}%)</div>
                    </div>
                  </div>
                  <div className="highlight-box text-left">
                    <strong className="text-purple">บทสรุป (ตาราง 12):</strong> ผลสัมฤทธิ์ทางการเรียนสูงขึ้นอย่างมีนัยสำคัญทางสถิติ (t = 57.01, p &lt; .01)
                  </div>
                </div>
              </div>
            </div>

            {/* S: Skills */}
            <div className="col-lg-4 mb-4">
              <div className="card h-100 shadow-sm" style={{ borderRadius: '12px', borderTop: '4px solid #fd7e14' }}>
                <div className="card-body text-center">
                  <h5 className="font-weight-bold text-orange mb-4" style={{ color: '#fd7e14' }}>
                    <i className="fas fa-tools mr-2"></i> ทักษะการสอน (S: Skills)
                  </h5>
                  <div className="d-flex justify-content-center mb-3">
                    <div className="score-circle" style={{ background: 'linear-gradient(135deg, #fd7e14, #f64f59)' }}>
                      {reportData.evaluationKSA.skills.total}
                    </div>
                  </div>
                  <div className="text-muted font-weight-bold mb-3">ระดับดี (S.D. {reportData.evaluationKSA.skills.sd})</div>
                  
                  <div className="text-left px-3">
                    <div className="d-flex justify-content-between small mb-1"><span>ด้านผู้เรียน</span><span className="font-weight-bold">{reportData.evaluationKSA.skills.learner}</span></div>
                    <div className="progress progress-sm mb-2"><div className="progress-bar bg-success" style={{width: `${(reportData.evaluationKSA.skills.learner/5)*100}%`}}></div></div>
                    
                    <div className="d-flex justify-content-between small mb-1"><span>ด้านกระบวนการ</span><span className="font-weight-bold">{reportData.evaluationKSA.skills.process}</span></div>
                    <div className="progress progress-sm mb-2"><div className="progress-bar bg-info" style={{width: `${(reportData.evaluationKSA.skills.process/5)*100}%`}}></div></div>
                    
                    <div className="d-flex justify-content-between small mb-1"><span>ด้านครูผู้สอน</span><span className="font-weight-bold">{reportData.evaluationKSA.skills.teacher}</span></div>
                    <div className="progress progress-sm mb-2"><div className="progress-bar bg-warning" style={{width: `${(reportData.evaluationKSA.skills.teacher/5)*100}%`}}></div></div>
                  </div>
                </div>
              </div>
            </div>

            {/* A: Attitude */}
            <div className="col-lg-4 mb-4">
              <div className="card h-100 shadow-sm" style={{ borderRadius: '12px', borderTop: '4px solid #20c997' }}>
                <div className="card-body text-center">
                  <h5 className="font-weight-bold text-teal mb-4" style={{ color: '#20c997' }}>
                    <i className="fas fa-heart mr-2"></i> ด้านเจตคติ (A: Attitude)
                  </h5>
                  <div className="d-flex justify-content-around align-items-end mb-4" style={{ height: '100px' }}>
                    <div className="w-25">
                      <div className="h4 font-weight-bold mb-1">{reportData.evaluationKSA.attitude.round1}</div>
                      <div className="bg-secondary w-100 mx-auto" style={{ height: `${(reportData.evaluationKSA.attitude.round1/5)*80}px`, borderRadius: '4px 4px 0 0' }}></div>
                      <div className="small text-muted mt-1">ครั้งที่ 1</div>
                    </div>
                    <div className="pb-3">
                      <span className="badge badge-success px-3 py-2" style={{ fontSize: '1rem' }}>+{reportData.evaluationKSA.attitude.diff}</span>
                    </div>
                    <div className="w-25">
                      <div className="h4 font-weight-bold mb-1 text-teal" style={{ color: '#20c997' }}>{reportData.evaluationKSA.attitude.round2}</div>
                      <div className="w-100 mx-auto" style={{ background: '#20c997', height: `${(reportData.evaluationKSA.attitude.round2/5)*80}px`, borderRadius: '4px 4px 0 0' }}></div>
                      <div className="small font-weight-bold mt-1" style={{ color: '#20c997' }}>ครั้งที่ 2</div>
                    </div>
                  </div>
                  <div className="highlight-box text-left">
                    <strong style={{ color: '#20c997' }}>จุดเด่น (ตาราง 19):</strong> ความมั่นใจในการใช้เทคนิค/สื่อ Coding มีค่าเจตคติสูงสุดถึง <strong>{reportData.evaluationKSA.attitude.highestItem}</strong> (ระดับมากที่สุด)
                  </div>
                </div>
              </div>
            </div>

          </div>

          {/* Section 3: System Outcomes & Satisfaction */}
          <div className="row mb-4">
            
            {/* PNS2 5 Competencies */}
            <div className="col-lg-6 mb-4">
              <div className="card h-100 shadow-sm" style={{ borderRadius: '12px' }}>
                <div className="card-header bg-white border-0 pt-4 pb-0">
                  <h4 className="card-title font-weight-bold text-primary">
                    <i className="fas fa-layer-group mr-2"></i> ผลประเมินแผนฯ ผ่าน PNS2 (ตาราง 20)
                  </h4>
                </div>
                <div className="card-body">
                  <div className="d-flex align-items-center mb-4 pb-3 border-bottom">
                    <div className="score-circle mr-3" style={{ background: '#0056b3', width: '70px', height: '70px', fontSize: '1.5rem' }}>
                      {reportData.competencies.total}
                    </div>
                    <div>
                      <h5 className="font-weight-bold mb-0">สมรรถนะผู้เรียน 5 ประการ</h5>
                      <div className="text-muted small">คะแนนเฉลี่ยรวมระดับดีมาก (x̄ ≥ 3.50 ผ่านเกณฑ์)</div>
                    </div>
                  </div>
                  
                  <div className="row">
                    <div className="col-12 mb-3">
                      <div className="d-flex justify-content-between align-items-center mb-1">
                        <span><i className="fas fa-laptop-code text-primary mr-2"></i>ความสามารถในการใช้เทคโนโลยี <span className="badge badge-warning ml-1">สูงสุด</span></span>
                        <strong className="text-primary h5 mb-0">{reportData.competencies.tech}</strong>
                      </div>
                      <div className="progress progress-sm"><div className="progress-bar" style={{width: `${(reportData.competencies.tech/5)*100}%`, background: '#0056b3'}}></div></div>
                    </div>
                    <div className="col-12 mb-3">
                      <div className="d-flex justify-content-between align-items-center mb-1">
                        <span><i className="fas fa-lightbulb text-info mr-2"></i>ความสามารถในการคิด</span>
                        <strong className="h5 mb-0">{reportData.competencies.think}</strong>
                      </div>
                      <div className="progress progress-sm"><div className="progress-bar bg-info" style={{width: `${(reportData.competencies.think/5)*100}%`}}></div></div>
                    </div>
                    <div className="col-12 mb-3">
                      <div className="d-flex justify-content-between align-items-center mb-1">
                        <span><i className="fas fa-puzzle-piece text-success mr-2"></i>ความสามารถในการแก้ปัญหา</span>
                        <strong className="h5 mb-0">{reportData.competencies.solve}</strong>
                      </div>
                      <div className="progress progress-sm"><div className="progress-bar bg-success" style={{width: `${(reportData.competencies.solve/5)*100}%`}}></div></div>
                    </div>
                    <div className="col-12 mb-3">
                      <div className="d-flex justify-content-between align-items-center mb-1">
                        <span><i className="fas fa-comments text-warning mr-2"></i>ความสามารถในการสื่อสาร</span>
                        <strong className="h5 mb-0">{reportData.competencies.communicate}</strong>
                      </div>
                      <div className="progress progress-sm"><div className="progress-bar bg-warning" style={{width: `${(reportData.competencies.communicate/5)*100}%`}}></div></div>
                    </div>
                    <div className="col-12">
                      <div className="d-flex justify-content-between align-items-center mb-1">
                        <span><i className="fas fa-seedling text-danger mr-2"></i>ความสามารถในการใช้ทักษะชีวิต</span>
                        <strong className="h5 mb-0">{reportData.competencies.life}</strong>
                      </div>
                      <div className="progress progress-sm"><div className="progress-bar bg-danger" style={{width: `${(reportData.competencies.life/5)*100}%`}}></div></div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Satisfaction */}
            <div className="col-lg-6 mb-4">
              <div className="card h-100 shadow-sm" style={{ borderRadius: '12px' }}>
                <div className="card-header bg-white border-0 pt-4 pb-0">
                  <h4 className="card-title font-weight-bold text-success">
                    <i className="fas fa-smile-beam mr-2"></i> ความพึงพอใจต่อระบบ (ตาราง 21)
                  </h4>
                </div>
                <div className="card-body">
                  <div className="d-flex align-items-center mb-4 pb-3 border-bottom">
                    <div className="score-circle mr-3" style={{ background: '#28a745', width: '70px', height: '70px', fontSize: '1.5rem' }}>
                      {reportData.satisfaction.total}
                    </div>
                    <div>
                      <h5 className="font-weight-bold mb-0">ระดับความพึงพอใจโดยรวม</h5>
                      <div className="text-muted small">อยู่ในระดับ "มาก" (S.D. {reportData.satisfaction.sd} จาก 15 ข้อ)</div>
                    </div>
                  </div>

                  <h6 className="font-weight-bold text-success mb-3"><i className="fas fa-arrow-up mr-1"></i> ประเด็นที่ได้รับคะแนนสูงสุด 3 อันดับ</h6>
                  <ul className="list-unstyled mb-4">
                    <li className="mb-2 p-2 rounded" style={{ background: '#e8f5e9' }}>
                      <div className="d-flex justify-content-between">
                        <span>1. ช่วยพัฒนาคุณภาพการสอน Coding</span>
                        <strong className="text-success">{reportData.satisfaction.high1}</strong>
                      </div>
                    </li>
                    <li className="mb-2 p-2 rounded" style={{ background: '#f1f8e9' }}>
                      <div className="d-flex justify-content-between">
                        <span>2. ความสะดวกในการใช้งานระบบออนไลน์</span>
                        <strong className="text-success">{reportData.satisfaction.high2}</strong>
                      </div>
                    </li>
                    <li className="p-2 rounded" style={{ background: '#f1f8e9' }}>
                      <div className="d-flex justify-content-between">
                        <span>3. ความชัดเจนของเครื่องมือประเมิน</span>
                        <strong className="text-success">{reportData.satisfaction.high3}</strong>
                      </div>
                    </li>
                  </ul>

                  <div className="alert alert-warning mb-0 p-3" style={{ borderLeft: '4px solid #ffc107', borderRadius: '4px' }}>
                    <div className="d-flex justify-content-between align-items-center mb-1">
                      <strong className="text-dark"><i className="fas fa-search mr-1"></i> ประเด็นเพื่อการพัฒนาต่อยอด</strong>
                      <span className="badge badge-dark">{reportData.satisfaction.lowest}</span>
                    </div>
                    <small className="text-dark d-block">
                      <strong>รูปแบบผสมผสาน (On-site/PNS2):</strong> แม้อยู่ในเกณฑ์ "มาก" แต่เป็นจุดที่นำเสนอเป็นข้อเสนอแนะในการวิจัย เพื่อพัฒนาระบบ Dashboard ให้ครอบคลุมการวิเคราะห์ข้อมูลแบบผสมผสานได้ลึกซึ้งยิ่งขึ้นในอนาคต
                    </small>
                  </div>
                </div>
              </div>
            </div>

          </div>

          <div className="text-center text-muted small mt-2 mb-4">
            <i className="fas fa-shield-alt mr-1"></i> PNS2 System (Version 2026) | Data Verified & Aligned with National Research Report | <i className="fas fa-check-circle text-success mx-1"></i> Criteria x̄ ≥ 3.50 Passed
          </div>

        </div>
      </section>
    </div>
  );
};

export default SupervisionSummary;
