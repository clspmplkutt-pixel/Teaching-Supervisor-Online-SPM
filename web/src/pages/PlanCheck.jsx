import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '../supabaseClient';
import { useUserProfile } from '../hooks/useUserProfile';

const PlanCheck = () => {
  const { profile, loading: profileLoading } = useUserProfile();
  const [loading, setLoading] = useState(true);
  const [rows, setRows] = useState([]);
  const [lookups, setLookups] = useState({ teachSubjectShort: {}, gradeLevel: {}, status: {} });
  const [scoreSet, setScoreSet] = useState(new Set());

  useEffect(() => {
    let mounted = true;

    const loadData = async () => {
      const userId = profile?.people_id || '';
      if (!userId) {
        setLoading(false);
        return;
      }
      setLoading(true);
      try {
        const [subjectRes, gradeRes, statusRes] = await Promise.all([
          supabase.from('tbl_system_Teach_Subject').select('teach_subject_id, teach_subject_1, teach_subject'),
          supabase.from('tbl_system_GradeLevel').select('grade_level_id, grade_level_name'),
          supabase.from('tbl_sendplan_status').select('id, status_name'),
        ]);

        const teachSubjectShortMap = {};
        subjectRes.data?.forEach((s) => { teachSubjectShortMap[s.teach_subject_id] = s.teach_subject_1 || s.teach_subject; });
        const gradeMap = {};
        gradeRes.data?.forEach((g) => { gradeMap[g.grade_level_id] = g.grade_level_name; });
        const statusMap = {};
        statusRes.data?.forEach((s) => { statusMap[String(s.id)] = s.status_name; });

        const { data: plans } = await supabase
          .from('tbl_sendplan')
          .select('*')
          .or(`committee1.eq.${userId},committee2.eq.${userId},committee3.eq.${userId},committee4.eq.${userId},committee5.eq.${userId}`);

        const planIds = (plans || []).map((p) => String(p.planid));
        const { data: scores } = await supabase
          .from('tbl_sendplan_score')
          .select('planid, supervision')
          .eq('supervision', userId)
          .in('planid', planIds);

        const scoredPlanIds = new Set();
        scores?.forEach((s) => scoredPlanIds.add(String(s.planid)));

        if (mounted) {
          setLookups({ teachSubjectShort: teachSubjectShortMap, gradeLevel: gradeMap, status: statusMap });
          setRows(plans || []);
          setScoreSet(scoredPlanIds);
        }
      } catch (err) {
        console.error('PlanCheck load error:', err);
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

  const userId = profile?.people_id || '';

  return (
    <div className="row">
      <div className="col-12">
        <div className="card card-success">
          <div className="card-header">
            <h3 className="card-title"><i className="fa-solid fa-list-check"></i> รายการตรวจแผนการสอน</h3>
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
                  {rows.length === 0 && (
                    <tr>
                      <td colSpan="12">
                        <h4 className="text-center text-danger">ยังไม่ได้ส่งแผนการสอน</h4>
                      </td>
                    </tr>
                  )}
                  {rows.map((row, index) => {
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
                            <a href={row.plan_file} title="แผน" target="_blank" rel="noreferrer"><i className="fa-regular fa-file-pdf fa-lg"></i></a>
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
                              <Link to={`/view_scoring?planid=${row.planid}`}>ดูผลการประเมิน</Link>
                            </span>
                          ) : (
                            <span className="text-danger">
                              <Link to={`/Plan_scoring?committee=${committee}&planid=${row.planid}`}>ยังไม่ประเมิน</Link>
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
