import React, { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import Swal from 'sweetalert2';
import { supabase } from '../supabaseClient';
import useSchoolLookups from '../hooks/useSchoolLookups';
import LoadingSpinner from '../components/LoadingSpinner';
import EmptyState from '../components/EmptyState';
import SearchableSelect from '../components/SearchableSelect';
import { showToast } from '../utils/toast';

const KhetEdit = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const codeParam = (searchParams.get('khet_code') || '').trim();

  const { lists, loading: lookupLoading } = useSchoolLookups();
  const [loading, setLoading] = useState(Boolean(codeParam));
  const [notFound, setNotFound] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ khet_code: '', khet_name: '', khet_province: '' });

  const provinceOptions = useMemo(() => {
    const areaProvinces = (lists.provinces || []).filter(
      (p) => String(p.province_id) === '53' || String(p.province_id) === '65'
    );
    const source = areaProvinces.length > 0 ? areaProvinces : lists.provinces || [];
    return source.map((p) => ({
      value: String(p.province_id),
      label: p.province_name,
    }));
  }, [lists.provinces]);

  useEffect(() => {
    if (!codeParam) {
      setLoading(false);
      return;
    }

    let mounted = true;
    const load = async () => {
      setLoading(true);
      setNotFound(false);
      try {
        const { data, error } = await supabase
          .from('tbl_khet')
          .select('*')
          .eq('khet_code', codeParam)
          .maybeSingle();
        if (error) throw error;
        if (!mounted) return;

        if (!data) {
          setNotFound(true);
          return;
        }
        setForm({
          khet_code: data.khet_code || '',
          khet_name: data.khet_name || '',
          khet_province: String(data.khet_province || ''),
        });
      } catch (err) {
        console.error(err);
        if (mounted) {
          Swal.fire('ข้อผิดพลาด', err.message || 'ไม่สามารถโหลดข้อมูลสหวิทยาเขตได้', 'error');
        }
      } finally {
        if (mounted) setLoading(false);
      }
    };
    load();
    return () => {
      mounted = false;
    };
  }, [codeParam]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (saving) return;

    if (!form.khet_name.trim()) {
      Swal.fire('ข้อมูลไม่ครบถ้วน', 'กรุณาระบุชื่อสหวิทยาเขต', 'warning');
      return;
    }

    setSaving(true);
    try {
      const { error } = await supabase
        .from('tbl_khet')
        .update({
          khet_name: form.khet_name.trim(),
          khet_province: form.khet_province,
        })
        .eq('khet_code', form.khet_code);
      if (error) throw error;

      showToast('บันทึกการแก้ไขข้อมูลสหวิทยาเขตสำเร็จ');
      navigate('/khet');
    } catch (err) {
      console.error(err);
      Swal.fire('ไม่สามารถบันทึกได้', err.message || 'เกิดข้อผิดพลาดในการแก้ไขข้อมูล', 'error');
    } finally {
      setSaving(false);
    }
  };

  if (!codeParam || notFound) {
    return (
      <EmptyState
        type="warning"
        icon="fa-map-location-dot"
        title={!codeParam ? 'ไม่ได้ระบุรหัสสหวิทยาเขต' : 'ไม่พบข้อมูลสหวิทยาเขต'}
        message={
          !codeParam
            ? 'กรุณาเลือกรายการสหวิทยาเขตที่ต้องการแก้ไขจากหน้ารวม'
            : `ไม่พบสหวิทยาเขตรหัส "${codeParam}" ในระบบ`
        }
        actionLabel="กลับหน้าสหวิทยาเขต"
        onAction={() => navigate('/khet')}
      />
    );
  }

  if (loading || lookupLoading) {
    return <LoadingSpinner message="กำลังโหลดข้อมูลสหวิทยาเขต..." />;
  }

  return (
    <div className="row justify-content-center">
      <div className="col-sm-12 col-md-10 col-lg-8">
        <div className="card shadow-sm border-0">
          <div className="card-header bg-white py-3 d-flex justify-content-between align-items-center">
            <h3 className="card-title m-0 font-weight-bold text-dark">
              <i className="fa-solid fa-pen-to-square text-info mr-2"></i>
              แก้ไขข้อมูลสหวิทยาเขต
            </h3>
            <Link to="/khet" className="btn btn-sm btn-outline-secondary">
              <i className="fa-solid fa-arrow-left mr-1"></i> ย้อนกลับ
            </Link>
          </div>
          <div className="card-body">
            <form onSubmit={handleSubmit}>
              <div className="form-group mb-3">
                <label className="form-label">จังหวัดที่ตั้งสหวิทยาเขต</label>
                <SearchableSelect
                  options={provinceOptions}
                  value={form.khet_province}
                  onChange={(val) => setForm((prev) => ({ ...prev, khet_province: val }))}
                  placeholder="-- เลือกจังหวัด --"
                  clearable={false}
                />
              </div>

              <div className="form-group mb-3">
                <label htmlFor="khet_code" className="form-label">รหัสสหวิทยาเขต</label>
                <input
                  type="text"
                  className="form-control bg-light"
                  id="khet_code"
                  name="khet_code"
                  value={form.khet_code}
                  readOnly
                />
              </div>

              <div className="form-group mb-4">
                <label htmlFor="khet_name" className="form-label">
                  ชื่อสหวิทยาเขต <span className="text-danger">*</span>
                </label>
                <input
                  type="text"
                  className="form-control"
                  id="khet_name"
                  name="khet_name"
                  value={form.khet_name}
                  onChange={(e) => setForm((prev) => ({ ...prev, khet_name: e.target.value }))}
                  required
                />
              </div>

              <div className="d-flex flex-wrap gap-2 pt-2 border-top">
                <button type="submit" className="btn btn-primary px-4 font-weight-bold" disabled={saving}>
                  <i className="fa-solid fa-floppy-disk mr-1"></i>
                  {saving ? 'กำลังบันทึก...' : 'บันทึกการแก้ไข'}
                </button>
                <Link to="/khet" className="btn btn-light border px-4">
                  ยกเลิก
                </Link>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
};

export default KhetEdit;
