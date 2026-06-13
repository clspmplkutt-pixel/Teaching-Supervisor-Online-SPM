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

    $selects.on('change', function (e) {
      // Prevent infinite loop if it's already a native event
      if (e.originalEvent) return;

      const element = this;
      const isMultiple = element.multiple;

      if (isMultiple) {
        // multi-select: sync array of selected values back to React
        const selectedValues = $(element).val() || [];
        // Set each option's selected state manually
        Array.from(element.options).forEach((opt) => {
          opt.selected = selectedValues.includes(opt.value);
        });
        // Dispatch a change event so React picks it up
        const event = new Event('change', { bubbles: true });
        element.dispatchEvent(event);
      } else {
        // single select: original behavior
        const nativeInputValueSetter = Object.getOwnPropertyDescriptor(
          window.HTMLSelectElement.prototype,
          'value'
        ).set;
        if (nativeInputValueSetter) {
          nativeInputValueSetter.call(element, element.value);
        }
        const event = new Event('change', { bubbles: true });
        element.dispatchEvent(event);
      }
    });

    return () => {
      try {
        $selects.off('change');
        $selects.select2('destroy');
      } catch { /* noop */ }
    };
  }, [...deps]);
};

export default useSelect2;
