import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import Swal from 'sweetalert2';
import { supabase } from '../supabaseClient';
import useSchoolLookups from '../hooks/useSchoolLookups';

const KhetEdit = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const codeParam = searchParams.get('khet_code') || '';
  const { lists, loading: lookupLoading } = useSchoolLookups();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ khet_code: '', khet_name: '', khet_province: '' });

  const provinceOptions = useMemo(
    () => (lists.provinces || []).filter((p) => String(p.province_id) === '53' || String(p.province_id) === '65'),
    [lists.provinces]
  );

  useEffect(() => {
    let mounted = true;
    const load = async () => {
      setLoading(true);
      try {
        const { data, error } = await supabase.from('tbl_khet').select('*').eq('khet_code', codeParam).maybeSingle();
        if (error) throw error;
        if (!data) {
          Swal.fire('Error', 'ไม่พบข้อมูลสหวิทยาเขต', 'error');
          navigate('/khet');
          return;
        }
        if (mounted) {
          setForm({
            khet_code: data.khet_code || '',
            khet_name: data.khet_name || '',
            khet_province: data.khet_province || '',
          });
        }
      } catch (err) {
        console.error(err);
      } finally {
        if (mounted) setLoading(false);
      }
    };
    if (codeParam) load();
    return () => { mounted = false; };
  }, [codeParam, navigate]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (saving) return;
    setSaving(true);
    try {
      const { error } = await supabase
        .from('tbl_khet')
        .update({ khet_name: form.khet_name })
        .eq('khet_code', form.khet_code);
      if (error) throw error;
      Swal.fire('สำเร็จ', 'แก้ไขข้อมูลสำเร็จ', 'success');
      navigate('/khet');
    } catch (err) {
      console.error(err);
      Swal.fire('Error', 'ไม่สามารถแก้ไขข้อมูลได้ เกิดข้อผิดพลาด', 'error');
    } finally {
      setSaving(false);
    }
  };

  if (loading || lookupLoading) {
    return (
      <div className="text-center p-4">
        <div className="spinner-border text-primary" role="status"></div>
        <p className="mt-2">กำลังโหลดข้อมูล...</p>
      </div>
    );
  }

  return (
    <div className="row">
      <div className="col-sm-12 col-md-12 col-lg-8 col-xl-8">
        <div className="card card-success">
          <div className="card-header">
            <h3 className="card-title"><i className="fa-solid fa-school-circle-check"></i> แก้ไขข้อมูลสหวิทยาเขต</h3>
          </div>
          <div className="card-body">
            <form onSubmit={handleSubmit}>
              <div className="mb-3 mt-3">
                <label htmlFor="khet_province">ตั้งอยู่จังหวัด:</label>
                <select className="form-control form-select-lg" name="khet_province" id="khet_province" value={form.khet_province} onChange={handleChange} disabled>
                  <option value="">เลือกจังหวัดที่สหวิทยาเขตตั้งอยู่</option>
                  {provinceOptions.map((row) => (
                    <option key={row.province_id} value={row.province_id}>{row.province_name}</option>
                  ))}
                </select>
              </div>
              <div className="mb-3">
                <label htmlFor="khet_code">รหัสสหวิทยาเขต:</label>
                <input type="text" className="form-control" id="khet_code" name="khet_code" value={form.khet_code} readOnly />
              </div>
              <div className="mb-3">
                <label htmlFor="khet_name">ชื่อสหวิทยาเขต:</label>
                <input type="text" className="form-control" id="khet_name" name="khet_name" value={form.khet_name} onChange={handleChange} />
              </div>
              <div className="mb-3">
                <button type="submit" className="btn btn-primary mt-3" disabled={saving}>บันทึก</button>
                <button type="button" className="btn btn-danger mt-3 ml-2" onClick={() => navigate('/khet')}>ยกเลิก</button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
};

export default KhetEdit;
