import React, { useState, useRef, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  Bell,
  CheckCircle2,
  AlertTriangle,
  KeyRound,
  Eye,
  FilePlus,
  Clock,
  ExternalLink,
} from 'lucide-react';
import {
  getUserNotifications,
  getUnreadNotificationCount,
  markNotificationAsRead,
  markAllNotificationsAsRead,
  type AppNotification,
  type NotificationType,
} from '../../services/notifications';

interface NotificationButtonProps {
  isDoctor?: boolean;
}

export const NotificationButton: React.FC<NotificationButtonProps> = ({ isDoctor = false }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();

  const loadNotifications = async () => {
    setIsLoading(true);
    const [list, count] = await Promise.all([
      getUserNotifications(),
      getUnreadNotificationCount(),
    ]);
    setNotifications(list.slice(0, 5)); // show latest 5 in dropdown
    setUnreadCount(count);
    setIsLoading(false);
  };

  useEffect(() => {
    loadNotifications();

    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleToggle = () => {
    if (!isOpen) {
      loadNotifications();
    }
    setIsOpen(!isOpen);
  };

  const handleMarkAllRead = async () => {
    await markAllNotificationsAsRead();
    setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
    setUnreadCount(0);
  };

  const handleItemClick = async (notif: AppNotification) => {
    if (!notif.is_read) {
      await markNotificationAsRead(notif.id);
      setNotifications((prev) =>
        prev.map((n) => (n.id === notif.id ? { ...n, is_read: true } : n))
      );
      setUnreadCount((c) => Math.max(0, c - 1));
    }
    setIsOpen(false);

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

  const getTypeIcon = (type: NotificationType) => {
    switch (type) {
      case 'ACCESS_REQUEST':
        return <KeyRound className="w-3.5 h-3.5 text-sky-600" />;
      case 'ACCESS_GRANTED':
        return <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />;
      case 'ACCESS_DENIED':
      case 'ACCESS_REVOKED':
        return <AlertTriangle className="w-3.5 h-3.5 text-rose-600" />;
      case 'RECORD_VIEWED':
        return <Eye className="w-3.5 h-3.5 text-blue-600" />;
      case 'CONSULTATION_CREATED':
      case 'DIAGNOSIS_CREATED':
      case 'TREATMENT_CREATED':
      case 'PRESCRIPTION_CREATED':
        return <FilePlus className="w-3.5 h-3.5 text-indigo-600" />;
      case 'CONSENT_EXPIRED':
        return <Clock className="w-3.5 h-3.5 text-amber-600" />;
      default:
        return <Bell className="w-3.5 h-3.5 text-slate-600" />;
    }
  };

  const formatTime = (iso: string) => {
    try {
      const d = new Date(iso);
      const diffMins = Math.floor((Date.now() - d.getTime()) / 60000);
      if (diffMins < 1) return 'Just now';
      if (diffMins < 60) return `${diffMins}m ago`;
      const diffHours = Math.floor(diffMins / 60);
      if (diffHours < 24) return `${diffHours}h ago`;
      return d.toLocaleDateString('en-IN', { month: 'short', day: 'numeric' });
    } catch {
      return '';
    }
  };

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        type="button"
        onClick={handleToggle}
        className="relative p-2 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer outline-none focus-visible:ring-2 focus-visible:ring-sky-500"
        aria-label="View notifications"
        aria-expanded={isOpen}
      >
        <Bell className="w-5 h-5" />
        {unreadCount > 0 && (
          <span className="absolute top-1.5 right-1.5 min-w-4 h-4 px-1 bg-sky-500 text-white text-[10px] font-bold rounded-full ring-2 ring-white flex items-center justify-center">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-80 sm:w-96 bg-white border border-slate-200/90 rounded-2xl shadow-xl overflow-hidden z-50 animate-in fade-in zoom-in-95 duration-150">
          <div className="px-4 py-3 border-b border-slate-100 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700">
                Notifications
              </h4>
              {unreadCount > 0 && (
                <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-sky-100 text-sky-700">
                  {unreadCount} unread
                </span>
              )}
            </div>

            {unreadCount > 0 && (
              <button
                type="button"
                onClick={handleMarkAllRead}
                className="text-[11px] font-semibold text-sky-600 hover:text-sky-800 cursor-pointer hover:underline"
              >
                Mark all read
              </button>
            )}
          </div>

          <div className="divide-y divide-slate-100 max-h-80 overflow-y-auto">
            {isLoading ? (
              <div className="p-6 text-center text-xs text-slate-400">Loading notifications...</div>
            ) : notifications.length === 0 ? (
              <div className="p-6 text-center space-y-1">
                <Bell className="w-6 h-6 text-slate-300 mx-auto" />
                <p className="text-xs font-semibold text-slate-600">No notifications yet</p>
                <p className="text-[11px] text-slate-400">Updates will appear here in real-time.</p>
              </div>
            ) : (
              notifications.map((n) => (
                <div
                  key={n.id}
                  onClick={() => handleItemClick(n)}
                  className={`p-3.5 flex items-start gap-3 hover:bg-slate-50 transition-colors cursor-pointer ${
                    !n.is_read ? 'bg-sky-50/40' : ''
                  }`}
                >
                  <div className="mt-0.5 flex-shrink-0 w-6 h-6 rounded-lg bg-slate-50 border border-slate-100 flex items-center justify-center">
                    {getTypeIcon(n.type)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-1">
                      <p className="text-xs font-bold text-slate-900 leading-tight truncate">
                        {!n.is_read ? '● ' : '○ '}
                        {n.title}
                      </p>
                      <span className="text-[10px] text-slate-400 font-medium whitespace-nowrap">
                        {formatTime(n.created_at)}
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-500 mt-0.5 leading-snug line-clamp-2">
                      {n.message}
                    </p>
                  </div>
                </div>
              ))
            )}
          </div>

          <div className="p-2.5 bg-slate-50/80 border-t border-slate-100 flex items-center justify-between px-4">
            <Link
              to={isDoctor ? '/doctor/notifications' : '/notifications'}
              onClick={() => setIsOpen(false)}
              className="text-xs font-bold text-sky-600 hover:text-sky-800 transition-colors"
            >
              View All Notifications →
            </Link>
            <Link
              to={isDoctor ? '/doctor/activity' : '/access-history'}
              onClick={() => setIsOpen(false)}
              className="text-xs font-semibold text-slate-500 hover:text-slate-800 transition-colors"
            >
              Audit Trail
            </Link>
          </div>
        </div>
      )}
    </div>
  );
};
export default NotificationButton;
