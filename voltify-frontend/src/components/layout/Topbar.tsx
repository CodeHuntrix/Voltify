// src/components/layout/Topbar.tsx
import { useState } from 'react';
import { Bell, Flame, Coins, Check, Zap, LayoutDashboard, BrainCircuit, Trophy, User, Settings, LogOut, Menu, X } from 'lucide-react';
import { NavLink } from 'react-router-dom';
import { useAuthStore } from '../../store/authStore';
import { useGamificationStore } from '../../store/gamificationStore';
import { MOCK_NOTIFICATIONS } from '../../lib/mockData';
import { toast } from 'react-toastify';

export default function Topbar() {
  const { user, logout } = useAuthStore();
  const { coins, streak_days } = useGamificationStore();
  const [notifications, setNotifications] = useState(MOCK_NOTIFICATIONS);
  const [showDropdown, setShowDropdown] = useState(false);
  const [showMobileMenu, setShowMobileMenu] = useState(false);

  const links = [
    { to: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { to: '/predictions', label: 'Predictions', icon: BrainCircuit },
    { to: '/leaderboard', label: 'Leaderboard', icon: Trophy },
    { to: '/shop', label: 'Shop', icon: Coins },
  ];

  const unreadCount = notifications.filter((n) => !n.read).length;

  const markAllAsRead = () => {
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
    toast.success('All notifications marked as read');
  };

  const markAsRead = (id: string) => {
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, read: true } : n))
    );
  };

  return (
    <>
    <header className="bg-slate-950/80 backdrop-blur-xl border-b border-white/[0.06] py-4 px-6 md:px-8 flex items-center justify-between sticky top-0 z-40">
      {/* Brand & Nav */}
      <div className="flex items-center gap-4 md:gap-8">
        {/* Mobile Hamburger Toggle */}
        <button
          onClick={() => setShowMobileMenu(!showMobileMenu)}
          className="md:hidden p-2 text-gray-400 hover:text-white hover:bg-white/5 rounded-lg border border-transparent hover:border-white/10 transition-all shrink-0 cursor-pointer"
        >
          {showMobileMenu ? <X className="size-5" /> : <Menu className="size-5" />}
        </button>

        <div className="flex items-center gap-2">
          <img src="/logo.gif" alt="Voltify Logo" className="size-8 object-contain" />
          <span className="font-display font-bold text-lg tracking-tight text-white hidden sm:block">Voltify</span>
        </div>
        
        <nav className="hidden md:flex items-center gap-2">
          {links.map((link) => {
            const Icon = link.icon;
            return (
              <NavLink
                key={link.to}
                to={link.to}
                className={({ isActive }) =>
                  `flex items-center gap-2 px-3 py-2 rounded-lg font-medium text-sm transition-all duration-200 ${
                    isActive
                      ? 'bg-white/[0.08] text-white border-b-2 border-primary'
                      : 'text-slate-400 hover:text-white hover:bg-white/5'
                  }`
                }
              >
                <Icon className="size-4 shrink-0" />
                <span>{link.label}</span>
              </NavLink>
            );
          })}
        </nav>
      </div>

      {/* Action panel */}
      <div className="flex items-center gap-2 md:gap-4 shrink-0">
        {/* Streak indicator NavLink */}
        <NavLink to="/streak" className="flex items-center gap-1.5 bg-white/5 px-2.5 py-1 md:px-3 md:py-1.5 rounded-full border border-white/5 hover:border-volt-pink/30 hover:bg-white/[0.08] transition-all cursor-pointer group relative shrink-0">
          <Flame className="size-3.5 text-volt-pink" />
          <span className="font-mono text-[10px] md:text-xs font-semibold text-volt-pink tracking-wider">
            {streak_days} DAY STREAK
          </span>
          
          <div className="absolute top-10 right-0 w-48 bg-slate-900 border border-white/10 p-3 rounded-xl shadow-2xl opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity text-xs text-gray-300 z-50">
            Keep saving daily energy to increase your streak multiplier! Currently: <span className="text-volt-pink font-bold">1.15x</span>
          </div>
        </NavLink>

        {/* Coins indicator NavLink */}
        <NavLink to="/shop" className="flex items-center gap-1.5 bg-white/5 px-2.5 py-1 md:px-3 md:py-1.5 rounded-full border border-white/5 hover:border-primary/30 hover:bg-white/[0.08] transition-all cursor-pointer group relative shrink-0">
          <Coins className="size-3.5 text-primary" />
          <span className="font-mono text-[10px] md:text-xs font-semibold text-primary tracking-wider">
            {coins} COINS
          </span>
          
          <div className="absolute top-10 right-0 w-48 bg-slate-900 border border-white/10 p-3 rounded-xl shadow-2xl opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity text-xs text-gray-300 z-50">
            Earn coins by beating your energy estimate. Redeem for credits & vouchers!
          </div>
        </NavLink>

        {/* Notifications */}
        <div className="relative shrink-0">
          <button
            onClick={() => setShowDropdown(!showDropdown)}
            className="p-2 bg-white/5 rounded-full border border-white/5 text-gray-400 hover:text-primary hover:border-primary/50 transition-all relative"
          >
            <Bell className="size-4" />
            {unreadCount > 0 && (
              <span className="absolute top-0 right-0 size-2 bg-volt-pink rounded-full border border-surface animate-ping" />
            )}
          </button>

          {showDropdown && (
            <div className="absolute right-0 top-11 w-80 bg-surface-container-low border border-white/10 rounded-xl shadow-2xl p-4 z-50 animate-slide-up">
              <div className="flex items-center justify-between border-b border-white/5 pb-2 mb-2">
                <span className="font-semibold text-sm text-white">Notifications</span>
                {unreadCount > 0 && (
                  <button
                    onClick={markAllAsRead}
                    className="text-[11px] text-primary hover:underline flex items-center gap-1 font-semibold"
                  >
                    <Check className="size-3" /> Mark all read
                  </button>
                )}
              </div>

              <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
                {notifications.length === 0 ? (
                  <p className="text-center text-xs text-gray-400 py-4">No recent logs</p>
                ) : (
                  notifications.map((n) => (
                    <button
                      type="button"
                      key={n.id}
                      onClick={() => markAsRead(n.id)}
                      className={`p-2.5 rounded-lg border text-xs transition-colors cursor-pointer w-full text-left block ${
                        n.read
                          ? 'bg-transparent border-transparent text-gray-400'
                          : 'bg-primary/5 border-primary/20 text-white hover:bg-primary/10'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-1 mb-1">
                        <span className="font-bold">{n.title}</span>
                        {!n.read && <span className="size-1.5 rounded-full bg-volt-pink mt-1 shrink-0" />}
                      </div>
                      <p className="text-gray-400 text-[11px] leading-relaxed">{n.message}</p>
                    </button>
                  ))
                )}
              </div>
            </div>
          )}
        </div>

        {/* User Profile Icon Button */}
        <NavLink
          to="/profile"
          className="p-2 bg-white/5 rounded-full border border-white/5 text-gray-400 hover:text-primary hover:border-primary/50 transition-all shrink-0"
          title="Profile"
        >
          <User className="size-4" />
        </NavLink>

        {/* Settings Icon Button */}
        <NavLink
          to="/settings"
          className="p-2 bg-white/5 rounded-full border border-white/5 text-gray-400 hover:text-primary hover:border-primary/50 transition-all shrink-0"
          title="Settings"
        >
          <Settings className="size-4" />
        </NavLink>
        
        {/* Sign Out */}
        <button
          onClick={logout}
          className="p-2 bg-white/5 rounded-full border border-white/5 text-gray-400 hover:text-rose-400 hover:bg-[#f43f5e]/10 transition-all shrink-0"
          title="Sign Out"
        >
          <LogOut className="size-4" />
        </button>
      </div>
    </header>

    {/* Mobile Dropdown Menu Navigation */}
    {showMobileMenu && (
      <div className="md:hidden fixed top-16 left-0 right-0 bg-slate-950/95 border-b border-white/10 p-4 z-30 flex flex-col gap-2 backdrop-blur-2xl animate-slide-up">
        {links.map((link) => {
          const Icon = link.icon;
          return (
            <NavLink
              key={link.to}
              to={link.to}
              onClick={() => setShowMobileMenu(false)}
              className={({ isActive }) =>
                `flex items-center gap-3 px-4 py-3 rounded-xl font-medium text-sm transition-all duration-200 ${
                  isActive
                    ? 'bg-white/[0.08] text-white border-l-4 border-primary'
                    : 'text-slate-400 hover:text-white hover:bg-white/5'
                }`
              }
            >
              <Icon className="size-4 shrink-0" />
              <span>{link.label}</span>
            </NavLink>
          );
        })}
      </div>
    )}
    </>
  );
}
