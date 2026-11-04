import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import Swal from 'sweetalert2';
import { supabase } from '../supabaseClient';
import LoadingSpinner from '../components/LoadingSpinner';
import EmptyState from '../components/EmptyState';
import SearchableSelect from '../components/SearchableSelect';
import { showToast } from '../utils/toast';

const Strands = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const teachSubjectFilter = searchParams.get('Teach_Subject') || searchParams.get('teach_subject_id') || '';

  const [loading, setLoading] = useState(true);
  const [teachSubjects, setTeachSubjects] = useState([]);
  const [rows, setRows] = useState([]);
  const [standardCounts, setStandardCounts] = useState({});
  const [search, setSearch] = useState('');

  const subjectMap = useMemo(() => {
    const map = {};
    teachSubjects.forEach((row) => {
      map[row.teach_subject_id] = row.teach_subject;
    });
    return map;
  }, [teachSubjects]);

  const subjectOptions = useMemo(
    () =>
      teachSubjects.map((row) => ({
        value: String(row.teach_subject_id),
        label: row.teach_subject,
        subLabel: row.teach_subject_short ? `อักษรย่อ: ${row.teach_subject_short}` : `รหัส ${row.teach_subject_id}`,
      })),
    [teachSubjects]
  );

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      let strandsQuery = supabase
        .from('tbl_strands')
        .select('*')
        .order('strands_id', { ascending: true })
        .order('id', { ascending: true });
      if (teachSubjectFilter) {
        strandsQuery = strandsQuery.eq('teach_subject_id', teachSubjectFilter);
      }

      const [subjectRes, strandsRes, stdCountRes] = await Promise.all([
        supabase
          .from('tbl_system_Teach_Subject')
          .select('*')
          .eq('teach_subject_status', '1')
          .order('teach_subject_id', { ascending: true }),
        strandsQuery,
        supabase.from('tbl_content_standards').select('id, strands_id'),
      ]);

      if (subjectRes.error) throw subjectRes.error;
      if (strandsRes.error) throw strandsRes.error;
      if (stdCountRes.error) throw stdCountRes.error;

      const counts = {};
      (stdCountRes.data || []).forEach((s) => {
        if (!s.strands_id) return;
        counts[s.strands_id] = (counts[s.strands_id] || 0) + 1;
      });

      setTeachSubjects(subjectRes.data || []);
      setRows(strandsRes.data || []);
      setStandardCounts(counts);
    } catch (err) {
      console.error('Strands load error:', err);
      Swal.fire('ข้อผิดพลาด', err.message || 'ไม่สามารถโหลดข้อมูลสาระการเรียนรู้ได้', 'error');
    } finally {
      setLoading(false);
    }
  }, [teachSubjectFilter]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const filteredRows = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter((r) => {
      const subj = subjectMap[r.teach_subject_id] || '';
      return (
        String(r.strands_id || '').toLowerCase().includes(q) ||
        String(r.strands_name || '').toLowerCase().includes(q) ||
        subj.toLowerCase().includes(q)
      );
    });
  }, [rows, search, subjectMap]);

  const handleTeachSubjectChange = (value) => {
    if (!value) {
      navigate('/strands');
      return;
    }
    navigate(`/strands?Teach_Subject=${encodeURIComponent(value)}`);
  };

  const handleDelete = async (row) => {
    const childCount = standardCounts[row.strands_id] || 0;
    if (childCount > 0) {
      Swal.fire({
        icon: 'warning',
        title: 'ไม่สามารถลบสาระการเรียนรู้นี้ได้',
        html: `สาระที่ ${row.strands_order} <b>${row.strands_name}</b> มีมาตรฐานการเรียนรู้ผูกอยู่ <b>${childCount} มาตรฐาน</b><br/>กรุณาลบมาตรฐานภายใต้สาระนี้ก่อน`,
      });
      return;
    }

    const result = await Swal.fire({
      title: 'ยืนยันการลบสาระการเรียนรู้?',
      html: `ต้องการลบ <b>สาระที่ ${row.strands_order}: ${row.strands_name}</b> (รหัส <code>${row.strands_id}</code>) ใช่หรือไม่?`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#dc2626',
      confirmButtonText: 'ยืนยันการลบ',
      cancelButtonText: 'ยกเลิก',
      reverseButtons: true,
    });
    if (!result.isConfirmed) return;

    try {
      const { error } = await supabase.from('tbl_strands').delete().eq('id', row.id);
      if (error) throw error;
      showToast('ลบสาระการเรียนรู้เรียบร้อยแล้ว');
      loadData();
    } catch (err) {
      console.error(err);
      Swal.fire('ลบไม่สำเร็จ', err.message || 'ไม่สามารถลบสาระการเรียนรู้ได้', 'error');
    }
  };

  const addLink = teachSubjectFilter
    ? `/strands_add?Teach_Subject=${encodeURIComponent(teachSubjectFilter)}`
    : '/strands_add';

  const standardsTabLink = teachSubjectFilter
    ? `/content_standards?Teach_Subject=${encodeURIComponent(teachSubjectFilter)}`
    : '/content_standards';
  const indicatorsTabLink = teachSubjectFilter
    ? `/indicators?teach_subject_id=${encodeURIComponent(teachSubjectFilter)}`
    : '/indicators';

  if (loading) {
    return <LoadingSpinner message="กำลังโหลดข้อมูลสาระการเรียนรู้..." />;
  }

  return (
    <div>
      {/* Shared 3-Tier Curriculum Explorer Navigation */}
      <div className="card border-0 shadow-sm mb-3">
        <div className="card-body py-2 px-3 d-flex align-items-center justify-content-between flex-wrap gap-2">
          <div className="d-flex align-items-center flex-wrap gap-2">
            <Link to="/strands" className="btn btn-primary btn-sm font-weight-bold px-3">
              <i className="fa-solid fa-sitemap mr-1"></i> 1. สาระการเรียนรู้
            </Link>
            <i className="fa-solid fa-chevron-right text-muted small"></i>
            <Link to={standardsTabLink} className="btn btn-outline-secondary btn-sm px-3">
              <i className="fa-solid fa-book-bookmark mr-1"></i> 2. มาตรฐานการเรียนรู้
            </Link>
            <i className="fa-solid fa-chevron-right text-muted small"></i>
            <Link to={indicatorsTabLink} className="btn btn-outline-secondary btn-sm px-3">
              <i className="fa-solid fa-list-check mr-1"></i> 3. ตัวชี้วัดชั้นปี/ช่วงชั้น
            </Link>
          </div>
          <small className="text-muted">
            คลิกปุ่ม <b>ดูมาตรฐาน</b> ในตารางเพื่อเจาะลึกมาตรฐานภายใต้สาระนั้น
          </small>
        </div>
      </div>

      {/* Main Card */}
      <div className="card shadow-sm border-0">
        <div className="card-header bg-white py-3">
          <div className="d-flex justify-content-between align-items-center flex-wrap gap-2 mb-3">
            <div className="d-flex align-items-center gap-2">
              <span
                className="rounded d-inline-flex align-items-center justify-content-center bg-info-subtle text-info"
                style={{ width: '36px', height: '36px' }}
              >
                <i className="fa-solid fa-sitemap"></i>
              </span>
              <div>
                <h3 className="card-title m-0 font-weight-bold text-dark">จัดการสาระการเรียนรู้รายวิชา</h3>
                <small className="text-muted">แสดง {filteredRows.length} รายการ</small>
              </div>
            </div>

            <div className="d-flex flex-wrap gap-2">
              {(teachSubjectFilter || search) && (
                <button
                  type="button"
                  onClick={() => {
                    setSearch('');
                    navigate('/strands');
                  }}
                  className="btn btn-outline-secondary btn-sm"
                >
                  <i className="fa-solid fa-rotate-left mr-1"></i> แสดงทั้งหมด
                </button>
              )}
              <Link className="btn btn-primary btn-sm font-weight-bold px-3" to={addLink}>
                <i className="fa-solid fa-plus mr-1"></i> เพิ่มสาระการเรียนรู้
              </Link>
            </div>
          </div>

          <div className="row g-2">
            <div className="col-md-6">
              <SearchableSelect
                options={subjectOptions}
                value={teachSubjectFilter}
                onChange={handleTeachSubjectChange}
                placeholder="-- กรองตามกลุ่มสาระการเรียนรู้ทั้งหมด --"
              />
            </div>
            <div className="col-md-6">
              <div className="input-group">
                <div className="input-group-prepend">
                  <span className="input-group-text bg-light border-right-0">
                    <i className="fa-solid fa-magnifying-glass text-muted"></i>
                  </span>
                </div>
                <input
                  type="text"
                  className="form-control border-left-0"
                  placeholder="ค้นหารหัสสาระ หรือชื่อสาระการเรียนรู้..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
                {search && (
                  <div className="input-group-append">
                    <button type="button" className="btn btn-outline-secondary" onClick={() => setSearch('')}>
                      <i className="fa-solid fa-xmark"></i>
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        <div className="card-body p-0">
          {filteredRows.length === 0 ? (
            <div className="p-4">
              <EmptyState
                icon="fa-sitemap"
                message="ไม่พบสาระการเรียนรู้ตามเงื่อนไขที่เลือก"
                actionLabel={teachSubjectFilter || search ? 'ล้างตัวกรอง' : '+ เพิ่มสาระการเรียนรู้'}
                onAction={() => {
                  if (teachSubjectFilter || search) {
                    setSearch('');
                    navigate('/strands');
                  } else {
                    navigate(addLink);
                  }
                }}
              />
            </div>
          ) : (
            <div className="table-responsive">
              <table className="table table-hover mb-0">
                <thead>
                  <tr>
                    <th className="text-center" style={{ width: '120px' }}>รหัสสาระ</th>
                    <th style={{ width: '220px' }}>กลุ่มสาระการเรียนรู้</th>
                    <th className="text-center" style={{ width: '100px' }}>สาระที่</th>
                    <th>ชื่อสาระการเรียนรู้</th>
                    <th className="text-center" style={{ width: '150px' }}>มาตรฐานในสาระ</th>
                    <th className="text-center" style={{ width: '160px' }}>จัดการ</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredRows.map((row) => {
                    const stdCount = standardCounts[row.strands_id] || 0;
                    return (
                      <tr key={row.id}>
                        <td className="text-center font-weight-bold">
                          <code>{row.strands_id}</code>
                        </td>
                        <td>{subjectMap[row.teach_subject_id] || row.teach_subject_id}</td>
                        <td className="text-center">
                          <span className="badge bg-info-subtle text-info px-2 py-1">
                            สาระที่ {row.strands_order}
                          </span>
                        </td>
                        <td className="font-weight-semibold">{row.strands_name}</td>
                        <td className="text-center">
                          <Link
                            to={`/content_standards?Teach_Subject=${encodeURIComponent(
                              row.teach_subject_id
                            )}&strands_id=${encodeURIComponent(row.strands_id)}`}
                            className="btn btn-xs bg-primary-subtle text-primary font-weight-bold px-3 py-1"
                            style={{ borderRadius: '999px' }}
                          >
                            ดูมาตรฐาน ({stdCount}) <i className="fa-solid fa-arrow-right ml-1"></i>
                          </Link>
                        </td>
                        <td className="text-center">
                          <div className="d-inline-flex align-items-center flex-wrap gap-1 justify-content-center">
                            <Link
                              to={`/strands_edit?id=${encodeURIComponent(row.id)}`}
                              className="btn btn-sm btn-outline-primary py-1 px-2"
                              title="แก้ไขชื่อสาระการเรียนรู้"
                            >
                              <i className="fa-solid fa-pen-to-square"></i>
                            </Link>
                            <button
                              type="button"
                              onClick={() => handleDelete(row)}
                              className={`btn btn-sm py-1 px-2 ${
                                stdCount > 0 ? 'btn-outline-secondary' : 'btn-outline-danger'
                              }`}
                              title={stdCount > 0 ? `มีมาตรฐานผูกอยู่ ${stdCount} รายการ` : 'ลบสาระการเรียนรู้'}
                            >
                              <i className="fa-solid fa-trash-can"></i>
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Strands;
