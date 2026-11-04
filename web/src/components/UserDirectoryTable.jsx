import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import Swal from 'sweetalert2';
import { supabase } from '../supabaseClient';
import { useAuth } from '../contexts/AuthContext';
import { useUserProfile } from '../hooks/useUserProfile';
import useUserLookups from '../hooks/useUserLookups';
import useAppConfig from '../hooks/useAppConfig';
import { maskThaiId } from '../utils/scoreCalculator';
import { cleanThaiId, formatThaiId, isValidThaiId } from '../utils/thaiId';
import { encryptLegacyPassword } from '../utils/legacyCrypto';
import { showToast } from '../utils/toast';
import SearchableSelect from './SearchableSelect';
import LoadingSpinner from './LoadingSpinner';
import EmptyState from './EmptyState';

const PAGE_SIZE_OPTIONS = [25, 50, 100];

const normalizeBirthdayPassword = (birthday) => {
  if (!birthday) return '';
  const clean = String(birthday).trim().slice(0, 10);
  const parts = clean.split('-');
  if (parts.length !== 3) return '';
  let y = parseInt(parts[0], 10);
  if (Number.isNaN(y) || y <= 1900) return '';
  if (y >= 2400) y -= 543;
  const m = parts[1].padStart(2, '0');
  const d = parts[2].padStart(2, '0');
  if (m === '00' || d === '00') return '';
  return `${y}${m}${d}`;
};

const resolveEditRoute = (row, editVariant) => {
  if (typeof editVariant === 'function') {
    return editVariant(row);
  }
  let base = 'teacher_edit';
  if (editVariant === 'directorschool') base = 'directorschool_edit';
  else if (editVariant === 'supervisor') base = 'supervisor_edit';
  else if (editVariant === 'dd') base = 'dd_edit';
  else if (!editVariant) {
    if (row.level === 'directorschool') base = 'directorschool_edit';
    else if (row.level === 'supervisor' || row.level === 'supervision') base = 'supervisor_edit';
    else if (row.level === 'districdirector') base = 'dd_edit';
  }

  const params = new URLSearchParams();
  if (row.people_id) params.set('people_id', row.people_id);
  if (row.id) params.set('id', String(row.id));
  return `/${base}?${params.toString()}`;
};

/**
 * UserDirectoryTable - Reusable Server-Side Paginated Staff Directory
 * Eliminates the 1,000-row truncation ceiling and legacy GET-mutation URLs (/updatepwd, /resetPwd, /user_remove).
 */
const UserDirectoryTable = ({
  title = 'ทำเนียบบุคลากร',
  subtitle = '',
  icon = 'fa-users',
  accentColor = 'primary',
  applyBaseFilter,
  editVariant = 'teacher',
  showSchoolFilter = true,
  excludeAreaFromSchools = true,
  showSubjectFilter = false,
  showAcademicFilter = true,
  showKhetFilter = false,
  showPositionFilter = false,
  positionFilterOptions = null,
  showStatusFilter = false,
  columns = {},
  headerActions = null,
  infoBanner = null,
  renderCustomActions = null,
  allowEdit = true,
  allowResetPassword = true,
  allowDelete = true,
  defaultPageSize = 25,
  orderBy = null,
  refreshKey = 0,
  emptyTitle = 'ไม่พบข้อมูลบุคลากร',
  emptyMessage = 'ยังไม่มีรายชื่อบุคลากรตามเงื่อนไขที่เลือกในขณะนี้',
}) => {
  const { user } = useAuth();
  const { profile, loading: profileLoading } = useUserProfile();
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
  const scopedSchoolId = isSchoolScoped
    ? profile?.school || user?.user_metadata?.school || user?.school || ''
    : '';

  const [searchParams, setSearchParams] = useSearchParams();

  const [searchInput, setSearchInput] = useState(searchParams.get('q') || '');
  const [debouncedSearch, setDebouncedSearch] = useState(searchParams.get('q') || '');
  const [page, setPage] = useState(Math.max(1, parseInt(searchParams.get('page') || '1', 10) || 1));
  const [pageSize, setPageSize] = useState(defaultPageSize);

  const [rows, setRows] = useState([]);
  const [totalCount, setTotalCount] = useState(0);
  const [tableLoading, setTableLoading] = useState(true);
  const [revealedIds, setRevealedIds] = useState(() => new Set());

  // Inline Password Reset Modal State
  const [resetModal, setResetModal] = useState({
    open: false,
    target: null,
    mode: 'birthday', // 'birthday' | 'cid' | 'custom'
    customPassword: '',
    saving: false,
    completedPassword: '',
    copied: false,
  });

  const selectedSchool = isSchoolScoped ? scopedSchoolId : searchParams.get('school_id') || '';
  const selectedSubject = searchParams.get('teach_subject') || searchParams.get('Teach_Subject') || '';
  const selectedAcademic = searchParams.get('academic_id') || '';
  const selectedKhet = searchParams.get('khet_code') || '';
  const selectedPosition = searchParams.get('position_id') || '';
  const selectedStatus = searchParams.get('confirm_status') || '';

  // Debounce search text
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchInput.trim());
    }, 320);
    return () => clearTimeout(timer);
  }, [searchInput]);

  const updateFilterParam = (key, val) => {
    const next = new URLSearchParams(searchParams);
    if (key === 'teach_subject') next.delete('Teach_Subject');
    if (val) next.set(key, String(val));
    else next.delete(key);
    next.delete('page');
    setPage(1);
    setSearchParams(next, { replace: true });
  };

  const handleClearAllFilters = () => {
    setSearchInput('');
    setDebouncedSearch('');
    setPage(1);
    setSearchParams(new URLSearchParams(), { replace: true });
  };

  const schoolOptions = useMemo(() => {
    const base = excludeAreaFromSchools
      ? lists.school.filter((s) => String(s.school_id) !== String(areaCode))
      : lists.school;
    return [
      { value: '', label: '-- ทุกสถานศึกษา --' },
      ...base.map((s) => ({
        value: String(s.school_id),
        label: s.school_name || s.school_id,
        subLabel: s.khet_code && lookups.khet[s.khet_code] ? `สหวิทยาเขต: ${lookups.khet[s.khet_code]}` : `รหัส: ${s.school_id}`,
      })),
    ];
  }, [lists.school, excludeAreaFromSchools, areaCode, lookups.khet]);

  const subjectOptions = useMemo(
    () => [
      { value: '', label: '-- ทุกกลุ่มสาระการเรียนรู้ --' },
      ...lists.teachSubject.map((s) => ({
        value: String(s.teach_subject_id),
        label: s.teach_subject,
      })),
    ],
    [lists.teachSubject]
  );

  const academicOptions = useMemo(
    () => [
      { value: '', label: '-- ทุกวิทยฐานะ --' },
      ...lists.academic.map((a) => ({
        value: String(a.academic_id),
        label: a.academic_standing,
      })),
    ],
    [lists.academic]
  );

  const khetOptions = useMemo(
    () => [
      { value: '', label: '-- ทุกสหวิทยาเขต --' },
      ...lists.khet.map((k) => ({
        value: String(k.khet_code),
        label: k.khet_name,
      })),
    ],
    [lists.khet]
  );

  const resolvedPositionOptions = useMemo(() => {
    if (Array.isArray(positionFilterOptions) && positionFilterOptions.length > 0) {
      return [{ value: '', label: '-- ทุกตำแหน่ง --' }, ...positionFilterOptions];
    }
    return [
      { value: '', label: '-- ทุกตำแหน่ง --' },
      ...lists.position.map((p) => ({
        value: String(p.position_id),
        label: p.position_name,
      })),
    ];
  }, [positionFilterOptions, lists.position]);

  const resolvedOrder = useMemo(() => {
    if (Array.isArray(orderBy) && orderBy.length > 0) return orderBy;
    return [
      { field: 'school', ascending: true },
      { field: 'position_id', ascending: false },
      { field: 'academic_id', ascending: true },
      { field: 'id', ascending: true },
    ];
  }, [orderBy]);

  const fetchPage = useCallback(async () => {
    if (profileLoading || configLoading) return;
    if (isSchoolScoped && !scopedSchoolId) {
      setRows([]);
      setTotalCount(0);
      setTableLoading(false);
      return;
    }

    setTableLoading(true);
    try {
      let query = supabase.from('tbl_Users').select('*', { count: 'exact' });

      if (typeof applyBaseFilter === 'function') {
        const maybeFiltered = applyBaseFilter(query, { areaCode, isSchoolScoped, scopedSchoolId });
        if (maybeFiltered === null) {
          // Explicit empty signal (e.g. empty IN list)
          setRows([]);
          setTotalCount(0);
          setTableLoading(false);
          return;
        }
        if (maybeFiltered) query = maybeFiltered;
      }

      if (isSchoolScoped) {
        query = query.eq('school', scopedSchoolId);
      } else if (selectedSchool) {
        query = query.eq('school', selectedSchool);
      }

      if (selectedSubject) {
        query = query.eq('teach_subject', selectedSubject);
      }
      if (selectedAcademic) {
        query = query.eq('academic_id', selectedAcademic);
      }
      if (selectedKhet) {
        query = query.eq('khet_code', selectedKhet);
      }
      if (selectedPosition) {
        query = query.eq('position_id', selectedPosition);
      }
      if (selectedStatus === '1' || selectedStatus === '0') {
        query = query.eq('register_isConfirm', selectedStatus);
      }

      if (debouncedSearch) {
        const safe = debouncedSearch.replace(/[,()]/g, ' ').trim();
        const digits = safe.replace(/\D/g, '');
        const tokens = safe.split(/\s+/).filter(Boolean);

        if (tokens.length >= 2 && !/\d/.test(safe)) {
          query = query
            .ilike('name', `%${tokens[0]}%`)
            .ilike('lastname', `%${tokens.slice(1).join(' ')}%`);
        } else if (digits.length >= 4 && /^[\d-\s]+$/.test(safe)) {
          query = query.or(
            `people_id.ilike.%${digits}%,phone.ilike.%${digits}%,name.ilike.%${safe}%,lastname.ilike.%${safe}%`
          );
        } else if (safe) {
          query = query.or(
            `name.ilike.%${safe}%,lastname.ilike.%${safe}%,people_id.ilike.%${safe}%,email.ilike.%${safe}%,phone.ilike.%${safe}%`
          );
        }
      }

      resolvedOrder.forEach((o) => {
        query = query.order(o.field, { ascending: Boolean(o.ascending) });
      });

      const from = (page - 1) * pageSize;
      const to = from + pageSize - 1;
      query = query.range(from, to);

      const { data, count, error } = await query;
      if (error) throw error;

      const total = count || 0;
      if (total > 0 && from >= total && page > 1) {
        setPage(Math.max(1, Math.ceil(total / pageSize)));
        return;
      }

      setRows(data || []);
      setTotalCount(total);
    } catch (err) {
      console.error('UserDirectoryTable fetch error:', err);
      Swal.fire('เกิดข้อผิดพลาด', err.message || 'ไม่สามารถดึงข้อมูลบุคลากรได้', 'error');
    } finally {
      setTableLoading(false);
    }
  }, [
    profileLoading,
    configLoading,
    isSchoolScoped,
    scopedSchoolId,
    applyBaseFilter,
    areaCode,
    selectedSchool,
    selectedSubject,
    selectedAcademic,
    selectedKhet,
    selectedPosition,
    selectedStatus,
    debouncedSearch,
    resolvedOrder,
    page,
    pageSize,
  ]);

  useEffect(() => {
    fetchPage();
  }, [fetchPage, refreshKey]);

  const toggleRevealId = (rowId) => {
    setRevealedIds((prev) => {
      const next = new Set(prev);
      if (next.has(rowId)) next.delete(rowId);
      else next.add(rowId);
      return next;
    });
  };

  // Open Inline Password Reset Modal
  const openPasswordResetModal = (row) => {
    const bdayPwd = normalizeBirthdayPassword(row.birthday);
    const cidPwd = cleanThaiId(row.people_id);
    const initialMode = bdayPwd ? 'birthday' : cidPwd.length === 13 ? 'cid' : 'custom';

    setResetModal({
      open: true,
      target: row,
      mode: initialMode,
      customPassword: '',
      saving: false,
      completedPassword: '',
      copied: false,
    });
  };

  const closePasswordResetModal = () => {
    if (resetModal.saving) return;
    setResetModal({
      open: false,
      target: null,
      mode: 'birthday',
      customPassword: '',
      saving: false,
      completedPassword: '',
      copied: false,
    });
  };

  const resolvedNewPassword = useMemo(() => {
    if (!resetModal.target) return '';
    if (resetModal.mode === 'birthday') {
      return normalizeBirthdayPassword(resetModal.target.birthday);
    }
    if (resetModal.mode === 'cid') {
      return cleanThaiId(resetModal.target.people_id);
    }
    return resetModal.customPassword.trim();
  }, [resetModal.target, resetModal.mode, resetModal.customPassword]);

  const handleConfirmPasswordReset = async (e) => {
    e.preventDefault();
    const target = resetModal.target;
    if (!target || resetModal.saving) return;

    if (!resolvedNewPassword || resolvedNewPassword.length < 6) {
      Swal.fire('รหัสผ่านสั้นเกินไป', 'รหัสผ่านต้องมีความยาวอย่างน้อย 6 ตัวอักษร', 'warning');
      return;
    }

    const fullName = `${lookups.prefix[target.prefix] || ''}${target.name || ''} ${target.lastname || ''}`.trim();
    const confirm = await Swal.fire({
      title: 'ยืนยันการรีเซ็ตรหัสผ่าน?',
      html: `ต้องการตั้งรหัสผ่านใหม่ให้แก่<br/><strong>${fullName}</strong><br/><span class="text-muted small">รหัสผ่านใหม่: <code>${resolvedNewPassword}</code></span>`,
      icon: 'question',
      showCancelButton: true,
      confirmButtonColor: '#4f46e5',
      confirmButtonText: 'ยืนยันรีเซ็ตรหัสผ่าน',
      cancelButtonText: 'ยกเลิก',
    });

    if (!confirm.isConfirmed) return;

    setResetModal((prev) => ({ ...prev, saving: true }));
    try {
      const encrypted = encryptLegacyPassword(resolvedNewPassword);
      let updateQuery = supabase
        .from('tbl_Users')
        .update({ passwd: encrypted })
        .eq('id', target.id);

      if (isSchoolScoped && scopedSchoolId) {
        updateQuery = updateQuery.eq('school', scopedSchoolId);
      }

      const { error } = await updateQuery;
      if (error) throw error;

      setResetModal((prev) => ({
        ...prev,
        saving: false,
        completedPassword: resolvedNewPassword,
        copied: false,
      }));
      showToast('รีเซ็ตรหัสผ่านสำเร็จแล้ว', 'success');
    } catch (err) {
      console.error('Reset password error:', err);
      setResetModal((prev) => ({ ...prev, saving: false }));
      Swal.fire('เกิดข้อผิดพลาด', err.message || 'ไม่สามารถรีเซ็ตรหัสผ่านได้', 'error');
    }
  };

  const handleCopyPassword = async (text) => {
    try {
      await navigator.clipboard.writeText(text);
      setResetModal((prev) => ({ ...prev, copied: true }));
      showToast('คัดลอกรหัสผ่านไปยังคลิปบอร์ดแล้ว', 'success');
    } catch {
      Swal.fire('คัดลอกรหัสผ่าน', `รหัสผ่านใหม่คือ: ${text}`, 'info');
    }
  };

  // Safe Delete / Deactivate Handler (Never deletes users with submitted plans in tbl_sendplan!)
  const handleSafeDelete = async (row) => {
    const fullName = `${lookups.prefix[row.prefix] || ''}${row.name || ''} ${row.lastname || ''}`.trim();
    const schoolName = lookups.school[row.school] || row.school || '-';

    try {
      let planCount = 0;
      let duplicateCount = 0;

      if (row.people_id) {
        const [planRes, dupRes] = await Promise.all([
          supabase
            .from('tbl_sendplan')
            .select('planid', { count: 'exact', head: true })
            .eq('people_id', row.people_id),
          supabase
            .from('tbl_Users')
            .select('id', { count: 'exact', head: true })
            .eq('people_id', row.people_id),
        ]);
        planCount = planRes.count || 0;
        duplicateCount = dupRes.count || 0;
      }

      // Protect users who own plans if this is their only user record!
      if (planCount > 0 && duplicateCount <= 1) {
        const suspendResult = await Swal.fire({
          title: 'ไม่สามารถลบบัญชีที่มีประวัติส่งแผนได้',
          html: `
            <div class="text-left small">
              <p class="mb-2">บุคลากร <strong>${fullName}</strong> (${schoolName}) มีข้อมูลแผนการจัดการเรียนรู้ในระบบจำนวน <strong class="text-danger">${planCount} แผน</strong></p>
              <div class="p-2 rounded bg-warning-subtle border mb-2">
                <i class="fa-solid fa-shield-halved mr-1"></i> เพื่อป้องกันข้อมูลแผนการสอนและผลคะแนนนิเทศสูญหาย ระบบไม่อนุญาตให้ลบถาวร
              </div>
              <p class="mb-0">ท่านต้องการ <strong>ปรับสถานะเป็นระงับการใช้งาน (status = 0)</strong> แทนหรือไม่?</p>
            </div>
          `,
          icon: 'warning',
          showCancelButton: true,
          confirmButtonColor: '#d97706',
          confirmButtonText: 'ระงับการใช้งานแทนการลบ',
          cancelButtonText: 'ยกเลิก',
        });

        if (suspendResult.isConfirmed) {
          let q = supabase.from('tbl_Users').update({ status: '0' }).eq('id', row.id);
          if (isSchoolScoped && scopedSchoolId) q = q.eq('school', scopedSchoolId);
          const { error } = await q;
          if (error) throw error;
          showToast('ปรับสถานะเป็นระงับการใช้งานเรียบร้อยแล้ว', 'success');
          fetchPage();
        }
        return;
      }

      const confirmDelete = await Swal.fire({
        title: 'ยืนยันการลบรายชื่อบุคลากร?',
        html: `
          <div class="text-left small">
            <div class="p-3 rounded bg-light border mb-2">
              <div><strong>ชื่อ-นามสกุล:</strong> ${fullName || '-'}</div>
              <div><strong>เลขบัตร ปชช.:</strong> <code>${row.people_id || 'ไม่ระบุ'}</code></div>
              <div><strong>สังกัด:</strong> ${schoolName}</div>
              <div><strong>รหัสอ้างอิง (ID):</strong> #${row.id}</div>
            </div>
            <p class="text-danger mb-0"><i class="fa-solid fa-triangle-exclamation mr-1"></i> การลบรายชื่อนี้ไม่สามารถย้อนกลับได้ (ตรวจสอบแล้วไม่มีแผนการสอนค้างในระบบ)</p>
          </div>
        `,
        icon: 'warning',
        showCancelButton: true,
        confirmButtonColor: '#dc2626',
        confirmButtonText: 'ยืนยันลบรายชื่อ',
        cancelButtonText: 'ยกเลิก',
        reverseButtons: true,
      });

      if (!confirmDelete.isConfirmed) return;

      let delQuery = supabase.from('tbl_Users').delete().eq('id', row.id);
      if (isSchoolScoped && scopedSchoolId) {
        delQuery = delQuery.eq('school', scopedSchoolId);
      }

      const { error } = await delQuery;
      if (error) throw error;

      showToast(`ลบรายชื่อ ${fullName} เรียบร้อยแล้ว`, 'success');
      fetchPage();
    } catch (err) {
      console.error('Safe delete error:', err);
      Swal.fire('เกิดข้อผิดพลาด', err.message || 'ไม่สามารถลบรายชื่อได้', 'error');
    }
  };

  // Column visibility defaults
  const colCfg = {
    thaiId: columns.thaiId !== false,
    school: columns.school !== false,
    subject: Boolean(columns.subject),
    position: columns.position !== false,
    academic: columns.academic !== false,
    khet: Boolean(columns.khet),
    schoolKhet: Boolean(columns.schoolKhet),
    personType: Boolean(columns.personType),
    status: columns.status !== false,
    extra: Array.isArray(columns.extra) ? columns.extra : [],
  };

  const totalPages = Math.max(1, Math.ceil(totalCount / pageSize));
  const startRowNumber = totalCount === 0 ? 0 : (page - 1) * pageSize + 1;
  const endRowNumber = Math.min(totalCount, page * pageSize);

  const hasActiveFilters = Boolean(
    debouncedSearch ||
      (!isSchoolScoped && selectedSchool) ||
      selectedSubject ||
      selectedAcademic ||
      selectedKhet ||
      selectedPosition ||
      selectedStatus
  );

  // Page numbers window
  const pageNumbers = useMemo(() => {
    const pages = [];
    const maxButtons = 5;
    let start = Math.max(1, page - Math.floor(maxButtons / 2));
    let end = Math.min(totalPages, start + maxButtons - 1);
    if (end - start + 1 < maxButtons) {
      start = Math.max(1, end - maxButtons + 1);
    }
    for (let i = start; i <= end; i += 1) {
      pages.push(i);
    }
    return pages;
  }, [page, totalPages]);

  if (profileLoading || lookupsLoading || configLoading) {
    return <LoadingSpinner message="กำลังเตรียมข้อมูลทำเนียบบุคลากร..." />;
  }

  if (isSchoolScoped && !scopedSchoolId) {
    return (
      <EmptyState
        type="warning"
        icon="fa-school-lock"
        title="ไม่พบรหัสสถานศึกษาของบัญชีนี้"
        message="ไม่สามารถแสดงรายชื่อบุคลากรได้ กรุณาตรวจสอบข้อมูลสังกัดสถานศึกษาของท่าน"
      />
    );
  }

  return (
    <div className="user-directory-wrapper">
      {/* Top Filter & Toolbar Card */}
      <div className={`card card-${accentColor} card-outline shadow-sm mb-3`}>
        <div className="card-header d-flex justify-content-between align-items-center flex-wrap gap-2 py-3">
          <div>
            <h3 className="card-title m-0 font-weight-bold d-flex align-items-center flex-wrap gap-2" style={{ fontSize: '1.1rem' }}>
              <span
                className={`d-inline-flex align-items-center justify-content-center rounded-circle bg-${accentColor}-subtle text-${accentColor}`}
                style={{ width: '34px', height: '34px' }}
              >
                <i className={`fa-solid ${icon}`}></i>
              </span>
              <span>{title}</span>
              <span className="badge badge-primary px-2 py-1" style={{ fontSize: '0.82rem', borderRadius: '20px' }}>
                {totalCount.toLocaleString()} คน
              </span>
              {isSchoolScoped && (
                <span className="badge bg-info-subtle text-info-emphasis px-2 py-1" style={{ fontSize: '0.8rem' }}>
                  <i className="fa-solid fa-lock mr-1"></i>
                  เฉพาะสังกัด: {lookups.school[scopedSchoolId] || scopedSchoolId}
                </span>
              )}
            </h3>
            {subtitle && <p className="text-muted small mb-0 mt-1">{subtitle}</p>}
          </div>

          <div className="d-flex align-items-center flex-wrap gap-2 ml-auto">
            {headerActions}
            <button
              type="button"
              className="btn btn-outline-secondary btn-sm"
              onClick={fetchPage}
              disabled={tableLoading}
              title="รีเฟรชข้อมูล"
            >
              <i className={`fa-solid fa-arrows-rotate ${tableLoading ? 'fa-spin' : ''} mr-1`}></i>
              รีเฟรช
            </button>
          </div>
        </div>

        <div className="card-body py-3">
          {infoBanner && <div className="mb-3">{infoBanner}</div>}

          <div className="row g-2 align-items-end">
            {/* Search Input */}
            <div className="col-12 col-md-6 col-lg-4">
              <label className="form-label small text-muted mb-1">
                <i className="fa-solid fa-magnifying-glass mr-1"></i>
                ค้นหาชื่อ / นามสกุล / เลขบัตร / อีเมล / เบอร์โทร
              </label>
              <div className="input-group">
                <input
                  type="text"
                  className="form-control"
                  placeholder="พิมพ์คำค้นหา..."
                  value={searchInput}
                  onChange={(e) => {
                    setSearchInput(e.target.value);
                    setPage(1);
                  }}
                />
                {searchInput && (
                  <div className="input-group-append">
                    <button
                      type="button"
                      className="btn btn-outline-secondary"
                      onClick={() => {
                        setSearchInput('');
                        setDebouncedSearch('');
                        setPage(1);
                      }}
                      title="ล้างคำค้นหา"
                    >
                      <i className="fa-solid fa-xmark"></i>
                    </button>
                  </div>
                )}
              </div>
            </div>

            {/* School Filter */}
            {showSchoolFilter && (
              <div className="col-12 col-md-6 col-lg-3">
                <label className="form-label small text-muted mb-1">
                  <i className="fa-solid fa-school mr-1"></i>
                  สถานศึกษา
                </label>
                {isSchoolScoped ? (
                  <div className="form-control bg-light text-dark font-weight-semibold d-flex align-items-center justify-content-between">
                    <span className="text-truncate">{lookups.school[scopedSchoolId] || scopedSchoolId}</span>
                    <i className="fa-solid fa-lock text-muted small ml-2" title="จำกัดเฉพาะสถานศึกษาของท่าน"></i>
                  </div>
                ) : (
                  <SearchableSelect
                    options={schoolOptions}
                    value={selectedSchool}
                    onChange={(val) => updateFilterParam('school_id', val)}
                    placeholder="-- ทุกสถานศึกษา --"
                    searchPlaceholder="พิมพ์ชื่อโรงเรียน..."
                  />
                )}
              </div>
            )}

            {/* Subject Filter */}
            {showSubjectFilter && (
              <div className="col-12 col-sm-6 col-md-4 col-lg-3">
                <label className="form-label small text-muted mb-1">
                  <i className="fa-solid fa-book-open mr-1"></i>
                  กลุ่มสาระการเรียนรู้
                </label>
                <SearchableSelect
                  options={subjectOptions}
                  value={selectedSubject}
                  onChange={(val) => updateFilterParam('teach_subject', val)}
                  placeholder="-- ทุกกลุ่มสาระฯ --"
                  searchPlaceholder="ค้นหากลุ่มสาระฯ..."
                />
              </div>
            )}

            {/* Position Filter */}
            {showPositionFilter && (
              <div className="col-12 col-sm-6 col-md-4 col-lg-3">
                <label className="form-label small text-muted mb-1">
                  <i className="fa-solid fa-id-badge mr-1"></i>
                  ตำแหน่ง
                </label>
                <SearchableSelect
                  options={resolvedPositionOptions}
                  value={selectedPosition}
                  onChange={(val) => updateFilterParam('position_id', val)}
                  placeholder="-- ทุกตำแหน่ง --"
                  searchPlaceholder="ค้นหาตำแหน่ง..."
                />
              </div>
            )}

            {/* Khet Filter */}
            {showKhetFilter && (
              <div className="col-12 col-sm-6 col-md-4 col-lg-3">
                <label className="form-label small text-muted mb-1">
                  <i className="fa-solid fa-map-location-dot mr-1"></i>
                  สหวิทยาเขต
                </label>
                <SearchableSelect
                  options={khetOptions}
                  value={selectedKhet}
                  onChange={(val) => updateFilterParam('khet_code', val)}
                  placeholder="-- ทุกสหวิทยาเขต --"
                  searchPlaceholder="ค้นหาสหวิทยาเขต..."
                />
              </div>
            )}

            {/* Academic Standing Filter */}
            {showAcademicFilter && (
              <div className="col-12 col-sm-6 col-md-4 col-lg-2">
                <label className="form-label small text-muted mb-1">
                  <i className="fa-solid fa-ranking-star mr-1"></i>
                  วิทยฐานะ
                </label>
                <SearchableSelect
                  options={academicOptions}
                  value={selectedAcademic}
                  onChange={(val) => updateFilterParam('academic_id', val)}
                  placeholder="-- ทุกวิทยฐานะ --"
                  searchPlaceholder="ค้นหาวิทยฐานะ..."
                />
              </div>
            )}

            {/* Status Filter */}
            {showStatusFilter && (
              <div className="col-12 col-sm-6 col-md-4 col-lg-2">
                <label className="form-label small text-muted mb-1">
                  <i className="fa-solid fa-circle-check mr-1"></i>
                  สถานะสิทธิ์
                </label>
                <select
                  className="custom-select"
                  value={selectedStatus}
                  onChange={(e) => updateFilterParam('confirm_status', e.target.value)}
                >
                  <option value="">ทั้งหมด</option>
                  <option value="1">อนุมัติแล้ว</option>
                  <option value="0">รออนุมัติ</option>
                </select>
              </div>
            )}
          </div>

          {hasActiveFilters && (
            <div className="mt-2 pt-2 border-top d-flex justify-content-between align-items-center flex-wrap gap-2">
              <small className="text-muted">
                <i className="fa-solid fa-filter text-primary mr-1"></i>
                กำลังแสดงผลตามตัวกรอง • พบทั้งหมด <strong>{totalCount.toLocaleString()}</strong> รายการ
              </small>
              <button
                type="button"
                className="btn btn-link btn-sm p-0 text-danger font-weight-semibold"
                onClick={handleClearAllFilters}
              >
                <i className="fa-solid fa-filter-circle-xmark mr-1"></i>
                ล้างตัวกรองทั้งหมด
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Main Directory Table Card */}
      <div className="card shadow-sm border-0">
        <div className="card-header bg-white py-2 px-3 d-flex justify-content-between align-items-center flex-wrap gap-2">
          <div className="small text-muted">
            {totalCount > 0 ? (
              <>
                แสดงรายการที่ <strong>{startRowNumber.toLocaleString()}</strong> –{' '}
                <strong>{endRowNumber.toLocaleString()}</strong> จากทั้งหมด{' '}
                <strong className="text-primary">{totalCount.toLocaleString()}</strong> คน
              </>
            ) : (
              <span>ไม่พบรายการที่ตรงกับเงื่อนไข</span>
            )}
          </div>

          <div className="d-flex align-items-center gap-2">
            <label className="small text-muted mb-0">แสดงหน้าละ:</label>
            <select
              className="custom-select custom-select-sm"
              style={{ width: '82px' }}
              value={pageSize}
              onChange={(e) => {
                setPageSize(Number(e.target.value));
                setPage(1);
              }}
            >
              {PAGE_SIZE_OPTIONS.map((sz) => (
                <option key={sz} value={sz}>
                  {sz} คน
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="card-body p-0">
          {tableLoading ? (
            <div className="p-4">
              <LoadingSpinner size="sm" message="กำลังดึงข้อมูลรายชื่อบุคลากร..." />
            </div>
          ) : rows.length === 0 ? (
            <div className="p-3">
              <EmptyState
                icon="fa-users-slash"
                title={emptyTitle}
                message={hasActiveFilters ? 'ไม่พบรายชื่อที่ตรงกับคำค้นหาหรือตัวกรองที่เลือก' : emptyMessage}
                actionLabel={hasActiveFilters ? 'ล้างตัวกรองทั้งหมด' : ''}
                onAction={hasActiveFilters ? handleClearAllFilters : null}
              />
            </div>
          ) : (
            <div className="table-responsive">
              <table className="table table-hover align-middle mb-0">
                <thead className="table-light">
                  <tr>
                    <th className="text-center" style={{ width: '58px' }}>ที่</th>
                    {colCfg.thaiId && <th style={{ minWidth: '175px' }}>เลขประจำตัวประชาชน</th>}
                    <th style={{ minWidth: '200px' }}>ชื่อ - นามสกุล</th>
                    {colCfg.school && <th style={{ minWidth: '180px' }}>สถานศึกษา / สังกัด</th>}
                    {colCfg.subject && <th style={{ minWidth: '140px' }}>กลุ่มสาระฯ</th>}
                    {colCfg.position && <th style={{ minWidth: '145px' }}>ตำแหน่ง</th>}
                    {colCfg.academic && <th style={{ minWidth: '130px' }}>วิทยฐานะ</th>}
                    {colCfg.khet && <th style={{ minWidth: '140px' }}>สหวิทยาเขตรับผิดชอบ</th>}
                    {colCfg.schoolKhet && <th style={{ minWidth: '140px' }}>สหวิทยาเขต</th>}
                    {colCfg.personType && <th style={{ minWidth: '130px' }}>ประเภทบุคลากร</th>}
                    {colCfg.extra.map((col) => (
                      <th key={col.key} className={col.className || ''}>
                        {col.label}
                      </th>
                    ))}
                    {colCfg.status && <th className="text-center" style={{ width: '105px' }}>สถานะ</th>}
                    {(allowEdit || allowResetPassword || allowDelete || renderCustomActions) && (
                      <th className="text-center" style={{ minWidth: '155px' }}>จัดการ</th>
                    )}
                  </tr>
                </thead>
                <tbody>
                  {rows.map((row, idx) => {
                    const rowNo = startRowNumber + idx;
                    const prefixText = lookups.prefix[row.prefix] || '';
                    const fullName = `${prefixText}${row.name || ''} ${row.lastname || ''}`.trim() || '(ไม่ระบุชื่อ)';
                    const isRevealed = revealedIds.has(row.id);
                    const cidValid = isValidThaiId(row.people_id);
                    const isConfirmed =
                      String(row.register_isConfirm) === '1' || String(row.approved) === '1';
                    const isInactive = String(row.status) === '0';
                    const editUrl = resolveEditRoute(row, editVariant);

                    return (
                      <tr key={row.id || `${row.people_id}-${idx}`} className={isInactive ? 'text-muted bg-light' : ''}>
                        <td className="text-center text-muted small">{rowNo}</td>

                        {colCfg.thaiId && (
                          <td>
                            {row.people_id ? (
                              <div className="d-flex align-items-center gap-1">
                                <code className="text-dark" style={{ fontSize: '0.84rem' }}>
                                  {isRevealed ? formatThaiId(row.people_id) || row.people_id : maskThaiId(row.people_id)}
                                </code>
                                <button
                                  type="button"
                                  className="btn btn-link btn-sm p-0 text-muted ml-1"
                                  onClick={() => toggleRevealId(row.id)}
                                  title={isRevealed ? 'ซ่อนเลขบัตร ปชช.' : 'แสดงเลขบัตร ปชช. เต็ม'}
                                >
                                  <i className={`fa-regular ${isRevealed ? 'fa-eye-slash' : 'fa-eye'}`} style={{ fontSize: '12px' }}></i>
                                </button>
                                {!cidValid && (
                                  <span
                                    className="badge bg-danger-subtle text-danger ml-1"
                                    title="เลขประจำตัวประชาชนไม่ครบ 13 หลัก หรือไม่ผ่านสูตรตรวจสอบ"
                                  >
                                    !
                                  </span>
                                )}
                              </div>
                            ) : (
                              <span className="badge bg-danger-subtle text-danger">ไม่ระบุเลขบัตร</span>
                            )}
                          </td>
                        )}

                        <td>
                          <div className="font-weight-semibold text-dark">{fullName}</div>
                          <div className="d-flex flex-wrap gap-1 mt-1">
                            {String(row.headDepartment) === '1' && (
                              <span className="badge bg-info-subtle text-info-emphasis" style={{ fontSize: '0.72rem' }}>
                                หน.กลุ่มสาระฯ
                              </span>
                            )}
                            {String(row.chairman) === '1' && (
                              <span className="badge bg-warning-subtle text-warning-emphasis" style={{ fontSize: '0.72rem' }}>
                                ประธานสหวิทยาเขต
                              </span>
                            )}
                            {row.level === 'admin_school' && (
                              <span className="badge bg-primary-subtle text-primary" style={{ fontSize: '0.72rem' }}>
                                School Admin
                              </span>
                            )}
                            {(row.phone || row.email) && (
                              <small className="text-muted">
                                {row.phone ? <span className="mr-2"><i className="fa-solid fa-phone fa-xs mr-1"></i>{row.phone}</span> : null}
                                {row.email ? <span><i className="fa-regular fa-envelope fa-xs mr-1"></i>{row.email}</span> : null}
                              </small>
                            )}
                          </div>
                        </td>

                        {colCfg.school && (
                          <td>
                            <span className="small font-weight-medium">
                              {lookups.school[row.school] || row.school || <span className="text-danger">ไม่ระบุ</span>}
                            </span>
                          </td>
                        )}

                        {colCfg.subject && (
                          <td>
                            <span className="small">{lookups.teachSubject[row.teach_subject] || '-'}</span>
                          </td>
                        )}

                        {colCfg.position && (
                          <td>
                            <span className="small">{lookups.position[row.position_id] || '-'}</span>
                          </td>
                        )}

                        {colCfg.academic && (
                          <td>
                            <span className="small">{lookups.academic[row.academic_id] || '-'}</span>
                          </td>
                        )}

                        {colCfg.khet && (
                          <td>
                            <span className="small">{lookups.khet[row.khet_code] || '-'}</span>
                          </td>
                        )}

                        {colCfg.schoolKhet && (
                          <td>
                            <span className="small">
                              {lookups.khet[lookups.schoolKhet[row.school] || row.khet_code] || '-'}
                            </span>
                          </td>
                        )}

                        {colCfg.personType && (
                          <td>
                            <span className="small">{lookups.personType[row.persontype_id] || '-'}</span>
                          </td>
                        )}

                        {colCfg.extra.map((col) => (
                          <td key={col.key} className={col.className || ''}>
                            {col.render ? col.render(row, { lookups }) : row[col.key] || '-'}
                          </td>
                        ))}

                        {colCfg.status && (
                          <td className="text-center">
                            {isInactive ? (
                              <span className="badge bg-secondary-subtle text-secondary px-2 py-1">ระงับ</span>
                            ) : isConfirmed ? (
                              <span className="badge bg-success-subtle text-success-emphasis px-2 py-1">
                                <i className="fa-solid fa-check mr-1"></i>ปกติ
                              </span>
                            ) : (
                              <span className="badge bg-warning-subtle text-warning-emphasis px-2 py-1">
                                รออนุมัติ
                              </span>
                            )}
                          </td>
                        )}

                        {(allowEdit || allowResetPassword || allowDelete || renderCustomActions) && (
                          <td className="text-center">
                            <div className="d-inline-flex align-items-center flex-wrap justify-content-center gap-1">
                              {allowEdit && (
                                <Link
                                  to={editUrl}
                                  className="btn btn-sm btn-outline-primary"
                                  title="แก้ไขข้อมูล"
                                >
                                  <i className="fa-solid fa-pen-to-square"></i>
                                </Link>
                              )}
                              {allowResetPassword && (
                                <button
                                  type="button"
                                  className="btn btn-sm btn-outline-info"
                                  onClick={() => openPasswordResetModal(row)}
                                  title="รีเซ็ตรหัสผ่าน"
                                >
                                  <i className="fa-solid fa-key"></i>
                                </button>
                              )}
                              {renderCustomActions &&
                                renderCustomActions(row, {
                                  reload: fetchPage,
                                  lookups,
                                  handleSafeDelete,
                                })}
                              {allowDelete && (
                                <button
                                  type="button"
                                  className="btn btn-sm btn-outline-danger"
                                  onClick={() => handleSafeDelete(row)}
                                  title="จัดการบทบาท / ลบรายชื่อ"
                                >
                                  <i className="fa-solid fa-trash-can"></i>
                                </button>
                              )}
                            </div>
                          </td>
                        )}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Pagination Footer */}
        {totalCount > 0 && (
          <div className="card-footer bg-white py-3 px-3 d-flex justify-content-between align-items-center flex-wrap gap-2">
            <div className="small text-muted">
              หน้า <strong>{page}</strong> จากทั้งหมด <strong>{totalPages}</strong> หน้า
            </div>

            <nav aria-label="การแบ่งหน้ารายชื่อ">
              <ul className="pagination pagination-sm m-0">
                <li className={`page-item ${page <= 1 ? 'disabled' : ''}`}>
                  <button
                    type="button"
                    className="page-link"
                    onClick={() => setPage(1)}
                    disabled={page <= 1}
                    title="หน้าแรก"
                  >
                    <i className="fa-solid fa-angles-left"></i>
                  </button>
                </li>
                <li className={`page-item ${page <= 1 ? 'disabled' : ''}`}>
                  <button
                    type="button"
                    className="page-link"
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    disabled={page <= 1}
                  >
                    ก่อนหน้า
                  </button>
                </li>

                {pageNumbers.map((num) => (
                  <li key={num} className={`page-item ${num === page ? 'active' : ''}`}>
                    <button
                      type="button"
                      className="page-link"
                      onClick={() => setPage(num)}
                    >
                      {num}
                    </button>
                  </li>
                ))}

                <li className={`page-item ${page >= totalPages ? 'disabled' : ''}`}>
                  <button
                    type="button"
                    className="page-link"
                    onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                    disabled={page >= totalPages}
                  >
                    ถัดไป
                  </button>
                </li>
                <li className={`page-item ${page >= totalPages ? 'disabled' : ''}`}>
                  <button
                    type="button"
                    className="page-link"
                    onClick={() => setPage(totalPages)}
                    disabled={page >= totalPages}
                    title="หน้าสุดท้าย"
                  >
                    <i className="fa-solid fa-angles-right"></i>
                  </button>
                </li>
              </ul>
            </nav>
          </div>
        )}
      </div>

      {/* Safe Inline Password Reset Modal */}
      {resetModal.open && resetModal.target && (
        <div
          className="modal fade show d-block"
          tabIndex="-1"
          role="dialog"
          style={{ backgroundColor: 'rgba(15, 23, 42, 0.55)', zIndex: 1070 }}
          onClick={(e) => {
            if (e.target === e.currentTarget) closePasswordResetModal();
          }}
        >
          <div className="modal-dialog modal-dialog-centered" role="document">
            <div className="modal-content border-0 shadow-lg" style={{ borderRadius: '14px', overflow: 'hidden' }}>
              <div className="modal-header bg-primary text-white py-3">
                <h5 className="modal-title font-weight-bold m-0">
                  <i className="fa-solid fa-key mr-2"></i>
                  รีเซ็ตรหัสผ่านบุคลากร
                </h5>
                <button
                  type="button"
                  className="close text-white"
                  onClick={closePasswordResetModal}
                  disabled={resetModal.saving}
                >
                  <span>&times;</span>
                </button>
              </div>

              <div className="modal-body p-4">
                <div className="p-3 rounded bg-light border mb-3">
                  <div className="font-weight-bold text-dark">
                    {lookups.prefix[resetModal.target.prefix] || ''}
                    {resetModal.target.name} {resetModal.target.lastname}
                  </div>
                  <div className="small text-muted mt-1">
                    <span className="mr-3">
                      <i className="fa-solid fa-id-card mr-1"></i>
                      <code>{resetModal.target.people_id || '-'}</code>
                    </span>
                    <span>
                      <i className="fa-solid fa-school mr-1"></i>
                      {lookups.school[resetModal.target.school] || resetModal.target.school || '-'}
                    </span>
                  </div>
                </div>

                {resetModal.completedPassword ? (
                  <div className="text-center py-2">
                    <div
                      className="rounded-circle d-inline-flex align-items-center justify-content-center bg-success-subtle text-success mb-2"
                      style={{ width: '52px', height: '52px', fontSize: '1.4rem' }}
                    >
                      <i className="fa-solid fa-check"></i>
                    </div>
                    <h5 className="font-weight-bold text-success mb-1">รีเซ็ตรหัสผ่านเรียบร้อยแล้ว!</h5>
                    <p className="small text-muted mb-3">คัดลอกรหัสผ่านใหม่ด้านล่างเพื่อแจ้งบุคลากรได้ทันที</p>

                    <div
                      className="p-3 rounded border bg-success-subtle d-flex align-items-center justify-content-between gap-2 mb-3"
                      style={{ borderRadius: '10px' }}
                    >
                      <div className="text-left">
                        <div className="small text-muted">รหัสผ่านใหม่ (New Password)</div>
                        <div
                          className="font-weight-bold text-dark"
                          style={{ fontSize: '1.35rem', letterSpacing: '2px', fontFamily: 'monospace' }}
                        >
                          {resetModal.completedPassword}
                        </div>
                      </div>
                      <button
                        type="button"
                        className={`btn ${resetModal.copied ? 'btn-success' : 'btn-primary'} btn-sm px-3`}
                        onClick={() => handleCopyPassword(resetModal.completedPassword)}
                      >
                        <i className={`fa-solid ${resetModal.copied ? 'fa-check' : 'fa-copy'} mr-1`}></i>
                        {resetModal.copied ? 'คัดลอกแล้ว' : 'คัดลอก'}
                      </button>
                    </div>
                  </div>
                ) : (
                  <form onSubmit={handleConfirmPasswordReset}>
                    <label className="form-label small text-muted">เลือกรูปแบบรหัสผ่านใหม่</label>

                    <div className="d-flex flex-column gap-2 mb-3">
                      {normalizeBirthdayPassword(resetModal.target.birthday) && (
                        <label
                          className={`p-2 px-3 border rounded d-flex align-items-center justify-content-between m-0 ${
                            resetModal.mode === 'birthday' ? 'border-primary bg-primary-subtle' : 'bg-white'
                          }`}
                          style={{ cursor: 'pointer' }}
                        >
                          <div>
                            <input
                              type="radio"
                              name="pwd_mode"
                              className="mr-2"
                              checked={resetModal.mode === 'birthday'}
                              onChange={() => setResetModal((p) => ({ ...p, mode: 'birthday' }))}
                            />
                            <span className="font-weight-semibold">วันเดือนปีเกิด ค.ศ. (แนะนำ • ค่าเริ่มต้นระบบ)</span>
                          </div>
                          <code className="font-weight-bold text-primary">
                            {normalizeBirthdayPassword(resetModal.target.birthday)}
                          </code>
                        </label>
                      )}

                      {cleanThaiId(resetModal.target.people_id).length === 13 && (
                        <label
                          className={`p-2 px-3 border rounded d-flex align-items-center justify-content-between m-0 ${
                            resetModal.mode === 'cid' ? 'border-primary bg-primary-subtle' : 'bg-white'
                          }`}
                          style={{ cursor: 'pointer' }}
                        >
                          <div>
                            <input
                              type="radio"
                              name="pwd_mode"
                              className="mr-2"
                              checked={resetModal.mode === 'cid'}
                              onChange={() => setResetModal((p) => ({ ...p, mode: 'cid' }))}
                            />
                            <span className="font-weight-semibold">เลขประจำตัวประชาชน 13 หลัก</span>
                          </div>
                          <code className="font-weight-bold text-primary">
                            {cleanThaiId(resetModal.target.people_id)}
                          </code>
                        </label>
                      )}

                      <label
                        className={`p-2 px-3 border rounded m-0 ${
                          resetModal.mode === 'custom' ? 'border-primary bg-primary-subtle' : 'bg-white'
                        }`}
                        style={{ cursor: 'pointer' }}
                      >
                        <div className="d-flex align-items-center">
                          <input
                            type="radio"
                            name="pwd_mode"
                            className="mr-2"
                            checked={resetModal.mode === 'custom'}
                            onChange={() => setResetModal((p) => ({ ...p, mode: 'custom' }))}
                          />
                          <span className="font-weight-semibold">กำหนดรหัสผ่านใหม่ด้วยตนเอง</span>
                        </div>
                        {resetModal.mode === 'custom' && (
                          <input
                            type="text"
                            className="form-control mt-2"
                            placeholder="ระบุรหัสผ่านอย่างน้อย 6 ตัวอักษร..."
                            value={resetModal.customPassword}
                            onChange={(e) =>
                              setResetModal((p) => ({ ...p, customPassword: e.target.value }))
                            }
                            minLength={6}
                            required
                            autoFocus
                          />
                        )}
                      </label>
                    </div>

                    <div className="d-flex justify-content-end gap-2 pt-2 border-top">
                      <button
                        type="button"
                        className="btn btn-light"
                        onClick={closePasswordResetModal}
                        disabled={resetModal.saving}
                      >
                        ยกเลิก
                      </button>
                      <button
                        type="submit"
                        className="btn btn-primary px-4"
                        disabled={resetModal.saving || !resolvedNewPassword}
                      >
                        <i className="fa-solid fa-key mr-1"></i>
                        {resetModal.saving ? 'กำลังบันทึก...' : 'บันทึกรหัสผ่านใหม่'}
                      </button>
                    </div>
                  </form>
                )}
              </div>

              {resetModal.completedPassword && (
                <div className="modal-footer bg-light py-2">
                  <button type="button" className="btn btn-secondary btn-sm px-4" onClick={closePasswordResetModal}>
                    ปิดหน้าต่าง
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default UserDirectoryTable;
