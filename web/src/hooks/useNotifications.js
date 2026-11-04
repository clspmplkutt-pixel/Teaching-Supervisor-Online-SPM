import { useNotificationContext } from '../contexts/NotificationContext';

/**
 * useNotifications
 * Reads centralized notification count from NotificationContext (1 shared polling source instead of 4).
 */
const useNotifications = () => {
  const ctx = useNotificationContext();
  return ctx?.totalCount || 0;
};

export default useNotifications;
