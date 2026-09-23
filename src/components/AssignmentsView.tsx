import React, { useState, useEffect } from 'react';
import { 
  Plus, 
  Eye, 
  Users, 
  Trash2, 
  Edit3, 
  UploadCloud, 
  FileText, 
  CheckCircle2, 
  Clock, 
  AlertCircle, 
  Calendar, 
  FolderPlus, 
  FileSpreadsheet, 
  X, 
  Sparkles, 
  Info,
  ChevronRight,
  ChevronDown,
  ChevronUp,
  ShieldCheck,
  Check,
  Bell,
  Megaphone,
  Save,
  Pencil,
  Download,
  Paperclip,
  Folder
} from 'lucide-react';
import { 
  Assignment, 
  Submission, 
  User, 
  UploadedFile,
  Announcement
} from '../types';
import { storage, triggerDirectDownload } from '../services/storageService';
import { ensureGoogleDriveConnected, ROOT_DRIVE_FOLDER_ID } from '../services/googleDriveService';
import Swal from 'sweetalert2';
import { DateRangePicker } from './DateRangePicker';
import { formatThaiDate, formatThaiDateRange, getTodayDateString } from '../lib/dateUtils';
import { saveFileToIndexedDb } from '../utils/indexedFileStore';
import { parseDocxBinary } from '../utils/docxParser';
import * as XLSX from 'xlsx';

interface AssignmentsViewProps {
  currentUser: User | null;
  assignments: Assignment[];
  submissions: Submission[];
  users: User[];
  announcements?: Announcement[];
  onOpenFilePreview: (file: UploadedFile, assignmentTitle?: string, submitterName?: string) => void;
}

export const AssignmentsView: React.FC<AssignmentsViewProps> = ({
  currentUser,
  assignments,
  submissions,
  users,
  announcements = [],
  onOpenFilePreview,
}) => {
  const isAdmin = currentUser?.role === 'admin';
  const approvedMembers = users.filter((u) => u.status === 'approved' && u.role === 'member');
  const totalApprovedMembersCount = approvedMembers.length > 0 ? approvedMembers.length : 3;

  // View Sub-tab (Assignments vs Announcements)
  const [activeSubTab, setActiveSubTab] = useState<'assignments' | 'announcements'>('assignments');

  // Form Modals State
  const [isAdminPlusModalOpen, setIsAdminPlusModalOpen] = useState(false);
  const [adminFormType, setAdminFormType] = useState<'assignment' | 'announcement'>('assignment');
  
  // Member submit modal
  const [isMemberSubmitModalOpen, setIsMemberSubmitModalOpen] = useState(false);
  const [selectedAssignmentForSubmit, setSelectedAssignmentForSubmit] = useState<string>('');
  const [submissionTopicTitle, setSubmissionTopicTitle] = useState<string>('');
  const [submissionNote, setSubmissionNote] = useState<string>('');
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [uploadProgress, setUploadProgress] = useState<number | null>(null);

  // Admin Edit Assignment Modal State
  const [isEditAssignmentModalOpen, setIsEditAssignmentModalOpen] = useState(false);
  const [editingAssignment, setEditingAssignment] = useState<Assignment | null>(null);
  const [editAssignTitle, setEditAssignTitle] = useState('');
  const [editAssignDescription, setEditAssignDescription] = useState('');
  const [editAssignDueDateStart, setEditAssignDueDateStart] = useState('');
  const [editAssignDueDateEnd, setEditAssignDueDateEnd] = useState('');

  // Admin Edit Announcement Modal State
  const [isEditAnnouncementModalOpen, setIsEditAnnouncementModalOpen] = useState(false);
  const [editingAnnouncement, setEditingAnnouncement] = useState<Announcement | null>(null);
  const [editAnnTitle, setEditAnnTitle] = useState('');
  const [editAnnContent, setEditAnnContent] = useState('');
  const [editAnnDateStart, setEditAnnDateStart] = useState('');
  const [editAnnDateEnd, setEditAnnDateEnd] = useState('');
  const [editAnnIsUrgent, setEditAnnIsUrgent] = useState(false);

  // Member Edit Submission Modal State
  const [isEditSubmissionModalOpen, setIsEditSubmissionModalOpen] = useState(false);
  const [editingSubmission, setEditingSubmission] = useState<Submission | null>(null);
  const [editSubTopicTitle, setEditSubTopicTitle] = useState('');
  const [editSubNote, setEditSubNote] = useState('');
  const [editSubNewFiles, setEditSubNewFiles] = useState<File[]>([]);
  const [editUploadProgress, setEditUploadProgress] = useState<number | null>(null);

  // View Status / Peer modal
  const [memberStatusModalAssignment, setMemberStatusModalAssignment] = useState<Assignment | null>(null);
  const [peerSubmissionsModalAssignment, setPeerSubmissionsModalAssignment] = useState<Assignment | null>(null);

  // Admin New Assignment Fields (Strictly defaults to current date only)
  const todayDateNow = getTodayDateString();
  const [newTitle, setNewTitle] = useState('');
  const [newDescription, setNewDescription] = useState('');
  const [newDueDateStart, setNewDueDateStart] = useState(todayDateNow);
  const [newDueDateEnd, setNewDueDateEnd] = useState(todayDateNow);

  // Admin New Announcement Fields (Strictly defaults to current date only)
  const [annTitle, setAnnTitle] = useState('');
  const [annContent, setAnnContent] = useState('');
  const [annDateStart, setAnnDateStart] = useState(todayDateNow);
  const [annDateEnd, setAnnDateEnd] = useState(todayDateNow);
  const [annIsUrgent, setAnnIsUrgent] = useState(false);

  // Helper to open Admin Plus Modal with current date strictly guaranteed
  const handleOpenPlusModal = (type?: 'assignment' | 'announcement') => {
    const today = getTodayDateString();
    const chosenType = type || (activeSubTab === 'announcements' ? 'announcement' : 'assignment');
    setAdminFormType(chosenType);
    setNewTitle('');
    setNewDescription('');
    setNewDueDateStart(today);
    setNewDueDateEnd(today);
    setAnnTitle('');
    setAnnContent('');
    setAnnDateStart(today);
    setAnnDateEnd(today);
    setAnnIsUrgent(false);
    setIsAdminPlusModalOpen(true);
  };

  // Member Submissions map
  const mySubmissionsMap = new Map<string, Submission>();
  submissions.forEach((s) => {
    if (s.memberId === currentUser?.id) {
      mySubmissionsMap.set(s.assignmentId, s);
    }
  });

  // 1. Handle Admin Assignment Creation
  const handleCreateAssignment = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim()) {
      Swal.fire('ข้อผิดพลาด', 'กรุณาระบุชื่อหัวข้องาน', 'warning');
      return;
    }

    storage.createAssignment({
      title: newTitle,
      description: newDescription,
      dueDateStart: newDueDateStart,
      dueDateEnd: newDueDateEnd,
      type: 'assignment',
    });

    setIsAdminPlusModalOpen(false);
    setNewTitle('');
    setNewDescription('');

    Swal.fire({
      icon: 'success',
      title: 'สำเร็จ',
      text: 'มอบหมายงานและสร้างโฟลเดอร์ Google Drive เรียบร้อยแล้ว',
      confirmButtonColor: '#7C3AED',
      timer: 2000,
    });
  };

  // 2. Handle Admin Assignment Editing
  const handleOpenEditAssignment = (assignment: Assignment) => {
    const today = getTodayDateString();
    setEditingAssignment(assignment);
    setEditAssignTitle(assignment.title);
    setEditAssignDescription(assignment.description || '');
    setEditAssignDueDateStart(assignment.dueDateStart || today);
    setEditAssignDueDateEnd(assignment.dueDateEnd || today);
    setIsEditAssignmentModalOpen(true);
  };

  const handleSaveEditAssignment = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingAssignment) return;
    if (!editAssignTitle.trim()) {
      Swal.fire('ข้อผิดพลาด', 'กรุณาระบุชื่อหัวข้องาน', 'warning');
      return;
    }

    storage.updateAssignment(editingAssignment.id, {
      title: editAssignTitle.trim(),
      description: editAssignDescription.trim(),
      dueDateStart: editAssignDueDateStart,
      dueDateEnd: editAssignDueDateEnd,
    });

    setIsEditAssignmentModalOpen(false);
    setEditingAssignment(null);

    Swal.fire({
      icon: 'success',
      title: 'แก้ไขสำเร็จ',
      text: 'บันทึกการแก้ไขงานที่มอบหมายเรียบร้อยแล้ว',
      confirmButtonColor: '#7C3AED',
      timer: 2000,
    });
  };

  // 3. Handle Admin Assignment Deletion
  const handleDeleteAssignment = (assignment: Assignment) => {
    Swal.fire({
      title: 'ยืนยันการลบงานที่มอบหมาย?',
      html: `<div class="text-xs text-slate-600 text-left space-y-1">
        <p><strong>หัวข้องาน:</strong> ${assignment.title}</p>
        <p class="text-rose-600 font-semibold mt-2">⚠️ ข้อมูลการส่งงานและไฟล์เอกสารทั้งหมดของสมาชิกในงานนี้จะถูกลบด้วย</p>
      </div>`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#E11D48',
      cancelButtonColor: '#94A3B8',
      confirmButtonText: 'ใช่, ลบงานนี้',
      cancelButtonText: 'ยกเลิก',
    }).then((result) => {
      if (result.isConfirmed) {
        storage.deleteAssignment(assignment.id);
        Swal.fire({
          icon: 'success',
          title: 'ลบสำเร็จ',
          text: 'ลบงานที่มอบหมายและไฟล์ที่เกี่ยวข้องเรียบร้อยแล้ว',
          timer: 1800,
          showConfirmButton: false,
        });
      }
    });
  };

  // Toggle Admin Mark Assignment as Completed (for paper submissions or all submitted)
  const handleToggleMarkAllCompleted = (assignment: Assignment) => {
    const isCurrentlyCompleted = !!assignment.isMarkedCompleted;
    if (!isCurrentlyCompleted) {
      Swal.fire({
        title: 'ยืนยันทำเครื่องหมายส่งครบทุกคนแล้ว?',
        text: `คุณต้องการระบุว่างาน "${assignment.title}" ส่งครบทุกคนแล้ว (หรือส่งด้วยกระดาษ) ใช่หรือไม่?`,
        icon: 'question',
        showCancelButton: true,
        confirmButtonColor: '#10B981',
        cancelButtonColor: '#94A3B8',
        confirmButtonText: 'ตกลง',
        cancelButtonText: 'ยกเลิก',
      }).then((result) => {
        if (result.isConfirmed) {
          storage.updateAssignment(assignment.id, { isMarkedCompleted: true });
          Swal.fire({
            icon: 'success',
            title: 'บันทึกสำเร็จ',
            text: 'ทำเครื่องหมายว่าส่งครบทุกคนเรียบร้อยแล้ว',
            timer: 1500,
            showConfirmButton: false,
          });
        }
      });
    } else {
      Swal.fire({
        title: 'ยกเลิกสถานะส่งครบทุกคนแล้ว?',
        text: `คุณต้องการเปลี่ยนสถานะงาน "${assignment.title}" กลับเป็นยังไม่ครบ ใช่หรือไม่?`,
        icon: 'question',
        showCancelButton: true,
        confirmButtonColor: '#E11D48',
        cancelButtonColor: '#94A3B8',
        confirmButtonText: 'ตกลง',
        cancelButtonText: 'ยกเลิก',
      }).then((result) => {
        if (result.isConfirmed) {
          storage.updateAssignment(assignment.id, { isMarkedCompleted: false });
          Swal.fire({
            icon: 'success',
            title: 'ยกเลิกสำเร็จ',
            text: 'เปลี่ยนสถานะกลับเป็นยังไม่ครบเรียบร้อยแล้ว',
            timer: 1500,
            showConfirmButton: false,
          });
        }
      });
    }
  };

  // 4. Handle Admin Announcement Creation
  const handleCreateAnnouncement = (e: React.FormEvent) => {
    e.preventDefault();
    if (!annTitle.trim()) {
      Swal.fire('ข้อผิดพลาด', 'กรุณาระบุชื่อประกาศ', 'warning');
      return;
    }

    storage.createAnnouncement({
      title: annTitle,
      content: annContent,
      type: annIsUrgent ? 'urgent' : 'general',
      date: annDateStart,
      dateStart: annDateStart,
      dateEnd: annDateEnd,
      isUrgent: annIsUrgent,
      authorName: currentUser?.fullName || 'ฝ่ายวิชาการ',
    });

    setIsAdminPlusModalOpen(false);
    setAnnTitle('');
    setAnnContent('');
    setAnnIsUrgent(false);

    Swal.fire({
      icon: 'success',
      title: 'สำเร็จ',
      text: 'เผยแพร่ประกาศแจ้งเพื่อทราบขึ้นสู่หน้า Dashboard เรียบร้อยแล้ว',
      confirmButtonColor: '#7C3AED',
      timer: 2000,
    });
  };

  // 5. Handle Admin Announcement Editing (Fix typos, update activity dates)
  const handleOpenEditAnnouncement = (ann: Announcement) => {
    const today = getTodayDateString();
    setEditingAnnouncement(ann);
    setEditAnnTitle(ann.title);
    setEditAnnContent(ann.content || '');
    setEditAnnDateStart(ann.dateStart || ann.date || today);
    setEditAnnDateEnd(ann.dateEnd || ann.date || today);
    setEditAnnIsUrgent(!!ann.isUrgent);
    setIsEditAnnouncementModalOpen(true);
  };

  const handleSaveEditAnnouncement = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingAnnouncement) return;
    if (!editAnnTitle.trim()) {
      Swal.fire('ข้อผิดพลาด', 'กรุณาระบุหัวข้อประกาศ', 'warning');
      return;
    }

    storage.updateAnnouncement(editingAnnouncement.id, {
      title: editAnnTitle.trim(),
      content: editAnnContent.trim(),
      date: editAnnDateStart,
      dateStart: editAnnDateStart,
      dateEnd: editAnnDateEnd,
      type: editAnnIsUrgent ? 'urgent' : 'general',
      isUrgent: editAnnIsUrgent,
    });

    setIsEditAnnouncementModalOpen(false);
    setEditingAnnouncement(null);

    Swal.fire({
      icon: 'success',
      title: 'แก้ไขประกาศสำเร็จ',
      text: 'บันทึกการแก้ไขข้อความและวันที่จัดกิจกรรมเรียบร้อยแล้ว',
      confirmButtonColor: '#7C3AED',
      timer: 2000,
    });
  };

  // 6. Handle Admin Announcement Deletion
  const handleDeleteAnnouncement = (ann: Announcement) => {
    Swal.fire({
      title: 'ยืนยันการลบประกาศ?',
      text: `คุณต้องการลบประกาศ "${ann.title}" ใช่หรือไม่?`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#E11D48',
      cancelButtonColor: '#94A3B8',
      confirmButtonText: 'ใช่, ลบประกาศนี้',
      cancelButtonText: 'ยกเลิก',
    }).then((result) => {
      if (result.isConfirmed) {
        storage.deleteAnnouncement(ann.id, ann.title);
        Swal.fire({
          icon: 'success',
          title: 'ลบสำเร็จ',
          text: 'ลบประกาศเรียบร้อยแล้ว',
          timer: 1500,
          showConfirmButton: false,
        });
      }
    });
  };

  // 7. Handle File Selection with Auto Topic Linking for Member Submission
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const fileList: File[] = Array.from(e.target.files);
      setSelectedFiles(fileList);
      
      if (!submissionTopicTitle || submissionTopicTitle.trim() === '') {
        const baseName = fileList[0].name.replace(/\.[^/.]+$/, "");
        setSubmissionTopicTitle(baseName);
      }
    }
  };

  // Preview local file before upload with authentic extraction & IndexedDB persistence
  const handlePreviewLocalFile = async (file: File) => {
    const dataUrl = await new Promise<string>((resolve) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = () => resolve('');
      reader.readAsDataURL(file);
    });
    let previewType: UploadedFile['previewType'] = 'other';
    const lower = file.name.toLowerCase();
    if (lower.endsWith('.pdf')) previewType = 'pdf';
    else if (lower.match(/\.(png|jpg|jpeg|gif|webp|svg)$/)) previewType = 'image';
    else if (lower.match(/\.(xlsx|xls|csv)$/)) previewType = 'spreadsheet';
    else if (lower.match(/\.(pptx|ppt)$/)) previewType = 'presentation';
    else if (lower.match(/\.(docx|doc)$/)) previewType = 'doc';

    let genuineContent = '';
    try {
      if (previewType === 'doc') {
        const arrayBuffer = await file.arrayBuffer();
        const parsed = await parseDocxBinary(arrayBuffer);
        if (parsed && parsed.rawText) {
          genuineContent = parsed.rawText;
        }
      } else if (previewType === 'spreadsheet') {
        const arrayBuffer = await file.arrayBuffer();
        const wb = XLSX.read(arrayBuffer, { type: 'array' });
        const firstSheet = wb.SheetNames[0];
        if (firstSheet) {
          genuineContent = XLSX.utils.sheet_to_csv(wb.Sheets[firstSheet]);
        }
      } else if (previewType === 'other' || file.type.includes('text')) {
        genuineContent = await file.text();
      }
    } catch (e) {
      console.warn('Preview extraction notice:', e);
    }

    const tempFileId = 'temp_' + Date.now();
    await saveFileToIndexedDb(tempFileId, dataUrl, file, {
      name: file.name,
      size: file.size,
      mimeType: file.type,
    });
    if (file.name) {
      saveFileToIndexedDb(file.name, dataUrl, file, {
        name: file.name,
        size: file.size,
        mimeType: file.type,
      }).catch(() => {});
    }

    const tempUploadedFile: UploadedFile = {
      id: tempFileId,
      name: file.name,
      size: file.size,
      mimeType: file.type || 'application/octet-stream',
      driveFileId: 'temp_preview',
      driveFolderId: '1IpsaGJhJqtuYHTLiHmT2kqOe7CBq4as-',
      downloadUrl: '',
      viewUrl: '',
      previewType,
      previewContent: genuineContent || file.name.replace(/\.[^/.]+$/, ''),
      fileDataUrl: dataUrl,
      uploadedAt: new Date().toISOString(),
    };

    onOpenFilePreview(tempUploadedFile, submissionTopicTitle || file.name, currentUser?.fullName);
  };

  // 8. Handle Member Multi-file Submission
  const handleMemberSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedAssignmentForSubmit) {
      Swal.fire('ข้อผิดพลาด', 'กรุณาเลือกหัวข้องานที่ต้องการส่ง', 'warning');
      return;
    }
    if (selectedFiles.length === 0) {
      Swal.fire('ข้อผิดพลาด', 'กรุณาเลือกไฟล์เอกสารอย่างน้อย 1 ไฟล์', 'warning');
      return;
    }

    // Target folder on Google Drive
    const currentAssign = assignments.find(a => a.id === selectedAssignmentForSubmit);
    const targetFolder = currentAssign?.driveFolderId || ROOT_DRIVE_FOLDER_ID;

    setUploadProgress(0);

    const uploadedFileList: UploadedFile[] = [];
    try {
      for (let i = 0; i < selectedFiles.length; i++) {
        const file = selectedFiles[i];
        const uploaded = await storage.simulateFileUpload(file, (pct) => {
          const overall = Math.floor(((i + pct / 100) / selectedFiles.length) * 100);
          setUploadProgress(overall);
        }, targetFolder);
        uploadedFileList.push(uploaded);
      }
    } catch (uploadErr: any) {
      setUploadProgress(null);
      Swal.fire({
        icon: 'error',
        title: 'อัปโหลดลง Google Drive ไม่สำเร็จ',
        text: uploadErr?.message || 'เกิดข้อผิดพลาดในการบันทึกไฟล์ลง Google Drive',
      });
      return;
    }

    setUploadProgress(100);

    storage.createSubmission({
      assignmentId: selectedAssignmentForSubmit,
      files: uploadedFileList,
      note: `${submissionTopicTitle ? `[หัวข้อ: ${submissionTopicTitle}] ` : ''}${submissionNote}`,
    });

    setTimeout(() => {
      setUploadProgress(null);
      setIsMemberSubmitModalOpen(false);
      setSelectedFiles([]);
      setSubmissionTopicTitle('');
      setSubmissionNote('');
      setSelectedAssignmentForSubmit('');

      Swal.fire({
        icon: 'success',
        title: 'สำเร็จ',
        text: 'อัปโหลดและส่งงานวิชาการเข้า Google Drive เรียบร้อยแล้ว',
        confirmButtonColor: '#10B981',
        timer: 2000,
      });
    }, 400);
  };

  // 9. Handle Member Edit Submission (Open modal)
  const handleOpenEditSubmission = (submission: Submission) => {
    setEditingSubmission(submission);
    
    // Extract topic title if stored in note format [หัวข้อ: ...]
    const match = submission.note?.match(/^\[หัวข้อ:\s*([^\]]+)\]\s*(.*)$/);
    if (match) {
      setEditSubTopicTitle(match[1]);
      setEditSubNote(match[2] || '');
    } else {
      setEditSubTopicTitle(submission.assignmentTitle || '');
      setEditSubNote(submission.note || '');
    }
    
    setEditSubNewFiles([]);
    setEditUploadProgress(null);
    setIsEditSubmissionModalOpen(true);
  };

  // 1-Click Download of Raw File with Original Name
  const handleDownloadFile = async (file: UploadedFile) => {
    Swal.fire({
      icon: 'info',
      title: 'กำลังดาวน์โหลดไฟล์ต้นฉบับ...',
      text: `${file.name} (ไฟล์ดิบ ชื่อไฟล์เดิม)`,
      toast: true,
      position: 'top-end',
      timer: 2000,
      showConfirmButton: false,
    });
    try {
      await triggerDirectDownload(file);
    } catch (err: any) {
      console.warn('Download notice:', err);
    }
  };

  // Direct File Delete Handler (with confirmation)
  const handleDeleteFileDirect = (submissionId: string, fileId: string, fileName: string) => {
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
            text: `ลบไฟล์ "${fileName}" ออกจากระบบและ Google Drive เรียบร้อยแล้ว`,
            timer: 1500,
            showConfirmButton: false,
          });
        } catch (err: any) {
          Swal.fire('ข้อผิดพลาด', err.message || 'ไม่สามารถลบไฟล์ได้', 'error');
        }
      }
    });
  };

  // Helper to render appropriate file icon
  const getFileIcon = (file: UploadedFile) => {
    if (file.previewType === 'pdf' || file.name.toLowerCase().endsWith('.pdf')) {
      return <FileText className="w-4 h-4 text-rose-500 shrink-0" />;
    }
    if (file.previewType === 'spreadsheet' || file.name.toLowerCase().match(/\.(xlsx|xls|csv)$/)) {
      return <FileSpreadsheet className="w-4 h-4 text-emerald-500 shrink-0" />;
    }
    return <FileText className="w-4 h-4 text-purple-500 shrink-0" />;
  };

  // Handle Delete Single File from Member Submission
  const handleDeleteSubmissionFile = (fileId: string) => {
    if (!editingSubmission) return;

    Swal.fire({
      title: 'ยืนยันการลบไฟล์นี้?',
      text: 'ไฟล์นี้จะถูกลบออกจากระบบและโฟลเดอร์ Google Drive โดยอัตโนมัติ',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#E11D48',
      cancelButtonColor: '#94A3B8',
      confirmButtonText: 'ใช่, ลบไฟล์นี้',
      cancelButtonText: 'ยกเลิก',
    }).then((res) => {
      if (res.isConfirmed) {
        try {
          storage.deleteFileFromSubmission(editingSubmission.id, fileId, currentUser?.id || '', isAdmin);
          // Update local editingSubmission state
          const updatedFiles = (editingSubmission.files || []).filter(f => f.id !== fileId);
          if (updatedFiles.length === 0) {
            setIsEditSubmissionModalOpen(false);
            setEditingSubmission(null);
            Swal.fire('สำเร็จ', 'ลบไฟล์และยกเลิกรายการส่งงานแล้ว เนื่องจากไม่มีไฟล์เหลืออยู่', 'info');
          } else {
            setEditingSubmission({ ...editingSubmission, files: updatedFiles });
            Swal.fire('สำเร็จ', 'ลบไฟล์ออกจาก Google Drive เรียบร้อยแล้ว', 'success');
          }
        } catch (err: any) {
          Swal.fire('ข้อผิดพลาด', err.message || 'ไม่สามารถลบไฟล์ได้', 'error');
        }
      }
    });
  };

  // Handle Save Edit Submission
  const handleSaveEditSubmission = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingSubmission) return;

    let finalFiles = [...editingSubmission.files];

    if (editSubNewFiles.length > 0) {
      const currentAssign = assignments.find(a => a.id === editingSubmission.assignmentId);
      const targetFolder = currentAssign?.driveFolderId || ROOT_DRIVE_FOLDER_ID;

      setEditUploadProgress(0);
      try {
        for (let i = 0; i < editSubNewFiles.length; i++) {
          const file = editSubNewFiles[i];
          const uploaded = await storage.simulateFileUpload(file, (pct) => {
            const overall = Math.floor(((i + pct / 100) / editSubNewFiles.length) * 100);
            setEditUploadProgress(overall);
          }, targetFolder);
          finalFiles.push(uploaded);
        }
      } catch (uploadErr: any) {
        setEditUploadProgress(null);
        Swal.fire({
          icon: 'error',
          title: 'อัปโหลดลง Google Drive ไม่สำเร็จ',
          text: uploadErr?.message || 'เกิดข้อผิดพลาดในการบันทึกไฟล์ลง Google Drive',
        });
        return;
      }
      setEditUploadProgress(100);
    }

    const finalNote = `${editSubTopicTitle ? `[หัวข้อ: ${editSubTopicTitle}] ` : ''}${editSubNote}`;

    storage.updateSubmission(editingSubmission.id, {
      note: finalNote,
      files: finalFiles,
      status: 'submitted',
    });

    setTimeout(() => {
      setEditUploadProgress(null);
      setIsEditSubmissionModalOpen(false);
      setEditingSubmission(null);
      setEditSubNewFiles([]);

      Swal.fire({
        icon: 'success',
        title: 'บันทึกการแก้ไขสำเร็จ',
        text: 'ปรับปรุงข้อมูลการส่งงานและอัปเดตไฟล์ใน Google Drive เรียบร้อยแล้ว',
        confirmButtonColor: '#10B981',
        timer: 2000,
      });
    }, 300);
  };

  // 10. Handle Delete Own Submission
  const handleDeleteMySubmission = (submissionId: string) => {
    Swal.fire({
      title: 'ยืนยันการลบงานของตนเอง?',
      text: 'คุณต้องการลบรายการส่งงานและไฟล์ทั้งหมดใน Google Drive ใช่หรือไม่?',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#E11D48',
      cancelButtonColor: '#94A3B8',
      confirmButtonText: 'ใช่, ลบงานของฉัน',
      cancelButtonText: 'ยกเลิก',
    }).then((result) => {
      if (result.isConfirmed) {
        storage.deleteSubmission(submissionId, currentUser?.id || '', isAdmin);
        Swal.fire({
          icon: 'success',
          title: 'ลบสำเร็จ',
          text: 'ลบรายการส่งงานและไฟล์เรียบร้อยแล้ว',
          timer: 1500,
          showConfirmButton: false,
        });
      }
    });
  };

  // 11. Handle Admin Delete Member Submission
  const handleDeleteSubmissionByAdmin = (submissionId: string, memberName: string) => {
    Swal.fire({
      title: 'ยืนยันการลบการส่งงาน?',
      text: `คุณต้องการลบรายการส่งงานของ "${memberName}" พร้อมไฟล์ที่เกี่ยวข้อง ใช่หรือไม่?`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#E11D48',
      cancelButtonColor: '#94A3B8',
      confirmButtonText: 'ใช่, ลบการส่งงานนี้',
      cancelButtonText: 'ยกเลิก',
    }).then((result) => {
      if (result.isConfirmed) {
        storage.deleteSubmission(submissionId, currentUser?.id || '', true);
        Swal.fire({
          icon: 'success',
          title: 'ลบสำเร็จ',
          text: `ลบรายการส่งงานของ ${memberName} เรียบร้อยแล้ว`,
          timer: 1500,
          showConfirmButton: false,
        });
      }
    });
  };

  return (
    <div className="assignments-tablet-container space-y-6 animate-in fade-in duration-300">
      <style>{`
        /* Dedicated Tablet Optimization (768px - 1023px) for Task Management */
        @media screen and (min-width: 768px) and (max-width: 1023.98px) {
          .assignments-tablet-container {
            gap: 0.75rem !important;
          }
          .assignments-tablet-container .tablet-page-header {
            padding: 0.625rem 0.875rem !important;
            border-radius: 0.875rem !important;
          }
          .assignments-tablet-container .tablet-page-header h2 {
            font-size: 0.95rem !important;
          }
          .assignments-tablet-container .tablet-page-header p {
            font-size: 0.6875rem !important;
          }
          .assignments-tablet-container .tablet-subtabs {
            padding: 0.25rem !important;
            border-radius: 0.75rem !important;
          }
          .assignments-tablet-container .tablet-subtabs button {
            padding: 0.35rem 0.625rem !important;
            font-size: 0.7rem !important;
          }
          .assignments-tablet-container .tablet-list-box {
            border-radius: 0.875rem !important;
          }
          .assignments-tablet-container .tablet-list-header {
            padding: 0.45rem 0.75rem !important;
            font-size: 0.7rem !important;
          }
          .assignments-tablet-container .tablet-items-list {
            padding: 0.375rem !important;
            gap: 0.375rem !important;
          }
          .assignments-tablet-container .tablet-items-list > * + * {
            margin-top: 0.375rem !important;
          }
          .assignments-tablet-container .tablet-card-item {
            padding: 0.375rem 0.625rem !important;
            gap: 0.25rem !important;
            border-radius: 0.625rem !important;
            border-left-width: 3px !important;
          }
          .assignments-tablet-container .tablet-card-item .tablet-card-row {
            gap: 0.375rem !important;
          }
          .assignments-tablet-container .tablet-card-item .tablet-title {
            font-size: 0.75rem !important;
            line-height: 1.15rem !important;
            font-weight: 600 !important;
          }
          .assignments-tablet-container .tablet-card-item .tablet-badge {
            font-size: 0.5625rem !important;
            padding: 0.1rem 0.35rem !important;
            border-radius: 0.25rem !important;
            line-height: 1 !important;
          }
          .assignments-tablet-container .tablet-card-item .tablet-date {
            font-size: 0.625rem !important;
            line-height: 1 !important;
          }
          .assignments-tablet-container .tablet-card-item .tablet-date svg {
            width: 0.625rem !important;
            height: 0.625rem !important;
          }
          .assignments-tablet-container .tablet-card-item .tablet-actions {
            gap: 0.25rem !important;
          }
          .assignments-tablet-container .tablet-card-item .tablet-btn {
            padding: 0.2rem 0.45rem !important;
            font-size: 0.625rem !important;
            border-radius: 0.375rem !important;
            gap: 0.25rem !important;
            line-height: 1 !important;
          }
          .assignments-tablet-container .tablet-card-item .tablet-btn svg {
            width: 0.6875rem !important;
            height: 0.6875rem !important;
          }
          .assignments-tablet-container .tablet-card-item .tablet-icon-btn {
            padding: 0.2rem !important;
            border-radius: 0.375rem !important;
          }
          .assignments-tablet-container .tablet-card-item .tablet-icon-btn svg {
            width: 0.6875rem !important;
            height: 0.6875rem !important;
          }
          .assignments-tablet-container .tablet-card-item .tablet-footer {
            padding-top: 0.2rem !important;
            margin-top: 0.1rem !important;
            font-size: 0.625rem !important;
          }
          .assignments-tablet-container .tablet-card-item .tablet-footer svg {
            width: 0.6875rem !important;
            height: 0.6875rem !important;
          }
          /* Tablet Announcement Cards */
          .assignments-tablet-container .tablet-announcement-item {
            padding: 0.45rem 0.625rem !important;
            gap: 0.25rem !important;
            border-radius: 0.625rem !important;
            border-left-width: 3px !important;
          }
          .assignments-tablet-container .tablet-announcement-item h4 {
            font-size: 0.75rem !important;
            line-height: 1.15rem !important;
            font-weight: 600 !important;
          }
          .assignments-tablet-container .tablet-announcement-item p {
            font-size: 0.6875rem !important;
            padding: 0.3rem !important;
            border-radius: 0.375rem !important;
          }
        }
      `}</style>

      {/* Page Header */}
      <div className="tablet-page-header bg-white rounded-2xl p-4 sm:p-5 border border-purple-100 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <h2 className="text-lg sm:text-xl font-bold text-slate-900 leading-none">
              ระบบจัดการงาน
            </h2>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-purple-100 text-purple-800">
              {activeSubTab === 'assignments' ? 'งานวิชาการ' : 'ประกาศ & กิจกรรม'}
            </span>
          </div>
          <p className="text-xs text-slate-500">
            {activeSubTab === 'announcements'
              ? 'ประกาศแจ้งข้อมูลข่าวสารและกำหนดการจัดกิจกรรมของกลุ่มสาระฯ (ไม่มีการกำหนดส่งงาน)'
              : isAdmin 
                ? 'จัดการงาน ตรวจสอบสถานะการส่งงาน แก้ไข/ลบงานและติดตามผล' 
                : 'ตรวจสอบกำหนดส่ง ส่งงาน และติดตามงานที่ตนเองส่ง'}
          </p>
        </div>

        {/* Action Button */}
        <div className="flex items-center gap-2">
          {isAdmin ? (
            <button
              id="admin-create-assignment-btn"
              onClick={() => {
                handleOpenPlusModal(activeSubTab === 'announcements' ? 'announcement' : 'assignment');
              }}
              title={activeSubTab === 'announcements' ? 'สร้างประกาศกิจกรรมใหม่ (+)' : 'สร้างงานใหม่ (+)'}
              aria-label={activeSubTab === 'announcements' ? 'สร้างประกาศกิจกรรมใหม่' : 'สร้างงานใหม่'}
              className="w-10 h-10 rounded-xl bg-purple-600 hover:bg-purple-700 active:scale-95 text-white flex items-center justify-center transition-all shadow-md shadow-purple-500/25 glow-purple-hover cursor-pointer group relative"
            >
              <Plus className="w-5 h-5 stroke-[2.5] transition-transform duration-200 group-hover:rotate-90" />
            </button>
          ) : activeSubTab === 'assignments' ? (
            <button
              id="member-submit-work-btn"
              onClick={() => {
                setSelectedAssignmentForSubmit(assignments[0]?.id || '');
                setIsMemberSubmitModalOpen(true);
              }}
              title="ส่งงานวิชาการ"
              className="px-4 py-2 rounded-xl bg-purple-600 hover:bg-purple-700 text-white flex items-center gap-1.5 transition-all shadow-xs glow-purple-hover font-bold text-xs cursor-pointer"
            >
              <UploadCloud className="w-4 h-4" />
              <span>ส่งงานวิชาการ</span>
            </button>
          ) : null}
        </div>
      </div>

      {/* Sub Tabs: 1. งานที่มอบหมาย vs 2. ประกาศ & วันที่จัดกิจกรรม */}
      <div className="tablet-subtabs flex gap-2 p-1.5 bg-white rounded-2xl border border-purple-100 shadow-2xs">
        <button
          onClick={() => setActiveSubTab('assignments')}
          className={`flex-1 py-2.5 px-4 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer ${
            activeSubTab === 'assignments'
              ? 'bg-purple-600 text-white shadow-xs'
              : 'text-slate-600 hover:text-purple-700 hover:bg-purple-50/60'
          }`}
        >
          <FileText className="w-4 h-4" />
          <span>รายการงาน (Assignments)</span>
          <span className={`px-2 py-0.2 rounded-full text-[10px] ${
            activeSubTab === 'assignments' ? 'bg-purple-800 text-purple-100' : 'bg-slate-200 text-slate-700'
          }`}>
            {assignments.length}
          </span>
        </button>

        <button
          onClick={() => setActiveSubTab('announcements')}
          className={`flex-1 py-2.5 px-4 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer ${
            activeSubTab === 'announcements'
              ? 'bg-purple-600 text-white shadow-xs'
              : 'text-slate-600 hover:text-purple-700 hover:bg-purple-50/60'
          }`}
        >
          <Megaphone className="w-4 h-4" />
          <span>ประกาศ & วันที่จัดกิจกรรม (Announcements)</span>
          <span className={`px-2 py-0.2 rounded-full text-[10px] ${
            activeSubTab === 'announcements' ? 'bg-purple-800 text-purple-100' : 'bg-slate-200 text-slate-700'
          }`}>
            {announcements.length}
          </span>
        </button>
      </div>

      {/* TAB 1: ASSIGNMENTS LIST VIEW */}
      {activeSubTab === 'assignments' && (
        <div className="tablet-list-box bg-white rounded-2xl border border-purple-100 shadow-xs overflow-hidden">
          <div className="tablet-list-header px-5 py-3.5 bg-slate-50/80 border-b border-slate-200 flex items-center justify-between">
            <span className="text-xs font-bold text-slate-700 uppercase tracking-wider">
              รายการงานวิชาการ ({assignments.length} รายการ - เรียงกำหนดส่งใกล้ถึงก่อน)
            </span>
            <div className="flex items-center gap-3 text-xs">
              <span className="flex items-center gap-1.5 text-purple-700 font-medium">
                <span className="w-2.5 h-2.5 rounded-full bg-purple-600" />
                <span>{isAdmin ? 'ส่งยังไม่ครบ' : 'ยังไม่ส่ง'}</span>
              </span>
              <span className="flex items-center gap-1.5 text-emerald-700 font-medium">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-600" />
                <span>{isAdmin ? 'ส่งครบทุกคนแล้ว' : 'ส่งแล้ว'}</span>
              </span>
            </div>
          </div>

          {/* Minimal List Items with spacing */}
          <div className="tablet-items-list p-3 sm:p-4 space-y-3">
            {assignments.length === 0 ? (
              <div className="p-8 text-center text-xs text-slate-400">
                ยังไม่มีงานที่มอบหมายในขณะนี้
              </div>
            ) : (
              [...assignments]
                .sort((a, b) => {
                  const subsA = submissions.filter((s) => s.assignmentId === a.id);
                  const subsB = submissions.filter((s) => s.assignmentId === b.id);

                  const isCompA = isAdmin
                    ? (!!a.isMarkedCompleted || (totalApprovedMembersCount > 0 && subsA.length >= totalApprovedMembersCount))
                    : (mySubmissionsMap.has(a.id) || !!a.isMarkedCompleted);

                  const isCompB = isAdmin
                    ? (!!b.isMarkedCompleted || (totalApprovedMembersCount > 0 && subsB.length >= totalApprovedMembersCount))
                    : (mySubmissionsMap.has(b.id) || !!b.isMarkedCompleted);

                  // 1. Uncompleted tasks on top, completed tasks at the bottom
                  if (isCompA !== isCompB) {
                    return isCompA ? 1 : -1;
                  }

                  // 2. Closest deadline on top ("แสดงอันล่าสุดที่ใกล้ถึงวันจะต้องส่ง")
                  const dateA = a.dueDateEnd || a.dueDateStart || '9999-99-99';
                  const dateB = b.dueDateEnd || b.dueDateStart || '9999-99-99';

                  const isUpcomingA = dateA >= todayDateNow;
                  const isUpcomingB = dateB >= todayDateNow;

                  if (isUpcomingA !== isUpcomingB) {
                    return isUpcomingA ? -1 : 1;
                  }

                  if (isUpcomingA) {
                    // Ascending: closest upcoming deadline to today comes first
                    return dateA.localeCompare(dateB);
                  } else {
                    // Overdue: most recent first
                    return dateB.localeCompare(dateA);
                  }
                })
                .map((assignment) => {
                  const assignmentSubs = submissions.filter((s) => s.assignmentId === assignment.id);
                  const isAllSubmittedAdmin = totalApprovedMembersCount > 0 && assignmentSubs.length >= totalApprovedMembersCount;

                  const mySubmission = mySubmissionsMap.get(assignment.id);
                  const isMemberSubmitted = !!mySubmission;

                  const isCompleted = isAdmin 
                    ? (!!assignment.isMarkedCompleted || isAllSubmittedAdmin) 
                    : (isMemberSubmitted || !!assignment.isMarkedCompleted);

                  return (
                    <div
                      key={assignment.id}
                      className={`tablet-card-item p-3 sm:p-3.5 rounded-xl border flex flex-col gap-2 transition-all hover:shadow-xs ${
                        isCompleted 
                          ? 'border-emerald-300 border-l-4 border-l-emerald-500 bg-emerald-50/20' 
                          : 'border-purple-200 border-l-4 border-l-purple-600 bg-white'
                      }`}
                    >
                      {/* Card Top: Details & Actions */}
                      <div className="tablet-card-row flex flex-col md:flex-row md:items-center justify-between gap-3">
                        {/* Left Info */}
                        <div className="space-y-1 min-w-0 flex-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span
                              className={`tablet-badge text-[10px] font-bold px-2 py-0.5 rounded-md ${
                                isCompleted
                                  ? 'bg-emerald-100 text-emerald-800'
                                  : 'bg-purple-100 text-purple-800'
                              }`}
                            >
                              {isAdmin
                                ? assignment.isMarkedCompleted
                                  ? 'ส่งครบทุกคนแล้ว (กระดาษ/เสร็จสิ้น)'
                                  : isAllSubmittedAdmin
                                  ? 'ส่งครบแล้ว (100%)'
                                  : `ส่งแล้ว ${assignmentSubs.length}/${totalApprovedMembersCount} คน`
                                : isMemberSubmitted
                                ? 'ส่งงานเรียบร้อย (ส่งแล้ว)'
                                : assignment.isMarkedCompleted
                                ? 'ส่งครบทุกคนแล้ว (กระดาษ/เสร็จสิ้น)'
                                : 'ยังไม่ได้ส่ง (กำหนดส่ง)'}
                            </span>

                            <span className="tablet-date text-[11px] text-slate-500 flex items-center gap-1">
                              <Calendar className="w-3 h-3 text-slate-400" />
                              <span>กำหนด: {formatThaiDateRange(assignment.dueDateStart, assignment.dueDateEnd)}</span>
                            </span>
                          </div>

                          <h3 className="tablet-title text-xs sm:text-sm font-bold text-slate-900 leading-snug">
                            {assignment.title}
                          </h3>
                        </div>

                        {/* Right Actions */}
                        <div className="tablet-actions flex items-center gap-1.5 shrink-0 pt-1.5 md:pt-0 border-t md:border-t-0 border-slate-100 flex-wrap">
                          {isAdmin ? (
                            /* ADMIN CONTROLS: View Submissions + Edit Assignment + Delete Assignment */
                            <div className="flex items-center gap-1.5 flex-wrap">
                              {/* Symbol-only button for Admin to mark all submitted (Paper submission or all done) */}
                              <button
                                type="button"
                                onClick={() => handleToggleMarkAllCompleted(assignment)}
                                title={assignment.isMarkedCompleted ? 'ยกเลิกสถานะส่งครบทุกคน' : 'ทำเครื่องหมายว่าส่งครบทุกคนแล้ว (ส่งด้วยกระดาษ)'}
                                aria-label={assignment.isMarkedCompleted ? 'ยกเลิกสถานะส่งครบทุกคน' : 'ทำเครื่องหมายว่าส่งครบทุกคนแล้ว'}
                                className={`tablet-icon-btn p-1.5 rounded-lg border transition-all cursor-pointer shadow-2xs ${
                                  assignment.isMarkedCompleted
                                    ? 'bg-emerald-500 text-white border-emerald-600 hover:bg-emerald-600'
                                    : 'bg-slate-50 text-slate-400 border-slate-200 hover:text-emerald-600 hover:bg-emerald-50 hover:border-emerald-300'
                                }`}
                              >
                                <CheckCircle2 className="w-3.5 h-3.5" />
                              </button>

                              <button
                                onClick={() => setMemberStatusModalAssignment(assignment)}
                                title="ดูสถานะการส่งและตรวจงานของสมาชิก"
                                className="tablet-btn inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-semibold text-purple-700 bg-purple-50 hover:bg-purple-100 rounded-lg border border-purple-200 transition-all cursor-pointer shadow-2xs"
                              >
                                <Users className="w-3.5 h-3.5" />
                                <span>สถานะการส่ง ({assignmentSubs.length}/{totalApprovedMembersCount})</span>
                              </button>

                              <button
                                onClick={() => handleOpenEditAssignment(assignment)}
                                title="แก้ไขรายละเอียดงานและกำหนดส่ง"
                                className="tablet-btn inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg border border-slate-200 transition-all cursor-pointer"
                              >
                                <Edit3 className="w-3.5 h-3.5 text-slate-600" />
                                <span>แก้ไข</span>
                              </button>

                              <button
                                onClick={() => handleDeleteAssignment(assignment)}
                                title="ลบงานที่มอบหมายและไฟล์ที่เกี่ยวข้องทั้งหมด"
                                className="tablet-icon-btn p-1 text-rose-600 hover:bg-rose-50 rounded-lg border border-rose-200 transition-colors cursor-pointer"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          ) : (
                            /* MEMBER CONTROLS: View / Edit / Delete own submission */
                            <>
                              {isMemberSubmitted ? (
                                <div className="flex items-center gap-1.5 flex-wrap">
                                  <button
                                    onClick={() => setPeerSubmissionsModalAssignment(assignment)}
                                    title="ดูสถานะการส่งและไฟล์งาน"
                                    className="tablet-btn inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-semibold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 rounded-lg border border-emerald-200 transition-colors cursor-pointer shadow-2xs"
                                  >
                                    <Users className="w-3.5 h-3.5" />
                                    <span>สถานะการส่ง (ส่งแล้ว)</span>
                                  </button>

                                  <button
                                    onClick={() => handleOpenEditSubmission(mySubmission)}
                                    title="แก้ไขงานที่ส่ง / เปลี่ยนไฟล์ / เพิ่มไฟล์"
                                    className="tablet-btn inline-flex items-center gap-1 px-2 py-1 text-xs font-semibold text-purple-700 bg-purple-50 hover:bg-purple-100 rounded-lg border border-purple-200 transition-colors cursor-pointer"
                                  >
                                    <Edit3 className="w-3.5 h-3.5" />
                                    <span>แก้ไขงาน</span>
                                  </button>

                                  <button
                                    onClick={() => handleDeleteMySubmission(mySubmission.id)}
                                    title="ลบงานของตนเอง"
                                    className="tablet-icon-btn p-1 text-rose-600 hover:bg-rose-50 rounded-lg border border-rose-200 transition-colors cursor-pointer"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </button>
                                </div>
                              ) : (
                                <div className="flex items-center gap-1.5">
                                  {assignmentSubs.length > 0 && (
                                    <button
                                      onClick={() => setPeerSubmissionsModalAssignment(assignment)}
                                      title="ดูสถานะการส่งของสมาชิกคนอื่นๆ"
                                      className="tablet-btn inline-flex items-center gap-1.5 px-2 py-1 text-xs font-semibold text-slate-600 bg-slate-100 hover:bg-purple-50 hover:text-purple-700 rounded-lg transition-colors cursor-pointer"
                                    >
                                      <Users className="w-3.5 h-3.5" />
                                      <span>สถานะการส่ง ({assignmentSubs.length})</span>
                                    </button>
                                  )}
                                  <button
                                    onClick={() => {
                                      setSelectedAssignmentForSubmit(assignment.id);
                                      setIsMemberSubmitModalOpen(true);
                                    }}
                                    className="tablet-btn inline-flex items-center gap-1.5 px-3 py-1 text-xs font-semibold text-white bg-purple-600 hover:bg-purple-700 rounded-lg transition-all shadow-xs glow-purple-hover cursor-pointer"
                                  >
                                    <UploadCloud className="w-3.5 h-3.5" />
                                    <span>คลิกเพื่อส่งงาน</span>
                                  </button>
                                </div>
                              )}
                            </>
                          )}
                        </div>
                      </div>

                      {/* Member: Compact Submitted Indicator */}
                      {mySubmission && (
                        <div className="tablet-footer pt-1.5 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
                          <span className="flex items-center gap-1.5 text-emerald-700 font-medium">
                            <Check className="w-3.5 h-3.5" />
                            <span>ส่งงานแล้ว {mySubmission.files?.length ? `(${mySubmission.files.length} ไฟล์)` : ''}</span>
                          </span>
                          <span className="text-[10px] text-slate-400">
                            ส่งเมื่อ {formatThaiDate(mySubmission.submissionDate)}
                          </span>
                        </div>
                      )}
                    </div>
                  );
                })
            )}
          </div>
        </div>
      )}

      {/* TAB 2: ANNOUNCEMENTS & ACTIVITIES MANAGEMENT */}
      {activeSubTab === 'announcements' && (
        <div className="tablet-list-box bg-white rounded-2xl border border-purple-100 shadow-xs overflow-hidden space-y-4 p-4 sm:p-5">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <div>
              <h3 className="text-sm font-bold text-slate-900">
                รายการประกาศข่าวสาร & กำหนดการจัดกิจกรรม ({announcements.length} รายการ)
              </h3>
              <p className="text-xs text-slate-500">
                ประกาศแจ้งข้อมูลและกำหนดวันจัดกิจกรรมต่างๆ ของกลุ่มสาระฯ (ไม่มีการกำหนดส่งงาน)
              </p>
            </div>
          </div>

          <div className="tablet-items-list space-y-3">
            {announcements.length === 0 ? (
              <div className="p-8 text-center text-xs text-slate-400 bg-slate-50 rounded-xl">
                ยังไม่มีประกาศข่าวสารหรือกิจกรรมในขณะนี้
              </div>
            ) : (
              announcements.map((ann) => (
                <div
                  key={ann.id}
                  className={`tablet-announcement-item p-4 rounded-xl border transition-all flex flex-col md:flex-row md:items-center justify-between gap-3 ${
                    ann.isUrgent
                      ? 'bg-rose-50/40 border-rose-200 border-l-4 border-l-rose-500'
                      : 'bg-amber-50/30 border-amber-200 border-l-4 border-l-amber-500'
                  }`}
                >
                  <div className="space-y-1 min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded-md ${
                          ann.isUrgent
                            ? 'bg-rose-100 text-rose-800'
                            : 'bg-amber-100 text-amber-900'
                        }`}
                      >
                        {ann.isUrgent ? '🚨 ประกาศด่วน' : '📢 แจ้งเพื่อทราบ'}
                      </span>

                      <span className="text-xs text-slate-500 flex items-center gap-1">
                        <Calendar className="w-3.5 h-3.5 text-slate-400" />
                        <span>
                          วันที่กิจกรรม: {ann.dateEnd && ann.dateEnd !== (ann.dateStart || ann.date)
                            ? formatThaiDateRange(ann.dateStart || ann.date, ann.dateEnd)
                            : formatThaiDate(ann.dateStart || ann.date || '')}
                        </span>
                      </span>

                      <span className="text-[11px] text-slate-400">
                        • ผู้ประกาศ: {ann.authorName || 'ฝ่ายวิชาการ'}
                      </span>
                    </div>

                    <h4 className="text-sm font-bold text-slate-900">
                      {ann.title}
                    </h4>

                    {ann.content && (
                      <p className="text-xs text-slate-600 leading-relaxed bg-white/70 p-2.5 rounded-lg border border-slate-100">
                        {ann.content}
                      </p>
                    )}
                  </div>

                  {isAdmin && (
                    <div className="flex items-center gap-2 shrink-0 pt-2 md:pt-0 border-t md:border-t-0 border-slate-100">
                      <button
                        onClick={() => handleOpenEditAnnouncement(ann)}
                        title="แก้ไขประกาศและเปลี่ยนวันที่จัดกิจกรรม"
                        className="tablet-btn inline-flex items-center gap-1 px-3 py-1.5 text-xs font-semibold text-purple-700 bg-purple-50 hover:bg-purple-100 rounded-xl border border-purple-200 transition-colors cursor-pointer"
                      >
                        <Edit3 className="w-3.5 h-3.5" />
                        <span>แก้ไขประกาศ</span>
                      </button>

                      <button
                        onClick={() => handleDeleteAnnouncement(ann)}
                        title="ลบประกาศนี้"
                        className="tablet-icon-btn p-1.5 text-rose-600 hover:bg-rose-50 rounded-xl border border-rose-200 transition-colors cursor-pointer"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODALS SECTION */}
      {/* ========================================================================= */}

      {/* 1. ADMIN PLUS MODAL (Create Assignment or Create Announcement) */}
      {isAdminPlusModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl max-w-xl w-full p-6 shadow-2xl border border-purple-100 relative">
            <button
              onClick={() => setIsAdminPlusModalOpen(false)}
              className="absolute top-4 right-4 p-1.5 text-slate-400 hover:text-slate-700 rounded-full cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>

            {/* Tab switch */}
            <div className="flex gap-2 p-1 bg-slate-100 rounded-xl mb-5">
              <button
                type="button"
                onClick={() => setAdminFormType('assignment')}
                className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                  adminFormType === 'assignment'
                    ? 'bg-white text-purple-900 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                1. มอบหมายงานวิชาการ
              </button>
              <button
                type="button"
                onClick={() => setAdminFormType('announcement')}
                className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                  adminFormType === 'announcement'
                    ? 'bg-white text-purple-900 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                2. ประกาศแจ้งข่าวสาร / กิจกรรม
              </button>
            </div>

            {/* Form 1: Assignment */}
            {adminFormType === 'assignment' ? (
              <form onSubmit={handleCreateAssignment} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    ชื่อหัวข้องานวิชาการที่มอบหมาย *
                  </label>
                  <input
                    type="text"
                    required
                    value={newTitle}
                    onChange={(e) => setNewTitle(e.target.value)}
                    placeholder="เช่น ส่งแผนการจัดการเรียนรู้ ภาคเรียนที่ 1/2569"
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-purple-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    รายละเอียดคำชี้แจง / คำแนะนำ
                  </label>
                  <textarea
                    rows={3}
                    value={newDescription}
                    onChange={(e) => setNewDescription(e.target.value)}
                    placeholder="ระบุข้อกำหนด แบบฟอร์ม หรือคำแนะนำสำหรับคณะครู..."
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-purple-500"
                  />
                </div>

                {/* Date Picker Range */}
                <DateRangePicker
                  startDate={newDueDateStart}
                  endDate={newDueDateEnd}
                  onChange={(start, end) => {
                    setNewDueDateStart(start);
                    setNewDueDateEnd(end);
                  }}
                  label="กำหนดระยะเวลาเปิดรับงาน - สิ้นสุดกำหนดส่ง *"
                />

                <div className="pt-3 flex justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setIsAdminPlusModalOpen(false)}
                    className="px-4 py-2 text-xs font-medium text-slate-600 hover:bg-slate-100 rounded-xl"
                  >
                    ยกเลิก
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2 text-xs font-semibold text-white bg-purple-600 hover:bg-purple-700 rounded-xl shadow-xs glow-purple-hover flex items-center gap-1.5 cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>สร้างงานที่มอบหมาย</span>
                  </button>
                </div>
              </form>
            ) : (
              /* Form 2: Announcement */
              <form onSubmit={handleCreateAnnouncement} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    หัวข้อประกาศ / ชื่อกิจกรรม *
                  </label>
                  <input
                    type="text"
                    required
                    value={annTitle}
                    onChange={(e) => setAnnTitle(e.target.value)}
                    placeholder="เช่น แจ้งกำหนดการประชุมกลุ่มสาระฯ หรือ อบรมเชิงปฏิบัติการ"
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-purple-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    เนื้อหา / รายละเอียดประกาศ
                  </label>
                  <textarea
                    rows={3}
                    value={annContent}
                    onChange={(e) => setAnnContent(e.target.value)}
                    placeholder="รายละเอียดประกาศ สถานที่ หรือข้อปฏิบัติ..."
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-purple-500"
                  />
                </div>

                {/* Date Picker Range for Event */}
                <DateRangePicker
                  startDate={annDateStart}
                  endDate={annDateEnd}
                  onChange={(start, end) => {
                    setAnnDateStart(start);
                    setAnnDateEnd(end);
                  }}
                  label="กำหนดวัน / ช่วงเวลาจัดกิจกรรม *"
                />

                <div className="flex items-center gap-2 pt-1">
                  <input
                    type="checkbox"
                    id="create-ann-urgent"
                    checked={annIsUrgent}
                    onChange={(e) => setAnnIsUrgent(e.target.checked)}
                    className="rounded border-slate-300 text-purple-600 focus:ring-purple-500 w-4 h-4 cursor-pointer"
                  />
                  <label htmlFor="create-ann-urgent" className="text-xs font-semibold text-slate-700 cursor-pointer">
                    ทำเครื่องหมายเป็นประกาศด่วน (Urgent Notification)
                  </label>
                </div>

                <div className="pt-3 flex justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setIsAdminPlusModalOpen(false)}
                    className="px-4 py-2 text-xs font-medium text-slate-600 hover:bg-slate-100 rounded-xl"
                  >
                    ยกเลิก
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2 text-xs font-semibold text-white bg-purple-600 hover:bg-purple-700 rounded-xl shadow-xs glow-purple-hover flex items-center gap-1.5 cursor-pointer"
                  >
                    <Megaphone className="w-3.5 h-3.5" />
                    <span>เผยแพร่ประกาศ</span>
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}

      {/* 2. ADMIN EDIT ASSIGNMENT MODAL */}
      {isEditAssignmentModalOpen && editingAssignment && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl max-w-xl w-full p-6 shadow-2xl border border-purple-100 relative">
            <button
              onClick={() => {
                setIsEditAssignmentModalOpen(false);
                setEditingAssignment(null);
              }}
              className="absolute top-4 right-4 p-1.5 text-slate-400 hover:text-slate-700 rounded-full cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="mb-4">
              <span className="text-[11px] font-bold uppercase tracking-wider text-purple-700 px-2 py-0.5 rounded bg-purple-100">
                แก้ไขงานที่มอบหมาย
              </span>
              <h3 className="text-base font-bold text-slate-900 mt-1">
                ปรับปรุงข้อมูลงานและกำหนดเวลาส่ง
              </h3>
            </div>

            <form onSubmit={handleSaveEditAssignment} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  ชื่อหัวข้องานวิชาการ *
                </label>
                <input
                  type="text"
                  required
                  value={editAssignTitle}
                  onChange={(e) => setEditAssignTitle(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-purple-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  รายละเอียดคำชี้แจง / คำแนะนำ
                </label>
                <textarea
                  rows={3}
                  value={editAssignDescription}
                  onChange={(e) => setEditAssignDescription(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-purple-500"
                />
              </div>

              <DateRangePicker
                startDate={editAssignDueDateStart}
                endDate={editAssignDueDateEnd}
                onChange={(start, end) => {
                  setEditAssignDueDateStart(start);
                  setEditAssignDueDateEnd(end);
                }}
                label="กำหนดระยะเวลาเปิดรับงาน - สิ้นสุดกำหนดส่ง *"
              />

              <div className="pt-3 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setIsEditAssignmentModalOpen(false);
                    setEditingAssignment(null);
                  }}
                  className="px-4 py-2 text-xs font-medium text-slate-600 hover:bg-slate-100 rounded-xl"
                >
                  ยกเลิก
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 text-xs font-semibold text-white bg-purple-600 hover:bg-purple-700 rounded-xl shadow-xs glow-purple-hover flex items-center gap-1.5 cursor-pointer"
                >
                  <Save className="w-3.5 h-3.5" />
                  <span>บันทึกการแก้ไข</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 3. ADMIN EDIT ANNOUNCEMENT MODAL (Change Event Dates, Fix Typos) */}
      {isEditAnnouncementModalOpen && editingAnnouncement && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl max-w-xl w-full p-6 shadow-2xl border border-purple-100 relative">
            <button
              onClick={() => {
                setIsEditAnnouncementModalOpen(false);
                setEditingAnnouncement(null);
              }}
              className="absolute top-4 right-4 p-1.5 text-slate-400 hover:text-slate-700 rounded-full cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="mb-4">
              <span className="text-[11px] font-bold uppercase tracking-wider text-amber-800 px-2 py-0.5 rounded bg-amber-100">
                แก้ไขประกาศ & วันที่จัดกิจกรรม
              </span>
              <h3 className="text-base font-bold text-slate-900 mt-1">
                แก้ไขข้อความ / แก้คำผิด / เปลี่ยนวันจัดกิจกรรม
              </h3>
            </div>

            <form onSubmit={handleSaveEditAnnouncement} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  หัวข้อประกาศ / ชื่อกิจกรรม *
                </label>
                <input
                  type="text"
                  required
                  value={editAnnTitle}
                  onChange={(e) => setEditAnnTitle(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-purple-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  เนื้อหา / รายละเอียดประกาศ
                </label>
                <textarea
                  rows={3}
                  value={editAnnContent}
                  onChange={(e) => setEditAnnContent(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-purple-500"
                />
              </div>

              <DateRangePicker
                startDate={editAnnDateStart}
                endDate={editAnnDateEnd}
                onChange={(start, end) => {
                  setEditAnnDateStart(start);
                  setEditAnnDateEnd(end);
                }}
                label="กำหนดวัน / ช่วงเวลาจัดกิจกรรม *"
              />

              <div className="flex items-center gap-2 pt-1">
                <input
                  type="checkbox"
                  id="edit-ann-urgent"
                  checked={editAnnIsUrgent}
                  onChange={(e) => setEditAnnIsUrgent(e.target.checked)}
                  className="rounded border-slate-300 text-purple-600 focus:ring-purple-500 w-4 h-4 cursor-pointer"
                />
                <label htmlFor="edit-ann-urgent" className="text-xs font-semibold text-slate-700 cursor-pointer">
                  ทำเครื่องหมายเป็นประกาศด่วน (Urgent Notification)
                </label>
              </div>

              <div className="pt-3 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setIsEditAnnouncementModalOpen(false);
                    setEditingAnnouncement(null);
                  }}
                  className="px-4 py-2 text-xs font-medium text-slate-600 hover:bg-slate-100 rounded-xl"
                >
                  ยกเลิก
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 text-xs font-semibold text-white bg-purple-600 hover:bg-purple-700 rounded-xl shadow-xs glow-purple-hover flex items-center gap-1.5 cursor-pointer"
                >
                  <Save className="w-3.5 h-3.5" />
                  <span>บันทึกการแก้ไขประกาศ</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 4. MEMBER SUBMIT WORK MODAL */}
      {isMemberSubmitModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-purple-100 relative">
            <button
              onClick={() => setIsMemberSubmitModalOpen(false)}
              className="absolute top-4 right-4 p-1.5 text-slate-400 hover:text-slate-700 rounded-full cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="mb-4">
              <span className="text-[11px] font-bold uppercase tracking-wider text-purple-700 px-2 py-0.5 rounded bg-purple-100">
                ส่งงานวิชาการ
              </span>
              <h3 className="text-base font-bold text-slate-900 mt-1">
                อัปโหลดไฟล์งานวิชาการเข้าสู่ Google Drive
              </h3>
            </div>

            <form onSubmit={handleMemberSubmit} className="space-y-4">
              {/* Assignment Selector */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  เลือกหัวข้องานที่ต้องการส่ง *
                </label>
                <select
                  required
                  value={selectedAssignmentForSubmit}
                  onChange={(e) => setSelectedAssignmentForSubmit(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-purple-500 bg-white"
                >
                  <option value="" disabled>-- เลือกหัวข้องาน --</option>
                  {assignments.map((a) => (
                    <option key={a.id} value={a.id}>
                      {a.title} ({formatThaiDateRange(a.dueDateStart, a.dueDateEnd)})
                    </option>
                  ))}
                </select>
              </div>

              {/* Multi-File Upload Zone */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  เลือกไฟล์เอกสารที่ต้องการส่ง (รองรับหลายไฟล์พร้อมกัน) *
                </label>
                <div className="border-2 border-dashed border-purple-200 hover:border-purple-400 rounded-xl p-4 text-center transition-colors bg-purple-50/40">
                  <input
                    type="file"
                    multiple
                    id="member-multi-file-input"
                    onChange={handleFileSelect}
                    className="hidden"
                  />
                  <label
                    htmlFor="member-multi-file-input"
                    className="cursor-pointer flex flex-col items-center justify-center space-y-1"
                  >
                    <UploadCloud className="w-7 h-7 text-purple-600" />
                    <span className="text-xs font-semibold text-purple-700">
                      คลิกเพื่อเลือกไฟล์ หรือ ลากไฟล์มาวางที่นี่
                    </span>
                    <span className="text-[10px] text-slate-400">
                      รองรับ PDF, DOCX, XLSX, รูปภาพ, ZIP และไฟล์ทุกประเภท
                    </span>
                  </label>
                </div>

                {selectedFiles.length > 0 && (
                  <div className="mt-2 space-y-1.5 max-h-36 overflow-y-auto">
                    {selectedFiles.map((f, idx) => (
                      <div key={idx} className="flex items-center justify-between text-xs p-2 rounded-xl bg-slate-50 border border-purple-200/70">
                        <div className="flex items-center gap-2 min-w-0">
                          <FileText className="w-3.5 h-3.5 text-purple-600 shrink-0" />
                          <span className="truncate max-w-[220px] sm:max-w-xs font-medium text-slate-700">
                            {f.name}
                          </span>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          <span className="text-[10px] text-slate-400">
                            {(f.size / (1024 * 1024)).toFixed(2)} MB
                          </span>
                          <button
                            type="button"
                            onClick={() => handlePreviewLocalFile(f)}
                            title="เปิดดูไฟล์ต้นฉบับ (เต็มหน้าจอพอดี 100%)"
                            className="p-1 text-purple-700 hover:bg-purple-100 rounded-lg transition-colors cursor-pointer"
                          >
                            <Eye className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Auto Topic Name */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  ชื่อหัวข้องาน / รายการที่ส่ง (ลิงก์ตามชื่อไฟล์อัตโนมัติ - แก้ไขได้)
                </label>
                <input
                  type="text"
                  value={submissionTopicTitle}
                  onChange={(e) => setSubmissionTopicTitle(e.target.value)}
                  placeholder="เช่น แผนการสอนรายวิชาวิทยาศาสตร์ ม.2"
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-purple-500"
                />
              </div>

              {/* Note */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  หมายเหตุเพิ่มเติมถึงผู้ตรวจ (ถ้ามี)
                </label>
                <textarea
                  rows={2}
                  value={submissionNote}
                  onChange={(e) => setSubmissionNote(e.target.value)}
                  placeholder="ข้อความหรือหมายเหตุเพิ่มเติม..."
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-purple-500"
                />
              </div>

              {/* Progress Bar */}
              {uploadProgress !== null && (
                <div className="space-y-2 p-3 bg-purple-50 rounded-xl border border-purple-200">
                  <div className="flex items-center justify-between text-xs font-semibold text-purple-900">
                    <div className="flex items-center gap-2">
                      <div className="w-4 h-4 border-2 border-purple-600 border-t-transparent rounded-full animate-spin" />
                      <span>กำลังอัปโหลดไฟล์เข้าสู่ Google Drive...</span>
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

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  disabled={uploadProgress !== null}
                  onClick={() => setIsMemberSubmitModalOpen(false)}
                  className="px-4 py-2 text-xs font-medium text-slate-600 hover:bg-slate-100 rounded-xl cursor-pointer"
                >
                  ยกเลิก
                </button>
                <button
                  type="submit"
                  disabled={uploadProgress !== null}
                  className="px-5 py-2 text-xs font-semibold text-white bg-purple-600 hover:bg-purple-700 rounded-xl shadow-xs glow-purple-hover flex items-center gap-1.5 cursor-pointer"
                >
                  {uploadProgress !== null ? (
                    <>
                      <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      <span>กำลังส่ง...</span>
                    </>
                  ) : (
                    <>
                      <UploadCloud className="w-3.5 h-3.5" />
                      <span>ยืนยันการส่งงาน</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 5. MEMBER EDIT SUBMISSION MODAL (Delete individual files, add files, edit notes) */}
      {isEditSubmissionModalOpen && editingSubmission && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-purple-100 relative max-h-[90vh] flex flex-col overflow-hidden">
            <button
              onClick={() => {
                setIsEditSubmissionModalOpen(false);
                setEditingSubmission(null);
              }}
              className="absolute top-4 right-4 p-1.5 text-slate-400 hover:text-slate-700 rounded-full cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="mb-4">
              <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-800 px-2 py-0.5 rounded bg-emerald-100">
                แก้ไขงานที่ส่งแล้ว
              </span>
              <h3 className="text-base font-bold text-slate-900 mt-1">
                {editingSubmission.assignmentTitle}
              </h3>
              <p className="text-xs text-slate-500">
                สามารถลบไฟล์เดิม อัปโหลดไฟล์ใหม่ หรือแก้ไขข้อความประกอบได้
              </p>
            </div>

            <form onSubmit={handleSaveEditSubmission} className="space-y-4 overflow-y-auto flex-1 pr-1">
              {/* Existing Files List */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  ไฟล์ที่ส่งแล้วใน Google Drive ({(editingSubmission.files || []).length} ไฟล์)
                </label>
                <div className="space-y-1.5">
                  {(editingSubmission.files || []).map((file) => (
                    <div
                      key={file.id}
                      className="flex items-center justify-between p-2.5 rounded-xl bg-slate-50 border border-slate-200 text-xs"
                    >
                      <div className="flex items-center gap-2 min-w-0 flex-1">
                        <FileText className="w-4 h-4 text-purple-600 shrink-0" />
                        <div className="truncate">
                          <p className="font-semibold text-slate-800 truncate">{file.name}</p>
                          <p className="text-[10px] text-slate-400">
                            {(file.size / (1024 * 1024)).toFixed(2)} MB
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-1 shrink-0">
                        <button
                          type="button"
                          onClick={() => onOpenFilePreview(file, editingSubmission.assignmentTitle, editingSubmission.memberName)}
                          className="p-1.5 text-purple-600 hover:bg-purple-100 rounded-lg transition-colors cursor-pointer"
                          title="เปิดดูไฟล์ต้นฉบับ (เต็มหน้าจอพอดี 100%)"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDownloadFile(file)}
                          className="p-1.5 text-emerald-600 hover:bg-emerald-100 rounded-lg transition-colors cursor-pointer"
                          title="ดาวน์โหลดไฟล์ต้นฉบับ"
                        >
                          <Download className="w-4 h-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeleteSubmissionFile(file.id)}
                          className="p-1.5 text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                          title="ลบไฟล์นี้"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Upload Additional Files */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  อัปโหลดไฟล์เพิ่มเติม (ถ้าต้องการ)
                </label>
                <div className="border-2 border-dashed border-slate-200 hover:border-purple-300 rounded-xl p-3 text-center transition-colors bg-slate-50/50">
                  <input
                    type="file"
                    multiple
                    id="member-edit-multi-file-input"
                    onChange={(e) => {
                      if (e.target.files) {
                        setEditSubNewFiles(Array.from(e.target.files));
                      }
                    }}
                    className="hidden"
                  />
                  <label
                    htmlFor="member-edit-multi-file-input"
                    className="cursor-pointer flex flex-col items-center justify-center space-y-0.5"
                  >
                    <UploadCloud className="w-5 h-5 text-purple-600" />
                    <span className="text-xs font-semibold text-purple-700">
                      คลิกเพื่อเลือกไฟล์ใหม่เพิ่ม
                    </span>
                  </label>
                </div>

                {editSubNewFiles.length > 0 && (
                  <div className="mt-2 space-y-1">
                    {editSubNewFiles.map((f, idx) => (
                      <div key={idx} className="flex items-center justify-between text-xs p-1.5 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-900">
                        <span className="truncate max-w-[280px] font-medium">+ {f.name}</span>
                        <span className="text-[10px] opacity-75">
                          {(f.size / (1024 * 1024)).toFixed(2)} MB
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Topic Title */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  ชื่อหัวข้องาน / รายการที่ส่ง
                </label>
                <input
                  type="text"
                  value={editSubTopicTitle}
                  onChange={(e) => setEditSubTopicTitle(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-purple-500"
                />
              </div>

              {/* Note */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  หมายเหตุเพิ่มเติมถึงผู้ตรวจ
                </label>
                <textarea
                  rows={2}
                  value={editSubNote}
                  onChange={(e) => setEditSubNote(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-purple-500"
                />
              </div>

              {/* Progress */}
              {editUploadProgress !== null && (
                <div className="space-y-2 p-3 bg-purple-50 rounded-xl border border-purple-200">
                  <div className="flex items-center justify-between text-xs font-semibold text-purple-900">
                    <div className="flex items-center gap-2">
                      <div className="w-4 h-4 border-2 border-purple-600 border-t-transparent rounded-full animate-spin" />
                      <span>กำลังอัปโหลดไฟล์ใหม่เข้า Google Drive...</span>
                    </div>
                    <span>{editUploadProgress}%</span>
                  </div>
                </div>
              )}

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  disabled={editUploadProgress !== null}
                  onClick={() => {
                    setIsEditSubmissionModalOpen(false);
                    setEditingSubmission(null);
                  }}
                  className="px-4 py-2 text-xs font-medium text-slate-600 hover:bg-slate-100 rounded-xl cursor-pointer"
                >
                  ยกเลิก
                </button>
                <button
                  type="submit"
                  disabled={editUploadProgress !== null}
                  className="px-5 py-2 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl shadow-xs flex items-center gap-1.5 cursor-pointer"
                >
                  <Save className="w-3.5 h-3.5" />
                  <span>บันทึกการแก้ไขงาน</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 6. ADMIN MODAL: ดูรายชื่อสมาชิกที่ส่งแล้ว / ยังไม่ส่ง */}
      {memberStatusModalAssignment && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl max-w-xl w-full p-6 shadow-2xl border border-purple-100 relative">
            <button
              onClick={() => setMemberStatusModalAssignment(null)}
              className="absolute top-4 right-4 p-1.5 text-slate-400 hover:text-slate-700 rounded-full cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="mb-3">
              <span className="text-[11px] font-bold uppercase tracking-wider text-purple-700 px-2 py-0.5 rounded bg-purple-100">
                สถานะการส่งงานของคณะครู
              </span>
              <h3 className="text-base font-bold text-slate-900 mt-1 leading-snug">
                {memberStatusModalAssignment.title}
              </h3>
              <p className="text-xs text-slate-500">
                กำหนดส่ง: {formatThaiDateRange(memberStatusModalAssignment.dueDateStart, memberStatusModalAssignment.dueDateEnd)}
              </p>
            </div>

            {/* Summary counters */}
            <div className="flex items-center justify-between py-2 px-3 bg-slate-50 rounded-xl border border-slate-200/80 text-xs mb-3">
              <span className="text-slate-600 font-medium">
                สมาชิกทั้งหมด {approvedMembers.length} คน
              </span>
              <div className="flex items-center gap-2">
                <span className="px-2 py-0.5 rounded-md bg-rose-100 text-rose-800 font-bold text-[11px] border border-rose-200">
                  ยังไม่ส่ง {approvedMembers.filter((m) => !submissions.some((s) => s.assignmentId === memberStatusModalAssignment.id && s.memberId === m.id)).length} คน
                </span>
                <span className="px-2 py-0.5 rounded-md bg-emerald-100 text-emerald-800 font-bold text-[11px] border border-emerald-300">
                  ส่งครบแล้ว {approvedMembers.filter((m) => submissions.some((s) => s.assignmentId === memberStatusModalAssignment.id && s.memberId === m.id)).length} คน
                </span>
              </div>
            </div>

            <div className="space-y-2 max-h-[58vh] overflow-y-auto pr-1">
              {[...approvedMembers]
                .sort((a, b) => {
                  const hasSubA = submissions.some(
                    (s) => s.assignmentId === memberStatusModalAssignment.id && s.memberId === a.id
                  );
                  const hasSubB = submissions.some(
                    (s) => s.assignmentId === memberStatusModalAssignment.id && s.memberId === b.id
                  );

                  // Unsubmitted on top, submitted (ส่งครบ) at bottom
                  if (hasSubA !== hasSubB) {
                    return hasSubA ? 1 : -1;
                  }
                  return a.fullName.localeCompare(b.fullName, 'th');
                })
                .map((member) => {
                  const sub = submissions.find(
                    (s) => s.assignmentId === memberStatusModalAssignment.id && s.memberId === member.id
                  );
                  const hasSubmitted = !!sub;

                  return (
                    <div
                      key={member.id}
                      className={`flex items-center justify-between p-3 rounded-xl border transition-all ${
                        hasSubmitted
                          ? 'border-emerald-300 bg-emerald-50/70 border-l-4 border-l-emerald-600 shadow-2xs'
                          : 'border-rose-200 bg-rose-50/20 border-l-4 border-l-rose-500'
                      }`}
                    >
                      <div className="flex items-center space-x-3">
                        <div
                          className={`w-8 h-8 rounded-full font-semibold text-xs flex items-center justify-center overflow-hidden shrink-0 ${
                            hasSubmitted
                              ? 'bg-emerald-100 text-emerald-800 ring-2 ring-emerald-300'
                              : 'bg-rose-100 text-rose-700 ring-2 ring-rose-200'
                          }`}
                        >
                          {member.avatarUrl ? (
                            <img src={member.avatarUrl} alt={member.fullName} className="w-full h-full object-cover" />
                          ) : (
                            member.fullName.charAt(0)
                          )}
                        </div>
                        <div>
                          <p className="text-xs font-bold text-slate-900 leading-tight">
                            {member.fullName}
                          </p>
                          <p className="text-[11px] text-slate-500">
                            {member.department}
                          </p>
                        </div>
                      </div>

                      <div>
                        {hasSubmitted ? (
                          <div className="flex items-center gap-2 flex-wrap justify-end">
                            <span className="px-2.5 py-1 text-[11px] font-bold rounded-md bg-emerald-100 text-emerald-800 border border-emerald-300 flex items-center gap-1">
                              <Check className="w-3.5 h-3.5 stroke-[2.5]" />
                              <span>ส่งครบแล้ว ({formatThaiDate(sub.submissionDate)})</span>
                            </span>
                            {sub.files && sub.files.length > 0 && (
                              <div className="flex items-center gap-1.5 flex-wrap justify-end">
                                {sub.files.map((f, fIdx) => (
                                  <div key={f.id || fIdx} className="inline-flex items-center gap-1 p-1 bg-white border border-emerald-200 rounded-lg text-xs shadow-3xs">
                                    <button
                                      onClick={() => {
                                        onOpenFilePreview(f, memberStatusModalAssignment.title, member.fullName);
                                      }}
                                      className="inline-flex items-center gap-1 px-1.5 py-0.5 font-semibold text-purple-700 hover:bg-purple-50 rounded cursor-pointer"
                                      title={`เปิดดูไฟล์ต้นฉบับ (เต็มหน้าจอพอดี 100%): ${f.name}`}
                                    >
                                      <Eye className="w-3.5 h-3.5" />
                                      <span className="max-w-[100px] truncate">{f.name}</span>
                                    </button>

                                    <button
                                      onClick={() => handleDownloadFile(f)}
                                      className="p-1 text-emerald-700 hover:bg-emerald-50 rounded cursor-pointer"
                                      title={`ดาวน์โหลดไฟล์ดิบ: ${f.name}`}
                                    >
                                      <Download className="w-3.5 h-3.5" />
                                    </button>
                                  </div>
                                ))}
                              </div>
                            )}

                            {/* Admin Delete Submission Button */}
                            {isAdmin && (
                              <button
                                type="button"
                                onClick={() => handleDeleteSubmissionByAdmin(sub.id, member.fullName)}
                                className="p-1.5 text-rose-600 hover:bg-rose-50 rounded-lg border border-rose-200 transition-colors cursor-pointer shrink-0"
                                title={`ลบการส่งงานของ ${member.fullName}`}
                                aria-label={`ลบการส่งงานของ ${member.fullName}`}
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </div>
                        ) : (
                          <span className="px-2.5 py-1 text-[11px] font-bold rounded-md bg-rose-100 text-rose-800 border border-rose-200">
                            ยังไม่ส่ง
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
            </div>

            <div className="mt-5 text-right">
              <button
                onClick={() => setMemberStatusModalAssignment(null)}
                className="px-4 py-2 text-xs font-semibold text-white bg-purple-600 hover:bg-purple-700 rounded-xl cursor-pointer"
              >
                ปิด
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 7. MEMBER MODAL: ดูงานเพื่อนที่ส่งแล้ว */}
      {peerSubmissionsModalAssignment && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl max-w-xl w-full p-6 shadow-2xl border border-purple-100 relative">
            <button
              onClick={() => setPeerSubmissionsModalAssignment(null)}
              className="absolute top-4 right-4 p-1.5 text-slate-400 hover:text-slate-700 rounded-full cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="mb-4">
              <span className="text-[11px] font-bold uppercase tracking-wider text-purple-700 px-2 py-0.5 rounded bg-purple-100">
                สถานะการส่งและผลงานที่ส่งแล้ว
              </span>
              <h3 className="text-base font-bold text-slate-900 mt-1 leading-snug">
                {peerSubmissionsModalAssignment.title}
              </h3>
            </div>

            <div className="space-y-2 max-h-[60vh] overflow-y-auto">
              {submissions
                .filter((s) => s.assignmentId === peerSubmissionsModalAssignment.id)
                .map((peerSub) => {
                  const isMine = peerSub.memberId === currentUser?.id;
                  return (
                    <div
                      key={peerSub.id}
                      className={`p-3 rounded-xl border flex items-center justify-between transition-all ${
                        isMine
                          ? 'border-emerald-200 bg-emerald-50/50'
                          : 'border-slate-200 bg-slate-50'
                      }`}
                    >
                      <div className="flex items-center space-x-3">
                        <div className="w-8 h-8 rounded-full bg-purple-100 text-purple-700 font-semibold text-xs flex items-center justify-center overflow-hidden shrink-0">
                          {peerSub.memberAvatar ? (
                            <img src={peerSub.memberAvatar} alt={peerSub.memberName} className="w-full h-full object-cover" />
                          ) : (
                            peerSub.memberName.charAt(0)
                          )}
                        </div>
                        <div>
                          <div className="flex items-center gap-1.5">
                            <p className="text-xs font-bold text-slate-900 leading-tight">
                              {peerSub.memberName}
                            </p>
                            {isMine && (
                              <span className="text-[10px] font-bold px-1.5 py-0.2 rounded bg-emerald-200 text-emerald-800">
                                งานของคุณ
                              </span>
                            )}
                          </div>
                          <p className="text-[11px] text-slate-500">
                            {peerSub.department} • ส่งเมื่อ {peerSub.submissionDate}
                          </p>
                        </div>
                      </div>

                      {peerSub.files && peerSub.files.length > 0 && (
                        <div className="flex items-center gap-1.5 flex-wrap justify-end">
                          {peerSub.files.map((f, fIdx) => (
                            <div key={f.id || fIdx} className="inline-flex items-center gap-1 p-1 bg-white border border-slate-200 rounded-lg text-xs">
                              <button
                                onClick={() => {
                                  onOpenFilePreview(f, peerSub.assignmentTitle, peerSub.memberName);
                                }}
                                className={`inline-flex items-center gap-1 px-1.5 py-0.5 font-semibold rounded cursor-pointer ${
                                  isMine
                                    ? 'text-emerald-800 hover:bg-emerald-50'
                                    : 'text-purple-700 hover:bg-purple-50'
                                }`}
                                title={`เปิดดูไฟล์ต้นฉบับ (เต็มหน้าจอพอดี 100%): ${f.name}`}
                              >
                                <Eye className="w-3.5 h-3.5" />
                                <span className="max-w-[100px] truncate">{f.name}</span>
                              </button>

                              <button
                                onClick={() => handleDownloadFile(f)}
                                className="p-1 text-emerald-700 hover:bg-emerald-50 rounded cursor-pointer"
                                title={`ดาวน์โหลดไฟล์ดิบ: ${f.name}`}
                              >
                                <Download className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          ))}
                        </div>
                      )}

                      {/* Delete Submission: Admin can delete any; Member can ONLY delete their own */}
                      {(isAdmin || isMine) && (
                        <button
                          type="button"
                          onClick={() => {
                            if (isAdmin && !isMine) {
                              handleDeleteSubmissionByAdmin(peerSub.id, peerSub.memberName);
                            } else if (isMine) {
                              handleDeleteMySubmission(peerSub.id);
                            }
                          }}
                          className="p-1.5 text-rose-600 hover:bg-rose-50 rounded-lg border border-rose-200 transition-colors cursor-pointer shrink-0 ml-2"
                          title={isAdmin && !isMine ? `ลบการส่งงานของ ${peerSub.memberName}` : 'ลบงานของตนเอง'}
                          aria-label={isAdmin && !isMine ? `ลบการส่งงานของ ${peerSub.memberName}` : 'ลบงานของตนเอง'}
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  );
                })}
            </div>

            <div className="mt-5 text-right">
              <button
                onClick={() => setPeerSubmissionsModalAssignment(null)}
                className="px-4 py-2 text-xs font-semibold text-white bg-purple-600 hover:bg-purple-700 rounded-xl cursor-pointer"
              >
                ปิด
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
