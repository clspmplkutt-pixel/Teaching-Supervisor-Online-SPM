import React, { useEffect, useState, useMemo } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { supabase } from '../supabaseClient';
import { useUserProfile } from '../hooks/useUserProfile';
import { useAuth } from '../contexts/AuthContext';
import LoadingSpinner from '../components/LoadingSpinner';
import EmptyState from '../components/EmptyState';
import StatusBadge from '../components/StatusBadge';
import { maskThaiId } from '../utils/scoreCalculator';

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
  const [viewMode, setViewMode] = useState('auto'); // 'auto', 'card', 'table'

  // Lookups
  const [lookups, setLookups] = useState({
    teachSubjectShort: {},
    teachSubject: {},
    gradeLevel: {},
    status: {},
    prefix: {},
    academic: {},
    school: {},
  });

  // Data state
  const [directorPlans, setDirectorPlans] = useState([]);
  const [teacherMap, setTeacherMap] = useState({}); // people_id -> { name, school, standing }
  const [committeePlans, setCommitteePlans] = useState([]);
  const [scoreSet, setScoreSet] = useState(new Set());

  const roleId = getRoleId(user, profile);
  const isDirector = roleId === 'directorschool';
  const userId = profile?.people_id || user?.user_metadata?.people_id || user?.email || '';

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const directPlanId = params.get('planid');
    if (directPlanId && isDirector) {
      navigate(`/appointment?planid=${directPlanId}&from=Plan_Check`, { replace: true });
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
        const [subjectRes, gradeRes, statusRes, prefixRes, academicRes, schoolRes] = await Promise.all([
          supabase.from('tbl_system_Teach_Subject').select('teach_subject_id, teach_subject_1, teach_subject'),
          supabase.from('tbl_system_GradeLevel').select('grade_level_id, grade_level_name'),
          supabase.from('tbl_sendplan_status').select('id, status_name'),
          supabase.from('tbl_system_prefix').select('prefix_id, prefix'),
          supabase.from('tbl_system_Academic_Standing').select('academic_id, academic_standing'),
          supabase.from('tbl_school').select('school_id, school_name'),
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

        const academicMap = {};
        academicRes.data?.forEach((a) => { academicMap[String(a.academic_id)] = a.academic_standing; });

        const schoolMap = {};
        schoolRes.data?.forEach((sc) => { schoolMap[String(sc.school_id)] = sc.school_name; });

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
        const schoolCode = profile?.school || user?.user_metadata?.school || '';

        if (isDirector && schoolCode) {
          const { data: sPlans } = await supabase
            .from('tbl_sendplan')
            .select('*')
            .eq('school_code', schoolCode)
            .order('planid', { ascending: false });

          dPlans = sPlans || [];
        }

        // 4. Fetch teacher profiles for ALL plans (Director plans + Committee plans)
        const tMap = {};
        const allTeacherIds = Array.from(
          new Set([...dPlans.map((p) => p.people_id), ...commPlans.map((p) => p.people_id)].filter(Boolean))
        );

        if (allTeacherIds.length > 0) {
          const { data: teachers } = await supabase
            .from('tbl_Users')
            .select('people_id, prefix, name, lastname, school, academic_id')
            .in('people_id', allTeacherIds);

          teachers?.forEach((t) => {
            const pfx = prefixMap[t.prefix] || '';
            const fullName = `${pfx}${t.name} ${t.lastname || ''}`.trim();
            const sName = schoolMap[t.school] || '';
            const acName = academicMap[String(t.academic_id)] || '';
            tMap[t.people_id] = {
              name: fullName,
              school: sName,
              standing: acName,
            };
          });
        }

        if (mounted) {
          setLookups({
            teachSubjectShort: teachSubjectShortMap,
            teachSubject: teachSubjectMap,
            gradeLevel: gradeMap,
            status: statusMap,
            prefix: prefixMap,
            academic: academicMap,
            school: schoolMap,
          });
          setCommitteePlans(commPlans);
          setScoreSet(scoredIds);
          setDirectorPlans(dPlans);
          setTeacherMap(tMap);

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
    return directorPlans.filter((p) => ['2', '5', '6', '7', 2, 5, 6, 7].includes(p.plan_status));
  }, [directorPlans]);

  const rejectedDirectorPlans = useMemo(() => {
    return directorPlans.filter((p) => ['3', 3].includes(p.plan_status));
  }, [directorPlans]);

  // Committee KPI summary
  const committeeKPI = useMemo(() => {
    const total = committeePlans.length;
    let scored = 0;
    let ready = 0;
    let waitingClip = 0;

    committeePlans.forEach((p) => {
      const isScored = scoreSet.has(String(p.planid));
      if (isScored) {
        scored++;
      } else {
        const statusNum = Number(p.plan_status);
        if (statusNum >= 5) {
          ready++;
        } else {
          waitingClip++;
        }
      }
    });

    return { total, scored, ready, waitingClip };
  }, [committeePlans, scoreSet]);

  // Search filter
  const filterList = (list) => {
    if (!searchTerm) return list;
    const term = searchTerm.toLowerCase();
    return list.filter((p) => {
      const tInfo = teacherMap[p.people_id] || {};
      const teacherName = (tInfo.name || '').toLowerCase();
      const schoolName = (tInfo.school || '').toLowerCase();
      const subjectName = (p.subject_name || '').toLowerCase();
      const subjectCode = (p.subject_code || '').toLowerCase();
      const planName = (p.subject_name_plan || '').toLowerCase();
      const content = (p.subject_content || '').toLowerCase();
      return (
        teacherName.includes(term) ||
        schoolName.includes(term) ||
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

  const renderDirectorPendingCard = (row, idx) => {
    const tInfo = teacherMap[row.people_id] || {};
    const teacherName = tInfo.name || (row.people_id ? maskThaiId(row.people_id) : '-');

    return (
      <div key={`m-dpen-${row.planid}`} className="card shadow-sm border mb-3 rounded-lg overflow-hidden">
        <div className="card-header bg-light d-flex justify-content-between align-items-center py-2 px-3 border-bottom">
          <div className="d-flex align-items-center">
            <span className="badge badge-warning text-dark mr-2">#{idx + 1}</span>
            <span className="font-weight-bold text-dark">{teacherName}</span>
          </div>
          <StatusBadge status={row.plan_status} short />
        </div>
        <div className="card-body p-3">
          <h5 className="font-weight-bold text-primary mb-1" style={{ fontSize: '0.95rem' }}>
            {row.subject_name_plan || '-'}
          </h5>
          <div className="small text-muted mb-2">
            {row.subject_name} ({row.subject_code}) • {lookups.gradeLevel[row.grade_level_id] || '-'} • {lookups.teachSubjectShort[row.teach_subject_id] || '-'}
          </div>
          {row.subject_content && (
            <div className="small text-secondary mb-2">
              <strong>หน่วย:</strong> {row.subject_content}
            </div>
          )}
          <div className="d-flex justify-content-between align-items-center small text-muted pt-2 border-top">
            <span>ปี {row.edu_year}/{row.edu_term}</span>
            <div className="d-flex" style={{ gap: '8px' }}>
              {row.plan_file && (
                <a href={row.plan_file} target="_blank" rel="noreferrer" className="text-danger font-weight-bold">
                  <i className="fa-regular fa-file-pdf mr-1"></i>ดู PDF
                </a>
              )}
              {row.plan_clip && (
                <a href={`https://www.youtube.com/watch?v=${row.plan_clip}`} target="_blank" rel="noreferrer" className="text-danger font-weight-bold ml-2">
                  <i className="fa-brands fa-youtube mr-1"></i>คลิป
                </a>
              )}
            </div>
          </div>
        </div>
        <div className="card-footer bg-white p-2 border-top">
          <Link
            to={`/appointment?planid=${row.planid}&from=Plan_Check`}
            className="btn btn-primary btn-block btn-sm font-weight-bold shadow-sm"
          >
            <i className="fa-solid fa-file-signature mr-1"></i> ตรวจและอนุมัติแผนนี้
          </Link>
        </div>
      </div>
    );
  };

  const renderCommitteeCard = (row, index) => {
    let committee = '';
    if (row.committee1 === userId) committee = 'committee1';
    if (row.committee2 === userId) committee = 'committee2';
    if (row.committee3 === userId) committee = 'committee3';
    if (row.committee4 === userId) committee = 'committee4';
    if (row.committee5 === userId) committee = 'committee5';

    const scored = scoreSet.has(String(row.planid));
    const canScore = Number(row.plan_status) >= 5;
    const tInfo = teacherMap[row.people_id] || {};
    const teacherName = tInfo.name || (row.people_id ? maskThaiId(row.people_id) : '-');

    return (
      <div key={`m-comm-${row.planid}`} className="card shadow-sm border mb-3 rounded-lg overflow-hidden">
        <div className="card-header bg-light d-flex justify-content-between align-items-center py-2 px-3 border-bottom">
          <div className="d-flex align-items-center">
            <span className="badge badge-info mr-2">#{index + 1}</span>
            <span className="font-weight-bold text-dark">{teacherName}</span>
          </div>
          <StatusBadge status={row.plan_status} short />
        </div>
        <div className="card-body p-3">
          {tInfo.school && (
            <div className="small text-muted mb-1">
              <i className="fa-solid fa-school mr-1 text-secondary"></i> โรงเรียน{tInfo.school}
              {tInfo.standing && ` • ${tInfo.standing}`}
            </div>
          )}
          <h5 className="font-weight-bold text-primary mb-1" style={{ fontSize: '0.95rem' }}>
            {row.subject_name_plan || '-'}
          </h5>
          <div className="small text-muted mb-2">
            {row.subject_name} ({row.subject_code || '-'}) • {lookups.gradeLevel[row.grade_level_id] || ''} • {lookups.teachSubjectShort[row.teach_subject_id] || ''}
            {row.subject_content && ` • หน่วย: ${row.subject_content}`}
          </div>
          <div className="d-flex justify-content-between align-items-center small text-muted pt-2 border-top">
            <span>ปี {row.edu_year}/{row.edu_term}</span>
            <div className="d-flex" style={{ gap: '8px' }}>
              {row.plan_file && (
                <a href={row.plan_file} target="_blank" rel="noreferrer" className="text-danger font-weight-bold">
                  <i className="fa-regular fa-file-pdf mr-1"></i> ดู PDF
                </a>
              )}
              {row.plan_clip && (
                <a href={`https://www.youtube.com/watch?v=${row.plan_clip}`} target="_blank" rel="noreferrer" className="text-danger font-weight-bold ml-2">
                  <i className="fa-brands fa-youtube mr-1"></i> คลิปสอน
                </a>
              )}
            </div>
          </div>
        </div>
        <div className="card-footer bg-white p-2 border-top">
          {scored ? (
            <Link to={`/view_scoring?planid=${row.planid}`} className="btn btn-outline-success btn-block btn-sm font-weight-bold">
              <i className="fa-solid fa-check mr-1"></i> ประเมินแล้ว (ดูผลคะแนน)
            </Link>
          ) : canScore ? (
            <Link to={`/Plan_scoring?committee=${committee}&planid=${row.planid}`} className="btn btn-danger btn-block btn-sm font-weight-bold shadow-sm">
              <i className="fa-solid fa-pen-to-square mr-1"></i> ประเมินแผนและคลิป
            </Link>
          ) : (
            <button type="button" className="btn btn-light border btn-block btn-sm text-muted font-weight-bold" disabled>
              <i className="fa-solid fa-clock mr-1 text-warning"></i> รอครูส่งคลิปการสอน
            </button>
          )}
        </div>
      </div>
    );
  };

  if (loading || profileLoading) {
    return <LoadingSpinner message="กำลังโหลดรายการแผนการสอน..." fullPage={false} />;
  }

  // ─────────────────────────────────────────────
  // RENDER: DIRECTOR VIEW
  // ─────────────────────────────────────────────
  if (isDirector) {
    return (
      <div className="container-fluid py-2">
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
                    <span className="text-muted small fw-semibold text-uppercase">ภาระงานในฐานะกรรมการ</span>
                    <h2 className="fw-bold my-1 text-primary">{committeePlans.length}</h2>
                    <span className="badge badge-primary">ที่ได้รับมอบหมาย</span>
                  </div>
                  <div className="rounded-circle p-3" style={{ background: '#dbeafe' }}>
                    <i className="fa-solid fa-clipboard-check fa-2x text-primary"></i>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Director Table / Card Main Body */}
        <div className="card shadow-sm border-0" style={{ borderRadius: '12px' }}>
          <div className="card-header bg-white border-bottom py-3">
            <div className="row align-items-center g-2">
              <div className="col-lg-6 col-12">
                <ul className="nav nav-pills" role="tablist">
                  <li className="nav-item">
                    <button
                      type="button"
                      className={`nav-link font-weight-bold mr-1 ${activeTab === 'pending_director' ? 'active' : ''}`}
                      onClick={() => setActiveTab('pending_director')}
                    >
                      รอตรวจอนุมัติ ({filteredPendingDirector.length})
                    </button>
                  </li>
                  <li className="nav-item">
                    <button
                      type="button"
                      className={`nav-link font-weight-bold mr-1 ${activeTab === 'approved_director' ? 'active' : ''}`}
                      onClick={() => setActiveTab('approved_director')}
                    >
                      อนุมัติแล้ว ({filteredApprovedDirector.length})
                    </button>
                  </li>
                  <li className="nav-item">
                    <button
                      type="button"
                      className={`nav-link font-weight-bold ${activeTab === 'committee' ? 'active' : ''}`}
                      onClick={() => setActiveTab('committee')}
                    >
                      ภาระงานกรรมการ ({filteredCommittee.length})
                    </button>
                  </li>
                </ul>
              </div>
              <div className="col-lg-6 col-12 d-flex justify-content-lg-end align-items-center gap-2">
                <div className="input-group input-group-sm" style={{ maxWidth: '280px' }}>
                  <div className="input-group-prepend">
                    <span className="input-group-text bg-white"><i className="fa-solid fa-search text-muted"></i></span>
                  </div>
                  <input
                    type="text"
                    className="form-control"
                    placeholder="ค้นหาชื่อครู, รหัสวิชา, แผน..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
                </div>
              </div>
            </div>
          </div>

          <div className="card-body p-0">
            {activeTab === 'pending_director' && (
              <div className="table-responsive">
                <table className="table table-hover align-middle mb-0">
                  <thead className="thead-light">
                    <tr>
                      <th style={{ width: '45px' }} className="text-center">ที่</th>
                      <th>ครูผู้จัดทำแผน</th>
                      <th>กลุ่มสาระฯ</th>
                      <th>ระดับชั้น</th>
                      <th>วิชา (รหัสวิชา)</th>
                      <th>ชื่อแผนการจัดการเรียนรู้</th>
                      <th className="text-center">ปี/เทอม</th>
                      <th className="text-center">PDF</th>
                      <th className="text-center">ดำเนินการ</th>
                      <th className="text-center">สถานะ</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredPendingDirector.length === 0 ? (
                      <tr>
                        <td colSpan="10" className="py-5">
                          <EmptyState message={searchTerm ? 'ไม่พบแผนที่ตรงกับการค้นหา' : 'ไม่มีแผนที่รอตรวจอนุมัติในขณะนี้'} fullPage={false} />
                        </td>
                      </tr>
                    ) : (
                      filteredPendingDirector.map((row, idx) => {
                        const tInfo = teacherMap[row.people_id] || {};
                        const teacherName = tInfo.name || maskThaiId(row.people_id);

                        return (
                          <tr key={row.planid}>
                            <td className="text-center font-weight-bold text-muted">{idx + 1}</td>
                            <td>
                              <div className="font-weight-bold text-dark">{teacherName}</div>
                              {tInfo.standing && <small className="text-muted d-block">{tInfo.standing}</small>}
                            </td>
                            <td>
                              <span className="badge badge-light border">
                                {lookups.teachSubjectShort[row.teach_subject_id] || '-'}
                              </span>
                            </td>
                            <td>{lookups.gradeLevel[row.grade_level_id] || '-'}</td>
                            <td>
                              <strong>{row.subject_name}</strong>
                              {row.subject_code && <small className="text-muted d-block">({row.subject_code})</small>}
                            </td>
                            <td>
                              <div className="font-weight-bold text-primary">{row.subject_name_plan || '-'}</div>
                              {row.subject_content && <small className="text-muted d-block">หน่วย: {row.subject_content}</small>}
                            </td>
                            <td className="text-center small">{row.edu_year}/{row.edu_term}</td>
                            <td className="text-center">
                              {row.plan_file ? (
                                <a href={row.plan_file} target="_blank" rel="noreferrer" className="btn btn-xs btn-outline-danger" title="ดู PDF">
                                  <i className="fa-regular fa-file-pdf"></i>
                                </a>
                              ) : '-'}
                            </td>
                            <td className="text-center">
                              <Link
                                to={`/appointment?planid=${row.planid}&from=Plan_Check`}
                                className="btn btn-sm btn-primary font-weight-bold shadow-sm"
                              >
                                <i className="fa-solid fa-file-signature mr-1"></i> ตรวจ/อนุมัติ
                              </Link>
                            </td>
                            <td className="text-center">
                              <StatusBadge status={row.plan_status} short />
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            )}

            {activeTab === 'approved_director' && (
              <div className="table-responsive">
                <table className="table table-hover align-middle mb-0">
                  <thead className="thead-light">
                    <tr>
                      <th style={{ width: '45px' }} className="text-center">ที่</th>
                      <th>ครูผู้จัดทำแผน</th>
                      <th>วิชา (รหัสวิชา)</th>
                      <th>ชื่อแผนการจัดการเรียนรู้</th>
                      <th className="text-center">กรรมการ</th>
                      <th className="text-center">คลิป</th>
                      <th className="text-center">ดำเนินการ</th>
                      <th className="text-center">สถานะ</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredApprovedDirector.length === 0 ? (
                      <tr>
                        <td colSpan="8" className="py-5">
                          <EmptyState message="ยังไม่มีแผนที่ผ่านการอนุมัติในเงื่อนไขนี้" fullPage={false} />
                        </td>
                      </tr>
                    ) : (
                      filteredApprovedDirector.map((row, idx) => {
                        const tInfo = teacherMap[row.people_id] || {};
                        const comms = [row.committee1, row.committee2, row.committee3, row.committee4, row.committee5].filter(Boolean);

                        return (
                          <tr key={row.planid}>
                            <td className="text-center font-weight-bold text-muted">{idx + 1}</td>
                            <td>
                              <div className="font-weight-bold text-dark">{tInfo.name || maskThaiId(row.people_id)}</div>
                              {tInfo.standing && <small className="text-muted d-block">{tInfo.standing}</small>}
                            </td>
                            <td>{row.subject_name} ({row.subject_code || '-'})</td>
                            <td>{row.subject_name_plan || '-'}</td>
                            <td className="text-center">
                              <span className="badge badge-light border">{comms.length} ท่าน</span>
                            </td>
                            <td className="text-center">
                              {row.plan_clip ? (
                                <a href={`https://www.youtube.com/watch?v=${row.plan_clip}`} target="_blank" rel="noreferrer" className="text-danger">
                                  <i className="fa-brands fa-youtube fa-lg"></i>
                                </a>
                              ) : (
                                <span className="small text-muted">รอส่ง</span>
                              )}
                            </td>
                            <td className="text-center">
                              <div className="btn-group btn-group-sm">
                                <Link to={`/appointment?planid=${row.planid}&from=Plan_Check`} className="btn btn-outline-warning" title="แก้ไขกรรมการ">
                                  <i className="fa-solid fa-user-pen"></i> กรรมการ
                                </Link>
                                <Link to={`/view_scoring?planid=${row.planid}`} className="btn btn-outline-info" title="ดูผลคะแนน">
                                  <i className="fa-solid fa-chart-line"></i> คะแนน
                                </Link>
                              </div>
                            </td>
                            <td className="text-center">
                              <StatusBadge status={row.plan_status} short />
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            )}

            {activeTab === 'committee' && (
              <div className="table-responsive">
                <table className="table table-hover align-middle mb-0">
                  <thead className="thead-light">
                    <tr>
                      <th style={{ width: '45px' }} className="text-center">ที่</th>
                      <th>ครูผู้สอน / โรงเรียน</th>
                      <th>วิชา (รหัสวิชา)</th>
                      <th>ชื่อแผนการจัดการเรียนรู้</th>
                      <th className="text-center">PDF</th>
                      <th className="text-center">คลิปสอน</th>
                      <th className="text-center">การประเมิน</th>
                      <th className="text-center">สถานะ</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredCommittee.length === 0 ? (
                      <tr>
                        <td colSpan="8" className="py-5">
                          <EmptyState message="ไม่มีแผนการสอนที่ได้รับมอบหมายให้ประเมินในฐานะกรรมการ" fullPage={false} />
                        </td>
                      </tr>
                    ) : (
                      filteredCommittee.map((row, idx) => {
                        const tInfo = teacherMap[row.people_id] || {};
                        const scored = scoreSet.has(String(row.planid));
                        const canScore = Number(row.plan_status) >= 5;

                        return (
                          <tr key={row.planid}>
                            <td className="text-center font-weight-bold text-muted">{idx + 1}</td>
                            <td>
                              <div className="font-weight-bold text-dark">{tInfo.name || maskThaiId(row.people_id)}</div>
                              {tInfo.school && <small className="text-muted d-block">รร.{tInfo.school} {tInfo.standing ? `(${tInfo.standing})` : ''}</small>}
                            </td>
                            <td>{row.subject_name} ({row.subject_code || '-'})</td>
                            <td>{row.subject_name_plan || '-'}</td>
                            <td className="text-center">
                              {row.plan_file ? (
                                <a href={row.plan_file} target="_blank" rel="noreferrer" className="btn btn-xs btn-outline-danger" title="ดู PDF">
                                  <i className="fa-regular fa-file-pdf"></i>
                                </a>
                              ) : '-'}
                            </td>
                            <td className="text-center">
                              {row.plan_clip ? (
                                <a href={`https://www.youtube.com/watch?v=${row.plan_clip}`} target="_blank" rel="noreferrer" className="text-danger" title="คลิปการสอน">
                                  <i className="fa-brands fa-youtube fa-lg"></i>
                                </a>
                              ) : (
                                <span className="small text-muted">-</span>
                              )}
                            </td>
                            <td className="text-center">
                              {scored ? (
                                <Link to={`/view_scoring?planid=${row.planid}`} className="btn btn-xs btn-outline-success font-weight-bold">
                                  <i className="fa-solid fa-check mr-1"></i> ประเมินแล้ว
                                </Link>
                              ) : canScore ? (
                                <Link to={`/Plan_scoring?planid=${row.planid}`} className="btn btn-xs btn-danger font-weight-bold shadow-sm">
                                  <i className="fa-solid fa-pen-to-square mr-1"></i> ประเมิน
                                </Link>
                              ) : (
                                <span className="badge badge-warning text-dark px-2 py-1">
                                  <i className="fa-solid fa-clock mr-1"></i> รอครูส่งคลิป
                                </span>
                              )}
                            </td>
                            <td className="text-center">
                              <StatusBadge status={row.plan_status} short />
                            </td>
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
  // RENDER: COMMITTEE / SUPERVISOR VIEW
  // ─────────────────────────────────────────────
  return (
    <div className="container-fluid py-2">
      <div className="d-flex flex-wrap justify-content-between align-items-center mb-3">
        <div>
          <h3 className="fw-bold mb-1" style={{ color: '#1f2937' }}>
            <i className="fa-solid fa-list-check text-primary mr-2"></i>
            รายการตรวจและประเมินแผนการสอน
          </h3>
          <p className="text-muted small mb-0">
            ภาระงานการนิเทศ ติดตาม และประเมินผลการจัดการเรียนรู้ตามที่ได้รับมอบหมาย
          </p>
        </div>
      </div>

      {/* Committee KPI Strip */}
      <div className="row g-2 mb-3">
        <div className="col-md-3 col-6">
          <div className="p-3 bg-white rounded shadow-sm border text-center">
            <div className="text-muted small">ได้รับมอบหมายทั้งหมด</div>
            <div className="fs-4 fw-bold text-primary">{committeeKPI.total} <span className="small text-muted font-weight-normal">แผน</span></div>
          </div>
        </div>
        <div className="col-md-3 col-6">
          <div className="p-3 bg-white rounded shadow-sm border text-center">
            <div className="text-muted small">พร้อมประเมิน (มีคลิปแล้ว)</div>
            <div className="fs-4 fw-bold text-danger">{committeeKPI.ready} <span className="small text-muted font-weight-normal">แผน</span></div>
          </div>
        </div>
        <div className="col-md-3 col-6">
          <div className="p-3 bg-white rounded shadow-sm border text-center">
            <div className="text-muted small">รอครูจัดส่งคลิปการสอน</div>
            <div className="fs-4 fw-bold text-warning">{committeeKPI.waitingClip} <span className="small text-muted font-weight-normal">แผน</span></div>
          </div>
        </div>
        <div className="col-md-3 col-6">
          <div className="p-3 bg-white rounded shadow-sm border text-center">
            <div className="text-muted small">ประเมินเสร็จสิ้นแล้ว</div>
            <div className="fs-4 fw-bold text-success">{committeeKPI.scored} <span className="small text-muted font-weight-normal">แผน</span></div>
          </div>
        </div>
      </div>

      <div className="card shadow-sm border-0" style={{ borderRadius: '12px' }}>
        <div className="card-header bg-white border-bottom py-3 d-flex justify-content-between align-items-center flex-wrap gap-2">
          <h5 className="font-weight-bold text-dark m-0">
            <i className="fa-solid fa-clipboard-user text-primary mr-2"></i>
            รายการแผนที่ได้รับมอบหมาย ({filteredCommittee.length} แผน)
          </h5>
          <div className="d-flex align-items-center gap-2">
            <div className="input-group input-group-sm" style={{ width: '240px' }}>
              <div className="input-group-prepend">
                <span className="input-group-text bg-white"><i className="fa-solid fa-search text-muted"></i></span>
              </div>
              <input
                type="text"
                className="form-control"
                placeholder="ค้นหาชื่อครู, โรงเรียน, วิชา..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
          </div>
        </div>

        <div className="card-body p-0">
          <div className="table-responsive">
            <table className="table table-hover align-middle mb-0">
              <thead className="thead-light">
                <tr>
                  <th style={{ width: '45px' }} className="text-center">ที่</th>
                  <th>ครูผู้สอน / โรงเรียน</th>
                  <th>กลุ่มสาระฯ</th>
                  <th>วิชา (รหัสวิชา)</th>
                  <th>ชื่อแผนการจัดการเรียนรู้</th>
                  <th className="text-center">ปี/เทอม</th>
                  <th className="text-center">PDF</th>
                  <th className="text-center">คลิปสอน</th>
                  <th className="text-center">การประเมิน</th>
                  <th className="text-center">สถานะ</th>
                </tr>
              </thead>
              <tbody>
                {filteredCommittee.length === 0 ? (
                  <tr>
                    <td colSpan="10" className="py-5">
                      <EmptyState message={searchTerm ? 'ไม่พบแผนการสอนที่ตรงกับการค้นหา' : 'ไม่มีแผนการสอนที่ได้รับมอบหมายให้ประเมินในขณะนี้'} fullPage={false} />
                    </td>
                  </tr>
                ) : (
                  filteredCommittee.map((row, idx) => {
                    const tInfo = teacherMap[row.people_id] || {};
                    const scored = scoreSet.has(String(row.planid));
                    const canScore = Number(row.plan_status) >= 5;

                    return (
                      <tr key={row.planid}>
                        <td className="text-center font-weight-bold text-muted">{idx + 1}</td>
                        <td>
                          <div className="font-weight-bold text-dark">{tInfo.name || maskThaiId(row.people_id)}</div>
                          {tInfo.school && (
                            <small className="text-muted d-block">
                              รร.{tInfo.school} {tInfo.standing ? `(${tInfo.standing})` : ''}
                            </small>
                          )}
                        </td>
                        <td>
                          <span className="badge badge-light border">
                            {lookups.teachSubjectShort[row.teach_subject_id] || '-'}
                          </span>
                        </td>
                        <td>{row.subject_name} ({row.subject_code || '-'})</td>
                        <td>{row.subject_name_plan || '-'}</td>
                        <td className="text-center small">{row.edu_year}/{row.edu_term}</td>
                        <td className="text-center">
                          {row.plan_file ? (
                            <a href={row.plan_file} target="_blank" rel="noreferrer" className="btn btn-xs btn-outline-danger" title="ดูไฟล์แผน PDF">
                              <i className="fa-regular fa-file-pdf"></i>
                            </a>
                          ) : '-'}
                        </td>
                        <td className="text-center">
                          {row.plan_clip ? (
                            <a href={`https://www.youtube.com/watch?v=${row.plan_clip}`} target="_blank" rel="noreferrer" className="text-danger" title="เปิดดูคลิปการสอน">
                              <i className="fa-brands fa-youtube fa-lg"></i>
                            </a>
                          ) : (
                            <span className="small text-muted">-</span>
                          )}
                        </td>
                        <td className="text-center">
                          {scored ? (
                            <Link to={`/view_scoring?planid=${row.planid}`} className="btn btn-xs btn-outline-success font-weight-bold">
                              <i className="fa-solid fa-check mr-1"></i> ประเมินแล้ว
                            </Link>
                          ) : canScore ? (
                            <Link to={`/Plan_scoring?planid=${row.planid}`} className="btn btn-xs btn-danger font-weight-bold shadow-sm">
                              <i className="fa-solid fa-pen-to-square mr-1"></i> ประเมิน
                            </Link>
                          ) : (
                            <span className="badge badge-warning text-dark px-2 py-1">
                              <i className="fa-solid fa-clock mr-1"></i> รอครูส่งคลิป
                            </span>
                          )}
                        </td>
                        <td className="text-center">
                          <StatusBadge status={row.plan_status} short />
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PlanCheck;