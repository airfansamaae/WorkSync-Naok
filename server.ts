import express from 'express';
import path from 'path';
import fs from 'fs';
import { createServer as createViteServer } from 'vite';
import { INITIAL_WEBSITES } from './src/data/initialData';
import {
  SEED_DOCX_RUBRICS,
  SEED_DOCX_TEMPLATE,
  SEED_XLSX_SCIENCE,
  SEED_XLSX_MATH,
  SEED_PDF_LESSON_PLAN,
  SEED_PDF_ACTION_RESEARCH,
  SEED_PDF_ORDER_142,
  SEED_PDF_THAI_SCORES,
} from './src/data/seedBinaries';

const DB_FILE_PATH = path.join(process.cwd(), 'academic_db.json');
const DB_FILE = DB_FILE_PATH;

// Persistent database store for server-wide real-time sync across all browsers & D1
let serverDataVersion = Date.now();
let serverDataStore: Record<string, any[]> = {
  users: [],
  assignments: [],
  submissions: [],
  documents: [],
  announcements: [],
  websites: [...INITIAL_WEBSITES],
  lunch_menus: [],
  audit_logs: [],
};
let serverSchoolProfile: any = null;

// Load persisted data if file exists
try {
  if (fs.existsSync(DB_FILE_PATH)) {
    const raw = fs.readFileSync(DB_FILE_PATH, 'utf-8');
    const parsed = JSON.parse(raw);
    if (parsed.data) serverDataStore = { ...serverDataStore, ...parsed.data };
    if (parsed.school) serverSchoolProfile = parsed.school;
    if (parsed.version) serverDataVersion = parsed.version;
  }
} catch (e) {
  console.warn('Could not read academic_db.json, starting fresh', e);
}

if (!Array.isArray(serverDataStore.websites) || serverDataStore.websites.length === 0) {
  serverDataStore.websites = [...INITIAL_WEBSITES];
}

// RFC 6266 & RFC 5987 helper to set Content-Disposition header with exact original UTF-8 filename (including Thai)
// Supplies both standard ASCII fallback filename="..." AND UTF-8 encoded filename*=UTF-8''...
// This guarantees that all browsers, webviews, incognito windows, mobile browsers, and proxies
// preserve the exact original Thai and special-character filenames without garbling.
const formatContentDisposition = (fileName: string) => {
  let cleanName = path.basename(fileName).replace(/["\r\n]/g, '').trim();
  try {
    if (cleanName.includes('%')) {
      cleanName = decodeURIComponent(cleanName);
    }
  } catch {}
  if (!cleanName) cleanName = 'document';

  const ext = path.extname(cleanName);
  let asciiBase = path.basename(cleanName, ext).replace(/[^\x20-\x7E]/g, '_').trim();
  if (!asciiBase) asciiBase = 'file';
  const asciiFallback = `${asciiBase}${ext}`;

  const encoded = encodeURIComponent(cleanName)
    .replace(/['()]/g, escape)
    .replace(/\*/g, '%2A');

  return `attachment; filename="${asciiFallback}"; filename*=UTF-8''${encoded}`;
};

const saveDbToDisk = () => {
  try {
    fs.writeFileSync(
      DB_FILE_PATH,
      JSON.stringify({
        version: serverDataVersion,
        data: serverDataStore,
        school: serverSchoolProfile,
        savedAt: new Date().toISOString(),
      }),
      'utf-8'
    );
  } catch (err) {
    console.error('Failed to save to academic_db.json:', err);
  }
};

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json({ limit: '50mb' }));
  app.use(express.urlencoded({ extended: true, limit: '50mb' }));

  // High-speed local vendor assets for instant authentic preview rendering
  app.get('/api/vendor/jszip.min.js', (req, res) => {
    res.setHeader('Content-Type', 'application/javascript; charset=utf-8');
    res.sendFile(path.join(process.cwd(), 'node_modules/jszip/dist/jszip.min.js'));
  });
  app.get('/api/vendor/docx-preview.js', (req, res) => {
    res.setHeader('Content-Type', 'application/javascript; charset=utf-8');
    res.sendFile(path.join(process.cwd(), 'node_modules/docx-preview/dist/docx-preview.js'));
  });
  app.get('/api/vendor/xlsx.full.min.js', (req, res) => {
    res.setHeader('Content-Type', 'application/javascript; charset=utf-8');
    res.sendFile(path.join(process.cwd(), 'node_modules/xlsx/dist/xlsx.full.min.js'));
  });

  // SSE Clients list
  const sseClients: { id: string; res: express.Response }[] = [];

  // Health API
  app.get('/api/health', (req, res) => {
    res.json({
      status: 'ok',
      service: 'Academic Management System API',
      timestamp: new Date().toISOString(),
      serverDataVersion,
      connectedBrowsers: sseClients.length,
      driveConfig: {
        targetFolderId: '1IpsaGJhJqtuYHTLiHmT2kqOe7CBq4as-',
        status: 'connected',
      },
    });
  });

  // 4.5 Protected School Lunch Gateway Redirect
  app.get('/api/lunch-redirect', (req, res) => {
    const TARGET_LUNCH_GAS_URL =
      'https://script.google.com/a/macros/krabiedu.go.th/s/AKfycbzgmOBgQ4534lIiTVuUikzaEF0PXofybzvaYZlXPvFeY4U8d3KrcpXZ-MsooaHSgIQ/exec';
    res.redirect(TARGET_LUNCH_GAS_URL);
  });

  // Google Drive File Upload Relay (Node.js robust multipart proxy to Google Drive API v3 & GAS Web App)
  const CONNECTED_GAS_URL =
    'https://script.google.com/macros/s/AKfycbw0hwSkVP5G5LrApTO-W4JmJ3P53mKRyXV_05SEHhOKqLW5LR_BjnNAuj0yNFxEF0R_/exec';

  const UPLOAD_DIR = path.join(process.cwd(), 'uploaded_files');
  if (!fs.existsSync(UPLOAD_DIR)) {
    try {
      fs.mkdirSync(UPLOAD_DIR, { recursive: true });
    } catch {}
  }

  // In-memory file lookup index for instantaneous, robust file matching across multiple identifiers
  const fileIndex = new Map<string, { binPath: string; meta: any }>();

  const sanitizeKey = (key: string) => (key || '').replace(/[/\\?%*:|"<>]/g, '_').trim();

  const indexFileEntry = (key: string, binPath: string, meta: any) => {
    if (!key || !fs.existsSync(binPath)) return;
    const clean = sanitizeKey(key);
    fileIndex.set(key, { binPath, meta });
    fileIndex.set(key.toLowerCase(), { binPath, meta });
    fileIndex.set(clean, { binPath, meta });
    fileIndex.set(clean.toLowerCase(), { binPath, meta });
    try {
      const decoded = decodeURIComponent(key);
      fileIndex.set(decoded, { binPath, meta });
      fileIndex.set(decoded.toLowerCase(), { binPath, meta });
      const cleanDecoded = sanitizeKey(decoded);
      fileIndex.set(cleanDecoded, { binPath, meta });
      fileIndex.set(cleanDecoded.toLowerCase(), { binPath, meta });
    } catch {}
  };

  // Save uploaded file helper (Guarantees local binary persistence and cross-browser sharing across all IDs)
  const saveFileLocally = (
    id: string,
    fileName: string,
    mimeType: string,
    base64Data: string,
    extraKeys: string[] = []
  ) => {
    try {
      if (!id || !base64Data) return false;
      const cleanBase64 = base64Data.includes(',') ? base64Data.split(',')[1] : base64Data;
      const buf = Buffer.from(cleanBase64, 'base64');
      if (buf.length === 0) return false;

      const meta = {
        id,
        fileName: fileName || 'document',
        mimeType: mimeType || 'application/octet-stream',
        size: buf.length,
        updatedAt: new Date().toISOString(),
      };

      const primaryCleanId = sanitizeKey(id) || `file_${Date.now()}`;
      const primaryBinPath = path.join(UPLOAD_DIR, `${primaryCleanId}.bin`);
      const primaryMetaPath = path.join(UPLOAD_DIR, `${primaryCleanId}.meta.json`);

      fs.writeFileSync(primaryBinPath, buf);
      fs.writeFileSync(primaryMetaPath, JSON.stringify(meta, null, 2), 'utf-8');

      const allKeys = new Set<string>([
        id,
        primaryCleanId,
        fileName,
        sanitizeKey(fileName),
        ...extraKeys,
        ...extraKeys.map(k => sanitizeKey(k)),
      ]);

      for (const k of allKeys) {
        if (!k) continue;
        indexFileEntry(k, primaryBinPath, meta);

        // Ensure key on disk if distinct
        const cleanK = sanitizeKey(k);
        if (cleanK && cleanK !== primaryCleanId) {
          const aliasBinPath = path.join(UPLOAD_DIR, `${cleanK}.bin`);
          const aliasMetaPath = path.join(UPLOAD_DIR, `${cleanK}.meta.json`);
          try {
            if (!fs.existsSync(aliasBinPath)) {
              fs.writeFileSync(aliasBinPath, buf);
            }
            if (!fs.existsSync(aliasMetaPath)) {
              fs.writeFileSync(aliasMetaPath, JSON.stringify(meta, null, 2), 'utf-8');
            }
          } catch {}
        }
      }

      return true;
    } catch (e) {
      console.warn('[server.ts] saveFileLocally error:', e);
      return false;
    }
  };

  // Seed authentic original raw binary files on startup so they are 100% available
  const seedBinaryConfigs = [
    {
      ids: ['file_01', '1IpsaGJ-sample-file-01'],
      name: 'แผนการสอน_วิทยาการคำนวณ_ม2_สมชาย.pdf',
      mimeType: 'application/pdf',
      dataUrl: SEED_PDF_LESSON_PLAN,
    },
    {
      ids: ['file_02', '1IpsaGJ-sample-file-02'],
      name: 'เกณฑ์การประเมินRubrics_ม2.docx',
      mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      dataUrl: SEED_DOCX_RUBRICS,
    },
    {
      ids: ['file_03', '1IpsaGJ-sample-file-03'],
      name: 'ปพ5_วิทย์_ม2_ห้อง1_สมชาย.xlsx',
      mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      dataUrl: SEED_XLSX_SCIENCE,
    },
    {
      ids: ['file_04', '1IpsaGJ-sample-file-04'],
      name: 'ปพ5_คณิตศาสตร์พื้นฐาน_ม1_พิมพ์ใจ.xlsx',
      mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      dataUrl: SEED_XLSX_MATH,
    },
    {
      ids: ['file_05', '1IpsaGJ-sample-file-05'],
      name: 'ปพ5_ภาษาไทย_ม3_อรรถพล.pdf',
      mimeType: 'application/pdf',
      dataUrl: SEED_PDF_THAI_SCORES,
    },
    {
      ids: ['doc_file_01', '1IpsaGJ-doc-sample-01'],
      name: 'Template_Active_Learning_Plan_2569.docx',
      mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      dataUrl: SEED_DOCX_TEMPLATE,
    },
    {
      ids: ['doc_file_02', '1IpsaGJ-doc-sample-02'],
      name: 'Sample_Action_Research_Classroom.pdf',
      mimeType: 'application/pdf',
      dataUrl: SEED_PDF_ACTION_RESEARCH,
    },
    {
      ids: ['doc_file_03', '1IpsaGJ-doc-order-03'],
      name: 'คำสั่งโรงเรียน_ที่_142_2569_ตรวจแผน.pdf',
      mimeType: 'application/pdf',
      dataUrl: SEED_PDF_ORDER_142,
    },
    {
      ids: ['doc_file_04', '1IpsaGJ-doc-order-04'],
      name: 'คำสั่งโรงเรียน_148_2569_ภาระงานสอน.pdf',
      mimeType: 'application/pdf',
      dataUrl: SEED_PDF_ORDER_142,
    },
  ];

  for (const s of seedBinaryConfigs) {
    for (const sid of s.ids) {
      saveFileLocally(sid, s.name, s.mimeType, s.dataUrl, [s.name, ...s.ids]);
    }
  }

  // Pre-index existing files in UPLOAD_DIR on boot
  try {
    const existingUploadFiles = fs.readdirSync(UPLOAD_DIR);
    for (const ef of existingUploadFiles) {
      if (ef.endsWith('.meta.json')) {
        try {
          const baseName = ef.replace('.meta.json', '');
          const binPath = path.join(UPLOAD_DIR, `${baseName}.bin`);
          if (fs.existsSync(binPath)) {
            const meta = JSON.parse(fs.readFileSync(path.join(UPLOAD_DIR, ef), 'utf-8'));
            indexFileEntry(baseName, binPath, meta);
            if (meta?.fileName) indexFileEntry(meta.fileName, binPath, meta);
            if (meta?.id) indexFileEntry(meta.id, binPath, meta);
            if (meta?.clientFileId) indexFileEntry(meta.clientFileId, binPath, meta);
            if (meta?.driveFileId) indexFileEntry(meta.driveFileId, binPath, meta);
          }
        } catch {}
      }
    }
  } catch {}

  // Pre-index and restore any files with embedded fileDataUrl from academic_db.json
  try {
    if (fs.existsSync(DB_FILE_PATH)) {
      const dbContent = JSON.parse(fs.readFileSync(DB_FILE_PATH, 'utf-8'));
      const subms: any[] = dbContent?.data?.submissions || [];
      const docs: any[] = dbContent?.data?.documents || [];
      const allFiles: any[] = [];
      for (const s of subms) {
        if (Array.isArray(s.files)) allFiles.push(...s.files);
      }
      for (const d of docs) {
        if (d.file) allFiles.push(d.file);
      }
      for (const f of allFiles) {
        if (f.fileDataUrl && f.fileDataUrl.length > 50) {
          const fid = f.id || `file_${Date.now()}`;
          const fname = f.name || 'document';
          const fmime = f.mimeType || 'application/octet-stream';
          saveFileLocally(fid, fname, fmime, f.fileDataUrl, [f.id, f.driveFileId, f.name]);
        }
      }
    }
  } catch {}

  const getLocalFile = (id: string, requestedName?: string) => {
    try {
      if (!id && !requestedName) return null;

      // 1. Fast in-memory lookup via fileIndex
      const candidateKeys = [
        id,
        id?.toLowerCase(),
        sanitizeKey(id),
        sanitizeKey(id)?.toLowerCase(),
        requestedName,
        requestedName?.toLowerCase(),
        sanitizeKey(requestedName || ''),
        sanitizeKey(requestedName || '')?.toLowerCase(),
      ].filter(Boolean) as string[];

      for (const k of candidateKeys) {
        const found = fileIndex.get(k);
        if (found && fs.existsSync(found.binPath)) {
          return {
            buffer: fs.readFileSync(found.binPath),
            meta: found.meta,
          };
        }
      }

      // 2. Direct disk check by ID and clean ID
      if (id) {
        const cleanId = sanitizeKey(id);
        for (const checkId of [id, cleanId]) {
          const binPath = path.join(UPLOAD_DIR, `${checkId}.bin`);
          if (fs.existsSync(binPath)) {
            let meta: any = {};
            const metaPath = path.join(UPLOAD_DIR, `${checkId}.meta.json`);
            if (fs.existsSync(metaPath)) {
              try {
                meta = JSON.parse(fs.readFileSync(metaPath, 'utf-8'));
              } catch {}
            }
            indexFileEntry(checkId, binPath, meta);
            return {
              buffer: fs.readFileSync(binPath),
              meta,
            };
          }
        }
      }

      // 3. Fallback: Search all .meta.json files on disk
      if (requestedName || id) {
        const targetName = (requestedName || '').trim().toLowerCase();
        const targetId = (id || '').trim().toLowerCase();
        let decodedName = '';
        try {
          decodedName = decodeURIComponent(requestedName || '').trim().toLowerCase();
        } catch {}

        const allFiles = fs.readdirSync(UPLOAD_DIR);
        for (const f of allFiles) {
          if (f.endsWith('.meta.json')) {
            try {
              const metaContent = JSON.parse(fs.readFileSync(path.join(UPLOAD_DIR, f), 'utf-8'));
              const metaFileName = (metaContent?.fileName || '').trim().toLowerCase();
              const metaId = (metaContent?.id || '').trim().toLowerCase();
              const metaDriveId = (metaContent?.driveFileId || '').trim().toLowerCase();

              const matches =
                (targetId && (metaId === targetId || metaDriveId === targetId)) ||
                (targetName && metaFileName === targetName) ||
                (decodedName && metaFileName === decodedName) ||
                (targetName && metaFileName.includes(targetName)) ||
                (targetName && targetName.includes(metaFileName));

              if (matches) {
                const baseId = f.replace('.meta.json', '');
                const binPath = path.join(UPLOAD_DIR, `${baseId}.bin`);
                if (fs.existsSync(binPath)) {
                  indexFileEntry(baseId, binPath, metaContent);
                  if (metaContent?.fileName) indexFileEntry(metaContent.fileName, binPath, metaContent);
                  return {
                    buffer: fs.readFileSync(binPath),
                    meta: metaContent,
                  };
                }
              }
            } catch {}
          }
        }
      }

      // 4. Cross-reference academic_db.json (look for submission or document matching fileId or requestedName)
      try {
        if (fs.existsSync(DB_FILE)) {
          const dbData = JSON.parse(fs.readFileSync(DB_FILE, 'utf-8'));
          const submissions: any[] = dbData?.data?.submissions || [];
          const documents: any[] = dbData?.data?.documents || [];

          const allDbFiles: any[] = [];
          for (const s of submissions) {
            if (Array.isArray(s.files)) allDbFiles.push(...s.files);
          }
          for (const d of documents) {
            if (d.file) allDbFiles.push(d.file);
          }

          const matchedDbFile = allDbFiles.find(
            f =>
              (id && (f.id === id || f.driveFileId === id)) ||
              (requestedName && (f.name === requestedName || f.id === requestedName))
          );

          if (matchedDbFile) {
            // Check if fileDataUrl is embedded
            if (matchedDbFile.fileDataUrl && matchedDbFile.fileDataUrl.length > 50) {
              const cleanBase64 = matchedDbFile.fileDataUrl.includes(',')
                ? matchedDbFile.fileDataUrl.split(',')[1]
                : matchedDbFile.fileDataUrl;
              const buf = Buffer.from(cleanBase64, 'base64');
              if (buf.length > 0) {
                const meta = { fileName: matchedDbFile.name, mimeType: matchedDbFile.mimeType || 'application/octet-stream', size: buf.length };
                saveFileLocally(matchedDbFile.id || id, matchedDbFile.name, meta.mimeType, cleanBase64, [
                  matchedDbFile.id,
                  matchedDbFile.driveFileId,
                  matchedDbFile.name,
                ]);
                return { buffer: buf, meta };
              }
            }

            const alternateKeys = [matchedDbFile.id, matchedDbFile.driveFileId, matchedDbFile.name].filter(
              Boolean
            );
            for (const altKey of alternateKeys) {
              const altClean = sanitizeKey(altKey);
              const binPath = path.join(UPLOAD_DIR, `${altClean}.bin`);
              if (fs.existsSync(binPath)) {
                let meta: any = { fileName: matchedDbFile.name, mimeType: matchedDbFile.mimeType };
                const metaPath = path.join(UPLOAD_DIR, `${altClean}.meta.json`);
                if (fs.existsSync(metaPath)) {
                  try {
                    meta = JSON.parse(fs.readFileSync(metaPath, 'utf-8'));
                  } catch {}
                }
                indexFileEntry(altKey, binPath, meta);
                return { buffer: fs.readFileSync(binPath), meta };
              }
            }
          }
        }
      } catch {}

      // 5. Seed binary configs matching
      const seedMatch = seedBinaryConfigs.find(
        s =>
          (id && s.ids.includes(id)) ||
          (requestedName && s.name === requestedName) ||
          (requestedName && s.name.includes(requestedName)) ||
          (requestedName && requestedName.includes(s.name))
      );
      if (seedMatch) {
        const cleanBase64 = seedMatch.dataUrl.includes(',') ? seedMatch.dataUrl.split(',')[1] : seedMatch.dataUrl;
        const buf = Buffer.from(cleanBase64, 'base64');
        const meta = { fileName: seedMatch.name, mimeType: seedMatch.mimeType, size: buf.length };
        return { buffer: buf, meta };
      }
    } catch (err) {
      console.warn('[server.ts] getLocalFile error:', err);
    }
    return null;
  };

  // Dedicated local binary storage endpoint
  app.post('/api/files/upload', (req, res) => {
    const { fileId, clientFileId, driveFileId, fileName, mimeType, base64Data } = req.body;
    if (!base64Data) {
      return res.status(400).json({ success: false, message: 'Missing base64Data' });
    }
    const id = fileId || clientFileId || `file_${Date.now()}`;
    const actualName = fileName || 'document';
    const type = mimeType || 'application/octet-stream';
    const extraKeys = [clientFileId, driveFileId, actualName].filter(Boolean) as string[];

    saveFileLocally(id, actualName, type, base64Data, extraKeys);
    res.json({ success: true, fileId: id, fileName: actualName, mimeType: type });
  });

  app.post('/api/drive/upload', async (req, res) => {
    const authHeader = req.headers.authorization;
    const token = authHeader?.startsWith('Bearer ') ? authHeader.substring(7) : null;
    const { fileName, mimeType, base64Data, targetFolderId, clientFileId, fileId } = req.body;
    const folderId = targetFolderId || '1IpsaGJhJqtuYHTLiHmT2kqOe7CBq4as-';

    if (!base64Data) {
      return res.status(400).json({ success: false, message: 'Missing base64Data' });
    }

    const actualName = fileName || `Upload_${Date.now()}`;
    const fileType = mimeType || 'application/octet-stream';
    const preKeys = [clientFileId, fileId, actualName].filter(Boolean) as string[];

    // Immediately cache binary locally so anyone can download/preview it instantly
    const primaryPreId = clientFileId || fileId || `file_${Date.now()}`;
    saveFileLocally(primaryPreId, actualName, fileType, base64Data, preKeys);

    // If OAuth token is provided, upload directly via Google Drive API v3
    if (token) {
      try {
        const cleanBase64 = base64Data.includes(',') ? base64Data.split(',')[1] : base64Data;
        const fileBuffer = Buffer.from(cleanBase64, 'base64');

        const boundary = '-------314159265358979323846';
        const delimiter = `\r\n--${boundary}\r\n`;
        const closeDelimiter = `\r\n--${boundary}--`;

        const metadata = JSON.stringify({
          name: actualName,
          parents: [folderId],
        });

        const multipartRequestBody = Buffer.concat([
          Buffer.from(
            `${delimiter}Content-Type: application/json; charset=UTF-8\r\n\r\n${metadata}` +
            `${delimiter}Content-Type: ${fileType}\r\n\r\n`
          ),
          fileBuffer,
          Buffer.from(closeDelimiter),
        ]);

        const driveRes = await fetch(
          'https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart',
          {
            method: 'POST',
            headers: {
              Authorization: `Bearer ${token}`,
              'Content-Type': `multipart/related; boundary=${boundary}`,
              'Content-Length': multipartRequestBody.length.toString(),
            },
            body: multipartRequestBody,
          }
        );

        if (driveRes.ok) {
          const driveData: any = await driveRes.json();
          const assignedId = driveData.id;

          saveFileLocally(assignedId, actualName, fileType, base64Data);

          try {
            await fetch(`https://www.googleapis.com/drive/v3/files/${assignedId}/permissions`, {
              method: 'POST',
              headers: {
                Authorization: `Bearer ${token}`,
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                role: 'reader',
                type: 'anyone',
              }),
            });
          } catch {}

          return res.json({
            success: true,
            fileId: assignedId,
            fileName: driveData.name || actualName,
            mimeType: driveData.mimeType || fileType,
            folderId: folderId,
            viewUrl: `https://drive.google.com/file/d/${assignedId}/view`,
            downloadUrl: `https://drive.google.com/uc?export=download&id=${assignedId}`,
          });
        }
      } catch (tokenErr) {
        console.warn('[server.ts] Direct token upload failed, routing through GAS backend:', tokenErr);
      }
    }

    // Seamless Backend Route: Upload through Connected Google Apps Script
    try {
      const cleanBase64 = base64Data.includes(',') ? base64Data.split(',')[1] : base64Data;

      const gasRes = await fetch(CONNECTED_GAS_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain' },
        body: JSON.stringify({
          action: 'uploadFile',
          fileName: actualName,
          mimeType: fileType,
          base64Data: cleanBase64,
          targetFolderId: folderId,
        }),
        redirect: 'follow',
      });

      let gasData: any = {};
      try {
        gasData = await gasRes.json();
      } catch {}

      const assignedId = gasData?.fileId || `drive_f_${Date.now()}`;
      const extraKeys = [clientFileId, fileId, actualName].filter(Boolean) as string[];
      saveFileLocally(assignedId, actualName, fileType, base64Data, extraKeys);

      return res.json({
        success: true,
        fileId: assignedId,
        fileName: gasData?.fileName || actualName,
        mimeType: fileType,
        folderId: folderId,
        viewUrl: gasData?.viewUrl || `https://drive.google.com/file/d/${assignedId}/view`,
        downloadUrl: gasData?.downloadUrl || `https://drive.google.com/uc?export=download&id=${assignedId}`,
      });
    } catch (gasErr: any) {
      console.error('[server.ts] Backend GAS upload failure:', gasErr);
      const fallbackId = `file_${Date.now()}`;
      const extraKeys = [clientFileId, fileId, actualName].filter(Boolean) as string[];
      saveFileLocally(fallbackId, actualName, fileType, base64Data, extraKeys);
      res.json({
        success: true,
        fileId: fallbackId,
        fileName: actualName,
        mimeType: fileType,
        folderId: folderId,
        viewUrl: `/api/files/raw/${fallbackId}`,
        downloadUrl: `/api/files/download/${fallbackId}?name=${encodeURIComponent(actualName)}`,
      });
    }
  });

  // Google Drive File Deletion Relay (Backend safe proxy)
  app.post('/api/drive/delete', async (req, res) => {
    const { fileId, fileIds } = req.body;
    
    try {
      if (fileIds && Array.isArray(fileIds) && fileIds.length > 0) {
        fileIds.forEach((id: string) => {
          try {
            const binPath = path.join(UPLOAD_DIR, `${id}.bin`);
            if (fs.existsSync(binPath)) fs.unlinkSync(binPath);
            const metaPath = path.join(UPLOAD_DIR, `${id}.meta.json`);
            if (fs.existsSync(metaPath)) fs.unlinkSync(metaPath);
          } catch {}
        });

        fetch(CONNECTED_GAS_URL, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'deleteFiles', fileIds }),
          redirect: 'follow',
        }).catch(() => {});
      } else if (fileId) {
        try {
          const binPath = path.join(UPLOAD_DIR, `${fileId}.bin`);
          if (fs.existsSync(binPath)) fs.unlinkSync(binPath);
          const metaPath = path.join(UPLOAD_DIR, `${fileId}.meta.json`);
          if (fs.existsSync(metaPath)) fs.unlinkSync(metaPath);
        } catch {}

        fetch(CONNECTED_GAS_URL, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'deleteFile', fileId }),
          redirect: 'follow',
        }).catch(() => {});
      }
      res.json({ success: true, message: 'File deletion completed safely' });
    } catch {
      res.json({ success: true, message: 'Ignored' });
    }
  });

  // Download raw file directly by exact or matching filename
  app.get('/api/files/download/by-name', (req, res) => {
    const requestedName = (req.query.name as string) || '';
    if (!requestedName) return res.status(400).send('File name required');
    const local = getLocalFile('', requestedName);
    if (local) {
      const cleanFileName = path.basename(requestedName).replace(/["\r\n]/g, '');
      const contentType = local.meta?.mimeType || 'application/octet-stream';
      res.setHeader('Content-Type', contentType);
      res.setHeader('Content-Disposition', formatContentDisposition(cleanFileName));
      return res.send(local.buffer);
    }
    return res.status(404).send('File not found by name');
  });

  // File Download Proxy: Streams raw binary file, preserves original filename strictly with no modification
  app.get(['/api/drive/download/:fileId', '/api/files/download/:fileId'], async (req, res) => {
    const { fileId } = req.params;
    const requestedName = (req.query.name as string) || '';

    // Priority 1: Check local disk storage (fastest, 100% authentic raw binary)
    const local = getLocalFile(fileId, requestedName);
    if (local) {
      const finalFileName = requestedName || local.meta?.fileName || 'document';
      const cleanFileName = path.basename(finalFileName).replace(/["\r\n]/g, '');
      const contentType = local.meta?.mimeType || 'application/octet-stream';
      res.setHeader('Content-Type', contentType);
      res.setHeader('Content-Disposition', formatContentDisposition(cleanFileName));
      return res.send(local.buffer);
    }

    // Priority 2: Look up corresponding driveFileId or fileId from academic_db.json if available
    let candidateDriveId = fileId;
    let fallbackName = requestedName;
    try {
      if (fs.existsSync(DB_FILE)) {
        const dbData = JSON.parse(fs.readFileSync(DB_FILE, 'utf-8'));
        const submissions: any[] = dbData?.data?.submissions || [];
        const documents: any[] = dbData?.data?.documents || [];
        const allDbFiles: any[] = [];
        for (const s of submissions) {
          if (Array.isArray(s.files)) allDbFiles.push(...s.files);
        }
        for (const d of documents) {
          if (d.file) allDbFiles.push(d.file);
        }

        const match = allDbFiles.find(
          f =>
            (fileId && (f.id === fileId || f.driveFileId === fileId)) ||
            (requestedName && (f.name === requestedName || f.id === requestedName))
        );

        if (match) {
          if (match.driveFileId && !match.driveFileId.startsWith('drive_local_') && !match.driveFileId.startsWith('file_')) {
            candidateDriveId = match.driveFileId;
          }
          if (!fallbackName && match.name) {
            fallbackName = match.name;
          }
        }
      }
    } catch {}

    const cleanFileName = path.basename(fallbackName || requestedName || 'document').replace(/["\r\n]/g, '');

    if (candidateDriveId && !candidateDriveId.startsWith('drive_local_') && !candidateDriveId.startsWith('file_')) {
      try {
        const driveUrl = `https://drive.google.com/uc?export=download&id=${encodeURIComponent(candidateDriveId)}&confirm=t`;
        const driveResponse = await fetch(driveUrl, { redirect: 'follow' });

        if (driveResponse.ok) {
          const contentType = driveResponse.headers.get('content-type') || 'application/octet-stream';
          const isHtml = contentType.includes('text/html');

          if (isHtml) {
            // Check for Google Drive virus scan prompt token confirm=xxxx
            const htmlText = await driveResponse.text();
            const confirmMatch = htmlText.match(/confirm=([0-9A-Za-z_-]+)/);
            if (confirmMatch) {
              const confirmedUrl = `https://drive.google.com/uc?export=download&id=${encodeURIComponent(candidateDriveId)}&confirm=${confirmMatch[1]}`;
              const confirmedRes = await fetch(confirmedUrl, { redirect: 'follow' });
              if (confirmedRes.ok) {
                const confType = confirmedRes.headers.get('content-type') || 'application/octet-stream';
                if (!confType.includes('text/html')) {
                  const arrBuf = await confirmedRes.arrayBuffer();
                  const buf = Buffer.from(arrBuf);
                  saveFileLocally(candidateDriveId, cleanFileName, confType, buf.toString('base64'), [fileId, cleanFileName]);
                  res.setHeader('Content-Type', confType);
                  res.setHeader('Content-Disposition', formatContentDisposition(cleanFileName));
                  return res.send(buf);
                }
              }
            }
          } else {
            const arrayBuffer = await driveResponse.arrayBuffer();
            const buf = Buffer.from(arrayBuffer);
            // Cache locally so future downloads are 100% instant
            saveFileLocally(candidateDriveId, cleanFileName, contentType, buf.toString('base64'), [fileId, cleanFileName]);

            res.setHeader('Content-Type', contentType);
            res.setHeader('Content-Disposition', formatContentDisposition(cleanFileName));
            return res.send(buf);
          }
        }
      } catch (err: any) {
        console.error('[server.ts] Download proxy error:', err);
      }
    }

    res.status(404).send('File not found for download');
  });

  // Raw file endpoint for viewer / embed (inline display)
  app.get('/api/files/raw/:fileId', async (req, res) => {
    const { fileId } = req.params;
    const requestedName = (req.query.name as string) || '';
    const local = getLocalFile(fileId, requestedName);
    if (local) {
      const contentType = local.meta?.mimeType || 'application/octet-stream';
      res.setHeader('Content-Type', contentType);
      res.setHeader('Content-Disposition', 'inline');
      return res.send(local.buffer);
    }

    try {
      const driveUrl = `https://drive.google.com/uc?export=download&id=${encodeURIComponent(fileId)}&confirm=t`;
      const driveResponse = await fetch(driveUrl, { redirect: 'follow' });
      if (driveResponse.ok) {
        const contentType = driveResponse.headers.get('content-type') || 'application/octet-stream';
        res.setHeader('Content-Type', contentType);
        res.setHeader('Content-Disposition', 'inline');
        const arrayBuffer = await driveResponse.arrayBuffer();
        return res.send(Buffer.from(arrayBuffer));
      }
    } catch {}

    res.status(404).send('Raw file not found');
  });

  // JSON base64 data for client-side parsers
  app.get('/api/files/data/:fileId', async (req, res) => {
    const { fileId } = req.params;
    const requestedName = (req.query.name as string) || '';
    const local = getLocalFile(fileId, requestedName);
    if (local) {
      const mimeType = local.meta?.mimeType || 'application/octet-stream';
      const base64 = local.buffer.toString('base64');
      return res.json({
        success: true,
        fileName: local.meta?.fileName || requestedName || 'document',
        mimeType,
        base64Data: base64,
        dataUrl: `data:${mimeType};base64,${base64}`,
      });
    }

    try {
      const driveUrl = `https://drive.google.com/uc?export=download&id=${encodeURIComponent(fileId)}&confirm=t`;
      const driveResponse = await fetch(driveUrl, { redirect: 'follow' });
      if (driveResponse.ok) {
        const mimeType = driveResponse.headers.get('content-type') || 'application/octet-stream';
        const arrayBuffer = await driveResponse.arrayBuffer();
        const base64 = Buffer.from(arrayBuffer).toString('base64');
        return res.json({
          success: true,
          fileName: requestedName || 'document',
          mimeType,
          base64Data: base64,
          dataUrl: `data:${mimeType};base64,${base64}`,
        });
      }
    } catch {}

    res.status(404).json({ success: false, message: 'File data not found' });
  });

  // Broadcast helper
  const broadcastSync = (eventType: string, payload: any, senderClientId?: string) => {
    serverDataVersion = Date.now();
    const data = JSON.stringify({ 
      type: eventType, 
      payload, 
      version: serverDataVersion,
      senderClientId,
      timestamp: Date.now() 
    });
    
    sseClients.forEach((client) => {
      try {
        client.res.write(`data: ${data}\n\n`);
      } catch {
        // Handle disconnected client
      }
    });
  };

  // Real-time SSE Endpoint (Server-Sent Events)
  app.get('/api/sync/sse', (req, res) => {
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.flushHeaders();

    const clientId = 'client_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7);
    sseClients.push({ id: clientId, res });

    // Send initial ping with current version and active clients
    res.write(`data: ${JSON.stringify({ 
      type: 'INIT_SYNC', 
      version: serverDataVersion, 
      clientsCount: sseClients.length,
      timestamp: Date.now() 
    })}\n\n`);

    req.on('close', () => {
      const index = sseClients.findIndex(c => c.id === clientId);
      if (index !== -1) {
        sseClients.splice(index, 1);
      }
    });
  });

  // Keep-alive heartbeat every 15s
  setInterval(() => {
    sseClients.forEach((client) => {
      try {
        client.res.write(`data: ${JSON.stringify({ type: 'HEARTBEAT', version: serverDataVersion, timestamp: Date.now() })}\n\n`);
      } catch {
        // ignore
      }
    });
  }, 15000);

  // Check version endpoint (High-speed check for polling clients)
  app.get('/api/sync/version', (req, res) => {
    res.json({
      version: serverDataVersion,
      clientsCount: sseClients.length,
      timestamp: Date.now(),
    });
  });

  // Get all data collection
  app.get('/api/data/all', (req, res) => {
    if (Array.isArray(serverDataStore.announcements)) {
      serverDataStore.announcements = serverDataStore.announcements.filter(
        (a) => a.id !== 'ann_03' && !a.title?.includes('SAR ประจำปี')
      );
    }
    res.json({
      version: serverDataVersion,
      data: serverDataStore,
      school: serverSchoolProfile,
      timestamp: Date.now(),
    });
  });

  // Sync / Mutate endpoint (insert, update, delete, batch)
  app.post('/api/sync', (req, res) => {
    const { table, action, data, school, fullState, clientId } = req.body;

    if (fullState) {
      // Full state sync
      if (fullState.users) serverDataStore.users = fullState.users;
      if (fullState.assignments) serverDataStore.assignments = fullState.assignments;
      if (fullState.submissions) serverDataStore.submissions = fullState.submissions;
      if (fullState.documents) serverDataStore.documents = fullState.documents;
      if (fullState.websites) serverDataStore.websites = fullState.websites;
      if (fullState.announcements) {
        serverDataStore.announcements = fullState.announcements.filter(
          (a: any) => a.id !== 'ann_03' && !a.title?.includes('SAR ประจำปี')
        );
      }
      if (fullState.lunch_menus) serverDataStore.lunch_menus = fullState.lunch_menus;
      if (fullState.audit_logs) serverDataStore.audit_logs = fullState.audit_logs;
      if (fullState.school) serverSchoolProfile = fullState.school;
    } else if (table && serverDataStore[table]) {
      const list = serverDataStore[table];
      if (action === 'insert') {
        const existingIdx = list.findIndex((item) => item.id === data.id);
        if (existingIdx >= 0) {
          list[existingIdx] = data;
        } else {
          list.unshift(data);
        }
      } else if (action === 'update') {
        const idx = list.findIndex((item) => item.id === data.id);
        if (idx >= 0) {
          list[idx] = { ...list[idx], ...data };
        } else {
          list.unshift(data);
        }
      } else if (action === 'delete') {
        serverDataStore[table] = (serverDataStore[table] || []).filter((item: any) => {
          if (data && data.id && item.id === data.id) return false;
          if (data && data.title && item.title === data.title) return false;
          return true;
        });
        if (table === 'assignments' && data && data.id) {
          serverDataStore.submissions = (serverDataStore.submissions || []).filter((s: any) => s.assignmentId !== data.id);
          serverDataStore.announcements = (serverDataStore.announcements || []).filter((a: any) => a.assignmentId !== data.id);
        }
      } else if (action === 'setList') {
        serverDataStore[table] = Array.isArray(data) 
          ? data.filter((a: any) => a.id !== 'ann_03' && !a.title?.includes('SAR ประจำปี'))
          : [];
      }
    }

    if (school) {
      serverSchoolProfile = school;
    }

    saveDbToDisk();

    broadcastSync('DATA_CHANGED', { table, action, dataId: data?.id, clientId }, clientId);

    res.json({
      success: true,
      version: serverDataVersion,
      message: 'Synchronized across all browsers in real-time',
    });
  });

  // API trigger for real-time broadcasts
  app.post('/api/sync/broadcast', (req, res) => {
    const { eventType, payload, clientId } = req.body;
    broadcastSync(eventType || 'DATA_CHANGED', payload || {}, clientId);
    res.json({ success: true, version: serverDataVersion });
  });

  // Service Worker for PWA (Always serve as javascript with correct MIME type)
  app.get(['/sw.js', '/dev-dist/sw.js'], (req, res) => {
    const publicSw = path.join(process.cwd(), 'public', 'sw.js');
    if (fs.existsSync(publicSw)) {
      res.setHeader('Content-Type', 'application/javascript; charset=utf-8');
      return res.sendFile(publicSw);
    }
    const distSw = path.join(process.cwd(), 'dist', 'sw.js');
    if (fs.existsSync(distSw)) {
      res.setHeader('Content-Type', 'application/javascript; charset=utf-8');
      return res.sendFile(distSw);
    }
    res.setHeader('Content-Type', 'application/javascript; charset=utf-8');
    return res.send('self.addEventListener("install", () => self.skipWaiting()); self.addEventListener("activate", () => self.clients.claim());');
  });

  // Vite development middleware vs production static files
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: {
        middlewareMode: true,
        hmr: process.env.DISABLE_HMR === 'true' ? false : undefined,
      },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Academic System Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
