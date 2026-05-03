import React, { useEffect, useMemo, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import Swal from 'sweetalert2';
import { supabase } from '../supabaseClient';
import { useUserProfile } from '../hooks/useUserProfile';

const useQuery = () => {
  const { search } = useLocation();
  return useMemo(() => new URLSearchParams(search), [search]);
};

const PlanScoring = () => {
  const navigate = useNavigate();
  const query = useQuery();
  const planid = query.get('planid') || '';
  const committee = query.get('committee') || '';
  const { profile, loading: profileLoading } = useUserProfile();

  const [loading, setLoading] = useState(true);
  const [plan, setPlan] = useState(null);
  const [policySide1, setPolicySide1] = useState([]);
  const [policySide2, setPolicySide2] = useState([]);
  const [policyItems, setPolicyItems] = useState({});
  const [scores, setScores] = useState({});
  const [comment, setComment] = useState('');
  const [alreadyScored, setAlreadyScored] = useState(false);

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
          .eq('planid', planid)
          .maybeSingle();

        if (!planData) {
          if (mounted) setLoading(false);
          return;
        }

        const { data: teacherData } = await supabase
          .from('tbl_Users')
          .select('academic_id')
          .eq('people_id', planData.people_id)
          .maybeSingle();

        const academicId = teacherData?.academic_id || '';

        const [side1Res, side2Res, scoreRes] = await Promise.all([
          supabase.from('tbl_policy_number').select('*').eq('academic', academicId).eq('side', '1').order('auto_id', { ascending: true }),
          supabase.from('tbl_policy_number').select('*').eq('academic', academicId).eq('side', '2').order('auto_id', { ascending: true }),
          supabase.from('tbl_sendplan_score').select('planid, supervision').eq('planid', planid).eq('supervision', profile?.people_id || ''),
        ]);

        const side1 = side1Res.data || [];
        const side2 = side2Res.data || [];

        const policyIds = [...side1, ...side2].map((p) => p.auto_id);
        const { data: policyItemsRes } = await supabase
          .from('tbl_policy_items')
          .select('*')
          .in('policy_id', policyIds)
          .order('no_order', { ascending: true });

        const itemsMap = {};
        policyItemsRes?.forEach((item) => {
          if (!itemsMap[item.policy_id]) itemsMap[item.policy_id] = [];
          itemsMap[item.policy_id].push(item);
        });

        if (mounted) {
          setPlan(planData);
          setPolicySide1(side1);
          setPolicySide2(side2);
          setPolicyItems(itemsMap);
          setAlreadyScored((scoreRes.data || []).length > 0);
        }
      } catch (err) {
        console.error('PlanScoring load error:', err);
      } finally {
        if (mounted) setLoading(false);
      }
    };

    if (!profileLoading) loadData();

    return () => { mounted = false; };
  }, [planid, profile, profileLoading]);

  const handleScoreChange = (policyId, value) => {
    setScores((prev) => ({ ...prev, [policyId]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!planid) return;
    if (alreadyScored) {
      Swal.fire('Info', 'แผนนี้ถูกประเมินแล้ว', 'info');
      return;
    }

    const allPolicies = [...policySide1, ...policySide2];
    for (const policy of allPolicies) {
      if (!scores[policy.auto_id]) {
        Swal.fire('Warning', 'กรุณาให้คะแนนทุกข้อ', 'info');
        return;
      }
    }

    try {
      const userId = profile?.people_id || '';
      const insertPayload = allPolicies.map((policy) => ({
        planid: String(planid),
        policy_id: String(policy.auto_id),
        score: Number(scores[policy.auto_id]),
        score_weight: Number(scores[policy.auto_id]) * Number(policy.weight || 1),
        supervision: String(userId),
        academic: String(policy.academic),
        create_at: new Date().toISOString(),
      }));

      const { error: insertError } = await supabase.from('tbl_sendplan_score').insert(insertPayload);
      if (insertError) throw insertError;

      if (committee) {
        const committeeNum = committee.replace('committee', '');
        if (committeeNum) {
          const updatePayload = {};
          updatePayload[`date_scoring${committeeNum}`] = new Date().toISOString().slice(0, 10);
          // บันทึกข้อเสนอแนะของกรรมการ
          if (comment.trim()) {
            updatePayload[`committee${committeeNum}_comment`] = comment.trim();
          }
          await supabase.from('tbl_sendplan').update(updatePayload).eq('planid', planid);
        }
      }

      Swal.fire('สำเร็จ', 'บันทึกคะแนนเรียบร้อย', 'success');
      navigate('/Plan_Check');
    } catch (err) {
      console.error(err);
      Swal.fire('Error', 'ไม่สามารถบันทึกคะแนนได้', 'error');
    }
  };

  if (loading || profileLoading) {
    return (
      <div className="text-center p-4">
        <div className="spinner-border text-primary" role="status"></div>
        <p className="mt-2">กำลังโหลดข้อมูล...</p>
      </div>
    );
  }

  if (!plan) {
    return <div className="alert alert-warning">ไม่พบข้อมูลแผนการสอน</div>;
  }

  return (
    <div className="row">
      <div className="col-12">
        <div className="card card-success">
          <div className="card-header">
            <h3 className="card-title"><i className="fa-solid fa-list-check"></i> การประเมินแผนการสอน</h3>
          </div>
          <div className="card-body">
            {alreadyScored && (
              <div className="alert alert-info">แผนนี้ถูกประเมินแล้ว สามารถดูผลการประเมินได้</div>
            )}
            <form onSubmit={handleSubmit}>
              <div className="table-responsive">
                <table className="table table-bordered table-striped">
                  <thead>
                    <tr>
                      <th>ข้อมูลการสอน</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr className="bg-success">
                      <td>
                        <strong><h5>ด้านที่ 1 ด้านทักษะการจัดการเรียนรู้และการจัดการชั้นเรียน</h5></strong>
                      </td>
                    </tr>
                    <tr className="bg-danger">
                      <td>
                        เกณฑ์การให้คะแนนด้านที่ 1 (Scoring Rubric)<br />
                        1 คะแนน เมื่อปรากฏชัดเจนว่าสามารถปฏิบัติตามข้อ 1 ถึง ข้อ 3 ได้ 1 ข้อ<br />
                        2 คะแนน เมื่อปรากฏชัดเจนว่าสามารถปฏิบัติตามข้อ 1 ถึง ข้อ 3 ได้ 2 ข้อ<br />
                        3 คะแนน เมื่อปรากฏชัดเจนว่าสามารถปฏิบัติตามข้อ 1 ถึง ข้อ 3 ได้ทั้ง 3 ข้อ<br />
                        4 คะแนน เมื่อปรากฏชัดเจนว่าสามารถปฏิบัติตามข้อ 1 ถึง ข้อ 3 ได้ทั้ง 3 ข้อ และปรากฏชัดเจนว่าสามารถปฏิบัติตามข้อ 4 หรือ ข้อ 5 ได้ 1 ข้อ<br />
                        5 คะแนน เมื่อปรากฏชัดเจนว่าสามารถปฏิบัติตามข้อ 1 ถึง ข้อ 3 ได้ทั้ง 3 ข้อ และปรากฏชัดเจนว่าสามารถปฏิบัติตามข้อ 4 และ ข้อ 5 ได้ทั้ง 2 ข้อ
                      </td>
                    </tr>
                    {policySide1.map((policy) => (
                      <tr key={policy.auto_id}>
                        <td>
                          <div className="row">
                            <div className="col-12">
                              <h5>{policy.text}</h5>
                              <strong>ตัวชี้วัด</strong><br />
                              {(policyItems[policy.auto_id] || []).map((item) => (
                                <div key={item.id}>{item.no_order}. {item.text}</div>
                              ))}
                              <div className="mt-2">
                                {[1, 2, 3, 4, 5].map((v) => (
                                  <label key={v} className="radio-inline mr-3">
                                    <input
                                      type="radio"
                                      name={`policy_${policy.auto_id}`}
                                      value={v}
                                      checked={String(scores[policy.auto_id] || '') === String(v)}
                                      onChange={() => handleScoreChange(policy.auto_id, v)}
                                      required
                                    /> {v} คะแนน
                                  </label>
                                ))}
                              </div>
                            </div>
                          </div>
                        </td>
                      </tr>
                    ))}

                    <tr className="bg-success">
                      <td>
                        <strong><h5>ด้านที่ 2 ด้านผลลัพธ์การเรียนรู้ของผู้เรียน</h5></strong>
                      </td>
                    </tr>
                    <tr className="bg-danger">
                      <td>
                        เกณฑ์การให้คะแนนด้านที่ 2 (Scoring Rubric)<br />
                        1 คะแนน เมื่อปฏิบัติได้หรือปรากฏผลชัดเจน 1 ข้อ จาก 5 ข้อ<br />
                        2 คะแนน เมื่อปฏิบัติได้หรือปรากฏผลชัดเจน 2 ข้อ จาก 5 ข้อ<br />
                        3 คะแนน เมื่อปฏิบัติได้หรือปรากฏผลชัดเจน 3 ข้อ จาก 5 ข้อ<br />
                        4 คะแนน เมื่อปฏิบัติได้หรือปรากฏผลชัดเจน 4 ข้อ จาก 5 ข้อ<br />
                        5 คะแนน เมื่อปฏิบัติได้หรือปรากฏผลชัดเจนทั้ง 5 ข้อ
                      </td>
                    </tr>
                    {policySide2.map((policy) => (
                      <tr key={policy.auto_id}>
                        <td>
                          <div className="row">
                            <div className="col-12">
                              <h5>{policy.text}</h5>
                              <strong>ตัวชี้วัด</strong><br />
                              {(policyItems[policy.auto_id] || []).map((item) => (
                                <div key={item.id}>{item.no_order}. {item.text}</div>
                              ))}
                              <div className="mt-2">
                                {[1, 2, 3, 4, 5].map((v) => (
                                  <label key={v} className="radio-inline mr-3">
                                    <input
                                      type="radio"
                                      name={`policy_${policy.auto_id}`}
                                      value={v}
                                      checked={String(scores[policy.auto_id] || '') === String(v)}
                                      onChange={() => handleScoreChange(policy.auto_id, v)}
                                      required
                                    /> {v} คะแนน
                                  </label>
                                ))}
                              </div>
                            </div>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* ── ข้อเสนอแนะจากกรรมการ ── */}
              <div className="row mt-3">
                <div className="col-12">
                  <div className="card card-warning">
                    <div className="card-header">
                      <h4 className="card-title">
                        <i className="fa-solid fa-comment-dots"></i> ข้อเสนอแนะ / ความคิดเห็นของกรรมการ
                      </h4>
                    </div>
                    <div className="card-body">
                      <textarea
                        className="form-control"
                        rows="5"
                        placeholder="กรอกข้อเสนอแนะหรือความคิดเห็นเพิ่มเติมสำหรับครูผู้สอน (ถ้ามี)"
                        value={comment}
                        onChange={(e) => setComment(e.target.value)}
                        disabled={alreadyScored}
                      />
                      <small className="text-muted">
                        <i className="fa-solid fa-info-circle"></i> ข้อเสนอแนะนี้จะปรากฏในรายงานผลการประเมิน เพื่อให้ครูนำไปพัฒนาการสอน
                      </small>
                    </div>
                  </div>
                </div>
              </div>

              <div className="row">
                <div className="col-12 text-center">
                  <button type="submit" className="btn btn-success btn-xl" disabled={alreadyScored}>
                    <i className="fa-regular fa-floppy-disk"></i> บันทึกคะแนน
                  </button>
                  <Link to="/Plan_Check" className="btn btn-danger btn-xl ml-2">
                    <i className="fa-solid fa-xmark"></i> ยกเลิก
                  </Link>
                </div>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PlanScoring;
