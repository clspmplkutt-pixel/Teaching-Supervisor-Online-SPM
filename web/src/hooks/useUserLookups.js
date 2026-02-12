import { useEffect, useState } from 'react';
import { supabase } from '../supabaseClient';

const buildMap = (rows, keyField, valueField) => {
  const map = {};
  (rows || []).forEach((row) => {
    map[row[keyField]] = row[valueField];
  });
  return map;
};

const useUserLookups = () => {
  const [loading, setLoading] = useState(true);
  const [lookups, setLookups] = useState({
    prefix: {},
    position: {},
    academic: {},
    personType: {},
    teachSubject: {},
    school: {},
    schoolKhet: {},
    khet: {},
    gender: {},
    eduLevel: {},
    gradeLevel: {},
  });
  const [lists, setLists] = useState({
    prefix: [],
    position: [],
    academic: [],
    personType: [],
    teachSubject: [],
    school: [],
    khet: [],
    gender: [],
    eduLevel: [],
    gradeLevel: [],
  });

  useEffect(() => {
    let mounted = true;
    const loadLookups = async () => {
      setLoading(true);
      try {
        const [
          prefixRes,
          positionRes,
          academicRes,
          personTypeRes,
          teachSubjectRes,
          schoolRes,
          khetRes,
          genderRes,
          eduLevelRes,
          gradeRes,
        ] = await Promise.all([
          supabase.from('tbl_system_prefix').select('prefix_id, prefix').order('id', { ascending: true }),
          supabase.from('tbl_system_PersonPositionType').select('position_id, position_name').order('position_name', { ascending: true }),
          supabase.from('tbl_system_Academic_Standing').select('academic_id, academic_standing').order('academic_id', { ascending: true }),
          supabase.from('tbl_system_PersonType').select('persontype_id, persontype_name').order('persontype_id', { ascending: true }),
          supabase.from('tbl_system_Teach_Subject').select('teach_subject_id, teach_subject').order('teach_subject_id', { ascending: true }),
          supabase.from('tbl_school').select('school_id, school_name, khet_code').order('school_name', { ascending: true }),
          supabase.from('tbl_khet').select('khet_code, khet_name').order('khet_code', { ascending: true }),
          supabase.from('tbl_system_gender').select('gender_id, gender').order('id', { ascending: true }),
          supabase.from('tbl_system_EducationLevel').select('educationlevel_id, educationlevel_name').order('id', { ascending: true }),
          supabase.from('tbl_system_GradeLevel').select('grade_level_id, grade_level_name').order('grade_level_id', { ascending: true }),
        ]);

        if (!mounted) return;

        const prefix = buildMap(prefixRes.data, 'prefix_id', 'prefix');
        const position = buildMap(positionRes.data, 'position_id', 'position_name');
        const academic = buildMap(academicRes.data, 'academic_id', 'academic_standing');
        const personType = buildMap(personTypeRes.data, 'persontype_id', 'persontype_name');
        const teachSubject = buildMap(teachSubjectRes.data, 'teach_subject_id', 'teach_subject');
        const school = buildMap(schoolRes.data, 'school_id', 'school_name');
        const schoolKhet = {};
        (schoolRes.data || []).forEach((row) => { schoolKhet[row.school_id] = row.khet_code; });
        const khet = buildMap(khetRes.data, 'khet_code', 'khet_name');
        const gender = buildMap(genderRes.data, 'gender_id', 'gender');
        const eduLevel = buildMap(eduLevelRes.data, 'educationlevel_id', 'educationlevel_name');
        const gradeLevel = buildMap(gradeRes.data, 'grade_level_id', 'grade_level_name');

        setLookups({
          prefix,
          position,
          academic,
          personType,
          teachSubject,
          school,
          schoolKhet,
          khet,
          gender,
          eduLevel,
          gradeLevel,
        });

        setLists({
          prefix: prefixRes.data || [],
          position: positionRes.data || [],
          academic: academicRes.data || [],
          personType: personTypeRes.data || [],
          teachSubject: teachSubjectRes.data || [],
          school: schoolRes.data || [],
          khet: khetRes.data || [],
          gender: genderRes.data || [],
          eduLevel: eduLevelRes.data || [],
          gradeLevel: gradeRes.data || [],
        });
      } catch (err) {
        console.error('useUserLookups error:', err);
      } finally {
        if (mounted) setLoading(false);
      }
    };

    loadLookups();
    return () => { mounted = false; };
  }, []);

  return { lookups, lists, loading };
};

export default useUserLookups;
