import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '../supabaseClient';
import { useUserProfile } from '../hooks/useUserProfile';
import LoadingSpinner from '../components/LoadingSpinner';
import EmptyState from '../components/EmptyState';
import StatusBadge from '../components/StatusBadge';
import { generateDirectorToCommitteeMessage, showLineShareDialog } from '../utils/lineNotifyHelper';

const StatusPlanPass = () => {
  const { profile, loading: profileLoading } = useUserProfile();
  const [loading, setLoading] = useState(true);
  const [rows, setRows] = useState([]);
  const [teacherMap, setTeacherMap] = useState({});
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL'); // 'ALL' | 'approved' | 'evaluating' | 'completed' | 'rejected'
  const [selectedSchool, setSelectedSchool] = useState('');
  const [selectedYear, setSelectedYear] = useState('');
  const [viewMode, setViewMode] = useState('auto'); // 'auto', 'card', 'table'
  const [schools, setSchools] = useState([]);
  const [lookups, setLookups] = useState({
    teachSubjectShort: {},
    gradeLevel: {},
    prefix: {},
    school: {},
  });

  const role = profile?.level || profile?.level_id || '';
  const isDistrictRole = ['supervisor', 'supervision', 'chairman', 'districdirector', 'admin', 'root'].includes(role);
  const isDirector = role === 'directorschool';
  const isTeacher = role === 'teacher';

  useEffect(() => {
    let mounted = true;

    const loadData = async () => {
      setLoading(true);
      try {
        const [subjectRes, gradeRes, prefixRes, schoolRes] = await Promise.all([
          supabase.from('tbl_system_Teach_Subject').select('teach_subject_id, teach_subject_1, teach_subject'),
          supabase.from('tbl_system_GradeLevel').select('grade_level_id, grade_level_name'),
          supabase.from('tbl_system_prefix').select('prefix_id, prefix'),
          supabase.from('tbl_school').select('school_id, school_name').order('school_name', { ascending: true }),
        ]);

        const teachSubjectShortMap = {};
        subjectRes.data?.forEach((s) => {
          teachSubjectShortMap[s.teach_subject_id] = s.teach_subject_1 || s.teach_subject;
        });

        const gradeMap = {};
        gradeRes.data?.forEach((g) => { gradeMap[g.grade_level_id] = g.grade_level_name; });

        const prefixMap = {};
        prefixRes.data?.forEach((p) => { prefixMap[p.prefix_id] = p.prefix; });

        const schoolMap = {};
        schoolRes.data?.forEach((s) => { schoolMap[s.school_id] = s.school_name; });

        // Query plans
        let query = supabase.from('tbl_sendplan').select('*');

        if (isTeacher) {
          // Teachers see their own passed/active plans, or completed showcase plans
          query = query.or(`people_id.eq.${profile?.people_id || ''},plan_status.eq.7`);
        } else if (isDirector && profile?.school) {
          // School directors see their school's plans
          query = query.eq('school_code', profile.school).in('plan_status', ['2', '3', '5', '6', '7']);
        } else {
          // District admins / supervisors see all passed & completed plans
          query = query.in('plan_status', ['2', '5', '6', '7']);
        }

        query = query.order('planid', { ascending: false });
        const { data: plans, error: planError } = await query;
        if (planError) throw planError;

        // ดึงชื่อครูผู้สอน
        const teacherIds = Array.from(new Set((plans || []).map((p) => p.people_id).filter(Boolean)));
        let tMap = {};
        if (teacherIds.length > 0) {
          const { data: teachers } = await supabase
            .from('tbl_Users')
            .select('people_id, prefix, name, lastname')
            .in('people_id', teacherIds);
          (teachers || []).forEach((t) => {
            tMap[t.people_id] = `${prefixMap[t.prefix] || ''}${t.name} ${t.lastname}`.trim();
          });
        }

        if (mounted) {
          setLookups({
            teachSubjectShort: teachSubjectShortMap,
            gradeLevel: gradeMap,
            prefix: prefixMap,
            school: schoolMap,
          });
          setSchools(schoolRes.data || []);
          setTeacherMap(tMap);
          setRows(plans || []);
        }
      } catch (err) {
        console.error('StatusPlanPass load error:', err);
      } finally {
        if (mounted) setLoading(false);
      }
    };

    if (!profileLoading) loadData();

    return () => { mounted = false; };
  }, [profile, profileLoading, isTeacher, isDirector]);

  // Extract unique edu_years for filtering
  const availableYears = useMemo(() => {
    const set = new Set();
    rows.forEach((r) => { if (r.edu_year) set.add(String(r.edu_year)); });
    return Array.from(set).sort((a, b) => b.localeCompare(a));
  }, [rows]);

  // Counts by category
  const counts = useMemo(() => {
    const c = { ALL: rows.length, approved: 0, evaluating: 0, completed: 0, rejected: 0 };
    rows.forEach((r) => {
      const s = String(r.plan_status);
      if (s === '2') c.approved++;
      else if (s === '5' || s === '6') c.evaluating++;
      else if (s === '7') c.completed++;
      else if (s === '3') c.rejected++;
    });
    return c;
  }, [rows]);

  // Search & Status filter
  const filteredRows = useMemo(() => {
    let result = rows;

    // Filter by school (for district users)
    if (selectedSchool) {
      result = result.filter((r) => String(r.school_code) === String(selectedSchool));
    }

    // Filter by year
    if (selectedYear) {
      result = result.filter((r) => String(r.edu_year) === String(selectedYear));
    }

    // Filter by status category
    if (statusFilter === 'approved') {
      result = result.filter((r) => String(r.plan_status) === '2');
    } else if (statusFilter === 'evaluating') {
      result = result.filter((r) => ['5', '6'].includes(String(r.plan_status)));
    } else if (statusFilter === 'completed') {
      result = result.filter((r) => String(r.plan_status) === '7');
    } else if (statusFilter === 'rejected') {
      result = result.filter((r) => String(r.plan_status) === '3');
    }

    if (!searchTerm.trim()) return result;
    const term = searchTerm.toLowerCase();
    return result.filter((r) => {
      const subject = (r.subject_name || '').toLowerCase();
      const code = (r.subject_code || '').toLowerCase();
      const planName = (r.subject_name_plan || '').toLowerCase();
      const content = (r.subject_content || '').toLowerCase();
      const year = String(r.edu_year || '');
      const teacherName = (teacherMap[r.people_id] || '').toLowerCase();
      const schoolName = (lookups.school[r.school_code] || '').toLowerCase();
      return (
        subject.includes(term) ||
        code.includes(term) ||
        planName.includes(term) ||
        content.includes(term) ||
        year.includes(term) ||
        teacherName.includes(term) ||
        schoolName.includes(term)
      );
    });
  }, [rows, statusFilter, selectedSchool, selectedYear, searchTerm, teacherMap, lookups.school]);

  if (loading || profileLoading) {
    return <LoadingSpinner text="กำลังโหลดข้อมูลแผนการสอนที่ผ่านการอนุมัติ..." />;
  }

  const handleShareLineToCommittee = (row) => {
    const directorPrefix = profile?.prefix || '';
    const directorName = `${directorPrefix}${profile?.name || ''} ${profile?.lastname || ''}`.trim();
    const schoolName = profile?.school_name || lookups.school[row.school_code] || '';
    const teacherName = teacherMap[row.people_id] || '';

    const lineMsg = generateDirectorToCommitteeMessage({
      directorName,
      schoolName,
      teacherName,
      subjectName: row.subject_name,
      subjectCode: row.subject_code,
      planName: row.subject_name_plan,
      planId: row.planid,
    });

    showLineShareDialog({
      title: 'ส่งข้อความแจ้งเตือนกรรมการผ่าน LINE',
      subtitle: `แจ้งเตือนคณะกรรมการนิเทศสำหรับแผน #${row.planid} (${row.subject_name})`,
      messageText: lineMsg,
    });
  };

  const renderPassedPlanCard = (row) => {
    const teacherName = teacherMap[row.people_id] || 'ไม่ระบุ';
    const isCompleted = String(row.plan_status) === '7';
    const isApprovedWaitClip = String(row.plan_status) === '2';
    const schoolTitle = lookups.school[row.school_code] || '';

    return (
      <div
        key={row.planid}
        className="card shadow-sm mb-3"
        style={{
          borderLeft: isCompleted ? '4px solid #059669' : isApprovedWaitClip ? '4px solid #2563eb' : '4px solid #64748b',
          borderRadius: '10px',
          overflow: 'hidden',
        }}
      >
        <div className="card-header bg-white d-flex justify-content-between align-items-center py-2 px-3 border-bottom">
          <div className="d-flex align-items-center flex-wrap" style={{ gap: '6px' }}>
            <span className="badge badge-secondary" style={{ fontSize: '11px' }}>
              #{row.planid}
            </span>
            <span className="font-weight-bold text-dark" style={{ fontSize: '14px' }}>
              {row.subject_name} ({row.subject_code})
            </span>
            {schoolTitle && isDistrictRole && (
              <span className="badge badge-light border text-muted" style={{ fontSize: '11px' }}>
                <i className="fa-solid fa-school mr-1"></i> {schoolTitle}
              </span>
            )}
          </div>
          <div>
            <StatusBadge status={row.plan_status} />
          </div>
        </div>

        <div className="card-body p-3" style={{ fontSize: '13px' }}>
          <div className="mb-2">
            <span className="text-muted d-block" style={{ fontSize: '11px' }}>ชื่อแผนการสอน:</span>
            <span className="font-weight-bold text-primary">{row.subject_name_plan || '-'}</span>
          </div>

          <div className="mb-2">
            <span className="text-muted" style={{ fontSize: '12px' }}>
              <i className="fa-solid fa-chalkboard-user mr-1 text-primary"></i>
              ครูผู้สอน: <strong>{teacherName}</strong>
            </span>
          </div>

          {row.subject_content && (
            <div className="mb-2 text-muted" style={{ fontSize: '12px' }}>
              <strong>หน่วยการเรียนรู้:</strong> {row.subject_content}
            </div>
          )}

          <div className="d-flex flex-wrap text-muted mb-2" style={{ gap: '12px', fontSize: '12px' }}>
            {lookups.teachSubjectShort[row.teach_subject_id] && (
              <div>
                <i className="fa-solid fa-book-open mr-1 text-secondary"></i>
                {lookups.teachSubjectShort[row.teach_subject_id]}
              </div>
            )}
            {lookups.gradeLevel[row.grade_level_id] && (
              <div>
                <i className="fa-solid fa-graduation-cap mr-1 text-secondary"></i>
                {lookups.gradeLevel[row.grade_level_id]}
              </div>
            )}
            <div>
              <i className="fa-regular fa-calendar mr-1 text-secondary"></i>
              ปี {row.edu_year}/{row.edu_term}
            </div>
          </div>

          <div className="d-flex justify-content-between align-items-center pt-2 border-top text-muted" style={{ fontSize: '11px' }}>
            <span>
              <i className="fa-regular fa-clock mr-1"></i>
              วันที่ส่ง: {row.plan_senddate || '-'}
            </span>
            {row.plan_file && (
              <a
                href={row.plan_file}
                target="_blank"
                rel="noreferrer"
                className="btn btn-sm btn-outline-danger py-0 px-2"
                style={{ fontSize: '11px' }}
              >
                <i className="fa-regular fa-file-pdf mr-1"></i> ดูไฟล์ PDF
              </a>
            )}
          </div>
        </div>

        <div className="card-footer bg-light p-2 d-flex justify-content-end flex-wrap" style={{ gap: '6px' }}>
          {isCompleted && (
            <Link
              to={`/view_scoring?planid=${row.planid}`}
              className="btn btn-success btn-sm font-weight-bold"
              style={{ fontSize: '12px' }}
            >
              <i className="fa-solid fa-chart-simple mr-1"></i> ดูคะแนนประเมิน
            </Link>
          )}
          {isDirector && isApprovedWaitClip && (
            <button
              type="button"
              className="btn btn-sm btn-outline-success font-weight-bold"
              style={{ fontSize: '12px' }}
              onClick={() => handleShareLineToCommittee(row)}
              title="ส่งข้อความแจ้งเตือนคณะกรรมการนิเทศผ่าน LINE"
            >
              <i className="fa-brands fa-line mr-1"></i> เตือนกรรมการ
            </button>
          )}
          <Link
            to={`/view_appointment?planid=${row.planid}`}
            className="btn btn-info btn-sm"
            style={{ fontSize: '12px' }}
          >
            <i className="fa-solid fa-circle-info mr-1"></i> ดูข้อมูลการนิเทศ
          </Link>
          {isDirector && isApprovedWaitClip && (
            <Link
              to={`/appointment?planid=${row.planid}&from=statusplan_pass`}
              className="btn btn-warning btn-sm text-dark font-weight-bold"
              style={{ fontSize: '12px' }}
              title="แก้ไขหรือเปลี่ยนรายชื่อคณะกรรมการนิเทศ"
            >
              <i className="fa-solid fa-user-pen mr-1"></i> แก้ไขกรรมการ
            </Link>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="row">
      <div className="col-12">
        <div className="card card-success card-outline">
          <div className="card-header d-flex justify-content-between align-items-center flex-wrap" style={{ gap: '10px' }}>
            <h3 className="card-title m-0">
              <i className="fa-solid fa-school-circle-check mr-2 text-success"></i> สถานะแผนการจัดการเรียนรู้ (ผ่านการพิจารณา)
              <span className="badge badge-success ml-2">{filteredRows.length} แผน</span>
            </h3>

            <div className="card-tools ml-auto d-flex align-items-center flex-wrap" style={{ gap: '8px' }}>
              {/* View Switcher */}
              <div className="btn-group btn-group-sm" role="group" aria-label="สลับมุมมอง">
                <button
                  type="button"
                  className={`btn ${viewMode === 'auto' ? 'btn-success' : 'btn-outline-secondary'}`}
                  onClick={() => setViewMode('auto')}
                  title="ปรับอัตโนมัติตามขนาดหน้าจอ"
                >
                  <i className="fa-solid fa-magic mr-1"></i> อัตโนมัติ
                </button>
                <button
                  type="button"
                  className={`btn ${viewMode === 'card' ? 'btn-success' : 'btn-outline-secondary'}`}
                  onClick={() => setViewMode('card')}
                  title="มุมมองการ์ด (เหมาะกับมือถือ)"
                >
                  <i className="fa-solid fa-table-cells-large mr-1"></i> การ์ด
                </button>
                <button
                  type="button"
                  className={`btn ${viewMode === 'table' ? 'btn-success' : 'btn-outline-secondary'}`}
                  onClick={() => setViewMode('table')}
                  title="มุมมองตาราง (เหมาะกับจอใหญ่)"
                >
                  <i className="fa-solid fa-table mr-1"></i> ตาราง
                </button>
              </div>
            </div>
          </div>

          <div className="card-body">
            {/* Status Filter Tabs */}
            <div className="d-flex flex-wrap gap-2 mb-3 pb-2 border-bottom">
              <button
                type="button"
                className={`btn btn-sm ${statusFilter === 'ALL' ? 'btn-dark font-weight-bold' : 'btn-outline-secondary'}`}
                style={{ borderRadius: '20px' }}
                onClick={() => setStatusFilter('ALL')}
              >
                ทั้งหมด <span className="badge badge-light ml-1">{counts.ALL}</span>
              </button>
              <button
                type="button"
                className={`btn btn-sm ${statusFilter === 'approved' ? 'btn-primary font-weight-bold' : 'btn-outline-primary'}`}
                style={{ borderRadius: '20px' }}
                onClick={() => setStatusFilter('approved')}
              >
                อนุมัติแล้ว • รอคลิป <span className="badge badge-light ml-1">{counts.approved}</span>
              </button>
              <button
                type="button"
                className={`btn btn-sm ${statusFilter === 'evaluating' ? 'btn-info font-weight-bold' : 'btn-outline-info'}`}
                style={{ borderRadius: '20px' }}
                onClick={() => setStatusFilter('evaluating')}
              >
                ส่งคลิปแล้ว • กำลังประเมิน <span className="badge badge-light ml-1">{counts.evaluating}</span>
              </button>
              <button
                type="button"
                className={`btn btn-sm ${statusFilter === 'completed' ? 'btn-success font-weight-bold' : 'btn-outline-success'}`}
                style={{ borderRadius: '20px' }}
                onClick={() => setStatusFilter('completed')}
              >
                ประเมินเสร็จสิ้น <span className="badge badge-light ml-1">{counts.completed}</span>
              </button>
              {counts.rejected > 0 && isDirector && (
                <button
                  type="button"
                  className={`btn btn-sm ${statusFilter === 'rejected' ? 'btn-danger font-weight-bold' : 'btn-outline-danger'}`}
                  style={{ borderRadius: '20px' }}
                  onClick={() => setStatusFilter('rejected')}
                >
                  ไม่อนุมัติ • ให้แก้ไข <span className="badge badge-light ml-1">{counts.rejected}</span>
                </button>
              )}
            </div>

            {/* Filter controls row */}
            <div className="row mb-3">
              <div className="col-12 col-md-5 col-lg-4 mb-2 mb-md-0">
                <div className="input-group input-group-sm">
                  <div className="input-group-prepend">
                    <span className="input-group-text bg-white">
                      <i className="fa-solid fa-magnifying-glass text-muted"></i>
                    </span>
                  </div>
                  <input
                    type="text"
                    className="form-control"
                    placeholder="ค้นหาชื่อครู, โรงเรียน, วิชา, แผน..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
                  {searchTerm && (
                    <div className="input-group-append">
                      <button
                        className="btn btn-outline-secondary"
                        type="button"
                        onClick={() => setSearchTerm('')}
                        title="ล้างคำค้นหา"
                      >
                        <i className="fa-solid fa-xmark"></i>
                      </button>
                    </div>
                  )}
                </div>
              </div>

              {/* School Filter for District Roles */}
              {isDistrictRole && (
                <div className="col-12 col-md-4 col-lg-3 mb-2 mb-md-0">
                  <select
                    className="form-control form-control-sm"
                    value={selectedSchool}
                    onChange={(e) => setSelectedSchool(e.target.value)}
                  >
                    <option value="">ทุกโรงเรียนในสังกัด</option>
                    {schools.map((s) => (
                      <option key={s.school_id} value={s.school_id}>
                        {s.school_name}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {/* Year Filter */}
              <div className="col-12 col-md-3 col-lg-2">
                <select
                  className="form-control form-control-sm"
                  value={selectedYear}
                  onChange={(e) => setSelectedYear(e.target.value)}
                >
                  <option value="">ทุกปีการศึกษา</option>
                  {availableYears.map((y) => (
                    <option key={y} value={y}>
                      ปีการศึกษา {y}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Mobile Card View */}
            <div className={viewMode === 'card' ? 'd-block' : viewMode === 'table' ? 'd-none' : 'd-block d-md-none'}>
              {filteredRows.length === 0 ? (
                <EmptyState
                  message={searchTerm ? 'ไม่พบแผนการสอนที่ตรงกับคำค้นหา' : 'ยังไม่มีแผนการสอนในหมวดหมู่นี้'}
                  fullPage={false}
                />
              ) : (
                filteredRows.map((row) => renderPassedPlanCard(row))
              )}
            </div>

            {/* Desktop Table View */}
            <div className={`table-responsive ${viewMode === 'table' ? 'd-block' : viewMode === 'card' ? 'd-none' : 'd-none d-md-block'}`}>
              <table className="table table-bordered table-hover table-striped" id="data">
                <thead>
                  <tr className="bg-light">
                    <th style={{ width: '50px' }} className="text-center">ที่</th>
                    <th>ครูผู้สอน</th>
                    {isDistrictRole && <th>โรงเรียน</th>}
                    <th>กลุ่มสาระ</th>
                    <th>ระดับชั้น</th>
                    <th>ชื่อวิชา (รหัสวิชา)</th>
                    <th>ชื่อแผนการจัดการเรียนรู้</th>
                    <th>ปี/ภาค</th>
                    <th>วันที่ส่ง</th>
                    <th style={{ width: '60px' }} className="text-center">ไฟล์</th>
                    <th style={{ width: '130px' }} className="text-center">สถานะ</th>
                    <th style={{ width: '190px' }} className="text-center">การจัดการ</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredRows.length === 0 ? (
                    <tr>
                      <td colSpan={isDistrictRole ? 12 : 11} className="text-center py-4 text-muted">
                        <i className="fa-regular fa-folder-open fa-2x mb-2 d-block text-secondary"></i>
                        {searchTerm ? 'ไม่พบข้อมูลที่ตรงกับคำค้นหา' : 'ไม่พบแผนการจัดการเรียนรู้ในเงื่อนไขที่เลือก'}
                      </td>
                    </tr>
                  ) : (
                    filteredRows.map((row, index) => {
                      const teacherName = teacherMap[row.people_id] || 'ไม่ระบุ';
                      const isCompleted = String(row.plan_status) === '7';
                      const isApprovedWaitClip = String(row.plan_status) === '2';
                      const schoolTitle = lookups.school[row.school_code] || '';

                      return (
                        <tr key={row.planid}>
                          <td className="text-center">{index + 1}</td>
                          <td className="font-weight-bold">{teacherName}</td>
                          {isDistrictRole && (
                            <td className="small">{schoolTitle || '-'}</td>
                          )}
                          <td className="small">{lookups.teachSubjectShort[row.teach_subject_id] || '-'}</td>
                          <td className="small">{lookups.gradeLevel[row.grade_level_id] || '-'}</td>
                          <td>
                            <div className="font-weight-bold" style={{ fontSize: '13px' }}>{row.subject_name}</div>
                            <div className="text-muted small">({row.subject_code})</div>
                          </td>
                          <td>
                            <div className="text-primary font-weight-bold" style={{ fontSize: '13px' }}>
                              {row.subject_name_plan}
                            </div>
                            {row.subject_content && (
                              <div className="text-muted small">หน่วย: {row.subject_content}</div>
                            )}
                          </td>
                          <td className="text-center small">{row.edu_year}/{row.edu_term}</td>
                          <td className="small text-muted">{row.plan_senddate || '-'}</td>
                          <td className="text-center">
                            {row.plan_file ? (
                              <a
                                href={row.plan_file}
                                target="_blank"
                                rel="noreferrer"
                                className="btn btn-sm btn-outline-danger py-0 px-2"
                                title="เปิดดูไฟล์แผน (PDF)"
                              >
                                <i className="fa-solid fa-file-pdf"></i>
                              </a>
                            ) : (
                              <span className="text-muted">—</span>
                            )}
                          </td>
                          <td className="text-center">
                            <StatusBadge status={row.plan_status} />
                          </td>
                          <td className="text-center">
                            <div className="d-flex justify-content-center flex-wrap gap-1">
                              {isCompleted && (
                                <Link
                                  to={`/view_scoring?planid=${row.planid}`}
                                  className="btn btn-success btn-sm font-weight-bold"
                                  title="ดูคะแนนผลการประเมิน ว.PA"
                                >
                                  <i className="fa-solid fa-chart-simple"></i>
                                </Link>
                              )}
                              <Link
                                to={`/view_appointment?planid=${row.planid}`}
                                className="btn btn-info btn-sm"
                                title="ดูคำสั่งแต่งตั้งและรายชื่อกรรมการ"
                              >
                                <i className="fa-solid fa-circle-info"></i>
                              </Link>
                              {isDirector && isApprovedWaitClip && (
                                <>
                                  <button
                                    type="button"
                                    className="btn btn-outline-success btn-sm"
                                    onClick={() => handleShareLineToCommittee(row)}
                                    title="ส่งข้อความแจ้งเตือนกรรมการผ่าน LINE"
                                  >
                                    <i className="fa-brands fa-line"></i>
                                  </button>
                                  <Link
                                    to={`/appointment?planid=${row.planid}&from=statusplan_pass`}
                                    className="btn btn-warning btn-sm text-dark font-weight-bold"
                                    title="แก้ไขกรรมการประเมิน"
                                  >
                                    <i className="fa-solid fa-user-pen"></i>
                                  </Link>
                                </>
                              )}
                            </div>
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
    </div>
  );
};

export default StatusPlanPass;
