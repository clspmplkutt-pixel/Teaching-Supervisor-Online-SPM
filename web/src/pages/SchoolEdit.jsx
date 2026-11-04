import React, { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import Swal from 'sweetalert2';
import { supabase } from '../supabaseClient';
import useSchoolLookups from '../hooks/useSchoolLookups';
import LoadingSpinner from '../components/LoadingSpinner';
import EmptyState from '../components/EmptyState';
import SearchableSelect from '../components/SearchableSelect';
import { showToast } from '../utils/toast';

const SchoolEdit = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const schoolIdParam = (searchParams.get('school_id') || '').trim();

  const { lists, loading: lookupLoading } = useSchoolLookups();
  const [loading, setLoading] = useState(Boolean(schoolIdParam));
  const [notFound, setNotFound] = useState(false);
  const [saving, setSaving] = useState(false);

  // CRITICAL BUG FIX: Lock codes based ONLY on whether DB already had values at load time,
  // NOT on `Boolean(form.school_code6)` (which previously locked the field after typing 1 character!)
  const [initialLocks, setInitialLocks] = useState({
    school_id: true,
    school_code6: false,
    school_code8: false,
    school_code10: false,
  });

  const [form, setForm] = useState({
    school_id: '',
    school_code6: '',
    school_code8: '',
    school_id_onet: '',
    school_name: '',
    school_add: '',
    school_trok: '',
    school_soi: '',
    school_street: '',
    district_name: '',
    subdistrict_name: '',
    school_province: '',
    school_postcode: '',
    school_telephone1: '',
    school_telephone2: '',
    school_fax: '',
    school_email: '',
    school_website: '',
    khet_code: '',
    school_size: '',
  });

  const provinceOptions = useMemo(
    () =>
      (lists.provinces || []).map((p) => ({
        value: String(p.province_id),
        label: p.province_name,
      })),
    [lists.provinces]
  );

  const khetOptions = useMemo(
    () =>
      (lists.khet || []).map((k) => ({
        value: String(k.khet_code),
        label: k.khet_name,
        subLabel: `รหัสสหวิทยาเขต ${k.khet_code}`,
      })),
    [lists.khet]
  );

  const sizeOptions = useMemo(
    () =>
      (lists.schoolSize || []).map((s) => ({
        value: String(s.schoolsize_id),
        label: s.schoolsize_name,
        subLabel: s.schoolsize_details || '',
      })),
    [lists.schoolSize]
  );

  useEffect(() => {
    if (!schoolIdParam) {
      setLoading(false);
      return;
    }

    let mounted = true;
    const load = async () => {
      setLoading(true);
      setNotFound(false);
      try {
        const { data, error } = await supabase
          .from('tbl_school')
          .select('*')
          .eq('school_id', schoolIdParam)
          .maybeSingle();
        if (error) throw error;
        if (!mounted) return;

        if (!data) {
          setNotFound(true);
          return;
        }

        setInitialLocks({
          school_id: Boolean(data.school_id),
          school_code6: Boolean(data.school_code6),
          school_code8: Boolean(data.school_code8),
          school_code10: Boolean(data.school_id_onet),
        });

        setForm({
          school_id: data.school_id || '',
          school_code6: data.school_code6 || '',
          school_code8: data.school_code8 || '',
          school_id_onet: data.school_id_onet || '',
          school_name: data.school_name || '',
          school_add: data.school_add || '',
          school_trok: data.school_trok || '',
          school_soi: data.school_soi || '',
          school_street: data.school_street || '',
          district_name: data.district_name || '',
          subdistrict_name: data.subdistrict_name || '',
          school_province: String(data.school_province || ''),
          school_postcode: data.school_postcode || '',
          school_telephone1: data.school_telephone1 || '',
          school_telephone2: data.school_telephone2 || '',
          school_fax: data.school_fax || '',
          school_email: data.school_email || '',
          school_website: data.school_website || '',
          khet_code: String(data.khet_code || ''),
          school_size: String(data.school_size || ''),
        });
      } catch (err) {
        console.error(err);
        if (mounted) {
          Swal.fire('ข้อผิดพลาด', err.message || 'ไม่สามารถโหลดข้อมูลสถานศึกษาได้', 'error');
        }
      } finally {
        if (mounted) setLoading(false);
      }
    };

    load();
    return () => {
      mounted = false;
    };
  }, [schoolIdParam]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (saving) return;

    if (!form.school_province || !form.khet_code || !form.school_size) {
      Swal.fire('ข้อมูลไม่ครบถ้วน', 'กรุณาเลือกจังหวัด สหวิทยาเขต และขนาดโรงเรียนให้ครบถ้วน', 'warning');
      return;
    }

    setSaving(true);
    try {
      const { error } = await supabase
        .from('tbl_school')
        .update({
          school_name: form.school_name.trim(),
          school_code6: form.school_code6.trim(),
          school_code8: form.school_code8.trim(),
          school_id_onet: form.school_id_onet.trim(),
          school_add: form.school_add,
          school_trok: form.school_trok,
          school_soi: form.school_soi,
          school_street: form.school_street,
          district_name: form.district_name,
          subdistrict_name: form.subdistrict_name,
          school_province: form.school_province,
          school_postcode: form.school_postcode.trim(),
          school_telephone1: form.school_telephone1,
          school_telephone2: form.school_telephone2,
          school_fax: form.school_fax,
          school_email: form.school_email,
          school_website: form.school_website,
          school_size: form.school_size,
          khet_code: form.khet_code,
        })
        .eq('school_id', form.school_id);
      if (error) throw error;

      showToast('บันทึกข้อมูลสถานศึกษาสำเร็จ');
      navigate('/school');
    } catch (err) {
      console.error(err);
      Swal.fire('ไม่สามารถบันทึกได้', err.message || 'เกิดข้อผิดพลาดในการแก้ไขข้อมูลสถานศึกษา', 'error');
    } finally {
      setSaving(false);
    }
  };

  if (!schoolIdParam || notFound) {
    return (
      <EmptyState
        type="warning"
        icon="fa-school"
        title={!schoolIdParam ? 'ไม่ได้ระบุรหัสสถานศึกษา' : 'ไม่พบข้อมูลสถานศึกษา'}
        message={
          !schoolIdParam
            ? 'กรุณาเลือกสถานศึกษาที่ต้องการแก้ไขจากหน้าจัดการข้อมูลสถานศึกษา'
            : `ไม่พบสถานศึกษารหัส "${schoolIdParam}" ในระบบ`
        }
        actionLabel="กลับหน้าข้อมูลสถานศึกษา"
        onAction={() => navigate('/school')}
      />
    );
  }

  if (loading || lookupLoading) {
    return <LoadingSpinner message="กำลังโหลดข้อมูลสถานศึกษา..." />;
  }

  return (
    <div className="row justify-content-center">
      <div className="col-sm-12 col-lg-10 col-xl-9">
        <div className="card shadow-sm border-0">
          <div className="card-header bg-white py-3 d-flex justify-content-between align-items-center">
            <h3 className="card-title m-0 font-weight-bold text-dark">
              <i className="fa-solid fa-pen-to-square text-info mr-2"></i>
              แก้ไขข้อมูลสถานศึกษา
            </h3>
            <Link to="/school" className="btn btn-sm btn-outline-secondary">
              <i className="fa-solid fa-arrow-left mr-1"></i> ย้อนกลับ
            </Link>
          </div>

          <div className="card-body">
            <form onSubmit={handleSubmit}>
              {/* Section 1: Codes & Name */}
              <h6 className="font-weight-bold text-primary border-bottom pb-2 mb-3">
                <i className="fa-solid fa-id-card-clip mr-1"></i> 1. ข้อมูลรหัสและชื่อสถานศึกษา
              </h6>
              <div className="row">
                <div className="mb-3 col-md-6">
                  <label htmlFor="school_id" className="form-label">รหัส MOECODE (รหัสกระทรวง)</label>
                  <input
                    type="text"
                    className={`form-control ${initialLocks.school_id ? 'bg-light' : ''}`}
                    id="school_id"
                    name="school_id"
                    maxLength="10"
                    value={form.school_id}
                    onChange={handleChange}
                    readOnly={initialLocks.school_id}
                  />
                </div>
                <div className="mb-3 col-md-6">
                  <label htmlFor="school_code6" className="form-label">
                    รหัสโรงเรียน 6 หลัก (รหัส OBEC)
                    {!initialLocks.school_code6 && <small className="text-info ml-1">(สามารถระบุเพิ่มเติมได้)</small>}
                  </label>
                  <input
                    type="text"
                    className={`form-control ${initialLocks.school_code6 ? 'bg-light' : ''}`}
                    id="school_code6"
                    name="school_code6"
                    placeholder="รหัสโรงเรียน 6 หลัก (OBEC)"
                    maxLength="6"
                    value={form.school_code6}
                    onChange={handleChange}
                    readOnly={initialLocks.school_code6}
                  />
                </div>
                <div className="mb-3 col-md-6">
                  <label htmlFor="school_code8" className="form-label">
                    รหัสโรงเรียน 8 หลัก (รหัส SMIS / DMC)
                    {!initialLocks.school_code8 && <small className="text-info ml-1">(สามารถระบุเพิ่มเติมได้)</small>}
                  </label>
                  <input
                    type="text"
                    className={`form-control ${initialLocks.school_code8 ? 'bg-light' : ''}`}
                    id="school_code8"
                    name="school_code8"
                    placeholder="รหัสโรงเรียน 8 หลัก (SMIS)"
                    maxLength="8"
                    value={form.school_code8}
                    onChange={handleChange}
                    readOnly={initialLocks.school_code8}
                  />
                </div>
                <div className="mb-3 col-md-6">
                  <label htmlFor="school_id_onet" className="form-label">
                    รหัสโรงเรียน 10 หลัก (O-NET)
                    {!initialLocks.school_code10 && <small className="text-info ml-1">(สามารถระบุเพิ่มเติมได้)</small>}
                  </label>
                  <input
                    type="text"
                    className={`form-control ${initialLocks.school_code10 ? 'bg-light' : ''}`}
                    id="school_id_onet"
                    name="school_id_onet"
                    placeholder="รหัสโรงเรียน 10 หลัก O-NET"
                    maxLength="10"
                    value={form.school_id_onet}
                    onChange={handleChange}
                    readOnly={initialLocks.school_code10}
                  />
                </div>
                <div className="mb-3 col-12">
                  <label htmlFor="school_name" className="form-label">
                    ชื่อสถานศึกษา <span className="text-danger">*</span>
                  </label>
                  <input
                    type="text"
                    className="form-control"
                    id="school_name"
                    name="school_name"
                    placeholder="ชื่อโรงเรียน"
                    value={form.school_name}
                    onChange={handleChange}
                    required
                  />
                </div>
              </div>

              {/* Section 2: Affiliation & Size */}
              <h6 className="font-weight-bold text-primary border-bottom pb-2 mt-2 mb-3">
                <i className="fa-solid fa-sitemap mr-1"></i> 2. สังกัดสหวิทยาเขตและขนาดสถานศึกษา
              </h6>
              <div className="row">
                <div className="mb-3 col-md-6">
                  <label className="form-label">
                    สหวิทยาเขต <span className="text-danger">*</span>
                  </label>
                  <SearchableSelect
                    options={khetOptions}
                    value={form.khet_code}
                    onChange={(val) => setForm((prev) => ({ ...prev, khet_code: val }))}
                    placeholder="-- เลือกสหวิทยาเขต --"
                    required
                  />
                </div>
                <div className="mb-3 col-md-6">
                  <label className="form-label">
                    ขนาดโรงเรียน <span className="text-danger">*</span>
                  </label>
                  <SearchableSelect
                    options={sizeOptions}
                    value={form.school_size}
                    onChange={(val) => setForm((prev) => ({ ...prev, school_size: val }))}
                    placeholder="-- เลือกขนาดโรงเรียน --"
                    required
                  />
                </div>
              </div>

              {/* Section 3: Location & Contact */}
              <h6 className="font-weight-bold text-primary border-bottom pb-2 mt-2 mb-3">
                <i className="fa-solid fa-location-dot mr-1"></i> 3. ที่ตั้งและข้อมูลติดต่อ
              </h6>
              <div className="row">
                <div className="mb-3 col-md-4">
                  <label htmlFor="school_add" className="form-label">ที่อยู่ (เลขที่ / หมู่ที่)</label>
                  <input
                    type="text"
                    className="form-control"
                    id="school_add"
                    name="school_add"
                    value={form.school_add}
                    onChange={handleChange}
                  />
                </div>
                <div className="mb-3 col-md-4">
                  <label htmlFor="school_trok" className="form-label">ตรอก</label>
                  <input
                    type="text"
                    className="form-control"
                    id="school_trok"
                    name="school_trok"
                    value={form.school_trok}
                    onChange={handleChange}
                  />
                </div>
                <div className="mb-3 col-md-4">
                  <label htmlFor="school_soi" className="form-label">ซอย</label>
                  <input
                    type="text"
                    className="form-control"
                    id="school_soi"
                    name="school_soi"
                    value={form.school_soi}
                    onChange={handleChange}
                  />
                </div>
                <div className="mb-3 col-md-4">
                  <label htmlFor="school_street" className="form-label">ถนน</label>
                  <input
                    type="text"
                    className="form-control"
                    id="school_street"
                    name="school_street"
                    value={form.school_street}
                    onChange={handleChange}
                  />
                </div>
                <div className="mb-3 col-md-4">
                  <label htmlFor="subdistrict_name" className="form-label">ตำบล</label>
                  <input
                    type="text"
                    className="form-control"
                    id="subdistrict_name"
                    name="subdistrict_name"
                    value={form.subdistrict_name}
                    onChange={handleChange}
                  />
                </div>
                <div className="mb-3 col-md-4">
                  <label htmlFor="district_name" className="form-label">อำเภอ</label>
                  <input
                    type="text"
                    className="form-control"
                    id="district_name"
                    name="district_name"
                    value={form.district_name}
                    onChange={handleChange}
                  />
                </div>
                <div className="mb-3 col-md-6">
                  <label className="form-label">
                    จังหวัด <span className="text-danger">*</span>
                  </label>
                  <SearchableSelect
                    options={provinceOptions}
                    value={form.school_province}
                    onChange={(val) => setForm((prev) => ({ ...prev, school_province: val }))}
                    placeholder="-- เลือกจังหวัด --"
                    required
                  />
                </div>
                <div className="mb-3 col-md-6">
                  <label htmlFor="school_postcode" className="form-label">
                    รหัสไปรษณีย์ <span className="text-danger">*</span>
                  </label>
                  <input
                    type="text"
                    className="form-control"
                    id="school_postcode"
                    name="school_postcode"
                    maxLength="5"
                    minLength="5"
                    value={form.school_postcode}
                    onChange={handleChange}
                    required
                  />
                </div>
                <div className="mb-3 col-md-4">
                  <label htmlFor="school_telephone1" className="form-label">เบอร์โทรศัพท์ 1</label>
                  <input
                    type="text"
                    className="form-control"
                    id="school_telephone1"
                    name="school_telephone1"
                    value={form.school_telephone1}
                    onChange={handleChange}
                  />
                </div>
                <div className="mb-3 col-md-4">
                  <label htmlFor="school_telephone2" className="form-label">เบอร์โทรศัพท์ 2</label>
                  <input
                    type="text"
                    className="form-control"
                    id="school_telephone2"
                    name="school_telephone2"
                    value={form.school_telephone2}
                    onChange={handleChange}
                  />
                </div>
                <div className="mb-3 col-md-4">
                  <label htmlFor="school_fax" className="form-label">โทรสาร (FAX)</label>
                  <input
                    type="text"
                    className="form-control"
                    id="school_fax"
                    name="school_fax"
                    value={form.school_fax}
                    onChange={handleChange}
                  />
                </div>
                <div className="mb-3 col-md-6">
                  <label htmlFor="school_email" className="form-label">อีเมล (Email)</label>
                  <input
                    type="email"
                    className="form-control"
                    id="school_email"
                    name="school_email"
                    value={form.school_email}
                    onChange={handleChange}
                  />
                </div>
                <div className="mb-3 col-md-6">
                  <label htmlFor="school_website" className="form-label">เว็บไซต์ (Website)</label>
                  <input
                    type="url"
                    className="form-control"
                    id="school_website"
                    name="school_website"
                    value={form.school_website}
                    onChange={handleChange}
                  />
                </div>
              </div>

              <div className="d-flex flex-wrap gap-2 pt-3 border-top">
                <button type="submit" className="btn btn-primary px-4 font-weight-bold" disabled={saving}>
                  <i className="fa-solid fa-floppy-disk mr-1"></i>
                  {saving ? 'กำลังบันทึก...' : 'บันทึกการแก้ไข'}
                </button>
                <Link to="/school" className="btn btn-light border px-4">
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

export default SchoolEdit;
