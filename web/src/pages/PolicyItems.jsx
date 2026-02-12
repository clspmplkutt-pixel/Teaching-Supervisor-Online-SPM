import React, { useEffect, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { supabase } from '../supabaseClient';
import useSelect2 from '../hooks/useSelect2';

const PolicyItems = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const academicId = searchParams.get('academic_id') || '';
  const policySide = searchParams.get('policy_side') || '';
  const policyId = searchParams.get('policy_id') || '';

  const [loading, setLoading] = useState(true);
  const [academicList, setAcademicList] = useState([]);
  const [sideList, setSideList] = useState([]);
  const [policyNumbers, setPolicyNumbers] = useState([]);
  const [items, setItems] = useState([]);

  useSelect2([loading, academicList.length, sideList.length, policyNumbers.length]);

  const updateParams = (next) => {
    const params = new URLSearchParams(searchParams.toString());
    Object.entries(next).forEach(([key, value]) => {
      if (value === '' || value === null || typeof value === 'undefined') {
        params.delete(key);
      } else {
        params.set(key, value);
      }
    });
    const query = params.toString();
    navigate(query ? `/policy_items?${query}` : '/policy_items');
  };

  const loadLookups = async () => {
    const [academicRes, sideRes] = await Promise.all([
      supabase
        .from('tbl_system_Academic_Standing')
        .select('*')
        .or('academic_id.eq.99,and(academic_id.gte.15,academic_id.lte.18)')
        .order('academic_id', { ascending: true }),
      supabase
        .from('tbl_policy_side')
        .select('*')
        .order('no_id', { ascending: true }),
    ]);
    if (academicRes.error) throw academicRes.error;
    if (sideRes.error) throw sideRes.error;
    setAcademicList(academicRes.data || []);
    setSideList(sideRes.data || []);
  };

  const loadPolicyNumbers = async () => {
    let query = supabase.from('tbl_policy_number').select('*').order('no_order', { ascending: true });
    if (academicId) query = query.eq('academic', academicId);
    if (policySide) query = query.eq('side', policySide);
    const { data, error } = await query;
    if (error) throw error;
    setPolicyNumbers(data || []);
  };

  const loadItems = async () => {
    if (!policyId) {
      setItems([]);
      return;
    }
    const { data, error } = await supabase
      .from('tbl_policy_items')
      .select('*')
      .eq('policy_id', policyId)
      .order('id', { ascending: true });
    if (error) throw error;
    setItems(data || []);
  };

  const loadData = async () => {
    setLoading(true);
    try {
      await loadLookups();
      await loadPolicyNumbers();
      await loadItems();
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [academicId, policySide, policyId]);

  if (loading) {
    return (
      <div className="text-center p-4">
        <div className="spinner-border text-primary" role="status"></div>
        <p className="mt-2">กำลังโหลดข้อมูล...</p>
      </div>
    );
  }

  return (
    <div className="row">
      <div className="col-sm-12 col-md-12 col-lg-12 col-xl-12">
        <div className="card card-info card-outline">
          <div className="card-body">
            <div className="row">
              <div className="col-sm-12 col-md-3 col-xl-3 col-lg-3">
                <Link className="btn btn-block btn-info" to={`/policy_items_add?policy_id=${policyId}`}>
                  <i className="fa-solid fa-user-plus"></i> เพิ่มตัวชี้วัด
                </Link>
              </div>
              <div className="col-sm-12 col-md-3 col-xl-3 col-lg-3">
                <select
                  className="form-control form-select-lg select2bs4"
                  name="academic_id"
                  id="academic_id"
                  value={academicId}
                  onChange={(e) => updateParams({ academic_id: e.target.value || '', policy_side: policySide, policy_id: policyId })}
                  required
                >
                  <option value="">วิทยฐานะ</option>
                  {academicList.map((row) => (
                    <option key={row.academic_id} value={row.academic_id}>{row.academic_standing}</option>
                  ))}
                </select>
              </div>
              <div className="col-sm-12 col-md-3 col-xl-3 col-lg-3">
                <select
                  className="form-control form-select-lg select2bs4"
                  name="policy_side"
                  id="policy_side"
                  value={policySide}
                  onChange={(e) => updateParams({ academic_id: academicId, policy_side: e.target.value || '', policy_id: policyId })}
                  required
                >
                  <option value="">ด้านที่</option>
                  {sideList.map((row) => (
                    <option key={row.id} value={row.id}>ด้านที่ {row.no_id} {row.text}</option>
                  ))}
                </select>
              </div>
              <div className="col-sm-12 col-md-3 col-xl-3 col-lg-3">
                <select
                  className="form-control form-select-lg select2bs4"
                  name="policy_id"
                  id="policy_id"
                  value={policyId}
                  onChange={(e) => updateParams({ academic_id: academicId, policy_side: policySide, policy_id: e.target.value || '' })}
                  required
                >
                  <option value="">ตัวชี้วัด</option>
                  {policyNumbers.map((row) => (
                    <option key={row.auto_id} value={row.auto_id}>{row.text}</option>
                  ))}
                </select>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="col-sm-12 col-md-12 col-lg-12 col-xl-12">
        <div className="card card-success">
          <div className="card-header">
            <h3 className="card-title"><i className="fa-solid fa-school-circle-check"></i> ตัวชี้วัด</h3>
          </div>
          <div className="card-body">
            <div className="table-responsive">
              <table className="table table-bordered table-hover table-striped">
                <thead>
                  <tr>
                    <th>id</th>
                    <th>ตัวชี้วัดที่</th>
                    <th>ลำดับที่การแสดง</th>
                    <th>รายละเอียด</th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((row) => (
                    <tr key={row.id}>
                      <td className="text-center">{row.id}</td>
                      <td className="text-center">{row.policy_id}</td>
                      <td className="text-center">{row.no_order}</td>
                      <td>{row.text}</td>
                    </tr>
                  ))}
                  {items.length === 0 && (
                    <tr>
                      <td colSpan="4" className="text-center"><h2 className="text-danger">ยังไม่มีข้อมูล</h2></td>
                    </tr>
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

export default PolicyItems;
