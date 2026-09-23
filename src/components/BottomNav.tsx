import React from 'react';
import { 
  LayoutDashboard, 
  FileCheck2, 
  FolderGit2, 
  Globe 
} from 'lucide-react';
import { ActiveTab } from '../types';

interface BottomNavProps {
  activeTab: ActiveTab;
  onSelectTab?: (tab: ActiveTab) => void;
  onNavigate?: (tab: ActiveTab) => void;
  pendingCount?: number;
}

export const BottomNav: React.FC<BottomNavProps> = ({
  activeTab,
  onSelectTab,
  onNavigate,
  pendingCount = 0
}) => {
  const handleSelectTab = onSelectTab || onNavigate || (() => {});

  interface BottomNavItem {
    id: ActiveTab;
    label: string;
    icon: React.ComponentType<{ className?: string }>;
    isExternalLink?: boolean;
    url?: string;
    badge?: number | string | null;
  }

  const items: BottomNavItem[] = [
    { id: 'dashboard' as ActiveTab, label: 'Dashboard', icon: LayoutDashboard },
    { id: 'assignments' as ActiveTab, label: 'ระบบจัดการงาน', icon: FileCheck2 },
    { id: 'documents' as ActiveTab, label: 'ศูนย์เอกสาร', icon: FolderGit2 },
    { id: 'websites' as ActiveTab, label: 'website แนะนำ', icon: Globe },
  ];

  return (
    <nav 
      id="mobile-bottom-navigation"
      className="lg:hidden fixed bottom-0 left-0 right-0 z-50 bg-white/98 backdrop-blur-md border-t border-purple-200/80 px-2 py-1.5 shadow-[0_-4px_24px_rgba(0,0,0,0.08)] transform translate-z-0"
    >
      <div className="grid grid-cols-4 gap-1 sm:gap-2 items-center max-w-md sm:max-w-xl md:max-w-2xl mx-auto">
        {items.map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              id={`mobile-nav-${item.id}`}
              type="button"
              onClick={() => {
                if (item.isExternalLink && item.url) {
                  window.open(item.url, '_blank', 'noopener,noreferrer');
                } else {
                  handleSelectTab(item.id);
                }
              }}
              className={`flex flex-col items-center justify-center py-1.5 px-0.5 sm:px-2 rounded-xl transition-all relative ${
                isActive
                  ? 'text-purple-700 font-bold bg-purple-50/80'
                  : 'text-slate-500 hover:text-purple-600'
              }`}
            >
              <div className="relative">
                <Icon className={`w-4 h-4 sm:w-5 sm:h-5 ${isActive ? 'stroke-[2.5px] text-purple-700' : 'stroke-[1.75px]'}`} />
                {item.badge && (
                  <span className="absolute -top-1 -right-2 bg-amber-500 text-white text-[8px] font-bold rounded-full w-3.5 h-3.5 flex items-center justify-center">
                    {item.badge}
                  </span>
                )}
              </div>
              <span className={`text-[10px] sm:text-xs mt-0.5 leading-none whitespace-nowrap ${isActive ? 'font-black text-purple-800' : 'font-medium'}`}>
                {item.label}
              </span>
              {isActive && (
                <span className="w-1.5 h-1 bg-purple-700 rounded-full mt-0.5" />
              )}
            </button>
          );
        })}
      </div>
    </nav>
  );
};
