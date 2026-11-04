import React, { useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import Swal from 'sweetalert2';
import { supabase } from '../supabaseClient';
import useSchoolLookups from '../hooks/useSchoolLookups';
import useAppConfig from '../hooks/useAppConfig';
import LoadingSpinner from '../components/LoadingSpinner';
import SearchableSelect from '../components/SearchableSelect';
import { showToast } from '../utils/toast';

const SchoolAdd = () => {
  const navigate = useNavigate();
  const { lists, loading } = useSchoolLookups();
  const { config } = useAppConfig();
  const [saving, setSaving] = useState(false);
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

  const schoolArea = config.AREA_CODE8 || '00650001';

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

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (saving) return;

    const schoolIdClean = form.school_id.trim();
    if (schoolIdClean.length !== 10) {
      Swal.fire('รหัสไม่ถูกต้อง', 'รหัสกระทรวง (MOECODE) ต้องมีความยาว 10 หลัก', 'warning');
      return;
    }
    if (!form.school_province || !form.khet_code || !form.school_size) {
      Swal.fire('ข้อมูลไม่ครบถ้วน', 'กรุณาเลือกจังหวัด สหวิทยาเขต และขนาดโรงเรียนให้ครบถ้วน', 'warning');
      return;
    }

    setSaving(true);
    try {
      const { data: exists } = await supabase
        .from('tbl_school')
        .select('school_id')
        .eq('school_id', schoolIdClean)
        .maybeSingle();

      if (exists) {
        Swal.fire(
          'รหัสสถานศึกษาซ้ำ',
          `รหัส MOECODE ${schoolIdClean} มีอยู่ในระบบแล้ว กรุณาตรวจสอบอีกครั้ง (ข้อมูลที่กรอกยังคงอยู่)`,
          'warning'
        );
        return;
      }

      const payload = {
        ...form,
        school_id: schoolIdClean,
        school_code6: form.school_code6.trim(),
        school_code8: form.school_code8.trim(),
        school_id_onet: form.school_id_onet.trim(),
        school_name: form.school_name.trim(),
        school_area: schoolArea,
        school_flag: '1',
      };

      const { error } = await supabase.from('tbl_school').insert([payload]);
      if (error) throw error;

      showToast('เพิ่มข้อมูลสถานศึกษาสำเร็จ');
      navigate('/school');
    } catch (err) {
      console.error(err);
      Swal.fire('ไม่สามารถบันทึกได้', err.message || 'เกิดข้อผิดพลาดในการเพิ่มข้อมูลสถานศึกษา', 'error');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <LoadingSpinner message="กำลังโหลดข้อมูลอ้างอิงสถานศึกษา..." />;
  }

  return (
    <div className="row justify-content-center">
      <div className="col-sm-12 col-lg-10 col-xl-9">
        <div className="card shadow-sm border-0">
          <div className="card-header bg-white py-3 d-flex justify-content-between align-items-center">
            <h3 className="card-title m-0 font-weight-bold text-dark">
              <i className="fa-solid fa-school text-success mr-2"></i>
              เพิ่มข้อมูลสถานศึกษาใหม่
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
                  <label htmlFor="school_id" className="form-label">
                    รหัส MOECODE 10 หลัก (รหัสกระทรวง) <span className="text-danger">*</span>
                  </label>
                  <input
                    type="text"
                    className="form-control"
                    id="school_id"
                    name="school_id"
                    placeholder="เช่น 1053650001"
                    maxLength="10"
                    minLength="10"
                    value={form.school_id}
                    onChange={handleChange}
                    required
                  />
                </div>
                <div className="mb-3 col-md-6">
                  <label htmlFor="school_code6" className="form-label">
                    รหัสโรงเรียน 6 หลัก (รหัส OBEC)
                  </label>
                  <input
                    type="text"
                    className="form-control"
                    id="school_code6"
                    name="school_code6"
                    placeholder="รหัส 6 หลัก ของ สพฐ."
                    maxLength="6"
                    value={form.school_code6}
                    onChange={handleChange}
                  />
                </div>
                <div className="mb-3 col-md-6">
                  <label htmlFor="school_code8" className="form-label">
                    รหัสโรงเรียน 8 หลัก (รหัส SMIS / DMC)
                  </label>
                  <input
                    type="text"
                    className="form-control"
                    id="school_code8"
                    name="school_code8"
                    placeholder="รหัส 8 หลัก สำหรับเชื่อม DMC"
                    maxLength="8"
                    value={form.school_code8}
                    onChange={handleChange}
                  />
                </div>
                <div className="mb-3 col-md-6">
                  <label htmlFor="school_id_onet" className="form-label">
                    รหัสโรงเรียน 10 หลัก (O-NET)
                  </label>
                  <input
                    type="text"
                    className="form-control"
                    id="school_id_onet"
                    name="school_id_onet"
                    placeholder="รหัส 10 หลัก O-NET"
                    maxLength="10"
                    value={form.school_id_onet}
                    onChange={handleChange}
                  />
                </div>
                <div className="mb-3 col-12">
                  <label htmlFor="school_name" className="form-label">
                    ชื่อสถานศึกษา (ไม่ต้องใส่คำว่า &ldquo;โรงเรียน&rdquo; นำหน้า หากระบบเติมให้อัตโนมัติ หรือระบุตามมาตรฐานเขต){' '}
                    <span className="text-danger">*</span>
                  </label>
                  <input
                    type="text"
                    className="form-control"
                    id="school_name"
                    name="school_name"
                    placeholder="ระบุชื่อโรงเรียน"
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

              {/* Section 3: Location */}
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
                    placeholder="เลขที่ หมู่ที่"
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
                    placeholder="ตรอก"
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
                    placeholder="ซอย"
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
                    placeholder="ถนน"
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
                    placeholder="ตำบล"
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
                    placeholder="อำเภอ"
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
                    placeholder="รหัสไปรษณีย์ 5 หลัก"
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
                    placeholder="โทรศัพท์หลัก"
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
                    placeholder="โทรศัพท์สำรอง"
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
                    placeholder="เบอร์โทรสาร"
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
                    placeholder="school@example.ac.th"
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
                    placeholder="https://..."
                    value={form.school_website}
                    onChange={handleChange}
                  />
                </div>
              </div>

              <div className="d-flex flex-wrap gap-2 pt-3 border-top">
                <button type="submit" className="btn btn-primary px-4 font-weight-bold" disabled={saving}>
                  <i className="fa-solid fa-floppy-disk mr-1"></i>
                  {saving ? 'กำลังบันทึก...' : 'บันทึกข้อมูลสถานศึกษา'}
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

export default SchoolAdd;
