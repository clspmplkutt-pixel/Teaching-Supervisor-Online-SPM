import { useEffect, useState } from 'react';
import { supabase } from '../supabaseClient';

const useAppConfig = () => {
  const [config, setConfig] = useState({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    const loadConfig = async () => {
      setLoading(true);
      try {
        const { data } = await supabase.from('tbl_config').select('config_name, config_value');
        const map = {};
        (data || []).forEach((row) => {
          map[row.config_name] = row.config_value;
        });
        if (mounted) setConfig(map);
      } catch (err) {
        console.error('useAppConfig error:', err);
      } finally {
        if (mounted) setLoading(false);
      }
    };
    loadConfig();
    return () => { mounted = false; };
  }, []);

  return { config, loading };
};

export default useAppConfig;
