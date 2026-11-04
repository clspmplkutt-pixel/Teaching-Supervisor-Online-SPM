import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import Swal from 'sweetalert2';
import { supabase } from '../supabaseClient';
import LoadingSpinner from '../components/LoadingSpinner';
import EmptyState from '../components/EmptyState';
import SearchableSelect from '../components/SearchableSelect';
import { showToast } from '../utils/toast';

const ContentStandards = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const teachSubjectFilter = searchParams.get('Teach_Subject') || searchParams.get('teach_subject_id') || '';
  const strandsFilter = searchParams.get('strands_id') || '';

  const [loading, setLoading] = useState(true);
  const [teachSubjects, setTeachSubjects] = useState([]);
  const [strands, setStrands] = useState([]);
  const [rows, setRows] = useState([]);
  const [search, setSearch] = useState('');

  const subjectMap = useMemo(() => {
    const map = {};
    teachSubjects.forEach((row) => {
      map[row.teach_subject_id] = row.teach_subject;
    });
    return map;
  }, [teachSubjects]);

  const strandsMap = useMemo(() => {
    const map = {};
    strands.forEach((row) => {
      map[row.strands_id] = `สาระที่ ${row.strands_order}: ${row.strands_name}`;
    });
    return map;
  }, [strands]);

  const subjectOptions = useMemo(
    () =>
      teachSubjects.map((row) => ({
        value: String(row.teach_subject_id),
        label: row.teach_subject,
        subLabel: row.teach_subject_short ? `อักษรย่อ: ${row.teach_subject_short}` : '',
      })),
    [teachSubjects]
  );

  const strandOptions = useMemo(() => {
    const list = teachSubjectFilter
      ? strands.filter((s) => String(s.teach_subject_id) === String(teachSubjectFilter))
      : strands;
    return list.map((row) => ({
      value: String(row.strands_id),
      label: `สาระที่ ${row.strands_order}: ${row.strands_name}`,
      subLabel: subjectMap[row.teach_subject_id] || `รหัส ${row.strands_id}`,
    }));
  }, [strands, teachSubjectFilter, subjectMap]);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      let query = supabase
        .from('tbl_content_standards')
        .select('*')
        .order('strands_id', { ascending: true })
        .order('content_s_name', { ascending: true });

      if (strandsFilter) {
        query = query.eq('strands_id', strandsFilter);
      } else if (teachSubjectFilter) {
        query = query.like('strands_id', `${teachSubjectFilter}%`);
      }

      const [subjectRes, strandsRes, contentRes] = await Promise.all([
        supabase
          .from('tbl_system_Teach_Subject')
          .select('*')
          .eq('teach_subject_status', '1')
          .order('teach_subject_id', { ascending: true }),
        supabase.from('tbl_strands').select('*').order('strands_id', { ascending: true }),
        query,
      ]);

      if (subjectRes.error) throw subjectRes.error;
      if (strandsRes.error) throw strandsRes.error;
      if (contentRes.error) throw contentRes.error;

      setTeachSubjects(subjectRes.data || []);
      setStrands(strandsRes.data || []);
      setRows(contentRes.data || []);
    } catch (err) {
      console.error('ContentStandards load error:', err);
      Swal.fire('ข้อผิดพลาด', err.message || 'ไม่สามารถโหลดมาตรฐานการเรียนรู้ได้', 'error');
    } finally {
      setLoading(false);
    }
  }, [teachSubjectFilter, strandsFilter]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const filteredRows = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter((r) => {
      const subjId = String(r.strands_id || '').slice(0, 4);
      const subjName = subjectMap[subjId] || '';
      const strandName = strandsMap[r.strands_id] || '';
      return (
        String(r.content_s_name || '').toLowerCase().includes(q) ||
        String(r.content_s_detail || '').toLowerCase().includes(q) ||
        subjName.toLowerCase().includes(q) ||
        strandName.toLowerCase().includes(q)
      );
    });
  }, [rows, search, subjectMap, strandsMap]);

  const updateFilterParams = (nextSubject, nextStrand) => {
    const params = new URLSearchParams();
    if (nextSubject) params.set('Teach_Subject', nextSubject);
    if (nextStrand) params.set('strands_id', nextStrand);
    const qs = params.toString();
    navigate(qs ? `/content_standards?${qs}` : '/content_standards');
  };

  const handleDelete = async (row) => {
    const { count, error: countErr } = await supabase
      .from('tbl_indicators')
      .select('id', { count: 'exact', head: true })
      .eq('content_s_name', row.content_s_name);

    if (countErr) {
      Swal.fire('ข้อผิดพลาด', countErr.message || 'ไม่สามารถตรวจสอบตัวชี้วัดอ้างอิงได้', 'error');
      return;
    }

    if ((count || 0) > 0) {
      Swal.fire({
        icon: 'warning',
        title: 'ไม่สามารถลบมาตรฐานการเรียนรู้นี้ได้',
        html: `มาตรฐาน <b>${row.content_s_name}</b> มีตัวชี้วัดผูกอยู่ <b>${count} ตัวชี้วัด</b><br/>กรุณาลบตัวชี้วัดภายใต้มาตรฐานนี้ก่อน`,
      });
      return;
    }

    const result = await Swal.fire({
      title: 'ยืนยันการลบมาตรฐานการเรียนรู้?',
      html: `ต้องการลบมาตรฐาน <b>${row.content_s_name}</b> ใช่หรือไม่?`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#dc2626',
      confirmButtonText: 'ยืนยันการลบ',
      cancelButtonText: 'ยกเลิก',
      reverseButtons: true,
    });
    if (!result.isConfirmed) return;

    try {
      const { error } = await supabase.from('tbl_content_standards').delete().eq('id', row.id);
      if (error) throw error;
      showToast(`ลบมาตรฐาน ${row.content_s_name} สำเร็จ`);
      loadData();
    } catch (err) {
      console.error(err);
      Swal.fire('ลบไม่สำเร็จ', err.message || 'ไม่สามารถลบมาตรฐานการเรียนรู้ได้', 'error');
    }
  };

  const addParams = new URLSearchParams();
  if (teachSubjectFilter) addParams.set('Teach_Subject', teachSubjectFilter);
  if (strandsFilter) addParams.set('strands_id', strandsFilter);
  const addLink = addParams.toString()
    ? `/content_standards_add?${addParams.toString()}`
    : '/content_standards_add';

  const strandsTabLink = teachSubjectFilter
    ? `/strands?Teach_Subject=${encodeURIComponent(teachSubjectFilter)}`
    : '/strands';
  const indicatorsTabLink = teachSubjectFilter
    ? `/indicators?teach_subject_id=${encodeURIComponent(teachSubjectFilter)}`
    : '/indicators';

  if (loading) {
    return <LoadingSpinner message="กำลังโหลดข้อมูลมาตรฐานการเรียนรู้..." />;
  }

  return (
    <div>
      {/* Shared 3-Tier Curriculum Explorer Navigation */}
      <div className="card border-0 shadow-sm mb-3">
        <div className="card-body py-2 px-3 d-flex align-items-center justify-content-between flex-wrap gap-2">
          <div className="d-flex align-items-center flex-wrap gap-2">
            <Link to={strandsTabLink} className="btn btn-outline-secondary btn-sm px-3">
              <i className="fa-solid fa-sitemap mr-1"></i> 1. สาระการเรียนรู้
            </Link>
            <i className="fa-solid fa-chevron-right text-muted small"></i>
            <Link to="/content_standards" className="btn btn-primary btn-sm font-weight-bold px-3">
              <i className="fa-solid fa-book-bookmark mr-1"></i> 2. มาตรฐานการเรียนรู้
            </Link>
            <i className="fa-solid fa-chevron-right text-muted small"></i>
            <Link to={indicatorsTabLink} className="btn btn-outline-secondary btn-sm px-3">
              <i className="fa-solid fa-list-check mr-1"></i> 3. ตัวชี้วัดชั้นปี/ช่วงชั้น
            </Link>
          </div>
          <small className="text-muted">
            คลิกปุ่ม <b>ดูตัวชี้วัด</b> ในตารางเพื่อดูตัวชี้วัดภายใต้มาตรฐานนั้น
          </small>
        </div>
      </div>

      {/* Main Card */}
      <div className="card shadow-sm border-0">
        <div className="card-header bg-white py-3">
          <div className="d-flex justify-content-between align-items-center flex-wrap gap-2 mb-3">
            <div className="d-flex align-items-center gap-2">
              <span
                className="rounded d-inline-flex align-items-center justify-content-center bg-success-subtle text-success"
                style={{ width: '36px', height: '36px' }}
              >
                <i className="fa-solid fa-book-bookmark"></i>
              </span>
              <div>
                <h3 className="card-title m-0 font-weight-bold text-dark">จัดการมาตรฐานการเรียนรู้รายวิชา</h3>
                <small className="text-muted">แสดง {filteredRows.length} มาตรฐานการเรียนรู้</small>
              </div>
            </div>

            <div className="d-flex flex-wrap gap-2">
              {(teachSubjectFilter || strandsFilter || search) && (
                <button
                  type="button"
                  onClick={() => {
                    setSearch('');
                    navigate('/content_standards');
                  }}
                  className="btn btn-outline-secondary btn-sm"
                >
                  <i className="fa-solid fa-rotate-left mr-1"></i> แสดงทั้งหมด
                </button>
              )}
              <Link className="btn btn-primary btn-sm font-weight-bold px-3" to={addLink}>
                <i className="fa-solid fa-plus mr-1"></i> เพิ่มมาตรฐานการเรียนรู้
              </Link>
            </div>
          </div>

          <div className="row g-2">
            <div className="col-md-4">
              <SearchableSelect
                options={subjectOptions}
                value={teachSubjectFilter}
                onChange={(val) => updateFilterParams(val, '')}
                placeholder="-- เลือกกลุ่มสาระการเรียนรู้ --"
              />
            </div>
            <div className="col-md-4">
              <SearchableSelect
                options={strandOptions}
                value={strandsFilter}
                onChange={(val) => {
                  const inferredSubj = val ? String(val).slice(0, 4) : teachSubjectFilter;
                  updateFilterParams(inferredSubj, val);
                }}
                placeholder="-- เลือกสาระการเรียนรู้ --"
              />
            </div>
            <div className="col-md-4">
              <div className="input-group">
                <div className="input-group-prepend">
                  <span className="input-group-text bg-light border-right-0">
                    <i className="fa-solid fa-magnifying-glass text-muted"></i>
                  </span>
                </div>
                <input
                  type="text"
                  className="form-control border-left-0"
                  placeholder="ค้นหารหัสมาตรฐาน (เช่น ท 1.1) หรือคำอธิบาย..."
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
                icon="fa-book-bookmark"
                message="ไม่พบมาตรฐานการเรียนรู้ตามเงื่อนไขที่เลือก"
                actionLabel={teachSubjectFilter || strandsFilter || search ? 'ล้างตัวกรอง' : '+ เพิ่มมาตรฐานการเรียนรู้'}
                onAction={() => {
                  if (teachSubjectFilter || strandsFilter || search) {
                    setSearch('');
                    navigate('/content_standards');
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
                    <th className="text-center" style={{ width: '65px' }}>ที่</th>
                    <th style={{ width: '160px' }}>กลุ่มสาระ</th>
                    <th style={{ width: '210px' }}>สาระการเรียนรู้</th>
                    <th className="text-center" style={{ width: '130px' }}>รหัสมาตรฐาน</th>
                    <th>คำอธิบายมาตรฐานการเรียนรู้</th>
                    <th className="text-center" style={{ width: '140px' }}>ตัวชี้วัด</th>
                    <th className="text-center" style={{ width: '115px' }}>จัดการ</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredRows.map((row, index) => {
                    const teachSubjectId = String(row.strands_id || '').slice(0, 4);
                    return (
                      <tr key={row.id}>
                        <td className="text-center text-muted">{index + 1}</td>
                        <td>{subjectMap[teachSubjectId] || teachSubjectId}</td>
                        <td>{strandsMap[row.strands_id] || row.strands_id}</td>
                        <td className="text-center">
                          <span className="badge bg-success-subtle text-success px-2 py-1 font-weight-bold" style={{ fontSize: '0.86rem' }}>
                            {row.content_s_name}
                          </span>
                        </td>
                        <td>{row.content_s_detail}</td>
                        <td className="text-center">
                          <Link
                            to={`/indicators?teach_subject_id=${encodeURIComponent(
                              teachSubjectId
                            )}&content_s_name=${encodeURIComponent(row.content_s_name)}`}
                            className="btn btn-xs bg-primary-subtle text-primary font-weight-bold px-3 py-1"
                            style={{ borderRadius: '999px' }}
                          >
                            ดูตัวชี้วัด <i className="fa-solid fa-arrow-right ml-1"></i>
                          </Link>
                        </td>
                        <td className="text-center">
                          <div className="d-inline-flex align-items-center flex-wrap gap-1 justify-content-center">
                            <Link
                              to={`/content_standards_edit?id=${encodeURIComponent(row.id)}`}
                              className="btn btn-sm btn-outline-primary py-1 px-2"
                              title="แก้ไขคำอธิบายมาตรฐาน"
                            >
                              <i className="fa-solid fa-pen-to-square"></i>
                            </Link>
                            <button
                              type="button"
                              onClick={() => handleDelete(row)}
                              className="btn btn-sm btn-outline-danger py-1 px-2"
                              title="ลบมาตรฐานการเรียนรู้"
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

export default ContentStandards;
