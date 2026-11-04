import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import Swal from 'sweetalert2';
import { supabase } from '../supabaseClient';
import { useAuth } from '../contexts/AuthContext';
import { useUserProfile } from '../hooks/useUserProfile';
import { useNotificationContext } from '../contexts/NotificationContext';
import useUserLookups from '../hooks/useUserLookups';
import useAppConfig from '../hooks/useAppConfig';
import { maskThaiId } from '../utils/scoreCalculator';
import { cleanThaiId, formatThaiId, isValidThaiId } from '../utils/thaiId';
import { showToast } from '../utils/toast';
import SearchableSelect from '../components/SearchableSelect';
import LoadingSpinner from '../components/LoadingSpinner';
import EmptyState from '../components/EmptyState';

const THAI_MONTHS_SHORT = [
  'ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.',
  'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.',
];

const formatThaiDateTime = (raw) => {
  if (!raw) return '-';
  const str = String(raw).trim();
  if (!str || str.startsWith('0000-00-00')) return '-';
  const dt = new Date(str.includes('T') ? str : str.replace(' ', 'T'));
  if (Number.isNaN(dt.getTime())) return str;
  const d = dt.getDate();
  const m = THAI_MONTHS_SHORT[dt.getMonth()] || '';
  const y = dt.getFullYear() >= 2400 ? dt.getFullYear() : dt.getFullYear() + 543;
  const hh = String(dt.getHours()).padStart(2, '0');
  const mm = String(dt.getMinutes()).padStart(2, '0');
  return `${d} ${m} ${y} ${hh}:${mm} น.`;
};

const getEditModule = (level) => {
  if (level === 'directorschool') return 'directorschool_edit';
  if (level === 'supervisor' || level === 'supervision') return 'supervisor_edit';
  if (level === 'districdirector') return 'dd_edit';
  return 'teacher_edit';
};

const LEVEL_LABELS = {
  teacher: 'ครูผู้สอน',
  admin_school: 'School Admin',
  directorschool: 'ผอ./รอง ผอ.รร.',
  supervisor: 'ศึกษานิเทศก์',
  supervision: 'ผู้นิเทศ',
  districdirector: 'ผอ./รอง ผอ.เขต',
};

const ConfirmUser = () => {
  const { user } = useAuth();
  const { profile, loading: profileLoading } = useUserProfile();
  const notif = useNotificationContext();
  const { lookups, lists, loading: lookupsLoading } = useUserLookups();
  const { config, loading: configLoading } = useAppConfig();
  const areaCode = config.AREA_CODE10 || '1000650001';

  const activeRole =
    profile?.level ||
    user?.level_id ||
    user?.user_metadata?.role ||
    user?.role ||
    '';
  const isSchoolScoped = activeRole === 'admin_school' || activeRole === 'directorschool';
  const scopedSchool = isSchoolScoped
    ? profile?.school || user?.user_metadata?.school || user?.school || ''
    : '';

  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [rows, setRows] = useState([]);
  const [selectedIds, setSelectedIds] = useState([]);
  const [revealedIds, setRevealedIds] = useState(() => new Set());

  // Filter & Pagination state
  const [searchTerm, setSearchTerm] = useState('');
  const [schoolFilter, setSchoolFilter] = useState('');
  const [cidFilter, setCidFilter] = useState('all'); // 'all' | 'valid' | 'invalid'
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);

  const loadPendingUsers = useCallback(async () => {
    if (profileLoading || configLoading) return;
    if (isSchoolScoped && !scopedSchool) {
      setRows([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      const allPending = [];
      let offset = 0;
      const batchSize = 1000;

      while (true) {
        let query = supabase
          .from('tbl_Users')
          .select('*')
          .eq('register_isConfirm', '0');

        if (isSchoolScoped) {
          query = query.eq('school', scopedSchool);
        }

        const { data, error } = await query
          .order('register_date', { ascending: false })
          .order('id', { ascending: false })
          .range(offset, offset + batchSize - 1);

        if (error) throw error;
        const batch = data || [];
        allPending.push(...batch);
        if (batch.length < batchSize) break;
        offset += batchSize;
      }

      setRows(allPending);
      setSelectedIds((prev) => {
        const validSet = new Set(allPending.map((r) => r.id));
        return prev.filter((id) => validSet.has(id));
      });
    } catch (err) {
      console.error('ConfirmUser load error:', err);
      Swal.fire('เกิดข้อผิดพลาด', err.message || 'ไม่สามารถโหลดรายการรอยืนยันได้', 'error');
    } finally {
      setLoading(false);
    }
  }, [profileLoading, configLoading, isSchoolScoped, scopedSchool]);

  useEffect(() => {
    loadPendingUsers();
  }, [loadPendingUsers]);

  const buildApprovePayload = (sampleRow) => {
    const payload = {
      register_isConfirm: '1',
      status: '1',
    };
    if (sampleRow && Object.prototype.hasOwnProperty.call(sampleRow, 'approved')) {
      payload.approved = '1';
    }
    return payload;
  };

  const toggleRevealId = (id) => {
    setRevealedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const schoolOptions = useMemo(() => {
    const base = lists.school.filter((s) => String(s.school_id) !== String(areaCode));
    return [
      { value: '', label: '-- ทุกสถานศึกษา --' },
      { value: String(areaCode), label: lookups.school[areaCode] || 'สำนักงานเขตพื้นที่การศึกษา' },
      ...base.map((s) => ({
        value: String(s.school_id),
        label: s.school_name || s.school_id,
        subLabel: s.khet_code && lookups.khet[s.khet_code] ? `สหวิทยาเขต: ${lookups.khet[s.khet_code]}` : `รหัส: ${s.school_id}`,
      })),
    ];
  }, [lists.school, areaCode, lookups.school, lookups.khet]);

  const stats = useMemo(() => {
    let validCid = 0;
    let invalidCid = 0;
    rows.forEach((r) => {
      if (isValidThaiId(r.people_id)) validCid += 1;
      else invalidCid += 1;
    });
    return {
      total: rows.length,
      validCid,
      invalidCid,
    };
  }, [rows]);

  const filteredRows = useMemo(() => {
    const effectiveSchool = isSchoolScoped ? scopedSchool : schoolFilter;
    const term = searchTerm.trim().toLowerCase();

    return rows.filter((r) => {
      if (effectiveSchool && String(r.school || '') !== String(effectiveSchool)) {
        return false;
      }
      const valid = isValidThaiId(r.people_id);
      if (cidFilter === 'valid' && !valid) return false;
      if (cidFilter === 'invalid' && valid) return false;

      if (term) {
        const fullName = `${lookups.prefix[r.prefix] || ''}${r.name || ''} ${r.lastname || ''}`.toLowerCase();
        const cid = String(r.people_id || '').toLowerCase();
        const schoolName = (lookups.school[r.school] || '').toLowerCase();
        const posName = (lookups.position[r.position_id] || '').toLowerCase();
        const subjName = (lookups.teachSubject[r.teach_subject] || '').toLowerCase();
        const contact = `${r.phone || ''} ${r.email || ''}`.toLowerCase();
        if (
          !fullName.includes(term) &&
          !cid.includes(term) &&
          !schoolName.includes(term) &&
          !posName.includes(term) &&
          !subjName.includes(term) &&
          !contact.includes(term)
        ) {
          return false;
        }
      }
      return true;
    });
  }, [rows, isSchoolScoped, scopedSchool, schoolFilter, cidFilter, searchTerm, lookups]);

  useEffect(() => {
    setPage(1);
  }, [searchTerm, schoolFilter, cidFilter, pageSize]);

  const totalPages = Math.max(1, Math.ceil(filteredRows.length / pageSize));
  const safePage = Math.min(page, totalPages);
  const pagedRows = useMemo(() => {
    const start = (safePage - 1) * pageSize;
    return filteredRows.slice(start, start + pageSize);
  }, [filteredRows, safePage, pageSize]);

  const allFilteredSelected =
    filteredRows.length > 0 && filteredRows.every((r) => selectedIds.includes(r.id));

  const handleToggleSelectAllFiltered = (e) => {
    if (e.target.checked) {
      const merged = new Set([...selectedIds, ...filteredRows.map((r) => r.id)]);
      setSelectedIds(Array.from(merged));
    } else {
      const filteredSet = new Set(filteredRows.map((r) => r.id));
      setSelectedIds((prev) => prev.filter((id) => !filteredSet.has(id)));
    }
  };

  const handleSelectRow = (id, checked) => {
    if (checked) {
      setSelectedIds((prev) => (prev.includes(id) ? prev : [...prev, id]));
    } else {
      setSelectedIds((prev) => prev.filter((item) => item !== id));
    }
  };

  const handleConfirmSingle = async (row) => {
    const fullName = `${lookups.prefix[row.prefix] || ''}${row.name || ''} ${row.lastname || ''}`.trim();
    const valid = isValidThaiId(row.people_id);

    if (!valid) {
      const warn = await Swal.fire({
        title: 'เลขบัตรประชาชนไม่ผ่านการตรวจสอบ 13 หลัก',
        html: `ผู้สมัคร <strong>${fullName}</strong> มีเลขบัตร <code>${row.people_id || 'ไม่ระบุ'}</code> ซึ่งไม่ถูกต้องตามหลัก Checksum<br/>ท่านยังต้องการยืนยันอนุมัติบัญชีนี้หรือไม่?`,
        icon: 'warning',
        showCancelButton: true,
        confirmButtonColor: '#16a34a',
        confirmButtonText: 'ยืนยันอนุมัติ',
        cancelButtonText: 'ยกเลิก',
      });
      if (!warn.isConfirmed) return;
    }

    setActionLoading(true);
    try {
      let updateQuery = supabase
        .from('tbl_Users')
        .update(buildApprovePayload(row))
        .eq('id', row.id);

      if (isSchoolScoped) {
        updateQuery = updateQuery.eq('school', scopedSchool);
      }

      const { error } = await updateQuery;
      if (error) throw error;

      showToast(`อนุมัติบัญชี ${fullName} เรียบร้อยแล้ว`, 'success');
      setSelectedIds((prev) => prev.filter((item) => item !== row.id));
      await loadPendingUsers();
      notif?.refreshNotifications?.();
    } catch (err) {
      console.error('Confirm single error:', err);
      Swal.fire('เกิดข้อผิดพลาด', err.message || 'ไม่สามารถอนุมัติผู้ใช้งานได้', 'error');
    } finally {
      setActionLoading(false);
    }
  };

  const handleBulkConfirm = async () => {
    if (selectedIds.length === 0) {
      Swal.fire('แจ้งเตือน', 'กรุณาเลือกรายชื่อผู้สมัครที่ต้องการอนุมัติอย่างน้อย 1 รายการ', 'info');
      return;
    }

    const selectedRows = rows.filter((r) => selectedIds.includes(r.id));
    const invalidCount = selectedRows.filter((r) => !isValidThaiId(r.people_id)).length;

    const confirm = await Swal.fire({
      title: `ยืนยันการอนุมัติ ${selectedIds.length} รายการ?`,
      html: `
        <div class="text-left small">
          <p class="mb-2">ระบบจะเปิดสิทธิ์เข้าใช้งาน (<code>register_isConfirm = 1</code>, <code>status = 1</code>) ให้แก่บุคลากรที่เลือกทั้งหมด <strong>${selectedIds.length} คน</strong></p>
          ${
            invalidCount > 0
              ? `<div class="p-2 rounded bg-warning-subtle border text-danger mb-0"><i class="fa-solid fa-triangle-exclamation mr-1"></i> พบผู้สมัครที่เลขบัตรไม่ผ่าน Checksum จำนวน <strong>${invalidCount} คน</strong> ในรายการที่เลือก</div>`
              : ''
          }
        </div>
      `,
      icon: 'question',
      showCancelButton: true,
      confirmButtonColor: '#2563eb',
      confirmButtonText: `ยืนยันอนุมัติ (${selectedIds.length})`,
      cancelButtonText: 'ยกเลิก',
    });

    if (!confirm.isConfirmed) return;

    setActionLoading(true);
    try {
      const payload = buildApprovePayload(selectedRows[0] || rows[0]);
      // Chunk updates in batches of 200 to prevent URL length limits
      const chunkSize = 200;
      for (let i = 0; i < selectedIds.length; i += chunkSize) {
        const chunk = selectedIds.slice(i, i + chunkSize);
        let q = supabase.from('tbl_Users').update(payload).in('id', chunk);
        if (isSchoolScoped) {
          q = q.eq('school', scopedSchool);
        }
        const { error } = await q;
        if (error) throw error;
      }

      showToast(`อนุมัติผู้ใช้งานสำเร็จ ${selectedIds.length} รายการ`, 'success');
      setSelectedIds([]);
      await loadPendingUsers();
      notif?.refreshNotifications?.();
    } catch (err) {
      console.error('Bulk confirm error:', err);
      Swal.fire('เกิดข้อผิดพลาด', err.message || 'ไม่สามารถอนุมัติรายการที่เลือกได้', 'error');
    } finally {
      setActionLoading(false);
    }
  };

  const handleRejectDelete = async (row) => {
    const fullName = `${lookups.prefix[row.prefix] || ''}${row.name || ''} ${row.lastname || ''}`.trim();
    const schoolName = lookups.school[row.school] || row.school || '-';

    try {
      if (row.people_id) {
        const [{ count: planCount }, { count: dupCount }] = await Promise.all([
          supabase
            .from('tbl_sendplan')
            .select('planid', { count: 'exact', head: true })
            .eq('people_id', row.people_id),
          supabase
            .from('tbl_Users')
            .select('id', { count: 'exact', head: true })
            .eq('people_id', row.people_id),
        ]);

        if ((planCount || 0) > 0 && (dupCount || 0) <= 1) {
          Swal.fire(
            'ไม่สามารถลบคำขอนี้ได้',
            `เลขบัตร ${row.people_id} มีประวัติแผนการสอนในระบบแล้ว ${planCount} แผน กรุณาตรวจสอบข้อมูลหรืออนุมัติแทนการลบ`,
            'warning'
          );
          return;
        }
      }

      const confirm = await Swal.fire({
        title: 'ปฏิเสธและลบคำขอสมัครสมาชิก?',
        html: `
          <div class="text-left small">
            <div class="p-3 rounded bg-light border mb-2">
              <div><strong>ชื่อ-นามสกุล:</strong> ${fullName || '-'}</div>
              <div><strong>เลขบัตร ปชช.:</strong> <code>${row.people_id || 'ไม่ระบุ'}</code></div>
              <div><strong>สถานศึกษา:</strong> ${schoolName}</div>
            </div>
            <p class="text-danger mb-0"><i class="fa-solid fa-trash-can mr-1"></i> คำขอลงทะเบียนที่ยังไม่ผ่านการอนุมัตินี้จะถูกลบออกจากระบบทันที</p>
          </div>
        `,
        icon: 'warning',
        showCancelButton: true,
        confirmButtonColor: '#dc2626',
        confirmButtonText: 'ยืนยันปฏิเสธ/ลบคำขอ',
        cancelButtonText: 'ยกเลิก',
        reverseButtons: true,
      });

      if (!confirm.isConfirmed) return;

      setActionLoading(true);
      let delQ = supabase.from('tbl_Users').delete().eq('id', row.id);
      if (isSchoolScoped) {
        delQ = delQ.eq('school', scopedSchool);
      }
      const { error } = await delQ;
      if (error) throw error;

      showToast(`ปฏิเสธและลบคำขอของ ${fullName} แล้ว`, 'success');
      setSelectedIds((prev) => prev.filter((item) => item !== row.id));
      await loadPendingUsers();
      notif?.refreshNotifications?.();
    } catch (err) {
      console.error('Reject registration error:', err);
      Swal.fire('เกิดข้อผิดพลาด', err.message || 'ไม่สามารถลบคำขอได้', 'error');
    } finally {
      setActionLoading(false);
    }
  };

  if (profileLoading || lookupsLoading || configLoading || loading) {
    return <LoadingSpinner message="กำลังโหลดรายการคำขอยืนยันตัวตนบุคลากร..." />;
  }

  if (isSchoolScoped && !scopedSchool) {
    return (
      <EmptyState
        type="warning"
        icon="fa-school-lock"
        title="ไม่พบรหัสสถานศึกษาของบัญชีผู้ดูแล"
        message="บัญชีของท่านยังไม่ได้ผูกกับรหัสสถานศึกษา จึงไม่สามารถตรวจสอบคำขอสมัครสมาชิกได้ กรุณาติดต่อผู้ดูแลระบบระดับเขตพื้นที่"
      />
    );
  }

  return (
    <div className="container-fluid pb-4">
      {/* Page Header & KPI Summary */}
      <div className="card border-0 shadow-sm mb-3" style={{ borderRadius: '14px' }}>
        <div className="card-body p-3 p-md-4">
          <div className="d-flex flex-wrap justify-content-between align-items-center gap-3">
            <div>
              <div className="d-flex align-items-center flex-wrap gap-2">
                <h4 className="mb-0 font-weight-bold text-dark">
                  <i className="fa-solid fa-user-check text-primary mr-2"></i>
                  อนุมัติคำขอลงทะเบียนบุคลากรใหม่
                </h4>
                {isSchoolScoped ? (
                  <span className="badge badge-info px-2 py-1">
                    <i className="fa-solid fa-school mr-1"></i>
                    เฉพาะสถานศึกษา: {lookups.school[scopedSchool] || scopedSchool}
                  </span>
                ) : (
                  <span className="badge badge-primary px-2 py-1">ระดับเขตพื้นที่การศึกษา (ทุกสังกัด)</span>
                )}
              </div>
              <p className="text-muted small mb-0 mt-1">
                ตรวจสอบความถูกต้องของเลขประจำตัวประชาชน สังกัด และตำแหน่ง ก่อนอนุมัติเปิดสิทธิ์เข้าใช้งานระบบ LMSS
              </p>
            </div>

            <div className="d-flex flex-wrap align-items-center gap-2">
              <button
                type="button"
                className="btn btn-outline-secondary btn-sm"
                onClick={loadPendingUsers}
                disabled={actionLoading}
              >
                <i className="fa-solid fa-arrows-rotate mr-1"></i> รีเฟรช
              </button>
              <button
                type="button"
                className="btn btn-primary btn-sm font-weight-bold px-3 shadow-sm"
                onClick={handleBulkConfirm}
                disabled={actionLoading || selectedIds.length === 0}
              >
                <i className="fa-solid fa-users-check mr-1"></i>
                อนุมัติที่เลือก ({selectedIds.length})
              </button>
            </div>
          </div>

          {/* Filter Pills & Toolbar */}
          <hr className="my-3" />
          <div className="row align-items-end">
            <div className="col-lg-4 col-md-6 mb-2">
              <label className="small text-muted font-weight-bold mb-1">ค้นหาผู้สมัคร</label>
              <div className="input-group">
                <div className="input-group-prepend">
                  <span className="input-group-text bg-white">
                    <i className="fa-solid fa-magnifying-glass text-muted"></i>
                  </span>
                </div>
                <input
                  type="text"
                  className="form-control"
                  placeholder="ชื่อ-นามสกุล, เลขบัตร, ตำแหน่ง, เบอร์โทร..."
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

            <div className="col-lg-4 col-md-6 mb-2">
              <label className="small text-muted font-weight-bold mb-1">กรองตามสถานศึกษา / สังกัด</label>
              {isSchoolScoped ? (
                <input
                  type="text"
                  className="form-control bg-light"
                  value={lookups.school[scopedSchool] || scopedSchool}
                  readOnly
                />
              ) : (
                <SearchableSelect
                  options={schoolOptions}
                  value={schoolFilter}
                  onChange={(val) => setSchoolFilter(val)}
                  placeholder="-- ทุกสถานศึกษา --"
                />
              )}
            </div>

            <div className="col-lg-4 col-md-12 mb-2">
              <label className="small text-muted font-weight-bold mb-1 d-block">สถานะเลขบัตรประชาชน 13 หลัก</label>
              <div className="btn-group btn-group-sm w-100" role="group">
                <button
                  type="button"
                  className={`btn ${cidFilter === 'all' ? 'btn-dark' : 'btn-outline-secondary'}`}
                  onClick={() => setCidFilter('all')}
                >
                  ทั้งหมด ({stats.total})
                </button>
                <button
                  type="button"
                  className={`btn ${cidFilter === 'valid' ? 'btn-success' : 'btn-outline-success'}`}
                  onClick={() => setCidFilter('valid')}
                >
                  <i className="fa-solid fa-circle-check mr-1"></i> ถูกต้อง ({stats.validCid})
                </button>
                <button
                  type="button"
                  className={`btn ${cidFilter === 'invalid' ? 'btn-danger' : 'btn-outline-danger'}`}
                  onClick={() => setCidFilter('invalid')}
                >
                  <i className="fa-solid fa-triangle-exclamation mr-1"></i> ผิดหลัก ({stats.invalidCid})
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Table Card */}
      <div className="card border-0 shadow-sm" style={{ borderRadius: '14px' }}>
        <div className="card-header bg-white border-bottom py-3 d-flex flex-wrap justify-content-between align-items-center">
          <div className="small text-muted">
            พบรายการรออนุมัติ <strong>{filteredRows.length.toLocaleString()}</strong> รายการ
            {selectedIds.length > 0 && (
              <span className="ml-2 badge badge-primary">
                เลือกไว้ {selectedIds.length} รายการ
              </span>
            )}
          </div>
          <div className="d-flex align-items-center gap-2">
            <span className="small text-muted mr-1">แสดงหน้าละ:</span>
            <select
              className="form-control form-control-sm"
              style={{ width: '75px' }}
              value={pageSize}
              onChange={(e) => setPageSize(Number(e.target.value))}
            >
              <option value={25}>25</option>
              <option value={50}>50</option>
              <option value={100}>100</option>
            </select>
          </div>
        </div>

        <div className="card-body p-0">
          {filteredRows.length === 0 ? (
            <div className="p-4">
              <EmptyState
                type={rows.length === 0 ? 'success' : 'info'}
                icon={rows.length === 0 ? 'fa-circle-check' : 'fa-filter-circle-xmark'}
                title={rows.length === 0 ? 'ไม่มีคำขอลงทะเบียนค้างอนุมัติ' : 'ไม่พบรายการที่ตรงกับตัวกรอง'}
                message={
                  rows.length === 0
                    ? 'บุคลากรที่ลงทะเบียนเข้ามาได้รับการตรวจสอบและอนุมัติครบถ้วนทุกรายการแล้ว'
                    : 'ลองปรับเปลี่ยนคำค้นหาหรือล้างตัวกรองสถานศึกษาเพื่อดูรายการอื่น'
                }
                actionLabel={
                  rows.length > 0 && (searchTerm || schoolFilter || cidFilter !== 'all')
                    ? 'ล้างตัวกรองทั้งหมด'
                    : undefined
                }
                onAction={
                  rows.length > 0 && (searchTerm || schoolFilter || cidFilter !== 'all')
                    ? () => {
                        setSearchTerm('');
                        setSchoolFilter('');
                        setCidFilter('all');
                      }
                    : undefined
                }
              />
            </div>
          ) : (
            <div className="table-responsive">
              <table className="table table-hover align-middle mb-0">
                <thead className="thead-light">
                  <tr>
                    <th className="text-center" style={{ width: '44px' }}>
                      <input
                        type="checkbox"
                        checked={allFilteredSelected}
                        onChange={handleToggleSelectAllFiltered}
                        title="เลือกทั้งหมดตามตัวกรอง"
                      />
                    </th>
                    <th className="text-center" style={{ width: '54px' }}>#</th>
                    <th>ชื่อ - นามสกุล</th>
                    <th style={{ minWidth: '195px' }}>เลขบัตรประชาชน</th>
                    <th>สถานศึกษา / สังกัด</th>
                    <th>ตำแหน่ง / วิทยฐานะ</th>
                    <th>กลุ่มสาระฯ</th>
                    <th style={{ minWidth: '140px' }}>วันที่ลงทะเบียน</th>
                    <th className="text-center" style={{ minWidth: '195px' }}>การดำเนินการ</th>
                  </tr>
                </thead>
                <tbody>
                  {pagedRows.map((row, idx) => {
                    const rowNum = (safePage - 1) * pageSize + idx + 1;
                    const fullName = `${lookups.prefix[row.prefix] || ''}${row.name || ''} ${row.lastname || ''}`.trim();
                    const cidCleaned = cleanThaiId(row.people_id);
                    const cidValid = isValidThaiId(cidCleaned);
                    const isRevealed = revealedIds.has(row.id);
                    const isSelected = selectedIds.includes(row.id);
                    const editMod = getEditModule(row.level);

                    return (
                      <tr key={row.id} className={isSelected ? 'table-primary' : ''}>
                        <td className="text-center">
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={(e) => handleSelectRow(row.id, e.target.checked)}
                          />
                        </td>
                        <td className="text-center text-muted small">{rowNum}</td>
                        <td>
                          <div className="font-weight-bold text-dark">{fullName || '-'}</div>
                          <div className="small text-muted d-flex flex-wrap gap-2 mt-1">
                            <span className="badge badge-light border">
                              {LEVEL_LABELS[row.level] || row.level || 'ไม่ระบุสิทธิ์'}
                            </span>
                            {row.phone && (
                              <span>
                                <i className="fa-solid fa-phone text-muted mr-1"></i>
                                {row.phone}
                              </span>
                            )}
                            {row.email && (
                              <span>
                                <i className="fa-regular fa-envelope text-muted mr-1"></i>
                                {row.email}
                              </span>
                            )}
                          </div>
                        </td>
                        <td>
                          <div className="d-flex align-items-center flex-wrap gap-1">
                            <code className="text-dark font-weight-bold">
                              {row.people_id
                                ? isRevealed
                                  ? formatThaiId(row.people_id)
                                  : maskThaiId(row.people_id)
                                : '- ไม่ระบุ -'}
                            </code>
                            {row.people_id && (
                              <button
                                type="button"
                                className="btn btn-xs btn-link text-secondary p-0 ml-1"
                                onClick={() => toggleRevealId(row.id)}
                                title={isRevealed ? 'ซ่อนเลขบัตร' : 'แสดงเลขบัตรเต็ม'}
                              >
                                <i className={`fa-regular ${isRevealed ? 'fa-eye-slash' : 'fa-eye'}`}></i>
                              </button>
                            )}
                          </div>
                          <div className="mt-1">
                            {cidValid ? (
                              <span className="badge badge-success-subtle text-success border border-success small">
                                <i className="fa-solid fa-check mr-1"></i>13 หลักถูกต้อง
                              </span>
                            ) : (
                              <span className="badge badge-danger small">
                                <i className="fa-solid fa-triangle-exclamation mr-1"></i>
                                {!cidCleaned ? 'ไม่มีเลขบัตร' : `เลขบัตรผิด (${cidCleaned.length} หลัก)`}
                              </span>
                            )}
                          </div>
                        </td>
                        <td>
                          <div className="font-weight-500">
                            {lookups.school[row.school] || row.school || <span className="text-danger">ไม่ระบุสังกัด</span>}
                          </div>
                          {row.school && lookups.schoolKhet[row.school] && lookups.khet[lookups.schoolKhet[row.school]] && (
                            <div className="small text-muted">
                              {lookups.khet[lookups.schoolKhet[row.school]]}
                            </div>
                          )}
                        </td>
                        <td>
                          <div>{lookups.position[row.position_id] || <span className="text-muted">-</span>}</div>
                          <div className="small text-muted">
                            {lookups.academic[row.academic_id] || '-'}
                            {lookups.personType[row.persontype_id] ? ` • ${lookups.personType[row.persontype_id]}` : ''}
                          </div>
                        </td>
                        <td>
                          {lookups.teachSubject[row.teach_subject] ? (
                            <span className="badge badge-light border text-dark">
                              {lookups.teachSubject[row.teach_subject]}
                            </span>
                          ) : (
                            <span className="text-muted small">-</span>
                          )}
                        </td>
                        <td className="small text-muted">
                          {formatThaiDateTime(row.register_date)}
                        </td>
                        <td className="text-center">
                          <div className="btn-group btn-group-sm">
                            <button
                              type="button"
                              className="btn btn-success font-weight-bold"
                              onClick={() => handleConfirmSingle(row)}
                              disabled={actionLoading}
                              title="อนุมัติผู้ใช้งาน"
                            >
                              <i className="fa-solid fa-check mr-1"></i> อนุมัติ
                            </button>
                            <Link
                              to={`/${editMod}?id=${row.id}&people_id=${row.people_id || ''}`}
                              className="btn btn-outline-primary"
                              title="ตรวจสอบ/แก้ไขข้อมูลก่อนอนุมัติ"
                            >
                              <i className="fa-regular fa-pen-to-square"></i>
                            </Link>
                            <button
                              type="button"
                              className="btn btn-outline-danger"
                              onClick={() => handleRejectDelete(row)}
                              disabled={actionLoading}
                              title="ปฏิเสธและลบคำขอสมัคร"
                            >
                              <i className="fa-regular fa-trash-can"></i>
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

        {filteredRows.length > pageSize && (
          <div className="card-footer bg-white d-flex flex-wrap justify-content-between align-items-center py-2">
            <div className="small text-muted">
              แสดง {(safePage - 1) * pageSize + 1} - {Math.min(filteredRows.length, safePage * pageSize)} จาก{' '}
              {filteredRows.length} รายการ
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
    </div>
  );
};

export default ConfirmUser;
