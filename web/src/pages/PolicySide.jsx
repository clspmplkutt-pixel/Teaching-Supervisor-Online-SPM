import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '../supabaseClient';
import LoadingSpinner from '../components/LoadingSpinner';

const PolicySide = () => {
  const [loading, setLoading] = useState(true);
  const [rows, setRows] = useState([]);

  const loadData = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('tbl_policy_side')
        .select('*')
        .order('no_id', { ascending: true });
      if (error) throw error;
      setRows(data || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  if (loading) {
    return <LoadingSpinner title="ด้านของการประเมิน (PA Side)" message="กำลังโหลดข้อมูล..." />;
  }

  return (
    <div className="container-fluid py-3">
      {/* ── PA Rubric Navigation Tabs ── */}
      <div className="card shadow-sm border-0 mb-3" style={{ borderRadius: '12px' }}>
        <div className="card-body p-2">
          <ul className="nav nav-pills nav-fill">
            <li className="nav-item">
              <Link to="/policy_side" className="nav-link active font-weight-bold shadow-sm">
                <i className="fa-solid fa-shapes mr-1"></i> 1. ด้านของการประเมิน (Sides)
              </Link>
            </li>
            <li className="nav-item">
              <Link to="/policy_number" className="nav-link text-muted font-weight-bold">
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
        <div className="card-header bg-white py-3 border-bottom d-flex justify-content-between align-items-center">
          <div>
            <h5 className="font-weight-bold mb-0 text-dark">
              <i className="fa-solid fa-shapes text-primary mr-2"></i> ด้านของการประเมิน ว.PA (Evaluation Sides)
            </h5>
            <p className="text-muted small mb-0 mt-1">
              หมวดหมู่หลักด้านการประเมินตามมาตรฐานตำแหน่งและวิทยฐานะ
            </p>
          </div>
        </div>

        <div className="card-body p-4">
          <div className="table-responsive">
            <table className="table table-hover align-middle mb-0">
              <thead className="bg-light">
                <tr>
                  <th style={{ width: '60px' }} className="text-center">#</th>
                  <th style={{ width: '100px' }} className="text-center">รหัสด้าน</th>
                  <th>ชื่อด้านการประเมิน</th>
                  <th style={{ width: '140px' }} className="text-center">ตัวชี้วัด</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row, idx) => (
                  <tr key={row.id}>
                    <td className="text-center text-muted small">{idx + 1}</td>
                    <td className="text-center font-weight-bold">
                      <span className="badge badge-light border">ด้านที่ {row.no_id}</span>
                    </td>
                    <td className="font-weight-bold text-dark">{row.text}</td>
                    <td className="text-center">
                      <Link to={`/policy_items?policy_side=${row.id}`} className="btn btn-outline-primary btn-sm px-3" style={{ borderRadius: '20px' }}>
                        ดูตัวชี้วัด
                      </Link>
                    </td>
                  </tr>
                ))}
                {rows.length === 0 && (
                  <tr>
                    <td colSpan="4" className="text-center py-4 text-muted">ยังไม่มีข้อมูลด้านการประเมิน</td>
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

export default PolicySide;
