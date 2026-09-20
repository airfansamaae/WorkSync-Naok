import React from 'react';
import { 
  LayoutDashboard, 
  FileCheck2, 
  FolderGit2, 
  Globe, 
  Settings, 
  Code2,
  ShieldCheck,
  UserCheck,
  ChevronRight,
  FolderOpen
} from 'lucide-react';
import { ActiveTab, User, SchoolProfile } from '../types';

interface SidebarProps {
  activeTab: ActiveTab;
  onSelectTab?: (tab: ActiveTab) => void;
  onNavigate?: (tab: ActiveTab) => void;
  currentUser: User | null;
  school?: SchoolProfile;
  pendingCount?: number;
  onOpenLegend?: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  activeTab,
  onSelectTab,
  onNavigate,
  currentUser,
  school,
  pendingCount = 0,
  onOpenLegend
}) => {
  const handleSelectTab = onSelectTab || onNavigate || (() => {});

  interface NavItem {
    id: ActiveTab;
    label: string;
    sublabel: string;
    icon: React.ComponentType<{ className?: string }>;
    badge?: number | string | null;
    badgeColor?: string;
    isExternalLink?: boolean;
    url?: string;
  }

  const navItems: NavItem[] = [
    {
      id: 'dashboard' as ActiveTab,
      label: 'Dashboard',
      sublabel: 'Dashboard & ปฏิทินส่งงาน',
      icon: LayoutDashboard,
      badge: null,
    },
    {
      id: 'assignments' as ActiveTab,
      label: 'ระบบจัดการงาน',
      sublabel: currentUser?.role === 'admin' ? 'สร้างงานและจัดการการส่งงาน' : 'ส่งงานและดูงานที่ได้รับมอบหมาย',
      icon: FileCheck2,
      badge: null,
    },
    {
      id: 'documents' as ActiveTab,
      label: 'ศูนย์เอกสาร & คำสั่ง',
      sublabel: 'เอกสารตัวอย่างและคำสั่งโรงเรียน',
      icon: FolderGit2,
      badge: null,
    },
    {
      id: 'websites' as ActiveTab,
      label: 'website แนะนำ',
      sublabel: 'เว็บไซต์และบริการการศึกษาแนะนำ',
      icon: Globe,
      badge: null,
    },
  ];

  return (
    <aside className="hidden md:flex w-72 bg-purple-50/60 backdrop-blur-sm border border-purple-200/80 rounded-3xl flex-col justify-between shrink-0 h-[calc(100vh-6rem)] sticky top-20 select-none shadow-sm overflow-hidden">
      {/* Upper Navigation Section */}
      <div className="p-4 space-y-1.5 overflow-y-auto">
        <div className="px-3 py-2 text-xs font-bold uppercase tracking-wider text-purple-800/80">
          เมนูหลักระบบวิชาการ
        </div>

        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              id={`sidebar-nav-${item.id}`}
              onClick={() => {
                if (item.isExternalLink && item.url) {
                  window.open(item.url, '_blank', 'noopener,noreferrer');
                } else {
                  handleSelectTab(item.id);
                }
              }}
              className={`w-full text-left flex items-start gap-3 p-3 rounded-2xl transition-all duration-200 group relative ${
                isActive
                  ? 'bg-white text-purple-950 font-semibold shadow-xs border border-purple-200/90'
                  : 'text-slate-600 hover:bg-purple-100/70 hover:text-purple-950 border border-transparent'
              }`}
            >
              <div
                className={`p-2 rounded-xl transition-colors shrink-0 mt-0.5 ${
                  isActive
                    ? 'bg-purple-600 text-white shadow-xs'
                    : 'bg-white/80 text-purple-700 group-hover:bg-purple-600 group-hover:text-white border border-purple-200/60 shadow-2xs'
                }`}
              >
                <Icon className="w-4 h-4 sm:w-5 sm:h-5" />
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-1">
                  <span className={`text-sm font-bold whitespace-nowrap leading-tight ${isActive ? 'text-purple-950' : 'text-slate-800 group-hover:text-purple-950'}`}>
                    {item.label}
                  </span>
                  {item.badge && (
                    <span
                      className={`text-[10px] px-1.5 py-0.5 rounded-md font-semibold whitespace-nowrap ${
                        item.badgeColor || 'bg-purple-100 text-purple-800 border border-purple-200'
                      }`}
                    >
                      {item.badge}
                    </span>
                  )}
                </div>
                <p className={`text-xs truncate mt-0.5 leading-none ${isActive ? 'text-purple-600/90' : 'text-slate-500 group-hover:text-purple-700'}`}>
                  {item.sublabel}
                </p>
              </div>

              {isActive && (
                <div className="w-1.5 h-6 bg-purple-600 rounded-full absolute right-2 top-1/2 -translate-y-1/2 shadow-xs" />
              )}
            </button>
          );
        })}
      </div>

      {/* Bottom User/Drive Status Card */}
      <div className="p-4 border-t border-purple-200/70 bg-purple-100/40">
        <div className="bg-white/95 rounded-2xl p-3.5 border border-purple-200/80 shadow-xs">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-1.5 text-xs font-bold text-slate-800">
              <ShieldCheck className="w-4 h-4 text-emerald-600" />
              <span>สิทธิ์การใช้งาน</span>
            </div>
            <span
              className={`text-[11px] font-bold px-2 py-0.5 rounded-md ${
                currentUser?.role === 'admin'
                  ? 'bg-purple-100 text-purple-800 border border-purple-200'
                  : 'bg-emerald-100 text-emerald-800 border border-emerald-200'
              }`}
            >
              {currentUser?.role === 'admin' ? 'Master Admin' : 'อาจารย์ผู้สอน'}
            </span>
          </div>

          <div className="text-xs text-slate-600 space-y-1">
            <p className="truncate">
              <strong className="text-slate-900">ผู้ใช้:</strong> {currentUser?.fullName || 'ผู้เยี่ยมชม'}
            </p>
            <p className="truncate text-[11px]">
              <strong className="text-slate-900">สังกัด:</strong> {currentUser?.department || '-'}
            </p>
          </div>

          <a
            href={`https://drive.google.com/drive/folders/${school?.primaryDriveFolderId || '1IpsaGJhJqtuYHTLiHmT2kqOe7CBq4as-'}`}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-3 flex items-center justify-between w-full px-3 py-2 text-xs font-bold text-purple-900 bg-purple-100/80 hover:bg-purple-200 hover:text-purple-950 rounded-xl transition-all border border-purple-200/90 shadow-2xs group cursor-pointer"
          >
            <span className="flex items-center gap-1.5">
              <FolderOpen className="w-4 h-4 text-purple-700 group-hover:scale-105 transition-transform" />
              <span>คลังจัดเก็บเอกสาร</span>
            </span>
            <ChevronRight className="w-3.5 h-3.5 text-purple-600 group-hover:translate-x-0.5 transition-transform" />
          </a>
        </div>
      </div>
    </aside>
  );
};
