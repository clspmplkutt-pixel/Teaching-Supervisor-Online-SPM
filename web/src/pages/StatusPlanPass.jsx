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
  const [searchTerm, setSearchTerm] = useState('');
  const [viewMode, setViewMode] = useState('auto'); // 'auto', 'card', 'table'
  const [lookups, setLookups] = useState({
    teachSubjectShort: {},
    gradeLevel: {},
  });

  const isDirector = profile?.level === 'directorschool' || profile?.level_id === 'directorschool';

  useEffect(() => {
    let mounted = true;

    const loadData = async () => {
      if (!profile?.school) {
        setLoading(false);
        return;
      }
      setLoading(true);
      try {
        const [subjectRes, gradeRes] = await Promise.all([
          supabase.from('tbl_system_Teach_Subject').select('teach_subject_id, teach_subject_1, teach_subject'),
          supabase.from('tbl_system_GradeLevel').select('grade_level_id, grade_level_name'),
        ]);

        const teachSubjectShortMap = {};
        subjectRes.data?.forEach((s) => {
          teachSubjectShortMap[s.teach_subject_id] = s.teach_subject_1 || s.teach_subject;
        });

        const gradeMap = {};
        gradeRes.data?.forEach((g) => { gradeMap[g.grade_level_id] = g.grade_level_name; });

        const { data: plans } = await supabase
          .from('tbl_sendplan')
          .select('*')
          .eq('school_code', profile.school)
          .in('plan_status', ['2', '3'])
          .order('planid', { ascending: false });

        if (mounted) {
          setLookups({ teachSubjectShort: teachSubjectShortMap, gradeLevel: gradeMap });
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
  }, [profile, profileLoading]);

  // Search filter
  const filteredRows = useMemo(() => {
    if (!searchTerm.trim()) return rows;
    const term = searchTerm.toLowerCase();
    return rows.filter((r) => {
      const subject = (r.subject_name || '').toLowerCase();
      const code = (r.subject_code || '').toLowerCase();
      const planName = (r.subject_name_plan || '').toLowerCase();
      const content = (r.subject_content || '').toLowerCase();
      const year = String(r.edu_year || '');
      return (
        subject.includes(term) ||
        code.includes(term) ||
        planName.includes(term) ||
        content.includes(term) ||
        year.includes(term)
      );
    });
  }, [rows, searchTerm]);

  if (loading || profileLoading) {
    return <LoadingSpinner text="กำลังโหลดข้อมูลแผนการสอนที่ผ่านการอนุมัติ..." />;
  }

  const handleShareLineToCommittee = (row) => {
    const directorPrefix = profile?.prefix || '';
    const directorName = `${directorPrefix}${profile?.name || ''} ${profile?.lastname || ''}`.trim();
    const schoolName = profile?.school_name || '';

    const lineMsg = generateDirectorToCommitteeMessage({
      directorName,
      schoolName,
      teacherName: '',
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

  const renderPassedPlanCard = (row, index) => {
    return (
      <div
        key={row.planid}
        className="card shadow-sm mb-3"
        style={{
          borderLeft: '4px solid #28a745',
          borderRadius: '8px',
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
              ปี {row.edu_year}/{row.edu_term} (งบฯ {row.budget_year})
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
          {isDirector && String(row.plan_status) === '2' && (
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
          {isDirector && String(row.plan_status) === '2' && (
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
        <div className="card card-success">
          <div className="card-header d-flex justify-content-between align-items-center flex-wrap" style={{ gap: '10px' }}>
            <h3 className="card-title m-0">
              <i className="fa-solid fa-school-circle-check mr-2"></i> สถานะแผนการส่ง (ผ่านการอนุมัติ)
              <span className="badge badge-light ml-2">{filteredRows.length} แผน</span>
            </h3>

            <div className="card-tools ml-auto d-flex align-items-center flex-wrap" style={{ gap: '8px' }}>
              {/* View Switcher */}
              <div className="btn-group btn-group-sm" role="group" aria-label="สลับมุมมอง">
                <button
                  type="button"
                  className={`btn ${viewMode === 'auto' ? 'btn-light' : 'btn-outline-light'}`}
                  onClick={() => setViewMode('auto')}
                  title="ปรับอัตโนมัติตามขนาดหน้าจอ"
                >
                  <i className="fa-solid fa-magic mr-1"></i> อัตโนมัติ
                </button>
                <button
                  type="button"
                  className={`btn ${viewMode === 'card' ? 'btn-light' : 'btn-outline-light'}`}
                  onClick={() => setViewMode('card')}
                  title="มุมมองการ์ด (เหมาะกับมือถือ)"
                >
                  <i className="fa-solid fa-grip-vertical mr-1"></i> การ์ด
                </button>
                <button
                  type="button"
                  className={`btn ${viewMode === 'table' ? 'btn-light' : 'btn-outline-light'}`}
                  onClick={() => setViewMode('table')}
                  title="มุมมองตาราง"
                >
                  <i className="fa-solid fa-table-list mr-1"></i> ตาราง
                </button>
              </div>

              {/* Search box */}
              <div className="input-group input-group-sm" style={{ width: '200px' }}>
                <input
                  type="text"
                  className="form-control"
                  placeholder="ค้นหาวิชา / แผน..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
                <div className="input-group-append">
                  <span className="input-group-text bg-white">
                    <i className="fa-solid fa-magnifying-glass"></i>
                  </span>
                </div>
              </div>
            </div>
          </div>

          <div className="card-body">
            {/* Mobile Card View */}
            <div className={viewMode === 'card' ? 'd-block' : viewMode === 'table' ? 'd-none' : 'd-block d-md-none'}>
              {filteredRows.length === 0 ? (
                <EmptyState
                  message={searchTerm ? 'ไม่พบแผนการสอนที่ตรงกับคำค้นหา' : 'ยังไม่มีแผนการสอนที่ผ่านการอนุมัติ'}
                  fullPage={false}
                />
              ) : (
                filteredRows.map((row, idx) => renderPassedPlanCard(row, idx))
              )}
            </div>

            {/* Desktop Table View */}
            <div className={`table-responsive ${viewMode === 'table' ? 'd-block' : viewMode === 'card' ? 'd-none' : 'd-none d-md-block'}`}>
              <table className="table table-bordered table-hover table-striped" id="data">
                <thead>
                  <tr>
                    <th style={{ width: '60px' }}>ที่</th>
                    <th>กลุ่มสาระ (ย่อ)</th>
                    <th>ระดับชั้น</th>
                    <th>ชื่อวิชา (รหัสวิชา)</th>
                    <th>หน่วยการเรียนรู้</th>
                    <th>ชื่อแผนการสอน</th>
                    <th>ปีการศึกษา/ภาคเรียน (ปีงบประมาณ)</th>
                    <th>วันที่ส่ง</th>
                    <th style={{ width: '80px' }}>ไฟล์แผน</th>
                    <th>ผลการพิจารณา</th>
                    <th style={{ width: '170px' }}>การจัดการ</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredRows.length === 0 ? (
                    <tr>
                      <td colSpan="11" className="py-5">
                        <EmptyState
                          message={searchTerm ? 'ไม่พบแผนการสอนที่ตรงกับคำค้นหา' : 'ยังไม่มีครูส่งแผนการจัดการเรียนรู้ที่ผ่านการอนุมัติ'}
                          fullPage={false}
                        />
                      </td>
                    </tr>
                  ) : (
                    filteredRows.map((row) => (
                      <tr key={row.planid}>
                        <td className="text-center font-weight-bold">{row.planid}</td>
                        <td>{lookups.teachSubjectShort[row.teach_subject_id] || ''}</td>
                        <td>{lookups.gradeLevel[row.grade_level_id] || ''}</td>
                        <td>
                          <strong>{row.subject_name}</strong>
                          <span className="text-muted d-block" style={{ fontSize: '12px' }}>({row.subject_code})</span>
                        </td>
                        <td>{row.subject_content}</td>
                        <td>{row.subject_name_plan}</td>
                        <td>{row.edu_year}/{row.edu_term} <span className="text-muted" style={{ fontSize: '11px' }}>(งบฯ {row.budget_year})</span></td>
                        <td>{row.plan_senddate}</td>
                        <td className="text-center">
                          {row.plan_file && (
                            <a href={row.plan_file} target="_blank" rel="noreferrer" title="เปิดไฟล์แผนการสอน">
                              <i className="fa-regular fa-file-pdf fa-2xl text-danger"></i>
                            </a>
                          )}
                        </td>
                        <td>
                          <StatusBadge status={row.plan_status} />
                        </td>
                        <td>
                          <div className="d-flex align-items-center" style={{ gap: '4px' }}>
                            {isDirector && String(row.plan_status) === '2' && (
                              <button
                                type="button"
                                className="btn btn-outline-success btn-sm font-weight-bold"
                                onClick={() => handleShareLineToCommittee(row)}
                                title="ส่งข้อความแจ้งเตือนคณะกรรมการนิเทศผ่าน LINE"
                              >
                                <i className="fa-brands fa-line text-success"></i> เตือน
                              </button>
                            )}
                            <Link to={`/view_appointment?planid=${row.planid}`} className="btn btn-info btn-sm">
                              <i className="fa-solid fa-circle-info"></i> ดูข้อมูล
                            </Link>
                            {isDirector && String(row.plan_status) === '2' && (
                              <Link
                                to={`/appointment?planid=${row.planid}&from=statusplan_pass`}
                                className="btn btn-warning btn-sm text-dark font-weight-bold"
                                title="แก้ไขหรือเปลี่ยนรายชื่อคณะกรรมการนิเทศ"
                              >
                                <i className="fa-solid fa-user-pen"></i> กรรมการ
                              </Link>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))
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
