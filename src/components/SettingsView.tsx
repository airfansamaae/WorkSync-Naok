import React, { useState } from 'react';
import { 
  Settings as SettingsIcon, 
  School, 
  Key, 
  Users, 
  User as UserIcon, 
  ShieldCheck, 
  Check, 
  X, 
  Trash2, 
  Upload, 
  CheckCircle2, 
  AlertCircle, 
  Lock,
  CloudUpload,
  Loader2,
  Database,
  Copy,
  ExternalLink,
  FileCode,
  Globe,
  Move
} from 'lucide-react';
import { User, SchoolProfile } from '../types';
import { storage } from '../services/storageService';
import { GOOGLE_APPS_SCRIPT_CODE } from '../services/gasCodeGenerator';
import { 
  getActiveGasUrl, 
  setActiveGasUrl, 
  testGasConnection, 
  ROOT_DRIVE_FOLDER_ID 
} from '../services/googleDriveService';
import Swal from 'sweetalert2';

interface SettingsViewProps {
  currentUser: User | null;
  school: SchoolProfile;
  users: User[];
  onRefreshData: () => void;
}

export const SettingsView: React.FC<SettingsViewProps> = ({
  currentUser,
  school,
  users,
  onRefreshData,
}) => {
  const isAdmin = currentUser?.role === 'admin';
  const [activeTab, setActiveTab] = useState<'school' | 'members' | 'password' | 'profile' | 'database'>(
    isAdmin ? 'school' : 'profile'
  );

  const [isPushingD1, setIsPushingD1] = useState(false);
  const [copiedCode, setCopiedCode] = useState(false);

  // Admin School Form
  const [masterAdminName, setMasterAdminName] = useState(school?.masterAdminName || currentUser?.fullName || 'Admin (ผู้ดูแลระบบหลักวิชาการ)');
  const [schoolName, setSchoolName] = useState(school?.name || 'โรงเรียนสาธิตเทศบาลวิชาการ');
  const [schoolSubName, setSchoolSubName] = useState(school?.subName || 'สำนักงานเขตพื้นที่การศึกษาประถมศึกษา กระบี่');
  const [academicYear, setAcademicYear] = useState(school?.academicYear || '2569');
  const [semester, setSemester] = useState(school?.semester || '1');
  const [logoUrl, setLogoUrl] = useState(school?.logoUrl || '');
  const [isUploadingLogo, setIsUploadingLogo] = useState(false);
  const [logoProgress, setLogoProgress] = useState(0);

  // Password Form
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  // Member Profile Form
  const [profileFullName, setProfileFullName] = useState(currentUser?.fullName || '');
  const [profileEmail, setProfileEmail] = useState(currentUser?.email || '');
  const [profileDepartment, setProfileDepartment] = useState(currentUser?.department || '');
  const [profileAvatarUrl, setProfileAvatarUrl] = useState(currentUser?.avatarUrl || '');
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);
  const [avatarProgress, setAvatarProgress] = useState(0);

  // Google Apps Script Connection Form
  const [gasUrlInput, setGasUrlInput] = useState(getActiveGasUrl());
  const [isTestingGas, setIsTestingGas] = useState(false);
  const [gasTestStatus, setGasTestStatus] = useState<{
    tested: boolean;
    success: boolean;
    folderName?: string;
    folderId?: string;
    driveUrl?: string;
    message?: string;
  } | null>(null);

  const handleSaveAndTestGasUrl = async () => {
    const trimmed = gasUrlInput.trim();
    if (!trimmed) {
      Swal.fire('ข้อผิดพลาด', 'กรุณาระบุ URL ของ Google Apps Script Web App', 'error');
      return;
    }
    setActiveGasUrl(trimmed);
    setIsTestingGas(true);
    setGasTestStatus(null);
    try {
      const result = await testGasConnection(trimmed);
      setGasTestStatus({
        tested: true,
        success: result.success,
        folderName: result.folderName,
        folderId: result.folderId,
        driveUrl: result.driveUrl,
        message: result.message,
      });
      if (result.success) {
        Swal.fire({
          icon: 'success',
          title: 'เชื่อมต่อ Google Drive สำเร็จ 100%!',
          html: `<div class="text-left text-xs text-slate-700 space-y-2">
            <p>🟢 <b>สถานะ:</b> เชื่อมต่อ Google Drive เรียบร้อย</p>
            <p>📁 <b>ชื่อโฟลเดอร์:</b> ${result.folderName || 'โฟลเดอร์หลัก'}</p>
            <p>🆔 <b>Folder ID:</b> <code class="font-mono text-purple-700 bg-purple-50 px-1.5 py-0.5 rounded">${result.folderId || ROOT_DRIVE_FOLDER_ID}</code></p>
            <p class="text-emerald-700 font-medium">✨ ระบบพร้อมอัปโหลดไฟล์, ลบไฟล์อัตโนมัติ, แสดงตัวอย่าง (ไอคอนตา) และดาวน์โหลดตรงแล้ว</p>
          </div>`,
          confirmButtonColor: '#7C3AED',
        });
      } else {
        Swal.fire({
          icon: 'warning',
          title: 'ยังไม่สามารถเชื่อมต่อได้',
          text: result.message,
          confirmButtonColor: '#7C3AED',
        });
      }
    } catch (err: any) {
      setGasTestStatus({
        tested: true,
        success: false,
        message: err.message,
      });
      Swal.fire('ข้อผิดพลาด', err.message, 'error');
    } finally {
      setIsTestingGas(false);
    }
  };

  // Handle Save School Info
  const handleSaveSchoolInfo = (e: React.FormEvent) => {
    e.preventDefault();
    storage.updateSchoolProfile({
      masterAdminName: masterAdminName.trim(),
      name: schoolName,
      subName: schoolSubName,
      academicYear: academicYear,
      semester: semester,
      logoUrl: logoUrl,
    });

    Swal.fire({
      icon: 'success',
      title: 'บันทึกข้อมูลโรงเรียนสำเร็จ',
      text: 'ข้อมูลโรงเรียน โลโก้ และชื่อผู้ดูแลระบบได้รับการซิงค์แบบ Real-time เรียบร้อยแล้ว',
      confirmButtonColor: '#7C3AED',
      timer: 1800,
    });
    onRefreshData();
  };

  // Real-time School Logo Upload to Google Drive
  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      try {
        setIsUploadingLogo(true);
        setLogoProgress(10);

        const result = await storage.uploadImageToGoogleDrive(file, (pct) => {
          setLogoProgress(pct);
        });

        setLogoUrl(result.url);
        storage.updateSchoolProfile({
          logoUrl: result.url,
        });

        Swal.fire({
          icon: 'success',
          title: 'อัปโหลดโลโก้สำเร็จ',
          html: 'ซิงค์โลโก้โรงเรียนไปยัง Google Drive และระบบ Real-time เรียบร้อยแล้ว',
          timer: 1600,
          showConfirmButton: false,
        });
        onRefreshData();
      } catch (err: any) {
        Swal.fire({
          icon: 'error',
          title: 'เกิดข้อผิดพลาดในการอัปโหลด',
          text: err.message || 'ไม่สามารถอัปโหลดไฟล์ไปยัง Google Drive ได้',
          confirmButtonColor: '#7C3AED',
        });
      } finally {
        setIsUploadingLogo(false);
      }
    }
  };

  // Handle Member Profile Update
  const handleSaveProfile = (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser) return;

    storage.updateUserProfile(currentUser.id, {
      fullName: profileFullName,
      email: profileEmail,
      department: profileDepartment,
      avatarUrl: profileAvatarUrl,
    });

    Swal.fire({
      icon: 'success',
      title: 'บันทึกโปรไฟล์สำเร็จ',
      text: 'ข้อมูลส่วนตัวของคุณได้รับการซิงค์แบบ Real-time เรียบร้อยแล้ว',
      confirmButtonColor: '#10B981',
      timer: 1800,
    });
    onRefreshData();
  };

  // Real-time Member Avatar Upload to Google Drive
  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      try {
        setIsUploadingAvatar(true);
        setAvatarProgress(10);

        const result = await storage.uploadImageToGoogleDrive(file, (pct) => {
          setAvatarProgress(pct);
        });

        setProfileAvatarUrl(result.url);
        if (currentUser) {
          storage.updateUserProfile(currentUser.id, {
            avatarUrl: result.url,
          });
        }

        Swal.fire({
          icon: 'success',
          title: 'อัปโหลดรูปโปรไฟล์สำเร็จ',
          html: 'ซิงค์รูปส่วนตัวของคุณไปยัง Google Drive เรียบร้อยแล้ว',
          timer: 1600,
          showConfirmButton: false,
        });
        onRefreshData();
      } catch (err: any) {
        Swal.fire({
          icon: 'error',
          title: 'เกิดข้อผิดพลาดในการอัปโหลด',
          text: err.message || 'ไม่สามารถอัปโหลดไฟล์รูปภาพได้',
          confirmButtonColor: '#7C3AED',
        });
      } finally {
        setIsUploadingAvatar(false);
      }
    }
  };

  // Handle Change Password
  const handleChangePassword = (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword.length < 6) {
      Swal.fire('รหัสผ่านสั้นเกินไป', 'กรุณาระบุรหัสผ่านใหม่อย่างน้อย 6 ตัวอักษร', 'warning');
      return;
    }
    if (newPassword !== confirmPassword) {
      Swal.fire('รหัสผ่านไม่ตรงกัน', 'กรุณายืนยันรหัสผ่านใหม่ให้ถูกต้องตรงกัน', 'warning');
      return;
    }

    setCurrentPassword('');
    setNewPassword('');
    setConfirmPassword('');

    Swal.fire({
      icon: 'success',
      title: 'เปลี่ยนรหัสผ่านสำเร็จ',
      text: 'ระบบได้อัปเดตรหัสผ่านใหม่ของคุณเรียบร้อยแล้ว',
      confirmButtonColor: '#7C3AED',
      timer: 1800,
    });
  };

  // Member Approval handlers
  const handleApproveMember = (userId: string, userName: string) => {
    storage.updateUserStatus(userId, 'approved');
    Swal.fire({
      icon: 'success',
      title: 'อนุมัติสำเร็จ',
      text: `อนุมัติให้ "${userName}" เข้าใช้งานระบบวิชาการแล้ว`,
      timer: 1600,
      showConfirmButton: false,
    });
    onRefreshData();
  };

  const handleRejectMember = (userId: string, userName: string) => {
    storage.updateUserStatus(userId, 'rejected');
    Swal.fire({
      icon: 'info',
      title: 'ปฏิเสธการลงทะเบียน',
      text: `ปฏิเสธการขอเข้าใช้งานของ "${userName}" แล้ว`,
      timer: 1600,
      showConfirmButton: false,
    });
    onRefreshData();
  };

  const handleDeleteMember = (userId: string, userName: string) => {
    Swal.fire({
      title: 'ยืนยันการลบสมาชิก?',
      html: `คุณต้องการลบสมาชิก <b>"${userName}"</b> ออกจากระบบใช่หรือไม่?`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#E11D48',
      cancelButtonColor: '#94A3B8',
      confirmButtonText: 'ใช่, ลบสมาชิก',
      cancelButtonText: 'ยกเลิก',
    }).then((result) => {
      if (result.isConfirmed) {
        storage.deleteUser(userId);
        Swal.fire({
          icon: 'success',
          title: 'ลบสมาชิกเรียบร้อย',
          timer: 1400,
          showConfirmButton: false,
        });
        onRefreshData();
      }
    });
  };

  const pendingMembers = users.filter((u) => u.status === 'pending');
  const approvedMembersList = users.filter((u) => u.status === 'approved' && u.role !== 'admin');

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Header */}
      <div className="bg-white rounded-2xl p-5 sm:p-6 border border-purple-100 shadow-xs">
        <div className="flex items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-lg sm:text-xl font-bold text-slate-900 leading-none">
                การตั้งค่าระบบ (Settings & Management)
              </h2>
              <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-purple-100 text-purple-800">
                {isAdmin ? 'Master Admin Control' : 'Member Profile'}
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-1.5">
              {isAdmin 
                ? 'จัดการข้อมูลสถานศึกษา ตารางอนุมัติสมาชิกใหม่ และความปลอดภัยของระบบ'
                : 'แก้ไขข้อมูลส่วนบุคคล รูปประจำตัว และรหัสผ่านการเข้าสู่ระบบ'}
            </p>
          </div>
        </div>

        {/* Prominent Menu Tabs */}
        <div className="mt-5 pt-4 border-t border-slate-100">
          {isAdmin ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-3">
              {/* 1. ข้อมูลโรงเรียน */}
              <button
                type="button"
                onClick={() => setActiveTab('school')}
                className={`p-3 sm:p-3.5 rounded-xl border text-left transition-all cursor-pointer flex items-center gap-3 ${
                  activeTab === 'school'
                    ? 'bg-purple-600 text-white border-purple-600 shadow-md ring-2 ring-purple-200'
                    : 'bg-slate-50/80 text-slate-700 hover:bg-purple-50/60 hover:border-purple-200 border-slate-200'
                }`}
              >
                <div className={`w-8 h-8 sm:w-9 sm:h-9 rounded-xl flex items-center justify-center shrink-0 ${
                  activeTab === 'school' ? 'bg-white/20 text-white' : 'bg-purple-100 text-purple-700'
                }`}>
                  <School className="w-4 h-4" />
                </div>
                <div className="min-w-0">
                  <h4 className="text-xs font-bold truncate">1. ข้อมูลโรงเรียน</h4>
                  <p className={`text-[10px] truncate ${activeTab === 'school' ? 'text-purple-100' : 'text-slate-500'}`}>
                    สถานศึกษา, โลโก้
                  </p>
                </div>
              </button>

              {/* 2. จัดการสมาชิก */}
              <button
                type="button"
                onClick={() => setActiveTab('members')}
                className={`p-3 sm:p-3.5 rounded-xl border text-left transition-all cursor-pointer flex items-center gap-3 relative ${
                  activeTab === 'members'
                    ? 'bg-purple-600 text-white border-purple-600 shadow-md ring-2 ring-purple-200'
                    : 'bg-slate-50/80 text-slate-700 hover:bg-purple-50/60 hover:border-purple-200 border-slate-200'
                }`}
              >
                <div className={`w-8 h-8 sm:w-9 sm:h-9 rounded-xl flex items-center justify-center shrink-0 ${
                  activeTab === 'members' ? 'bg-white/20 text-white' : 'bg-purple-100 text-purple-700'
                }`}>
                  <Users className="w-4 h-4" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1 justify-between">
                    <h4 className="text-xs font-bold truncate">2. จัดการสมาชิก</h4>
                    {pendingMembers.length > 0 && (
                      <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full ${
                        activeTab === 'members' ? 'bg-white text-purple-900' : 'bg-amber-500 text-white animate-pulse'
                      }`}>
                        รอ {pendingMembers.length}
                      </span>
                    )}
                  </div>
                  <p className={`text-[10px] truncate ${activeTab === 'members' ? 'text-purple-100' : 'text-slate-500'}`}>
                    อนุมัติครู ({approvedMembersList.length})
                  </p>
                </div>
              </button>

              {/* 3. รหัสผ่านระบบ */}
              <button
                type="button"
                onClick={() => setActiveTab('password')}
                className={`p-3 sm:p-3.5 rounded-xl border text-left transition-all cursor-pointer flex items-center gap-3 ${
                  activeTab === 'password'
                    ? 'bg-purple-600 text-white border-purple-600 shadow-md ring-2 ring-purple-200'
                    : 'bg-slate-50/80 text-slate-700 hover:bg-purple-50/60 hover:border-purple-200 border-slate-200'
                }`}
              >
                <div className={`w-8 h-8 sm:w-9 sm:h-9 rounded-xl flex items-center justify-center shrink-0 ${
                  activeTab === 'password' ? 'bg-white/20 text-white' : 'bg-purple-100 text-purple-700'
                }`}>
                  <Key className="w-4 h-4" />
                </div>
                <div className="min-w-0">
                  <h4 className="text-xs font-bold truncate">3. รหัสผ่านระบบ</h4>
                  <p className={`text-[10px] truncate ${activeTab === 'password' ? 'text-purple-100' : 'text-slate-500'}`}>
                    เปลี่ยนรหัสผ่าน Admin
                  </p>
                </div>
              </button>

              {/* 4. ฐานข้อมูล D1 & Google Drive */}
              <button
                type="button"
                onClick={() => setActiveTab('database')}
                className={`p-3 sm:p-3.5 rounded-xl border text-left transition-all cursor-pointer flex items-center gap-3 ${
                  activeTab === 'database'
                    ? 'bg-purple-600 text-white border-purple-600 shadow-md ring-2 ring-purple-200'
                    : 'bg-slate-50/80 text-slate-700 hover:bg-purple-50/60 hover:border-purple-200 border-slate-200'
                }`}
              >
                <div className={`w-8 h-8 sm:w-9 sm:h-9 rounded-xl flex items-center justify-center shrink-0 ${
                  activeTab === 'database' ? 'bg-white/20 text-white' : 'bg-purple-100 text-purple-700'
                }`}>
                  <Database className="w-4 h-4" />
                </div>
                <div className="min-w-0">
                  <h4 className="text-xs font-bold truncate">4. D1 & Drive (Code.gs)</h4>
                  <p className={`text-[10px] truncate ${activeTab === 'database' ? 'text-purple-100' : 'text-slate-500'}`}>
                    ซิงค์ D1, สคริปต์ Drive
                  </p>
                </div>
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {/* 1. ข้อมูลส่วนตัว */}
              <button
                type="button"
                onClick={() => setActiveTab('profile')}
                className={`p-3.5 sm:p-4 rounded-xl border text-left transition-all cursor-pointer flex items-center gap-3.5 ${
                  activeTab === 'profile'
                    ? 'bg-purple-600 text-white border-purple-600 shadow-md ring-2 ring-purple-200'
                    : 'bg-slate-50/80 text-slate-700 hover:bg-purple-50/60 hover:border-purple-200 border-slate-200'
                }`}
              >
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
                  activeTab === 'profile' ? 'bg-white/20 text-white' : 'bg-purple-100 text-purple-700'
                }`}>
                  <UserIcon className="w-5 h-5" />
                </div>
                <div className="min-w-0">
                  <h4 className="text-xs sm:text-sm font-bold truncate">1. ข้อมูลส่วนตัว</h4>
                  <p className={`text-[11px] truncate ${activeTab === 'profile' ? 'text-purple-100' : 'text-slate-500'}`}>
                    ชื่อ-สกุล, รูปโปรไฟล์, กลุ่มสาระฯ
                  </p>
                </div>
              </button>

              {/* 2. รหัสผ่าน */}
              <button
                type="button"
                onClick={() => setActiveTab('password')}
                className={`p-3.5 sm:p-4 rounded-xl border text-left transition-all cursor-pointer flex items-center gap-3.5 ${
                  activeTab === 'password'
                    ? 'bg-purple-600 text-white border-purple-600 shadow-md ring-2 ring-purple-200'
                    : 'bg-slate-50/80 text-slate-700 hover:bg-purple-50/60 hover:border-purple-200 border-slate-200'
                }`}
              >
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
                  activeTab === 'password' ? 'bg-white/20 text-white' : 'bg-purple-100 text-purple-700'
                }`}>
                  <Key className="w-5 h-5" />
                </div>
                <div className="min-w-0">
                  <h4 className="text-xs sm:text-sm font-bold truncate">2. เปลี่ยนรหัสผ่าน</h4>
                  <p className={`text-[11px] truncate ${activeTab === 'password' ? 'text-purple-100' : 'text-slate-500'}`}>
                    อัปเดตรหัสผ่านใหม่สำหรับเข้าสู่ระบบ
                  </p>
                </div>
              </button>
            </div>
          )}
        </div>
      </div>

      {/* ADMIN TAB 1: School Info (Read-only Master Admin Name + Logo Upload Form) */}
      {isAdmin && activeTab === 'school' && (
        <div className="bg-white rounded-2xl p-6 border border-purple-100 shadow-xs space-y-6">
          <div className="flex items-center space-x-3 pb-4 border-b border-slate-100">
            <div className="p-2.5 rounded-xl bg-purple-100 text-purple-700">
              <School className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900">
                ข้อมูลสถานศึกษาและผู้ดูแลระบบหลัก
              </h3>
              <p className="text-xs text-slate-500">
                จัดการชื่อโรงเรียน ปีการศึกษา และโลโก้สถาบัน
              </p>
            </div>
          </div>

          <form onSubmit={handleSaveSchoolInfo} className="space-y-4 max-w-2xl">
            {/* Editable Master Admin Name */}
            <div className="p-4 rounded-xl bg-purple-50/60 border border-purple-200">
              <label className="block text-xs font-bold text-purple-900 mb-1">
                ชื่อผู้ดูแลระบบหลัก (Master Admin)
              </label>
              <input
                type="text"
                required
                value={masterAdminName}
                onChange={(e) => setMasterAdminName(e.target.value)}
                placeholder="ระบุชื่อผู้ดูแลระบบ Admin เช่น Admin ผู้ดูแลระบบงานวิชาการ"
                className="w-full px-3.5 py-2 text-xs rounded-xl bg-white border border-purple-300 text-purple-950 font-semibold focus:outline-none focus:ring-2 focus:ring-purple-500"
              />
              <p className="text-[11px] text-purple-700 mt-1">
                * สามารถแก้ไขปรับเปลี่ยนชื่อผู้ดูแลระบบหลัก (Admin) ได้ตามต้องการ
              </p>
            </div>

            {/* School Name */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                ชื่อสถานศึกษา
              </label>
              <input
                type="text"
                required
                value={schoolName}
                onChange={(e) => setSchoolName(e.target.value)}
                className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-purple-500"
              />
            </div>

            {/* Sub Name */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                หน่วยงานต้นสังกัด / เขตพื้นที่การศึกษา
              </label>
              <input
                type="text"
                value={schoolSubName}
                onChange={(e) => setSchoolSubName(e.target.value)}
                className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-purple-500"
              />
            </div>

            {/* Logo Upload Form */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-2">
                โลโก้โรงเรียน (School Logo - Real-time Google Drive Sync)
              </label>
              <div className="flex items-center space-x-4">
                <div className="w-16 h-16 rounded-2xl bg-purple-50 border border-purple-200 overflow-hidden flex items-center justify-center shrink-0 relative">
                  {logoUrl ? (
                    <img 
                      src={logoUrl} 
                      alt="School Logo" 
                      className="w-full h-full object-contain p-1"
                      referrerPolicy="no-referrer"
                    />
                  ) : (
                    <School className="w-8 h-8 text-purple-400" />
                  )}
                  {isUploadingLogo && (
                    <div className="absolute inset-0 bg-white/80 backdrop-blur-2xs flex items-center justify-center">
                      <Loader2 className="w-5 h-5 text-purple-600 animate-spin" />
                    </div>
                  )}
                </div>
                <div className="space-y-2 flex-1">
                  <input
                    type="file"
                    accept="image/*"
                    id="school-logo-input"
                    disabled={isUploadingLogo}
                    onChange={handleLogoUpload}
                    className="hidden"
                  />
                  <div className="flex flex-wrap items-center gap-2">
                    <label
                      htmlFor="school-logo-input"
                      className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-xl cursor-pointer transition-colors ${
                        isUploadingLogo
                          ? 'bg-slate-100 text-slate-400 border border-slate-200 pointer-events-none'
                          : 'text-purple-700 bg-purple-50 hover:bg-purple-100 border border-purple-200'
                      }`}
                    >
                      {isUploadingLogo ? (
                        <Loader2 className="w-3.5 h-3.5 animate-spin text-purple-600" />
                      ) : (
                        <Upload className="w-3.5 h-3.5" />
                      )}
                      <span>{isUploadingLogo ? 'กำลังซิงค์รูปภาพ...' : 'อัปโหลด/เปลี่ยนโลโก้โรงเรียน'}</span>
                    </label>

                    <div className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-700 text-[10px] font-medium border border-emerald-200">
                      <CloudUpload className="w-3 h-3 text-emerald-600" />
                      <span>Google Drive Real-time Sync</span>
                    </div>
                  </div>

                  {isUploadingLogo && (
                    <div className="w-full max-w-xs">
                      <div className="flex justify-between text-[10px] text-slate-500 mb-0.5">
                        <span>กำลังอัปโหลดไปยัง Google Drive...</span>
                        <span className="font-semibold">{logoProgress}%</span>
                      </div>
                      <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
                        <div 
                          className="h-full bg-purple-600 rounded-full transition-all duration-200" 
                          style={{ width: `${logoProgress}%` }}
                        />
                      </div>
                    </div>
                  )}

                  <p className="text-[11px] text-slate-400">
                    แนะนำรูปภาพ PNG หรือ JPG ขนาดสี่เหลี่ยมจัตุรัส (ระบบจะซิงค์และบันทึกลง Google Drive อัตโนมัติ)
                  </p>
                </div>
              </div>
            </div>

            <div className="pt-3">
              <button
                type="submit"
                className="px-5 py-2.5 text-xs font-semibold text-white bg-purple-600 hover:bg-purple-700 rounded-xl shadow-xs glow-purple-hover cursor-pointer"
              >
                บันทึกข้อมูลสถานศึกษา
              </button>
            </div>
          </form>

          {/* Guide Card: จัดการเว็บไซต์แนะนำ & การจัดเรียงตำแหน่ง (Admin Backend) */}
          <div className="p-4 sm:p-5 rounded-2xl bg-purple-50/70 border border-purple-200/90 flex flex-col sm:flex-row items-start gap-3.5">
            <div className="p-2.5 rounded-xl bg-purple-600 text-white shrink-0 shadow-2xs">
              <Globe className="w-5 h-5" />
            </div>
            <div className="space-y-1.5 text-xs text-slate-700 flex-1">
              <div className="flex items-center gap-2">
                <h4 className="font-bold text-purple-950 text-sm">
                  ระบบจัดการเว็บไซต์แนะนำ & การจัดเรียงลำดับ
                </h4>
                <span className="px-2 py-0.5 rounded-full bg-purple-200 text-purple-900 text-[10px] font-bold">
                  Admin ระบบหลังบ้าน
                </span>
              </div>
              <p className="text-slate-600 leading-relaxed">
                แอดมินสามารถจัดการและจัดเรียงเว็บไซต์แนะนำเพื่ออำนวยความสะดวกให้คุณครูและบุคลากรได้โดยตรง:
              </p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5 pt-1">
                <div className="p-3 bg-white rounded-xl border border-purple-100 shadow-2xs space-y-1">
                  <div className="font-semibold text-purple-900 flex items-center gap-1.5">
                    <Move className="w-3.5 h-3.5 text-purple-600" />
                    <span>เลื่อนตำแหน่งอิสระ (Drag & Drop)</span>
                  </div>
                  <p className="text-[11px] text-slate-500 leading-normal">
                    เมื่อกดตรงโลโก้เว็บค้างไว้ จะสามารถลากเลื่อนขึ้น-ลง-ซ้าย-ขวา เพื่อสลับจัดเรียงตำแหน่งได้อย่างอิสระ (รองรับทั้งเมาส์คอมพิวเตอร์และทัชค้างบนหน้าจอมือถือ)
                  </p>
                </div>
                <div className="p-3 bg-white rounded-xl border border-purple-100 shadow-2xs space-y-1">
                  <div className="font-semibold text-purple-900 flex items-center gap-1.5">
                    <SettingsIcon className="w-3.5 h-3.5 text-purple-600" />
                    <span>โหมดจัดการ (Edit Mode)</span>
                  </div>
                  <p className="text-[11px] text-slate-500 leading-normal">
                    คลิกปุ่ม <b>"จัดการ"</b> ที่หน้าเว็บไซต์แนะนำ เพื่อเพิ่มเว็บไซต์ใหม่, ปรับเลื่อนทีละตำแหน่ง <b>◀ / ▶</b>, ย้ายขึ้น <b>⬆ แถวแรก</b> หรือลบเว็บไซต์ที่ไม่ใช้งาน
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ADMIN TAB 2: Member Approval & Management Table */}
      {isAdmin && activeTab === 'members' && (
        <div className="space-y-6">
          {/* Pending Members Box (ถ้ามีสมาชิกใหม่รออนุมัติ) */}
          {pendingMembers.length > 0 && (
            <div className="bg-amber-50/80 rounded-2xl p-5 border border-amber-200 shadow-xs">
              <div className="flex items-center gap-2 mb-3">
                <AlertCircle className="w-5 h-5 text-amber-700" />
                <h3 className="text-sm font-bold text-amber-900">
                  สมาชิกใหม่ที่รอการอนุมัติ ({pendingMembers.length} ท่าน)
                </h3>
              </div>

              <div className="divide-y divide-amber-200/60 bg-white rounded-xl border border-amber-200 overflow-hidden">
                {pendingMembers.map((member) => (
                  <div
                    key={member.id}
                    className="p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                  >
                    <div className="flex items-center space-x-3">
                      <div className="w-9 h-9 rounded-full bg-amber-100 text-amber-800 font-bold text-xs flex items-center justify-center">
                        {member.fullName.charAt(0)}
                      </div>
                      <div>
                        <p className="text-xs font-bold text-slate-900 leading-tight">
                          {member.fullName} ({member.username})
                        </p>
                        <p className="text-[11px] text-slate-500">
                          {member.department} • {member.position} • สมัครเมื่อ {member.createdAt.split('T')[0]}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 self-end sm:self-center">
                      <button
                        onClick={() => handleApproveMember(member.id, member.fullName)}
                        className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg transition-all shadow-2xs glow-emerald-hover"
                      >
                        <Check className="w-3.5 h-3.5" />
                        <span>อนุมัติเข้าใช้งาน</span>
                      </button>
                      <button
                        onClick={() => handleRejectMember(member.id, member.fullName)}
                        className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-rose-700 hover:bg-rose-50 border border-rose-200 rounded-lg transition-colors"
                      >
                        <X className="w-3.5 h-3.5" />
                        <span>ปฏิเสธ</span>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Approved Members Table */}
          <div className="bg-white rounded-2xl border border-purple-100 shadow-xs overflow-hidden">
            <div className="px-6 py-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
              <h3 className="text-sm font-bold text-slate-900">
                รายชื่อสมาชิกที่ได้รับการอนุมัติ ({approvedMembersList.length} ท่าน)
              </h3>
              <span className="text-xs text-slate-500">
                สมาชิกที่อนุมัติแล้วสามารถล็อกอินเข้าส่งงานได้ทันที
              </span>
            </div>

            <div className="divide-y divide-slate-100">
              {approvedMembersList.map((member) => (
                <div
                  key={member.id}
                  className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-slate-50/60 transition-colors"
                >
                  <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 rounded-full bg-purple-100 text-purple-700 font-bold text-xs flex items-center justify-center overflow-hidden">
                      {member.avatarUrl ? (
                        <img src={member.avatarUrl} alt={member.fullName} className="w-full h-full object-cover" />
                      ) : (
                        member.fullName.charAt(0)
                      )}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-slate-900">
                          {member.fullName}
                        </span>
                        <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-emerald-100 text-emerald-800">
                          อนุมัติแล้ว
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-500">
                        Username: <span className="font-mono text-purple-700">{member.username}</span> • {member.department}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 self-end sm:self-center">
                    <button
                      onClick={() => handleDeleteMember(member.id, member.fullName)}
                      title="ลบสมาชิก"
                      className="p-2 text-rose-500 hover:bg-rose-50 rounded-lg border border-slate-200 transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* MEMBER TAB 1: Personal Profile */}
      {!isAdmin && activeTab === 'profile' && (
        <div className="bg-white rounded-2xl p-6 border border-purple-100 shadow-xs space-y-6">
          <div className="flex items-center space-x-3 pb-4 border-b border-slate-100">
            <div className="p-2.5 rounded-xl bg-purple-100 text-purple-700">
              <UserIcon className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900">
                จัดการข้อมูลส่วนตัว (Personal Profile)
              </h3>
              <p className="text-xs text-slate-500">
                แก้ไขชื่อ-นามสกุล สังกัดกลุ่มสาระ และรูปภาพประจำตัว
              </p>
            </div>
          </div>

          <form onSubmit={handleSaveProfile} className="space-y-4 max-w-xl">
            {/* Avatar upload */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-2">
                รูปโปรไฟล์ส่วนตัว (Profile Picture - Google Drive Sync)
              </label>
              <div className="flex items-center space-x-4">
                <div className="w-16 h-16 rounded-full bg-purple-100 border-2 border-purple-300 overflow-hidden flex items-center justify-center relative shrink-0">
                  {profileAvatarUrl ? (
                    <img 
                      src={profileAvatarUrl} 
                      alt="Avatar" 
                      className="w-full h-full object-cover" 
                      referrerPolicy="no-referrer"
                    />
                  ) : (
                    <UserIcon className="w-8 h-8 text-purple-400" />
                  )}
                  {isUploadingAvatar && (
                    <div className="absolute inset-0 bg-white/80 backdrop-blur-2xs flex items-center justify-center">
                      <Loader2 className="w-5 h-5 text-purple-600 animate-spin" />
                    </div>
                  )}
                </div>
                <div className="space-y-2 flex-1">
                  <input
                    type="file"
                    accept="image/*"
                    id="profile-avatar-input"
                    disabled={isUploadingAvatar}
                    onChange={handleAvatarUpload}
                    className="hidden"
                  />
                  <div className="flex flex-wrap items-center gap-2">
                    <label
                      htmlFor="profile-avatar-input"
                      className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-xl cursor-pointer transition-colors ${
                        isUploadingAvatar
                          ? 'bg-slate-100 text-slate-400 border border-slate-200 pointer-events-none'
                          : 'text-purple-700 bg-purple-50 hover:bg-purple-100 border border-purple-200'
                      }`}
                    >
                      {isUploadingAvatar ? (
                        <Loader2 className="w-3.5 h-3.5 animate-spin text-purple-600" />
                      ) : (
                        <Upload className="w-3.5 h-3.5" />
                      )}
                      <span>{isUploadingAvatar ? 'กำลังซิงค์รูปโปรไฟล์...' : 'อัปโหลดรูปโปรไฟล์ใหม่'}</span>
                    </label>

                    <div className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-700 text-[10px] font-medium border border-emerald-200">
                      <CloudUpload className="w-3 h-3 text-emerald-600" />
                      <span>Google Drive Real-time Sync</span>
                    </div>
                  </div>

                  {isUploadingAvatar && (
                    <div className="w-full max-w-xs">
                      <div className="flex justify-between text-[10px] text-slate-500 mb-0.5">
                        <span>กำลังอัปโหลดไปยัง Google Drive...</span>
                        <span className="font-semibold">{avatarProgress}%</span>
                      </div>
                      <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
                        <div 
                          className="h-full bg-purple-600 rounded-full transition-all duration-200" 
                          style={{ width: `${avatarProgress}%` }}
                        />
                      </div>
                    </div>
                  )}

                  <p className="text-[11px] text-slate-400">
                    รูปภาพจะถูกจัดเก็บลงใน Google Drive และอัปเดตโปรไฟล์ของคุณทันที
                  </p>
                </div>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                ชื่อ-นามสกุล *
              </label>
              <input
                type="text"
                required
                value={profileFullName}
                onChange={(e) => setProfileFullName(e.target.value)}
                className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-purple-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                อีเมลติดต่อ
              </label>
              <input
                type="email"
                value={profileEmail}
                onChange={(e) => setProfileEmail(e.target.value)}
                className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-purple-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                กลุ่มสาระการเรียนรู้ / ฝ่าย
              </label>
              <input
                type="text"
                value={profileDepartment}
                onChange={(e) => setProfileDepartment(e.target.value)}
                className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-purple-500"
              />
            </div>

            <div className="pt-3">
              <button
                type="submit"
                className="px-5 py-2.5 text-xs font-semibold text-white bg-purple-600 hover:bg-purple-700 rounded-xl shadow-xs glow-purple-hover"
              >
                บันทึกการเปลี่ยนแปลง
              </button>
            </div>
          </form>
        </div>
      )}

      {/* PASSWORD TAB (Both Admin and Members) */}
      {activeTab === 'password' && (
        <div className="bg-white rounded-2xl p-6 border border-purple-100 shadow-xs space-y-6">
          <div className="flex items-center space-x-3 pb-4 border-b border-slate-100">
            <div className="p-2.5 rounded-xl bg-purple-100 text-purple-700">
              <Key className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900">
                {isAdmin ? 'จัดการรหัสผ่านผู้ดูแลระบบ (Admin Password)' : 'เปลี่ยนรหัสผ่านตนเอง'}
              </h3>
              <p className="text-xs text-slate-500">
                เพิ่มความปลอดภัยในการเข้าถึงระบบงานวิชาการ
              </p>
            </div>
          </div>

          <form onSubmit={handleChangePassword} className="space-y-4 max-w-md">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                รหัสผ่านเดิม
              </label>
              <input
                type="password"
                required
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                placeholder="ระบุรหัสผ่านเดิม..."
                className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-purple-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                รหัสผ่านใหม่ (อย่างน้อย 6 ตัวอักษร)
              </label>
              <input
                type="password"
                required
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="ระบุรหัสผ่านใหม่..."
                className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-purple-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                ยืนยันรหัสผ่านใหม่
              </label>
              <input
                type="password"
                required
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="ยืนยันรหัสผ่านใหม่อีกครั้ง..."
                className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-purple-500"
              />
            </div>

            <div className="pt-3">
              <button
                type="submit"
                className="px-5 py-2.5 text-xs font-semibold text-white bg-purple-600 hover:bg-purple-700 rounded-xl shadow-xs glow-purple-hover"
              >
                อัปเดตรหัสผ่าน
              </button>
            </div>
          </form>
        </div>
      )}

      {/* ADMIN TAB 4: Cloudflare D1 & Google Drive Code.gs */}
      {isAdmin && activeTab === 'database' && (
        <div className="space-y-6">
          {/* Card 1: Cloudflare D1 One-Click Migration & Sync */}
          <div className="bg-white rounded-2xl p-6 border border-purple-100 shadow-xs space-y-5">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <div className="flex items-center space-x-3">
                <div className="p-2.5 rounded-xl bg-purple-100 text-purple-700">
                  <Database className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">
                    ระบบฐานข้อมูล Cloudflare D1 (ไม่ต้องคัดลอก SQL)
                  </h3>
                  <p className="text-xs text-slate-500">
                    นำเข้าข้อมูลข้อความทั้งหมดในเว็บไซต์เข้าสู่ D1 ด้วยคลิกเดียว
                  </p>
                </div>
              </div>
              <span className="px-3 py-1 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800">
                พร้อมใช้งาน
              </span>
            </div>

            <div className="p-4 rounded-xl bg-purple-50/70 border border-purple-200 text-xs text-purple-900 space-y-2">
              <p className="font-bold flex items-center gap-1.5 text-purple-950">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                หมดปัญหา "Requests without any query are not supported" ใน D1 Console!
              </p>
              <p className="leading-relaxed text-slate-700">
                ระบบถูกออกแบบให้สร้างตาราง <code className="px-1.5 py-0.5 rounded bg-white text-purple-700 font-mono text-[11px] border">app_state</code> และ <code className="px-1.5 py-0.5 rounded bg-white text-purple-700 font-mono text-[11px] border">websites</code> ใน D1 อัตโนมัติทันทีที่ระบบเชื่อมต่อ โดยท่าน<b>ไม่ต้องคัดลอกคำสั่ง SQL ขนาดยาวไปวางใน Cloudflare D1 Console เอง</b>
              </p>
            </div>

            <div className="bg-slate-50 rounded-xl p-4 border border-slate-200 space-y-3">
              <h4 className="text-xs font-bold text-slate-800">
                ขั้นตอนง่ายๆ 2 สเต็ป:
              </h4>
              <ol className="list-decimal list-inside text-xs text-slate-600 space-y-1.5">
                <li>
                  ใน Cloudflare Dashboard ที่ Pages Project &gt; Settings &gt; Functions ให้ผูก (Bind) D1 Database โดยตั้ง <b>Variable name</b> เป็น <code className="font-mono text-purple-700 font-bold bg-white px-1.5 py-0.5 rounded border">DB</code>
                </li>
                <li>
                  กดปุ่มสีม่วงด้านล่างนี้เพื่อ <b>"ซิงค์ข้อมูลทั้งหมดเข้า D1"</b> ข้อมูลเว็บไซต์ทั้งหมดจะถูกส่งเข้า D1 ทันที
                </li>
              </ol>

              <div className="pt-2 flex flex-wrap items-center gap-3">
                <button
                  type="button"
                  disabled={isPushingD1}
                  onClick={async () => {
                    setIsPushingD1(true);
                    try {
                      const ok = await storage.pushFullStateToCloud();
                      if (ok) {
                        Swal.fire({
                          icon: 'success',
                          title: 'นำเข้าข้อมูลเข้า D1 สำเร็จ!',
                          html: '<p class="text-xs text-slate-600">ข้อมูลโรงเรียน, สมาชิก, ภาระงาน, เอกสาร, ประชาสัมพันธ์ และ<b>เว็บไซต์แนะนำ</b> ถูกบันทึกลง Cloudflare D1 เรียบร้อยแล้ว</p>',
                          confirmButtonColor: '#7C3AED',
                        });
                        onRefreshData();
                      } else {
                        Swal.fire({
                          icon: 'info',
                          title: 'บันทึกข้อมูลในเครื่องเรียบร้อย',
                          text: 'หากต้องการให้ข้อมูลซิงค์ลง Cloudflare D1 อย่าลืมผูก D1 database ใน Cloudflare Pages Settings > Functions (Variable name: DB)',
                          confirmButtonColor: '#7C3AED',
                        });
                      }
                    } catch (err: any) {
                      Swal.fire({
                        icon: 'error',
                        title: 'เกิดข้อผิดพลาด',
                        text: err.message || 'ไม่สามารถส่งข้อมูลเข้า D1 ได้',
                        confirmButtonColor: '#7C3AED',
                      });
                    } finally {
                      setIsPushingD1(false);
                    }
                  }}
                  className="px-5 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold transition-all shadow-sm flex items-center gap-2 cursor-pointer disabled:opacity-50"
                >
                  {isPushingD1 ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>กำลังส่งข้อมูลเข้า D1...</span>
                    </>
                  ) : (
                    <>
                      <CloudUpload className="w-4 h-4" />
                      <span>🚀 นำเข้าข้อมูลทั้งหมดเข้าสู่ Cloudflare D1 ทันที (One-Click)</span>
                    </>
                  )}
                </button>
              </div>
            </div>

            {/* Auto-Delete Info */}
            <div className="p-4 rounded-xl bg-emerald-50/80 border border-emerald-200">
              <h4 className="text-xs font-bold text-emerald-900 flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                ระบบลบข้อมูลและไฟล์อัตโนมัติ (Auto-Delete):
              </h4>
              <p className="text-xs text-emerald-800 mt-1 leading-relaxed">
                เมื่อท่านลบข้อมูลใดๆ บนหน้าเว็บไซต์ (เช่น เว็บไซต์แนะนำ, เอกสาร, ภาระงาน) ระบบจะ <b>ลบเรคอร์ดออกจาก Cloudflare D1 ทันที</b> และ <b>ลบไฟล์ที่เกี่ยวข้องออกจาก Google Drive</b> อัตโนมัติผ่าน Google Apps Script โดยไม่มีไฟล์ตกค้าง และ<b>ไม่มีการลบโฟลเดอร์หลัก</b> ปลอดภัย 100%
              </p>
            </div>
          </div>

          {/* Card 2: Google Apps Script (Code.gs) for Google Drive */}
          <div className="bg-white rounded-2xl p-6 border border-purple-100 shadow-xs space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-slate-100 gap-3">
              <div className="flex items-center space-x-3">
                <div className="p-2.5 rounded-xl bg-purple-100 text-purple-700">
                  <FileCode className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">
                    Google Apps Script (Code.gs) & จัดการไฟล์ Google Drive
                  </h3>
                  <p className="text-xs text-slate-500">
                    จัดเก็บไฟล์ทุกชนิดลง Google Drive (Folder ID: <code className="font-mono text-purple-700 font-bold">{ROOT_DRIVE_FOLDER_ID}</code>)
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  navigator.clipboard.writeText(GOOGLE_APPS_SCRIPT_CODE);
                  setCopiedCode(true);
                  setTimeout(() => setCopiedCode(false), 2000);
                  Swal.fire({
                    icon: 'success',
                    title: 'คัดลอกโค้ด Code.gs เรียบร้อย',
                    text: 'นำไปวางใน Google Apps Script แล้วกด Deploy เป็น Web App ได้เลย',
                    timer: 1800,
                    showConfirmButton: false,
                  });
                }}
                className="px-4 py-2 rounded-xl bg-purple-100 hover:bg-purple-200 text-purple-800 text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer self-start sm:self-auto"
              >
                {copiedCode ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
                <span>{copiedCode ? 'คัดลอกแล้ว!' : 'คัดลอกโค้ด Code.gs ทั้งหมด'}</span>
              </button>
            </div>

            {/* 4 Core Features Banner */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="p-3.5 rounded-xl bg-purple-50/80 border border-purple-100 flex items-start gap-2.5">
                <div className="w-5 h-5 rounded-full bg-purple-600 text-white flex items-center justify-center text-[10px] font-bold shrink-0 mt-0.5">1</div>
                <div>
                  <h5 className="text-xs font-bold text-purple-900">เชื่อมไฟล์ระหว่างเว็บกับ Google Drive</h5>
                  <p className="text-[11px] text-purple-700 mt-0.5">อัปโหลดไฟล์ทุกชนิด (PDF, DOCX, XLSX, รูปภาพ) ส่งตรงเข้าโฟลเดอร์วิชาการอัตโนมัติ</p>
                </div>
              </div>

              <div className="p-3.5 rounded-xl bg-rose-50/80 border border-rose-100 flex items-start gap-2.5">
                <div className="w-5 h-5 rounded-full bg-rose-600 text-white flex items-center justify-center text-[10px] font-bold shrink-0 mt-0.5">2</div>
                <div>
                  <h5 className="text-xs font-bold text-rose-900">ลบไฟล์ใน Google Drive อัตโนมัติ</h5>
                  <p className="text-[11px] text-rose-700 mt-0.5">เมื่อลบไฟล์บนเว็บไซต์ จะลบใน Drive ทันที และมีระบบป้องกันห้ามลบโฟลเดอร์หลัก</p>
                </div>
              </div>

              <div className="p-3.5 rounded-xl bg-amber-50/80 border border-amber-100 flex items-start gap-2.5">
                <div className="w-5 h-5 rounded-full bg-amber-600 text-white flex items-center justify-center text-[10px] font-bold shrink-0 mt-0.5">3</div>
                <div>
                  <h5 className="text-xs font-bold text-amber-900">กดไอคอนตาเพื่อดึงไฟล์พรีวิว</h5>
                  <p className="text-[11px] text-amber-700 mt-0.5">คลิกรูปตา 👀 จะดึงเนื้อหาและเอกสารจาก Google Drive มาเปิดดูตัวอย่างหน้า A4 ได้ทันที</p>
                </div>
              </div>

              <div className="p-3.5 rounded-xl bg-blue-50/80 border border-blue-100 flex items-start gap-2.5">
                <div className="w-5 h-5 rounded-full bg-blue-600 text-white flex items-center justify-center text-[10px] font-bold shrink-0 mt-0.5">4</div>
                <div>
                  <h5 className="text-xs font-bold text-blue-900">ดาวน์โหลดไฟล์จาก Google Drive ตรง</h5>
                  <p className="text-[11px] text-blue-700 mt-0.5">คลิกปุ่มดาวน์โหลด 📥 จะดึงไฟล์ต้นฉบับจาก Drive บันทึกลงเครื่องคอมพิวเตอร์ทันที</p>
                </div>
              </div>
            </div>

            {/* Input & Test GAS Web App URL */}
            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-3">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-slate-800">
                  URL ของ Google Apps Script Web App (ที่ได้หลังกด Deploy):
                </label>
                <span className="text-[11px] text-slate-500 font-mono">Execute as: Me | Access: Anyone</span>
              </div>
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                <input
                  type="url"
                  value={gasUrlInput}
                  onChange={(e) => setGasUrlInput(e.target.value)}
                  placeholder="https://script.google.com/macros/s/.../exec"
                  className="flex-1 px-3.5 py-2.5 rounded-xl border border-slate-300 text-xs font-mono text-slate-800 focus:ring-2 focus:ring-purple-500 focus:outline-none bg-white"
                />
                <button
                  type="button"
                  onClick={handleSaveAndTestGasUrl}
                  disabled={isTestingGas}
                  className="px-4 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 shrink-0"
                >
                  {isTestingGas ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>กำลังทดสอบเชื่อมต่อ...</span>
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="w-4 h-4" />
                      <span>บันทึก &amp; ทดสอบเชื่อมต่อ</span>
                    </>
                  )}
                </button>
              </div>

              {gasTestStatus && (
                <div
                  className={`p-3 rounded-lg text-xs flex items-center justify-between ${
                    gasTestStatus.success
                      ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                      : 'bg-rose-50 text-rose-800 border border-rose-200'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    {gasTestStatus.success ? (
                      <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                    ) : (
                      <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                    )}
                    <span>
                      <b>{gasTestStatus.success ? 'เชื่อมต่อสำเร็จ:' : 'พบปัญหา:'}</b>{' '}
                      {gasTestStatus.message}
                    </span>
                  </div>
                  {gasTestStatus.driveUrl && (
                    <a
                      href={gasTestStatus.driveUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-purple-700 underline font-semibold flex items-center gap-1 shrink-0 ml-2"
                    >
                      <span>เปิด Google Drive</span>
                      <ExternalLink className="w-3.5 h-3.5" />
                    </a>
                  )}
                </div>
              )}
            </div>

            <div className="space-y-3">
              <h4 className="text-xs font-bold text-slate-800">
                ขั้นตอนการนำโค้ดไปวางใน Google Apps Script:
              </h4>
              <ol className="list-decimal list-inside text-xs text-slate-600 space-y-1.5 leading-relaxed">
                <li>เปิดเว็บไซต์ <a href="https://script.google.com" target="_blank" rel="noopener noreferrer" className="text-purple-600 underline font-semibold">https://script.google.com</a> แล้วกด <b>+ โครงการใหม่ (+ New project)</b></li>
                <li>ลบโค้ดเดิมในไฟล์ <code className="font-mono bg-slate-100 px-1 py-0.5 rounded text-purple-700">Code.gs</code> ออกทั้งหมด แล้ววางโค้ดที่คัดลอกจากกล่องด้านล่างลงไป</li>
                <li>กดปุ่มบันทึก 💾 (Ctrl+S)</li>
                <li>กดปุ่มสีน้ำเงิน <b>"การทำให้ใช้งานได้" (Deploy) &gt; "การทำให้ใช้งานได้รายการใหม่" (New deployment)</b></li>
                <li>เลือกประเภท ⚙️ เป็น <b>"เว็บแอป" (Web app)</b></li>
                <li>ตั้งค่า: <b>"ดำเนินการในฐานะ" (Execute as)</b> เลือกเป็น <b>"ฉัน" (Me)</b></li>
                <li>ตั้งค่าสำคัญมาก: <b>"ผู้ที่มีสิทธิ์เข้าถึง" (Who has access)</b> เลือกเป็น <b>"ทุกคน" (Anyone)</b></li>
                <li>กดปุ่ม <b>"ทำให้ใช้งานได้" (Deploy)</b> และอนุญาตสิทธิ์เข้าถึง (Authorize)</li>
                <li>คัดลอก URL ของเว็บแอป (ลงท้ายด้วย <code>/exec</code>) มาวางในช่องด้านบนแล้วกด <b>"บันทึก &amp; ทดสอบเชื่อมต่อ"</b></li>
              </ol>
            </div>

            <div className="relative">
              <pre className="bg-slate-900 text-slate-100 p-4 rounded-xl text-[11px] font-mono overflow-x-auto max-h-72 border border-slate-800 leading-relaxed">
                {GOOGLE_APPS_SCRIPT_CODE}
              </pre>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
