import React, { useEffect, useMemo, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { supabase } from '../supabaseClient';
import LoadingSpinner from '../components/LoadingSpinner';
import EmptyState from '../components/EmptyState';

const useQuery = () => {
  const { search } = useLocation();
  return useMemo(() => new URLSearchParams(search), [search]);
};

const explanScore = (score) => {
  if (score >= 90) return 'ดีเด่น';
  if (score >= 80) return 'ดีมาก';
  if (score >= 70) return 'ดี';
  if (score >= 60) return 'พอใช้';
  return 'ต้องปรับปรุง';
};

const scorePassLabel = (score, pass) => {
  if (score >= pass) {
    return (<span><i className="fa-regular fa-square-check"></i> ผ่าน <i className="fa-regular fa-square"></i> ไม่ผ่าน</span>);
  }
  return (<span><i className="fa-regular fa-square"></i> ผ่าน <i className="fa-regular fa-square-check"></i> ไม่ผ่าน</span>);
};

const ViewScoring = () => {
  const query = useQuery();
  const planid = query.get('planid') || '';
  const [loading, setLoading] = useState(true);
  const [plan, setPlan] = useState(null);
  const [teacher, setTeacher] = useState(null);
  const [policySide1, setPolicySide1] = useState([]);
  const [policySide2, setPolicySide2] = useState([]);
  const [scores, setScores] = useState([]);
  const [lookups, setLookups] = useState({
    academic: {},
    teachSubject: {},
    gradeLevel: {},
    competency: {},
    ability21: {},
    desirable: {},
    school: {},
    subjectType: {},
  });

  useEffect(() => {
    let mounted = true;

    const loadData = async () => {
      if (!planid) {
        setLoading(false);
        return;
      }
      setLoading(true);
      try {
        const { data: planData } = await supabase
          .from('tbl_sendplan')
          .select('*')
          .eq('planid', Number(planid))
          .maybeSingle();

        if (!planData) {
          if (mounted) setLoading(false);
          return;
        }

        const { data: teacherData } = await supabase
          .from('tbl_Users')
          .select('*')
          .eq('people_id', planData.people_id)
          .maybeSingle();

        const academicId = teacherData?.academic_id || '';

        const [policy1Res, policy2Res, scoreRes, academicRes, teachSubjectRes, gradeRes, competencyRes, abilityRes, desirableRes, schoolRes, subjectTypeRes] = await Promise.all([
          supabase.from('tbl_policy_number').select('*').eq('academic', academicId).eq('side', '1').order('auto_id', { ascending: true }),
          supabase.from('tbl_policy_number').select('*').eq('academic', academicId).eq('side', '2').order('auto_id', { ascending: true }),
          supabase.from('tbl_sendplan_score').select('planid, policy_id, score_weight, supervision').eq('planid', String(planid)),
          supabase.from('tbl_system_Academic_Standing').select('academic_id, academic_standing'),
          supabase.from('tbl_system_Teach_Subject').select('teach_subject_id, teach_subject'),
          supabase.from('tbl_system_GradeLevel').select('grade_level_id, grade_level_name'),
          supabase.from('tbl_system_Competency').select('competency_id, competency_name'),
          supabase.from('tbl_ability21').select('ability21_id, ability21_name_th'),
          supabase.from('tbl_system_Desirable').select('desirable_id, desirable_name'),
          supabase.from('tbl_school').select('school_id, school_name'),
          supabase.from('tbl_system_SubjectType').select('subjecttype_id, subjecttype_name'),
        ]);

        const academicMap = {};
        academicRes.data?.forEach((a) => { academicMap[a.academic_id] = a.academic_standing; });
        const teachSubjectMap = {};
        teachSubjectRes.data?.forEach((t) => { teachSubjectMap[t.teach_subject_id] = t.teach_subject; });
        const gradeMap = {};
        gradeRes.data?.forEach((g) => { gradeMap[g.grade_level_id] = g.grade_level_name; });
        const competencyMap = {};
        competencyRes.data?.forEach((c) => { competencyMap[c.competency_id] = c.competency_name; });
        const abilityMap = {};
        abilityRes.data?.forEach((a) => { abilityMap[a.ability21_id] = a.ability21_name_th; });
        const desirableMap = {};
        desirableRes.data?.forEach((d) => { desirableMap[d.desirable_id] = d.desirable_name; });
        const schoolMap = {};
        schoolRes.data?.forEach((s) => { schoolMap[s.school_id] = s.school_name; });
        const subjectTypeMap = {};
        subjectTypeRes.data?.forEach((t) => { subjectTypeMap[t.subjecttype_id] = t.subjecttype_name; });

        if (mounted) {
          setPlan(planData);
          setTeacher(teacherData || null);
          setPolicySide1(policy1Res.data || []);
          setPolicySide2(policy2Res.data || []);
          setScores(scoreRes.data || []);
          setLookups({
            academic: academicMap,
            teachSubject: teachSubjectMap,
            gradeLevel: gradeMap,
            competency: competencyMap,
            ability21: abilityMap,
            desirable: desirableMap,
            school: schoolMap,
            subjectType: subjectTypeMap,
          });
        }
      } catch (err) {
        console.error('ViewScoring load error:', err);
      } finally {
        if (mounted) setLoading(false);
      }
    };

    loadData();
    return () => { mounted = false; };
  }, [planid]);

  const committeeList = useMemo(() => {
    if (!plan) return [];
    return [plan.committee1, plan.committee2, plan.committee3, plan.committee4, plan.committee5].filter(Boolean);
  }, [plan]);

  const scorePassThreshold = useMemo(() => {
    const academicId = teacher?.academic_id;
    if (academicId === '15' || academicId === '99') return 65;
    if (academicId === '16') return 70;
    if (academicId === '17') return 75;
    if (academicId === '18') return 80;
    return 80;
  }, [teacher]);

  const scoreMap = useMemo(() => {
    const map = {};
    scores.forEach((s) => {
      const key = `${s.policy_id}_${s.supervision}`;
      map[key] = s.score_weight || 0;
    });
    return map;
  }, [scores]);

  const policySide1Totals = useMemo(() => {
    let sum = 0;
    policySide1.forEach((p) => {
      const values = committeeList.map((c) => scoreMap[`${p.auto_id}_${c}`] || 0);
      const avg = values.length ? values.reduce((a, b) => a + b, 0) / values.length : 0;
      sum += avg;
    });
    return sum;
  }, [policySide1, committeeList, scoreMap]);

  const policySide2Totals = useMemo(() => {
    let sum = 0;
    policySide2.forEach((p) => {
      const values = committeeList.map((c) => scoreMap[`${p.auto_id}_${c}`] || 0);
      const avg = values.length ? values.reduce((a, b) => a + b, 0) / values.length : 0;
      sum += avg;
    });
    return sum;
  }, [policySide2, committeeList, scoreMap]);

  const competencyNames = useMemo(() => {
    const list = (plan?.competency || '').split(',').filter(Boolean);
    return list.map((id, idx) => `${idx + 1}. ${lookups.competency[id] || id}`);
  }, [plan, lookups]);

  const abilityNames = useMemo(() => {
    const list = (plan?.ability21 || '').split(',').filter(Boolean);
    return list.map((id) => lookups.ability21[id] || id).join(', ');
  }, [plan, lookups]);

  const desirableNames = useMemo(() => {
    const list = (plan?.desirable || '').split(',').filter(Boolean);
    return list.map((id) => lookups.desirable[id] || id).join(', ');
  }, [plan, lookups]);

  if (loading) {
    return (
      <LoadingSpinner
        title="ดูคะแนนการประเมิน"
        message="กำลังโหลดข้อมูลการประเมิน กรุณารอสักครู่..."
      />
    );
  }

  if (!plan) {
    return (
      <EmptyState
        title="ดูคะแนนการประเมิน"
        message="ไม่พบข้อมูลแผนการสอน"
        type="warning"
      />
    );
  }

  return (
    <div className="view-scoring">
      <div className="row">
        <div className="col-12">
          <div className="card card-success">
            <div className="card-header">
              <h3 className="card-title"><i className="fa-solid fa-list-check"></i> การประเมินแผนการสอน</h3>
            </div>
            <div className="card-body">
              <div className="table-responsive">
                <table className="table table-bordered">
                  <thead>
                    <tr>
                      <th colSpan={3 + committeeList.length}>
                        แบบสรุปผลการประเมินตำแหน่งและวิทยฐานะ ด้านที่ 1 และ ด้านที่ 2<br />
                        ผู้ขอรับการประเมิน ชื่อ-สกุล : {teacher?.name || ''} {teacher?.lastname || ''}<br />
                        วิทยฐานะ : <strong>{lookups.academic[teacher?.academic_id] || ''}</strong><br />
                        สถานศึกษา : โรงเรียน{lookups.school[plan.school_code] || ''}<br />
                        สังกัด : สำนักงานเขตพื้นที่การศึกษามัธยมศึกษาพิษณุโลก อุตรดิตถ์
                      </th>
                    </tr>
                    <tr>
                      <td colSpan={3 + committeeList.length}>
                        กลุ่มสาระการเรียนรู้/รายวิชาที่ขอรับการประเมิน : {lookups.teachSubject[plan.teach_subject_id] || ''} &nbsp;&nbsp;&nbsp;&nbsp;ระดับชั้น : {lookups.gradeLevel[plan.grade_level_id] || ''}&nbsp;&nbsp;&nbsp;&nbsp;ประเภทวิชา : <strong>{lookups.subjectType[plan.subject_type] || plan.subject_type || 'พื้นฐาน'}</strong><br />
                        ชื่อวิชา : {plan.subject_name} ({plan.subject_code}) &nbsp;&nbsp;&nbsp;&nbsp;ชื่อหน่วย : {plan.subject_name} &nbsp;&nbsp;&nbsp;&nbsp; ชื่อแผนการสอน : {plan.subject_content}<br />
                        ปีการศึกษา : {plan.edu_year} &nbsp;&nbsp;&nbsp;&nbsp;ภาคเรียนที่ : {plan.edu_term} &nbsp;&nbsp;&nbsp;&nbsp;วันที่ : {plan.teach_date} [เวลา {plan.teach_timestart} - {plan.teach_timeend} ({plan.teach_minute} นาที)]<br />
                        วิธีการสอน : {plan.learning_model} &nbsp;&nbsp;&nbsp;&nbsp;<br />
                        สมรรถนะ : {competencyNames.map((c) => (<span key={c} className="text-success">{c}<br /></span>))}
                        ทักษะในศตวรรษที่ 21 : {abilityNames} &nbsp;&nbsp;&nbsp;&nbsp; คุณลักษณะอันพึงประสงค์ : {desirableNames}
                      </td>
                    </tr>
                    <tr className="bg-success">
                      <td colSpan={3 + committeeList.length}>
                        <strong><h5>ด้านที่ 1 ด้านทักษะการจัดการเรียนรู้และการจัดการชั้นเรียน</h5></strong>
                      </td>
                    </tr>
                    <tr className="text-center">
                      <th rowSpan="2"><h5><strong>ตัวชี้วัด</strong></h5></th>
                      <th colSpan={committeeList.length}><h5><strong>คะแนน</strong></h5></th>
                      <th rowSpan="2"><h5><strong>คะแนนเฉลี่ย</strong></h5></th>
                    </tr>
                    <tr>
                      {committeeList.map((_, idx) => (
                        <th key={idx} className="text-center">กรรมการคนที่ {idx + 1}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {policySide1.map((item) => {
                      const values = committeeList.map((c) => scoreMap[`${item.auto_id}_${c}`] || 0);
                      const avg = values.length ? values.reduce((a, b) => a + b, 0) / values.length : 0;
                      return (
                        <tr key={`s1-${item.auto_id}`}>
                          <td><h5>{item.text}</h5></td>
                          {values.map((v, idx) => (
                            <td key={idx} className="text-center">{Number(v || 0).toFixed(2)}</td>
                          ))}
                          <td className="text-center">{avg.toFixed(2)}</td>
                        </tr>
                      );
                    })}
                    <tr>
                      <td className="text-center"><h5>รวม</h5></td>
                      {committeeList.map((_, idx) => (
                        <td key={idx} className="text-center">—</td>
                      ))}
                      <td className="text-center"><h5>{policySide1Totals.toFixed(2)}</h5></td>
                    </tr>
                    <tr>
                      <td colSpan={2 + committeeList.length}>
                        ได้คะแนนร้อยละ <strong>{policySide1Totals.toFixed(2)}</strong> อยู่ในระดับ <strong>{explanScore(policySide1Totals)}</strong>
                        ผลการพิจารณา {scorePassLabel(policySide1Totals, scorePassThreshold)} (ผ่านเกณฑ์ร้อยละ {scorePassThreshold})
                      </td>
                    </tr>

                    <tr className="bg-success">
                      <td colSpan={2 + committeeList.length}>
                        <strong><h5>ด้านที่ 2 ด้านผลลัพธ์การเรียนรู้ของผู้เรียน</h5></strong>
                      </td>
                    </tr>
                    <tr className="text-center">
                      <th><h5><strong>ตัวชี้วัด</strong></h5></th>
                      {committeeList.map((_, idx) => (
                        <th key={idx} className="text-center">กรรมการคนที่ {idx + 1}</th>
                      ))}
                      <th><h5><strong>คะแนนเฉลี่ย</strong></h5></th>
                    </tr>
                    {policySide2.map((item) => {
                      const values = committeeList.map((c) => scoreMap[`${item.auto_id}_${c}`] || 0);
                      const avg = values.length ? values.reduce((a, b) => a + b, 0) / values.length : 0;
                      return (
                        <tr key={`s2-${item.auto_id}`}>
                          <td><h5>{item.text}</h5></td>
                          {values.map((v, idx) => (
                            <td key={idx} className="text-center">{Number(v || 0).toFixed(2)}</td>
                          ))}
                          <td className="text-center">{avg.toFixed(2)}</td>
                        </tr>
                      );
                    })}
                    <tr>
                      <td className="text-center"><h5>รวม</h5></td>
                      {committeeList.map((_, idx) => (
                        <td key={idx} className="text-center">—</td>
                      ))}
                      <td className="text-center"><h5>{policySide2Totals.toFixed(2)}</h5></td>
                    </tr>
                    <tr>
                      <td colSpan={2 + committeeList.length}>
                        ได้คะแนนร้อยละ <strong>{policySide2Totals.toFixed(2)}</strong> อยู่ในระดับ <strong>{explanScore(policySide2Totals)}</strong>
                        ผลการพิจารณา {scorePassLabel(policySide2Totals, scorePassThreshold)} (ผ่านเกณฑ์ร้อยละ {scorePassThreshold})
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>

              {!planid && (
                <div className="alert alert-info mt-3">
                  ระบุแผนที่ต้องการดูผล เช่น <code>/view_scoring?planid=123</code>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ViewScoring;
