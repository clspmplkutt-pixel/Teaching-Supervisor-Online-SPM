import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import Swal from 'sweetalert2';
import { supabase } from '../supabaseClient';
import useUserLookups from '../hooks/useUserLookups';
import { formatThaiId } from '../utils/thaiId';
import { showToast } from '../utils/toast';
import LoadingSpinner from '../components/LoadingSpinner';
import EmptyState from '../components/EmptyState';

const getEditModule = (level) => {
  if (level === 'directorschool') return 'directorschool_edit';
  if (level === 'supervisor' || level === 'supervision') return 'supervisor_edit';
  if (level === 'districdirector') return 'dd_edit';
  return 'teacher_edit';
};

const formatDateTimeShort = (val) => {
  if (!val) return 'ไม่เคยเข้าสู่ระบบ';
  const str = String(val).trim();
  if (!str || str.startsWith('0000-00-00')) return 'ไม่เคยเข้าสู่ระบบ';
  const dt = new Date(str.includes('T') ? str : str.replace(' ', 'T'));
  if (Number.isNaN(dt.getTime())) return str;
  return dt.toLocaleString('th-TH', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
};

const scoreRecordPriority = (rec, schoolPlanCount) => {
  let score = 0;
  if (schoolPlanCount > 0) score += 1000 + schoolPlanCount * 10;
  if (String(rec.register_isConfirm) === '1') score += 100;
  if (String(rec.status) !== '0') score += 50;
  if (rec.lastlogin && !String(rec.lastlogin).startsWith('0000')) {
    const t = new Date(rec.lastlogin).getTime();
    if (!Number.isNaN(t)) score += Math.floor(t / 1e9);
  }
  return score;
};

const CheckupUserDuplicate = () => {
  const { lookups, loading: lookupsLoading } = useUserLookups();
  const [loading, setLoading] = useState(true);
  const [deletingId, setDeletingId] = useState(null);
  const [duplicateGroups, setDuplicateGroups] = useState([]);
  const [plansByCid, setPlansByCid] = useState({});
  const [searchTerm, setSearchTerm] = useState('');
  const [page, setPage] = useState(1);
  const pageSize = 15;

  const loadDuplicates = useCallback(async () => {
    setLoading(true);
    try {
      // 1. Loop-fetch ALL users (people_id + core fields) to avoid 1,000-row truncation
      const allUsers = [];
      let offset = 0;
      const batchSize = 1000;
      while (true) {
        const { data, error } = await supabase
          .from('tbl_Users')
          .select('*')
          .not('people_id', 'is', null)
          .neq('people_id', '')
          .order('id', { ascending: true })
          .range(offset, offset + batchSize - 1);
        if (error) throw error;
        const chunk = data || [];
        allUsers.push(...chunk);
        if (chunk.length < batchSize) break;
        offset += batchSize;
      }

      // Group by exact trimmed people_id
      const groupedMap = new Map();
      allUsers.forEach((row) => {
        const cid = String(row.people_id || '').trim();
        if (!cid) return;
        if (!groupedMap.has(cid)) groupedMap.set(cid, []);
        groupedMap.get(cid).push(row);
      });

      const dupEntries = [];
      const dupCids = [];
      groupedMap.forEach((records, cid) => {
        if (records.length > 1) {
          dupCids.push(cid);
          dupEntries.push({ people_id: cid, records });
        }
      });

      // 2. Fetch tbl_sendplan for duplicated people_ids in chunks
      const planMap = {};
      if (dupCids.length > 0) {
        const chunkSize = 150;
        for (let i = 0; i < dupCids.length; i += chunkSize) {
          const cidBatch = dupCids.slice(i, i + chunkSize);
          const { data: plans, error: planErr } = await supabase
            .from('tbl_sendplan')
            .select('planid, people_id, school_code')
            .in('people_id', cidBatch);
          if (planErr) throw planErr;
          (plans || []).forEach((p) => {
            const cid = String(p.people_id || '').trim();
            if (!planMap[cid]) {
              planMap[cid] = { total: 0, bySchool: {} };
            }
            planMap[cid].total += 1;
            const sc = String(p.school_code || '');
            planMap[cid].bySchool[sc] = (planMap[cid].bySchool[sc] || 0) + 1;
          });
        }
      }

      dupEntries.sort((a, b) => b.records.length - a.records.length || a.people_id.localeCompare(b.people_id));
      setPlansByCid(planMap);
      setDuplicateGroups(dupEntries);
    } catch (err) {
      console.error('CheckupUserDuplicate load error:', err);
      Swal.fire('เกิดข้อผิดพลาด', err.message || 'ไม่สามารถโหลดข้อมูลรายชื่อซ้ำซ้อนได้', 'error');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadDuplicates();
  }, [loadDuplicates]);

  const filteredGroups = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();
    if (!term) return duplicateGroups;
    return duplicateGroups.filter((group) => {
      if (group.people_id.toLowerCase().includes(term)) return true;
      return group.records.some((r) => {
        const name = `${lookups.prefix[r.prefix] || ''}${r.name || ''} ${r.lastname || ''}`.toLowerCase();
        const schoolName = (lookups.school[r.school] || String(r.school || '')).toLowerCase();
        return name.includes(term) || schoolName.includes(term) || String(r.id).includes(term);
      });
    });
  }, [duplicateGroups, searchTerm, lookups]);

  useEffect(() => {
    setPage(1);
  }, [searchTerm]);

  const totalRedundantRows = useMemo(
    () => duplicateGroups.reduce((acc, g) => acc + Math.max(0, g.records.length - 1), 0),
    [duplicateGroups]
  );

  const totalPages = Math.max(1, Math.ceil(filteredGroups.length / pageSize));
  const safePage = Math.min(page, totalPages);
  const pagedGroups = useMemo(() => {
    const start = (safePage - 1) * pageSize;
    return filteredGroups.slice(start, start + pageSize);
  }, [filteredGroups, safePage, pageSize]);

  const handleDeleteDuplicateRecord = async (group, targetRow) => {
    const cid = group.people_id;
    const planSummary = plansByCid[cid] || { total: 0, bySchool: {} };
    const schoolCode = String(targetRow.school || '');
    const schoolPlans = planSummary.bySchool[schoolCode] || 0;
    const remainingSiblings = group.records.filter((r) => r.id !== targetRow.id);
    const anotherSiblingSameSchool = remainingSiblings.some((r) => String(r.school || '') === schoolCode);

    // Block deletion if this would orphan plans!
    if (remainingSiblings.length === 0 && planSummary.total > 0) {
      Swal.fire(
        'ไม่อนุญาตให้ลบบัญชีสุดท้าย',
        `เลขบัตร ${cid} มีแผนการสอนในระบบ ${planSummary.total} แผน ต้องคงบัญชีหลักไว้อย่างน้อย 1 รายการ`,
        'error'
      );
      return;
    }

    if (schoolPlans > 0 && !anotherSiblingSameSchool) {
      Swal.fire(
        'ป้องกันการลบระเบียนที่มีแผนการสอนสังกัดโรงเรียนนี้',
        `ระเบียน #${targetRow.id} (${lookups.school[schoolCode] || schoolCode}) มีแผนการสอนผูกอยู่ ${schoolPlans} แผน และไม่มีระเบียนอื่นในสังกัดเดียวกัน กรุณาลบเฉพาะระเบียนซ้ำที่ว่างเปล่าแทน`,
        'warning'
      );
      return;
    }

    const fullName = `${lookups.prefix[targetRow.prefix] || ''}${targetRow.name || ''} ${targetRow.lastname || ''}`.trim();
    const confirm = await Swal.fire({
      title: `ยืนยันการลบระเบียนซ้ำ #${targetRow.id}?`,
      html: `
        <div class="text-left small">
          <div class="p-3 rounded bg-light border mb-2">
            <div><strong>รหัสอ้างอิงที่จะลบ:</strong> <span class="text-danger font-weight-bold">#${targetRow.id}</span></div>
            <div><strong>เลขประจำตัวประชาชน:</strong> <code>${cid}</code></div>
            <div><strong>ชื่อ-นามสกุล:</strong> ${fullName}</div>
            <div><strong>สังกัด:</strong> ${lookups.school[schoolCode] || schoolCode || '-'}</div>
            <div><strong>คงเหลือบัญชีหลักอีก:</strong> ${remainingSiblings.length} รายการ</div>
          </div>
          <p class="text-danger mb-0"><i class="fa-solid fa-shield-halved mr-1"></i> ระบบจะลบเฉพาะแถว <code>id = ${targetRow.id}</code> เท่านั้น ไม่กระทบข้อมูลแผนการสอนและบัญชีหลักที่เหลือ</p>
        </div>
      `,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#dc2626',
      confirmButtonText: `ลบระเบียนซ้ำ #${targetRow.id}`,
      cancelButtonText: 'ยกเลิก',
      reverseButtons: true,
    });

    if (!confirm.isConfirmed) return;

    setDeletingId(targetRow.id);
    try {
      const { error } = await supabase.from('tbl_Users').delete().eq('id', targetRow.id);
      if (error) throw error;
      showToast(`ลบระเบียนซ้ำ #${targetRow.id} สำเร็จแล้ว`, 'success');
      await loadDuplicates();
    } catch (err) {
      console.error('Delete duplicate record error:', err);
      Swal.fire('เกิดข้อผิดพลาด', err.message || 'ไม่สามารถลบระเบียนซ้ำได้', 'error');
    } finally {
      setDeletingId(null);
    }
  };

  if (loading || lookupsLoading) {
    return <LoadingSpinner message="กำลังสแกนเปรียบเทียบรายชื่อบุคลากรซ้ำซ้อนทั้งระบบ..." />;
  }

  return (
    <div className="container-fluid pb-4">
      {/* Header Banner */}
      <div className="card border-0 shadow-sm mb-3" style={{ borderRadius: '14px' }}>
        <div className="card-body p-3 p-md-4">
          <div className="d-flex flex-wrap justify-content-between align-items-center gap-3">
            <div>
              <h4 className="mb-1 font-weight-bold text-dark">
                <i className="fa-solid fa-clone text-warning mr-2"></i>
                ตรวจสอบรายชื่อบุคลากรซ้ำซ้อน
              </h4>
              <p className="text-muted small mb-0">
                เปรียบเทียบข้อมูลแบบเคียงข้างกัน (Side-by-Side) ตามเลขประจำตัวประชาชน เพื่อเก็บเฉพาะบัญชีหลักที่มีแผนการสอนและลบบัญชีว่างที่ซ้ำซ้อนออกอย่างปลอดภัย
              </p>
            </div>
            <div className="d-flex flex-wrap align-items-center gap-2">
              <span className="badge badge-warning text-dark px-3 py-2" style={{ fontSize: '0.85rem' }}>
                พบซ้ำ {duplicateGroups.length.toLocaleString()} เลขบัตร ({totalRedundantRows.toLocaleString()} รายการเกิน)
              </span>
              <Link to="/checkupUser" className="btn btn-outline-secondary btn-sm">
                <i className="fa-solid fa-stethoscope mr-1"></i> ตรวจสุขภาพข้อมูลทั่วไป
              </Link>
              <button
                type="button"
                className="btn btn-outline-primary btn-sm"
                onClick={loadDuplicates}
                disabled={Boolean(deletingId)}
              >
                <i className="fa-solid fa-arrows-rotate mr-1"></i> รีเฟรช
              </button>
            </div>
          </div>

          {duplicateGroups.length > 0 && (
            <>
              <hr className="my-3" />
              <div className="row">
                <div className="col-md-6">
                  <div className="input-group">
                    <div className="input-group-prepend">
                      <span className="input-group-text bg-white">
                        <i className="fa-solid fa-magnifying-glass text-muted"></i>
                      </span>
                    </div>
                    <input
                      type="text"
                      className="form-control"
                      placeholder="ค้นหาเลขบัตรประชาชน, ชื่อ-นามสกุล, โรงเรียน หรือ ID..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                    />
                    {searchTerm && (
                      <div className="input-group-append">
                        <button
                          type="button"
                          className="btn btn-outline-secondary"
                          onClick={() => setSearchTerm('')}
                        >
                          <i className="fa-solid fa-xmark"></i>
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Duplicate Comparison Groups */}
      {filteredGroups.length === 0 ? (
        <div className="card border-0 shadow-sm p-4" style={{ borderRadius: '14px' }}>
          <EmptyState
            type={duplicateGroups.length === 0 ? 'success' : 'info'}
            icon={duplicateGroups.length === 0 ? 'fa-circle-check' : 'fa-magnifying-glass'}
            title={
              duplicateGroups.length === 0
                ? 'ไม่พบบัญชีบุคลากรซ้ำซ้อนในระบบ'
                : 'ไม่พบเลขบัตรซ้ำที่ตรงกับคำค้นหา'
            }
            message={
              duplicateGroups.length === 0
                ? 'เลขประจำตัวประชาชนของบุคลากรทุกรายการมีความเป็นเอกลักษณ์ (1 คน 1 บัญชี) เรียบร้อยแล้ว'
                : 'ลองค้นหาด้วยเลขบัตรหรือชื่ออื่น หรือล้างช่องค้นหา'
            }
            actionLabel={duplicateGroups.length > 0 && searchTerm ? 'ล้างคำค้นหา' : undefined}
            onAction={duplicateGroups.length > 0 && searchTerm ? () => setSearchTerm('') : undefined}
          />
        </div>
      ) : (
        <div>
          {pagedGroups.map((group, gIdx) => {
            const cid = group.people_id;
            const planInfo = plansByCid[cid] || { total: 0, bySchool: {} };

            // Determine recommended primary record
            const ranked = [...group.records].sort(
              (a, b) =>
                scoreRecordPriority(b, planInfo.bySchool[String(b.school || '')] || 0) -
                scoreRecordPriority(a, planInfo.bySchool[String(a.school || '')] || 0)
            );
            const primaryId = ranked[0]?.id;

            return (
              <div
                key={cid}
                className="card border-0 shadow-sm mb-3"
                style={{ borderRadius: '14px', overflow: 'hidden' }}
              >
                <div className="card-header bg-light d-flex flex-wrap justify-content-between align-items-center py-2 px-3">
                  <div className="d-flex align-items-center flex-wrap gap-2">
                    <span className="badge badge-dark">
                      กลุ่มที่ {(safePage - 1) * pageSize + gIdx + 1}
                    </span>
                    <span className="font-weight-bold text-dark">
                      เลขบัตรประชาชน: <code className="text-primary font-weight-bold">{formatThaiId(cid) || cid}</code>
                    </span>
                    <span className="badge badge-danger">ซ้ำ {group.records.length} บัญชี</span>
                  </div>
                  <div>
                    {planInfo.total > 0 ? (
                      <span className="badge badge-primary px-2 py-1">
                        <i className="fa-solid fa-file-lines mr-1"></i>
                        มีแผนการสอนในระบบรวม {planInfo.total} แผน
                      </span>
                    ) : (
                      <span className="badge badge-secondary px-2 py-1">ยังไม่มีประวัติการส่งแผน</span>
                    )}
                  </div>
                </div>

                <div className="card-body p-3">
                  <div className="row">
                    {group.records.map((rec) => {
                      const isPrimary = rec.id === primaryId;
                      const fullName = `${lookups.prefix[rec.prefix] || ''}${rec.name || ''} ${rec.lastname || ''}`.trim();
                      const schoolCode = String(rec.school || '');
                      const schoolPlans = planInfo.bySchool[schoolCode] || 0;
                      const siblingsSameSchool = group.records.filter(
                        (r) => r.id !== rec.id && String(r.school || '') === schoolCode
                      ).length;
                      const isProtectedByPlans = schoolPlans > 0 && siblingsSameSchool === 0;
                      const editMod = getEditModule(rec.level);

                      return (
                        <div className="col-lg-6 mb-3 mb-lg-2" key={rec.id}>
                          <div
                            className="h-100 p-3 rounded border"
                            style={{
                              borderColor: isPrimary ? '#16a34a' : '#e2e8f0',
                              backgroundColor: isPrimary ? '#f0fdf4' : '#ffffff',
                              borderWidth: isPrimary ? '2px' : '1px',
                            }}
                          >
                            <div className="d-flex justify-content-between align-items-start mb-2">
                              <div>
                                <span className="badge badge-dark mr-2">ID #{rec.id}</span>
                                {isPrimary ? (
                                  <span className="badge badge-success">
                                    <i className="fa-solid fa-star mr-1"></i> แนะนำให้เก็บไว้ (บัญชีหลัก)
                                  </span>
                                ) : (
                                  <span className="badge badge-warning text-dark">
                                    <i className="fa-solid fa-triangle-exclamation mr-1"></i> บัญชีซ้ำซ้อน
                                  </span>
                                )}
                              </div>
                              <div>
                                {String(rec.register_isConfirm) === '1' ? (
                                  <span className="badge badge-outline-success text-success border border-success small">
                                    ยืนยันแล้ว
                                  </span>
                                ) : (
                                  <span className="badge badge-warning small">รอยืนยัน</span>
                                )}
                              </div>
                            </div>

                            <div className="font-weight-bold text-dark mb-1" style={{ fontSize: '1.02rem' }}>
                              {fullName || '- ไม่ระบุชื่อ -'}
                            </div>

                            <div className="small text-muted mb-2">
                              <div>
                                <strong>ระดับสิทธิ์:</strong>{' '}
                                <span className="text-dark">{rec.level || '-'}</span>
                                {lookups.position[rec.position_id] ? ` (${lookups.position[rec.position_id]})` : ''}
                              </div>
                              <div>
                                <strong>โรงเรียน / สังกัด:</strong>{' '}
                                <span className="text-dark">
                                  {lookups.school[schoolCode] || schoolCode || '- ไม่ระบุ -'}
                                </span>
                              </div>
                              <div>
                                <strong>วันเกิด (ค.ศ.):</strong>{' '}
                                <code>{rec.birthday || '-'}</code>
                              </div>
                              <div>
                                <strong>เข้าใช้งานล่าสุด:</strong>{' '}
                                <span className="text-dark">{formatDateTimeShort(rec.lastlogin)}</span>
                              </div>
                              <div>
                                <strong>จำนวนแผนที่ส่ง (สังกัดนี้):</strong>{' '}
                                {schoolPlans > 0 ? (
                                  <span className="badge badge-primary">{schoolPlans} แผน</span>
                                ) : (
                                  <span className="text-muted">0 แผน</span>
                                )}
                              </div>
                            </div>

                            <div className="d-flex flex-wrap justify-content-between align-items-center pt-2 border-top gap-2">
                              <Link
                                to={`/${editMod}?id=${rec.id}&people_id=${encodeURIComponent(cid)}&peopleid_error=peopleidDup`}
                                className="btn btn-sm btn-outline-primary"
                              >
                                <i className="fa-regular fa-pen-to-square mr-1"></i> แก้ไขข้อมูล (#{rec.id})
                              </Link>

                              {isProtectedByPlans ? (
                                <span
                                  className="small text-success font-weight-bold"
                                  title="มีแผนการสอนผูกอยู่กับสังกัดนี้ ระบบล็อกป้องกันการลบ"
                                >
                                  <i className="fa-solid fa-lock mr-1"></i> มีแผนการสอน (ห้ามลบ)
                                </span>
                              ) : (
                                <button
                                  type="button"
                                  className={`btn btn-sm ${isPrimary ? 'btn-outline-danger' : 'btn-danger'}`}
                                  onClick={() => handleDeleteDuplicateRecord(group, rec)}
                                  disabled={deletingId === rec.id}
                                >
                                  <i className="fa-regular fa-trash-can mr-1"></i>
                                  {deletingId === rec.id ? 'กำลังลบ...' : `ลบรายการซ้ำ (#${rec.id})`}
                                </button>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            );
          })}

          {filteredGroups.length > pageSize && (
            <div className="d-flex justify-content-between align-items-center bg-white p-3 rounded shadow-sm">
              <div className="small text-muted">
                แสดงกลุ่มที่ {(safePage - 1) * pageSize + 1} -{' '}
                {Math.min(filteredGroups.length, safePage * pageSize)} จาก {filteredGroups.length} กลุ่มเลขบัตรซ้ำ
              </div>
              <div className="btn-group btn-group-sm">
                <button
                  type="button"
                  className="btn btn-outline-secondary"
                  disabled={safePage <= 1}
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                >
                  <i className="fa-solid fa-chevron-left"></i> ก่อนหน้า
                </button>
                <span className="btn btn-light disabled font-weight-bold">
                  หน้า {safePage} / {totalPages}
                </span>
                <button
                  type="button"
                  className="btn btn-outline-secondary"
                  disabled={safePage >= totalPages}
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                >
                  ถัดไป <i className="fa-solid fa-chevron-right"></i>
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default CheckupUserDuplicate;
