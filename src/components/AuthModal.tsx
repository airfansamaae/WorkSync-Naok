import React, { useState } from 'react';
import { 
  Lock, 
  User as UserIcon, 
  KeyRound, 
  X, 
  LogIn, 
  UserPlus, 
  AlertCircle,
  GraduationCap,
  ShieldCheck,
  Building2
} from 'lucide-react';
import { storage } from '../services/storageService';
import Swal from 'sweetalert2';

interface AuthModalProps {
  isOpen: boolean;
  onClose?: () => void;
  onLoginSuccess: () => void;
  isFullScreen?: boolean;
}

export const AuthModal: React.FC<AuthModalProps> = ({
  isOpen,
  onClose,
  onLoginSuccess,
  isFullScreen = false,
}) => {
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const school = storage.getSchoolProfile();

  // Login inputs
  const [loginId, setLoginId] = useState('');
  const [loginPassword, setLoginPassword] = useState('');

  // Register inputs (STRICTLY ONLY: ชื่อ-สกุล, ID, Password)
  const [regFullName, setRegFullName] = useState('');
  const [regId, setRegId] = useState('');
  const [regPassword, setRegPassword] = useState('');

  if (!isOpen) return null;

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();

    if (!loginId.trim() || !loginPassword.trim()) {
      Swal.fire({
        icon: 'warning',
        title: 'กรุณากรอกข้อมูล',
        text: 'กรุณาระบุ ID และ Password',
        confirmButtonColor: '#7C3AED',
      });
      return;
    }

    const res = storage.authenticate(loginId.trim(), loginPassword.trim());

    if (res.success && res.user) {
      onLoginSuccess();
      if (onClose) onClose();

      const isAdmin = res.user.role === 'admin';
      Swal.fire({
        icon: 'success',
        title: 'เข้าสู่ระบบสำเร็จ',
        html: `ยินดีต้อนรับ <b>${res.user.fullName}</b><br/><span class="text-xs text-purple-700 font-semibold">${isAdmin ? '🛡️ ผู้ดูแลระบบหลัก (Master Admin)' : 'สมาชิกวิชาการ / อาจารย์ผู้สอน'}</span>`,
        timer: 1600,
        showConfirmButton: false,
      });
    } else {
      // Check if pending
      const allUsers = storage.getUsers();
      const existing = allUsers.find(
        (u) => u.username.toLowerCase() === loginId.trim().toLowerCase()
      );

      if (existing && existing.status === 'pending') {
        Swal.fire({
          icon: 'warning',
          title: 'รอ Admin อนุมัติ',
          text: 'บัญชีของคุณกำลังรอการอนุมัติจากผู้ดูแลระบบ (Admin) กรุณารอการอนุมัติก่อนเข้าสู่ระบบ',
          confirmButtonColor: '#F59E0B',
        });
      } else {
        Swal.fire({
          icon: 'error',
          title: 'เข้าสู่ระบบไม่สำเร็จ',
          text: res.message || 'ID หรือ Password ไม่ถูกต้อง กรุณาตรวจสอบอีกครั้ง',
          confirmButtonColor: '#7C3AED',
        });
      }
    }
  };

  const handleRegister = (e: React.FormEvent) => {
    e.preventDefault();

    if (!regFullName.trim() || !regId.trim() || !regPassword.trim()) {
      Swal.fire({
        icon: 'warning',
        title: 'ข้อมูลไม่ครบถ้วน',
        text: 'กรุณากรอก ชื่อ-สกุล, ID และ Password ให้ครบถ้วน',
        confirmButtonColor: '#7C3AED',
      });
      return;
    }

    try {
      const result = storage.registerUser({
        fullName: regFullName.trim(),
        username: regId.trim(),
        password: regPassword.trim(),
        department: 'กลุ่มสาระการเรียนรู้',
      });

      if (!result.success) {
        Swal.fire({
          icon: 'error',
          title: 'ไม่สามารถลงทะเบียนได้',
          text: result.message,
          confirmButtonColor: '#7C3AED',
        });
        return;
      }

      Swal.fire({
        icon: 'success',
        title: 'สมัครสมาชิกเรียบร้อยแล้ว',
        html: `ลงทะเบียนชื่อ <b>${regFullName}</b> สำเร็จ<br/><span class="text-amber-600 font-semibold text-xs">กรุณารอ Admin อนุมัติการเข้าใช้งานก่อนเข้าสู่ระบบ</span>`,
        confirmButtonColor: '#7C3AED',
      });

      // Switch to login tab and prefill ID
      setMode('login');
      setLoginId(regId.trim());
      setLoginPassword('');
      setRegFullName('');
      setRegId('');
      setRegPassword('');
    } catch (err: any) {
      Swal.fire({
        icon: 'error',
        title: 'ข้อผิดพลาด',
        text: err.message || 'ไม่สามารถลงทะเบียนได้',
        confirmButtonColor: '#7C3AED',
      });
    }
  };

  const content = (
    <div className="bg-white rounded-2xl w-full max-w-[390px] p-5 sm:p-6 shadow-xl shadow-purple-950/20 border border-slate-200/90 relative flex flex-col justify-between select-none animate-in fade-in zoom-in-95 duration-200">
      {onClose && !isFullScreen && (
        <button
          onClick={onClose}
          type="button"
          className="absolute top-4 right-4 p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-full transition-colors cursor-pointer"
          title="ปิดหน้าต่าง"
        >
          <X className="w-4 h-4" />
        </button>
      )}

      {/* Header / Logo / Title */}
      <div>
        <div className="text-center mb-3.5">
          <div className="w-12 h-12 rounded-xl bg-purple-50 border border-purple-100 p-1.5 flex items-center justify-center mx-auto mb-2 shadow-2xs">
            {school?.logoUrl ? (
              <img 
                src={school.logoUrl} 
                alt="School Logo" 
                className="w-full h-full object-contain"
                referrerPolicy="no-referrer"
              />
            ) : (
              <GraduationCap className="w-6 h-6 text-purple-700" />
            )}
          </div>
          <h3 className="text-sm font-black text-slate-900 tracking-tight leading-snug px-1 line-clamp-2">
            {school?.name || 'ระบบบริหารจัดการงานวิชาการและศูนย์เอกสาร'}
          </h3>
          <p className="text-[11px] text-slate-500 mt-0.5">
            {mode === 'login' 
              ? 'กรุณากรอก ID และ Password เพื่อเข้าสู่ระบบ' 
              : 'สมัครสมาชิกสำหรับคณะครูและบุคลากรทางการศึกษา'}
          </p>
        </div>

        {/* Tab Switcher (เข้าสู่ระบบ / สมัครสมาชิก) */}
        <div className="flex gap-1 p-1 bg-slate-100 rounded-xl mb-3.5 border border-slate-200/70">
          <button
            type="button"
            onClick={() => setMode('login')}
            className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
              mode === 'login'
                ? 'bg-white text-purple-900 shadow-2xs border border-slate-200/60'
                : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            <LogIn className="w-3.5 h-3.5" />
            <span>เข้าสู่ระบบ</span>
          </button>
          <button
            type="button"
            onClick={() => setMode('register')}
            className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
              mode === 'register'
                ? 'bg-white text-purple-900 shadow-2xs border border-slate-200/60'
                : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            <UserPlus className="w-3.5 h-3.5" />
            <span>สมัครสมาชิก</span>
          </button>
        </div>
      </div>

      {/* Body Form */}
      <div className="flex-1 flex flex-col justify-between">
        {mode === 'login' ? (
          /* 1. LOGIN FORM */
          <form onSubmit={handleLogin} className="space-y-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                ID (ชื่อผู้ใช้งาน) *
              </label>
              <div className="relative">
                <UserIcon className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  type="text"
                  required
                  value={loginId}
                  onChange={(e) => setLoginId(e.target.value)}
                  placeholder="กรอก ID (เช่น Admin หรือ ID ครู)..."
                  className="w-full pl-9 pr-3 py-2 text-xs rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-purple-500 bg-slate-50/60 focus:bg-white text-slate-900 transition-colors"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Password (รหัสผ่าน) *
              </label>
              <div className="relative">
                <KeyRound className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  type="password"
                  required
                  value={loginPassword}
                  onChange={(e) => setLoginPassword(e.target.value)}
                  placeholder="กรอก Password..."
                  className="w-full pl-9 pr-3 py-2 text-xs rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-purple-500 bg-slate-50/60 focus:bg-white text-slate-900 transition-colors"
                />
              </div>
            </div>

            <div className="p-2.5 bg-purple-50/70 border border-purple-100 rounded-xl text-purple-900 text-[11px] leading-relaxed flex items-start gap-1.5">
              <ShieldCheck className="w-3.5 h-3.5 text-purple-600 shrink-0 mt-0.5" />
              <span>
                ปลอดภัยสูง: ตรวจจับ Inactivity และตัดเซสชันเมื่อไม่มีการใช้งาน 15 นาที
              </span>
            </div>

            <div className="pt-2">
              <button
                type="submit"
                className="w-full py-2.5 text-xs font-bold text-white bg-purple-600 hover:bg-purple-700 rounded-xl transition-all shadow-xs glow-purple-hover flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <LogIn className="w-3.5 h-3.5" />
                <span>เข้าสู่ระบบ (Sign In)</span>
              </button>
            </div>
          </form>
        ) : (
          /* 2. REGISTER FORM: STRICTLY ONLY ชื่อ-สกุล, ID, Password */
          <form onSubmit={handleRegister} className="space-y-2.5">
            <div className="bg-amber-50/90 border border-amber-200 p-2 rounded-xl text-amber-900 text-[11px] font-medium flex items-start gap-1.5">
              <AlertCircle className="w-3.5 h-3.5 text-amber-600 shrink-0 mt-0.5" />
              <span>
                เมื่อสมัครแล้ว จะส่งให้ <strong>Admin อนุมัติ</strong> ก่อนจึงจะเข้าใช้งานได้
              </span>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-0.5">
                1. ชื่อ-สกุล (Full Name) *
              </label>
              <input
                type="text"
                required
                value={regFullName}
                onChange={(e) => setRegFullName(e.target.value)}
                placeholder="ระบุชื่อ-สกุล (เช่น นายสมศักดิ์ สุขใจ)"
                className="w-full px-3 py-1.5 text-xs rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-purple-500 bg-slate-50/60 focus:bg-white text-slate-900 transition-colors"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-0.5">
                2. ID (ชื่อผู้ใช้งาน) *
              </label>
              <input
                type="text"
                required
                value={regId}
                onChange={(e) => setRegId(e.target.value)}
                placeholder="ระบุ ID ที่ต้องการ (เช่น krusomsak)"
                className="w-full px-3 py-1.5 text-xs rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-purple-500 bg-slate-50/60 focus:bg-white text-slate-900 transition-colors"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-0.5">
                3. Password (รหัสผ่าน) *
              </label>
              <input
                type="password"
                required
                value={regPassword}
                onChange={(e) => setRegPassword(e.target.value)}
                placeholder="กำหนดรหัสผ่าน (อย่างน้อย 4 ตัวอักษร)..."
                className="w-full px-3 py-1.5 text-xs rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-purple-500 bg-slate-50/60 focus:bg-white text-slate-900 transition-colors"
              />
            </div>

            <div className="pt-2">
              <button
                type="submit"
                className="w-full py-2.5 text-xs font-bold text-white bg-purple-600 hover:bg-purple-700 rounded-xl transition-all shadow-xs glow-purple-hover flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <UserPlus className="w-3.5 h-3.5" />
                <span>สมัครสมาชิก (Sign Up)</span>
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );

  if (isFullScreen) {
    return (
      <div className="w-full flex items-center justify-center p-2">
        {content}
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-2xs animate-in fade-in duration-200">
      {content}
    </div>
  );
};

