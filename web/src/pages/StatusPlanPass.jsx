import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '../supabaseClient';
import { useUserProfile } from '../hooks/useUserProfile';

const StatusPlanPass = () => {
  const { profile, loading: profileLoading } = useUserProfile();
  const [loading, setLoading] = useState(true);
  const [rows, setRows] = useState([]);
  const [lookups, setLookups] = useState({
    teachSubjectShort: {},
    gradeLevel: {},
  });

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
          .in('plan_status', ['2', '3']);

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

  if (loading || profileLoading) {
    return (
      <div className="text-center p-4">
        <div className="spinner-border text-primary" role="status"></div>
        <p className="mt-2">กำลังโหลดข้อมูล...</p>
      </div>
    );
  }

  return (
    <div className="row">
      <div className="col-12">
        <div className="card card-success">
          <div className="card-header">
            <h3 className="card-title"><i className="fa-solid fa-school-circle-check"></i> สถานะแผนการส่ง</h3>
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
                    <th>ไฟล์แผนการสอน</th>
                    <th>ผลการพิจารณา</th>
                    <th>สถานะ</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.length === 0 && (
                    <tr>
                      <td colSpan="11">
                        <h4 className="text-center text-danger">ยังไม่มีครูส่งแผนการจัดการเรียนรู้</h4>
                      </td>
                    </tr>
                  )}
                  {rows.map((row) => (
                    <tr key={row.planid}>
                      <td className="text-center">{row.planid}</td>
                      <td>{lookups.teachSubjectShort[row.teach_subject_id] || ''}</td>
                      <td>{lookups.gradeLevel[row.grade_level_id] || ''}</td>
                      <td>{row.subject_name} ({row.subject_code})</td>
                      <td>{row.subject_content}</td>
                      <td>{row.subject_name_plan}</td>
                      <td>{row.edu_year}/{row.edu_term} (ปีงบประมาณ {row.budget_year})</td>
                      <td>{row.plan_senddate}</td>
                      <td className="text-center">
                        {row.plan_file && (
                          <a href={row.plan_file} target="_blank" rel="noreferrer">
                            <i className="fa-regular fa-file-pdf fa-2xl"></i>
                          </a>
                        )}
                      </td>
                      <td>
                        {String(row.plan_status) === '2' && <span className="badge badge-success">ผ่าน</span>}
                        {String(row.plan_status) === '3' && <span className="badge badge-danger">ไม่ผ่าน</span>}
                      </td>
                      <td>
                        <Link to={`/view_appointment?planid=${row.planid}`} className="btn btn-info">
                          <i className="fa-solid fa-circle-info"></i> ดูข้อมูล
                        </Link>
                      </td>
                    </tr>
                  ))}
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
