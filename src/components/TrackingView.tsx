import React, { useState } from 'react';
import { 
  Eye, 
  Download, 
  Trash2, 
  Edit3, 
  FileText, 
  FileSpreadsheet, 
  FileCode, 
  Search, 
  Filter, 
  FolderCheck, 
  ChevronDown, 
  ChevronRight,
  User as UserIcon,
  Clock,
  CheckCircle,
  ShieldAlert
} from 'lucide-react';
import { 
  Assignment, 
  Submission, 
  UploadedFile, 
  User 
} from '../types';
import { storage, triggerDirectDownload } from '../services/storageService';
import Swal from 'sweetalert2';
import { formatThaiDate, formatThaiDateRange } from '../lib/dateUtils';

interface TrackingViewProps {
  currentUser: User | null;
  assignments: Assignment[];
  submissions: Submission[];
  onOpenFilePreview: (file: UploadedFile, assignmentTitle?: string, submitterName?: string) => void;
}

export const TrackingView: React.FC<TrackingViewProps> = ({
  currentUser,
  assignments,
  submissions,
  onOpenFilePreview,
}) => {
  const isAdmin = currentUser?.role === 'admin';
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedAssignmentFilter, setSelectedAssignmentFilter] = useState<string>('all');
  // Default: Every topic is collapsed automatically every time the website is opened
  const [collapsedGroups, setCollapsedGroups] = useState<Record<string, boolean>>(() => {
    const initial: Record<string, boolean> = {};
    assignments.forEach((a) => {
      initial[a.id] = true;
    });
    return initial;
  });

  // File edit modal state
  const [editingFile, setEditingFile] = useState<{
    submissionId: string;
    file: UploadedFile;
    newName: string;
  } | null>(null);

  const toggleGroup = (assignmentId: string) => {
    setCollapsedGroups((prev) => {
      const isCurrentlyCollapsed = prev[assignmentId] ?? true;
      return {
        ...prev,
        [assignmentId]: !isCurrentlyCollapsed,
      };
    });
  };

  const expandAll = () => {
    const newCollapsed: Record<string, boolean> = {};
    assignments.forEach((a) => {
      newCollapsed[a.id] = false;
    });
    setCollapsedGroups(newCollapsed);
  };

  const collapseAll = () => {
    const newCollapsed: Record<string, boolean> = {};
    assignments.forEach((a) => {
      newCollapsed[a.id] = true;
    });
    setCollapsedGroups(newCollapsed);
  };

  const handleDownloadFile = (file: UploadedFile) => {
    Swal.fire({
      icon: 'success',
      title: 'กำลังเริ่มดาวน์โหลดไฟล์ต้นฉบับ',
      text: `ดาวน์โหลด ${file.name} เรียบร้อยแล้ว (Original Binary File)`,
      toast: true,
      position: 'top-end',
      timer: 1800,
      showConfirmButton: false,
    });

    triggerDirectDownload(file);
  };

  // Safe file delete handler (Ensuring rule: NEVER deletes folders!)
  const handleDeleteFile = (submissionId: string, fileId: string, fileName: string) => {
    Swal.fire({
      title: 'ยืนยันการลบไฟล์?',
      html: `คุณต้องการลบไฟล์ <b>"${fileName}"</b> ออกจากระบบและ Google Drive ใช่หรือไม่?<br/><small class="text-slate-400">*ลบเฉพาะไฟล์เดี่ยว ไม่กระทบต่อโฟลเดอร์หลัก</small>`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#E11D48',
      cancelButtonColor: '#94A3B8',
      confirmButtonText: 'ใช่, ลบไฟล์นี้',
      cancelButtonText: 'ยกเลิก',
    }).then((result) => {
      if (result.isConfirmed) {
        try {
          storage.deleteFileFromSubmission(submissionId, fileId, currentUser?.id || '', isAdmin);
          Swal.fire({
            icon: 'success',
            title: 'ลบไฟล์สำเร็จ',
            text: `ลบไฟล์ "${fileName}" เรียบร้อยแล้ว`,
            timer: 1500,
            showConfirmButton: false,
          });
        } catch (err: any) {
          Swal.fire('ข้อผิดพลาด', err.message || 'ไม่สามารถลบไฟล์ได้', 'error');
        }
      }
    });
  };

  // Save renamed file
  const handleSaveRename = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingFile || !editingFile.newName.trim()) return;

    const sub = submissions.find((s) => s.id === editingFile.submissionId);
    if (sub) {
      const updatedFiles = (sub.files || []).map((f) => {
        if (f.id === editingFile.file.id) {
          return { ...f, name: editingFile.newName.trim() };
        }
        return f;
      });
      storage.updateSubmission(sub.id, { files: updatedFiles });
      setEditingFile(null);
      Swal.fire({
        icon: 'success',
        title: 'แก้ไขชื่อไฟล์สำเร็จ',
        timer: 1400,
        showConfirmButton: false,
      });
    }
  };

  // Filtered and sorted assignments (Closest upcoming deadline first)
  const displayedAssignments = [...assignments]
    .filter((a) => {
      if (selectedAssignmentFilter !== 'all' && a.id !== selectedAssignmentFilter) {
        return false;
      }
      return true;
    })
    .sort((a, b) => {
      const dateA = a.dueDateStart || a.dueDateEnd || '';
      const dateB = b.dueDateStart || b.dueDateEnd || '';
      return dateA.localeCompare(dateB);
    });

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Header */}
      <div className="bg-white rounded-2xl p-5 sm:p-6 border border-purple-100 shadow-xs space-y-4">
        {/* Row 1: Title in one line & Expand/Collapse All controls */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <h2 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight whitespace-nowrap">
            ติดตามงาน & ตรวจงาน
          </h2>

          {/* Expand / Collapse All buttons */}
          <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl shrink-0 self-start sm:self-auto border border-slate-200/60">
            <button
              type="button"
              onClick={expandAll}
              className="px-3 py-1.5 text-xs font-semibold text-slate-700 hover:text-purple-900 hover:bg-white rounded-lg transition-all cursor-pointer shadow-2xs"
            >
              ขยายทั้งหมด
            </button>
            <button
              type="button"
              onClick={collapseAll}
              className="px-3 py-1.5 text-xs font-semibold text-slate-700 hover:text-purple-900 hover:bg-white rounded-lg transition-all cursor-pointer shadow-2xs"
            >
              ย่อทั้งหมด
            </button>
          </div>
        </div>

        {/* Row 2: Search bar below title + Category Filter beside it */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 pt-2 border-t border-slate-100">
          {/* Search bar */}
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="ค้นหาชื่อผู้ส่ง หรือ ชื่อไฟล์..."
              className="w-full pl-10 pr-4 py-2 text-xs sm:text-sm rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-purple-500 bg-white"
            />
          </div>

          {/* Select Category */}
          <div className="sm:w-80 shrink-0">
            <select
              value={selectedAssignmentFilter}
              onChange={(e) => setSelectedAssignmentFilter(e.target.value)}
              className="w-full px-3.5 py-2 text-xs sm:text-sm rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-purple-500 bg-white text-slate-700 font-semibold cursor-pointer truncate"
            >
              <option value="all">ทุกหมวดหมู่หัวข้องาน ({assignments.length})</option>
              {[...assignments]
                .sort((a, b) => {
                  const dateA = a.dueDateStart || a.dueDateEnd || '';
                  const dateB = b.dueDateStart || b.dueDateEnd || '';
                  return dateA.localeCompare(dateB);
                })
                .map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.title.length > 40 ? a.title.substring(0, 40) + '...' : a.title}
                  </option>
                ))}
            </select>
          </div>
        </div>
      </div>

      {/* Grouped by Assignment Topic (Minimal List View) */}
      <div className="space-y-3.5">
        {displayedAssignments.map((assignment) => {
          const isCollapsed = collapsedGroups[assignment.id] ?? true;
          
          // Get all submissions for this assignment matching search
          const matchingSubmissions = submissions.filter((sub) => {
            if (sub.assignmentId !== assignment.id) return false;
            if (!searchQuery.trim()) return true;
            const q = searchQuery.toLowerCase();
            const matchUser = sub.memberName.toLowerCase().includes(q);
            const matchFile = (sub.files || []).some((f) => f.name.toLowerCase().includes(q));
            return matchUser || matchFile;
          });

          // Total files in this assignment
          const totalFilesCount = matchingSubmissions.reduce((acc, curr) => acc + (curr.files ? curr.files.length : 0), 0);

          return (
            <div
              key={assignment.id}
              className="bg-white rounded-2xl border border-purple-100 shadow-xs overflow-hidden"
            >
              {/* Group Header - Clean & Minimal */}
              <div
                onClick={() => toggleGroup(assignment.id)}
                className="px-5 py-3.5 bg-slate-50/90 hover:bg-purple-50/60 cursor-pointer transition-colors border-b border-slate-200/70 flex items-center justify-between gap-3"
              >
                <div className="flex items-center space-x-3 min-w-0 flex-1">
                  <button className="text-slate-400 hover:text-purple-600 shrink-0">
                    {isCollapsed ? (
                      <ChevronRight className="w-4 h-4" />
                    ) : (
                      <ChevronDown className="w-4 h-4" />
                    )}
                  </button>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="text-xs sm:text-sm font-bold text-slate-900 truncate">
                        {assignment.title}
                      </h3>
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-purple-100 text-purple-800 shrink-0">
                        {matchingSubmissions.length} ผู้ส่ง ({totalFilesCount} ไฟล์)
                      </span>
                    </div>
                    {!isCollapsed && (
                      <p className="text-[11px] text-slate-500 mt-0.5">
                        กำหนดส่ง: {formatThaiDateRange(assignment.dueDateStart, assignment.dueDateEnd)}
                      </p>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-1.5 text-xs font-semibold text-purple-700 shrink-0">
                  <span>{isCollapsed ? 'ขยายดูรายการ' : 'ย่อรายการ'}</span>
                </div>
              </div>

              {/* Submissions & Files List */}
              {!isCollapsed && (
                <div className="divide-y divide-slate-100">
                  {matchingSubmissions.length === 0 ? (
                    <div className="p-6 text-center text-xs text-slate-400">
                      ยังไม่มีการส่งไฟล์ในหัวข้อนี้
                    </div>
                  ) : (
                    matchingSubmissions.map((sub) => (
                      <div key={sub.id} className="p-4 sm:p-4.5 bg-white hover:bg-slate-50/60 transition-colors">
                        {/* Submitter info row */}
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center space-x-2.5">
                            <div className="w-7 h-7 rounded-full bg-purple-100 text-purple-700 flex items-center justify-center font-bold text-xs overflow-hidden">
                              {sub.memberAvatar ? (
                                <img src={sub.memberAvatar} alt={sub.memberName} className="w-full h-full object-cover" />
                              ) : (
                                sub.memberName.charAt(0)
                              )}
                            </div>
                            <div>
                              {/* Submitter Short Name */}
                              <span className="text-xs font-bold text-slate-800">
                                {sub.memberName}
                              </span>
                              <span className="text-[11px] text-slate-400 ml-2">
                                ({sub.department}) • ส่งเมื่อ {formatThaiDate(sub.submissionDate)}
                              </span>
                            </div>
                          </div>

                          {sub.note && (
                            <span className="text-[11px] text-slate-500 italic max-w-xs truncate hidden sm:inline">
                              "{sub.note}"
                            </span>
                          )}
                        </div>

                        {/* Files Minimal List */}
                        <div className="space-y-1.5 pl-9">
                          {(sub.files || []).map((file) => (
                            <div
                              key={file.id}
                              className="flex items-center justify-between p-2.5 rounded-xl border border-slate-200 bg-slate-50/60 text-xs hover:border-purple-200 transition-colors"
                            >
                              {/* File name & size */}
                              <div className="flex items-center space-x-2.5 min-w-0">
                                {file.previewType === 'pdf' ? (
                                  <FileText className="w-4 h-4 text-rose-500 shrink-0" />
                                ) : file.previewType === 'spreadsheet' ? (
                                  <FileSpreadsheet className="w-4 h-4 text-emerald-500 shrink-0" />
                                ) : (
                                  <FileCode className="w-4 h-4 text-purple-500 shrink-0" />
                                )}
                                <span className="font-medium text-slate-800 truncate">
                                  {file.name}
                                </span>
                                <span className="text-[10px] text-slate-400 shrink-0">
                                  ({(file.size / (1024 * 1024)).toFixed(2)} MB)
                                </span>
                              </div>

                              {/* Action Buttons */}
                              <div className="flex items-center space-x-1.5 shrink-0">
                                {/* Eye (Preview) Icon: Opens authentic original raw file in new tab */}
                                <button
                                  onClick={() => onOpenFilePreview(file, assignment.title, sub.memberName)}
                                  title="เปิดดูไฟล์ต้นฉบับในหน้าต่างใหม่"
                                  className="p-1.5 text-purple-700 hover:bg-purple-100 rounded-lg transition-colors cursor-pointer"
                                >
                                  <Eye className="w-4 h-4" />
                                </button>

                                

                                {/* 1-Click Download Button */}
                                <button
                                  onClick={() => handleDownloadFile(file)}
                                  title="ดาวน์โหลดไฟล์ตรงจาก Google Drive (1-Click)"
                                  className="p-1.5 text-emerald-700 hover:bg-emerald-100 rounded-lg transition-colors cursor-pointer"
                                >
                                  <Download className="w-4 h-4" />
                                </button>

                                {/* File Actions: Edit name & Delete file (For Admin or File Owner) */}
                                {(isAdmin || sub.memberId === currentUser?.id) && (
                                  <>
                                    <button
                                      onClick={() => {
                                        setEditingFile({
                                          submissionId: sub.id,
                                          file: file,
                                          newName: file.name,
                                        });
                                      }}
                                      title="แก้ไขชื่อ/ข้อมูลไฟล์"
                                      className="p-1.5 text-amber-600 hover:bg-amber-100 rounded-lg transition-colors cursor-pointer"
                                    >
                                      <Edit3 className="w-3.5 h-3.5" />
                                    </button>

                                    <button
                                      onClick={() => handleDeleteFile(sub.id, file.id, file.name)}
                                      title="ลบไฟล์เดี่ยวนี้ออกจากระบบและ Google Drive"
                                      className="p-1.5 text-rose-500 hover:bg-rose-100 rounded-lg transition-colors cursor-pointer"
                                    >
                                      <Trash2 className="w-3.5 h-3.5" />
                                    </button>
                                  </>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Admin Rename File Modal */}
      {editingFile && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-purple-100">
            <h3 className="text-base font-bold text-slate-900 mb-2">
              แก้ไขชื่อไฟล์เอกสาร
            </h3>
            <p className="text-xs text-slate-500 mb-4">
              File ID: {editingFile.file.driveFileId}
            </p>

            <form onSubmit={handleSaveRename} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  ชื่อไฟล์ใหม่
                </label>
                <input
                  type="text"
                  required
                  value={editingFile.newName}
                  onChange={(e) => setEditingFile({ ...editingFile, newName: e.target.value })}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-purple-500"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setEditingFile(null)}
                  className="px-4 py-2 text-xs font-medium text-slate-600 hover:bg-slate-100 rounded-xl"
                >
                  ยกเลิก
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-xs font-semibold text-white bg-purple-600 hover:bg-purple-700 rounded-xl shadow-xs"
                >
                  บันทึก
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
