import React, { useEffect, useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '../supabaseClient';
import LoadingSpinner from '../components/LoadingSpinner';

const PolicyNumber = () => {
  const [loading, setLoading] = useState(true);
  const [rows, setRows] = useState([]);
  const [academicMap, setAcademicMap] = useState({});
  const [academicList, setAcademicList] = useState([]);
  const [filterAcademic, setFilterAcademic] = useState('');
  const [filterSide, setFilterSide] = useState('');

  const loadData = async () => {
    setLoading(true);
    try {
      const [policyRes, academicRes] = await Promise.all([
        supabase.from('tbl_policy_number').select('*').order('auto_id', { ascending: true }),
        supabase.from('tbl_system_Academic_Standing').select('academic_id, academic_standing'),
      ]);
      if (policyRes.error) throw policyRes.error;
      if (academicRes.error) throw academicRes.error;

      const map = {};
      (academicRes.data || []).forEach((row) => {
        map[row.academic_id] = row.academic_standing;
      });
      setAcademicMap(map);
      setAcademicList(academicRes.data || []);
      setRows(policyRes.data || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const filteredRows = useMemo(() => {
    return rows.filter((r) => {
      if (filterAcademic && String(r.academic) !== String(filterAcademic)) return false;
      if (filterSide && String(r.side) !== String(filterSide)) return false;
      return true;
    });
  }, [rows, filterAcademic, filterSide]);

  if (loading) {
    return <LoadingSpinner title="ตัวชี้วัดการประเมิน (Policy Number)" message="กำลังโหลดข้อมูล..." />;
  }

  return (
    <div className="container-fluid py-3">
      {/* ── PA Rubric Navigation Tabs ── */}
      <div className="card shadow-sm border-0 mb-3" style={{ borderRadius: '12px' }}>
        <div className="card-body p-2">
          <ul className="nav nav-pills nav-fill">
            <li className="nav-item">
              <Link to="/policy_side" className="nav-link text-muted font-weight-bold">
                <i className="fa-solid fa-shapes mr-1"></i> 1. ด้านของการประเมิน (Sides)
              </Link>
            </li>
            <li className="nav-item">
              <Link to="/policy_number" className="nav-link active font-weight-bold shadow-sm">
                <i className="fa-solid fa-list-ol mr-1"></i> 2. องค์ประกอบตัวชี้วัด (Components)
              </Link>
            </li>
            <li className="nav-item">
              <Link to="/policy_items" className="nav-link text-muted font-weight-bold">
                <i className="fa-solid fa-list-check mr-1"></i> 3. รายการเกณฑ์ประเมิน (Rubric Items)
              </Link>
            </li>
          </ul>
        </div>
      </div>

      <div className="card shadow-sm border-0" style={{ borderRadius: '12px' }}>
        <div className="card-header bg-white py-3 border-bottom d-flex justify-content-between align-items-center flex-wrap gap-2">
          <div>
            <h5 className="font-weight-bold mb-0 text-dark">
              <i className="fa-solid fa-list-ol text-primary mr-2"></i> องค์ประกอบตัวชี้วัดการประเมิน ว.PA ({filteredRows.length} รายการ)
            </h5>
            <p className="text-muted small mb-0 mt-1">
              ข้อกำหนดตัวชี้วัดจำแนกตามวิทยฐานะและด้านการประเมิน
            </p>
          </div>
        </div>

        <div className="card-body p-4">
          {/* Filters */}
          <div className="row mb-3">
            <div className="col-md-4 mb-2">
              <select
                className="form-control form-control-sm"
                value={filterAcademic}
                onChange={(e) => setFilterAcademic(e.target.value)}
              >
                <option value="">ทุกวิทยฐานะ</option>
                {academicList.map((a) => (
                  <option key={a.academic_id} value={a.academic_id}>
                    {a.academic_standing}
                  </option>
                ))}
              </select>
            </div>

            <div className="col-md-3 mb-2">
              <select
                className="form-control form-control-sm"
                value={filterSide}
                onChange={(e) => setFilterSide(e.target.value)}
              >
                <option value="">ทุกด้านการประเมิน</option>
                <option value="1">ด้านที่ 1 ด้านทักษะการจัดการเรียนรู้</option>
                <option value="2">ด้านที่ 2 ด้านผลลัพธ์การเรียนรู้</option>
              </select>
            </div>
          </div>

          <div className="table-responsive">
            <table className="table table-hover align-middle mb-0 small">
              <thead className="bg-light">
                <tr>
                  <th style={{ width: '50px' }} className="text-center">ID</th>
                  <th style={{ width: '160px' }}>วิทยฐานะ</th>
                  <th style={{ width: '80px' }} className="text-center">ด้านที่</th>
                  <th style={{ width: '80px' }} className="text-center">ข้อที่</th>
                  <th>รายละเอียดองค์ประกอบ</th>
                  <th style={{ width: '130px' }} className="text-center">เกณฑ์คะแนน</th>
                </tr>
              </thead>
              <tbody>
                {filteredRows.map((row) => (
                  <tr key={row.auto_id}>
                    <td className="text-center text-muted font-mono">{row.auto_id}</td>
                    <td>
                      <span className="badge badge-light border text-dark font-weight-normal">
                        {academicMap[row.academic] || row.academic}
                      </span>
                    </td>
                    <td className="text-center font-weight-bold">ด้านที่ {row.side}</td>
                    <td className="text-center font-weight-bold text-primary">{row.no_order}</td>
                    <td className="font-weight-bold text-dark">{row.text}</td>
                    <td className="text-center">
                      <Link
                        to={`/policy_items?academic_id=${row.academic}&policy_side=${row.side}&policy_id=${row.auto_id}`}
                        className="btn btn-outline-info btn-sm px-2"
                        title="ดูเกณฑ์การประเมินย่อย"
                      >
                        <i className="fa-solid fa-list mr-1"></i> เกณฑ์ย่อย
                      </Link>
                    </td>
                  </tr>
                ))}
                {filteredRows.length === 0 && (
                  <tr>
                    <td colSpan="6" className="text-center py-4 text-muted">
                      ไม่พบข้อมูลตัวชี้วัดในเงื่อนไขที่เลือก
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PolicyNumber;
