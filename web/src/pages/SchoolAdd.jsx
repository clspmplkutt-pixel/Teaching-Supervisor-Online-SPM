import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Swal from 'sweetalert2';
import { supabase } from '../supabaseClient';
import useSchoolLookups from '../hooks/useSchoolLookups';
import useSelect2 from '../hooks/useSelect2';
import useAppConfig from '../hooks/useAppConfig';

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

  useSelect2([loading, lists.provinces.length, lists.khet.length, lists.schoolSize.length]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const { data: exists } = await supabase.from('tbl_school').select('school_id').eq('school_id', form.school_id).maybeSingle();
      if (exists) {
        Swal.fire('Error', 'ไม่สามารถเพิ่มข้อมูลได้ เนื่องจากรหัสซ้ำ', 'error');
        navigate('/school');
        return;
      }
      const payload = {
        ...form,
        school_area: schoolArea,
        school_flag: '1',
      };
      const { error } = await supabase.from('tbl_school').insert([payload]);
      if (error) throw error;
      Swal.fire('สำเร็จ', 'เพิ่มข้อมูลสำเร็จ', 'success');
      navigate('/school');
    } catch (err) {
      console.error(err);
      Swal.fire('Error', 'ไม่สามารถเพิ่มข้อมูลได้ เกิดข้อผิดพลาด', 'error');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
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
            <h3 className="card-title"><i className="fa-solid fa-school-circle-check"></i> เพิ่มข้อมูลโรงเรียน</h3>
          </div>
          <div className="card-body">
            <form onSubmit={handleSubmit}>
              <div className="row">
                <div className="mb-3 col-6">
                  <label htmlFor="school_id">รหัส MOECODE (รหัสกระทรวง)<span className="text-danger">จำเป็นต้องกรอก ** </span>:</label>
                  <input type="text" className="form-control" id="school_id" name="school_id" placeholder="รหัส MOECODE" maxLength="10" minLength="10" value={form.school_id} onChange={handleChange} required />
                </div>
                <div className="mb-3 col-6">
                  <label htmlFor="school_code6">รหัสโรงเรียน 6 หลัก (รหัส Obec):</label>
                  <input type="text" className="form-control" id="school_code6" name="school_code6" placeholder="รหัสโรงเรียน 6 หลัก (Obec Code ของ สพฐ.)" maxLength="6" minLength="6" value={form.school_code6} onChange={handleChange} />
                </div>
              </div>
              <div className="row">
                <div className="mb-3 col-6">
                  <label htmlFor="school_code8">รหัสโรงเรียน 8 หลัก (รหัส SMIS):</label>
                  <input type="text" className="form-control" id="school_code8" name="school_code8" placeholder="รหัสโรงเรียน 8 หลัก (รหัส SMIS)" maxLength="8" minLength="8" value={form.school_code8} onChange={handleChange} />
                </div>
                <div className="mb-3 col-6">
                  <label htmlFor="school_id_onet">รหัสโรงเรียน 10 หลัก ONET:</label>
                  <input type="text" className="form-control" id="school_id_onet" name="school_id_onet" placeholder="รหัสโรงเรียน 10 หลัก ONET" maxLength="10" minLength="10" value={form.school_id_onet} onChange={handleChange} />
                </div>
              </div>
              <div className="mb-3">
                <label htmlFor="school_name">ชื่อโรงเรียน:</label>
                <input type="text" className="form-control" id="school_name" name="school_name" placeholder="ชื่อโรงเรียน" value={form.school_name} onChange={handleChange} required />
              </div>
              <div className="row">
                <div className="mb-3 col-4">
                  <label htmlFor="school_add">ที่อยู่ (เลขที่ หมู่ที่):</label>
                  <input type="text" className="form-control" id="school_add" name="school_add" placeholder="ที่อยู่โรงเรียน (เลขที่ หมู่ที่)" value={form.school_add} onChange={handleChange} />
                </div>
                <div className="mb-3 col-4">
                  <label htmlFor="school_trok">ตรอก:</label>
                  <input type="text" className="form-control" id="school_trok" name="school_trok" placeholder="ตรอก" value={form.school_trok} onChange={handleChange} />
                </div>
                <div className="mb-3 col-4">
                  <label htmlFor="school_soi">ซอย:</label>
                  <input type="text" className="form-control" id="school_soi" name="school_soi" placeholder="ซอย" value={form.school_soi} onChange={handleChange} />
                </div>
              </div>
              <div className="row">
                <div className="mb-3 col-4">
                  <label htmlFor="school_street">ถนน:</label>
                  <input type="text" className="form-control" id="school_street" name="school_street" placeholder="ถนน" value={form.school_street} onChange={handleChange} />
                </div>
                <div className="mb-3 col-4">
                  <label htmlFor="subdistrict_name">ตำบล:</label>
                  <input type="text" className="form-control" id="subdistrict_name" name="subdistrict_name" placeholder="ตำบล" value={form.subdistrict_name} onChange={handleChange} />
                </div>
                <div className="mb-3 col-4">
                  <label htmlFor="district_name">อำเภอ:</label>
                  <input type="text" className="form-control" id="district_name" name="district_name" placeholder="อำเภอ" value={form.district_name} onChange={handleChange} />
                </div>
              </div>
              <div className="row">
                <div className="mb-3 col-6">
                  <label htmlFor="school_province">จังหวัด:</label>
                  <select className="form-control form-select-lg select2bs4" name="school_province" id="school_province" value={form.school_province} onChange={handleChange} required>
                    <option value=""></option>
                    {lists.provinces.map((row) => (
                      <option key={row.province_id} value={row.province_id}>{row.province_name}</option>
                    ))}
                  </select>
                </div>
                <div className="mb-3 col-6">
                  <label htmlFor="school_postcode">รหัสไปรษณีย์:</label>
                  <input type="text" className="form-control" id="school_postcode" name="school_postcode" placeholder="รหัสไปรษณีย์" maxLength="5" minLength="5" value={form.school_postcode} onChange={handleChange} required />
                </div>
              </div>
              <div className="row">
                <div className="mb-3 col-4">
                  <label htmlFor="school_telephone1">เบอร์โทรศัพท์ 1:</label>
                  <input type="text" className="form-control" id="school_telephone1" name="school_telephone1" placeholder="เบอร์โทรศัพท์ 1" value={form.school_telephone1} onChange={handleChange} />
                </div>
                <div className="mb-3 col-4">
                  <label htmlFor="school_telephone2">เบอร์โทรศัพท์ 2:</label>
                  <input type="text" className="form-control" id="school_telephone2" name="school_telephone2" placeholder="เบอร์โทรศัพท์ 2" value={form.school_telephone2} onChange={handleChange} />
                </div>
                <div className="mb-3 col-4">
                  <label htmlFor="school_fax">โทรสาร (FAX):</label>
                  <input type="text" className="form-control" id="school_fax" name="school_fax" placeholder="โทรสาร (FAX)" value={form.school_fax} onChange={handleChange} />
                </div>
              </div>
              <div className="row">
                <div className="mb-3 col-6">
                  <label htmlFor="school_email">Email:</label>
                  <input type="email" className="form-control" id="school_email" name="school_email" placeholder="Email" value={form.school_email} onChange={handleChange} />
                </div>
                <div className="mb-3 col-6">
                  <label htmlFor="school_website">Website:</label>
                  <input type="url" className="form-control" id="school_website" name="school_website" placeholder="Website โรงเรียน" value={form.school_website} onChange={handleChange} />
                </div>
              </div>

              <div className="row">
                <div className="mb-3 col-6">
                  <label htmlFor="khet_code">สหวิทยาเขต:</label>
                  <select className="form-control form-select-lg select2bs4" name="khet_code" id="khet_code" value={form.khet_code} onChange={handleChange} required>
                    <option value=""></option>
                    {lists.khet.map((row) => (
                      <option key={row.khet_code} value={row.khet_code}>{row.khet_name}</option>
                    ))}
                  </select>
                </div>
                <div className="mb-3 col-6">
                  <label htmlFor="school_size">ขนาดโรงเรียน:</label>
                  <select className="form-control form-select-lg select2bs4" name="school_size" id="school_size" value={form.school_size} onChange={handleChange} required>
                    <option value=""></option>
                    {lists.schoolSize.map((row) => (
                      <option key={row.schoolsize_id} value={row.schoolsize_id}>
                        {row.schoolsize_name} ({row.schoolsize_details})
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="mb-3">
                <button type="submit" className="btn btn-primary mt-3" disabled={saving}>บันทึก</button>
                <button type="button" className="btn btn-danger mt-3 ml-2" onClick={() => navigate('/school')}>ยกเลิก</button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SchoolAdd;
