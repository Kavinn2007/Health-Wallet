import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Bell,
  CheckCircle2,
  CheckCheck,
  KeyRound,
  Eye,
  FilePlus,
  AlertTriangle,
  Clock,
  RefreshCw,
  ShieldCheck,
  ExternalLink,
} from 'lucide-react';
import {
  getUserNotifications,
  markNotificationAsRead,
  markAllNotificationsAsRead,
  type AppNotification,
  type NotificationType,
} from '../services/notifications';
import { LoadingState } from '../components/ui/LoadingState';
import { EmptyState } from '../components/ui/EmptyState';
import { SecondaryButton } from '../components/ui/SecondaryButton';

interface NotificationsPageProps {
  isDoctor?: boolean;
}

export const Notifications: React.FC<NotificationsPageProps> = ({ isDoctor = false }) => {
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [filterMode, setFilterMode] = useState<'ALL' | 'UNREAD'>('ALL');
  const navigate = useNavigate();

  const fetchNotifs = async () => {
    setIsLoading(true);
    const data = await getUserNotifications();
    setNotifications(data);
    setIsLoading(false);
  };

  useEffect(() => {
    fetchNotifs();
  }, []);

  const handleMarkAsRead = async (id: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    const success = await markNotificationAsRead(id);
    if (success) {
      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, is_read: true } : n))
      );
    }
  };

  const handleMarkAllRead = async () => {
    await markAllNotificationsAsRead();
    setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
  };

  const handleNotificationClick = async (notif: AppNotification) => {
    if (!notif.is_read) {
      await handleMarkAsRead(notif.id);
    }

    // Smart Navigation Target
    if (notif.type === 'ACCESS_REQUEST') {
      navigate('/access-requests');
    } else if (notif.type === 'ACCESS_GRANTED') {
      navigate(isDoctor ? '/doctor/patients' : '/access-requests');
    } else if (notif.type === 'ACCESS_DENIED' || notif.type === 'ACCESS_REVOKED') {
      navigate(isDoctor ? '/doctor/access-requests' : '/access-requests');
    } else if (notif.type === 'RECORD_VIEWED') {
      navigate('/access-history');
    } else if (
      notif.type === 'CONSULTATION_CREATED' ||
      notif.type === 'DIAGNOSIS_CREATED' ||
      notif.type === 'TREATMENT_CREATED' ||
      notif.type === 'PRESCRIPTION_CREATED'
    ) {
      navigate(isDoctor ? '/doctor/patients' : '/health-records');
    }
  };

  const filteredNotifs = notifications.filter((n) => {
    if (filterMode === 'UNREAD') return !n.is_read;
    return true;
  });

  const unreadCount = notifications.filter((n) => !n.is_read).length;

  const getTypeIcon = (type: NotificationType) => {
    switch (type) {
      case 'ACCESS_REQUEST':
        return <KeyRound className="w-4 h-4 text-sky-600" />;
      case 'ACCESS_GRANTED':
        return <CheckCircle2 className="w-4 h-4 text-emerald-600" />;
      case 'ACCESS_DENIED':
        return <AlertTriangle className="w-4 h-4 text-amber-600" />;
      case 'ACCESS_REVOKED':
        return <AlertTriangle className="w-4 h-4 text-rose-600" />;
      case 'CONSENT_EXPIRED':
        return <Clock className="w-4 h-4 text-slate-500" />;
      case 'RECORD_VIEWED':
        return <Eye className="w-4 h-4 text-blue-600" />;
      case 'CONSULTATION_CREATED':
      case 'DIAGNOSIS_CREATED':
      case 'TREATMENT_CREATED':
      case 'PRESCRIPTION_CREATED':
        return <FilePlus className="w-4 h-4 text-indigo-600" />;
      default:
        return <Bell className="w-4 h-4 text-slate-600" />;
    }
  };

  const formatTimestamp = (iso: string) => {
    try {
      const d = new Date(iso);
      const now = new Date();
      const diffMs = now.getTime() - d.getTime();
      const diffMins = Math.floor(diffMs / 60000);
      const diffHours = Math.floor(diffMins / 60);
      const diffDays = Math.floor(diffHours / 24);

      if (diffMins < 1) return 'Just now';
      if (diffMins < 60) return `${diffMins} min ago`;
      if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
      if (diffDays === 1) return 'Yesterday';
      return d.toLocaleDateString('en-IN', {
        month: 'short',
        day: 'numeric',
      });
    } catch {
      return iso;
    }
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* Top Header Card */}
      <div className="bg-white border border-slate-200/90 rounded-2xl p-6 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-sky-50 text-sky-600 flex items-center justify-center shadow-xs">
            <Bell className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
              <span>Notifications</span>
              {unreadCount > 0 && (
                <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-sky-500 text-white">
                  {unreadCount} new
                </span>
              )}
            </h1>
            <p className="text-xs text-slate-500 mt-0.5">
              Live updates when medical records are requested, authorized, viewed, or clinical entries are created.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-center">
          {unreadCount > 0 && (
            <button
              type="button"
              onClick={handleMarkAllRead}
              className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-bold text-sky-700 bg-sky-50 hover:bg-sky-100 rounded-xl transition-colors cursor-pointer"
            >
              <CheckCheck className="w-3.5 h-3.5" />
              <span>Mark all read</span>
            </button>
          )}

          <button
            type="button"
            onClick={fetchNotifs}
            className="p-2 text-slate-500 hover:text-slate-900 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
            title="Refresh notifications"
          >
            <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-200 pb-2">
        <button
          type="button"
          onClick={() => setFilterMode('ALL')}
          className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors cursor-pointer ${
            filterMode === 'ALL'
              ? 'bg-slate-900 text-white'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
          }`}
        >
          All ({notifications.length})
        </button>
        <button
          type="button"
          onClick={() => setFilterMode('UNREAD')}
          className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors cursor-pointer ${
            filterMode === 'UNREAD'
              ? 'bg-slate-900 text-white'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
          }`}
        >
          Unread ({unreadCount})
        </button>
      </div>

      {/* Notifications List */}
      {isLoading ? (
        <LoadingState message="Loading your in-app notifications..." />
      ) : filteredNotifs.length === 0 ? (
        <EmptyState
          title={filterMode === 'UNREAD' ? 'No unread notifications' : 'No notifications yet'}
          description={
            filterMode === 'UNREAD'
              ? 'You have read all received updates.'
              : 'Notifications about record access, consent approvals, and clinical entries will appear here.'
          }
          icon={<Bell className="w-8 h-8 text-slate-400" />}
        />
      ) : (
        <div className="space-y-2.5">
          {filteredNotifs.map((notif) => {
            const timeAgo = formatTimestamp(notif.created_at);

            return (
              <div
                key={notif.id}
                onClick={() => handleNotificationClick(notif)}
                className={`group border rounded-2xl p-4 transition-all cursor-pointer flex items-start justify-between gap-4 ${
                  notif.is_read
                    ? 'bg-white border-slate-200/80 hover:border-slate-300'
                    : 'bg-sky-50/50 border-sky-200/90 shadow-2xs hover:bg-sky-50/80'
                }`}
              >
                <div className="flex items-start gap-3.5 min-w-0">
                  <div
                    className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 mt-0.5 border ${
                      notif.is_read
                        ? 'bg-slate-50 border-slate-200/80'
                        : 'bg-white border-sky-200 shadow-2xs'
                    }`}
                  >
                    {getTypeIcon(notif.type)}
                  </div>

                  <div className="space-y-1 min-w-0">
                    <div className="flex items-center gap-2">
                      {!notif.is_read && (
                        <span className="w-2 h-2 rounded-full bg-sky-500 flex-shrink-0 animate-pulse" />
                      )}
                      <h3
                        className={`text-xs sm:text-sm font-bold leading-snug ${
                          notif.is_read ? 'text-slate-800' : 'text-slate-900'
                        }`}
                      >
                        {notif.title}
                      </h3>
                      <span className="text-[10px] text-slate-400 font-medium">
                        • {timeAgo}
                      </span>
                    </div>

                    <p className="text-xs text-slate-600 leading-relaxed font-normal">
                      {notif.message}
                    </p>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-2 flex-shrink-0 self-center">
                  {!notif.is_read && (
                    <button
                      type="button"
                      onClick={(e) => handleMarkAsRead(notif.id, e)}
                      className="px-2.5 py-1 text-[11px] font-semibold text-sky-700 bg-white hover:bg-sky-100 border border-sky-200 rounded-lg transition-colors cursor-pointer"
                    >
                      Mark read
                    </button>
                  )}
                  <ExternalLink className="w-3.5 h-3.5 text-slate-400 group-hover:text-slate-700 transition-colors" />
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
export default Notifications;
