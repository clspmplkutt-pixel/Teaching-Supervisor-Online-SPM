import React, { useEffect, useState } from 'react';
import { supabase } from '../supabaseClient';
import { useUserProfile } from '../hooks/useUserProfile';

const InfoDirectorSchool = () => {
  const { profile, loading: profileLoading } = useUserProfile();
  const [loading, setLoading] = useState(true);
  const [rows, setRows] = useState([]);
  const [lookups, setLookups] = useState({
    prefix: {},
    personType: {},
    position: {},
    academic: {},
    teachSubject: {},
  });

  useEffect(() => {
    let mounted = true;

    const loadData = async () => {
      if (!profile?.school) {
        setLoading(false);
        return;
      }

      setLoading(true);
      try {
        const [prefixRes, personTypeRes, positionRes, academicRes, subjectRes] = await Promise.all([
          supabase.from('tbl_system_prefix').select('prefix_id, prefix'),
          supabase.from('tbl_system_PersonType').select('persontype_id, persontype_name'),
          supabase.from('tbl_system_PersonPositionType').select('position_id, position_name'),
          supabase.from('tbl_system_Academic_Standing').select('academic_id, academic_standing'),
          supabase.from('tbl_system_Teach_Subject').select('teach_subject_id, teach_subject'),
        ]);

        const prefixMap = {};
        prefixRes.data?.forEach((p) => { prefixMap[p.prefix_id] = p.prefix; });

        const personTypeMap = {};
        personTypeRes.data?.forEach((p) => { personTypeMap[p.persontype_id] = p.persontype_name; });

        const positionMap = {};
        positionRes.data?.forEach((p) => { positionMap[p.position_id] = p.position_name; });

        const academicMap = {};
        academicRes.data?.forEach((a) => { academicMap[a.academic_id] = a.academic_standing; });

        const subjectMap = {};
        subjectRes.data?.forEach((s) => { subjectMap[s.teach_subject_id] = s.teach_subject; });

        const { data: teachers } = await supabase
          .from('tbl_Users')
          .select('people_id, prefix, name, lastname, persontype_id, position_id, academic_id, teach_subject, headDepartment')
          .eq('school', profile.school)
          .order('position_id', { ascending: false })
          .order('teach_subject', { ascending: true })
          .order('academic_id', { ascending: false });

        if (mounted) {
          setLookups({
            prefix: prefixMap,
            personType: personTypeMap,
            position: positionMap,
            academic: academicMap,
            teachSubject: subjectMap,
          });
          setRows(teachers || []);
        }
      } catch (err) {
        console.error('InfoDirectorSchool load error:', err);
      } finally {
        if (mounted) setLoading(false);
      }
    };

    if (!profileLoading) {
      loadData();
    }

    return () => { mounted = false; };
  }, [profile, profileLoading]);

  const isLoading = profileLoading || loading;

  if (isLoading) {
    return (
      <div className="text-center p-4">
        <div className="spinner-border text-primary" role="status"></div>
        <p className="mt-2">กำลังโหลดข้อมูล...</p>
      </div>
    );
  }

  return (
    <div className="row">
      <div className="col-12">
        <div className="card card-success">
          <div className="card-header">
            <h3 className="card-title">ข้อมูลครู/บุคลากรทางการศึกษา</h3>
          </div>
          <div className="card-body">
            <div className="table-responsive">
              <table className="table table-bordered table-hover table-striped" id="data">
                <thead>
                  <tr>
                    <th>#</th>
                    <th>ชื่อ-นามสกุล</th>
                    <th>ประเภทตำแหน่งบุคลากร</th>
                    <th>ประเภทตำแหน่งบุคลากร</th>
                    <th>วิทยฐานะ</th>
                    <th>กลุ่มสาระ</th>
                    <th>หัวหน้ากลุ่มสาระ</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((row, idx) => (
                    <tr key={row.people_id || idx}>
                      <td className="text-center">{idx + 1}</td>
                      <td>{(lookups.prefix[row.prefix] || '') + row.name + ' ' + row.lastname}</td>
                      <td>{lookups.personType[row.persontype_id] || ''}</td>
                      <td>{lookups.position[row.position_id] || ''}</td>
                      <td>{lookups.academic[row.academic_id] || ''}</td>
                      <td>{lookups.teachSubject[row.teach_subject] || ''}</td>
                      <td>{row.headDepartment === '1' || row.headDepartment === 1 ? <i className="fa-solid fa-circle-check text-success"></i> : ''}</td>
                    </tr>
                  ))}
                  {rows.length === 0 && (
                    <tr>
                      <td colSpan="7" className="text-center text-danger">ไม่พบข้อมูลครูในโรงเรียน</td>
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

export default InfoDirectorSchool;
