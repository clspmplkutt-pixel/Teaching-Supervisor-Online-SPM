import React, { useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import Swal from 'sweetalert2';
import { supabase } from '../supabaseClient';

const BudgetYearSet = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const year = searchParams.get('year') || '';

  useEffect(() => {
    let mounted = true;
    const run = async () => {
      try {
        await supabase.from('tbl_budget_year').update({ active: '0' }).eq('active', '1');
        const { error } = await supabase.from('tbl_budget_year').update({ active: '1' }).eq('year', year);
        if (error) throw error;
        Swal.fire('สำเร็จ', 'ตั้งค่าปีงบประมาณแล้ว', 'success');
      } catch (err) {
        console.error(err);
        Swal.fire('Error', 'เกิดข้อผิดพลาด', 'error');
      } finally {
        navigate('/budget_year');
      }
    };
    if (mounted && year) run();
    return () => { mounted = false; };
  }, [year, navigate]);

  return (
    <div className="text-center p-4">
      <div className="spinner-border text-primary" role="status"></div>
      <p className="mt-2">กำลังตั้งค่า...</p>
    </div>
  );
};

export default BudgetYearSet;
