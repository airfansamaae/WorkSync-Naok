import React, { useState, useEffect, useCallback } from 'react';
import { 
  TopHeader 
} from './components/TopHeader';
import { 
  Sidebar 
} from './components/Sidebar';
import { 
  BottomNav 
} from './components/BottomNav';
import { 
  DashboardView 
} from './components/DashboardView';
import { 
  AssignmentsView 
} from './components/AssignmentsView';
import { 
  DocumentCenterView 
} from './components/DocumentCenterView';
import { 
  RecommendedWebsitesView 
} from './components/RecommendedWebsitesView';
import { 
  SettingsView 
} from './components/SettingsView';
import { 
  DedicatedRawFileViewer 
} from './components/DedicatedRawFileViewer';
import { 
  LegendModal 
} from './components/LegendModal';
import { 
  AuthModal 
} from './components/AuthModal';
import { 
  Code, 
  Copy, 
  Check, 
  Terminal, 
  Server, 
  X,
  FileCode,
  ShieldCheck
} from 'lucide-react';
import { 
  NavTab, 
  User, 
  SchoolProfile, 
  Assignment, 
  Submission, 
  DocumentItem, 
  Announcement, 
  UploadedFile,
  RecommendedWebsite 
} from './types';
import { storage } from './services/storageService';
import { initAuth } from './services/googleAuthService';
import { GAS_CODE_SNIPPET, D1_SCHEMA_SQL } from './services/gasCodeGenerator';
import { openAuthenticFileInNewTab } from './utils/fileViewer';
import Swal from 'sweetalert2';

export default function App() {
  // If the window was opened in dedicated raw file viewer mode (?view_raw_file=1), render the raw authentic viewer immediately
  const isViewRawFileMode = typeof window !== 'undefined' && window.location.search.includes('view_raw_file=1');
  if (isViewRawFileMode) {
    return <DedicatedRawFileViewer />;
  }

  // Navigation State
  const [activeTab, setActiveTab] = useState<NavTab>('dashboard');

  // Application Data States - Starts at Login Page every time website is opened
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [school, setSchool] = useState<SchoolProfile>(storage.getSchoolProfile());
  const [assignments, setAssignments] = useState<Assignment[]>(storage.getAssignments());
  const [submissions, setSubmissions] = useState<Submission[]>(storage.getSubmissions());
  const [documents, setDocuments] = useState<DocumentItem[]>(storage.getDocuments());
  const [announcements, setAnnouncements] = useState<Announcement[]>(storage.getAnnouncements());
  const [websites, setWebsites] = useState<RecommendedWebsite[]>(storage.getWebsites());
  const [users, setUsers] = useState<User[]>(storage.getUsers());

  // Modal States
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [isLegendModalOpen, setIsLegendModalOpen] = useState(false);
  const [isDevCodeModalOpen, setIsDevCodeModalOpen] = useState(false);
  const [devCodeTab, setDevCodeTab] = useState<'gas' | 'd1'>('gas');
  const [copiedCode, setCopiedCode] = useState(false);
  const [activePreviewFile, setActivePreviewFile] = useState<{
    file: UploadedFile;
    assignmentTitle?: string;
    uploaderName?: string;
  } | null>(null);

  // Load and refresh state helper (strictly prevents auto-login on data refresh)
  const refreshAllData = useCallback(() => {
    const activeUser = storage.getCurrentUser();
    setCurrentUser((prev) => (prev ? activeUser : null));
    setSchool(storage.getSchoolProfile());
    setAssignments(storage.getAssignments());
    setSubmissions(storage.getSubmissions());
    setDocuments(storage.getDocuments());
    setAnnouncements(storage.getAnnouncements());
    setWebsites(storage.getWebsites());
    setUsers(storage.getUsers());
  }, []);

  // 15-Minute Inactivity / Tab Switching Auto-Logout Timer (900,000 ms)
  useEffect(() => {
    if (!currentUser) return;

    let lastActivityTime = Date.now();
    const INACTIVITY_LIMIT_MS = 15 * 60 * 1000; // 15 minutes

    const updateActivity = () => {
      lastActivityTime = Date.now();
    };

    // User activity listeners (mouse movement, clicks, typing, touch, scrolling)
    const activityEvents = ['mousemove', 'mousedown', 'keydown', 'touchstart', 'scroll', 'click', 'wheel'];
    activityEvents.forEach((ev) => {
      window.addEventListener(ev, updateActivity, { passive: true });
    });

    const triggerAutoLogout = () => {
      storage.logout();
      setCurrentUser(null);
      setActiveTab('dashboard');
      Swal.fire({
        icon: 'warning',
        title: 'ออกจากระบบอัตโนมัติ (Session Timeout)',
        text: 'ไม่มีการเคลื่อนไหวหรือไปหน้าอื่นเกิน 15 นาที ระบบจึงนำท่านกลับสู่หน้าเข้าสู่ระบบอัตโนมัติเพื่อความปลอดภัย',
        confirmButtonColor: '#7C3AED',
        confirmButtonText: 'เข้าสู่ระบบอีกครั้ง',
      });
    };

    // Check on returning to tab if 15 minutes have elapsed
    const handleVisibilityChange = () => {
      if (!document.hidden) {
        if (Date.now() - lastActivityTime >= INACTIVITY_LIMIT_MS) {
          triggerAutoLogout();
        }
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);

    // Periodic check interval
    const intervalId = setInterval(() => {
      if (Date.now() - lastActivityTime >= INACTIVITY_LIMIT_MS) {
        triggerAutoLogout();
      }
    }, 5000);

    return () => {
      clearInterval(intervalId);
      activityEvents.forEach((ev) => {
        window.removeEventListener(ev, updateActivity);
      });
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [currentUser]);

  // Subscribe to storage changes & optional SSE events
  useEffect(() => {
    // Initialize Google Auth state listener
    const unsubGoogleAuth = initAuth();

    const unsubscribe = storage.subscribe(() => {
      refreshAllData();
    });

    return () => {
      unsubGoogleAuth();
      unsubscribe();
    };
  }, []);

  // Open Preview -> Opens authentic raw original file in dedicated A4 viewer (zero popup blockers, instant A4 pagination)
  const handleOpenFilePreview = (
    file: UploadedFile,
    assignmentTitle?: string,
    uploaderName?: string
  ) => {
    if (!file) return;
    setActivePreviewFile({
      file,
      assignmentTitle: assignmentTitle || file.name,
      uploaderName: uploaderName || '',
    });
  };

  // Handle Logout
  const handleLogout = () => {
    Swal.fire({
      title: 'ต้องการออกจากระบบ?',
      text: 'คุณต้องการลงชื่อออกจากระบบงานวิชาการใช่หรือไม่?',
      icon: 'question',
      showCancelButton: true,
      confirmButtonColor: '#7C3AED',
      cancelButtonColor: '#94A3B8',
      confirmButtonText: 'ใช่, ออกจากระบบ',
      cancelButtonText: 'ยกเลิก',
    }).then((res) => {
      if (res.isConfirmed) {
        storage.logout();
        setCurrentUser(null);
        setActiveTab('dashboard');
        Swal.fire({
          icon: 'success',
          title: 'ออกจากระบบสำเร็จ',
          timer: 1400,
          showConfirmButton: false,
        });
      }
    });
  };

  // Copy Code in Dev Inspector
  const handleCopyCode = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2000);
  };

  // Pending user badge count for Admin
  const pendingMembersCount = users.filter((u) => u.status === 'pending').length;

  if (!currentUser) {
    return (
      <div className="min-h-screen bg-linear-to-br from-slate-900 via-purple-950/40 to-slate-950 flex flex-col items-center justify-center p-4 selection:bg-purple-600 selection:text-white">
        <AuthModal
          isOpen={true}
          isFullScreen={true}
          onLoginSuccess={() => {
            const freshUser = storage.getCurrentUser();
            setCurrentUser(freshUser);
            refreshAllData();
          }}
        />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-100/70 text-slate-800 flex flex-col selection:bg-purple-600 selection:text-white font-sans antialiased">
      {/* 1. TOP HEADER (Sticky, Glassmorphism, Logo, System Clock, Notifications, Profile) */}
      <TopHeader
        currentUser={currentUser}
        school={school}
        activeTab={activeTab}
        announcements={announcements}
        users={users}
        onOpenLoginModal={() => setIsAuthModalOpen(true)}
        onOpenAuth={() => setIsAuthModalOpen(true)}
        onLogout={handleLogout}
        onSelectTab={setActiveTab}
        onNavigate={setActiveTab}
      />

      {/* Main Container with Sticky Sidebar (Desktop) and Content Area */}
      <div className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-5 sm:py-6 flex flex-col md:flex-row gap-6">
        {/* 2. STICKY SIDEBAR (Desktop) */}
        <Sidebar
          activeTab={activeTab}
          onSelectTab={setActiveTab}
          onNavigate={setActiveTab}
          currentUser={currentUser}
          school={school}
          pendingCount={pendingMembersCount}
          onOpenLegend={() => setIsLegendModalOpen(true)}
        />

        {/* 3. MAIN CONTENT ROUTER VIEW */}
        <main className="flex-1 min-w-0 pb-20 md:pb-6">
          {activeTab === 'dashboard' && (
            <DashboardView
              currentUser={currentUser}
              school={school}
              assignments={assignments}
              submissions={submissions}
              documents={documents}
              users={users}
              announcements={announcements}
              onSelectTab={setActiveTab}
              onNavigate={setActiveTab}
              onOpenFilePreview={handleOpenFilePreview}
              onOpenLegend={() => setIsLegendModalOpen(true)}
            />
          )}

          {(activeTab === 'assignments' || (activeTab as string) === 'tracking') && (
            <AssignmentsView
              currentUser={currentUser}
              assignments={assignments}
              submissions={submissions}
              users={users}
              announcements={announcements}
              onOpenFilePreview={handleOpenFilePreview}
            />
          )}

          {activeTab === 'documents' && (
            <DocumentCenterView
              currentUser={currentUser}
              documents={documents}
              onOpenFilePreview={handleOpenFilePreview}
            />
          )}

          {activeTab === 'websites' && (
            <RecommendedWebsitesView
              currentUser={currentUser}
              websites={websites}
              onRefreshWebsites={refreshAllData}
            />
          )}

          {activeTab === 'settings' && (
            <SettingsView
              currentUser={currentUser}
              school={school}
              users={users}
              onRefreshData={refreshAllData}
            />
          )}
        </main>
      </div>

      {/* 4. FIXED BOTTOM NAVIGATION BAR (Mobile Only) */}
      <BottomNav
        activeTab={activeTab}
        onSelectTab={setActiveTab}
        onNavigate={setActiveTab}
        pendingCount={pendingMembersCount}
      />

      {/* FOOTER BAR */}
      <footer className="bg-white/80 border-t border-purple-100 py-3 px-4 text-center text-xs text-slate-500 hidden md:block">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span className="font-semibold text-slate-700">{school?.name || 'โรงเรียนสาธิตเทศบาลวิชาการ'}</span>
            <span>•</span>
            <span>ระบบบริหารจัดการงานวิชาการและศูนย์เอกสาร</span>
          </div>

          <div className="flex items-center space-x-3">
            <span className="text-[11px] text-slate-400">
              สถานะ: <span className="font-medium text-emerald-600">เชื่อมต่อคลาวด์ไดรฟ์ปลอดภัย</span>
            </span>
          </div>
        </div>
      </footer>

      {/* 5. MODALS */}

      {/* Legend Modal (สีม่วง vs สีเขียว) */}
      <LegendModal
        isOpen={isLegendModalOpen}
        onClose={() => setIsLegendModalOpen(false)}
      />

      {/* Auth / Bypass Login Modal */}
      <AuthModal
        isOpen={isAuthModalOpen}
        onClose={() => setIsAuthModalOpen(false)}
        onLoginSuccess={refreshAllData}
      />

      {/* Developer / GAS & Cloudflare D1 Code Viewer Modal */}
      {isDevCodeModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="bg-slate-900 text-slate-100 rounded-3xl max-w-3xl w-full p-6 shadow-2xl border border-purple-500/30 relative flex flex-col max-h-[85vh]">
            <button
              onClick={() => setIsDevCodeModalOpen(false)}
              className="absolute top-4 right-4 p-2 text-slate-400 hover:text-white rounded-full"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-2 mb-4">
              <Terminal className="w-5 h-5 text-purple-400" />
              <div>
                <h3 className="text-base font-bold text-white leading-tight">
                  Backend Architecture & Deployment Artifacts
                </h3>
                <p className="text-xs text-purple-300">
                  Google Apps Script (GAS) Web App & Cloudflare D1 SQL Schema
                </p>
              </div>
            </div>

            {/* Tabs */}
            <div className="flex items-center gap-2 border-b border-slate-700 pb-3 mb-3">
              <button
                onClick={() => setDevCodeTab('gas')}
                className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all flex items-center gap-1.5 ${
                  devCodeTab === 'gas'
                    ? 'bg-purple-600 text-white shadow-xs'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <FileCode className="w-3.5 h-3.5" />
                <span>Google Apps Script Code (Code.gs)</span>
              </button>

              <button
                onClick={() => setDevCodeTab('d1')}
                className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all flex items-center gap-1.5 ${
                  devCodeTab === 'd1'
                    ? 'bg-purple-600 text-white shadow-xs'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <Server className="w-3.5 h-3.5" />
                <span>Cloudflare D1 SQL Schema</span>
              </button>

              <div className="ml-auto">
                <button
                  onClick={() => handleCopyCode(devCodeTab === 'gas' ? GAS_CODE_SNIPPET : D1_SCHEMA_SQL)}
                  className="inline-flex items-center gap-1.5 px-3 py-1 text-xs font-semibold text-purple-300 bg-purple-950/60 hover:bg-purple-900/80 border border-purple-500/40 rounded-lg transition-all"
                >
                  {copiedCode ? (
                    <>
                      <Check className="w-3.5 h-3.5 text-emerald-400" />
                      <span className="text-emerald-400">คัดลอกแล้ว!</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5" />
                      <span>คัดลอกโค้ด</span>
                    </>
                  )}
                </button>
              </div>
            </div>

            {/* Code container */}
            <div className="flex-1 overflow-y-auto bg-slate-950 rounded-xl p-4 border border-slate-800 font-mono text-xs text-purple-200/90 leading-relaxed selection:bg-purple-500 selection:text-white">
              <pre className="whitespace-pre-wrap break-words">
                {devCodeTab === 'gas' ? GAS_CODE_SNIPPET : D1_SCHEMA_SQL}
              </pre>
            </div>

            {/* GAS Rule Banner */}
            <div className="mt-3 p-2.5 bg-rose-950/40 border border-rose-500/30 rounded-xl text-[11px] text-rose-300 flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-rose-400 shrink-0" />
              <span>
                <strong>กฎเหล็ก GAS:</strong> ห้ามลบโฟลเดอร์หลักหรือโฟลเดอร์ย่อยใน Google Drive โดยอัตโนมัติเด็ดขาด ลบเฉพาะไฟล์เดี่ยวที่ระบุเท่านั้น
              </span>
            </div>
          </div>
        </div>
      )}

      {/* AUTHENTIC A4 DOCUMENT VIEWER MODAL (A4 21x29.7cm pagination, zero popup blockers) */}
      {activePreviewFile && (
        <DedicatedRawFileViewer
          initialFile={activePreviewFile.file}
          initialTitle={activePreviewFile.assignmentTitle}
          initialSubmitter={activePreviewFile.uploaderName}
          isModalMode={true}
          onClose={() => setActivePreviewFile(null)}
        />
      )}
    </div>
  );
}
