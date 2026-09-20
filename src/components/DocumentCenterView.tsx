import React, { useState } from 'react';
import { 
  FolderGit2, 
  Search, 
  Plus, 
  Eye, 
  Download, 
  Trash2, 
  Edit3, 
  FileText, 
  FileCheck, 
  FileSpreadsheet, 
  BookOpen, 
  ScrollText, 
  UploadCloud, 
  X,
  Calendar,
  Layers,
  ArrowDownToLine
} from 'lucide-react';
import { 
  DocumentItem, 
  DocumentCategory, 
  UploadedFile, 
  User 
} from '../types';
import { storage, triggerDirectDownload } from '../services/storageService';
import { ensureGoogleDriveConnected, ROOT_DRIVE_FOLDER_ID } from '../services/googleDriveService';
import Swal from 'sweetalert2';
import { formatThaiDate } from '../lib/dateUtils';

interface DocumentCenterViewProps {
  currentUser: User | null;
  documents: DocumentItem[];
  onOpenFilePreview: (file: UploadedFile, docTitle?: string, uploaderName?: string) => void;
}

export const DocumentCenterView: React.FC<DocumentCenterViewProps> = ({
  currentUser,
  documents,
  onOpenFilePreview,
}) => {
  const isAdmin = currentUser?.role === 'admin';
  const [selectedCategory, setSelectedCategory] = useState<'all' | DocumentCategory>('all');
  const [searchQuery, setSearchQuery] = useState('');
  
  // Modal states
  const [isAddDocModalOpen, setIsAddDocModalOpen] = useState(false);
  const [docTitle, setDocTitle] = useState('');
  const [docCategory, setDocCategory] = useState<DocumentCategory>('sample');
  const [docNumber, setDocNumber] = useState('');
  const [docDescription, setDocDescription] = useState('');
  const [selectedDocFile, setSelectedDocFile] = useState<File | null>(null);
  const [uploadProgress, setUploadProgress] = useState<number | null>(null);

  // Edit document state
  const [editingDoc, setEditingDoc] = useState<DocumentItem | null>(null);

  // Handle Add Document
  const handleAddDocument = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!docTitle.trim()) {
      Swal.fire('ข้อผิดพลาด', 'กรุณาระบุชื่อเอกสาร', 'warning');
      return;
    }
    if (!selectedDocFile) {
      Swal.fire('ข้อผิดพลาด', 'กรุณาเลือกไฟล์เอกสารที่ต้องการอัปโหลด', 'warning');
      return;
    }

    const school = storage.getSchoolProfile();
    const targetFolder = school?.primaryDriveFolderId || ROOT_DRIVE_FOLDER_ID;

    setUploadProgress(0);
    let uploaded;
    try {
      uploaded = await storage.simulateFileUpload(selectedDocFile, (pct) => {
        setUploadProgress(pct);
      }, targetFolder);
    } catch (uploadErr: any) {
      setUploadProgress(null);
      Swal.fire({
        icon: 'error',
        title: 'อัปโหลดลง Google Drive ไม่สำเร็จ',
        text: uploadErr?.message || 'เกิดข้อผิดพลาดในการบันทึกไฟล์ลง Google Drive',
      });
      return;
    }

    storage.createDocument({
      title: docTitle,
      category: docCategory,
      docNumber: docNumber,
      description: docDescription,
      file: uploaded,
    });

    setUploadProgress(100);

    setTimeout(() => {
      setUploadProgress(null);
      setIsAddDocModalOpen(false);
      setDocTitle('');
      setDocNumber('');
      setDocDescription('');
      setSelectedDocFile(null);

      Swal.fire({
        icon: 'success',
        title: 'สำเร็จ',
        text: 'เพิ่มเอกสารเข้าสู่ศูนย์เอกสารเรียบร้อยแล้ว',
        confirmButtonColor: '#7C3AED',
        timer: 1800,
      });
    }, 400);
  };

  // Handle 1-Click Download
  const handleDownloadDoc = (doc: DocumentItem) => {
    storage.incrementDocumentDownload(doc.id);
    Swal.fire({
      icon: 'success',
      title: 'กำลังดาวน์โหลดไฟล์ต้นฉบับ',
      text: `ดาวน์โหลด ${doc.file.name} เรียบร้อยแล้ว (Original Binary File)`,
      toast: true,
      position: 'top-end',
      timer: 1600,
      showConfirmButton: false,
    });

    triggerDirectDownload(doc.file);
  };

  // Handle Delete Document
  const handleDeleteDoc = (docId: string, docTitleStr: string) => {
    Swal.fire({
      title: 'ยืนยันการลบเอกสาร?',
      html: `คุณต้องการลบเอกสาร <b>"${docTitleStr}"</b> ใช่หรือไม่?`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#E11D48',
      cancelButtonColor: '#94A3B8',
      confirmButtonText: 'ใช่, ลบเอกสาร',
      cancelButtonText: 'ยกเลิก',
    }).then((result) => {
      if (result.isConfirmed) {
        try {
          storage.deleteDocument(docId, currentUser?.id || '', isAdmin);
          Swal.fire({
            icon: 'success',
            title: 'สำเร็จ',
            text: 'ลบเอกสารเรียบร้อยแล้ว',
            timer: 1400,
            showConfirmButton: false,
          });
        } catch (err: any) {
          Swal.fire('ข้อผิดพลาด', err.message, 'error');
        }
      }
    });
  };

  // Handle Update Document
  const handleSaveEditDoc = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingDoc) return;
    storage.updateDocument(editingDoc.id, {
      title: editingDoc.title,
      docNumber: editingDoc.docNumber,
      category: editingDoc.category,
      description: editingDoc.description,
    });
    setEditingDoc(null);
    Swal.fire({
      icon: 'success',
      title: 'แก้ไขข้อมูลสำเร็จ',
      timer: 1400,
      showConfirmButton: false,
    });
  };

  // Filtering
  const filteredDocs = documents.filter((doc) => {
    if (selectedCategory !== 'all' && doc.category !== selectedCategory) {
      return false;
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchTitle = doc.title.toLowerCase().includes(q);
      const matchNum = (doc.docNumber || '').toLowerCase().includes(q);
      const matchDesc = (doc.description || '').toLowerCase().includes(q);
      const matchFileName = doc.file.name.toLowerCase().includes(q);
      return matchTitle || matchNum || matchDesc || matchFileName;
    }
    return true;
  });

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Top Header */}
      <div className="bg-white rounded-2xl p-5 sm:p-6 border border-purple-100 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-lg sm:text-xl font-bold text-slate-900 leading-none">
              ศูนย์เอกสาร & หนังสือคำสั่ง (Document Center)
            </h2>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-indigo-100 text-indigo-800">
              {documents.length} รายการ
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            คลังเอกสารตัวอย่าง แผนการสอน วิจัยในชั้นเรียน และหนังสือคำสั่งราชการโรงเรียน
          </p>
        </div>

        {/* Admin Plus Button */}
        {isAdmin && (
          <button
            id="admin-add-doc-btn"
            onClick={() => setIsAddDocModalOpen(true)}
            title="เพิ่มเอกสารใหม่"
            className="w-10 h-10 flex items-center justify-center text-white bg-purple-600 hover:bg-purple-700 rounded-xl transition-all shadow-xs glow-purple-hover shrink-0 cursor-pointer"
          >
            <Plus className="w-5 h-5" />
          </button>
        )}
      </div>

      {/* 4.4 Filter Header (Mini "All" button, Large "เอกสารตัวอย่าง" & "หนังสือคำสั่ง" buttons + Search Bar) */}
      <div className="bg-white rounded-2xl p-4 border border-purple-100 shadow-xs flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3">
        {/* Filter Buttons */}
        <div className="flex items-center gap-2 flex-wrap">
          {/* Very Small "All" button */}
          <button
            id="filter-doc-all-btn"
            onClick={() => setSelectedCategory('all')}
            className={`px-2.5 py-1 text-[11px] font-bold rounded-lg transition-all ${
              selectedCategory === 'all'
                ? 'bg-slate-900 text-white shadow-2xs'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            All
          </button>

          {/* Large "เอกสารตัวอย่าง" Button */}
          <button
            id="filter-doc-sample-btn"
            onClick={() => setSelectedCategory('sample')}
            className={`flex-1 sm:flex-none flex items-center justify-center gap-2 px-5 py-2.5 text-xs sm:text-sm font-bold rounded-xl transition-all ${
              selectedCategory === 'sample'
                ? 'bg-purple-600 text-white shadow-xs glow-purple'
                : 'bg-purple-50 text-purple-700 hover:bg-purple-100 border border-purple-200'
            }`}
          >
            <BookOpen className="w-4 h-4" />
            <span>เอกสารตัวอย่าง ({documents.filter((d) => d.category === 'sample').length})</span>
          </button>

          {/* Large "หนังสือคำสั่ง" Button */}
          <button
            id="filter-doc-order-btn"
            onClick={() => setSelectedCategory('order')}
            className={`flex-1 sm:flex-none flex items-center justify-center gap-2 px-5 py-2.5 text-xs sm:text-sm font-bold rounded-xl transition-all ${
              selectedCategory === 'order'
                ? 'bg-indigo-600 text-white shadow-xs glow-purple'
                : 'bg-indigo-50 text-indigo-700 hover:bg-indigo-100 border border-indigo-200'
            }`}
          >
            <ScrollText className="w-4 h-4" />
            <span>หนังสือคำสั่ง ({documents.filter((d) => d.category === 'order').length})</span>
          </button>
        </div>

        {/* Search Bar */}
        <div className="relative min-w-[240px]">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="ค้นหาชื่อเอกสาร, เลขที่คำสั่ง..."
            className="w-full pl-9 pr-3 py-2 text-xs rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-purple-500 bg-slate-50/50"
          />
        </div>
      </div>

      {/* Document Minimal List View with Spacing between files */}
      <div className="space-y-2.5 sm:space-y-3">
        {filteredDocs.length === 0 ? (
          <div className="bg-white rounded-2xl border border-purple-100 p-8 text-center text-xs text-slate-400 shadow-2xs">
            ไม่พบเอกสารตามเงื่อนไขที่ค้นหา
          </div>
        ) : (
          filteredDocs.map((doc) => (
            <div
              key={doc.id}
              className="bg-white rounded-xl sm:rounded-2xl border border-purple-100/80 shadow-2xs hover:shadow-xs hover:border-purple-300/80 p-3 sm:py-3 sm:px-4.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 transition-all group"
            >
              {/* Left File Information (Compact & Orderly) */}
              <div className="flex items-start sm:items-center space-x-3 min-w-0 flex-1">
                <div
                  className={`p-2 rounded-xl shrink-0 ${
                    doc.category === 'order'
                      ? 'bg-indigo-100 text-indigo-700'
                      : 'bg-purple-100 text-purple-700'
                  }`}
                >
                  {doc.category === 'order' ? (
                    <ScrollText className="w-4 h-4 sm:w-4.5 sm:h-4.5" />
                  ) : (
                    <BookOpen className="w-4 h-4 sm:w-4.5 sm:h-4.5" />
                  )}
                </div>

                <div className="min-w-0 flex-1 space-y-0.5">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span
                      className={`text-[10px] font-bold px-2 py-0.5 rounded-md ${
                        doc.category === 'order'
                          ? 'bg-indigo-50 text-indigo-800 border border-indigo-200'
                          : 'bg-purple-50 text-purple-800 border border-purple-200'
                      }`}
                    >
                      {doc.category === 'order' ? 'หนังสือคำสั่ง' : 'เอกสารตัวอย่าง'}
                    </span>

                    {doc.docNumber && (
                      <span className="text-[10px] font-semibold text-slate-700 bg-slate-100 px-2 py-0.5 rounded-md border border-slate-200">
                        {doc.docNumber}
                      </span>
                    )}

                    <span className="text-[11px] text-slate-400">
                      {formatThaiDate(doc.issueDate)}
                    </span>
                  </div>

                  <h3 className="text-xs sm:text-sm font-bold text-slate-900 leading-snug truncate group-hover:text-purple-950 transition-colors">
                    {doc.title}
                  </h3>

                  <div className="flex items-center gap-2.5 text-[10px] sm:text-[11px] text-slate-400">
                    <span>ดาวน์โหลดแล้ว {doc.downloadCount} ครั้ง</span>
                  </div>
                </div>
              </div>

              {/* Right Action Icons (Preview, Download, Admin Edit/Delete) */}
              <div className="flex items-center gap-1.5 shrink-0 self-end sm:self-center pt-1 sm:pt-0 border-t sm:border-t-0 border-slate-100 w-full sm:w-auto justify-end">
                {/* Preview Icon (Opens authentic original file in new window) */}
                <button
                  onClick={() => onOpenFilePreview(doc.file, doc.title, doc.uploaderName)}
                  title="เปิดดูไฟล์ต้นฉบับในหน้าต่างใหม่"
                  className="p-1.5 sm:p-2 text-purple-700 hover:bg-purple-100 rounded-lg transition-colors border border-purple-200 cursor-pointer"
                >
                  <Eye className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                </button>

                {/* 1-Click Direct Download */}
                <button
                  onClick={() => handleDownloadDoc(doc)}
                  title="ดาวน์โหลดไฟล์เอกสารตรง"
                  className="p-1.5 sm:p-2 text-emerald-700 hover:bg-emerald-100 rounded-lg transition-colors border border-emerald-200 cursor-pointer"
                >
                  <Download className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                </button>

                {/* Admin Extra: Edit & Delete */}
                {isAdmin && (
                  <>
                    <button
                      onClick={() => setEditingDoc(doc)}
                      title="แก้ไขข้อมูลเอกสาร"
                      className="p-1.5 sm:p-2 text-amber-600 hover:bg-amber-100 rounded-lg transition-colors border border-slate-200 cursor-pointer"
                    >
                      <Edit3 className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                    </button>

                    <button
                      onClick={() => handleDeleteDoc(doc.id, doc.title)}
                      title="ลบเอกสารนี้"
                      className="p-1.5 sm:p-2 text-rose-500 hover:bg-rose-100 rounded-lg transition-colors border border-slate-200 cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                    </button>
                  </>
                )}
              </div>
            </div>
          ))
        )}
      </div>

      {/* Admin Add Document Modal */}
      {isAddDocModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-purple-100 relative">
            <button
              onClick={() => {
                if (uploadProgress === null) setIsAddDocModalOpen(false);
              }}
              disabled={uploadProgress !== null}
              className="absolute top-4 right-4 p-1.5 text-slate-400 hover:text-slate-700 rounded-full"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-2 mb-4">
              <div className="p-2 rounded-xl bg-purple-100 text-purple-700">
                <FolderGit2 className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900">
                  เพิ่มเอกสารใหม่เข้าสู่ศูนย์เอกสาร
                </h3>
                <p className="text-xs text-slate-500">
                  อัปโหลดไฟล์เข้าสู่ Google Drive กลาง
                </p>
              </div>
            </div>

            <form onSubmit={handleAddDocument} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  หมวดหมู่เอกสาร *
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setDocCategory('sample')}
                    className={`py-2 px-3 text-xs font-bold rounded-xl border transition-all ${
                      docCategory === 'sample'
                        ? 'bg-purple-50 text-purple-800 border-purple-500 ring-2 ring-purple-200'
                        : 'bg-white text-slate-600 border-slate-200'
                    }`}
                  >
                    เอกสารตัวอย่าง / แม่แบบ
                  </button>
                  <button
                    type="button"
                    onClick={() => setDocCategory('order')}
                    className={`py-2 px-3 text-xs font-bold rounded-xl border transition-all ${
                      docCategory === 'order'
                        ? 'bg-indigo-50 text-indigo-800 border-indigo-500 ring-2 ring-indigo-200'
                        : 'bg-white text-slate-600 border-slate-200'
                    }`}
                  >
                    หนังสือคำสั่งโรงเรียน
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  ชื่อเอกสาร *
                </label>
                <input
                  type="text"
                  required
                  value={docTitle}
                  onChange={(e) => setDocTitle(e.target.value)}
                  placeholder="เช่น แบบฟอร์มวิจัยในชั้นเรียน 1 หน้า หรือ คำสั่งที่ 150/2569"
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-purple-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  เลขที่เอกสาร / เลขที่คำสั่ง (ถ้ามี)
                </label>
                <input
                  type="text"
                  value={docNumber}
                  onChange={(e) => setDocNumber(e.target.value)}
                  placeholder="เช่น คำสั่ง รร. 150/2569"
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-purple-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  รายละเอียดเพิ่มเติม
                </label>
                <textarea
                  rows={2}
                  value={docDescription}
                  onChange={(e) => setDocDescription(e.target.value)}
                  placeholder="คำอธิบายสรุปเกี่ยวกับเอกสาร..."
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-purple-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  เลือกไฟล์เอกสาร (PDF, DOCX, XLSX, etc.) *
                </label>
                <input
                  type="file"
                  required
                  onChange={(e) => {
                    if (e.target.files && e.target.files[0]) {
                      const file = e.target.files[0];
                      setSelectedDocFile(file);
                      // Auto-fill title with file name (without extension) if empty or user hasn't typed custom name
                      const cleanName = file.name.replace(/\.[^/.]+$/, "");
                      setDocTitle((prev) => (!prev || prev.trim() === '' ? cleanName : prev));
                    }
                  }}
                  className="w-full text-xs text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-semibold file:bg-purple-50 file:text-purple-700 hover:file:bg-purple-100"
                />
              </div>

              {/* Progress Bar */}
              {uploadProgress !== null && (
                <div className="space-y-2 p-3 bg-purple-50 rounded-xl border border-purple-200">
                  <div className="flex items-center justify-between text-xs font-semibold text-purple-900">
                    <div className="flex items-center gap-2">
                      <div className="w-4 h-4 border-2 border-purple-600 border-t-transparent rounded-full animate-spin" />
                      <span>กำลังอัปโหลดเข้าสู่ Google Drive...</span>
                    </div>
                    <span>{uploadProgress}%</span>
                  </div>
                  <div className="w-full h-2 bg-purple-200 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-purple-600 rounded-full transition-all duration-200"
                      style={{ width: `${uploadProgress}%` }}
                    />
                  </div>
                </div>
              )}

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  disabled={uploadProgress !== null}
                  onClick={() => setIsAddDocModalOpen(false)}
                  className="px-4 py-2 text-xs font-medium text-slate-600 hover:bg-slate-100 rounded-xl"
                >
                  ยกเลิก
                </button>
                <button
                  type="submit"
                  disabled={uploadProgress !== null}
                  className="px-5 py-2 text-xs font-semibold text-white bg-purple-600 hover:bg-purple-700 rounded-xl shadow-xs glow-purple-hover"
                >
                  {uploadProgress !== null ? 'กำลังบันทึก...' : 'บันทึกและอัปโหลด'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Document Modal */}
      {editingDoc && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-purple-100">
            <h3 className="text-base font-bold text-slate-900 mb-4">
              แก้ไขข้อมูลเอกสาร
            </h3>
            <form onSubmit={handleSaveEditDoc} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  ชื่อเอกสาร
                </label>
                <input
                  type="text"
                  required
                  value={editingDoc.title}
                  onChange={(e) => setEditingDoc({ ...editingDoc, title: e.target.value })}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-purple-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  เลขที่เอกสาร
                </label>
                <input
                  type="text"
                  value={editingDoc.docNumber || ''}
                  onChange={(e) => setEditingDoc({ ...editingDoc, docNumber: e.target.value })}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-purple-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  หมวดหมู่
                </label>
                <select
                  value={editingDoc.category}
                  onChange={(e) => setEditingDoc({ ...editingDoc, category: e.target.value as DocumentCategory })}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-purple-500 bg-white"
                >
                  <option value="sample">เอกสารตัวอย่าง</option>
                  <option value="order">หนังสือคำสั่ง</option>
                  <option value="general">เอกสารทั่วไป</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  รายละเอียด
                </label>
                <textarea
                  rows={2}
                  value={editingDoc.description || ''}
                  onChange={(e) => setEditingDoc({ ...editingDoc, description: e.target.value })}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-purple-500"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setEditingDoc(null)}
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
