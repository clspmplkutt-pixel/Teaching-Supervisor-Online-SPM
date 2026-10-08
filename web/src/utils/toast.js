import Swal from 'sweetalert2';

/**
 * Lightweight, non-intrusive Toast notifications using SweetAlert2
 */
export const Toast = Swal.mixin({
  toast: true,
  position: 'top-end',
  showConfirmButton: false,
  timer: 3000,
  timerProgressBar: true,
  didOpen: (toast) => {
    toast.addEventListener('mouseenter', Swal.stopTimer);
    toast.addEventListener('mouseleave', Swal.resumeTimer);
  },
});

export const showToast = (message, icon = 'success') => {
  return Toast.fire({
    icon,
    title: message,
  });
};
