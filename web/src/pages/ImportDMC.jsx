import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Swal from 'sweetalert2';
import { supabase } from '../supabaseClient';
import useAppConfig from '../hooks/useAppConfig';
import useActiveYears from '../hooks/useActiveYears';

const ImportDMC = () => {
  const navigate = useNavigate();
  const { config } = useAppConfig();
  const { educationYear } = useActiveYears();
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [yearEdu, setYearEdu] = useState('');
  const [dmcRound, setDmcRound] = useState('');
  const [existingPairs, setExistingPairs] = useState([]);
  const [sizeRanges, setSizeRanges] = useState([]);

  useEffect(() => {
    if (educationYear?.year) {
      setYearEdu(educationYear.year);
    }
    if (educationYear?.section) {
      setDmcRound(educationYear.section);
    }
  }, [educationYear]);

  const loadExisting = async () => {
    const { data, error } = await supabase
      .from('tbl_school_DMCdata')
      .select('education_year, education_section')
      .order('education_year', { ascending: false })
      .order('education_section', { ascending: false });
    if (error) throw error;
    const seen = new Set();
    const list = [];
    (data || []).forEach((row) => {
      const key = `${row.education_year}-${row.education_section}`;
      if (!seen.has(key)) {
        seen.add(key);
        list.push(row);
      }
    });
    setExistingPairs(list);
  };

  const loadSizes = async () => {
    const { data, error } = await supabase
      .from('tbl_schoolsize')
      .select('*')
      .order('schoolsize_min', { ascending: true });
    if (error) throw error;
    setSizeRanges(data || []);
  };

  useEffect(() => {
    const run = async () => {
      setLoading(true);
      try {
        await Promise.all([loadExisting(), loadSizes()]);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    run();
  }, []);

  const findSchoolSize = (count) => {
    const num = Number(count) || 0;
    const found = sizeRanges.find((row) => num >= Number(row.schoolsize_min) && num <= Number(row.schoolsize_max));
    return found ? found.schoolsize_id : null;
  };

  const getVal = (row, key) => {
    const val = row?.[key];
    if (val === null || typeof val === 'undefined' || val === '') return 0;
    const num = Number(val);
    return Number.isNaN(num) ? 0 : num;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!yearEdu || !dmcRound) return;
    setProcessing(true);
    try {
      const yearShort = String(yearEdu).slice(2);
      const areaCode = config.AREA_CODE8 || '00650001';
      const url = `https://portal.bopp-obec.info/obec${yearShort}/restpublicstat/download/area/${yearEdu}-${dmcRound}-schoolmis-${areaCode}.json`;

      const res = await fetch(url);
      if (!res.ok) throw new Error('Fetch failed');
      const data = await res.json();
      if (!data?.success) throw new Error('Data not available');

      const list = data.data || [];
      const totalRows = list.length > 0 ? list.length - 1 : 0;
      if (totalRows <= 0) throw new Error('No data');

      const { data: existing } = await supabase
        .from('tbl_school_DMCdata')
        .select('school_code8')
        .eq('education_year', yearEdu)
        .eq('education_section', dmcRound);
      const existingSet = new Set((existing || []).map((row) => String(row.school_code8)));

      let updateCount = 0;
      let insertCount = 0;

      for (let i = 0; i < totalRows; i += 1) {
        const row = list[i];
        const schoolCode = String(row['รหัสโรงเรียน'] || '');
        const payload = {
          school_code8: schoolCode,
          education_year: yearEdu,
          education_section: dmcRound,
          area_code: row['รหัสเขต'],
          a1m: getVal(row, 'อ.1 ชาย'),
          a1f: getVal(row, 'อ.1 หญิง'),
          a1r: getVal(row, 'อ.1 ห้อง'),
          a2m: getVal(row, 'อ.2 ชาย'),
          a2f: getVal(row, 'อ.2 หญิง'),
          a2r: getVal(row, 'อ.2 ห้อง'),
          a3m: getVal(row, 'อ.3 ชาย'),
          a3f: getVal(row, 'อ.3 หญิง'),
          a3r: getVal(row, 'อ.3 ห้อง'),
          p1m: getVal(row, 'ป.1 ชาย'),
          p1f: getVal(row, 'ป.1 หญิง'),
          p1r: getVal(row, 'ป.1 ห้อง'),
          p2m: getVal(row, 'ป.2 ชาย'),
          p2f: getVal(row, 'ป.2 หญิง'),
          p2r: getVal(row, 'ป.2 ห้อง'),
          p3m: getVal(row, 'ป.3 ชาย'),
          p3f: getVal(row, 'ป.3 หญิง'),
          p3r: getVal(row, 'ป.3 ห้อง'),
          p4m: getVal(row, 'ป.4 ชาย'),
          p4f: getVal(row, 'ป.4 หญิง'),
          p4r: getVal(row, 'ป.4 ห้อง'),
          p5m: getVal(row, 'ป.5 ชาย'),
          p5f: getVal(row, 'ป.5 หญิง'),
          p5r: getVal(row, 'ป.5 ห้อง'),
          p6m: getVal(row, 'ป.6 ชาย'),
          p6f: getVal(row, 'ป.6 หญิง'),
          p6r: getVal(row, 'ป.6 ห้อง'),
          m1m: getVal(row, 'ม.1 ชาย'),
          m1f: getVal(row, 'ม.1 หญิง'),
          m1r: getVal(row, 'ม.1 ห้อง'),
          m2m: getVal(row, 'ม.2 ชาย'),
          m2f: getVal(row, 'ม.2 หญิง'),
          m2r: getVal(row, 'ม.2 ห้อง'),
          m3m: getVal(row, 'ม.3 ชาย'),
          m3f: getVal(row, 'ม.3 หญิง'),
          m3r: getVal(row, 'ม.3 ห้อง'),
          m4m: getVal(row, 'ม.4 ชาย'),
          m4f: getVal(row, 'ม.4 หญิง'),
          m4r: getVal(row, 'ม.4 ห้อง'),
          m5m: getVal(row, 'ม.5 ชาย'),
          m5f: getVal(row, 'ม.5 หญิง'),
          m5r: getVal(row, 'ม.5 ห้อง'),
          m6m: getVal(row, 'ม.6 ชาย'),
          m6f: getVal(row, 'ม.6 หญิง'),
          v1m: getVal(row, 'ปวช.1 ชาย'),
          v1f: getVal(row, 'ปวช.1 หญิง'),
          v1r: getVal(row, 'ปวช.1 ห้อง'),
          v2m: getVal(row, 'ปวช.2 ชาย'),
          v2f: getVal(row, 'ปวช.2 หญิง'),
          v2r: getVal(row, 'ปวช.2 ห้อง'),
          v3m: getVal(row, 'ปวช.3 ชาย'),
          v3f: getVal(row, 'ปวช.3 หญิง'),
          v3r: getVal(row, 'ปวช.3 ห้อง'),
        };

        if (existingSet.has(schoolCode)) {
          const { error } = await supabase
            .from('tbl_school_DMCdata')
            .update(payload)
            .eq('school_code8', schoolCode)
            .eq('education_year', yearEdu)
            .eq('education_section', dmcRound);
          if (error) throw error;
          updateCount += 1;
        } else {
          const { error } = await supabase
            .from('tbl_school_DMCdata')
            .insert([payload]);
          if (error) throw error;
          insertCount += 1;
        }

        const sumAll = getVal(row, 'รวมทั้งหมด');
        const schoolSize = findSchoolSize(sumAll);
        await supabase
          .from('tbl_school')
          .update({ school_size: schoolSize })
          .eq('school_code8', schoolCode);
      }

      await loadExisting();

      Swal.fire('สำเร็จ', `นำเข้าข้อมูลสำเร็จ\nข้อมูลนำเข้า ${totalRows} โรงเรียน\nเพิ่มเข้า ${insertCount} โรงเรียน\nUpdate ${updateCount} โรงเรียน`, 'success');
    } catch (err) {
      console.error(err);
      Swal.fire('Error', 'Error! ไม่สามารถดึงข้อมูลได้', 'error');
    } finally {
      setProcessing(false);
    }
  };

  const handleRemove = async (eduYear, eduSec) => {
    const result = await Swal.fire({
      title: 'ยืนยันการลบข้อมูล',
      text: `ต้องการลบข้อมูล ปีการศึกษา ${eduYear} ภาคเรียน ${eduSec} ใช่หรือไม่ ?`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'ลบข้อมูล',
      cancelButtonText: 'ยกเลิก',
      reverseButtons: true,
    });
    if (!result.isConfirmed) return;
    try {
      const { error } = await supabase
        .from('tbl_school_DMCdata')
        .delete()
        .eq('education_year', eduYear)
        .eq('education_section', eduSec);
      if (error) throw error;
      Swal.fire('สำเร็จ', `ลบข้อมูลปีการศึกษา ${eduYear} รอบที่ ${eduSec} เรียบร้อย`, 'success');
      await loadExisting();
    } catch (err) {
      console.error(err);
      Swal.fire('Error', `ไม่สามารถลบข้อมูลปีการศึกษา ${eduYear} รอบที่ ${eduSec} ได้`, 'error');
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
            <h3 className="card-title"><i className="fa-solid fa-school-circle-check"></i> ดึงข้อมูลจาก DMC</h3>
          </div>
          <div className="card-body">
            <form onSubmit={handleSubmit}>
              <div className="row">
                <div className="mb-3 col-6">
                  <label htmlFor="year_edu">ปีการศึกษา:</label>
                  <input
                    type="number"
                    className="form-control form-select-lg"
                    name="year_edu"
                    id="year_edu"
                    value={yearEdu}
                    onChange={(e) => setYearEdu(e.target.value)}
                    required
                  />
                </div>
                <div className="mb-3 col-6">
                  <label htmlFor="dmc_round">รอบการรายงาน:</label>
                  <select
                    className="form-control form-select-lg"
                    name="dmc_round"
                    id="dmc_round"
                    value={dmcRound}
                    onChange={(e) => setDmcRound(e.target.value)}
                    required
                  >
                    <option value="">รอบการรายงาน</option>
                    <option value="1">10 มิถุนายน (รอบที่ 1)</option>
                    <option value="2">10 พฤศจิกายน (รอบที่ 2)</option>
                    <option value="3">30 เมษายน (รอบที่ 3)</option>
                  </select>
                </div>
              </div>
              <div className="mb-3">
                <button type="submit" className="btn btn-primary mt-3" disabled={processing}>Import</button>
                <button type="button" className="btn btn-danger mt-3 ml-2" onClick={() => navigate('/')}>ยกเลิก</button>
              </div>
            </form>
          </div>
        </div>
      </div>

      <div className="col-sm-12 col-md-12 col-lg-8 col-xl-8">
        <div className="card card-success">
          <div className="card-header">
            <h3 className="card-title"><i className="fa-solid fa-school-circle-check"></i> ข้อมูลที่มีในระบบแล้ว</h3>
          </div>
          <div className="card-body">
            <div className="table-reponsive">
              <table className="table table-bordered table-hover table-striped">
                <tbody>
                  {existingPairs.map((row, index) => (
                    <tr key={`${row.education_year}-${row.education_section}`}>
                      <td className="text-center">{index + 1}</td>
                      <td>
                        <div>ปีการศึกษา {row.education_year} รอบที่ {row.education_section}</div>
                      </td>
                      <td>
                        <button
                          type="button"
                          className="btn btn-sm btn-danger"
                          onClick={() => handleRemove(row.education_year, row.education_section)}
                        >
                          <i className="fa-solid fa-trash-can"></i> ลบข้อมูล
                        </button>
                      </td>
                    </tr>
                  ))}
                  {existingPairs.length === 0 && (
                    <tr>
                      <td colSpan="3" className="text-center"><h2 className="text-danger">ยังไม่มีข้อมูล</h2></td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ImportDMC;
