import React, { useState, useRef, useEffect } from 'react';
import { 
  Plus, 
  Edit3, 
  Check, 
  Trash2, 
  ExternalLink, 
  Info, 
  Globe, 
  ArrowLeft, 
  ArrowRight, 
  ArrowUpToLine, 
  Upload, 
  X, 
  Sparkles, 
  Image as ImageIcon,
  Loader2,
  HardDrive,
  Move,
  GripVertical
} from 'lucide-react';
import Swal from 'sweetalert2';
import { User, RecommendedWebsite } from '../types';
import { storage } from '../services/storageService';
import { ROOT_DRIVE_FOLDER_ID } from '../services/googleDriveService';

interface RecommendedWebsitesViewProps {
  currentUser: User | null;
  websites: RecommendedWebsite[];
  onRefreshWebsites?: () => void;
}

export const RecommendedWebsitesView: React.FC<RecommendedWebsitesViewProps> = ({
  currentUser,
  websites,
  onRefreshWebsites,
}) => {
  const isAdmin = currentUser?.role === 'admin';

  // State: Management & Edit Mode
  const [isEditMode, setIsEditMode] = useState(false);

  // State: Modal for Adding / Editing Website
  const [isFormModalOpen, setIsFormModalOpen] = useState(false);
  const [editingWebsiteId, setEditingWebsiteId] = useState<string | null>(null);

  // Form Fields: 1. Name, 2. Description, 3. URL, 4. Image, 5. DriveFileId
  const [formTitle, setFormTitle] = useState('');
  const [formDescription, setFormDescription] = useState('');
  const [formUrl, setFormUrl] = useState('');
  const [formImageUrl, setFormImageUrl] = useState('');
  const [formDriveFileId, setFormDriveFileId] = useState('');
  const [imagePreview, setImagePreview] = useState<string>('');
  const [isDraggingImage, setIsDraggingImage] = useState(false);
  const [isUploadingDrive, setIsUploadingDrive] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<number | null>(null);

  // State: Modal for "!" Description Pop-up
  const [infoModalWebsite, setInfoModalWebsite] = useState<RecommendedWebsite | null>(null);
  const [failedImages, setFailedImages] = useState<Record<string, boolean>>({});

  // =========================================================================
  // Drag and Drop / Press & Hold Reordering State (Admin Only)
  // รองรับทั้งคลิก/กดค้างลากบนคอมพิวเตอร์ และทัชค้างบนหน้าจอมือถือ/แท็บเล็ต
  // =========================================================================
  const [localWebsites, setLocalWebsites] = useState<RecommendedWebsite[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);

  const touchTimerRef = useRef<NodeJS.Timeout | null>(null);
  const touchStartPos = useRef<{ x: number; y: number } | null>(null);
  const isTouchDraggingRef = useRef(false);
  const touchCurrentIndexRef = useRef<number | null>(null);
  const justDraggedRef = useRef(false);
  const localWebsitesRef = useRef<RecommendedWebsite[]>([]);

  // ซิงค์ localWebsites กับ websites prop เมื่อไม่ได้กำลังลาก
  useEffect(() => {
    if (!isDragging) {
      const sorted = [...websites].sort((a, b) => (a.order ?? 999) - (b.order ?? 999));
      setLocalWebsites(sorted);
      localWebsitesRef.current = sorted;
    }
  }, [websites, isDragging]);

  useEffect(() => {
    localWebsitesRef.current = localWebsites;
  }, [localWebsites]);

  // ฟังก์ชันสลับลำดับใน Grid แบบเรียลไทม์ (Live Reorder)
  const reorderList = (fromIndex: number, toIndex: number) => {
    if (fromIndex === toIndex || fromIndex < 0 || toIndex < 0) return;
    setLocalWebsites((prev) => {
      const updated = [...prev];
      const [moved] = updated.splice(fromIndex, 1);
      updated.splice(toIndex, 0, moved);
      localWebsitesRef.current = updated;
      return updated;
    });
  };

  // ฟังก์ชันบันทึกลำดับลง Storage เมื่อปล่อยมือ / จบการลาก
  const commitReorder = (itemsToSave: RecommendedWebsite[]) => {
    storage.reorderWebsites(itemsToSave);
    onRefreshWebsites?.();
    Swal.fire({
      icon: 'success',
      title: 'จัดเรียงลำดับใหม่เรียบร้อย',
      toast: true,
      position: 'top-end',
      timer: 1500,
      showConfirmButton: false,
    });
  };

  // HTML5 Drag Handlers (Desktop Mouse)
  const handleDragStart = (e: React.DragEvent, index: number) => {
    if (!isAdmin) return;
    setIsDragging(true);
    setDraggedIndex(index);
    touchCurrentIndexRef.current = index;
    try {
      e.dataTransfer.effectAllowed = 'move';
      e.dataTransfer.setData('text/plain', String(index));
    } catch {}
  };

  const handleDragOver = (e: React.DragEvent, index: number) => {
    if (!isAdmin || !isDragging) return;
    e.preventDefault();
    try {
      e.dataTransfer.dropEffect = 'move';
    } catch {}
  };

  const handleDragEnter = (targetIndex: number) => {
    if (!isAdmin || draggedIndex === null || draggedIndex === targetIndex) return;
    reorderList(draggedIndex, targetIndex);
    setDraggedIndex(targetIndex);
    touchCurrentIndexRef.current = targetIndex;
  };

  const handleDragEnd = () => {
    if (!isAdmin) return;
    setIsDragging(false);
    setDraggedIndex(null);
    justDraggedRef.current = true;
    setTimeout(() => {
      justDraggedRef.current = false;
    }, 300);

    commitReorder(localWebsitesRef.current);
  };

  // Touch / Mobile Press & Hold Drag Handlers (กดค้างตรงโลโก้ 200ms แล้วลากขึ้น/ลง/ซ้าย/ขวา)
  const handleTouchStart = (e: React.TouchEvent, index: number) => {
    if (!isAdmin) return;
    const touch = e.touches[0];
    touchStartPos.current = { x: touch.clientX, y: touch.clientY };
    touchCurrentIndexRef.current = index;

    if (touchTimerRef.current) clearTimeout(touchTimerRef.current);
    touchTimerRef.current = setTimeout(() => {
      isTouchDraggingRef.current = true;
      setIsDragging(true);
      setDraggedIndex(index);
      if (typeof navigator !== 'undefined' && navigator.vibrate) {
        try {
          navigator.vibrate(40);
        } catch {}
      }
    }, 200);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!isAdmin) return;
    const touch = e.touches[0];

    // ถ้ายังไม่เริ่มลาก แต่ขยับนิ้วเกิน 10px แปลว่าเป็นการเลื่อนจอปกติ (ยกเลิกตัวจับเวลากดค้าง)
    if (!isTouchDraggingRef.current) {
      if (touchStartPos.current) {
        const dx = Math.abs(touch.clientX - touchStartPos.current.x);
        const dy = Math.abs(touch.clientY - touchStartPos.current.y);
        if (dx > 10 || dy > 10) {
          if (touchTimerRef.current) {
            clearTimeout(touchTimerRef.current);
            touchTimerRef.current = null;
          }
        }
      }
      return;
    }

    // กำลังลาก: ป้องกันหน้าจอเลื่อนตามนิ้ว
    if (e.cancelable) {
      e.preventDefault();
    }

    // หา element ปลายทางใต้ตำแหน่งนิ้ว
    const elem = document.elementFromPoint(touch.clientX, touch.clientY);
    const cardElem = elem?.closest('[data-website-index]');
    if (cardElem) {
      const targetIndex = parseInt(cardElem.getAttribute('data-website-index') || '-1', 10);
      const currentIdx = touchCurrentIndexRef.current;
      if (targetIndex >= 0 && currentIdx !== null && targetIndex !== currentIdx) {
        reorderList(currentIdx, targetIndex);
        touchCurrentIndexRef.current = targetIndex;
        setDraggedIndex(targetIndex);
      }
    }
  };

  const handleTouchEnd = () => {
    if (touchTimerRef.current) {
      clearTimeout(touchTimerRef.current);
      touchTimerRef.current = null;
    }

    if (isTouchDraggingRef.current) {
      isTouchDraggingRef.current = false;
      setIsDragging(false);
      setDraggedIndex(null);
      justDraggedRef.current = true;
      setTimeout(() => {
        justDraggedRef.current = false;
      }, 350);

      commitReorder(localWebsitesRef.current);
    }
  };

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Open Form Modal for Creating
  const handleOpenAddModal = () => {
    setEditingWebsiteId(null);
    setFormTitle('');
    setFormDescription('');
    setFormUrl('');
    setFormImageUrl('');
    setFormDriveFileId('');
    setImagePreview('');
    setIsUploadingDrive(false);
    setUploadProgress(null);
    setIsFormModalOpen(true);
  };

  // Open Form Modal for Editing existing
  const handleOpenEditModal = (website: RecommendedWebsite) => {
    setEditingWebsiteId(website.id);
    setFormTitle(website.title);
    setFormDescription(website.description);
    setFormUrl(website.url);
    setFormImageUrl(website.imageUrl || '');
    setFormDriveFileId(website.driveFileId || '');
    setImagePreview(website.imageUrl || '');
    setIsUploadingDrive(false);
    setUploadProgress(null);
    setIsFormModalOpen(true);
  };

  // Handle Image File Upload (Uploads to Google Drive + creates optimized local preview)
  const handleImageFileChange = (file: File) => {
    if (!file.type.startsWith('image/')) {
      Swal.fire({
        icon: 'warning',
        title: 'ไฟล์ไม่ถูกต้อง',
        text: 'กรุณาเลือกไฟล์รูปภาพ (JPG, PNG, WebP, SVG หรือ GIF)',
        confirmButtonColor: '#7C3AED',
      });
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      const rawDataUrl = e.target?.result as string;
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const MAX_SIZE = 256;
        let width = img.width;
        let height = img.height;
        if (width > height) {
          if (width > MAX_SIZE) {
            height = Math.round((height * MAX_SIZE) / width);
            width = MAX_SIZE;
          }
        } else {
          if (height > MAX_SIZE) {
            width = Math.round((width * MAX_SIZE) / height);
            height = MAX_SIZE;
          }
        }
        canvas.width = Math.max(width, 1);
        canvas.height = Math.max(height, 1);
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(img, 0, 0, width, height);
          const compressed = canvas.toDataURL('image/png');
          setImagePreview(compressed);
          if (!formImageUrl) setFormImageUrl(compressed);
        } else {
          setImagePreview(rawDataUrl);
          if (!formImageUrl) setFormImageUrl(rawDataUrl);
        }
      };
      img.onerror = () => {
        setImagePreview(rawDataUrl);
        if (!formImageUrl) setFormImageUrl(rawDataUrl);
      };
      img.src = rawDataUrl;
    };
    reader.readAsDataURL(file);

    // Save image to Google Drive as requested
    (async () => {
      try {
        setIsUploadingDrive(true);
        setUploadProgress(10);
        const school = storage.getSchoolProfile();
        const targetFolder = school?.primaryDriveFolderId || ROOT_DRIVE_FOLDER_ID;
        const uploaded = await storage.simulateFileUpload(file, (pct) => {
          setUploadProgress(pct);
        }, targetFolder);

        if (uploaded && uploaded.driveFileId) {
          setFormDriveFileId(uploaded.driveFileId);
          if (uploaded.viewUrl || uploaded.downloadUrl) {
            setFormImageUrl(uploaded.viewUrl || uploaded.downloadUrl);
          }
        }
      } catch (uploadErr) {
        console.warn('[RecommendedWebsitesView] Note on Google Drive image upload:', uploadErr);
      } finally {
        setIsUploadingDrive(false);
        setUploadProgress(null);
      }
    })();
  };

  // Save Website (Create or Update)
  const handleSaveWebsite = (e: React.FormEvent) => {
    e.preventDefault();

    const trimmedTitle = formTitle.trim();
    const trimmedDesc = formDescription.trim();
    let trimmedUrl = formUrl.trim();

    if (!trimmedTitle) {
      Swal.fire({
        icon: 'warning',
        title: 'กรุณากรอกชื่อเว็บไซต์',
        confirmButtonColor: '#7C3AED',
      });
      return;
    }

    if (!trimmedDesc) {
      Swal.fire({
        icon: 'warning',
        title: 'กรุณากรอกคำอธิบาย',
        confirmButtonColor: '#7C3AED',
      });
      return;
    }

    if (!trimmedUrl) {
      Swal.fire({
        icon: 'warning',
        title: 'กรุณากรอกลิงก์เว็บไซต์หรือ URL',
        confirmButtonColor: '#7C3AED',
      });
      return;
    }

    // Auto-fix protocol if omitted
    if (!/^https?:\/\//i.test(trimmedUrl)) {
      trimmedUrl = 'https://' + trimmedUrl;
    }

    try {
      new URL(trimmedUrl);
    } catch {
      Swal.fire({
        icon: 'warning',
        title: 'รูปแบบ URL ไม่ถูกต้อง',
        text: 'กรุณากรอก URL ที่ถูกต้อง เช่น https://www.example.com',
        confirmButtonColor: '#7C3AED',
      });
      return;
    }

    const finalImageUrl = imagePreview || formImageUrl.trim();

    if (editingWebsiteId) {
      // Update
      storage.updateWebsite(editingWebsiteId, {
        title: trimmedTitle,
        description: trimmedDesc,
        url: trimmedUrl,
        imageUrl: finalImageUrl,
        driveFileId: formDriveFileId,
      });

      Swal.fire({
        icon: 'success',
        title: 'บันทึกการแก้ไขเรียบร้อย',
        timer: 1500,
        showConfirmButton: false,
      });
    } else {
      // Create new
      storage.createWebsite({
        title: trimmedTitle,
        description: trimmedDesc,
        url: trimmedUrl,
        imageUrl: finalImageUrl,
        driveFileId: formDriveFileId,
      });

      Swal.fire({
        icon: 'success',
        title: 'เพิ่มเว็บไซต์แนะนำเรียบร้อย',
        timer: 1500,
        showConfirmButton: false,
      });
    }

    setIsFormModalOpen(false);
    onRefreshWebsites?.();
  };

  // Delete Website (Admin only)
  const handleDeleteWebsite = (website: RecommendedWebsite) => {
    Swal.fire({
      title: 'ยืนยันการลบเว็บไซต์แนะนำ?',
      html: `<div class="text-slate-600 text-sm mt-1">ต้องการลบ <b>${website.title}</b> ออกจากรายการแนะนำใช่หรือไม่?</div>`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#E11D48',
      cancelButtonColor: '#64748B',
      confirmButtonText: 'ใช่, ลบเลย',
      cancelButtonText: 'ยกเลิก',
    }).then((result) => {
      if (result.isConfirmed) {
        storage.deleteWebsite(website.id);
        Swal.fire({
          icon: 'success',
          title: 'ลบเว็บไซต์เรียบร้อย',
          timer: 1500,
          showConfirmButton: false,
        });
        onRefreshWebsites?.();
      }
    });
  };

  // Reorder: Move Left (1 step earlier)
  const handleMoveLeft = (index: number) => {
    if (index <= 0) return;
    const newList = [...localWebsitesRef.current];
    const temp = newList[index];
    newList[index] = newList[index - 1];
    newList[index - 1] = temp;
    setLocalWebsites(newList);
    localWebsitesRef.current = newList;
    commitReorder(newList);
  };

  // Reorder: Move Right (1 step later)
  const handleMoveRight = (index: number) => {
    if (index >= localWebsitesRef.current.length - 1) return;
    const newList = [...localWebsitesRef.current];
    const temp = newList[index];
    newList[index] = newList[index + 1];
    newList[index + 1] = temp;
    setLocalWebsites(newList);
    localWebsitesRef.current = newList;
    commitReorder(newList);
  };

  // Reorder: Move to First Row / Top (ตำแหน่งแรกสุด)
  const handleMoveToTop = (index: number) => {
    if (index <= 0) return;
    const newList = [...localWebsitesRef.current];
    const [targetItem] = newList.splice(index, 1);
    newList.unshift(targetItem);
    setLocalWebsites(newList);
    localWebsitesRef.current = newList;
    commitReorder(newList);
  };

  // Handle Open URL safely
  const handleOpenUrl = (url: string) => {
    if (!url) return;
    let safeUrl = url.trim();
    if (!/^https?:\/\//i.test(safeUrl)) {
      safeUrl = 'https://' + safeUrl;
    }
    window.open(safeUrl, '_blank', 'noopener,noreferrer');
  };

  return (
    <div className="space-y-6 pb-16">
      {/* Top Banner & Control Bar */}
      <div className="bg-white/90 backdrop-blur-md rounded-3xl border border-purple-200/80 p-5 sm:p-6 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          {/* Header Title & Subtitle */}
          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-purple-600 to-indigo-600 text-white flex items-center justify-center shadow-md shadow-purple-500/20 shrink-0">
              <Globe className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="text-xl sm:text-2xl font-bold text-slate-800 tracking-tight">
                  website แนะนำ
                </h1>
                <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-purple-100 text-purple-800 border border-purple-200">
                  {websites.length} เว็บไซต์
                </span>
                {isEditMode && (
                  <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-100 text-amber-900 border border-amber-300 animate-pulse">
                    โหมดจัดเรียงและแก้ไข
                  </span>
                )}
              </div>
              <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
                ศูนย์รวมเว็บไซต์และบริการทางการศึกษาที่สำคัญสำหรับครูและบุคลากร
              </p>
            </div>
          </div>

          {/* Admin Controls: "+" button and "แก้ไข" button */}
          {isAdmin && (
            <div className="flex items-center gap-2 self-start sm:self-center">
              {/* "แก้ไข" Toggle Button */}
              <button
                type="button"
                id="toggle-edit-mode-btn"
                onClick={() => setIsEditMode(!isEditMode)}
                className={`inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs sm:text-sm font-semibold transition-all shadow-xs cursor-pointer ${
                  isEditMode
                    ? 'bg-emerald-600 text-white hover:bg-emerald-700 shadow-emerald-500/20'
                    : 'bg-white text-slate-700 border border-slate-200 hover:bg-slate-50 hover:border-purple-300'
                }`}
                title={isEditMode ? 'เสร็จสิ้นการแก้ไข' : 'แก้ไขและจัดเรียงลำดับเว็บไซต์'}
              >
                {isEditMode ? (
                  <>
                    <Check className="w-4 h-4 text-white" />
                    <span>เสร็จสิ้น</span>
                  </>
                ) : (
                  <>
                    <Edit3 className="w-4 h-4 text-purple-600" />
                    <span>แก้ไข</span>
                  </>
                )}
              </button>

              {/* "+" Add Website Button */}
              <button
                type="button"
                id="add-recommended-website-btn"
                onClick={handleOpenAddModal}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold bg-purple-600 hover:bg-purple-700 text-white shadow-sm shadow-purple-500/20 transition-all cursor-pointer"
                title="เพิ่มเว็บไซต์แนะนำใหม่"
              >
                <Plus className="w-4 h-4" />
                <span>เพิ่มเว็บไซต์</span>
              </button>
            </div>
          )}
        </div>

        {/* Informative Hint for Edit Mode (เฉพาะเมื่อ Admin กดปุ่มจัดการเพื่อแก้ไข) */}
        {isAdmin && isEditMode && (
          <div className="mt-4 p-3 bg-purple-50 border border-purple-200 rounded-2xl flex items-center gap-2.5 text-xs text-purple-900 shadow-2xs">
            <Sparkles className="w-4 h-4 text-purple-600 shrink-0" />
            <span>
              <b>คำแนะนำการจัดการ (Admin):</b> ท่านสามารถกดตรงโลโก้เว็บค้างไว้แล้วลากเลื่อน (ขึ้น-ลง-ซ้าย-ขวา) สลับจัดเรียงตำแหน่งได้อย่างอิสระ หรือใช้ปุ่ม <b>⬆ แถวแรก</b> / <b>◀ / ▶</b> และกด <b>🗑️</b> เพื่อลบ
            </span>
          </div>
        )}
      </div>

      {/* Grid of Recommended Websites (5-6 logos per row on desktop as requested) */}
      {localWebsites.length === 0 ? (
        <div className="bg-white/80 rounded-3xl border border-purple-200/80 p-12 text-center">
          <Globe className="w-12 h-12 text-purple-300 mx-auto mb-3" />
          <h3 className="text-base font-semibold text-slate-700">ยังไม่มีเว็บไซต์แนะนำ</h3>
          <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
            {isAdmin 
              ? 'กดปุ่มเครื่องหมาย "+" ด้านบนเพื่อเพิ่มเว็บไซต์และลิงก์บริการการศึกษา'
              : 'ขณะนี้ยังไม่มีเว็บไซต์แนะนำที่เผยแพร่ในระบบ'}
          </p>
          {isAdmin && (
            <button
              onClick={handleOpenAddModal}
              className="mt-4 inline-flex items-center gap-1.5 px-4 py-2 bg-purple-600 text-white rounded-xl text-xs font-semibold hover:bg-purple-700 cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>เพิ่มเว็บไซต์แรก</span>
            </button>
          )}
        </div>
      ) : (
        <div 
          id="recommended-websites-grid"
          className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 lg:grid-cols-6 gap-4 sm:gap-6"
        >
          {localWebsites.map((website, index) => (
            <div
              key={website.id}
              data-website-index={index}
              data-website-id={website.id}
              onDragOver={(e) => handleDragOver(e, index)}
              onDragEnter={() => handleDragEnter(index)}
              className={`group relative flex flex-col items-center p-3 rounded-2xl transition-all duration-200 bg-white/90 border ${
                draggedIndex === index
                  ? 'border-purple-500 ring-4 ring-purple-400/80 shadow-2xl scale-105 z-30 bg-purple-50/95 rotate-1'
                  : isDragging
                  ? 'border-purple-200/80 shadow-2xs'
                  : isEditMode
                  ? 'border-purple-300 ring-2 ring-purple-100 shadow-sm'
                  : 'border-purple-100 hover:border-purple-300 hover:shadow-md'
              }`}
            >
              {/* Dragging Active Badge */}
              {draggedIndex === index && (
                <div className="absolute -top-3 inset-x-0 mx-auto w-fit z-40 px-2.5 py-0.5 rounded-full bg-purple-600 text-white text-[10px] font-bold shadow-md flex items-center gap-1 animate-pulse pointer-events-none">
                  <Move className="w-2.5 h-2.5" />
                  <span>กำลังเลื่อน #{index + 1}</span>
                </div>
              )}

              {/* Row 1 / Rank Badge in Edit Mode */}
              {isEditMode && (
                <div className="absolute top-2 left-2 z-10">
                  <span className={`px-1.5 py-0.5 text-[10px] font-bold rounded-md ${
                    index < 6 ? 'bg-purple-600 text-white' : 'bg-slate-200 text-slate-700'
                  }`}>
                    #{index + 1}
                  </span>
                </div>
              )}

              {/* Information "!" Button: Pops up description */}
              <button
                type="button"
                id={`website-info-btn-${website.id}`}
                onClick={(e) => {
                  e.stopPropagation();
                  setInfoModalWebsite(website);
                }}
                className="absolute top-2 right-2 z-10 w-6 h-6 rounded-full bg-white/95 text-purple-600 hover:text-purple-800 hover:bg-purple-50 border border-purple-200 shadow-xs flex items-center justify-center cursor-pointer transition-all hover:scale-110"
                title="ดูคำอธิบายเว็บไซต์"
                aria-label={`ดูคำอธิบายของ ${website.title}`}
              >
                <Info className="w-3.5 h-3.5 font-bold" />
              </button>

              {/* Square Logo Container (ขนาดเล็ก 4 เหลี่ยม: w-20 h-20 sm:w-22 sm:h-22) */}
              <div
                draggable={isAdmin}
                onDragStart={(e) => handleDragStart(e, index)}
                onDragOver={(e) => handleDragOver(e, index)}
                onDragEnter={() => handleDragEnter(index)}
                onDragEnd={handleDragEnd}
                onTouchStart={(e) => handleTouchStart(e, index)}
                onTouchMove={handleTouchMove}
                onTouchEnd={handleTouchEnd}
                onTouchCancel={handleTouchEnd}
                onClick={(e) => {
                  if (justDraggedRef.current || isDragging) {
                    e.stopPropagation();
                    e.preventDefault();
                    return;
                  }
                  if (!isEditMode) {
                    handleOpenUrl(website.url);
                  }
                }}
                className={`relative w-20 h-20 sm:w-22 sm:h-22 rounded-2xl p-2 bg-slate-50 border border-slate-200/90 shadow-2xs flex items-center justify-center overflow-hidden select-none transition-all duration-200 ${
                  isAdmin
                    ? 'cursor-grab active:cursor-grabbing hover:border-purple-400 hover:shadow-md hover:scale-105 bg-gradient-to-br from-white to-purple-50/40'
                    : isEditMode
                    ? 'cursor-default'
                    : 'cursor-pointer group-hover:scale-105 group-hover:shadow-md group-hover:border-purple-300 bg-gradient-to-br from-white to-purple-50/40'
                }`}
                title={
                  isAdmin
                    ? `Admin: กดค้างแล้วลากเพื่อจัดเรียงตำแหน่ง (ขึ้น-ลง-ซ้าย-ขวา) หรือคลิกเพื่อเปิด: ${website.title}`
                    : isEditMode
                    ? website.title
                    : `คลิกเพื่อเปิด: ${website.title}`
                }
              >
                {/* Admin Move Indicator on Logo (แสดงเฉพาะเมื่ออยู่ในโหมดจัดการ หรือนำเมาส์ชี้ หรือกำลังลาก) */}
                {isAdmin && (
                  <div 
                    className={`absolute top-1 left-1 z-10 p-1 rounded-md transition-all pointer-events-none ${
                      draggedIndex === index
                        ? 'bg-purple-600 text-white opacity-100 shadow-sm'
                        : isEditMode
                        ? 'bg-purple-600/90 text-white opacity-80 shadow-2xs'
                        : 'bg-purple-700/80 text-white opacity-0 group-hover:opacity-90 shadow-2xs'
                    }`}
                    title="กดค้างที่โลโก้แล้วลากเพื่อย้ายตำแหน่ง"
                  >
                    <Move className="w-2.5 h-2.5" />
                  </div>
                )}

                {website.imageUrl && !failedImages[`${website.id}_${website.imageUrl}`] ? (
                  <img
                    src={website.imageUrl}
                    alt={website.title}
                    referrerPolicy="no-referrer"
                    className="w-full h-full object-contain rounded-xl"
                    onError={() => {
                      const key = `${website.id}_${website.imageUrl}`;
                      setFailedImages((prev) => (prev[key] ? prev : { ...prev, [key]: true }));
                    }}
                  />
                ) : (
                  <div className="w-full h-full flex flex-col items-center justify-center text-purple-700 bg-gradient-to-br from-purple-100 via-indigo-50 to-purple-50 rounded-xl border border-purple-200/50 shadow-inner">
                    <Globe className="w-7 h-7 text-purple-600 mb-0.5" />
                    <span className="text-[10px] font-black text-purple-800 tracking-tight px-1 truncate max-w-full">
                      {website.title.replace(/^ระบบ\s*/, '').slice(0, 5)}
                    </span>
                  </div>
                )}

                {/* Hover subtle link indicator on normal mode */}
                {!isEditMode && !isAdmin && (
                  <div className="absolute inset-0 bg-purple-900/10 opacity-0 group-hover:opacity-100 transition-opacity flex items-end justify-end p-1">
                    <ExternalLink className="w-3 h-3 text-purple-700 bg-white/90 rounded p-0.5 shadow-2xs" />
                  </div>
                )}
              </div>

              {/* Title Underneath the Logo (ข้างใต้โลโก้เป็นชื่อ) */}
              <div
                onClick={(e) => {
                  if (justDraggedRef.current || isDragging) {
                    e.stopPropagation();
                    e.preventDefault();
                    return;
                  }
                  if (!isEditMode) {
                    handleOpenUrl(website.url);
                  }
                }}
                className={`mt-2.5 text-center w-full ${
                  isEditMode ? 'cursor-default' : 'cursor-pointer'
                }`}
              >
                <div 
                  className="text-xs font-semibold text-slate-800 line-clamp-2 max-w-[120px] mx-auto leading-tight group-hover:text-purple-700 transition-colors"
                  title={website.title}
                >
                  {website.title}
                </div>
              </div>

              {/* Admin Edit Controls Bar (Shown in Edit Mode) */}
              {isAdmin && isEditMode && (
                <div className="mt-3 pt-2.5 border-t border-purple-100 w-full flex flex-col gap-1.5">
                  {/* Quick: Move to First Row / Top */}
                  {index > 0 && (
                    <button
                      type="button"
                      onClick={() => handleMoveToTop(index)}
                      className="w-full flex items-center justify-center gap-1 py-1 px-1.5 rounded-lg text-[10px] font-bold bg-purple-50 hover:bg-purple-100 text-purple-700 border border-purple-200 transition-colors cursor-pointer"
                      title="เลื่อนขึ้นเป็นแถวแรก (ลำดับที่ 1)"
                    >
                      <ArrowUpToLine className="w-3 h-3" />
                      <span>แถวแรก</span>
                    </button>
                  )}

                  {/* Left / Right arrow navigation */}
                  <div className="flex items-center justify-between gap-1 w-full">
                    <button
                      type="button"
                      disabled={index === 0}
                      onClick={() => handleMoveLeft(index)}
                      className="p-1 rounded-lg border border-slate-200 text-slate-600 hover:bg-purple-50 hover:text-purple-700 disabled:opacity-30 disabled:cursor-not-allowed transition-colors cursor-pointer"
                      title="เลื่อนไปทางซ้าย"
                    >
                      <ArrowLeft className="w-3.5 h-3.5" />
                    </button>

                    <button
                      type="button"
                      onClick={() => handleOpenEditModal(website)}
                      className="p-1 rounded-lg border border-slate-200 text-slate-600 hover:bg-amber-50 hover:text-amber-700 transition-colors cursor-pointer"
                      title="แก้ไขข้อมูล"
                    >
                      <Edit3 className="w-3.5 h-3.5" />
                    </button>

                    <button
                      type="button"
                      onClick={() => handleDeleteWebsite(website)}
                      className="p-1 rounded-lg border border-rose-200 text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
                      title="ลบเว็บไซต์นี้"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>

                    <button
                      type="button"
                      disabled={index === localWebsites.length - 1}
                      onClick={() => handleMoveRight(index)}
                      className="p-1 rounded-lg border border-slate-200 text-slate-600 hover:bg-purple-50 hover:text-purple-700 disabled:opacity-30 disabled:cursor-not-allowed transition-colors cursor-pointer"
                      title="เลื่อนไปทางขวา"
                    >
                      <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* POP-UP MODAL 1: ADD / EDIT WEBSITE (Admin Only) */}
      {isFormModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl border border-purple-200 shadow-2xl max-w-lg w-full overflow-hidden my-8 animate-in fade-in zoom-in-95 duration-200">
            {/* Modal Header */}
            <div className="px-6 py-4.5 bg-gradient-to-r from-purple-700 to-indigo-700 text-white flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-white/20 flex items-center justify-center text-white">
                  {editingWebsiteId ? <Edit3 className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
                </div>
                <h3 className="text-base sm:text-lg font-bold">
                  {editingWebsiteId ? 'แก้ไขเว็บไซต์แนะนำ' : 'เพิ่มเว็บไซต์แนะนำใหม่'}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setIsFormModalOpen(false)}
                className="text-white/80 hover:text-white p-1 rounded-lg hover:bg-white/10 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Form Content */}
            <form onSubmit={handleSaveWebsite} className="p-6 space-y-4">
              {/* 1. ชื่อ (Title) */}
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  1. ชื่อเว็บไซต์ <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={formTitle}
                  onChange={(e) => setFormTitle(e.target.value)}
                  placeholder="เช่น ระบบ DMC สพฐ., SchoolMIS, DLIT"
                  className="w-full px-3.5 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-purple-500 focus:bg-white transition-all"
                />
              </div>

              {/* 2. คำอธิบาย (Description) */}
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  2. คำอธิบาย <span className="text-rose-500">*</span>
                </label>
                <textarea
                  required
                  rows={3}
                  value={formDescription}
                  onChange={(e) => setFormDescription(e.target.value)}
                  placeholder="ระบุรายละเอียดหรือประโยชน์ของเว็บไซต์ เช่น ระบบจัดเก็บข้อมูลนักเรียนรายบุคคลสำหรับรายงาน สพป."
                  className="w-full px-3.5 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-purple-500 focus:bg-white transition-all resize-none"
                />
              </div>

              {/* 3. ใส่ลิงก์เว็ปไซต์หรือ URL */}
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  3. ใส่ลิงก์เว็บไซต์หรือ URL <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <input
                    type="text"
                    required
                    value={formUrl}
                    onChange={(e) => setFormUrl(e.target.value)}
                    placeholder="เช่น https://portal.bopp-obec.info/obec67/"
                    className="w-full pl-3.5 pr-20 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-purple-500 focus:bg-white transition-all font-mono text-xs"
                  />
                  {formUrl.trim() && (
                    <button
                      type="button"
                      onClick={() => handleOpenUrl(formUrl)}
                      className="absolute right-2 top-1/2 -translate-y-1/2 px-2 py-1 bg-purple-100 hover:bg-purple-200 text-purple-700 text-[11px] font-semibold rounded-md flex items-center gap-1 cursor-pointer"
                    >
                      <ExternalLink className="w-3 h-3" />
                      <span>ทดสอบ</span>
                    </button>
                  )}
                </div>
              </div>

              {/* 4. สำหรับอัปโหลดรูปภาพ (Upload Image / Logo) */}
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  4. สำหรับอัปโหลดรูปภาพโลโก้ (กำหนดเอง หรือเว้นว่างได้)
                </label>

                {/* Upload Area */}
                <div
                  onDragOver={(e) => {
                    e.preventDefault();
                    setIsDraggingImage(true);
                  }}
                  onDragLeave={() => setIsDraggingImage(false)}
                  onDrop={(e) => {
                    e.preventDefault();
                    setIsDraggingImage(false);
                    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
                      handleImageFileChange(e.dataTransfer.files[0]);
                    }
                  }}
                  className={`border-2 border-dashed rounded-2xl p-4 text-center transition-all ${
                    isDraggingImage
                      ? 'border-purple-500 bg-purple-50'
                      : 'border-slate-200 hover:border-purple-300 bg-slate-50/50'
                  }`}
                >
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => {
                      if (e.target.files && e.target.files[0]) {
                        handleImageFileChange(e.target.files[0]);
                      }
                    }}
                  />

                  <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                    {/* Square Preview */}
                    <div className="w-20 h-20 rounded-2xl border-2 border-purple-200 bg-white shadow-2xs flex items-center justify-center overflow-hidden shrink-0 relative group">
                      {imagePreview ? (
                        <>
                          <img
                            src={imagePreview}
                            alt="Logo preview"
                            className="w-full h-full object-contain p-1.5"
                          />
                          <button
                            type="button"
                            onClick={() => {
                              setImagePreview('');
                              setFormImageUrl('');
                              if (fileInputRef.current) fileInputRef.current.value = '';
                            }}
                            className="absolute inset-0 bg-slate-900/60 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer text-xs"
                            title="ลบรูปภาพ"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </>
                      ) : (
                        <ImageIcon className="w-8 h-8 text-slate-300" />
                      )}
                    </div>

                    {/* Actions */}
                    <div className="text-center sm:text-left">
                      <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        disabled={isUploadingDrive}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-purple-50 hover:bg-purple-100 text-purple-700 border border-purple-200 rounded-xl text-xs font-semibold cursor-pointer transition-colors disabled:opacity-60"
                      >
                        {isUploadingDrive ? (
                          <>
                            <Loader2 className="w-3.5 h-3.5 animate-spin text-purple-600" />
                            <span>กำลังบันทึกลง Google Drive...</span>
                          </>
                        ) : (
                          <>
                            <Upload className="w-3.5 h-3.5" />
                            <span>เลือกรูปภาพจากเครื่อง</span>
                          </>
                        )}
                      </button>
                      <p className="text-[11px] text-slate-400 mt-1">
                        ระบบจะทำการบันทึกรูปภาพลง Google Drive และสร้างภาพตัวอย่างโดยอัตโนมัติ
                      </p>
                      {formDriveFileId && !isUploadingDrive && (
                        <span className="inline-flex items-center gap-1 mt-1 text-[11px] font-medium text-emerald-600">
                          <HardDrive className="w-3 h-3" /> บันทึกลง Google Drive สำเร็จ
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* Action Buttons: บันทึก / ยกเลิก */}
              <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setIsFormModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100 border border-slate-200 transition-colors cursor-pointer"
                >
                  ยกเลิก
                </button>
                <button
                  type="submit"
                  id="save-recommended-website-btn"
                  className="px-5 py-2 rounded-xl text-xs font-semibold bg-purple-600 hover:bg-purple-700 text-white shadow-sm shadow-purple-500/20 transition-all cursor-pointer flex items-center gap-1.5"
                >
                  <Check className="w-4 h-4" />
                  <span>บันทึก</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* POP-UP MODAL 2: "!" DESCRIPTION MODAL (Available to all users & members) */}
      {infoModalWebsite && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl border border-purple-200 shadow-2xl max-w-md w-full overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            {/* Header */}
            <div className="px-6 py-4 bg-gradient-to-r from-purple-700 to-indigo-700 text-white flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Info className="w-5 h-5 text-purple-200" />
                <h3 className="text-base font-bold">ข้อมูลและคำอธิบายเว็บไซต์</h3>
              </div>
              <button
                type="button"
                onClick={() => setInfoModalWebsite(null)}
                className="text-white/80 hover:text-white p-1 rounded-lg hover:bg-white/10 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Content */}
            <div className="p-6 space-y-4">
              {/* Logo & Title Header */}
              <div className="flex items-center gap-4 p-3 bg-purple-50/60 border border-purple-100 rounded-2xl">
                <div className="w-16 h-16 rounded-2xl p-1.5 bg-white border border-purple-200/80 shadow-2xs flex items-center justify-center overflow-hidden shrink-0">
                  {infoModalWebsite.imageUrl ? (
                    <img
                      src={infoModalWebsite.imageUrl}
                      alt={infoModalWebsite.title}
                      className="w-full h-full object-contain rounded-xl"
                    />
                  ) : (
                    <Globe className="w-8 h-8 text-purple-600" />
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <h4 className="text-base font-bold text-slate-800 tracking-tight leading-tight">
                    {infoModalWebsite.title}
                  </h4>
                  <div className="text-xs text-purple-700 font-mono mt-1 truncate">
                    {infoModalWebsite.url}
                  </div>
                </div>
              </div>

              {/* Full Description (คำอธิบาย) */}
              <div>
                <div className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">
                  คำอธิบายรายละเอียด:
                </div>
                <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-2xl text-xs sm:text-sm text-slate-700 leading-relaxed whitespace-pre-line">
                  {infoModalWebsite.description}
                </div>
              </div>

              {/* Action Buttons */}
              <div className="pt-2 flex items-center justify-between gap-3">
                <button
                  type="button"
                  onClick={() => setInfoModalWebsite(null)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100 border border-slate-200 transition-colors cursor-pointer"
                >
                  ปิดหน้าต่าง
                </button>

                <button
                  type="button"
                  onClick={() => {
                    handleOpenUrl(infoModalWebsite.url);
                    setInfoModalWebsite(null);
                  }}
                  className="px-4 py-2 rounded-xl text-xs font-semibold bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white shadow-md shadow-purple-500/20 transition-all flex items-center gap-1.5 cursor-pointer"
                >
                  <span>เข้าสู่เว็บไซต์</span>
                  <ExternalLink className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
