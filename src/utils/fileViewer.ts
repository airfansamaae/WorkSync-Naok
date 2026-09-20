import { UploadedFile } from '../types';
import { setActivePreviewToIndexedDb, saveFileToIndexedDb } from './indexedFileStore';

/**
 * Standardized CSS for direct A4 container viewing
 * Strictly forces 210mm x 297mm dimensions, authentic academic margins (Top 25mm, Bottom 20mm, Left 25mm, Right 20mm),
 * TH Sarabun font family, and eliminates Google Drive UI chrome (print, copy, sidebars).
 */
export const STANDARDIZED_A4_CONTAINER_CSS = `
  @import url('https://fonts.googleapis.com/css2?family=Sarabun:ital,wght@0,300;0,400;0,500;0,600;0,700;0,800;1,400;1,600;1,700&display=swap');

  @font-face {
    font-family: 'TH Sarabun New';
    src: local('TH Sarabun New'), local('THSarabunNew'), local('Sarabun');
    font-weight: normal;
    font-style: normal;
  }
  @font-face {
    font-family: 'TH Sarabun New';
    src: local('TH Sarabun New Bold'), local('THSarabunNew-Bold'), local('Sarabun-Bold');
    font-weight: bold;
    font-style: normal;
  }

  * {
    box-sizing: border-box;
    margin: 0;
    padding: 0;
  }

  html, body {
    width: 100%;
    height: 100%;
    background-color: #020617;
    color: #0f172a;
    font-family: 'TH Sarabun New', 'TH Sarabun PSK', 'Sarabun', Tahoma, -apple-system, BlinkMacSystemFont, sans-serif;
    overflow-x: hidden;
  }

  /* TOP HEADER BAR: Single green download button, close button, title, and A4 badge */
  .a4-viewer-header {
    position: sticky;
    top: 0;
    z-index: 50;
    width: 100%;
    height: 60px;
    background-color: rgba(15, 23, 42, 0.95);
    border-bottom: 1px solid #1e293b;
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 0 24px;
    backdrop-filter: blur(12px);
    box-shadow: 0 4px 20px -2px rgba(0, 0, 0, 0.5);
  }

  .file-meta {
    display: flex;
    align-items: center;
    gap: 12px;
    min-width: 0;
  }

  .file-title {
    font-size: 15px;
    font-weight: 700;
    color: #f8fafc;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    max-width: 450px;
  }

  .a4-badge {
    display: inline-flex;
    align-items: center;
    gap: 4px;
    font-size: 11px;
    font-weight: 600;
    color: #c084fc;
    background: rgba(88, 28, 135, 0.35);
    border: 1px solid rgba(168, 85, 247, 0.35);
    padding: 2px 8px;
    border-radius: 6px;
    white-space: nowrap;
  }

  .header-actions {
    display: flex;
    align-items: center;
    gap: 10px;
  }

  /* Exactly 1 Single Green Download Button */
  .btn-single-download {
    display: inline-flex;
    align-items: center;
    gap: 8px;
    padding: 8px 16px;
    background: #059669;
    color: #ffffff;
    font-size: 13px;
    font-weight: 600;
    border: none;
    border-radius: 8px;
    cursor: pointer;
    text-decoration: none;
    transition: background 0.15s ease, transform 0.05s ease;
    white-space: nowrap;
  }
  .btn-single-download:hover {
    background: #10b981;
  }
  .btn-single-download:active {
    transform: scale(0.98);
  }

  .btn-close-window {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    padding: 8px 14px;
    background: #1e293b;
    color: #cbd5e1;
    font-size: 13px;
    font-weight: 500;
    border: 1px solid #334155;
    border-radius: 8px;
    cursor: pointer;
    transition: all 0.15s ease;
    white-space: nowrap;
  }
  .btn-close-window:hover {
    background: #334155;
    color: #ffffff;
  }

  /* VIEWPORT STAGE: Centers and scrolls the standardized A4 pages */
  .a4-stage-viewport {
    width: 100%;
    flex: 1;
    display: flex;
    flex-direction: column;
    align-items: center;
    padding: 28px 16px 64px 16px;
    box-sizing: border-box;
    background-color: #020617;
    overflow-y: auto;
  }

  /* STANDARDIZED CONTAINER WITH CSS MARGIN AND PADDING FORCING AN A4-LIKE VIEWING EXPERIENCE */
  /* Dimensions: Strict A4 210mm x 297mm, Margins: 20mm balanced on all sides so pages are not skewed/tilted */
  .a4-standardized-container {
    width: 210mm !important;
    max-width: calc(100vw - 32px) !important;
    min-height: 297mm !important;
    margin: 24px auto !important;
    padding: 20mm 20mm 20mm 20mm !important;
    box-sizing: border-box !important;
    background: #ffffff !important;
    color: #0f172a !important;
    font-family: 'TH Sarabun New', 'TH Sarabun PSK', 'Sarabun', Tahoma, sans-serif !important;
    font-size: 16pt !important;
    line-height: 1.6 !important;
    box-shadow: 0 10px 35px -5px rgba(0, 0, 0, 0.45), 0 0 0 1px rgba(255, 255, 255, 0.08) !important;
    border-radius: 2px !important;
    position: relative !important;
    display: flex !important;
    flex-direction: column !important;
    justify-content: space-between !important;
  }

  /* FULL-SCREEN 100% CONTAINER FOR DIRECT RAW EMBEDS (PDF, NATIVE OBJECTS) */
  .a4-raw-embed-container {
    width: 100% !important;
    max-width: 100% !important;
    height: 100% !important;
    min-height: calc(100vh - 56px) !important;
    margin: 0 !important;
    padding: 0 !important;
    box-sizing: border-box !important;
    background: #ffffff !important;
    box-shadow: none !important;
    border-radius: 0 !important;
    overflow: hidden !important;
    position: relative !important;
  }

  .a4-stage-viewport.pdf-stage-viewport {
    padding: 0 !important;
    margin: 0 !important;
    width: 100% !important;
    height: calc(100vh - 56px) !important;
    overflow: hidden !important;
  }

  /* STANDARDIZED A4 CONTAINER FOR IMAGES */
  .a4-image-container {
    width: 210mm !important;
    max-width: calc(100vw - 32px) !important;
    min-height: 297mm !important;
    margin: 24px auto !important;
    padding: 25mm 20mm 20mm 25mm !important;
    box-sizing: border-box !important;
    background: #ffffff !important;
    box-shadow: 0 10px 35px -5px rgba(0, 0, 0, 0.45), 0 0 0 1px rgba(255, 255, 255, 0.08) !important;
    border-radius: 2px !important;
    display: flex !important;
    flex-direction: column !important;
    align-items: center !important;
    justify-content: space-between !important;
  }

  /* A4 Page Separator with Clear Dimension Label */
  .a4-page-separator {
    width: 100%;
    max-width: 210mm;
    margin: 24px auto;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 12px;
    color: #94a3b8;
    font-size: 12px;
    font-weight: 600;
    user-select: none;
  }
  .a4-page-separator::before,
  .a4-page-separator::after {
    content: "";
    flex: 1;
    height: 1px;
    background: #334155;
  }
  .a4-page-separator-badge {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    padding: 4px 14px;
    background: #1e293b;
    border: 1px solid #334155;
    border-radius: 9999px;
    color: #cbd5e1;
  }

  /* Table styling inside A4 sheets */
  .a4-table {
    width: 100%;
    border-collapse: collapse;
    border: 1.5px solid #334155;
    margin: 16px 0;
    font-family: 'TH Sarabun New', 'TH Sarabun PSK', 'Sarabun', Tahoma, sans-serif;
    font-size: 14pt;
  }
  .a4-table th {
    background-color: #f1f5f9;
    border: 1px solid #64748b;
    padding: 8px 12px;
    font-weight: bold;
    text-align: center;
    color: #0f172a;
  }
  .a4-table td {
    border: 1px solid #64748b;
    padding: 8px 12px;
    text-align: left;
    color: #1e293b;
  }
  .a4-table tr:nth-child(even) td {
    background-color: #f8fafc;
  }

  /* Floating Scroll Page Indicator */
  .floating-page-hud {
    position: fixed;
    bottom: 24px;
    left: 50%;
    transform: translateX(-50%);
    z-index: 9999;
    display: flex;
    align-items: center;
    gap: 10px;
    padding: 8px 18px;
    background: rgba(15, 23, 42, 0.96);
    border: 1px solid rgba(168, 85, 247, 0.5);
    border-radius: 9999px;
    box-shadow: 0 12px 30px rgba(0, 0, 0, 0.6);
    color: #ffffff;
    font-size: 13px;
    font-weight: 500;
    user-select: none;
    backdrop-filter: blur(10px);
  }
  .floating-page-hud .page-chip {
    font-weight: 700;
    color: #fde047;
    background: #1e293b;
    padding: 2px 8px;
    border-radius: 4px;
    border: 1px solid #334155;
  }

  /* STRICTLY BLOCK ALL UI OVERLAYS, FLOATING TOOLBARS, PRINT DIALOGS, COPY POPUPS */
  .ui-overlay-blocker,
  .goog-inline-block,
  .drive-viewer-toolstrip,
  .ndfHFb-c4YZDc,
  [class*="overlay"],
  [id*="overlay"],
  #print-button,
  #copy-button,
  button[title*="Print"],
  button[title*="Copy"],
  .print-dialog-overlay,
  .companion-collapsed-pill,
  .floating-toolbar {
    display: none !important;
    visibility: hidden !important;
    opacity: 0 !important;
    pointer-events: none !important;
  }
`;

/**
 * Returns a clean Google Drive preview URL with minimal parameters
 * strictly stripping Google Drive top chrome, print, and copy UI.
 * NEVER routes through Google Docs Viewer (docs.google.com/viewer) which causes white screen issues.
 */
export function getSafeGoogleDrivePreviewUrl(file: UploadedFile): string {
  if (!file) return '';
  
  let driveId = file.driveFileId;
  if (!driveId && file.viewUrl) {
    const match = file.viewUrl.match(/\/d\/([a-zA-Z0-9_-]+)/);
    if (match) driveId = match[1];
  }

  if (driveId) {
    // rm=minimal strips Google Drive navigation bar, print menu, and pop-out
    return `https://drive.google.com/file/d/${driveId}/preview?rm=minimal&embedded=true`;
  }

  if (file.viewUrl && !file.viewUrl.includes('docs.google.com/viewer')) {
    if (file.viewUrl.includes('/view')) {
      return file.viewUrl.replace('/view', '/preview?rm=minimal&embedded=true');
    }
    return file.viewUrl;
  }

  return '';
}

/**
 * Returns the direct Google Drive view URL for an uploaded file (for direct link references)
 */
export function getGoogleDriveFileUrl(file: UploadedFile): string {
  if (!file) return 'https://drive.google.com';
  if (file.viewUrl && file.viewUrl.startsWith('http')) {
    if (file.viewUrl.includes('docs.google.com/viewer?url=')) {
      const actualUrl = decodeURIComponent(file.viewUrl.split('url=')[1]?.split('&')[0] || '');
      if (actualUrl) return actualUrl;
    }
    return file.viewUrl;
  }
  if (file.driveFileId) {
    return `https://drive.google.com/file/d/${file.driveFileId}/view`;
  }
  if (file.driveFolderId) {
    return `https://drive.google.com/drive/folders/${file.driveFolderId}`;
  }
  return 'https://drive.google.com';
}

/**
 * Generates direct raw Blob URL from UploadedFile dataURL if available
 */
export function createRawFileBlobUrl(file: UploadedFile): string | null {
  if (!file) return null;
  try {
    let rawBase64 = '';
    let mime = file.mimeType || 'application/octet-stream';
    if (file.fileDataUrl) {
      if (file.fileDataUrl.startsWith('data:')) {
        const parts = file.fileDataUrl.split(';base64,');
        mime = parts[0].replace('data:', '') || mime;
        rawBase64 = parts[1] || '';
      } else {
        rawBase64 = file.fileDataUrl;
      }
    }
    if (rawBase64) {
      const binaryString = atob(rawBase64);
      const bytes = new Uint8Array(binaryString.length);
      for (let i = 0; i < binaryString.length; i++) {
        bytes[i] = binaryString.charCodeAt(i);
      }
      const blob = new Blob([bytes], { type: mime });
      return URL.createObjectURL(blob);
    }
  } catch (err) {
    console.warn('[fileViewer] createRawFileBlobUrl error:', err);
  }
  return null;
}

/**
 * Builds standalone HTML that strictly forces the standardized A4 container with CSS margin/padding,
 * serving the raw file content directly and blocking all UI overlays.
 */
export function buildStandardizedA4ViewerHtml(
  file: UploadedFile,
  assignmentTitle?: string,
  submitterName?: string
): string {
  const fileName = file.name || 'เอกสารต้นฉบับ';
  const rawSrc = file.fileDataUrl || '';
  const lower = fileName.toLowerCase();
  const isPdf = lower.endsWith('.pdf') || file.previewType === 'pdf' || (file.mimeType && file.mimeType.includes('pdf'));
  const isImage = lower.match(/\.(png|jpg|jpeg|gif|webp|svg)$/) || file.previewType === 'image' || (file.mimeType && file.mimeType.includes('image'));

  const drivePreviewUrl = getSafeGoogleDrivePreviewUrl(file);
  const displayTitle = assignmentTitle || fileName;
  const authorInfo = submitterName ? `ส่งโดย: ${submitterName}` : 'เอกสารทางการ';

  // Construct raw file content body inside standardized A4 container
  let rawContentHtml = '';

  if (isPdf) {
    const pdfUrl = rawSrc || drivePreviewUrl;
    rawContentHtml = `
      <div class="a4-raw-embed-container" data-a4-page="1">
        <object
          data="${pdfUrl}#toolbar=1&navpanes=0&scrollbar=1&view=FitH&zoom=100"
          type="application/pdf"
          style="width: 100%; height: 100%; border: none; display: block;"
        >
          <iframe
            src="${pdfUrl}#toolbar=1&navpanes=0&scrollbar=1&view=FitH&zoom=100"
            style="width: 100%; height: 100%; border: none; background: #ffffff;"
            title="${fileName}"
          ></iframe>
        </object>
      </div>
    `;
  } else if (isImage) {
    rawContentHtml = `
      <div class="a4-image-container" data-a4-page="1">
        <div style="width: 100%; display: flex; justify-content: space-between; padding-bottom: 12px; margin-bottom: 12px; border-bottom: 1px solid #cbd5e1; font-size: 13pt; color: #475569; font-family: 'TH Sarabun New', Sarabun, sans-serif;">
          <span style="font-weight: 700; color: #1e293b;">${displayTitle}</span>
          <span style="background: #f1f5f9; padding: 2px 8px; border-radius: 4px; border: 1px solid #e2e8f0;">หน้า 1 / 1</span>
        </div>
        <div style="flex: 1; display: flex; align-items: center; justify-content: center; width: 100%;">
          <img
            src="${rawSrc}"
            alt="${fileName}"
            style="max-width: 100%; max-height: 220mm; object-fit: contain; border-radius: 4px; box-shadow: 0 2px 8px rgba(0,0,0,0.08); border: 1px solid #cbd5e1;"
          />
        </div>
        <div style="width: 100%; display: flex; justify-content: space-between; padding-top: 12px; margin-top: 12px; border-top: 1px solid #cbd5e1; font-size: 12pt; color: #64748b; font-family: 'TH Sarabun New', Sarabun, sans-serif;">
          <span>ขนาดกระดาษมาตรฐาน A4 (210 × 297 มม.) • Font: TH Sarabun</span>
          <span style="color: #64748b;">โรงเรียนกระบี่วิทยานุสรณ์</span>
        </div>
      </div>
    `;
  } else if (file.previewContent) {
    // Render text or parsed content inside standardized A4 sheets with page separators and table parsing
    const lines = file.previewContent.split('\n');
    const elements: string[] = [];
    let lIdx = 0;

    while (lIdx < lines.length) {
      const line = lines[lIdx].trim();
      if (!line) {
        lIdx++;
        continue;
      }

      // Check for table lines
      if (line.startsWith('|') || (line.includes('|') && line.split('|').length >= 3)) {
        let tableHtml = '<table class="a4-table"><tbody>';
        let isFirstRow = true;
        while (lIdx < lines.length) {
          const cur = lines[lIdx].trim();
          if (!cur) break;
          if (/^\|?(\s*:?-+:?\s*\|)+\s*$/.test(cur)) {
            lIdx++;
            continue;
          }
          if (cur.includes('|')) {
            const cells = cur.split('|').map(c => c.trim()).filter((c, idx, arr) => idx > 0 && idx < arr.length - (cur.endsWith('|') ? 1 : 0) ? true : c.length > 0);
            if (cells.length > 0) {
              tableHtml += '<tr>';
              cells.forEach((cell, cIdx) => {
                if (isFirstRow) {
                  tableHtml += `<th style="background:#f1f5f9; font-weight:bold; text-align:center; padding:8px 10px; border:1px solid #475569;">${cell}</th>`;
                } else {
                  const isFirstCol = cIdx === 0;
                  tableHtml += `<td style="padding:8px 10px; border:1px solid #64748b; ${isFirstCol ? 'font-weight:600;' : ''}">${cell}</td>`;
                }
              });
              tableHtml += '</tr>';
              isFirstRow = false;
            }
            lIdx++;
          } else {
            break;
          }
        }
        tableHtml += '</tbody></table>';
        elements.push(tableHtml);
        continue;
      }

      // Check for titles and headings
      const isTitle = line.startsWith('โครงสร้าง') || line.startsWith('รายงาน') || line.startsWith('คำสั่งโรงเรียน') || line.startsWith('แบบฟอร์ม') || line.startsWith('แบบประเมิน');
      const isHeading = /^\d+\./.test(line) || line.startsWith('เรื่อง:') || line.startsWith('บทคัดย่อ:');

      if (isTitle) {
        elements.push(`<h1 style="font-size: 20pt; font-weight: bold; text-align: center; margin-bottom: 12px; color: #0f172a;">${line}</h1>`);
      } else if (isHeading) {
        elements.push(`<h2 style="font-size: 18pt; font-weight: bold; margin-top: 14px; margin-bottom: 6px; color: #0f172a;">${line}</h2>`);
      } else {
        elements.push(`<p style="font-size: 16pt; text-indent: 1.5cm; margin-bottom: 10px; line-height: 1.6; text-align: justify; color: #1e293b;">${line}</p>`);
      }
      lIdx++;
    }

    const ELEMENTS_PER_PAGE = 8;
    const totalPages = Math.max(1, Math.ceil(elements.length / ELEMENTS_PER_PAGE));

    const pagesHtml: string[] = [];
    for (let p = 0; p < totalPages; p++) {
      const pageElements = elements.slice(p * ELEMENTS_PER_PAGE, (p + 1) * ELEMENTS_PER_PAGE);

      const pageHtml = `
        <div class="a4-standardized-container" data-a4-page="${p + 1}">
          <div style="flex: 1; font-family: 'TH Sarabun New', Sarabun, sans-serif;">
            ${pageElements.join('')}
          </div>
        </div>
      `;

      pagesHtml.push(pageHtml);

      if (p < totalPages - 1) {
        pagesHtml.push(`
          <div class="a4-page-separator">
            <span class="a4-page-separator-badge">
              เส้นคั่นแบ่งหน้ามาตรฐาน A4 (210 × 297 มม.)
            </span>
          </div>
        `);
      }
    }
    rawContentHtml = pagesHtml.join('');
  } else if (drivePreviewUrl) {
    rawContentHtml = `
      <div class="a4-raw-embed-container" data-a4-page="1">
        <iframe
          src="${drivePreviewUrl}"
          style="width: 100%; height: 100%; border: none; background: #ffffff;"
          title="${fileName}"
          allow="autoplay"
        ></iframe>
      </div>
    `;
  } else {
    rawContentHtml = `
      <div class="a4-standardized-container" data-a4-page="1" style="justify-content: center; align-items: center; text-align: center;">
        <div style="padding: 40px 20px;">
          <h2 style="font-size: 20pt; font-weight: bold; color: #0f172a; margin-bottom: 12px;">${fileName}</h2>
          <p style="font-size: 16pt; color: #64748b; margin-bottom: 24px;">เอกสารขนาด A4 พร้อมสำหรับการดาวน์โหลด</p>
          <button
            onclick="downloadRawFile()"
            class="btn-single-download"
            style="margin: 0 auto;"
          >
            ดาวน์โหลดไฟล์ต้นฉบับ
          </button>
        </div>
      </div>
    `;
  }

  return `<!DOCTYPE html>
<html lang="th">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${fileName} - ดูไฟล์ต้นฉบับ (ขนาด A4 210 × 297 มม.)</title>
  <style>
    ${STANDARDIZED_A4_CONTAINER_CSS}
  </style>
</head>
<body>
  <!-- HEADER BAR: STRICTLY NO PRINTER, NO COPY, ONLY 1 SINGLE DOWNLOAD BUTTON -->
  <header class="a4-viewer-header">
    <div class="file-meta">
      <div class="file-title" title="${fileName}">${fileName}</div>
      <div class="a4-badge">${isPdf ? 'แสดงเต็มหน้าจอพอดี แบบ 100%' : 'ขนาด A4 (210 × 297 มม.) • Font: TH Sarabun'}</div>
    </div>
    <div class="header-actions">
      <button id="btn-single-download" class="btn-single-download" onclick="downloadRawFile()">
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
          <polyline points="7 10 12 15 17 10"></polyline>
          <line x1="12" y1="15" x2="12" y2="3"></line>
        </svg>
        <span>ดาวน์โหลดไฟล์ต้นฉบับ</span>
      </button>
      <button class="btn-close-window" onclick="window.close()">
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
          <line x1="18" y1="6" x2="6" y2="18"></line>
          <line x1="6" y1="6" x2="18" y2="18"></line>
        </svg>
        <span>ปิดหน้าต่าง</span>
      </button>
    </div>
  </header>

  <!-- STANDARDIZED A4 VIEWPORT STAGE -->
  <main id="a4-viewport" class="a4-stage-viewport ${isPdf ? 'pdf-stage-viewport' : ''}">
    ${rawContentHtml}
  </main>

  <!-- FLOATING SCROLL PAGE INDICATOR (ลบเฉพาะสำหรับไฟล์ PDF เท่านั้น ไฟล์อื่นคงไว้ตามคำสั่ง) -->
  ${!isPdf ? `
  <div id="page-indicator" class="floating-page-hud" style="display: none;">
    <span>กำลังดู: หน้า</span>
    <span id="current-page-num" class="page-chip">1</span>
    <span id="total-page-num" style="color: #94a3b8;">/ 1</span>
    <span style="border-left: 1px solid #334155; padding-left: 8px; font-size: 11px; color: #cbd5e1;">A4 (210 × 297 มม.) • TH Sarabun</span>
  </div>
  ` : ''}

  <script>
    // Download handler - strictly raw original file
    async function downloadRawFile() {
      const dataUrl = ${JSON.stringify(file.fileDataUrl || '')};
      const fileName = ${JSON.stringify(fileName)};
      const downloadUrl = ${JSON.stringify(file.downloadUrl || '')};
      const viewUrl = ${JSON.stringify(file.viewUrl || '')};
      const driveFileId = ${JSON.stringify(file.driveFileId || '')};
      const fileId = ${JSON.stringify(file.id || '')};

      function triggerBlobSave(blob, name) {
        const blobUrl = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = blobUrl;
        a.download = name;
        document.body.appendChild(a);
        a.click();
        setTimeout(function() {
          if (a.parentNode) a.parentNode.removeChild(a);
          URL.revokeObjectURL(blobUrl);
        }, 60000);
      }

      if (dataUrl && dataUrl.startsWith('data:')) {
        try {
          const parts = dataUrl.split(';base64,');
          if (parts.length === 2) {
            const rawBase64 = parts[1];
            const byteCharacters = atob(rawBase64);
            const byteNumbers = new Uint8Array(byteCharacters.length);
            for (let i = 0; i < byteCharacters.length; i++) {
              byteNumbers[i] = byteCharacters.charCodeAt(i);
            }
            const blob = new Blob([byteNumbers]);
            triggerBlobSave(blob, fileName);
            return;
          }
        } catch (e) {
          console.warn('Blob URL generation failed, falling back:', e);
        }
      }

      // Try server download by fileId
      if (fileId) {
        try {
          const res = await fetch('/api/files/download/' + encodeURIComponent(fileId) + '?name=' + encodeURIComponent(fileName));
          const ct = res.headers.get('content-type') || '';
          if (res.ok && !ct.includes('text/html')) {
            const blob = await res.blob();
            if (blob && blob.size > 0) {
              triggerBlobSave(blob, fileName);
              return;
            }
          }
        } catch {}
      }

      // Try server download by fileName
      try {
        const res = await fetch('/api/files/download/by-name?name=' + encodeURIComponent(fileName));
        const ct = res.headers.get('content-type') || '';
        if (res.ok && !ct.includes('text/html')) {
          const blob = await res.blob();
          if (blob && blob.size > 0) {
            triggerBlobSave(blob, fileName);
            return;
          }
        }
      } catch {}

      // Try server proxy download by driveFileId
      if (driveFileId) {
        try {
          const res = await fetch('/api/drive/download/' + encodeURIComponent(driveFileId) + '?name=' + encodeURIComponent(fileName));
          const ct = res.headers.get('content-type') || '';
          if (res.ok && !ct.includes('text/html')) {
            const blob = await res.blob();
            if (blob && blob.size > 0) {
              triggerBlobSave(blob, fileName);
              return;
            }
          }
        } catch {}
      }

      const target = downloadUrl || viewUrl;
      if (target && target.startsWith('http')) {
        try {
          const res = await fetch(target);
          const ct = res.headers.get('content-type') || '';
          if (res.ok && !ct.includes('text/html')) {
            const blob = await res.blob();
            if (blob && blob.size > 0) {
              triggerBlobSave(blob, fileName);
              return;
            }
          }
        } catch {}
      }

      alert('ไม่สามารถดาวน์โหลดไฟล์ต้นฉบับได้');
    }

    // Dynamic Scroll Page Tracking (เมื่อเลื่อนลงมา ก็จะมีหน้าให้เห็นว่า อยู่หน้าที่เท่าไร - ยกเว้น PDF)
    (function() {
      const isPdf = ${JSON.stringify(Boolean(isPdf))};
      if (isPdf) return;
      const pages = document.querySelectorAll('[data-a4-page]');
      const hud = document.getElementById('page-indicator');
      const curNum = document.getElementById('current-page-num');
      const totNum = document.getElementById('total-page-num');
      const viewport = document.getElementById('a4-viewport');

      if (pages.length >= 1 && hud && curNum && totNum && viewport) {
        totNum.textContent = '/ ' + pages.length;
        hud.style.display = 'flex';

        viewport.addEventListener('scroll', function() {
          const vTop = viewport.getBoundingClientRect().top + 160;
          let active = 1;
          pages.forEach(function(p, idx) {
            const r = p.getBoundingClientRect();
            if (r.top <= vTop && r.bottom >= viewport.getBoundingClientRect().top) {
              active = idx + 1;
            }
          });
          curNum.textContent = active;
        });
      }
    })();
  </script>
</body>
</html>`;
}

/**
 * Main action function: Opens authentic raw file in a new tab or browser window
 * with strict standardized A4 container, no Google Docs Viewer, TH Sarabun font, and scroll tracking.
 */
export function openAuthenticFileInNewTab(
  file: UploadedFile,
  assignmentTitle?: string,
  submitterName?: string
) {
  if (!file) return;

  const payload = {
    file,
    assignmentTitle: assignmentTitle || file.name,
    submitterName: submitterName || '',
    timestamp: Date.now(),
  };

  // 1. Store in memory, sessionStorage, localStorage, and IndexedDB so new tab can immediately resolve it
  try {
    (window as any).__LAST_ACTIVE_RAW_FILE__ = payload;
    sessionStorage.setItem('academic_active_raw_file', JSON.stringify(payload));
    if (file.id) {
      sessionStorage.setItem(`academic_raw_file_${file.id}`, JSON.stringify(payload));
    }
    if (file.driveFileId) {
      sessionStorage.setItem(`academic_raw_file_${file.driveFileId}`, JSON.stringify(payload));
    }
    if (file.name) {
      sessionStorage.setItem(`academic_raw_file_name_${encodeURIComponent(file.name)}`, JSON.stringify(payload));
    }
  } catch (err) {
    console.warn('[fileViewer] Cache storage warning:', err);
  }

  try {
    localStorage.setItem('academic_active_raw_file', JSON.stringify(payload));
    if (file.id) {
      localStorage.setItem(`academic_raw_file_${file.id}`, JSON.stringify(payload));
    }
  } catch {
    // Quota might be exceeded for large files - safely handled by IndexedDB below
  }

  // Persist to IndexedDB asynchronously
  setActivePreviewToIndexedDb(payload).catch((e) => console.warn('[fileViewer] IDB preview set warning:', e));
  if (file.fileDataUrl) {
    const keysToSave = [file.id, file.driveFileId, file.name].filter(Boolean) as string[];
    for (const key of keysToSave) {
      saveFileToIndexedDb(key, file.fileDataUrl, undefined, {
        name: file.name,
        size: file.size,
        mimeType: file.mimeType,
      }).catch((e) => console.warn('[fileViewer] IDB file save warning:', e));
    }
  }

  // 2. Build target URL with strict A4 and no-viewer parameters
  const queryParams = new URLSearchParams({
    view_raw_file: '1',
    file_id: file.id || '',
    drive_id: file.driveFileId || '',
    name: file.name || '',
    mime: file.mimeType || '',
    preview_type: file.previewType || '',
    size: String(file.size || 0),
    title: assignmentTitle || file.name || '',
    uploader: submitterName || '',
  });
  const url = `/?${queryParams.toString()}`;

  // 3. Open new tab directly with URL so it runs DedicatedRawFileViewer
  let newTab: Window | null = null;
  try {
    newTab = window.open(url, '_blank');
    if (newTab) {
      try {
        (newTab as any).__RAW_FILE_PAYLOAD__ = payload;
      } catch {
        // ignore
      }
    }
  } catch {
    // popup blocker triggered
  }

  // 4. Fallback if window.open was blocked: generate standardized container A4 HTML
  if (!newTab) {
    const a4Html = buildStandardizedA4ViewerHtml(file, assignmentTitle, submitterName);
    try {
      newTab = window.open('', '_blank');
      if (newTab && newTab.document) {
        newTab.document.open();
        newTab.document.write(a4Html);
        newTab.document.close();
      }
    } catch {
      window.location.href = url;
    }
  }
}
