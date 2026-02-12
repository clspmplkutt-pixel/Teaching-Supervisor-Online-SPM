/* eslint-disable react-hooks/exhaustive-deps */
import { useEffect } from 'react';

const useSelect2 = (deps = []) => {
  useEffect(() => {
    const $ = window.$;
    if (!$ || !$.fn || !$.fn.select2) return;
    const $selects = $('.select2bs4');
    $selects.select2({
      theme: 'bootstrap4',
      width: '100%',
    });

    return () => {
      try { $selects.select2('destroy'); } catch { /* noop */ }
    };
  }, [...deps]);
};

export default useSelect2;
