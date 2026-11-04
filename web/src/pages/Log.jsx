import React, { useEffect, useState, useCallback } from 'react';
import { supabase } from '../supabaseClient';
import LoadingSpinner from '../components/LoadingSpinner';

const PAGE_SIZE = 25;

const Log = () => {
  const [loading, setLoading] = useState(true);
  const [rows, setRows] = useState([]);
  const [totalCount, setTotalCount] = useState(0);
  const [page, setPage] = useState(1);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterLevel, setFilterLevel] = useState('');

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const from = (page - 1) * PAGE_SIZE;
      const to = from + PAGE_SIZE - 1;

      let query = supabase
        .from('tbl_log')
        .select('*', { count: 'exact' });

      if (searchTerm.trim()) {
        const q = searchTerm.trim();
        query = query.or(`user.ilike.%${q}%,ipaddress.ilike.%${q}%,browser_name_regex.ilike.%${q}%`);
      }

      if (filterLevel) {
        query = query.eq('level', filterLevel);
      }

      query = query.order('id', { ascending: false }).range(from, to);

      const { data, count, error } = await query;
      if (error) throw error;
      setRows(data || []);
      setTotalCount(count || 0);
    } catch (err) {
      console.error('Log load error:', err);
    } finally {
      setLoading(false);
    }
  }, [page, searchTerm, filterLevel]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const totalPages = Math.ceil(totalCount / PAGE_SIZE) || 1;

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    setPage(1);
    loadData();
  };

  const getRoleBadge = (level) => {
    switch (level) {
      case 'admin':
      case 'root':
        return <span className="badge badge-danger">{level}</span>;
      case 'directorschool':
        return <span className="badge badge-primary">ผู้อำนวยการ</span>;
      case 'supervisor':
      case 'supervision':
        return <span className="badge badge-info">ศึกษานิเทศก์/ผู้นิเทศ</span>;
      case 'districdirector':
        return <span className="badge badge-dark">ผอ.เขต</span>;
      case 'teacher':
        return <span className="badge badge-success">ครูผู้สอน</span>;
      case 'headdepartment':
        return <span className="badge badge-warning text-dark">หัวหน้ากลุ่มสาระ</span>;
      default:
        return <span className="badge badge-light border">{level || '-'}</span>;
    }
  };

  return (
    <div className="container-fluid py-3">
      <div className="card shadow-sm border-0" style={{ borderRadius: '12px' }}>
        <div className="card-header bg-white py-3 border-bottom d-flex justify-content-between align-items-center flex-wrap gap-2">
          <div>
            <h5 className="font-weight-bold mb-0 text-dark">
              <i className="fa-solid fa-list-check text-success mr-2"></i> บันทึกประวัติการเข้าใช้งานระบบ (Audit Logs)
            </h5>
            <p className="text-muted small mb-0 mt-1">
              ตรวจสอบการล็อกอิน, IP Address, อุปกรณ์ และบราวเซอร์ที่เข้าถึงระบบ ({totalCount.toLocaleString()} รายการ)
            </p>
          </div>

          <div className="d-flex align-items-center gap-2">
            <button
              type="button"
              className="btn btn-outline-secondary btn-sm"
              onClick={loadData}
              title="รีเฟรชข้อมูล"
            >
              <i className="fa-solid fa-arrows-rotate"></i>
            </button>
          </div>
        </div>

        <div className="card-body p-4">
          {/* Filters Row */}
          <form onSubmit={handleSearchSubmit} className="row mb-3">
            <div className="col-md-5 col-lg-4 mb-2 mb-md-0">
              <div className="input-group input-group-sm">
                <input
                  type="text"
                  className="form-control"
                  placeholder="ค้นหาชื่อผู้ใช้, IP, บราวเซอร์..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
                <div className="input-group-append">
                  <button className="btn btn-primary font-weight-bold" type="submit">
                    <i className="fa-solid fa-magnifying-glass"></i>
                  </button>
                </div>
              </div>
            </div>

            <div className="col-md-4 col-lg-3">
              <select
                className="form-control form-control-sm"
                value={filterLevel}
                onChange={(e) => {
                  setFilterLevel(e.target.value);
                  setPage(1);
                }}
              >
                <option value="">ทุกระดับผู้ใช้งาน</option>
                <option value="admin">ผู้ดูแลระบบ (admin)</option>
                <option value="directorschool">ผู้อำนวยการโรงเรียน</option>
                <option value="supervisor">ศึกษานิเทศก์</option>
                <option value="supervision">ผู้นิเทศ</option>
                <option value="districdirector">ผอ.เขต</option>
                <option value="teacher">ครูผู้สอน</option>
                <option value="headdepartment">หัวหน้ากลุ่มสาระ</option>
              </select>
            </div>
          </form>

          {loading ? (
            <div className="text-center py-5">
              <div className="spinner-border text-primary" role="status"></div>
              <p className="mt-2 text-muted small">กำลังโหลดรายการบันทึก...</p>
            </div>
          ) : (
            <div className="table-responsive">
              <table className="table table-hover align-middle mb-0 small">
                <thead className="bg-light">
                  <tr>
                    <th style={{ width: '70px' }} className="text-center">ID</th>
                    <th>ผู้ใช้งาน (User)</th>
                    <th>ระดับสิทธิ์</th>
                    <th>IP Address</th>
                    <th>เวลาเข้าใช้งาน</th>
                    <th>บราวเซอร์ / อุปกรณ์</th>
                    <th style={{ width: '120px' }}>ความละเอียดจอ</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.length === 0 ? (
                    <tr>
                      <td colSpan="7" className="text-center py-4 text-muted">
                        ไม่พบบันทึกการเข้าใช้งานที่ตรงกับเงื่อนไข
                      </td>
                    </tr>
                  ) : (
                    rows.map((row) => (
                      <tr key={row.id}>
                        <td className="text-center text-muted font-mono">{row.id}</td>
                        <td className="font-weight-bold text-dark">{row.user}</td>
                        <td>{getRoleBadge(row.level)}</td>
                        <td className="font-mono text-muted">{row.ipaddress || '-'}</td>
                        <td className="text-muted">{row.datetimein || '-'}</td>
                        <td className="text-truncate" style={{ maxWidth: '280px' }} title={row.browser_name_regex}>
                          {row.browser_name_regex || '-'}
                        </td>
                        <td className="text-muted">{row.screenresolution || '-'}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          )}

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="d-flex justify-content-between align-items-center mt-3 pt-3 border-top flex-wrap gap-2">
              <div className="text-muted small">
                หน้า {page} จาก {totalPages} (แสดง {rows.length} จาก {totalCount.toLocaleString()} รายการ)
              </div>
              <div className="btn-group btn-group-sm">
                <button
                  type="button"
                  className="btn btn-outline-secondary"
                  disabled={page <= 1}
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                >
                  <i className="fa-solid fa-chevron-left mr-1"></i> ก่อนหน้า
                </button>
                <button
                  type="button"
                  className="btn btn-outline-secondary"
                  disabled={page >= totalPages}
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                >
                  ถัดไป <i className="fa-solid fa-chevron-right ml-1"></i>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Log;
