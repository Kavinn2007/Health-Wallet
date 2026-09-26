import { supabase, isSupabaseConfigured } from './supabase';
import { recordMockAuditLog } from './audit';

export type NotificationType =
  | 'ACCESS_REQUEST'
  | 'ACCESS_GRANTED'
  | 'ACCESS_DENIED'
  | 'ACCESS_REVOKED'
  | 'CONSENT_EXPIRED'
  | 'RECORD_VIEWED'
  | 'CONSULTATION_CREATED'
  | 'DIAGNOSIS_CREATED'
  | 'TREATMENT_CREATED'
  | 'PRESCRIPTION_CREATED';

export interface AppNotification {
  id: string;
  user_id: string;
  type: NotificationType;
  title: string;
  message: string;
  patient_id?: string | null;
  related_record_id?: string | null;
  related_request_id?: string | null;
  is_read: boolean;
  created_at: string;
}

export const LOCAL_STORAGE_NOTIFICATIONS_KEY = 'health_wallet_v2_notifications';

/**
 * Fetch all notifications for the authenticated user
 */
export async function getUserNotifications(): Promise<AppNotification[]> {
  if (!isSupabaseConfigured) {
    try {
      const stored = localStorage.getItem(LOCAL_STORAGE_NOTIFICATIONS_KEY);
      const list: AppNotification[] = stored ? JSON.parse(stored) : [];
      return list.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    } catch {
      return [];
    }
  }

  try {
    const { data: userAuth } = await supabase.auth.getUser();
    if (!userAuth.user) return [];

    const { data, error } = await supabase
      .from('notifications')
      .select('*')
      .eq('user_id', userAuth.user.id)
      .order('created_at', { ascending: false });

    if (error) {
      console.warn('Error fetching notifications:', error.message);
      return [];
    }

    return (data as AppNotification[]) || [];
  } catch (err: any) {
    console.warn('Unexpected error fetching notifications:', err?.message);
    return [];
  }
}

/**
 * Fetch unread notification count
 */
export async function getUnreadNotificationCount(): Promise<number> {
  if (!isSupabaseConfigured) {
    try {
      const stored = localStorage.getItem(LOCAL_STORAGE_NOTIFICATIONS_KEY);
      const list: AppNotification[] = stored ? JSON.parse(stored) : [];
      return list.filter((n) => !n.is_read).length;
    } catch {
      return 0;
    }
  }

  try {
    const { data: userAuth } = await supabase.auth.getUser();
    if (!userAuth.user) return 0;

    const { count, error } = await supabase
      .from('notifications')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userAuth.user.id)
      .eq('is_read', false);

    if (error) {
      console.warn('Error fetching unread count:', error.message);
      return 0;
    }

    return count || 0;
  } catch {
    return 0;
  }
}

/**
 * Mark a specific notification as read
 */
export async function markNotificationAsRead(notificationId: string): Promise<boolean> {
  if (!notificationId) return false;

  if (!isSupabaseConfigured) {
    try {
      const stored = localStorage.getItem(LOCAL_STORAGE_NOTIFICATIONS_KEY);
      const list: AppNotification[] = stored ? JSON.parse(stored) : [];
      const item = list.find((n) => n.id === notificationId);
      if (item) {
        item.is_read = true;
        localStorage.setItem(LOCAL_STORAGE_NOTIFICATIONS_KEY, JSON.stringify(list));
        return true;
      }
      return false;
    } catch {
      return false;
    }
  }

  try {
    const { data, error } = await supabase.rpc('mark_notification_read', {
      p_notification_id: notificationId,
    });

    if (error) {
      console.warn('RPC mark_notification_read error:', error.message);
      // Fallback direct update to notifications table (guarded by RLS)
      const { error: updateErr } = await supabase
        .from('notifications')
        .update({ is_read: true })
        .eq('id', notificationId);
      return !updateErr;
    }

    return !!data;
  } catch (err: any) {
    console.warn('Error marking notification as read:', err?.message);
    return false;
  }
}

/**
 * Mark all notifications as read for current user
 */
export async function markAllNotificationsAsRead(): Promise<number> {
  if (!isSupabaseConfigured) {
    try {
      const stored = localStorage.getItem(LOCAL_STORAGE_NOTIFICATIONS_KEY);
      const list: AppNotification[] = stored ? JSON.parse(stored) : [];
      let updatedCount = 0;
      list.forEach((n) => {
        if (!n.is_read) {
          n.is_read = true;
          updatedCount++;
        }
      });
      localStorage.setItem(LOCAL_STORAGE_NOTIFICATIONS_KEY, JSON.stringify(list));
      return updatedCount;
    } catch {
      return 0;
    }
  }

  try {
    const { data, error } = await supabase.rpc('mark_all_notifications_read');

    if (error) {
      console.warn('RPC mark_all_notifications_read error:', error.message);
      const { data: userAuth } = await supabase.auth.getUser();
      if (!userAuth.user) return 0;

      const { error: updateErr } = await supabase
        .from('notifications')
        .update({ is_read: true })
        .eq('user_id', userAuth.user.id)
        .eq('is_read', false);

      return updateErr ? 0 : 1;
    }

    return typeof data === 'number' ? data : 0;
  } catch (err: any) {
    console.warn('Error marking all notifications as read:', err?.message);
    return 0;
  }
}

/**
 * Log authorized medical record view by doctor
 * Generates VIEW_MEDICAL_RECORD audit log and RECORD_VIEWED patient notification via secure RPC.
 */
export async function logMedicalRecordView(
  recordId: string,
  recordTitle?: string
): Promise<{ success: boolean; error?: string }> {
  if (!recordId) return { success: false, error: 'Record ID required' };

  if (!isSupabaseConfigured) {
    // Local / offline simulation
    recordMockAuditLog({
      user_id: 'mock-doctor-uid',
      role: 'DOCTOR',
      action: 'VIEW_MEDICAL_RECORD',
      record_type: 'RECORD',
      record_id: recordId,
      status: 'SUCCESS',
      metadata: {
        doctor_name: 'Dr. Practitioner',
        record_title: recordTitle || 'Health Record',
      },
    });

    recordMockNotification({
      user_id: 'mock-patient-uid',
      type: 'RECORD_VIEWED',
      title: 'Medical Record Accessed',
      message: `Dr. Practitioner viewed your medical record${recordTitle ? `: ${recordTitle}` : ''}`,
      related_record_id: recordId,
      is_read: false,
    });

    return { success: true };
  }

  try {
    const { data, error } = await supabase.rpc('log_medical_record_view', {
      p_record_id: recordId,
    });

    if (error) {
      console.warn('log_medical_record_view RPC warning:', error.message);
      return { success: false, error: error.message };
    }

    return { success: true };
  } catch (err: any) {
    return { success: false, error: err?.message || 'Failed to log view' };
  }
}

/**
 * Record a mock notification for offline use
 */
export function recordMockNotification(
  notification: Omit<AppNotification, 'id' | 'created_at'>
): AppNotification {
  const fullNotif: AppNotification = {
    ...notification,
    id: `notif-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
    created_at: new Date().toISOString(),
  };

  try {
    const stored = localStorage.getItem(LOCAL_STORAGE_NOTIFICATIONS_KEY);
    const list: AppNotification[] = stored ? JSON.parse(stored) : [];
    list.unshift(fullNotif);
    localStorage.setItem(LOCAL_STORAGE_NOTIFICATIONS_KEY, JSON.stringify(list));
  } catch (e) {
    console.warn('Failed to save mock notification to localStorage:', e);
  }

  return fullNotif;
}
