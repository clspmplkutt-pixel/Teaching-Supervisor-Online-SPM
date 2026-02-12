import { useEffect, useState } from 'react';
import { supabase } from '../supabaseClient';

const useActiveYears = () => {
  const [loading, setLoading] = useState(true);
  const [educationYear, setEducationYear] = useState(null);
  const [budgetYear, setBudgetYear] = useState(null);

  useEffect(() => {
    let mounted = true;
    const load = async () => {
      setLoading(true);
      try {
        const [eduRes, budgetRes] = await Promise.all([
          supabase.from('tbl_education_year').select('*').eq('active', '1').maybeSingle(),
          supabase.from('tbl_budget_year').select('*').eq('active', '1').maybeSingle(),
        ]);
        if (!mounted) return;
        setEducationYear(eduRes.data || null);
        setBudgetYear(budgetRes.data || null);
      } catch (err) {
        console.error('useActiveYears error:', err);
      } finally {
        if (mounted) setLoading(false);
      }
    };
    load();
    return () => { mounted = false; };
  }, []);

  return { loading, educationYear, budgetYear };
};

export default useActiveYears;
