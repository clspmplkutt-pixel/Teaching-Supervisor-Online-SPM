import React, { useEffect, useState, useMemo } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { supabase } from '../supabaseClient';
import { useUserProfile } from '../hooks/useUserProfile';
import { useAuth } from '../contexts/AuthContext';
import LoadingSpinner from '../components/LoadingSpinner';
import EmptyState from '../components/EmptyState';

const getRoleId = (user, profile) =>
  profile?.level ||
  profile?.level_id ||
  user?.level_id ||
  user?.user_metadata?.role ||
  user?.role ||
  'teacher';

const PlanCheck = () => {
  const { user } = useAuth();
  const { profile, loading: profileLoading } = useUserProfile();
  const navigate = useNavigate();
  const location = useLocation();

  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [activeTab, setActiveTab] = useState('pending_director'); // 'pending_director' | 'approved_director' | 'committee'

  // Lookups
  const [lookups, setLookups] = useState({
    teachSubjectShort: {},
    teachSubject: {},
    gradeLevel: {},
    status: {},
    prefix: {},
  });

  // Data state
  const [directorPlans, setDirectorPlans] = useState([]); // All plans for director's school
  const [teacherMap, setTeacherMap] = useState({}); // people_id -> Full Name
  const [committeePlans, setCommitteePlans] = useState([]); // Plans where current user is committee
  const [scoreSet, setScoreSet] = useState(new Set()); // planids already scored by this user

  const roleId = getRoleId(user, profile);
  const isDirector = roleId === 'directorschool';
  const userId = profile?.people_id || user?.user_metadata?.people_id || user?.email || '';

  useEffect(() => {
    // If URL has ?planid=..., redirect to appointment directly for director
    const params = new URLSearchParams(location.search);
    const directPlanId = params.get('planid');
    if (directPlanId && isDirector) {
      navigate(`/appointment?planid=${directPlanId}&from=Plan_Check`, { replace: true });
      return;
    }
  }, [location.search, isDirector, navigate]);

  useEffect(() => {
    let mounted = true;

    const loadData = async () => {
      if (!userId && !profile?.school) {
        setLoading(false);
        return;
      }

      setLoading(true);
      try {
        // 1. Fetch common lookups
        const [subjectRes, gradeRes, statusRes, prefixRes] = await Promise.all([
          supabase.from('tbl_system_Teach_Subject').select('teach_subject_id, teach_subject_1, teach_subject'),
          supabase.from('tbl_system_GradeLevel').select('grade_level_id, grade_level_name'),
          supabase.from('tbl_sendplan_status').select('id, status_name'),
          supabase.from('tbl_system_prefix').select('prefix_id, prefix'),
        ]);

        const teachSubjectShortMap = {};
        const teachSubjectMap = {};
        subjectRes.data?.forEach((s) => {
          teachSubjectShortMap[s.teach_subject_id] = s.teach_subject_1 || s.teach_subject;
          teachSubjectMap[s.teach_subject_id] = s.teach_subject;
        });

        const gradeMap = {};
        gradeRes.data?.forEach((g) => { gradeMap[g.grade_level_id] = g.grade_level_name; });

        const statusMap = {};
        statusRes.data?.forEach((s) => { statusMap[String(s.id)] = s.status_name; });

        const prefixMap = {};
        prefixRes.data?.forEach((p) => { prefixMap[p.prefix_id] = p.prefix; });

        // 2. Fetch plans where user is committee
        let commPlans = [];
        let scoredIds = new Set();
        if (userId) {
          const { data: cPlans } = await supabase
            .from('tbl_sendplan')
            .select('*')
            .or(`committee1.eq.${userId},committee2.eq.${userId},committee3.eq.${userId},committee4.eq.${userId},committee5.eq.${userId}`)
            .order('planid', { ascending: false });

          commPlans = cPlans || [];
          if (commPlans.length > 0) {
            const planIds = commPlans.map((p) => String(p.planid));
            const { data: scores } = await supabase
              .from('tbl_sendplan_score')
              .select('planid, supervision')
              .eq('supervision', userId)
              .in('planid', planIds);

            scores?.forEach((s) => scoredIds.add(String(s.planid)));
          }
        }

        // 3. If director, fetch all school plans
        let dPlans = [];
        const tMap = {};
        const schoolCode = profile?.school || user?.user_metadata?.school || '';

        if (isDirector && schoolCode) {
          const { data: sPlans } = await supabase
            .from('tbl_sendplan')
            .select('*')
            .eq('school_code', schoolCode)
            .order('planid', { ascending: false });

          dPlans = sPlans || [];

          // Fetch teacher names
          const teacherIds = Array.from(new Set(dPlans.map((p) => p.people_id).filter(Boolean)));
          if (teacherIds.length > 0) {
            const { data: teachers } = await supabase
              .from('tbl_Users')
              .select('people_id, prefix, name, lastname')
              .in('people_id', teacherIds);

            teachers?.forEach((t) => {
              tMap[t.people_id] = `${prefixMap[t.prefix] || ''}${t.name} ${t.lastname}`;
            });
          }
        }

        if (mounted) {
          setLookups({
            teachSubjectShort: teachSubjectShortMap,
            teachSubject: teachSubjectMap,
            gradeLevel: gradeMap,
            status: statusMap,
            prefix: prefixMap,
          });
          setCommitteePlans(commPlans);
          setScoreSet(scoredIds);
          setDirectorPlans(dPlans);
          setTeacherMap(tMap);

          // Set default tab: if director, start at pending_director; else committee
          if (!isDirector) {
            setActiveTab('committee');
          } else {
            setActiveTab('pending_director');
          }
        }
      } catch (err) {
        console.error('PlanCheck load error:', err);
      } finally {
        if (mounted) setLoading(false);
      }
    };

    if (!profileLoading) loadData();

    return () => { mounted = false; };
  }, [userId, profile?.school, isDirector, profileLoading]);

  // Director categorized plans
  const pendingDirectorPlans = useMemo(() => {
    return directorPlans.filter((p) => ['1', '4', 1, 4].includes(p.plan_status));
  }, [directorPlans]);

  const approvedDirectorPlans = useMemo(() => {
    return directorPlans.filter((p) => ['2', '5', 2, 5].includes(p.plan_status));
  }, [directorPlans]);

  // Filtered views based on search term
  const filterList = (list) => {
    if (!searchTerm) return list;
    const term = searchTerm.toLowerCase();
    return list.filter((p) => {
      const teacherName = (teacherMap[p.people_id] || '').toLowerCase();
      const subjectName = (p.subject_name || '').toLowerCase();
      const subjectCode = (p.subject_code || '').toLowerCase();
      const planName = (p.subject_name_plan || '').toLowerCase();
      const content = (p.subject_content || '').toLowerCase();
      return (
        teacherName.includes(term) ||
        subjectName.includes(term) ||
        subjectCode.includes(term) ||
        planName.includes(term) ||
        content.includes(term)
      );
    });
  };

  const filteredPendingDirector = useMemo(() => filterList(pendingDirectorPlans), [pendingDirectorPlans, searchTerm, teacherMap]);
  const filteredApprovedDirector = useMemo(() => filterList(approvedDirectorPlans), [approvedDirectorPlans, searchTerm, teacherMap]);
  const filteredCommittee = useMemo(() => filterList(committeePlans), [committeePlans, searchTerm, teacherMap]);

  if (loading || profileLoading) {
    return <LoadingSpinner fullPage={false} />;
  }

  // ─────────────────────────────────────────────
  // RENDER: DIRECTOR VIEW
  // ─────────────────────────────────────────────
  if (isDirector) {
    return (
      <div className="container-fluid py-2">
        {/* Header Title & Breadcrumb */}
        <div className="d-flex flex-wrap justify-content-between align-items-center mb-3">
          <div>
            <h3 className="fw-bold mb-1" style={{ color: '#1f2937' }}>
              <i className="fa-solid fa-file-circle-check text-primary mr-2"></i>
              ตรวจและอนุมัติแผนการสอน
            </h3>
            <p className="text-muted small mb-0">
              บทบาทผู้บริหารสถานศึกษา: ตรวจสอบความถูกต้อง อนุมัติการใช้แผน และแต่งตั้งคณะกรรมการนิเทศ
            </p>
          </div>
          <div className="mt-2 mt-md-0">
            <Link to="/statusplan" className="btn btn-outline-secondary btn-sm mr-2">
              <i className="fa-solid fa-list mr-1"></i> ดูสถานะแผนทั้งหมด
            </Link>
          </div>
        </div>

        {/* KPI Summary Cards */}
        <div className="row mb-3">
          <div className="col-md-4 col-sm-6 mb-2">
            <div
              className={`card shadow-sm border-0 cursor-pointer ${activeTab === 'pending_director' ? 'border-primary' : ''}`}
              style={{
                borderRadius: '12px',
                borderLeft: '5px solid #f59e0b',
                background: activeTab === 'pending_director' ? '#fffbeb' : '#ffffff',
                cursor: 'pointer',
              }}
              onClick={() => setActiveTab('pending_director')}
            >
              <div className="card-body py-3">
                <div className="d-flex justify-content-between align-items-center">
                  <div>
                    <span className="text-muted small fw-semibold text-uppercase">รอ ผอ. ตรวจอนุมัติ / แต่งตั้ง</span>
                    <h2 className="fw-bold my-1 text-warning">{pendingDirectorPlans.length}</h2>
                    <span className="badge badge-warning text-dark">
                      {pendingDirectorPlans.length > 0 ? 'รอดำเนินการ' : 'เรียบร้อยทั้งหมด'}
                    </span>
                  </div>
                  <div className="rounded-circle p-3" style={{ background: '#fef3c7' }}>
                    <i className="fa-solid fa-clock-rotate-left fa-2x text-warning"></i>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="col-md-4 col-sm-6 mb-2">
            <div
              className={`card shadow-sm border-0 cursor-pointer ${activeTab === 'approved_director' ? 'border-primary' : ''}`}
              style={{
                borderRadius: '12px',
                borderLeft: '5px solid #10b981',
                background: activeTab === 'approved_director' ? '#ecfdf5' : '#ffffff',
                cursor: 'pointer',
              }}
              onClick={() => setActiveTab('approved_director')}
            >
              <div className="card-body py-3">
                <div className="d-flex justify-content-between align-items-center">
                  <div>
                    <span className="text-muted small fw-semibold text-uppercase">อนุมัติแล้ว / อยู่ระหว่างนิเทศ</span>
                    <h2 className="fw-bold my-1 text-success">{approvedDirectorPlans.length}</h2>
                    <span className="badge badge-success">ผ่านการอนุมัติ</span>
                  </div>
                  <div className="rounded-circle p-3" style={{ background: '#d1fae5' }}>
                    <i className="fa-solid fa-circle-check fa-2x text-success"></i>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="col-md-4 col-sm-12 mb-2">
            <div
              className={`card shadow-sm border-0 cursor-pointer ${activeTab === 'committee' ? 'border-primary' : ''}`}
              style={{
                borderRadius: '12px',
                borderLeft: '5px solid #3b82f6',
                background: activeTab === 'committee' ? '#eff6ff' : '#ffffff',
                cursor: 'pointer',
              }}
              onClick={() => setActiveTab('committee')}
            >
              <div className="card-body py-3">
                <div className="d-flex justify-content-between align-items-center">
                  <div>
                    <span className="text-muted small fw-semibold text-uppercase">งานนิเทศในฐานะกรรมการ</span>
                    <h2 className="fw-bold my-1 text-primary">{committeePlans.length}</h2>
                    <span className="badge badge-primary">
                      {committeePlans.length > 0 ? `${committeePlans.length} แผนที่ได้รับมอบหมาย` : 'ไม่มีงานกรรมการ'}
                    </span>
                  </div>
                  <div className="rounded-circle p-3" style={{ background: '#dbeafe' }}>
                    <i className="fa-solid fa-user-check fa-2x text-primary"></i>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Main Content Card */}
        <div className="card shadow-sm border-0" style={{ borderRadius: '14px', overflow: 'hidden' }}>
          {/* Card Header with Tabs & Search */}
          <div className="card-header bg-white border-bottom p-3">
            <div className="row align-items-center">
              <div className="col-md-8 col-12 mb-2 mb-md-0">
                <ul className="nav nav-pills card-header-pills">
                  <li className="nav-item">
                    <button
                      className={`nav-link px-3 py-2 fw-bold ${activeTab === 'pending_director' ? 'active bg-warning text-dark' : 'text-secondary'}`}
                      onClick={() => setActiveTab('pending_director')}
                    >
                      <i className="fa-solid fa-bell mr-1"></i> รอตรวจอนุมัติ / แต่งตั้ง
                      <span className="badge badge-dark ml-2">{pendingDirectorPlans.length}</span>
                    </button>
                  </li>
                  <li className="nav-item">
                    <button
                      className={`nav-link px-3 py-2 fw-bold ${activeTab === 'approved_director' ? 'active bg-success text-white' : 'text-secondary'}`}
                      onClick={() => setActiveTab('approved_director')}
                    >
                      <i className="fa-solid fa-check-double mr-1"></i> อนุมัติแล้ว
                      <span className="badge badge-light ml-2">{approvedDirectorPlans.length}</span>
                    </button>
                  </li>
                  {committeePlans.length > 0 && (
                    <li className="nav-item">
                      <button
                        className={`nav-link px-3 py-2 fw-bold ${activeTab === 'committee' ? 'active bg-primary text-white' : 'text-secondary'}`}
                        onClick={() => setActiveTab('committee')}
                      >
                        <i className="fa-solid fa-user-tie mr-1"></i> แผนที่ต้องตรวจ (ในฐานะกรรมการ)
                        <span className="badge badge-light ml-2">{committeePlans.length}</span>
                      </button>
                    </li>
                  )}
                </ul>
              </div>
              <div className="col-md-4 col-12">
                <div className="input-group input-group-sm">
                  <input
                    type="text"
                    className="form-control"
                    placeholder="ค้นหาชื่อครู, วิชา, แผน..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
                  <div className="input-group-append">
                    <span className="input-group-text bg-white">
                      <i className="fas fa-search text-muted"></i>
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Card Body */}
          <div className="card-body p-0">
            {/* TAB 1: รอ ผอ. ตรวจอนุมัติ */}
            {activeTab === 'pending_director' && (
              <div className="table-responsive">
                <table className="table table-hover align-middle mb-0">
                  <thead className="thead-light">
                    <tr>
                      <th style={{ width: '45px' }} className="text-center">ที่</th>
                      <th style={{ minWidth: '160px' }}>ครูผู้จัดทำแผน</th>
                      <th style={{ minWidth: '130px' }}>กลุ่มสาระฯ</th>
                      <th style={{ minWidth: '100px' }}>ระดับชั้น</th>
                      <th style={{ minWidth: '160px' }}>วิชา (รหัสวิชา)</th>
                      <th style={{ minWidth: '220px' }}>ชื่อแผนการจัดการเรียนรู้</th>
                      <th style={{ minWidth: '100px' }} className="text-center">ปี/เทอม</th>
                      <th style={{ width: '60px' }} className="text-center">แผน</th>
                      <th style={{ width: '60px' }} className="text-center">คลิป</th>
                      <th style={{ minWidth: '150px' }} className="text-center">ดำเนินการ</th>
                      <th style={{ minWidth: '130px' }} className="text-center">สถานะ</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredPendingDirector.length === 0 ? (
                      <tr>
                        <td colSpan="11" className="py-5">
                          <EmptyState
                            message={searchTerm ? 'ไม่พบแผนการสอนที่ตรงกับการค้นหา' : 'ยอดเยี่ยมมาก! ไม่มีแผนการสอนที่รอ ผอ. อนุมัติในขณะนี้'}
                            fullPage={false}
                          />
                        </td>
                      </tr>
                    ) : (
                      filteredPendingDirector.map((row, idx) => {
                        const isRevised = String(row.plan_status) === '4';
                        return (
                          <tr key={row.planid}>
                            <td className="text-center text-muted fw-semibold">{idx + 1}</td>
                            <td>
                              <div className="fw-bold text-dark">
                                {teacherMap[row.people_id] || row.people_id || '-'}
                              </div>
                              <small className="text-muted">{row.people_id}</small>
                            </td>
                            <td>
                              <span className="badge badge-light border">
                                {lookups.teachSubjectShort[row.teach_subject_id] || lookups.teachSubject[row.teach_subject_id] || '-'}
                              </span>
                            </td>
                            <td>{lookups.gradeLevel[row.grade_level_id] || '-'}</td>
                            <td>
                              <strong>{row.subject_name}</strong>
                              {row.subject_code && <small className="text-muted d-block">({row.subject_code})</small>}
                            </td>
                            <td>
                              <div className="fw-semibold text-primary">{row.subject_name_plan || '-'}</div>
                              {row.subject_content && (
                                <small className="text-muted d-block text-truncate" style={{ maxWidth: '250px' }}>
                                  หน่วย: {row.subject_content}
                                </small>
                              )}
                            </td>
                            <td className="text-center">
                              <small>{row.edu_year}/{row.edu_term}</small>
                              <small className="text-muted d-block">(ปีงบ {row.budget_year})</small>
                            </td>
                            <td className="text-center">
                              {row.plan_file ? (
                                <a
                                  href={row.plan_file}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="btn btn-outline-danger btn-sm p-1 px-2"
                                  title="เปิดดูไฟล์แผน PDF"
                                >
                                  <i className="fa-regular fa-file-pdf fa-lg"></i>
                                </a>
                              ) : (
                                <span className="text-muted">-</span>
                              )}
                            </td>
                            <td className="text-center">
                              {row.plan_clip ? (
                                <a
                                  href={`https://www.youtube.com/watch?v=${row.plan_clip}`}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="btn btn-outline-danger btn-sm p-1 px-2"
                                  title="ดูคลิปการสอน"
                                >
                                  <i className="fa-brands fa-youtube fa-lg text-danger"></i>
                                </a>
                              ) : (
                                <span className="text-muted">-</span>
                              )}
                            </td>
                            <td className="text-center">
                              <Link
                                to={`/appointment?planid=${row.planid}&from=Plan_Check`}
                                className="btn btn-primary btn-sm px-3 shadow-sm font-weight-bold"
                                style={{ borderRadius: '8px' }}
                              >
                                <i className="fa-solid fa-file-signature mr-1"></i> ตรวจ/อนุมัติ/แต่งตั้ง
                              </Link>
                            </td>
                            <td className="text-center">
                              {isRevised ? (
                                <span className="badge badge-info p-2" style={{ fontSize: '11px' }}>
                                  <i className="fa-solid fa-rotate mr-1"></i> ครูแก้ไขแล้ว
                                </span>
                              ) : (
                                <span className="badge badge-warning p-2 text-dark" style={{ fontSize: '11px' }}>
                                  <i className="fa-solid fa-hourglass-half mr-1"></i> รอ ผอ. ตรวจอนุมัติ
                                </span>
                              )}
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            )}

            {/* TAB 2: อนุมัติแล้ว */}
            {activeTab === 'approved_director' && (
              <div className="table-responsive">
                <table className="table table-hover align-middle mb-0">
                  <thead className="thead-light">
                    <tr>
                      <th style={{ width: '45px' }} className="text-center">ที่</th>
                      <th>ครูผู้จัดทำแผน</th>
                      <th>กลุ่มสาระฯ</th>
                      <th>วิชา (รหัสวิชา)</th>
                      <th>ชื่อแผนการจัดการเรียนรู้</th>
                      <th className="text-center">ไฟล์แผน</th>
                      <th className="text-center">คณะกรรมการ / ดำเนินการ</th>
                      <th className="text-center">สถานะ</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredApprovedDirector.length === 0 ? (
                      <tr>
                        <td colSpan="8" className="py-5">
                          <EmptyState message="ยังไม่มีรายการแผนการสอนที่ผ่านการอนุมัติ" fullPage={false} />
                        </td>
                      </tr>
                    ) : (
                      filteredApprovedDirector.map((row, idx) => {
                        const comms = [row.committee1, row.committee2, row.committee3, row.committee4, row.committee5].filter(Boolean);
                        return (
                          <tr key={row.planid}>
                            <td className="text-center text-muted fw-semibold">{idx + 1}</td>
                            <td>
                              <strong>{teacherMap[row.people_id] || row.people_id || '-'}</strong>
                            </td>
                            <td>{lookups.teachSubjectShort[row.teach_subject_id] || '-'}</td>
                            <td>{row.subject_name} ({row.subject_code})</td>
                            <td>{row.subject_name_plan || '-'}</td>
                            <td className="text-center">
                              {row.plan_file && (
                                <a href={row.plan_file} target="_blank" rel="noreferrer" className="btn btn-outline-danger btn-sm p-1 px-2" title="เปิดดูแผน PDF">
                                  <i className="fa-regular fa-file-pdf fa-lg"></i>
                                </a>
                              )}
                            </td>
                            <td className="text-center">
                              <div className="d-flex flex-column flex-sm-row justify-content-center align-items-center gap-1" style={{ gap: '6px' }}>
                                <Link
                                  to={`/appointment?planid=${row.planid}&from=Plan_Check`}
                                  className="btn btn-warning btn-sm text-dark font-weight-bold shadow-sm"
                                  title="แก้ไขหรือเปลี่ยนรายชื่อคณะกรรมการนิเทศ"
                                >
                                  <i className="fa-solid fa-user-pen mr-1"></i> แก้ไขกรรมการ ({comms.length})
                                </Link>
                                <Link
                                  to={`/view_scoring?planid=${row.planid}`}
                                  className="btn btn-outline-info btn-sm shadow-sm"
                                  title="ดูคะแนนและผลการประเมิน"
                                >
                                  <i className="fa-solid fa-chart-line mr-1"></i> ดูคะแนนนิเทศ
                                </Link>
                              </div>
                            </td>
                            <td className="text-center">
                              <span className="badge badge-success p-2">
                                {lookups.status[String(row.plan_status)] || 'อนุมัติแล้ว'}
                              </span>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            )}

            {/* TAB 3: แผนที่ต้องตรวจในฐานะกรรมการ */}
            {activeTab === 'committee' && (
              <div className="table-responsive">
                <table className="table table-hover align-middle mb-0">
                  <thead className="thead-light">
                    <tr>
                      <th style={{ width: '45px' }} className="text-center">ที่</th>
                      <th>กลุ่มสาระ</th>
                      <th>ระดับชั้น</th>
                      <th>ชื่อวิชา (รหัสวิชา)</th>
                      <th>ชื่อแผนการสอน</th>
                      <th className="text-center">แผน</th>
                      <th className="text-center">คลิป</th>
                      <th className="text-center">การประเมิน</th>
                      <th className="text-center">สถานะ</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredCommittee.length === 0 ? (
                      <tr>
                        <td colSpan="9" className="py-5">
                          <EmptyState message="ไม่มีแผนการสอนที่ได้รับมอบหมายให้ประเมินในฐานะกรรมการ" fullPage={false} />
                        </td>
                      </tr>
                    ) : (
                      filteredCommittee.map((row, index) => {
                        let committee = '';
                        if (row.committee1 === userId) committee = 'committee1';
                        if (row.committee2 === userId) committee = 'committee2';
                        if (row.committee3 === userId) committee = 'committee3';
                        if (row.committee4 === userId) committee = 'committee4';
                        if (row.committee5 === userId) committee = 'committee5';

                        const scored = scoreSet.has(String(row.planid));

                        return (
                          <tr key={row.planid}>
                            <td className="text-center">{index + 1}</td>
                            <td>{lookups.teachSubjectShort[row.teach_subject_id] || ''}</td>
                            <td>{lookups.gradeLevel[row.grade_level_id] || ''}</td>
                            <td>{row.subject_name} ({row.subject_code})</td>
                            <td>{row.subject_name_plan}</td>
                            <td className="text-center">
                              {row.plan_file && (
                                <a href={row.plan_file} title="แผน" target="_blank" rel="noreferrer">
                                  <i className="fa-regular fa-file-pdf fa-lg"></i>
                                </a>
                              )}
                            </td>
                            <td className="text-center">
                              {row.plan_clip && (
                                <a href={`https://www.youtube.com/watch?v=${row.plan_clip}`} title="ดูคลิปการสอน" target="_blank" rel="noreferrer">
                                  <i className="fa-brands fa-youtube text-danger"></i>
                                </a>
                              )}
                            </td>
                            <td className="text-center">
                              {scored ? (
                                <Link to={`/view_scoring?planid=${row.planid}`} className="btn btn-sm btn-outline-success">
                                  <i className="fa-solid fa-check mr-1"></i> ดูผลประเมิน
                                </Link>
                              ) : (
                                <Link to={`/Plan_scoring?committee=${committee}&planid=${row.planid}`} className="btn btn-sm btn-danger">
                                  <i className="fa-solid fa-pen-to-square mr-1"></i> ให้คะแนนประเมิน
                                </Link>
                              )}
                            </td>
                            <td className="text-center">{lookups.status[String(row.plan_status)] || ''}</td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  // ─────────────────────────────────────────────
  // RENDER: STANDARD COMMITTEE VIEW (Non-Director)
  // ─────────────────────────────────────────────
  return (
    <div className="row">
      <div className="col-12">
        <div className="card card-success">
          <div className="card-header d-flex justify-content-between align-items-center">
            <h3 className="card-title m-0">
              <i className="fa-solid fa-list-check"></i> รายการตรวจแผนการสอน
            </h3>
            <div className="card-tools ml-auto">
              <div className="input-group input-group-sm" style={{ width: '250px' }}>
                <input
                  type="text"
                  className="form-control float-right"
                  placeholder="ค้นหาชื่อวิชา / แผน..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
                <div className="input-group-append">
                  <span className="input-group-text bg-white">
                    <i className="fas fa-search text-muted"></i>
                  </span>
                </div>
              </div>
            </div>
          </div>
          <div className="card-body">
            <div className="table-responsive">
              <table className="table table-bordered table-hover table-striped" id="data">
                <thead>
                  <tr>
                    <th>ที่</th>
                    <th>กลุ่มสาระ (ย่อ)</th>
                    <th>ระดับชั้น</th>
                    <th>ชื่อวิชา (รหัสวิชา)</th>
                    <th>หน่วยการเรียนรู้</th>
                    <th>ชื่อแผนการสอน</th>
                    <th>ปีการศึกษา/ภาคเรียน (ปีงบประมาณ)</th>
                    <th>วันที่ส่ง</th>
                    <th>แผน</th>
                    <th>คลิป</th>
                    <th>ดำเนินการ</th>
                    <th>สถานะ</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredCommittee.length === 0 && (
                    <tr>
                      <td colSpan="12">
                        <EmptyState message="ยังไม่มีแผนการสอนที่ได้รับมอบหมายให้ตรวจ" fullPage={false} />
                      </td>
                    </tr>
                  )}
                  {filteredCommittee.map((row, index) => {
                    let committee = '';
                    if (row.committee1 === userId) committee = 'committee1';
                    if (row.committee2 === userId) committee = 'committee2';
                    if (row.committee3 === userId) committee = 'committee3';
                    if (row.committee4 === userId) committee = 'committee4';
                    if (row.committee5 === userId) committee = 'committee5';

                    const scored = scoreSet.has(String(row.planid));

                    return (
                      <tr key={row.planid}>
                        <td className="text-center">{index + 1}</td>
                        <td>{lookups.teachSubjectShort[row.teach_subject_id] || ''}</td>
                        <td>{lookups.gradeLevel[row.grade_level_id] || ''}</td>
                        <td>{row.subject_name} ({row.subject_code})</td>
                        <td>{row.subject_content}</td>
                        <td>{row.subject_name_plan}</td>
                        <td>{row.edu_year}/{row.edu_term}<br />(ปีงบ {row.budget_year})</td>
                        <td>{row.plan_senddate}</td>
                        <td className="text-center">
                          {row.plan_file && (
                            <a href={row.plan_file} title="แผน" target="_blank" rel="noreferrer">
                              <i className="fa-regular fa-file-pdf fa-lg"></i>
                            </a>
                          )}
                        </td>
                        <td className="text-center">
                          {row.plan_clip && (
                            <a href={`https://www.youtube.com/watch?v=${row.plan_clip}`} title="ดูคลิปการสอน" target="_blank" rel="noreferrer">
                              <i className="fa-brands fa-youtube text-danger"></i>
                            </a>
                          )}
                        </td>
                        <td>
                          {scored ? (
                            <span className="text-success">
                              <Link to={`/view_scoring?planid=${row.planid}`} className="btn btn-sm btn-outline-success">
                                <i className="fa-solid fa-check mr-1"></i> ดูผลการประเมิน
                              </Link>
                            </span>
                          ) : (
                            <span className="text-danger">
                              <Link to={`/Plan_scoring?committee=${committee}&planid=${row.planid}`} className="btn btn-sm btn-danger">
                                <i className="fa-solid fa-pen-to-square mr-1"></i> ยังไม่ประเมิน
                              </Link>
                            </span>
                          )}
                        </td>
                        <td>{lookups.status[String(row.plan_status)] || ''}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PlanCheck;
