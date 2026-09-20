import React, { useState, useEffect } from 'react';
import { 
  Settings as SettingsIcon, 
  LogOut, 
  UserCheck, 
  School,
  Database,
  Code2,
  RefreshCw,
  Wifi,
  WifiOff,
  CheckCircle2,
  GraduationCap
} from 'lucide-react';
import { User, SchoolProfile, ActiveTab } from '../types';
import { storage, SyncStatusInfo } from '../services/storageService';

interface TopHeaderProps {
  currentUser: User | null;
  school: SchoolProfile;
  activeTab?: ActiveTab;
  onSelectTab?: (tab: ActiveTab) => void;
  onNavigate?: (tab: ActiveTab) => void;
  onLogout: () => void;
  onOpenAuth?: () => void;
  onOpenLoginModal?: () => void;
  announcements?: any[];
  users?: any[];
}

export const TopHeader: React.FC<TopHeaderProps> = ({
  currentUser,
  school,
  activeTab = 'dashboard',
  onSelectTab,
  onNavigate,
  onLogout,
  onOpenAuth,
  onOpenLoginModal
}) => {
  const [syncInfo, setSyncInfo] = useState<SyncStatusInfo>(storage.getSyncStatus());
  const [manualSyncing, setManualSyncing] = useState(false);
  const [logoError, setLogoError] = useState(false);

  useEffect(() => {
    const unsub = storage.subscribeSync((info) => {
      setSyncInfo(info);
    });
    return unsub;
  }, []);

  const handleManualSync = async () => {
    setManualSyncing(true);
    await storage.pullLatestFromCloud(false);
    setTimeout(() => {
      setManualSyncing(false);
    }, 600);
  };

  const handleSelectTab = onSelectTab || onNavigate || (() => {});
  const handleOpenAuth = onOpenAuth || onOpenLoginModal || (() => {});

  return (
    <header className="bg-white/95 backdrop-blur-md border-b border-purple-100/80 sticky top-0 z-30 shadow-xs">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Brand / School Info */}
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-linear-to-br from-purple-600 to-indigo-700 flex items-center justify-center text-white shadow-xs overflow-hidden">
              {school?.logoUrl && !logoError ? (
                <img 
                  src={school.logoUrl} 
                  alt="School Logo" 
                  className="w-full h-full object-cover"
                  referrerPolicy="no-referrer"
                  onError={() => setLogoError(true)}
                />
              ) : (
                <School className="w-5 h-5" />
              )}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-base sm:text-lg font-bold text-slate-900 tracking-tight leading-none">
                  {school?.name || 'โรงเรียนสาธิตเทศบาลวิชาการ'}
                </h1>
              </div>
              <p className="text-xs text-slate-500 hidden md:block">
                ระบบงานวิชาการ ระบบจัดการงาน และศูนย์เอกสาร
              </p>
            </div>
          </div>

          {/* Right Action Tools */}
          <div className="flex items-center space-x-2 sm:space-x-3">
            {/* Live Real-time Sync Indicator */}
            <button
              id="header-realtime-sync-btn"
              onClick={handleManualSync}
              title="ซิงค์ข้อมูล Real-time ทุกเบราว์เซอร์อัตโนมัติ (คลิกเพื่อดึงข้อมูลล่าสุด)"
              className="hidden sm:inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium rounded-full border transition-all cursor-pointer bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100"
            >
              <RefreshCw className={`w-3 h-3 text-emerald-600 ${syncInfo.status === 'syncing' || manualSyncing ? 'animate-spin' : ''}`} />
              <span className="text-[11px] font-semibold">
                {syncInfo.status === 'syncing' || manualSyncing ? 'กำลังซิงค์...' : 'Real-time Sync สด'}
              </span>
            </button>

            {/* Active User Pill */}
            {currentUser ? (
              <div className="flex items-center gap-2 pl-2 border-l border-slate-200">
                <div className="hidden lg:flex flex-col text-right">
                  <span className="text-xs font-medium text-slate-900 leading-tight">
                    {currentUser.fullName}
                  </span>
                  <span className="text-[10px] text-purple-600 font-medium">
                    {currentUser.role === 'admin' ? 'Master Admin' : currentUser.department}
                  </span>
                </div>
                <div className="w-8 h-8 rounded-full bg-purple-100 border border-purple-200 flex items-center justify-center text-purple-700 font-medium text-xs overflow-hidden">
                  {currentUser.role === 'admin' ? (
                    school?.logoUrl ? (
                      <img 
                        src={school.logoUrl} 
                        alt="School Logo (Admin)" 
                        className="w-full h-full object-contain p-0.5"
                        referrerPolicy="no-referrer"
                      />
                    ) : (
                      <GraduationCap className="w-4 h-4 text-purple-700" />
                    )
                  ) : currentUser.avatarUrl ? (
                    <img 
                      src={currentUser.avatarUrl} 
                      alt={currentUser.fullName} 
                      className="w-full h-full object-cover"
                      referrerPolicy="no-referrer"
                    />
                  ) : (
                    <span>{currentUser.fullName.charAt(0)}</span>
                  )}
                </div>

                {/* Small Settings Button */}
                <button
                  id="header-settings-btn"
                  onClick={() => handleSelectTab('settings')}
                  title="การตั้งค่าระบบและโปรไฟล์"
                  className={`p-1.5 text-slate-500 hover:text-purple-700 hover:bg-purple-50 rounded-lg border border-slate-200 transition-colors ${
                    activeTab === 'settings' ? 'bg-purple-100 text-purple-800 border-purple-300' : ''
                  }`}
                >
                  <SettingsIcon className="w-4 h-4" />
                </button>

                {/* Small Logout Button */}
                <button
                  id="header-logout-btn"
                  onClick={onLogout}
                  title="ออกจากระบบ"
                  className="p-1.5 text-slate-500 hover:text-rose-600 hover:bg-rose-50 rounded-lg border border-slate-200 transition-colors"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <button
                id="header-login-btn"
                onClick={handleOpenAuth}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-white bg-purple-600 hover:bg-purple-700 rounded-lg transition-all shadow-xs glow-purple-hover"
              >
                <UserCheck className="w-3.5 h-3.5" />
                <span>เข้าสู่ระบบ / ลงทะเบียน</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </header>
  );
};

