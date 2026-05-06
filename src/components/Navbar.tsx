/**
 * NigWrite - Navigation Bar Component
 * Created by: Wabi The Tech Nurse
 *
 * Top navigation with Nigeria-themed branding (green-white-green).
 * Logo uses a PenTool (writing) icon with Nigeria flag colors.
 */

'use client';

import { useState, useEffect, useCallback } from 'react';
import { PenTool, Upload, LayoutDashboard, FileText, Info, Bell, X, Check, Shield, GraduationCap, BookOpen, User, Sparkles, ClipboardList, Users } from 'lucide-react';

interface NavbarProps {
  currentView: string;
  onViewChange: (view: string) => void;
}

const studentNavItems = [
  { id: 'student-dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { id: 'scan', label: 'Scan', icon: FileText },
  { id: 'selfcheck', label: 'Self-Check', icon: Sparkles },
  { id: 'peer-review', label: 'Peer Review', icon: Users },
  { id: 'courses', label: 'Courses', icon: BookOpen },
  { id: 'history', label: 'History', icon: ClipboardList },
  { id: 'profile', label: 'Profile', icon: User },
];

const navItems = [
  { id: 'home', label: 'Home', icon: Upload },
  { id: 'scan', label: 'Scan Document', icon: FileText },
  { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { id: 'documents', label: 'Documents', icon: FileText },
  { id: 'instructor', label: 'Instructor', icon: GraduationCap },
  { id: 'admin', label: 'Admin', icon: Shield },
  { id: 'about', label: 'About', icon: Info },
];

interface Notification {
  id: string;
  title: string;
  message: string;
  type: string;
  read: boolean;
  createdAt: string;
}

export function Navbar({ currentView, onViewChange }: NavbarProps) {
  const [showNotifications, setShowNotifications] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [notifications, setNotifications] = useState<Notification[]>([]);

  const fetchNotifications = useCallback(async () => {
    try {
      const res = await fetch('/api/notifications');
      const result = await res.json();
      if (result.success) {
        setNotifications(result.data);
      }
    } catch {
      // silent
    }
  }, []);

  useEffect(() => {
    const loadCount = async () => {
      try {
        const res = await fetch('/api/notifications?count=true');
        const result = await res.json();
        if (result.success) {
          setUnreadCount(result.data.unread);
        }
      } catch {
        // silent
      }
    };
    loadCount();
    const interval = setInterval(loadCount, 30000);
    return () => clearInterval(interval);
  }, []);

  const toggleNotifications = () => {
    if (!showNotifications) {
      fetchNotifications();
    }
    setShowNotifications(prev => !prev);
  };

  const markAsRead = async (notificationId: string) => {
    try {
      await fetch('/api/notifications', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ notificationId }),
      });
      setNotifications(prev =>
        prev.map(n => n.id === notificationId ? { ...n, read: true } : n)
      );
      setUnreadCount(prev => Math.max(0, prev - 1));
    } catch {
      // silent
    }
  };

  const markAllRead = async () => {
    for (const n of notifications.filter(n => !n.read)) {
      await markAsRead(n.id);
    }
  };

  const getNotifIcon = (type: string) => {
    switch (type) {
      case 'warning': return '⚠️';
      case 'success': return '✅';
      case 'error': return '❌';
      default: return 'ℹ️';
    }
  };

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container mx-auto px-4">
        <div className="flex h-14 items-center justify-between">
          {/* Logo — Nigeria green + white + green writing icon */}
          <button
            onClick={() => onViewChange('home')}
            className="flex items-center gap-2.5 transition-opacity hover:opacity-80"
          >
            <div className="relative flex items-center justify-center w-9 h-9 rounded-lg overflow-hidden">
              {/* Nigeria flag background: green-white-green */}
              <div className="absolute inset-0 flex">
                <div className="w-[30%] bg-[#008751]" />
                <div className="w-[40%] bg-white" />
                <div className="w-[30%] bg-[#008751]" />
              </div>
              <PenTool className="h-4 w-4 text-[#008751] relative z-10" strokeWidth={2.5} />
            </div>
            <span className="font-bold text-lg tracking-tight">
              Nig<span className="text-[#008751]">Write</span>
            </span>
          </button>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center gap-1">
            {(currentView === 'student-dashboard' || currentView === 'history' || currentView === 'courses' || currentView === 'profile' || currentView === 'selfcheck' || currentView === 'receipt' || currentView === 'peer-review'
              ? studentNavItems
              : navItems
            ).map((item) => {
              const Icon = item.icon;
              const isActive = currentView === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => onViewChange(item.id)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                    isActive
                      ? 'bg-[#008751] text-white'
                      : 'text-muted-foreground hover:text-foreground hover:bg-muted'
                  }`}
                >
                  <Icon className="h-3.5 w-3.5" />
                  {item.label}
                </button>
              );
            })}
          </nav>

          {/* Right Side: Creator Badge + Notification Bell */}
          <div className="flex items-center gap-3">
            <div className="hidden lg:flex items-center gap-2 text-xs text-muted-foreground">
              <span>by</span>
              <span className="font-semibold text-foreground">Wabi The Tech Nurse</span>
            </div>

            {/* Notification Bell */}
            <div className="relative">
              <button
                onClick={toggleNotifications}
                className="relative p-2 rounded-md hover:bg-muted transition-colors"
                aria-label="Notifications"
              >
                <Bell className="h-5 w-5 text-muted-foreground" />
                {unreadCount > 0 && (
                  <span className="absolute -top-0.5 -right-0.5 w-4.5 h-4.5 rounded-full bg-red-500 text-white text-[10px] font-bold flex items-center justify-center min-w-[18px] h-[18px]">
                    {unreadCount > 9 ? '9+' : unreadCount}
                  </span>
                )}
              </button>

              {/* Notification Dropdown */}
              {showNotifications && (
                <>
                  {/* Backdrop */}
                  <div
                    className="fixed inset-0 z-40"
                    onClick={() => setShowNotifications(false)}
                  />

                  {/* Dropdown */}
                  <div className="absolute right-0 top-full mt-2 w-80 sm:w-96 bg-background border rounded-lg shadow-lg z-50 overflow-hidden">
                    {/* Header */}
                    <div className="flex items-center justify-between p-3 border-b bg-muted/30">
                      <h3 className="font-semibold text-sm">Notifications</h3>
                      <div className="flex items-center gap-2">
                        {unreadCount > 0 && (
                          <button
                            onClick={markAllRead}
                            className="text-xs text-[#008751] hover:underline flex items-center gap-1"
                          >
                            <Check className="h-3 w-3" />
                            Mark all read
                          </button>
                        )}
                        <button
                          onClick={() => setShowNotifications(false)}
                          className="p-1 rounded hover:bg-muted"
                        >
                          <X className="h-4 w-4 text-muted-foreground" />
                        </button>
                      </div>
                    </div>

                    {/* List */}
                    <div className="max-h-72 overflow-y-auto">
                      {notifications.length === 0 ? (
                        <div className="p-6 text-center text-sm text-muted-foreground">
                          <Bell className="h-8 w-8 mx-auto mb-2 opacity-30" />
                          No notifications yet
                        </div>
                      ) : (
                        notifications.map(notif => (
                          <button
                            key={notif.id}
                            onClick={() => !notif.read && markAsRead(notif.id)}
                            className={`w-full text-left p-3 border-b last:border-b-0 transition-colors hover:bg-muted/50 ${
                              notif.read ? 'opacity-60' : ''
                            }`}
                          >
                            <div className="flex items-start gap-2">
                              <span className="text-sm mt-0.5">{getNotifIcon(notif.type)}</span>
                              <div className="flex-1 min-w-0">
                                <p className="text-sm font-medium truncate">{notif.title}</p>
                                <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{notif.message}</p>
                                <p className="text-[10px] text-muted-foreground mt-1">
                                  {new Date(notif.createdAt).toLocaleString()}
                                </p>
                              </div>
                              {!notif.read && (
                                <span className="w-2 h-2 rounded-full bg-[#008751] mt-1.5 shrink-0" />
                              )}
                            </div>
                          </button>
                        ))
                      )}
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Mobile Navigation */}
      <div className="md:hidden border-t">
        <div className="flex overflow-x-auto px-2 py-1 gap-1">
          {(currentView === 'student-dashboard' || currentView === 'history' || currentView === 'courses' || currentView === 'profile' || currentView === 'selfcheck' || currentView === 'receipt' || currentView === 'peer-review'
            ? studentNavItems
            : navItems
          ).map((item) => {
            const Icon = item.icon;
            const isActive = currentView === item.id;
            return (
              <button
                key={item.id}
                onClick={() => onViewChange(item.id)}
                className={`flex items-center gap-1 px-2.5 py-1.5 rounded-md text-xs font-medium whitespace-nowrap transition-colors ${
                  isActive
                    ? 'bg-[#008751] text-white'
                    : 'text-muted-foreground hover:text-foreground hover:bg-muted'
                }`}
              >
                <Icon className="h-3 w-3" />
                {item.label}
              </button>
            );
          })}
        </div>
      </div>
    </header>
  );
}
