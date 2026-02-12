import React, { useEffect, useMemo, useState } from 'react';
import { supabase } from '../supabaseClient';
import LoadingSpinner from '../components/LoadingSpinner';

const InfoSimple = () => {
  const [loading, setLoading] = useState(true);
  const [khetStats, setKhetStats] = useState([]);
  const [sizeStats, setSizeStats] = useState([]);
  const [lookupData, setLookupData] = useState({
    khet: {},
    province: {},
    schoolSize: {},
  });

  useEffect(() => {
    let mounted = true;

    const loadData = async () => {
      setLoading(true);
      try {
        const [khetRes, provinceRes, sizeRes] = await Promise.all([
          supabase.from('tbl_khet').select('khet_code, khet_name'),
          supabase.from('tbl_province').select('province_id, province_name'),
          supabase.from('tbl_schoolsize').select('schoolsize_id, schoolsize_name, schoolsize_details'),
        ]);

        const khetMap = {};
        khetRes.data?.forEach((k) => { khetMap[k.khet_code] = k.khet_name; });

        const provinceMap = {};
        provinceRes.data?.forEach((p) => { provinceMap[p.province_id] = p.province_name; });

        const sizeMap = {};
        sizeRes.data?.forEach((s) => { sizeMap[s.schoolsize_id] = [s.schoolsize_name, s.schoolsize_details]; });

        const { data: schools } = await supabase
          .from('tbl_school')
          .select('khet_code, school_province, school_size, school_flag')
          .neq('school_flag', 0);

        const khetCount = {};
        const sizeCount = {};

        schools?.forEach((school) => {
          const khetKey = `${school.khet_code}_${school.school_province}`;
          if (!khetCount[khetKey]) {
            khetCount[khetKey] = {
              khet_code: school.khet_code,
              province: school.school_province,
              count: 0,
            };
          }
          khetCount[khetKey].count += 1;

          if (!sizeCount[school.school_size]) sizeCount[school.school_size] = 0;
          sizeCount[school.school_size] += 1;
        });

        if (mounted) {
          setLookupData({ khet: khetMap, province: provinceMap, schoolSize: sizeMap });
          setKhetStats(Object.values(khetCount));
          setSizeStats(Object.entries(sizeCount).map(([size, count]) => ({ size, count })));
        }
      } catch (err) {
        console.error('InfoSimple load error:', err);
      } finally {
        if (mounted) setLoading(false);
      }
    };

    loadData();

    return () => { mounted = false; };
  }, []);

  const totalSchools = useMemo(() => khetStats.reduce((sum, k) => sum + k.count, 0), [khetStats]);
  const totalSchoolsBySize = useMemo(() => sizeStats.reduce((sum, s) => sum + s.count, 0), [sizeStats]);

  if (loading) {
    return (
      <LoadingSpinner
        message="กำลังโหลดข้อมูลสถิติโรงเรียน..."
        fullPage={false}
      />
    );
  }

  return (
    <div className="row">
      <div className="col-6">
        <div className="card card-success">
          <div className="card-header">
            <h3 className="card-title">ข้อมูลสหวิทยาเขต</h3>
          </div>
          <div className="card-body">
            <div className="table-responsive">
              <table className="table table-bordered table-hover table-striped">
                <thead>
                  <tr>
                    <th>รหัสสหวิทยาเขต</th>
                    <th>ชื่อสหวิทยาเขต</th>
                    <th>จังหวัด</th>
                    <th>จำนวนโรงเรียน</th>
                  </tr>
                </thead>
                <tbody>
                  {khetStats.map((stat, idx) => (
                    <tr key={idx} className="text-center">
                      <td>{stat.khet_code}</td>
                      <td className="text-left">{lookupData.khet[stat.khet_code] || stat.khet_code}</td>
                      <td>{lookupData.province[stat.province] || stat.province}</td>
                      <td>{stat.count}</td>
                    </tr>
                  ))}
                  <tr className="text-center">
                    <td colSpan="3">รวม</td>
                    <td>{totalSchools}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>

        <div className="card card-success">
          <div className="card-header">
            <h3 className="card-title">ข้อมูลขนาดโรงเรียน</h3>
          </div>
          <div className="card-body">
            <div className="table-responsive">
              <table className="table table-bordered table-hover table-striped">
                <thead>
                  <tr>
                    <th>ขนาดโรงเรียน</th>
                    <th>จำนวนโรงเรียน</th>
                  </tr>
                </thead>
                <tbody>
                  {sizeStats.map((stat, idx) => (
                    <tr key={idx} className="text-center">
                      <td>{lookupData.schoolSize[stat.size]?.[0] || stat.size}</td>
                      <td>{stat.count}</td>
                    </tr>
                  ))}
                  <tr className="text-center">
                    <td>รวม</td>
                    <td>{totalSchoolsBySize}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
      <div className="col-6"></div>
    </div>
  );
};

export default InfoSimple;
