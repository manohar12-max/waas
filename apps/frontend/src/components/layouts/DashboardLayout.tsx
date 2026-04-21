import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  LayoutDashboard,
  School,
  Users,
  Settings,
  LogOut,
  Menu,
  X,
  ChevronRight,
  UserCircle,
  Layout,
  BookOpen,
  Sun,
  Moon,
  Image,
  Library,
  Terminal,
  ClipboardList
} from 'lucide-react';
import { useTheme } from '../ThemeProvider';
import ProfilePanel from '../ProfilePanel';
import { useGlobalRules } from '../../context/GlobalRulesContext';
import MaintenancePage from '../../modules/shared/MaintenancePage';

interface SidebarItemProps {
  icon: React.ElementType;
  label: string;
  path: string;
  active: boolean;
  collapsed: boolean;
  onClick: () => void;
}

const SidebarItem = ({ icon: Icon, label, active, collapsed, onClick }: Omit<SidebarItemProps, 'path'>) => (
  <button
    onClick={onClick}
    className={`w-full flex items-center gap-3 px-4 py-4 rounded-2xl cursor-pointer transition-all duration-300 group ${active
        ? 'bg-primary-light text-white shadow-lg shadow-primary-light/30'
        : 'hover:bg-primary-light/10 text-slate-500 dark:text-slate-400 hover:text-primary-light'
      }`}
  >
    <div className={`transition-transform duration-300 shrink-0 ${active ? 'scale-110' : 'group-hover:scale-110'}`}>
      <Icon className="w-5 h-5" />
    </div>
    <div className={`overflow-hidden transition-all duration-300 flex items-center ${collapsed ? 'w-0 opacity-0' : 'w-full opacity-100'}`}>
      <span className="font-semibold tracking-tight whitespace-nowrap ml-1">
        {label}
      </span>
    </div>
  </button>
);

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const { theme, setTheme } = useTheme();
  const user = JSON.parse(localStorage.getItem('user') || '{}');
  const { rules } = useGlobalRules();

  // Maintenance mode — block non-SA users
  if (rules.maintenance_mode && user.role !== 'SUPER_ADMIN') {
    return <MaintenancePage />;
  }

  const menuItems = [
    { icon: LayoutDashboard, label: 'Overview', path: user.role === 'STUDENT' ? '/student/dashboard' : '/dashboard', roles: ['SUPER_ADMIN', 'COLLEGE_ADMIN', 'TEACHER', 'INSTRUCTOR', 'STUDENT'] },
    { icon: School, label: 'Partners', path: '/colleges', roles: ['SUPER_ADMIN'] },
    { icon: Users, label: 'Instructors', path: '/instructors', roles: ['COLLEGE_ADMIN'] },
    { icon: Users, label: 'Teachers', path: '/teachers', roles: ['COLLEGE_ADMIN', 'INSTRUCTOR'] },
    { icon: Layout, label: 'Division Hub', path: '/divisions', roles: ['INSTRUCTOR'] },
    { icon: BookOpen, label: 'Workshop Hub', path: '/workshops', roles: ['COLLEGE_ADMIN', 'INSTRUCTOR'] },
    { icon: Image, label: 'Media Feed', path: '/media-feed', roles: ['SUPER_ADMIN', 'COLLEGE_ADMIN', 'TEACHER', 'INSTRUCTOR', 'STUDENT'] },
    // Community Forum — hidden when forum_enabled = false
    ...(rules.forum_enabled ? [{ icon: Users, label: 'Community Forum', path: '/forum', roles: ['SUPER_ADMIN', 'COLLEGE_ADMIN', 'TEACHER', 'INSTRUCTOR', 'STUDENT'] }] : []),
    { icon: Library, label: 'Learning Center', path: '/learning-center', roles: ['TEACHER', 'INSTRUCTOR', 'STUDENT'] },
    // Coding Sandbox — hidden when sandbox_enabled = false
    ...(rules.sandbox_enabled ? [{ icon: Terminal, label: 'Coding Sandbox', path: '/sandbox', roles: ['SUPER_ADMIN', 'COLLEGE_ADMIN', 'TEACHER', 'INSTRUCTOR', 'STUDENT'] }] : []),
    { icon: Layout, label: 'My Divisions', path: '/teacher/divisions', roles: ['TEACHER'] },
    { icon: ClipboardList, label: 'NAAC Reports', path: '/naac-reports', roles: ['SUPER_ADMIN', 'COLLEGE_ADMIN'] },
    { icon: Settings, label: 'Global Rules', path: '/dashboard/settings', roles: ['SUPER_ADMIN', 'COLLEGE_ADMIN'] },
  ];

  const impersonateCollegeId = localStorage.getItem('impersonate_college_id');
  const isImpersonating = user.role === 'SUPER_ADMIN' && impersonateCollegeId;

  const activeRoles = user.role ? [user.role] : [];
  if (isImpersonating) {
    activeRoles.push('COLLEGE_ADMIN', 'INSTRUCTOR', 'TEACHER');
  }

  const filteredMenuItems = menuItems.filter(item => item.roles.some(role => activeRoles.includes(role)));

  const handleLogout = () => {
    localStorage.clear();
    navigate('/login');
  };

  return (
    <div className="min-h-screen bg-background-light dark:bg-background-dark flex text-slate-900 dark:text-slate-100 overflow-hidden">
      {/* Background Blobs - Midnight Premium */}
      <div className="fixed top-[-15%] right-[-10%] w-[600px] h-[600px] bg-primary-light/10 blur-[130px] rounded-full -z-10 animate-pulse" />
      <div className="fixed bottom-[-15%] left-[-10%] w-[600px] h-[600px] bg-indigo-500/10 blur-[130px] rounded-full -z-10" />

      {/* Sidebar */}
      <motion.aside
        initial={false}
        animate={{ width: collapsed ? 80 : 280 }}
        transition={{ type: "spring", stiffness: 300, damping: 30 }}
        className="hidden md:flex flex-col bg-surface-light dark:bg-card-dark border-r border-slate-200 dark:border-white/10 h-screen sticky top-0 z-50 shadow-[20px_0_50px_rgba(0,0,0,0.1)] dark:shadow-[20px_0_80px_rgba(0,0,0,0.4)]"
      >
        <div className="p-6 flex items-center justify-between overflow-hidden border-b-2 border-slate-200/60 dark:border-white/10 bg-white/50 dark:bg-black/20 backdrop-blur-sm mb-4">
          <div className={`transition-all duration-300 flex items-center overflow-hidden ${collapsed ? 'w-0 opacity-0' : 'w-full opacity-100'}`}>
            <div className="font-outfit font-black text-2xl tracking-tight text-primary-light whitespace-nowrap flex flex-col">
              NEXUS<span className="text-[10px] font-black uppercase tracking-widest text-slate-500 mt-1">by Pixaflip</span>
            </div>
          </div>
          <button
            onClick={() => setCollapsed(!collapsed)}
            className="p-2.5 bg-white dark:bg-white/5 hover:bg-slate-50 dark:hover:bg-white/10 rounded-xl transition-all text-slate-500 dark:text-slate-400 shrink-0 shadow-sm border border-slate-200 dark:border-white/10 hover:border-primary-light/30"
          >
            {collapsed ? <ChevronRight className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>

        <div className="px-4 py-4 flex-1 space-y-2 overflow-y-auto no-scrollbar">
          {filteredMenuItems.map((item) => (
            <SidebarItem
              key={item.path}
              {...item}
              active={location.pathname === item.path}
              collapsed={collapsed}
              onClick={() => navigate(item.path)}
            />
          ))}
        </div>

        <div className="p-4 space-y-2 border-t border-slate-200 dark:border-white/10 bg-slate-50/50 dark:bg-white/[0.02]">
          <button
            onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
            className="w-full flex items-center gap-3 px-4 py-3 rounded-xl cursor-pointer transition-all hover:bg-primary-light/10 text-slate-500 dark:text-slate-400 group relative overflow-hidden"
          >
            <div className="w-5 h-5 flex items-center justify-center group-hover:text-primary-light transition-colors shrink-0">
              {theme === 'dark' ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
            </div>
            <div className={`overflow-hidden transition-all duration-300 flex items-center ${collapsed ? 'w-0 opacity-0' : 'w-full opacity-100'}`}>
              <span className="font-medium group-hover:text-primary-light transition-colors whitespace-nowrap ml-1">
                {theme === 'dark' ? 'Light Mode' : 'Dark Mode'}
              </span>
            </div>
          </button>

          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-3 px-4 py-3 rounded-xl cursor-pointer transition-all hover:bg-red-500/10 text-red-500 group relative overflow-hidden"
          >
            <LogOut className="w-5 h-5 group-hover:translate-x-1 transition-transform shrink-0" />
            <div className={`overflow-hidden transition-all duration-300 flex items-center ${collapsed ? 'w-0 opacity-0' : 'w-full opacity-100'}`}>
              <span className="font-medium whitespace-nowrap ml-1">
                Logout
              </span>
            </div>
          </button>
        </div>
      </motion.aside>

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col h-screen overflow-hidden bg-white/40 dark:bg-transparent backdrop-blur-[1px]">
        {/* Top Header Bar */}
        <div className="flex items-center justify-between px-6 py-3 border-b border-slate-200 dark:border-white/10 bg-white/80 dark:bg-black/20 backdrop-blur-sm sticky top-0 z-30 shrink-0">
          <div className="flex items-center gap-3">
            {/* Mobile menu toggle */}
            <button
              onClick={() => setMobileOpen(true)}
              className="md:hidden p-2 rounded-xl hover:bg-slate-100 dark:hover:bg-white/10 transition-colors cursor-pointer"
            >
              <Menu className="w-5 h-5" />
            </button>
            <div className="text-sm font-bold opacity-40 uppercase tracking-widest hidden md:block">
              {filteredMenuItems.find(m => m.path === location.pathname)?.label || 'Dashboard'}
            </div>
          </div>
          <div className="flex items-center gap-3">
            {/* Theme toggle */}
            <button
              onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
              className="p-2 rounded-xl hover:bg-slate-100 dark:hover:bg-white/10 transition-colors cursor-pointer text-slate-500"
              title={theme === 'dark' ? 'Light Mode' : 'Dark Mode'}
            >
              {theme === 'dark' ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
            </button>
            {/* Profile Dropdown */}
            <ProfilePanel onLogout={handleLogout} />
          </div>
        </div>

        {/* GOD MODE Banner */}
        {isImpersonating && (
          <div className="flex items-center justify-between bg-orange-500 dark:bg-orange-600 text-white p-4 font-bold text-sm tracking-wide shadow-lg z-40">
            <div className="flex items-center gap-2">
              <span className="animate-pulse w-2 h-2 rounded-full bg-white opacity-80" />
              GOD MODE ACTIVE
            </div>
            <button
              onClick={() => {
                localStorage.removeItem('impersonate_college_id');
                navigate('/colleges');
                window.location.reload();
              }}
              className="bg-white text-orange-600 px-4 py-1.5 rounded-full text-xs uppercase font-black tracking-widest cursor-pointer hover:scale-105 active:scale-95 transition-all shadow-md shadow-black/10"
            >
              Exit Identity
            </button>
          </div>
        )}


        {/* Scrollable Area */}
        <div className="flex-1 overflow-y-auto p-4 md:p-8 custom-scrollbar">
          <motion.div
            key={location.pathname}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
          >
            {children}
          </motion.div>
        </div>
      </main>

      {/* Mobile Sidebar Overlay */}
      <AnimatePresence>
        {mobileOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setMobileOpen(false)}
              className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100] md:hidden"
            />
            <motion.div
              initial={{ x: '-100%' }}
              animate={{ x: 0 }}
              exit={{ x: '-100%' }}
              className="fixed inset-y-0 left-0 w-72 bg-white dark:bg-background-dark z-[101] md:hidden p-6 border-r border-slate-200 dark:border-white/10 shadow-2xl"
            >
              <div className="flex justify-between items-center mb-10">
                <span className="font-outfit font-black text-xl">NEXUS <span className="text-[10px] uppercase font-bold text-slate-500">by Pixaflip</span></span>
                <button onClick={() => setMobileOpen(false)}><X className="w-6 h-6" /></button>
              </div>
              <div className="space-y-4">
                {filteredMenuItems.map(item => (
                  <button
                    key={item.path}
                    onClick={() => { navigate(item.path); setMobileOpen(false); }}
                    className={`w-full flex items-center gap-3 p-4 rounded-2xl transition-all cursor-pointer ${location.pathname === item.path
                        ? 'bg-primary-light text-white shadow-lg'
                        : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-white/5'
                      }`}
                  >
                    <item.icon className="w-5 h-5" />
                    <span className="font-bold">{item.label}</span>
                  </button>
                ))}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
