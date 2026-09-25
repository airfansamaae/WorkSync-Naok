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
  Loader2
} from 'lucide-react';
import { User, SchoolProfile } from '../types';
import { storage } from '../services/storageService';
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
  const [activeTab, setActiveTab] = useState<'school' | 'members' | 'password' | 'profile'>(
    isAdmin ? 'school' : 'profile'
  );

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

    if (currentUser?.id) {
      storage.updateUserPassword(currentUser.id, newPassword);
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
    if (currentUser?.id === userId || userName.toLowerCase() === 'admin' || userId === 'user_admin') {
      Swal.fire({
        icon: 'warning',
        title: 'ไม่สามารถลบได้',
        text: 'ไม่สามารถลบบัญชีผู้ดูแลระบบหลัก หรือบัญชีที่คุณกำลังใช้งานอยู่ได้',
        confirmButtonColor: '#7C3AED',
      });
      return;
    }

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
        try {
          storage.deleteUser(userId);
          Swal.fire({
            icon: 'success',
            title: 'ลบสมาชิกเรียบร้อย',
            timer: 1400,
            showConfirmButton: false,
          });
          onRefreshData();
        } catch (err: any) {
          Swal.fire('ข้อผิดพลาด', err.message || 'ไม่สามารถลบสมาชิกได้', 'error');
        }
      }
    });
  };

  // Admin Change / Reset Member Password (กรณีสมาชิกลืมรหัสผ่าน)
  const handleChangeMemberPassword = (member: User) => {
    const currentPass = member.password || '123456';
    Swal.fire({
      title: 'เปลี่ยนรหัสผ่านสมาชิก',
      html: `
        <div style="text-align: left; font-size: 13px; color: #334155; margin-bottom: 14px; background: #FAF5FF; padding: 12px; border-radius: 10px; border: 1px solid #E9D5FF;">
          <div style="margin-bottom: 4px;"><b>ชื่อ-สกุล:</b> <span style="color: #6B21A8; font-weight: 600;">${member.fullName}</span></div>
          <div style="margin-bottom: 4px;"><b>ชื่อผู้ใช้ (Username):</b> <span style="font-family: monospace; font-weight: bold; color: #7C3AED;">${member.username}</span></div>
          <div><b>รหัสผ่านปัจจุบัน:</b> <code style="background: #FFFFFF; padding: 2px 8px; border-radius: 4px; font-weight: bold; border: 1px solid #CBD5E1; color: #0F172A; font-family: monospace;">${currentPass}</code></div>
        </div>
        <div style="text-align: left;">
          <label style="display: block; font-size: 12px; font-weight: bold; color: #334155; margin-bottom: 6px;">
            กำหนดรหัสผ่านใหม่ (สำหรับแจ้งให้สมาชิกล็อกอิน):
          </label>
          <input 
            id="swal-new-member-pass" 
            type="text" 
            class="swal2-input" 
            placeholder="ระบุรหัสผ่านใหม่..." 
            value="${currentPass}"
            style="margin: 0; width: 100%; box-sizing: border-box; font-size: 14px; padding: 8px 12px; border-radius: 8px;" 
          />
          <div style="font-size: 11px; color: #64748B; margin-top: 6px;">
            * เมื่อเปลี่ยนแล้ว สมาชิกจะสามารถใช้รหัสผ่านใหม่นี้เข้าสู่ระบบได้ทันที
          </div>
        </div>
      `,
      showCancelButton: true,
      confirmButtonColor: '#7C3AED',
      cancelButtonColor: '#94A3B8',
      confirmButtonText: 'บันทึกรหัสผ่านใหม่',
      cancelButtonText: 'ยกเลิก',
      focusConfirm: false,
      didOpen: () => {
        const input = document.getElementById('swal-new-member-pass') as HTMLInputElement;
        if (input) {
          input.focus();
          input.select();
        }
      },
      preConfirm: () => {
        const input = document.getElementById('swal-new-member-pass') as HTMLInputElement;
        const newPass = input ? input.value.trim() : '';
        if (!newPass) {
          Swal.showValidationMessage('กรุณาระบุรหัสผ่านใหม่');
          return false;
        }
        if (newPass.length < 3) {
          Swal.showValidationMessage('รหัสผ่านควรมีความยาวอย่างน้อย 3 ตัวอักษร');
          return false;
        }
        return newPass;
      }
    }).then((result) => {
      if (result.isConfirmed && result.value) {
        storage.updateUserPassword(member.id, result.value);
        Swal.fire({
          icon: 'success',
          title: 'เปลี่ยนรหัสผ่านสำเร็จ',
          html: `อัปเดตรหัสผ่านใหม่ของ <b>"${member.fullName}"</b> เรียบร้อยแล้ว<br><div style="margin-top: 8px; font-size: 13px; color: #475569;">รหัสผ่านใหม่: <b style="color: #7C3AED; font-family: monospace; font-size: 15px;">${result.value}</b></div><div style="font-size: 11px; color: #64748B; margin-top: 4px;">สามารถแจ้งรหัสผ่านใหม่นี้ให้สมาชิกเพื่อใช้ล็อกอินได้ทันที</div>`,
          confirmButtonColor: '#7C3AED',
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
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 sm:gap-3">
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
                        className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg transition-all shadow-2xs glow-emerald-hover cursor-pointer"
                      >
                        <Check className="w-3.5 h-3.5" />
                        <span>อนุมัติเข้าใช้งาน</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => handleChangeMemberPassword(member)}
                        title={`เปลี่ยนรหัสผ่านสำหรับ ${member.fullName}`}
                        className="p-2 text-purple-700 hover:text-purple-900 bg-purple-50 hover:bg-purple-100 border border-purple-200 rounded-lg transition-colors cursor-pointer"
                      >
                        <Key className="w-4 h-4 text-purple-600" />
                      </button>
                      <button
                        onClick={() => handleRejectMember(member.id, member.fullName)}
                        className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-rose-700 hover:bg-rose-50 border border-rose-200 rounded-lg transition-colors cursor-pointer"
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
                      type="button"
                      onClick={() => handleChangeMemberPassword(member)}
                      title={`เปลี่ยนรหัสผ่านสำหรับ ${member.fullName}`}
                      className="p-2 text-purple-700 hover:text-purple-900 bg-purple-50 hover:bg-purple-100 border border-purple-200 rounded-lg transition-colors cursor-pointer"
                    >
                      <Key className="w-4 h-4 text-purple-600" />
                    </button>
                    {member.id !== currentUser?.id && member.username.toLowerCase() !== 'admin' && member.id !== 'user_admin' && (
                      <button
                        onClick={() => handleDeleteMember(member.id, member.fullName)}
                        title="ลบสมาชิก"
                        className="p-2 text-rose-500 hover:bg-rose-50 rounded-lg border border-slate-200 transition-colors cursor-pointer"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
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

    </div>
  );
};
