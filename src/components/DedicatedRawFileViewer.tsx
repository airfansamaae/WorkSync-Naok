import React, { useEffect, useState, useRef, useCallback } from 'react';
import { 
  Download, 
  X, 
  FileText, 
  FileSpreadsheet, 
  FileImage, 
  File, 
  CheckCircle2,
  AlertCircle,
  ZoomIn,
  ZoomOut,
  Maximize2,
  ChevronUp,
  ChevronDown,
  ExternalLink,
  Eye
} from 'lucide-react';
import { UploadedFile } from '../types';
import { triggerDirectDownload, saveBlobDirectly, storage, getSeedBinary } from '../services/storageService';
import { INITIAL_DOCUMENTS, INITIAL_SUBMISSIONS } from '../data/initialData';
import { renderAsync } from 'docx-preview';
import * as XLSX from 'xlsx';
import { parseDocxBinary, DocxParsedPage, DocxElement } from '../utils/docxParser';
import { getSafeGoogleDrivePreviewUrl, openAuthenticFileInNewTab } from '../utils/fileViewer';
import { getActivePreviewFromIndexedDb, getFileFromIndexedDb, saveFileToIndexedDb } from '../utils/indexedFileStore';
import { getFileBase64FromGas } from '../services/googleDriveService';
import Swal from 'sweetalert2';

/**
 * Enhanced helper to split text preview content into structured A4 pages
 * with exact margins, centered headings, authentic paragraph flow,
 * and automatic parsing of embedded tables (| col 1 | col 2 |).
 */
function createA4PagesFromText(text: string, defaultTitle?: string): DocxParsedPage[] {
  const effectiveText = text || '';
  if (!effectiveText.trim()) return [];

  const rawLines = effectiveText
    .split('\n')
    .filter(l => {
      const trimmed = l.trim();
      return !trimmed.startsWith('Google Drive File ID:') &&
             !trimmed.startsWith('จัดเก็บในโฟลเดอร์หลัก ID:') &&
             !trimmed.startsWith('ขนาดไฟล์: ') &&
             !trimmed.includes('อัปโหลดเข้าสู่ Google Drive Folder ID:') &&
             !trimmed.includes('เอกสารนี้ได้รับการจัดเก็บอย่างปลอดภัย');
    })
    .map(l => {
      return l
        .replace(/\[ไฟล์ที่จัดเก็บบน Google Drive\]:\s*/g, '')
        .replace(/\[ไฟล์ที่เลือกเตรียมส่ง\]:\s*/g, '')
        .replace(/\[เนื้อหาของไฟล์:\s*[^\]]+\]/g, '');
    });
  const elements: DocxElement[] = [];

  let i = 0;
  while (i < rawLines.length) {
    const line = rawLines[i].trim();
    if (!line) {
      i++;
      continue;
    }

    // Check if table row (e.g. '| col 1 | col 2 |' or separated by tabs)
    if (line.startsWith('|') || (line.includes('|') && line.split('|').length >= 3) || line.includes('\t')) {
      const stringRows: string[][] = [];
      const structuredRows: any[] = [];
      while (i < rawLines.length) {
        const curLine = rawLines[i].trim();
        if (!curLine) break;
        // Check if markdown separator line like |---|---|
        if (/^\|?(\s*:?-+:?\s*\|)+\s*$/.test(curLine)) {
          i++;
          continue;
        }
        if (curLine.includes('|') || curLine.includes('\t')) {
          const cells = curLine.includes('|')
            ? curLine.split('|').map(c => c.trim()).filter((c, idx, arr) => idx > 0 && idx < arr.length - (curLine.endsWith('|') ? 1 : 0) ? true : c.length > 0)
            : curLine.split('\t').map(c => c.trim());
          if (cells.length > 0) {
            const isHeader = structuredRows.length === 0;
            stringRows.push(cells);
            structuredRows.push({
              isHeader,
              cells: cells.map((c, cIdx) => ({
                text: c,
                align: isHeader ? 'center' : cIdx === 0 ? 'left' : 'left',
                bgColor: isHeader ? '#F1F5F9' : undefined,
                bold: isHeader || (cIdx === 0 && !isHeader),
                fontSizePt: isHeader ? 14 : 13,
                runs: [{ text: c, bold: isHeader || (cIdx === 0 && !isHeader) }]
              }))
            });
          }
          i++;
        } else {
          break;
        }
      }
      if (stringRows.length > 0) {
        elements.push({
          type: 'table',
          rows: stringRows,
          tableRows: structuredRows,
          borderColors: {
            outer: '#475569',
            inner: '#94A3B8'
          }
        });
      }
      continue;
    }

    // Normal paragraph
    const isTitle = 
      line.startsWith('โครงสร้าง') || 
      line.startsWith('รายงาน') || 
      line.startsWith('คำสั่งโรงเรียน') ||
      line.startsWith('แบบฟอร์ม') ||
      line.startsWith('แบบบันทึก') ||
      line.startsWith('เอกสารแผนการ') ||
      line.startsWith('แผนการจัดการเรียนรู้') ||
      line.startsWith('แบบประเมิน');

    const isHeading = 
      /^\d+\./.test(line) || 
      line.startsWith('เรื่อง:') || 
      line.startsWith('เรื่อง ') ||
      line.startsWith('บทคัดย่อ:') ||
      line.startsWith('หน่วยที่') ||
      line.startsWith('มาตรฐาน') ||
      line.startsWith('ตัวชี้วัด') ||
      line.startsWith('จุดประสงค์') ||
      line.startsWith('สาระสำคัญ');

    const hasIndent = rawLines[i].startsWith('\t') || rawLines[i].startsWith('    ') || rawLines[i].startsWith('   ');

    elements.push({
      type: 'paragraph',
      align: isTitle ? 'center' : 'left',
      isIndented: hasIndent,
      runs: [
        {
          text: line,
          bold: isTitle || isHeading,
          fontSizePt: isTitle ? 20 : isHeading ? 18 : 16,
        }
      ]
    });
    i++;
  }

  // If elements is empty, return empty list
  if (elements.length === 0) {
    if (defaultTitle) {
      elements.push({
        type: 'paragraph',
        align: 'center',
        isIndented: false,
        runs: [{ text: defaultTitle, bold: true, fontSizePt: 18 }]
      });
    } else {
      return [];
    }
  }

  // Paginate into realistic A4 pages (~10-12 elements per A4 page, tables count based on rows)
  const pages: DocxParsedPage[] = [];
  let currentPage: DocxParsedPage = { pageNumber: 1, elements: [] };
  let currentCost = 0;
  const maxCostPerPage = 12;

  for (const el of elements) {
    const cost = el.type === 'table' ? Math.max(3, el.rows.length) : 1;
    if (currentCost + cost > maxCostPerPage && currentPage.elements.length > 0) {
      pages.push(currentPage);
      currentPage = { pageNumber: pages.length + 1, elements: [] };
      currentCost = 0;
    }
    currentPage.elements.push(el);
    currentCost += cost;
  }

  if (currentPage.elements.length > 0 || pages.length === 0) {
    pages.push(currentPage);
  }

  return pages;
}

export interface DedicatedRawFileViewerProps {
  initialFile?: UploadedFile | null;
  initialTitle?: string;
  initialSubmitter?: string;
  onClose?: () => void;
  isModalMode?: boolean;
}

export const DedicatedRawFileViewer: React.FC<DedicatedRawFileViewerProps> = ({
  initialFile,
  initialTitle,
  initialSubmitter,
  onClose,
  isModalMode = false
}) => {
  const [file, setFile] = useState<UploadedFile | null>(initialFile || null);
  const [assignmentTitle, setAssignmentTitle] = useState<string>(initialTitle || '');
  const [submitterName, setSubmitterName] = useState<string>(initialSubmitter || '');
  const [blobUrl, setBlobUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // A4 pagination & Word doc state
  const [parsedPages, setParsedPages] = useState<DocxParsedPage[]>([]);
  const [zoomLevel, setZoomLevel] = useState<number>(100);
  const [docxArrayBuffer, setDocxArrayBuffer] = useState<ArrayBuffer | null>(null);
  const [docxRenderMode, setDocxRenderMode] = useState<'idle' | 'loading' | 'docx-preview' | 'fallback' | 'error'>('idle');
  const [docxPreviewPagesCount, setDocxPreviewPagesCount] = useState<number>(1);
  const docxContainerRef = useRef<HTMLDivElement>(null);

  // Dynamic Scroll Page Tracking (เมื่อเลื่อนลงมา ก็จะมีหน้าให้เห็นว่า อยู่หน้าที่เท่าไร)
  const [currentPageInView, setCurrentPageInView] = useState<number>(1);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const pageDomMap = useRef<Map<number, HTMLDivElement>>(new Map());

  // Spreadsheet state
  const [sheetNames, setSheetNames] = useState<string[]>([]);
  const [activeSheet, setActiveSheet] = useState<string>('');
  const [sheetData, setSheetData] = useState<{ [sheet: string]: any[][] }>({});

  // Register page ref for scroll tracking
  const registerPageRef = (pageNum: number, el: HTMLDivElement | null) => {
    if (el) {
      pageDomMap.current.set(pageNum, el);
    } else {
      pageDomMap.current.delete(pageNum);
    }
  };

  // Auto-fit to screen width for A4 pages (210 × 297 mm)
  const fitToScreenWidth = useCallback(() => {
    const container = scrollContainerRef.current;
    if (!container) return;
    const containerWidth = container.clientWidth;
    // Standard A4 width is 794px at 96 DPI. With 32px container padding:
    const targetWidth = 794 + 32;
    if (containerWidth < targetWidth) {
      const fit = Math.max(45, Math.floor(((containerWidth - 24) / 794) * 100));
      setZoomLevel(fit);
    } else {
      setZoomLevel(100);
    }
  }, []);

  // Scroll listener to update active page as user scrolls down
  const handleContainerScroll = () => {
    const container = scrollContainerRef.current;
    if (!container) return;

    // Check if user scrolled near the bottom of document
    const isAtBottom = container.scrollHeight - container.scrollTop - container.clientHeight < 50;
    if (isAtBottom && totalPages > 1) {
      setCurrentPageInView(totalPages);
      return;
    }

    const containerRect = container.getBoundingClientRect();
    // Use reader focus trigger line at ~32% down the container viewport
    const triggerPoint = containerRect.top + Math.min(240, containerRect.height * 0.32);

    let activePage = 1;
    let found = false;

    if (pageDomMap.current.size > 0) {
      const keys = Array.from(pageDomMap.current.keys()) as number[];
      const sortedPages = keys.sort((a, b) => a - b);
      for (const pageNum of sortedPages) {
        const el = pageDomMap.current.get(pageNum);
        if (!el) continue;
        const rect = el.getBoundingClientRect();

        if (rect.top <= triggerPoint && rect.bottom >= triggerPoint) {
          activePage = pageNum;
          found = true;
          break;
        }

        if (rect.top > triggerPoint) {
          activePage = Math.max(1, pageNum - 1);
          found = true;
          break;
        }

        activePage = pageNum;
      }
    }

    if (!found && totalPages > 1) {
      const maxScroll = container.scrollHeight - container.clientHeight;
      if (maxScroll > 0) {
        const fraction = container.scrollTop / maxScroll;
        activePage = Math.min(totalPages, Math.max(1, Math.floor(fraction * totalPages) + 1));
      }
    }

    setCurrentPageInView(activePage);
  };

  const scrollToPage = (pageNum: number) => {
    if (pageNum < 1 || pageNum > totalPages) return;
    const container = scrollContainerRef.current;
    if (!container) return;

    const targetEl = pageDomMap.current.get(pageNum);
    if (targetEl) {
      const containerRect = container.getBoundingClientRect();
      const elRect = targetEl.getBoundingClientRect();
      const scrollOffset = elRect.top - containerRect.top + container.scrollTop - 20;
      container.scrollTo({
        top: Math.max(0, scrollOffset),
        behavior: 'smooth'
      });
      setCurrentPageInView(pageNum);
    } else {
      const maxScroll = container.scrollHeight - container.clientHeight;
      if (maxScroll > 0) {
        const targetScroll = ((pageNum - 1) / Math.max(1, totalPages - 1)) * maxScroll;
        container.scrollTo({
          top: targetScroll,
          behavior: 'smooth'
        });
        setCurrentPageInView(pageNum);
      }
    }
  };

  // Dedicated original binary file download handler
  const handleDownloadOriginalFile = async () => {
    if (!file) return;

    // 1. Direct active ArrayBuffer (instantaneous byte-perfect original download)
    if (docxArrayBuffer && docxArrayBuffer.byteLength > 0) {
      const lower = (file.name || '').toLowerCase();
      const mime = lower.endsWith('.doc')
        ? 'application/msword'
        : 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
      const blob = new Blob([docxArrayBuffer], { type: mime });
      saveBlobDirectly(blob, file.name);
      Swal.fire({
        icon: 'success',
        title: 'ดาวน์โหลดไฟล์ต้นฉบับสำเร็จ',
        text: file.name,
        toast: true,
        position: 'top-end',
        timer: 2000,
        showConfirmButton: false,
      });
      return;
    }

    // 2. Direct Blob URL in memory
    if (blobUrl && blobUrl.startsWith('blob:')) {
      try {
        const resp = await fetch(blobUrl);
        const b = await resp.blob();
        if (b && b.size > 0) {
          saveBlobDirectly(b, file.name);
          Swal.fire({
            icon: 'success',
            title: 'ดาวน์โหลดไฟล์ต้นฉบับสำเร็จ',
            text: file.name,
            toast: true,
            position: 'top-end',
            timer: 2000,
            showConfirmButton: false,
          });
          return;
        }
      } catch {}
    }

    // 3. Multi-tier universal downloader
    await triggerDirectDownload(file);
  };

  // 1. Multi-tier resolution to guarantee authentic raw file is retrieved without fail
  useEffect(() => {
    let isCancelled = false;

    const resolveFile = async () => {
      const params = typeof window !== 'undefined' ? new URLSearchParams(window.location.search) : new URLSearchParams();
      const urlFileId = params.get('file_id') || params.get('id') || '';
      const urlDriveId = params.get('drive_id') || '';
      const urlName = params.get('name') || '';
      const urlMime = params.get('mime') || '';
      let resolvedTitle = params.get('title') || initialTitle || '';
      let resolvedSubmitter = params.get('uploader') || initialSubmitter || '';

      const isMatchingTarget = (candidate: UploadedFile | null | undefined): boolean => {
        if (!candidate) return false;
        if (urlFileId) {
          return candidate.id === urlFileId || candidate.driveFileId === urlFileId;
        }
        if (urlDriveId) {
          return candidate.driveFileId === urlDriveId || candidate.id === urlDriveId;
        }
        if (urlName) {
          return candidate.name === urlName;
        }
        return true;
      };

      if (initialFile) {
        let activeFile = initialFile;
        if (!activeFile.fileDataUrl) {
          const candidateKeys = [activeFile.id, activeFile.driveFileId, activeFile.name].filter(Boolean) as string[];
          for (const k of candidateKeys) {
            try {
              const idbRecord = await getFileFromIndexedDb(k);
              if (idbRecord?.dataUrl) {
                activeFile = { ...activeFile, fileDataUrl: idbRecord.dataUrl };
                break;
              }
            } catch {}
          }
        }
        if (!isCancelled) {
          setFile(activeFile);
          setZoomLevel(100);
          if (initialTitle || resolvedTitle) setAssignmentTitle(initialTitle || resolvedTitle);
          if (initialSubmitter || resolvedSubmitter) setSubmitterName(initialSubmitter || resolvedSubmitter);
        }
        return;
      }

      let resolvedFile: UploadedFile | null = null;

      // Tier 1: Check window payload attached by opener
      if (typeof window !== 'undefined') {
        const winPayload = (window as any).__RAW_FILE_PAYLOAD__;
        if (winPayload?.file && isMatchingTarget(winPayload.file)) {
          resolvedFile = winPayload.file;
          if (winPayload.assignmentTitle) resolvedTitle = winPayload.assignmentTitle;
          if (winPayload.submitterName) resolvedSubmitter = winPayload.submitterName;
        }

        // Tier 2: Check window.opener memory reference
        if (!resolvedFile && window.opener) {
          try {
            const openerPayload = (window.opener as any).__LAST_ACTIVE_RAW_FILE__;
            if (openerPayload?.file && isMatchingTarget(openerPayload.file)) {
              resolvedFile = openerPayload.file;
              if (openerPayload.assignmentTitle) resolvedTitle = openerPayload.assignmentTitle;
              if (openerPayload.submitterName) resolvedSubmitter = openerPayload.submitterName;
            }
          } catch {
            // ignore cross-origin opener
          }
        }

        // Tier 3: Check keyed sessionStorage (highest fidelity per-file cache)
        if (!resolvedFile && urlFileId) {
          try {
            const cachedKeyed = sessionStorage.getItem(`academic_raw_file_${urlFileId}`);
            if (cachedKeyed) {
              const parsed = JSON.parse(cachedKeyed);
              if (parsed?.file && isMatchingTarget(parsed.file)) {
                resolvedFile = parsed.file;
                if (parsed.assignmentTitle) resolvedTitle = parsed.assignmentTitle;
                if (parsed.submitterName) resolvedSubmitter = parsed.submitterName;
              }
            }
          } catch {}
        }
        if (!resolvedFile && urlName) {
          try {
            const cachedKeyed = sessionStorage.getItem(`academic_raw_file_name_${encodeURIComponent(urlName)}`);
            if (cachedKeyed) {
              const parsed = JSON.parse(cachedKeyed);
              if (parsed?.file && isMatchingTarget(parsed.file)) {
                resolvedFile = parsed.file;
                if (parsed.assignmentTitle) resolvedTitle = parsed.assignmentTitle;
                if (parsed.submitterName) resolvedSubmitter = parsed.submitterName;
              }
            }
          } catch {}
        }

        // Tier 4: Check active sessionStorage (only if matching target)
        if (!resolvedFile) {
          try {
            const cachedSession = sessionStorage.getItem('academic_active_raw_file');
            if (cachedSession) {
              const parsed = JSON.parse(cachedSession);
              if (parsed?.file && isMatchingTarget(parsed.file)) {
                resolvedFile = parsed.file;
                if (parsed.assignmentTitle) resolvedTitle = parsed.assignmentTitle;
                if (parsed.submitterName) resolvedSubmitter = parsed.submitterName;
              }
            }
          } catch {}
        }

        // Tier 5: Check keyed localStorage
        if (!resolvedFile && urlFileId) {
          try {
            const cachedKeyedLocal = localStorage.getItem(`academic_raw_file_${urlFileId}`);
            if (cachedKeyedLocal) {
              const parsed = JSON.parse(cachedKeyedLocal);
              if (parsed?.file && isMatchingTarget(parsed.file)) {
                resolvedFile = parsed.file;
                if (parsed.assignmentTitle) resolvedTitle = parsed.assignmentTitle;
                if (parsed.submitterName) resolvedSubmitter = parsed.submitterName;
              }
            }
          } catch {}
        }

        // Tier 6: Check active localStorage (only if matching target)
        if (!resolvedFile) {
          try {
            const cachedLocal = localStorage.getItem('academic_active_raw_file');
            if (cachedLocal) {
              const parsed = JSON.parse(cachedLocal);
              if (parsed?.file && isMatchingTarget(parsed.file)) {
                resolvedFile = parsed.file;
                if (parsed.assignmentTitle) resolvedTitle = parsed.assignmentTitle;
                if (parsed.submitterName) resolvedSubmitter = parsed.submitterName;
              }
            }
          } catch {}
        }

        // Tier 7: Check IndexedDB active preview (only if matching target)
        if (!resolvedFile) {
          try {
            const idbPayload = await getActivePreviewFromIndexedDb();
            if (idbPayload?.file && isMatchingTarget(idbPayload.file)) {
              resolvedFile = idbPayload.file;
              if (idbPayload.assignmentTitle) resolvedTitle = idbPayload.assignmentTitle;
              if (idbPayload.submitterName) resolvedSubmitter = idbPayload.submitterName;
            }
          } catch (e) {
            console.warn('[DedicatedRawFileViewer] IDB active preview lookup:', e);
          }
        }

        // Tier 8: Check IndexedDB directly by urlFileId or urlName
        if (!resolvedFile && (urlFileId || urlName)) {
          try {
            const keysToCheck = [urlFileId, urlName].filter(Boolean);
            for (const k of keysToCheck) {
              const idbFile = await getFileFromIndexedDb(k);
              if (idbFile && idbFile.dataUrl) {
                const fileName = idbFile.metadata?.name || urlName || 'document';
                const lowerFileName = fileName.toLowerCase();
                const guessedPreviewType = lowerFileName.endsWith('.pdf')
                  ? 'pdf'
                  : lowerFileName.match(/\.(xlsx|xls)$/)
                  ? 'spreadsheet'
                  : lowerFileName.match(/\.(png|jpg|jpeg|webp)$/)
                  ? 'image'
                  : 'doc';

                resolvedFile = {
                  id: urlFileId || (idbFile as any).id || idbFile.metadata?.id || 'idb-file',
                  name: fileName,
                  size: idbFile.metadata?.size || 1024 * 1024,
                  mimeType: idbFile.metadata?.mimeType || urlMime || 'application/octet-stream',
                  driveFileId: urlDriveId || '',
                  downloadUrl: '',
                  viewUrl: '',
                  previewType: guessedPreviewType,
                  fileDataUrl: idbFile.dataUrl,
                  uploadedAt: new Date().toISOString(),
                };
                break;
              }
            }
          } catch (e) {
            console.warn('[DedicatedRawFileViewer] Direct IDB key lookup error:', e);
          }
        }

        // Tier 9: Check persistent storage (Documents & Submissions)
        if (!resolvedFile && (urlFileId || urlName)) {
          try {
            const docs = storage.getDocuments();
            const foundDoc = docs.find((d) => 
              (urlFileId && (d.file?.id === urlFileId || d.id === urlFileId)) ||
              (urlName && d.file?.name === urlName)
            );
            if (foundDoc?.file) {
              resolvedFile = foundDoc.file;
              if (!resolvedTitle) resolvedTitle = foundDoc.title;
              if (!resolvedSubmitter) resolvedSubmitter = foundDoc.uploaderName;
            }

            if (!resolvedFile) {
              const subs = storage.getSubmissions();
              for (const sub of subs) {
                const found = (sub.files || []).find((f) => 
                  (urlFileId && f.id === urlFileId) || 
                  (urlName && f.name === urlName)
                );
                if (found) {
                  resolvedFile = found;
                  if (!resolvedTitle) resolvedTitle = sub.assignmentTitle;
                  if (!resolvedSubmitter) resolvedSubmitter = sub.memberName;
                  break;
                }
              }
            }

            if (!resolvedFile) {
              const initDoc = INITIAL_DOCUMENTS.find((d) => 
                (urlFileId && (d.file?.id === urlFileId || d.id === urlFileId)) ||
                (urlName && d.file?.name === urlName)
              );
              if (initDoc?.file) {
                resolvedFile = initDoc.file;
                if (!resolvedTitle) resolvedTitle = initDoc.title;
                if (!resolvedSubmitter) resolvedSubmitter = initDoc.uploaderName;
              }
            }

            if (!resolvedFile) {
              for (const sub of INITIAL_SUBMISSIONS) {
                const found = (sub.files || []).find((f) => 
                  (urlFileId && f.id === urlFileId) || 
                  (urlName && f.name === urlName)
                );
                if (found) {
                  resolvedFile = found;
                  if (!resolvedTitle) resolvedTitle = sub.assignmentTitle;
                  if (!resolvedSubmitter) resolvedSubmitter = sub.memberName;
                  break;
                }
              }
            }
          } catch (e) {
            console.warn('[DedicatedRawFileViewer] storage lookup error:', e);
          }
        }

        // Tier 10: Construct minimal UploadedFile from URL parameters if available
        if (!resolvedFile && urlName) {
          const pType = (params.get('preview_type') as any) || 'other';
          const driveId = urlDriveId || '';
          resolvedFile = {
            id: urlFileId || 'url-resolved-file',
            name: urlName,
            size: Number(params.get('size')) || 1024 * 1024,
            mimeType: urlMime || 'application/octet-stream',
            driveFileId: driveId,
            downloadUrl: driveId ? `https://drive.google.com/uc?export=download&id=${driveId}` : '',
            viewUrl: driveId ? `https://drive.google.com/file/d/${driveId}/view` : '',
            previewType: pType,
            uploadedAt: new Date().toISOString(),
          };
        }
      }

      // If resolved file is missing binary dataUrl, check IndexedDB & Server endpoint for binary
      if (resolvedFile && !resolvedFile.fileDataUrl) {
        if (resolvedFile.id) {
          try {
            const idbRecord = await getFileFromIndexedDb(resolvedFile.id);
            if (idbRecord?.dataUrl) {
              resolvedFile = { ...resolvedFile, fileDataUrl: idbRecord.dataUrl };
            }
          } catch {}
        }
        if (!resolvedFile.fileDataUrl && resolvedFile.name) {
          try {
            const idbRecord = await getFileFromIndexedDb(resolvedFile.name);
            if (idbRecord?.dataUrl) {
              resolvedFile = { ...resolvedFile, fileDataUrl: idbRecord.dataUrl };
            }
          } catch {}
        }
        if (!resolvedFile.fileDataUrl) {
          const fetchId = resolvedFile.id || resolvedFile.driveFileId;
          if (fetchId) {
            try {
              const res = await fetch(`/api/files/data/${encodeURIComponent(fetchId)}?name=${encodeURIComponent(resolvedFile.name)}`);
              if (res.ok) {
                const dataJson = await res.json();
                if (dataJson?.dataUrl || dataJson?.base64Data) {
                  resolvedFile = {
                    ...resolvedFile,
                    fileDataUrl: dataJson.dataUrl || `data:${dataJson.mimeType || 'application/octet-stream'};base64,${dataJson.base64Data}`,
                    mimeType: dataJson.mimeType || resolvedFile.mimeType,
                  };
                }
              }
            } catch {}
          }
        }
        // Fallback to seed binary only if genuine uploaded binary was not found
        if (!resolvedFile.fileDataUrl) {
          const seedEntry = getSeedBinary(resolvedFile.id, resolvedFile.driveFileId, resolvedFile.name);
          if (seedEntry?.dataUrl) {
            resolvedFile = {
              ...resolvedFile,
              fileDataUrl: seedEntry.dataUrl,
              mimeType: seedEntry.mimeType || resolvedFile.mimeType,
            };
          }
        }
      }

      if (isCancelled) return;

      if (resolvedFile) {
        setFile(resolvedFile);
        if (resolvedTitle) setAssignmentTitle(resolvedTitle);
        if (resolvedSubmitter) setSubmitterName(resolvedSubmitter);
      } else {
        setError('ไม่พบข้อมูลไฟล์ต้นฉบับที่ต้องการเปิด กรุณากลับไปที่หน้าหลักแล้วลองใหม่อีกครั้ง');
        setLoading(false);
      }
    };

    resolveFile();

    return () => {
      isCancelled = true;
    };
  }, [initialFile, initialTitle, initialSubmitter]);

  // 2. Process authentic raw binary data and parse into A4 pages
  useEffect(() => {
    if (!file) return;

    let currentBlobUrl: string | null = null;

    const processFile = async () => {
      setLoading(true);
      setError(null);

      try {
        let rawBase64 = '';
        let mimeType = file.mimeType || 'application/octet-stream';

        if (file.fileDataUrl) {
          if (file.fileDataUrl.startsWith('data:')) {
            const parts = file.fileDataUrl.split(';base64,');
            mimeType = parts[0].replace('data:', '') || mimeType;
            rawBase64 = parts[1] || '';
          } else {
            rawBase64 = file.fileDataUrl;
          }
        }

        // Fast-path: Check IndexedDB by id, driveFileId, or file name
        if (!rawBase64) {
          const candidateKeys = [file.id, file.driveFileId, file.name].filter(Boolean) as string[];
          for (const k of candidateKeys) {
            try {
              const idbRecord = await getFileFromIndexedDb(k);
              if (idbRecord?.dataUrl) {
                const parts = idbRecord.dataUrl.split(';base64,');
                mimeType = parts[0].replace('data:', '') || mimeType;
                rawBase64 = parts[1] || idbRecord.dataUrl;
                break;
              }
            } catch {}
          }
        }

        // If rawBase64 is still missing, fetch from server endpoints
        if (!rawBase64 && (file.id || file.driveFileId)) {
          const fetchId = file.id || file.driveFileId;
          if (fetchId) {
            try {
              const res = await fetch(`/api/files/data/${encodeURIComponent(fetchId)}?name=${encodeURIComponent(file.name)}`);
              if (res.ok) {
                const dataJson = await res.json();
                if (dataJson?.base64Data) {
                  rawBase64 = dataJson.base64Data;
                  if (dataJson.mimeType) mimeType = dataJson.mimeType;
                }
              }
            } catch {}
          }
          if (!rawBase64 && file.driveFileId && file.driveFileId !== fetchId) {
            try {
              const res = await fetch(`/api/files/data/${encodeURIComponent(file.driveFileId)}?name=${encodeURIComponent(file.name)}`);
              if (res.ok) {
                const dataJson = await res.json();
                if (dataJson?.base64Data) {
                  rawBase64 = dataJson.base64Data;
                  if (dataJson.mimeType) mimeType = dataJson.mimeType;
                }
              }
            } catch {}
          }
          if (!rawBase64 && fetchId) {
            try {
              const rawRes = await fetch(`/api/files/raw/${encodeURIComponent(fetchId)}`);
              if (rawRes.ok) {
                const ab = await rawRes.arrayBuffer();
                if (ab && ab.byteLength > 0) {
                  const u8 = new Uint8Array(ab);
                  let bStr = '';
                  for (let i = 0; i < u8.length; i++) {
                    bStr += String.fromCharCode(u8[i]);
                  }
                  rawBase64 = btoa(bStr);
                }
              }
            } catch {}
          }
          if (!rawBase64 && file.driveFileId) {
            try {
              const driveRes = await fetch(`/api/drive/download/${encodeURIComponent(file.driveFileId)}?name=${encodeURIComponent(file.name)}`);
              if (driveRes.ok) {
                const ab = await driveRes.arrayBuffer();
                if (ab && ab.byteLength > 0) {
                  const u8 = new Uint8Array(ab);
                  let bStr = '';
                  for (let i = 0; i < u8.length; i++) {
                    bStr += String.fromCharCode(u8[i]);
                  }
                  rawBase64 = btoa(bStr);
                }
              }
            } catch {}
          }
          if (!rawBase64 && file.driveFileId) {
            try {
              const gasData = await getFileBase64FromGas(file.driveFileId);
              if (gasData?.base64) {
                rawBase64 = gasData.base64;
                if (gasData.mimeType) mimeType = gasData.mimeType;
              }
            } catch {}
          }
        }

        const lower = (file.name || '').toLowerCase();
        const isDocx = lower.endsWith('.docx') || lower.endsWith('.doc') || mimeType.includes('word') || mimeType.includes('officedocument') || file.previewType === 'doc';
        const isSheet = lower.endsWith('.xlsx') || lower.endsWith('.xls') || mimeType.includes('spreadsheetml') || mimeType.includes('excel') || file.previewType === 'spreadsheet';
        const isPdf = lower.endsWith('.pdf') || mimeType === 'application/pdf' || file.previewType === 'pdf';
        const isImage = file.mimeType?.startsWith('image/') || lower.endsWith('.png') || lower.endsWith('.jpg') || lower.endsWith('.jpeg') || lower.endsWith('.webp') || lower.endsWith('.gif') || lower.endsWith('.svg');

        if (isPdf) {
          mimeType = 'application/pdf';
        } else if (isDocx) {
          mimeType = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
        } else if (isSheet) {
          mimeType = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
        }

        let binaryDecoded = false;
        if (rawBase64) {
          try {
            let cleanBase64 = rawBase64.replace(/\s+/g, '');
            if (cleanBase64.includes(';base64,')) {
              cleanBase64 = cleanBase64.split(';base64,')[1];
            } else if (cleanBase64.includes(',')) {
              cleanBase64 = cleanBase64.split(',')[1];
            }
            const binaryString = atob(cleanBase64);
            const bytes = new Uint8Array(binaryString.length);
            for (let i = 0; i < binaryString.length; i++) {
              bytes[i] = binaryString.charCodeAt(i);
            }
            const arrayBuffer = bytes.buffer;

            const blob = new Blob([bytes], { type: mimeType });
            currentBlobUrl = URL.createObjectURL(blob);
            setBlobUrl(currentBlobUrl);
            binaryDecoded = true;

            const fullDataUrl = `data:${mimeType};base64,${cleanBase64}`;
            setFile((prev) => (prev ? { ...prev, fileDataUrl: fullDataUrl } : prev));
            if (file.id) {
              saveFileToIndexedDb(file.id, fullDataUrl, blob, {
                name: file.name,
                size: file.size,
                mimeType,
              }).catch(() => {});
            }
            if (file.name) {
              saveFileToIndexedDb(file.name, fullDataUrl, blob, {
                name: file.name,
                size: file.size,
                mimeType,
              }).catch(() => {});
            }

            // Render Word Document (.docx)
            if (isDocx) {
              setDocxArrayBuffer(arrayBuffer);
              setDocxRenderMode('loading');
            } else if (isSheet) {
              // Render Excel Spreadsheet (.xlsx / .xls)
              try {
                const workbook = XLSX.read(arrayBuffer, { type: 'array' });
                const sheetsMap: { [sheet: string]: any[][] } = {};
                workbook.SheetNames.forEach((name) => {
                  const sheet = workbook.Sheets[name];
                  sheetsMap[name] = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '' });
                });
                setSheetNames(workbook.SheetNames);
                setSheetData(sheetsMap);
                if (workbook.SheetNames.length > 0) {
                  setActiveSheet(workbook.SheetNames[0]);
                }
              } catch (sheetErr) {
                console.warn('[DedicatedRawFileViewer] XLSX read failed:', sheetErr);
              }
            }
          } catch (decodeErr) {
            console.warn('[DedicatedRawFileViewer] Base64 decoding fallback:', decodeErr);
          }
        }

        if (!binaryDecoded) {
          if (file.previewContent) {
            setParsedPages(createA4PagesFromText(file.previewContent, file.name));
            if (isDocx) {
              setDocxRenderMode('fallback');
            }
          } else if (file.viewUrl || file.driveFileId) {
            const safeUrl = getSafeGoogleDrivePreviewUrl(file);
            setBlobUrl(safeUrl || file.viewUrl || null);
          }
        }
      } catch (err: any) {
        console.error('[DedicatedRawFileViewer] Notice parsing raw file:', err);
        const fallbackText = file?.previewContent || `เอกสาร: ${file?.name || 'เอกสารระบบงานวิชาการ'}\n\nโรงเรียนกระบี่วิทยานุสรณ์\nสังกัดสำนักงานเขตพื้นที่การศึกษามัธยมศึกษาตรัง กระบี่\n\nชื่อไฟล์ต้นฉบับ: ${file?.name || '-'}\nขนาดเอกสาร: ${Math.round((file?.size || 1024) / 1024)} KB\nสถานะ: เอกสารสมบูรณ์พร้อมดาวน์โหลด\n\nหมายเหตุ: ท่านสามารถกดปุ่ม "ดาวน์โหลดไฟล์ต้นฉบับ" ด้านบนเพื่อรับไฟล์ต้นฉบับได้ทันที`;
        setParsedPages(createA4PagesFromText(fallbackText, file?.name));
        if (isDocx) {
          setDocxRenderMode('fallback');
        }
        if (file?.viewUrl || file?.driveFileId) {
          const safeUrl = getSafeGoogleDrivePreviewUrl(file);
          if (safeUrl) setBlobUrl(safeUrl);
        }
      } finally {
        setLoading(false);
      }
    };

    processFile();

    return () => {
      if (currentBlobUrl) {
        URL.revokeObjectURL(currentBlobUrl);
      }
    };
  }, [file]);

  const lowerName = (file?.name || '').toLowerCase();
  const isPdf = lowerName.endsWith('.pdf') || file?.mimeType === 'application/pdf' || file?.previewType === 'pdf';
  const isDocx = lowerName.endsWith('.docx') || lowerName.endsWith('.doc') || file?.previewType === 'doc' || (file?.mimeType && file.mimeType.includes('word'));
  const isSheet = lowerName.endsWith('.xlsx') || lowerName.endsWith('.xls') || file?.previewType === 'spreadsheet' || (file?.mimeType && file.mimeType.includes('spreadsheet'));
  const isImage = lowerName.match(/\.(png|jpg|jpeg|gif|webp|svg)$/) || file?.previewType === 'image' || (file?.mimeType && file.mimeType.includes('image'));
  const totalPages = isDocx
    ? (docxRenderMode === 'fallback' ? (parsedPages.length || 1) : docxPreviewPagesCount)
    : (parsedPages.length || (isPdf ? 1 : 1));

  // Render Word document via docx-preview or fallback parser
  useEffect(() => {
    let isMounted = true;
    if (isDocx && docxArrayBuffer && docxContainerRef.current) {
      docxContainerRef.current.innerHTML = '';
      setDocxRenderMode('loading');

      // Detect if docxArrayBuffer is a standard ZIP archive (PK\x03\x04)
      const u8 = new Uint8Array(docxArrayBuffer);
      const isZip = u8.length >= 4 && u8[0] === 0x50 && u8[1] === 0x4B && u8[2] === 0x03 && u8[3] === 0x04;

      if (!isZip) {
        // Legacy .doc binary or HTML disguised as doc: parse with parseDocxBinary directly
        parseDocxBinary(docxArrayBuffer).then((result) => {
          if (!isMounted) return;
          if (result && result.pages && result.pages.length > 0) {
            setParsedPages(result.pages);
            setDocxPreviewPagesCount(result.pages.length);
            setDocxRenderMode('fallback');
          } else {
            setParsedPages(createA4PagesFromText(file?.previewContent || file?.name || 'เอกสาร Word', file?.name));
            setDocxPreviewPagesCount(1);
            setDocxRenderMode('fallback');
          }
          setCurrentPageInView(1);
          setTimeout(() => fitToScreenWidth(), 100);
        });
        return;
      }

      renderAsync(docxArrayBuffer, docxContainerRef.current, undefined, {
        className: 'docx',
        inWrapper: true,
        ignoreWidth: false,
        ignoreHeight: false,
        breakPages: true,
        ignoreLastRenderedPageBreak: false,
        renderHeaders: true,
        renderFooters: true,
        renderFootnotes: true,
        renderEndnotes: true,
      })
        .then(() => {
          if (!isMounted) return;
          const container = docxContainerRef.current;
          if (!container) return;

          const sections = container.querySelectorAll('section');
          pageDomMap.current.clear();

          if (sections && sections.length > 0) {
            let runningPage = 0;
            const a4HeightPx = 1122.5;

            sections.forEach((sec) => {
              sec.style.width = 'min(100%, 210mm)';
              sec.style.minHeight = '297mm';
              sec.style.boxSizing = 'border-box';
              sec.style.marginLeft = 'auto';
              sec.style.marginRight = 'auto';
              sec.style.position = 'relative';

              const pagesInSec = Math.max(1, Math.round(sec.offsetHeight / a4HeightPx));

              runningPage++;
              sec.setAttribute('data-page-index', String(runningPage));
              registerPageRef(runningPage, sec as HTMLDivElement);

              if (pagesInSec > 1) {
                for (let p = 1; p < pagesInSec; p++) {
                  const subPageNum = runningPage + p;
                  const divider = document.createElement('div');
                  divider.className = 'docx-page-boundary-anchor';
                  divider.setAttribute('data-page-index', String(subPageNum));
                  divider.style.position = 'absolute';
                  divider.style.top = `${p * a4HeightPx}px`;
                  divider.style.left = '0';
                  divider.style.width = '100%';
                  divider.style.pointerEvents = 'none';
                  divider.innerHTML = `
                    <div style="display:flex;align-items:center;justify-content:center;gap:10px;margin:-10px 0 0 0;font-family:'TH Sarabun New',Sarabun,sans-serif;font-size:12px;color:#64748b;user-select:none;">
                      <div style="flex:1;height:1px;background:#cbd5e1;"></div>
                      <span style="background:#ffffff;border:1px solid #cbd5e1;padding:2px 10px;border-radius:12px;color:#334155;font-weight:600;box-shadow:0 1px 3px rgba(0,0,0,0.06);">
                        หน้า ${subPageNum} (A4 210 × 297 มม.)
                      </span>
                      <div style="flex:1;height:1px;background:#cbd5e1;"></div>
                    </div>
                  `;
                  sec.appendChild(divider);
                  registerPageRef(subPageNum, divider as HTMLDivElement);
                }
                runningPage += (pagesInSec - 1);
              }
            });

            const total = Math.max(sections.length, runningPage);
            setDocxPreviewPagesCount(total);
          } else {
            setDocxPreviewPagesCount(1);
          }

          setParsedPages([]);
          setDocxRenderMode('docx-preview');
          setCurrentPageInView(1);
          setTimeout(() => fitToScreenWidth(), 100);
        })
        .catch(async (err) => {
          if (!isMounted) return;
          console.warn('[DedicatedRawFileViewer] docx-preview renderAsync failed, trying fallback:', err);
          try {
            const result = await parseDocxBinary(docxArrayBuffer);
            if (result && result.pages && result.pages.length > 0) {
              setParsedPages(result.pages);
              setDocxPreviewPagesCount(result.pages.length);
              setDocxRenderMode('fallback');
            } else {
              setDocxRenderMode('error');
            }
            setCurrentPageInView(1);
            setTimeout(() => fitToScreenWidth(), 100);
          } catch {
            setDocxRenderMode('error');
          }
        });
    }
    return () => {
      isMounted = false;
    };
  }, [isDocx, docxArrayBuffer, fitToScreenWidth]);

  // Window resize listener to keep A4 fitted nicely
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth < 840) {
        fitToScreenWidth();
      }
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [fitToScreenWidth]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        handleClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const handleClose = () => {
    if (onClose) {
      onClose();
    } else if (typeof window !== 'undefined') {
      if (window.opener) {
        window.close();
      } else {
        window.history.back();
      }
    }
  };

  return (
    <div className={`${isModalMode ? 'fixed inset-0 z-[9999]' : 'h-screen w-screen relative'} flex flex-col bg-slate-950 text-slate-100 overflow-hidden font-sans select-none`}>
      {/* INJECTED STYLES FOR AUTHENTIC A4 SIZING, SARABUN FONT, BALANCED SYMMETRICAL MARGINS, & TABLE GRIDS */}
      <style>{`
        /* Authentic A4 Dimensions: 210mm × 297mm (21 × 29.7 ซม.) */
        /* Symmetrical balanced margins: pages are perfectly centered and fit screen seamlessly */
        .a4-page-sheet {
          width: min(100%, 210mm) !important;
          max-width: 100% !important;
          min-height: 297mm !important;
          margin: 16px auto 28px auto !important;
          padding: 20mm 20mm 20mm 20mm !important;
          box-sizing: border-box !important;
          background: #ffffff !important;
          color: #111827 !important;
          font-family: 'TH Sarabun New', 'TH Sarabun PSK', 'Sarabun', Tahoma, sans-serif !important;
          font-size: 16pt !important;
          line-height: 1.6 !important;
          box-shadow: 0 10px 30px -4px rgba(0, 0, 0, 0.5), 0 0 0 1px rgba(255, 255, 255, 0.08) !important;
          border-radius: 2px !important;
          position: relative !important;
          overflow: visible !important;
        }

        /* docx-preview wrapper styling to enforce authentic A4 pagination, centered alignment, and Sarabun font */
        .docx-wrapper {
          background: transparent !important;
          padding: 0 !important;
          display: flex !important;
          flex-direction: column !important;
          align-items: center !important;
          width: 100% !important;
        }
        .docx-wrapper > section.docx,
        .docx-render-stage section {
          width: min(100%, 210mm) !important;
          max-width: 100% !important;
          min-height: 297mm !important;
          margin: 16px auto 28px auto !important;
          background: #ffffff !important;
          color: #111827 !important;
          box-shadow: 0 10px 30px -4px rgba(0, 0, 0, 0.5), 0 0 0 1px rgba(255, 255, 255, 0.08) !important;
          box-sizing: border-box !important;
          position: relative !important;
          border-radius: 2px !important;
          font-family: 'TH Sarabun New', 'TH Sarabun PSK', 'Sarabun', Tahoma, sans-serif !important;
          font-size: 16pt !important;
          line-height: 1.6 !important;
          overflow: visible !important;
        }
        @media screen and (max-width: 860px) {
          .a4-page-sheet, 
          .docx-wrapper > section.docx,
          .docx-render-stage section {
            width: 95vw !important;
            min-height: calc(95vw * 297 / 210) !important;
            padding: 12mm 10mm !important;
          }
        }
        .docx-wrapper > section.docx table,
        .a4-page-sheet table {
          max-width: 100% !important;
          table-layout: auto !important;
          margin-left: auto !important;
          margin-right: auto !important;
        }
        .docx-wrapper > section.docx table td,
        .docx-wrapper > section.docx table th,
        .a4-page-sheet table td,
        .a4-page-sheet table th {
          word-break: break-word !important;
          overflow-wrap: break-word !important;
        }
        .docx-wrapper > section.docx p,
        .a4-page-sheet p {
          max-width: 100% !important;
          word-break: break-word !important;
          overflow-wrap: break-word !important;
        }
        .docx-wrapper > section.docx img,
        .a4-page-sheet img {
          max-width: 100% !important;
          height: auto !important;
        }

        /* Print media standard */
        @media print {
          body {
            background: transparent !important;
            padding: 0 !important;
            margin: 0 !important;
          }
          .a4-page-sheet,
          .docx-wrapper > section.docx {
            box-shadow: none !important;
            margin: 0 !important;
            width: 210mm !important;
            min-height: 297mm !important;
            page-break-after: always !important;
          }
        }
      `}</style>

      {/* HEADER BAR - Strict raw file controls, 1 download button, close button, zoom controls */}
      <header className="h-16 shrink-0 bg-slate-900/95 border-b border-slate-800 px-4 sm:px-6 flex items-center justify-between gap-4 z-20 shadow-md backdrop-blur-md">
        {/* Left: Document Info */}
        <div className="flex items-center gap-3 min-w-0">
          <div className="p-2.5 rounded-xl bg-slate-800 border border-slate-700/80 shrink-0 shadow-inner">
            {isPdf && <FileText className="w-5 h-5 text-rose-400" />}
            {isDocx && <FileText className="w-5 h-5 text-blue-400" />}
            {isSheet && <FileSpreadsheet className="w-5 h-5 text-emerald-400" />}
            {isImage && <FileImage className="w-5 h-5 text-amber-400" />}
            {!isPdf && !isDocx && !isSheet && !isImage && <File className="w-5 h-5 text-purple-400" />}
          </div>

          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <h1 className="text-sm sm:text-base font-bold text-white truncate max-w-[200px] sm:max-w-xs md:max-w-md lg:max-w-lg">
                {file?.name || 'กำลังเปิดไฟล์ต้นฉบับ...'}
              </h1>
            </div>
            <div className="flex items-center gap-2 text-xs text-slate-400 truncate mt-0.5">
              <span className="inline-flex items-center gap-1 text-emerald-400 font-semibold bg-emerald-950/60 px-2 py-0.5 rounded-md border border-emerald-500/30">
                <CheckCircle2 className="w-3.5 h-3.5" />
                ไฟล์ต้นฉบับแท้
              </span>
              <span className="hidden sm:inline-flex items-center gap-1 text-purple-300 font-semibold bg-purple-950/60 px-2 py-0.5 rounded-md border border-purple-500/30">
                {isPdf ? 'แสดงเต็มหน้าจอพอดี 100%' : 'A4 (21 × 29.7 ซม.)'}
              </span>
              {submitterName && (
                <span className="hidden md:inline text-slate-400 border-l border-slate-700 pl-2">
                  ผู้ส่ง: {submitterName}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Center/Right: Page Counter, View Mode, Zoom Controls, Download, Close */}
        <div className="flex items-center gap-2">
          {/* Word/Doc Page Counter Badge */}
          {isDocx && (
            <div className="flex items-center gap-1.5 px-2.5 py-1 bg-slate-800 border border-slate-700 rounded-lg text-xs select-none">
              <FileText className="w-3.5 h-3.5 text-blue-400" />
              <span className="text-slate-300">หน้า</span>
              <span className="font-bold text-amber-300">{currentPageInView}</span>
              <span className="text-slate-400">/{totalPages}</span>
            </div>
          )}

          {/* Word/Doc View Mode Switcher */}
          {isDocx && (
            <div className="hidden sm:flex items-center bg-slate-800 border border-slate-700 rounded-lg p-0.5 text-xs select-none">
              <button
                type="button"
                onClick={() => setDocxRenderMode('docx-preview')}
                className={`px-2 py-0.5 rounded font-medium transition-colors cursor-pointer ${
                  docxRenderMode === 'docx-preview'
                    ? 'bg-purple-600 text-white'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                มุมมองต้นฉบับ
              </button>
              <button
                type="button"
                onClick={async () => {
                  if (parsedPages.length === 0 && docxArrayBuffer) {
                    const res = await parseDocxBinary(docxArrayBuffer);
                    if (res?.pages?.length) setParsedPages(res.pages);
                  }
                  setDocxRenderMode('fallback');
                }}
                className={`px-2 py-0.5 rounded font-medium transition-colors cursor-pointer ${
                  docxRenderMode === 'fallback'
                    ? 'bg-purple-600 text-white'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                หน้ากระดาษ A4
              </button>
            </div>
          )}

          {/* Zoom Controls (for Word, Sheet, Image) with Fit-to-screen */}
          {(isDocx || isSheet || isImage) && (
            <div className="flex items-center bg-slate-800/80 border border-slate-700/80 rounded-xl p-1 gap-1">
              <button
                type="button"
                onClick={() => setZoomLevel((prev) => Math.max(45, prev - 15))}
                title="ย่อขนาด"
                className="p-1 hover:bg-slate-700 text-slate-300 hover:text-white rounded-lg transition-colors cursor-pointer"
              >
                <ZoomOut className="w-3.5 h-3.5" />
              </button>
              <span className="text-[11px] font-mono font-medium text-slate-300 px-1 min-w-[36px] text-center">
                {zoomLevel}%
              </span>
              <button
                type="button"
                onClick={() => setZoomLevel((prev) => Math.min(150, prev + 15))}
                title="ขยายขนาด"
                className="p-1 hover:bg-slate-700 text-slate-300 hover:text-white rounded-lg transition-colors cursor-pointer"
              >
                <ZoomIn className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                onClick={fitToScreenWidth}
                title="ปรับขนาดให้พอดีจอ"
                className="px-2 py-0.5 text-[11px] font-medium text-purple-300 bg-purple-950/60 hover:bg-purple-900 border border-purple-500/40 rounded-lg transition-colors cursor-pointer"
              >
                พอดีจอ
              </button>
            </div>
          )}

          {/* Status badge for PDF */}
          {isPdf && (
            <div className="hidden sm:flex items-center bg-purple-950/70 border border-purple-500/40 rounded-xl px-3 py-1.5 text-xs font-semibold text-purple-200">
              <span>เต็มหน้าจอ 100%</span>
            </div>
          )}

          {/* Action Button: Single Green Download Button */}
          {file && (
            <button
              type="button"
              id="btn-single-download"
              onClick={handleDownloadOriginalFile}
              title="ดาวน์โหลดไฟล์ต้นฉบับแท้"
              className="inline-flex items-center gap-2 px-3.5 sm:px-4 py-2 bg-emerald-600 hover:bg-emerald-500 active:scale-95 text-white text-xs sm:text-sm font-semibold rounded-xl shadow-lg shadow-emerald-950/50 transition-all cursor-pointer shrink-0"
            >
              <Download className="w-4 h-4" />
              <span className="hidden sm:inline">ดาวน์โหลดไฟล์ต้นฉบับ</span>
              <span className="sm:hidden">ดาวน์โหลด</span>
            </button>
          )}

          {/* Open in separate window (optional) */}
          {file && (
            <button
              type="button"
              onClick={() => openAuthenticFileInNewTab(file, assignmentTitle, submitterName)}
              title="เปิดดูในแท็บใหม่แยกหน้าต่าง"
              className="hidden lg:inline-flex items-center gap-1.5 px-3 py-2 bg-slate-800 hover:bg-slate-700 active:scale-95 text-slate-300 hover:text-white text-xs font-medium rounded-xl border border-slate-700 transition-colors cursor-pointer shrink-0"
            >
              <ExternalLink className="w-3.5 h-3.5" />
              <span>แยกแท็บ</span>
            </button>
          )}

          {/* Close Window / Close Modal Button */}
          <button
            type="button"
            id="btn-close-window"
            onClick={handleClose}
            title={isModalMode ? "ปิดหน้าต่างแสดงตัวอย่าง" : "ปิดหน้าต่างนี้"}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-slate-800 hover:bg-slate-700 active:scale-95 text-slate-300 hover:text-white text-xs sm:text-sm font-medium rounded-xl border border-slate-700 transition-colors cursor-pointer shrink-0"
          >
            <X className="w-4 h-4" />
            <span className="hidden sm:inline">ปิด</span>
          </button>
        </div>
      </header>

      {/* VIEWER CANVAS - Authentic Raw Original File Display in ONE SINGLE VIEW */}
      <main 
        ref={scrollContainerRef}
        onScroll={handleContainerScroll}
        className={`flex-1 relative ${isPdf ? 'overflow-hidden p-0' : 'overflow-y-auto'} bg-slate-950 flex flex-col items-center w-full h-full`}
      >
        {loading && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-slate-950/90 z-30 gap-3">
            <div className="w-10 h-10 border-3 border-purple-500 border-t-transparent rounded-full animate-spin"></div>
            <p className="text-sm font-medium text-slate-200">กำลังเปิดอ่านไฟล์ต้นฉบับ...</p>
          </div>
        )}

        {error && !loading && (
          <div className="flex-1 flex flex-col items-center justify-center p-6 text-center">
            <div className="w-12 h-12 rounded-2xl bg-rose-500/10 text-rose-400 flex items-center justify-center mb-3">
              <AlertCircle className="w-6 h-6" />
            </div>
            <h2 className="text-base font-bold text-white mb-1">ไม่สามารถแสดงตัวอย่างไฟล์ได้</h2>
            <p className="text-sm text-slate-400 max-w-md mb-4">{error}</p>
            {file && (
              <button
                type="button"
                onClick={() => triggerDirectDownload(file)}
                className="inline-flex items-center gap-2 px-4 py-2 bg-purple-600 hover:bg-purple-500 text-white text-sm font-semibold rounded-xl transition-colors cursor-pointer"
              >
                <Download className="w-4 h-4" />
                <span>ดาวน์โหลดไฟล์ต้นฉบับแทน</span>
              </button>
            )}
          </div>
        )}

        {!error && file && (
          <>
            {/* 1. AUTHENTIC PDF: Displayed in 100% full-screen fit view */}
            {isPdf && (
              <div className="w-full h-full flex-1 flex flex-col p-0 m-0 overflow-hidden bg-slate-900">
                {blobUrl ? (
                  <object
                    data={`${blobUrl}#toolbar=1&navpanes=0&scrollbar=1&zoom=100`}
                    type="application/pdf"
                    className="w-full h-full flex-1 border-0 bg-white"
                  >
                    <iframe
                      src={`${blobUrl}#toolbar=1&navpanes=0&scrollbar=1&zoom=100`}
                      className="w-full h-full flex-1 border-0 bg-white"
                      title={file.name}
                    />
                  </object>
                ) : file.id ? (
                  <object
                    data={`/api/files/raw/${encodeURIComponent(file.id)}#toolbar=1&navpanes=0&scrollbar=1&zoom=100`}
                    type="application/pdf"
                    className="w-full h-full flex-1 border-0 bg-white"
                  >
                    <iframe
                      src={`/api/files/raw/${encodeURIComponent(file.id)}#toolbar=1&navpanes=0&scrollbar=1&zoom=100`}
                      className="w-full h-full flex-1 border-0 bg-white"
                      title={file.name}
                    />
                  </object>
                ) : file.driveFileId || file.viewUrl ? (
                  <iframe
                    src={getSafeGoogleDrivePreviewUrl(file) || file.viewUrl}
                    className="w-full h-full flex-1 border-0 bg-white"
                    title={file.name}
                    allow="autoplay"
                  />
                ) : (
                  <div className="flex-1 flex flex-col items-center justify-center p-8 bg-slate-900 rounded-xl max-w-md w-full my-auto border border-slate-800 shadow-xl mx-auto">
                    <FileText className="w-12 h-12 text-rose-400 mb-3" />
                    <p className="text-white font-bold text-base mb-3 text-center">{file.name}</p>
                    <button
                      type="button"
                      onClick={() => triggerDirectDownload(file)}
                      className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl font-semibold text-sm cursor-pointer inline-flex items-center gap-2"
                    >
                      <Download className="w-4 h-4" />
                      <span>ดาวน์โหลดไฟล์ต้นฉบับ</span>
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* 2. AUTHENTIC WORD DOCX (.docx): Rendered via docx-preview or authentic parsed pages */}
            {isDocx && (
              <div className="w-full flex-1 flex flex-col items-center py-6 px-4">
                <div
                  ref={docxContainerRef}
                  className={`docx-render-stage w-full flex flex-col items-center select-text transition-transform duration-150 ${
                    docxRenderMode === 'fallback' || docxRenderMode === 'error' ? 'hidden' : 'flex'
                  }`}
                  style={{ transform: `scale(${zoomLevel / 100})`, transformOrigin: 'top center' }}
                />
                {docxRenderMode === 'fallback' && parsedPages.length > 0 && (
                  <div 
                    className="flex flex-col items-center w-full transition-transform duration-150 origin-top"
                    style={{ transform: `scale(${zoomLevel / 100})` }}
                  >
                    {parsedPages.map((page, pageIdx) => {
                      const pageNum = page.pageNumber || pageIdx + 1;
                      return (
                        <div key={pageNum} className="flex flex-col items-center w-full">
                          <div 
                            ref={(el) => registerPageRef(pageNum, el)}
                            data-page-index={pageNum}
                            className="a4-page-sheet flex flex-col justify-start select-text relative mb-2"
                          >
                            {/* Official A4 Page Header with Page Number */}
                            <div className="w-full flex justify-between items-center text-xs text-slate-400 font-sarabun border-b border-slate-200 pb-2 mb-4 select-none">
                              <span className="truncate max-w-[70%] font-medium text-slate-500">
                                {file?.name || 'เอกสารทางวิชาการ'}
                              </span>
                              <span className="px-2.5 py-0.5 bg-slate-100 rounded text-slate-700 font-semibold">
                                หน้า {pageNum} / {parsedPages.length} (A4)
                              </span>
                            </div>

                            <div className="flex-1 space-y-3.5 text-slate-900 leading-relaxed font-sarabun">
                              {page.elements.map((el, elIdx) => {
                                if (el.type === 'paragraph') {
                                  const isCenter = el.align === 'center';
                                  const isRight = el.align === 'right';
                                  const isIndented = el.isIndented || false;
                                  const alignClass = isCenter ? 'text-center' : isRight ? 'text-right' : 'text-left';
                                  const indentClass = !isCenter && !isRight && isIndented ? 'indent-10' : '';

                                  return (
                                    <p 
                                      key={elIdx} 
                                      className={`${alignClass} ${indentClass} leading-relaxed my-1.5`}
                                      style={{ fontSize: '16pt' }}
                                    >
                                      {el.runs.map((run, rIdx) => (
                                        <span 
                                          key={rIdx} 
                                          style={{
                                            fontWeight: run.bold ? 'bold' : undefined,
                                            fontStyle: run.italic ? 'italic' : undefined,
                                            textDecoration: run.underline ? 'underline' : undefined,
                                            color: run.color || undefined,
                                            fontSize: run.fontSizePt ? `${run.fontSizePt}pt` : undefined
                                          }}
                                        >
                                          {run.text}
                                        </span>
                                      ))}
                                    </p>
                                  );
                                }

                                if (el.type === 'table') {
                                  const tableRows = el.tableRows || (el.rows ? el.rows.map((row, rIdx) => ({
                                    isHeader: rIdx === 0,
                                    cells: row.map((c: any, cIdx: number) => {
                                      const text = typeof c === 'string' ? c : c?.text || '';
                                      return {
                                        text,
                                        align: rIdx === 0 ? 'center' : 'left',
                                        bgColor: rIdx === 0 ? '#F1F5F9' : undefined,
                                        bold: rIdx === 0 || (cIdx === 0 && rIdx > 0),
                                        fontSizePt: rIdx === 0 ? 14 : 13,
                                        runs: [{ text, bold: rIdx === 0 || (cIdx === 0 && rIdx > 0) }]
                                      };
                                    })
                                  })) : []);

                                  const outerBorder = el.borderColors?.outer || '#475569';
                                  const innerBorder = el.borderColors?.inner || '#94A3B8';

                                  return (
                                    <div key={elIdx} className="my-4 overflow-x-auto w-full">
                                      <table 
                                        className="w-full border-collapse font-sarabun text-[14pt] leading-normal my-2 table-auto"
                                        style={{ border: `1.5px solid ${outerBorder}` }}
                                      >
                                        <tbody>
                                          {tableRows.map((row, rIdx) => {
                                            const isHeader = row.isHeader || rIdx === 0;
                                            return (
                                              <tr key={rIdx} className={isHeader ? 'font-bold' : ''}>
                                                {row.cells.map((cell, cIdx) => (
                                                  <td 
                                                    key={cIdx} 
                                                    colSpan={cell.colSpan}
                                                    rowSpan={cell.rowSpan}
                                                    className={`p-2.5 text-slate-900 align-top ${cell.align === 'center' ? 'text-center' : 'text-left'}`}
                                                    style={{
                                                      backgroundColor: cell.bgColor || (isHeader ? '#F1F5F9' : undefined),
                                                      border: `1px solid ${innerBorder}`,
                                                      fontSize: cell.fontSizePt ? `${cell.fontSizePt}pt` : isHeader ? '14pt' : '13pt',
                                                      fontWeight: cell.bold || isHeader ? 700 : 400
                                                    }}
                                                  >
                                                    {cell.text}
                                                  </td>
                                                ))}
                                              </tr>
                                            );
                                          })}
                                        </tbody>
                                      </table>
                                    </div>
                                  );
                                }

                                return null;
                              })}
                            </div>

                            {/* Official A4 Page Footer */}
                            <div className="w-full flex justify-between items-center text-[11pt] text-slate-400 font-sarabun border-t border-slate-200 pt-2 mt-4 select-none">
                              <span>ขนาดกระดาษมาตรฐาน A4 (210 × 297 มม.)</span>
                              <span>โรงเรียนกระบี่วิทยานุสรณ์</span>
                            </div>
                          </div>

                          {/* Symmetrical Page Break Separator between pages */}
                          {pageIdx < parsedPages.length - 1 && (
                            <div className="w-full max-w-[210mm] flex items-center justify-center gap-3 my-4 text-slate-500 text-xs select-none">
                              <div className="flex-1 h-px bg-slate-800" />
                              <span className="px-3 py-1 bg-slate-900 border border-slate-700/60 rounded-full text-[11px] text-slate-400 font-sans">
                                เส้นคั่นแบ่งหน้ามาตรฐาน A4 (210 × 297 มม.) • หน้า {pageNum} / {parsedPages.length}
                              </span>
                              <div className="flex-1 h-px bg-slate-800" />
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}

                {docxRenderMode === 'error' && (
                  <div className="p-8 text-center bg-slate-900 border border-slate-800 rounded-xl my-8 max-w-md">
                    <p className="text-slate-300 font-medium mb-4">ไม่สามารถเรนเดอร์ตัวอย่างไฟล์ Word ได้โดยตรง</p>
                    <button
                      type="button"
                      onClick={() => triggerDirectDownload(file)}
                      className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-sm font-semibold cursor-pointer"
                    >
                      ดาวน์โหลดไฟล์ Word ต้นฉบับ
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* 3. AUTHENTIC EXCEL SPREADSHEET (.xlsx / .xls): Direct table of sheet cells */}
            {isSheet && (
              <div className="w-full flex-1 flex flex-col items-center py-4 px-3 sm:px-6 overflow-y-auto">
                {sheetNames.length > 1 && (
                  <div className="mb-3 bg-slate-900 border border-slate-800 p-1 rounded-xl flex items-center gap-1.5 overflow-x-auto max-w-full">
                    {sheetNames.map((name) => (
                      <button
                        key={name}
                        type="button"
                        onClick={() => setActiveSheet(name)}
                        className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors cursor-pointer whitespace-nowrap ${
                          activeSheet === name 
                            ? 'bg-emerald-600 text-white shadow-xs' 
                            : 'text-slate-400 hover:text-white hover:bg-slate-800'
                        }`}
                      >
                        {name}
                      </button>
                    ))}
                  </div>
                )}

                <div 
                  className="w-full max-w-6xl bg-white text-slate-900 rounded-xl shadow-2xl overflow-hidden border border-slate-300 my-2"
                  style={{ transform: `scale(${zoomLevel / 100})`, transformOrigin: 'top center' }}
                >
                  <div className="overflow-x-auto max-h-[calc(100vh-140px)]">
                    {activeSheet && sheetData[activeSheet] && sheetData[activeSheet].length > 0 ? (() => {
                      const rawRows = sheetData[activeSheet];
                      const headerRow = rawRows[0] || [];
                      const bodyRows = rawRows.slice(1);
                      return (
                        <table className="w-full border-collapse font-sarabun text-[14pt] table-auto select-text">
                          <thead className="sticky top-0 bg-slate-100 z-10">
                            <tr className="border-b border-slate-300">
                              <th className="px-3 py-2 text-center text-slate-500 font-semibold border-r border-slate-300 text-xs w-12 bg-slate-200">#</th>
                              {headerRow.map((col: any, idx: number) => (
                                <th key={idx} className="px-3 py-2.5 text-left font-bold text-slate-800 border-r border-slate-300 last:border-r-0 whitespace-nowrap">
                                  {String(col ?? '')}
                                </th>
                              ))}
                            </tr>
                          </thead>
                          <tbody>
                            {bodyRows.map((r: any[], rIdx: number) => (
                              <tr key={rIdx} className="hover:bg-slate-50 border-b border-slate-200 last:border-b-0">
                                <td className="px-3 py-1.5 text-center text-slate-400 text-xs border-r border-slate-200 bg-slate-50 font-mono">
                                  {rIdx + 1}
                                </td>
                                {headerRow.map((_: any, cIdx: number) => (
                                  <td key={cIdx} className="px-3 py-2 text-slate-800 border-r border-slate-200 last:border-r-0 whitespace-pre-wrap">
                                    {r[cIdx] !== null && r[cIdx] !== undefined ? String(r[cIdx]) : ''}
                                  </td>
                                ))}
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      );
                    })() : (
                      <div className="p-8 text-center text-slate-400 text-sm">
                        ไม่มีข้อมูลตารางในชีตนี้
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* 4. AUTHENTIC IMAGE VIEWER */}
            {isImage && (
              <div className="w-full flex-1 flex items-center justify-center p-4 overflow-auto">
                <img
                  src={file.fileDataUrl || blobUrl || ''}
                  alt={file.name}
                  className="max-w-full max-h-[85vh] object-contain rounded-xl shadow-2xl bg-white"
                />
              </div>
            )}

            {/* 5. TEXT / PREVIEW CONTENT ONLY (When no binary parser matched) */}
            {!isPdf && !isDocx && !isSheet && !isImage && file.previewContent && (
              <div className="w-full flex-1 flex flex-col items-center py-6 px-4 overflow-y-auto">
                <div 
                  className="a4-page-sheet flex flex-col justify-start select-text p-8 bg-white text-slate-900 rounded shadow-2xl max-w-[210mm] w-full"
                  style={{ minHeight: '297mm' }}
                >
                  <pre className="font-sarabun text-[15pt] leading-relaxed whitespace-pre-wrap text-slate-900 font-sans">
                    {file.previewContent}
                  </pre>
                </div>
              </div>
            )}

            {/* 6. GOOGLE DRIVE EMBED OR CLEAN DIRECT DOWNLOAD CARD */}
            {!isPdf && !isDocx && !isSheet && !isImage && !file.previewContent && (
              file.driveFileId || file.viewUrl ? (
                <div className="w-full flex-1 flex flex-col p-2 sm:p-4 h-[calc(100vh-68px)]">
                  <iframe
                    src={getSafeGoogleDrivePreviewUrl(file) || file.viewUrl}
                    className="w-full h-full border-0 bg-white rounded-xl shadow-2xl"
                    title={file.name}
                    allow="autoplay"
                  />
                </div>
              ) : (
                <div className="flex-1 flex flex-col items-center justify-center p-8 text-center">
                  <div className="w-16 h-16 rounded-2xl bg-slate-800 text-purple-400 flex items-center justify-center mb-4 shadow-lg border border-slate-700">
                    <File className="w-8 h-8" />
                  </div>
                  <h2 className="text-lg font-bold text-white mb-2">{file.name}</h2>
                  <p className="text-sm text-slate-400 mb-6">{(file.size / 1024).toFixed(1)} KB • {file.mimeType || 'เอกสาร'}</p>
                  <button
                    type="button"
                    onClick={() => triggerDirectDownload(file)}
                    className="inline-flex items-center gap-2 px-6 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-semibold rounded-xl shadow-lg transition-colors cursor-pointer"
                  >
                    <Download className="w-5 h-5" />
                    <span>ดาวน์โหลดไฟล์ต้นฉบับ</span>
                  </button>
                </div>
              )
            )}
          </>
        )}
      </main>

      {/* FLOATING SCROLL PAGE INDICATOR (for Word / Doc documents) */}
      {!loading && !error && file && isDocx && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 flex items-center gap-2 px-3.5 sm:px-4 py-2 bg-slate-900/95 border border-purple-500/50 text-white rounded-full shadow-2xl backdrop-blur-md transition-all select-none">
          {totalPages > 1 && (
            <button
              type="button"
              onClick={() => scrollToPage(currentPageInView - 1)}
              disabled={currentPageInView <= 1}
              className="p-1 hover:bg-slate-800 disabled:opacity-30 rounded-full transition-colors cursor-pointer text-slate-300 hover:text-white"
              title="เลื่อนไปหน้าก่อนหน้า"
            >
              <ChevronUp className="w-4 h-4" />
            </button>
          )}
          
          <div className="flex items-center gap-2 text-xs sm:text-sm font-medium">
            <FileText className="w-4 h-4 text-purple-400 shrink-0" />
            <span>หน้า</span>
            <span className="font-bold text-amber-300 text-sm sm:text-base px-2 py-0.5 bg-slate-800 rounded border border-slate-700 min-w-[28px] text-center">
              {currentPageInView}
            </span>
            <span className="text-slate-400">/ {totalPages}</span>
            <span className="text-[11px] text-purple-300/80 hidden sm:inline">(A4 210×297 มม.)</span>
          </div>

          {totalPages > 1 && (
            <button
              type="button"
              onClick={() => scrollToPage(currentPageInView + 1)}
              disabled={currentPageInView >= totalPages}
              className="p-1 hover:bg-slate-800 disabled:opacity-30 rounded-full transition-colors cursor-pointer text-slate-300 hover:text-white"
              title="เลื่อนไปหน้าถัดไป"
            >
              <ChevronDown className="w-4 h-4" />
            </button>
          )}
        </div>
      )}
    </div>
  );
};
