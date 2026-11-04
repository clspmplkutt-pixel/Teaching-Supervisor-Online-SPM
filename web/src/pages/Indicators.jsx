import React, { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import Swal from 'sweetalert2';
import { supabase } from '../supabaseClient';
import LoadingSpinner from '../components/LoadingSpinner';

const PAGE_SIZE = 30;

const Indicators = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const teachSubjectId = searchParams.get('teach_subject_id') || '';
  const gradeLevelId = searchParams.get('grade_level_id') || '';
  const indicatorId = searchParams.get('indicator_id') || '';

  const [loading, setLoading] = useState(true);
  const [teachSubjects, setTeachSubjects] = useState([]);
  const [gradeLevels, setGradeLevels] = useState([]);
  const [indicatorTypes, setIndicatorTypes] = useState([]);
  const [rows, setRows] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);

  const teachSubjectMap = useMemo(() => {
    const map = {};
    teachSubjects.forEach((row) => { map[row.teach_subject_id] = row.teach_subject; });
    return map;
  }, [teachSubjects]);

  const gradeShortMap = useMemo(() => {
    const map = {};
    gradeLevels.forEach((row) => { map[row.grade_level_id] = row.grade_level_shortname || row.grade_level_name; });
    return map;
  }, [gradeLevels]);

  const indicatorTypeMap = useMemo(() => {
    const map = {};
    indicatorTypes.forEach((row) => { map[row.indicator_id] = row.indicator_name; });
    return map;
  }, [indicatorTypes]);

  const loadData = async () => {
    setLoading(true);
    try {
      const [teachRes, gradeRes, typeRes] = await Promise.all([
        supabase
          .from('tbl_system_Teach_Subject')
          .select('*')
          .eq('teach_subject_status', '1')
          .order('teach_subject_id', { ascending: true }),
        supabase
          .from('tbl_system_GradeLevel')
          .select('*')
          .eq('grade_level_status', '1')
          .order('grade_level_id', { ascending: true }),
        supabase
          .from('tbl_type_indicators')
          .select('*')
          .eq('indicator_status', '1')
          .order('indicator_id', { ascending: true }),
      ]);
      if (teachRes.error) throw teachRes.error;
      if (gradeRes.error) throw gradeRes.error;
      if (typeRes.error) throw typeRes.error;
      setTeachSubjects(teachRes.data || []);
      setGradeLevels(gradeRes.data || []);
      setIndicatorTypes(typeRes.data || []);

      let query = supabase.from('tbl_indicators').select('*');
      if (teachSubjectId) query = query.eq('teach_subject_id', teachSubjectId);
      if (gradeLevelId) query = query.eq('grade_level_id', gradeLevelId);
      if (indicatorId) query = query.eq('indicator_id', indicatorId);
      query = query
        .order('teach_subject_id', { ascending: true })
        .order('indicator_group', { ascending: true })
        .order('grade_level_id', { ascending: true })
        .order('indicators_name', { ascending: true });
      const { data, error } = await query;
      if (error) throw error;
      setRows(data || []);
    } catch (err) {
      console.error('Indicators load error:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [teachSubjectId, gradeLevelId, indicatorId]);

  const updateParams = (next) => {
    const params = new URLSearchParams(searchParams.toString());
    Object.entries(next).forEach(([key, value]) => {
      if (!value) {
        params.delete(key);
      } else {
        params.set(key, value);
      }
    });
    const query = params.toString();
    navigate(query ? `/indicators?${query}` : '/indicators');
  };

  const handleDelete = async (row) => {
    const result = await Swal.fire({
      title: 'ยืนยันการลบตัวชี้วัด?',
      html: `ต้องการลบตัวชี้วัด <b>${row.indicators_name}</b> (${row.content_s_name}) ใช่หรือไม่?<br/><span class="text-danger small">การลบนี้จะมีผลต่อแผนการสอนที่อ้างอิงตัวชี้วัดนี้</span>`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'ใช่, ลบข้อมูล',
      cancelButtonText: 'ยกเลิก',
      confirmButtonColor: '#ef4444',
      reverseButtons: true,
    });

    if (result.isConfirmed) {
      try {
        const { error } = await supabase
          .from('tbl_indicators')
          .delete()
          .eq('id', row.id);
        if (error) throw error;
        Swal.fire('สำเร็จ', 'ลบตัวชี้วัดเรียบร้อยแล้ว', 'success');
        setRows(prev => prev.filter(r => r.id !== row.id));
      } catch (err) {
        console.error('Delete indicator error:', err);
        Swal.fire('ข้อผิดพลาด', 'ไม่สามารถลบข้อมูลได้: ' + err.message, 'error');
      }
    }
  };

  const filteredRows = useMemo(() => {
    if (!searchTerm.trim()) return rows;
    const q = searchTerm.toLowerCase();
    return rows.filter(r =>
      (r.indicators_name || '').toLowerCase().includes(q) ||
      (r.indicators_details || '').toLowerCase().includes(q) ||
      (r.content_s_name || '').toLowerCase().includes(q)
    );
  }, [rows, searchTerm]);

  const totalPages = Math.ceil(filteredRows.length / PAGE_SIZE) || 1;
  const paginatedRows = useMemo(() => {
    const start = (currentPage - 1) * PAGE_SIZE;
    return filteredRows.slice(start, start + PAGE_SIZE);
  }, [filteredRows, currentPage]);

  if (loading) {
    return <LoadingSpinner title="จัดการตัวชี้วัดรายวิชา" message="กำลังโหลดข้อมูล..." />;
  }

  const addLink = teachSubjectId ? `/indicators_add?teach_subject_id=${teachSubjectId}` : '/indicators_add';

  return (
    <div className="container-fluid py-3">
      {/* ── Curriculum Hierarchy Tabs ── */}
      <div className="card shadow-sm border-0 mb-3" style={{ borderRadius: '12px' }}>
        <div className="card-body p-2">
          <ul className="nav nav-pills nav-fill">
            <li className="nav-item">
              <Link to="/strands" className="nav-link text-muted font-weight-bold">
                <i className="fa-solid fa-layer-group mr-1"></i> 1. สาระการเรียนรู้ (Strands)
              </Link>
            </li>
            <li className="nav-item">
              <Link to="/content_standards" className="nav-link text-muted font-weight-bold">
                <i className="fa-solid fa-bookmark mr-1"></i> 2. มาตรฐานการเรียนรู้ (Standards)
              </Link>
            </li>
            <li className="nav-item">
              <Link to="/indicators" className="nav-link active font-weight-bold shadow-sm">
                <i className="fa-solid fa-list-check mr-1"></i> 3. ตัวชี้วัดรายวิชา (Indicators)
              </Link>
            </li>
          </ul>
        </div>
      </div>

      <div className="card shadow-sm border-0 mb-4" style={{ borderRadius: '12px' }}>
        <div className="card-header bg-white py-3 border-bottom d-flex justify-content-between align-items-center flex-wrap gap-2">
          <div>
            <h5 className="font-weight-bold mb-0 text-dark">
              <i className="fa-solid fa-list-check text-primary mr-2"></i> จัดการตัวชี้วัดรายวิชา (Indicators)
              <span className="badge badge-light border ml-2">{filteredRows.length} รายการ</span>
            </h5>
            <p className="text-muted small mb-0 mt-1">
              กำหนดตัวชี้วัดตามกลุ่มสาระการเรียนรู้และระดับชั้นสำหรับการสร้างแผนการจัดการเรียนรู้
            </p>
          </div>

          <div className="d-flex align-items-center gap-2">
            <Link to={addLink} className="btn btn-primary font-weight-bold btn-sm px-3" style={{ borderRadius: '20px' }}>
              <i className="fa-solid fa-plus mr-1"></i> เพิ่มตัวชี้วัด
            </Link>
          </div>
        </div>

        <div className="card-body p-4">
          {/* Filters Row */}
          <div className="row mb-3">
            <div className="col-md-3 mb-2">
              <select
                className="form-control form-control-sm"
                value={teachSubjectId}
                onChange={(e) => {
                  setCurrentPage(1);
                  updateParams({ teach_subject_id: e.target.value, grade_level_id: gradeLevelId, indicator_id: indicatorId });
                }}
              >
                <option value="">ทุกกลุ่มสาระการเรียนรู้</option>
                {teachSubjects.map((row) => (
                  <option key={row.teach_subject_id} value={row.teach_subject_id}>{row.teach_subject}</option>
                ))}
              </select>
            </div>

            <div className="col-md-3 mb-2">
              <select
                className="form-control form-control-sm"
                value={gradeLevelId}
                onChange={(e) => {
                  setCurrentPage(1);
                  updateParams({ teach_subject_id: teachSubjectId, grade_level_id: e.target.value, indicator_id: indicatorId });
                }}
              >
                <option value="">ทุกระดับชั้น</option>
                {gradeLevels.map((row) => (
                  <option key={row.grade_level_id} value={row.grade_level_id}>{row.grade_level_name}</option>
                ))}
              </select>
            </div>

            <div className="col-md-3 mb-2">
              <select
                className="form-control form-control-sm"
                value={indicatorId}
                onChange={(e) => {
                  setCurrentPage(1);
                  updateParams({ teach_subject_id: teachSubjectId, grade_level_id: gradeLevelId, indicator_id: e.target.value });
                }}
              >
                <option value="">ทุกประเภทตัวชี้วัด</option>
                {indicatorTypes.map((row) => (
                  <option key={row.indicator_id} value={row.indicator_id}>{row.indicator_name}</option>
                ))}
              </select>
            </div>

            <div className="col-md-3 mb-2">
              <input
                type="text"
                className="form-control form-control-sm"
                placeholder="ค้นหารายละเอียดตัวชี้วัด..."
                value={searchTerm}
                onChange={(e) => {
                  setSearchTerm(e.target.value);
                  setCurrentPage(1);
                }}
              />
            </div>
          </div>

          <div className="table-responsive">
            <table className="table table-hover align-middle mb-0 small">
              <thead className="bg-light">
                <tr>
                  <th style={{ width: '45px' }} className="text-center">ID</th>
                  <th>กลุ่มสาระ</th>
                  <th>ชั้น</th>
                  <th>มาตรฐาน</th>
                  <th>กลุ่ม</th>
                  <th>ตัวชี้วัด</th>
                  <th>ประเภท</th>
                  <th>คำอธิบาย</th>
                  <th style={{ width: '130px' }} className="text-center">การจัดการ</th>
                </tr>
              </thead>
              <tbody>
                {paginatedRows.length === 0 ? (
                  <tr>
                    <td colSpan="9" className="text-center py-4 text-muted">
                      ไม่พบข้อมูลตัวชี้วัดตามเงื่อนไขที่เลือก
                    </td>
                  </tr>
                ) : (
                  paginatedRows.map((row) => (
                    <tr key={row.id}>
                      <td className="text-center text-muted font-mono">{row.id}</td>
                      <td>{teachSubjectMap[row.teach_subject_id] || row.teach_subject_id}</td>
                      <td>
                        <span className="badge badge-light border">{gradeShortMap[row.grade_level_id] || row.grade_level_id}</span>
                      </td>
                      <td className="font-weight-bold">{row.content_s_name}</td>
                      <td className="text-center">{row.indicator_group}</td>
                      <td className="font-weight-bold text-primary">{row.indicators_name}</td>
                      <td>
                        <span className="badge badge-info font-weight-normal">{indicatorTypeMap[row.indicator_id] || row.indicator_id}</span>
                      </td>
                      <td style={{ maxWidth: '300px' }} className="text-truncate" title={row.indicators_details}>
                        {row.indicators_details}
                      </td>
                      <td className="text-center">
                        <div className="btn-group btn-group-sm">
                          <Link to={`/indicators_edit?id=${row.id}`} className="btn btn-outline-warning" title="แก้ไข">
                            <i className="fa-regular fa-pen-to-square"></i>
                          </Link>
                          <button
                            type="button"
                            className="btn btn-outline-danger"
                            onClick={() => handleDelete(row)}
                            title="ลบ"
                          >
                            <i className="fa-regular fa-trash-can"></i>
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="d-flex justify-content-between align-items-center mt-3 pt-3 border-top flex-wrap gap-2">
              <div className="text-muted small">
                หน้า {currentPage} จาก {totalPages} (แสดง {paginatedRows.length} จาก {filteredRows.length} รายการ)
              </div>
              <div className="btn-group btn-group-sm">
                <button
                  type="button"
                  className="btn btn-outline-secondary"
                  disabled={currentPage <= 1}
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                >
                  <i className="fa-solid fa-chevron-left mr-1"></i> ก่อนหน้า
                </button>
                <button
                  type="button"
                  className="btn btn-outline-secondary"
                  disabled={currentPage >= totalPages}
                  onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
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

export default Indicators;
