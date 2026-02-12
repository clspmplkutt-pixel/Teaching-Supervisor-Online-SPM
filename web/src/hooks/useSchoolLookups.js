import { useEffect, useState } from 'react';
import { supabase } from '../supabaseClient';

const buildMap = (rows, keyField, valueField) => {
  const map = {};
  (rows || []).forEach((row) => {
    map[row[keyField]] = row[valueField];
  });
  return map;
};

const useSchoolLookups = () => {
  const [loading, setLoading] = useState(true);
  const [lists, setLists] = useState({
    provinces: [],
    khet: [],
    schoolSize: [],
  });
  const [lookups, setLookups] = useState({
    provinces: {},
    khet: {},
    schoolSize: {},
  });

  useEffect(() => {
    let mounted = true;
    const load = async () => {
      setLoading(true);
      try {
        const [provinceRes, khetRes, sizeRes] = await Promise.all([
          supabase.from('tbl_province').select('province_id, province_name').order('province_id', { ascending: true }),
          supabase.from('tbl_khet').select('khet_code, khet_name').order('khet_code', { ascending: true }),
          supabase.from('tbl_schoolsize').select('*').order('schoolsize_id', { ascending: true }),
        ]);

        if (!mounted) return;

        setLists({
          provinces: provinceRes.data || [],
          khet: khetRes.data || [],
          schoolSize: sizeRes.data || [],
        });
        setLookups({
          provinces: buildMap(provinceRes.data, 'province_id', 'province_name'),
          khet: buildMap(khetRes.data, 'khet_code', 'khet_name'),
          schoolSize: buildMap(sizeRes.data, 'schoolsize_id', 'schoolsize_name'),
        });
      } catch (err) {
        console.error('useSchoolLookups error:', err);
      } finally {
        if (mounted) setLoading(false);
      }
    };

    load();
    return () => { mounted = false; };
  }, []);

  return { loading, lists, lookups };
};

export default useSchoolLookups;
