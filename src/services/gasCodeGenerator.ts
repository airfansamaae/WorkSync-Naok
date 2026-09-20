/**
 * Google Apps Script & Cloudflare D1 Deployment Code Generator
 * Meets all critical technical specifications:
 * - Target Root Drive Folder ID: 1IpsaGJhJqtuYHTLiHmT2kqOe7CBq4as-
 * - Rule: NEVER delete folders (only single specified files)
 * - File stream/preview without redirect
 * - D1 schema with created_at & updated_at on all tables
 */

export const GOOGLE_APPS_SCRIPT_CODE = `/**
 * =========================================================================
 * GOOGLE APPS SCRIPT (GAS) - DRIVE STORAGE ENGINE FOR ACADEMIC MANAGEMENT
 * สคริปต์เชื่อมต่อและจัดเก็บไฟล์ระบบวิชาการลง Google Drive อัตโนมัติ
 * =========================================================================
 * 
 * 📁 FOLDER ID เป้าหมาย: 1IpsaGJhJqtuYHTLiHmT2kqOe7CBq4as-
 * 
 * 📋 วิธีการติดตั้งและนำไปใช้งาน (Deployment Guide):
 * -------------------------------------------------------------------------
 * 1. เปิดเว็บไซต์ https://script.google.com แล้วกดปุ่ม "+ โครงการใหม่" (New project)
 * 2. ตั้งชื่อโครงการ เช่น "Academic Drive Storage Engine"
 * 3. ลบโค้ดเริ่มต้นทั้งหมดในไฟล์ Code.gs แล้ววางโค้ดนี้ทั้งหมดลงไป
 * 4. กดปุ่มบันทึก 💾 (Ctrl+S หรือ Command+S)
 * 5. กดปุ่มสีน้ำเงิน "การทำให้ใช้งานได้" (Deploy) -> เลือก "การทำให้ใช้งานได้รายการใหม่" (New deployment)
 * 6. กดที่ไอคอนรูปเฟือง ⚙️ ข้าง "เลือกประเภท" -> เลือก "เว็บแอป" (Web app)
 * 7. ตั้งค่าการทำให้ใช้งานได้:
 *    - คำอธิบาย: Web App สำหรับเชื่อม Google Drive
 *    - ดำเนินการในฐานะ (Execute as): "ฉัน (อีเมลของท่าน)"
 *    - ผู้ที่มีสิทธิ์เข้าถึง (Who has access): "ทุกคน" (Anyone) **สำคัญมาก ต้องเลือก ทุกคน**
 * 8. กดปุ่ม "ทำให้ใช้งานได้" (Deploy)
 * 9. กด "ให้สิทธิ์เข้าถึง" (Authorize access) และเลือกบัญชี Google ของท่าน
 *    (หากมีหน้าต่างเตือน ให้กด "Advanced" หรือ "ขั้นสูง" แล้วกด "Go to ... (unsafe)")
 * 10. คัดลอก "URL ของเว็บแอป" (ขึ้นต้นด้วย https://script.google.com/macros/s/.../exec)
 * 11. นำ URL ที่ได้ไปวางในเมนู "ตั้งค่า" -> "Google Apps Script & Drive" ในระบบวิชาการ
 * -------------------------------------------------------------------------
 * 
 * 🔒 กฎเหล็กด้านความปลอดภัย (SAFETY RULES):
 * 1. 【ห้ามลบโฟลเดอร์โดยเด็ดขาด】 ป้องกันไม่ให้มีการลบ Folder หลัก (1IpsaGJhJqtuYHTLiHmT2kqOe7CBq4as-) หรือโฟลเดอร์ย่อยใดๆ
 * 2. 【ลบเฉพาะไฟล์เดี่ยวที่ระบุเท่านั้น】 ย้ายเฉพาะไฟล์เอกสารที่ต้องการลบไปไว้ในถังขยะ (Trash)
 * 3. 【รองรับไฟล์ทุกประเภท】 ถอดรหัส Base64 ตรงลง Drive และตั้งค่าสิทธิ์ให้เข้าถึงได้
 * =========================================================================
 */

// โฟลเดอร์หลัก Google Drive ที่ใช้จัดเก็บเอกสาร
var ROOT_FOLDER_ID = '1IpsaGJhJqtuYHTLiHmT2kqOe7CBq4as-';

/**
 * Handle GET Requests (Health Check / Ping / Status / File Info)
 */
function doGet(e) {
  try {
    var params = (e && e.parameter) ? e.parameter : {};
    var action = params.action || 'ping';

    // 1. ตรวจสอบสถานะการเชื่อมต่อ (Ping)
    if (action === 'ping') {
      var rootFolderName = 'กำลังตรวจสอบ...';
      try {
        var folder = DriveApp.getFolderById(ROOT_FOLDER_ID);
        rootFolderName = folder.getName();
      } catch (fErr) {
        rootFolderName = 'ไม่สามารถอ่านชื่อโฟลเดอร์ได้ (' + fErr.toString() + ')';
      }

      return jsonResponse({
        status: 'success',
        message: 'Google Apps Script Drive Engine เชื่อมต่อสมบูรณ์ พร้อมใช้งาน',
        folderId: ROOT_FOLDER_ID,
        folderName: rootFolderName,
        driveUrl: 'https://drive.google.com/drive/folders/' + ROOT_FOLDER_ID,
        timestamp: new Date().toISOString()
      });
    }

    // 2. ดึงข้อมูลโฟลเดอร์หลัก
    if (action === 'getRootFolderInfo') {
      var rootFolder = DriveApp.getFolderById(ROOT_FOLDER_ID);
      return jsonResponse({
        status: 'success',
        folderId: rootFolder.getId(),
        folderName: rootFolder.getName(),
        url: rootFolder.getUrl()
      });
    }

    // 3. ดูข้อมูลไฟล์เดี่ยว
    if (action === 'getFileInfo') {
      var fileId = params.fileId;
      if (!fileId) return jsonResponse({ status: 'error', message: 'Missing fileId' });

      var file = DriveApp.getFileById(fileId);
      return jsonResponse({
        status: 'success',
        fileId: file.getId(),
        fileName: file.getName(),
        mimeType: file.getMimeType(),
        size: file.getSize(),
        viewUrl: 'https://drive.google.com/file/d/' + file.getId() + '/view',
        previewUrl: 'https://drive.google.com/file/d/' + file.getId() + '/preview',
        downloadUrl: 'https://drive.google.com/uc?export=download&id=' + file.getId()
      });
    }

    // 4. ดึงไฟล์แบบ Base64 สำหรับไอคอนรูปตา (Preview)
    if (action === 'getFileBase64' || action === 'getFile') {
      var targetFileId = params.fileId;
      if (!targetFileId) return jsonResponse({ status: 'error', message: 'Missing fileId' });

      var fileToRead = DriveApp.getFileById(targetFileId);
      var blob = fileToRead.getBlob();
      var base64Str = Utilities.base64Encode(blob.getBytes());
      return jsonResponse({
        status: 'success',
        fileId: fileToRead.getId(),
        fileName: fileToRead.getName(),
        mimeType: fileToRead.getMimeType(),
        size: fileToRead.getSize(),
        base64: base64Str,
        viewUrl: 'https://drive.google.com/file/d/' + fileToRead.getId() + '/view',
        previewUrl: 'https://drive.google.com/file/d/' + fileToRead.getId() + '/preview',
        downloadUrl: 'https://drive.google.com/uc?export=download&id=' + fileToRead.getId()
      });
    }

    // 5. ดาวน์โหลดไฟล์เดี่ยวตรง (Direct File Download Stream)
    if (action === 'download') {
      var dlFileId = params.fileId;
      if (!dlFileId) return jsonResponse({ status: 'error', message: 'Missing fileId' });
      var fileToDl = DriveApp.getFileById(dlFileId);
      return fileToDl.getBlob();
    }

    // 6. ลบไฟล์เดี่ยวผ่าน GET (Fallback เมื่อ POST ติด CORS)
    if (action === 'deleteFile') {
      var delFileId = params.fileId;
      if (!delFileId || delFileId === ROOT_FOLDER_ID) {
        return jsonResponse({ status: 'error', message: 'รหัสไฟล์ไม่ถูกต้องหรือห้ามลบโฟลเดอร์หลัก' });
      }
      var fTrash = DriveApp.getFileById(delFileId);
      fTrash.setTrashed(true);
      return jsonResponse({ status: 'success', message: 'ลบไฟล์ใน Google Drive สำเร็จ', fileId: delFileId });
    }

    // Default HTML response when opened in browser directly
    var htmlContent = '<!DOCTYPE html><html><head><meta charset="utf-8">' +
      '<title>Google Apps Script Drive Service</title>' +
      '<style>body{font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,sans-serif;background:#f8fafc;color:#1e293b;display:flex;align-items:center;justify-content:center;height:100vh;margin:0;}' +
      '.card{background:#fff;padding:32px;border-radius:16px;box-shadow:0 10px 25px -5px rgba(0,0,0,0.05);max-width:500px;text-align:center;border:1px solid #e2e8f0;}' +
      '.badge{display:inline-block;padding:4px 12px;background:#dcfce7;color:#15803d;border-radius:9999px;font-size:12px;font-weight:700;margin-bottom:12px;}' +
      'h1{font-size:20px;margin:0 0 8px 0;color:#0f172a;}p{font-size:14px;color:#64748b;line-height:1.5;margin:0 0 16px 0;}' +
      'code{background:#f1f5f9;padding:4px 8px;border-radius:6px;font-size:12px;color:#7c3aed;word-break:break-all;}' +
      '</style></head><body><div class="card">' +
      '<div class="badge">● เชื่อมต่อออนไลน์ (Active)</div>' +
      '<h1>ระบบ Google Apps Script เชื่อมต่อ Google Drive</h1>' +
      '<p>บริการ API พร้อมรับส่งไฟล์งานวิชาการและเอกสาร</p>' +
      '<p><b>Folder ID:</b><br><code>' + ROOT_FOLDER_ID + '</code></p>' +
      '</div></body></html>';

    return HtmlService.createHtmlOutput(htmlContent)
      .setTitle('Google Apps Script Drive Engine')
      .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
  } catch (err) {
    return jsonResponse({ status: 'error', message: err.toString() });
  }
}

/**
 * Handle POST Requests (File Upload / Safe Deletion / Folder Creation)
 */
function doPost(e) {
  try {
    var payload = {};
    if (e && e.postData && e.postData.contents) {
      try {
        payload = JSON.parse(e.postData.contents);
      } catch (parseErr) {
        payload = e.parameter || {};
      }
    } else if (e && e.parameter) {
      payload = e.parameter;
    }

    var action = payload.action || 'uploadFile';

    // =========================================================================
    // ACTION 1: อัปโหลดไฟล์ลง Google Drive
    // =========================================================================
    if (action === 'uploadFile') {
      var fileName = payload.fileName || ('File_' + new Date().getTime());
      var mimeType = payload.mimeType || 'application/octet-stream';
      var base64Data = payload.base64Data || payload.data;
      var targetFolderId = payload.targetFolderId || payload.folderId || ROOT_FOLDER_ID;
      var subfolderName = payload.subfolderName || payload.topicName;

      if (!base64Data) {
        return jsonResponse({ status: 'error', message: 'Missing base64Data: ไม่พบข้อมูลไฟล์' });
      }

      // ตัด Data URL Prefix ออกหากมี เช่น "data:image/png;base64,..."
      var cleanBase64 = base64Data;
      if (cleanBase64.indexOf(',') !== -1) {
        cleanBase64 = cleanBase64.split(',')[1];
      }

      // แปลง Base64 เป็น Binary Blob
      var decodedBytes = Utilities.base64Decode(cleanBase64);
      var blob = Utilities.newBlob(decodedBytes, mimeType, fileName);

      // ค้นหาหรือสร้างโฟลเดอร์ปลายทาง
      var destinationFolder;
      try {
        if (subfolderName) {
          var rootFolder = DriveApp.getFolderById(ROOT_FOLDER_ID);
          var existingSubfolders = rootFolder.getFoldersByName(subfolderName);
          if (existingSubfolders.hasNext()) {
            destinationFolder = existingSubfolders.next();
          } else {
            destinationFolder = rootFolder.createFolder(subfolderName);
          }
        } else {
          destinationFolder = DriveApp.getFolderById(targetFolderId);
        }
      } catch (fErr) {
        // หากไม่พบโฟลเดอร์ย่อย ให้บันทึกไว้ที่ Root Folder ทันที
        destinationFolder = DriveApp.getFolderById(ROOT_FOLDER_ID);
      }

      // สร้างไฟล์ใน Google Drive
      var createdFile = destinationFolder.createFile(blob);

      // กำหนดสิทธิ์ให้อ่าน/ดูไฟล์ได้ผ่านลิงก์
      try {
        createdFile.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
      } catch (permErr) {
        // ข้ามหากติดข้อจำกัด Policy ของโดเมนสถานศึกษา
      }

      var fileId = createdFile.getId();
      var downloadUrl = 'https://drive.google.com/uc?export=download&id=' + fileId;
      var previewUrl = 'https://drive.google.com/file/d/' + fileId + '/view';

      return jsonResponse({
        status: 'success',
        message: 'อัปโหลดไฟล์เข้าสู่ Google Drive เรียบร้อย',
        fileId: fileId,
        fileName: createdFile.getName(),
        mimeType: createdFile.getMimeType(),
        size: createdFile.getSize(),
        viewUrl: previewUrl,
        downloadUrl: downloadUrl,
        folderId: destinationFolder.getId(),
        folderName: destinationFolder.getName(),
        timestamp: new Date().toISOString()
      });
    }

    // =========================================================================
    // ACTION 2: ลบไฟล์เดี่ยวอย่างปลอดภัย (ห้ามลบโฟลเดอร์หลักเด็ดขาด)
    // =========================================================================
    if (action === 'deleteFile') {
      var targetFileId = payload.fileId;
      if (!targetFileId) {
        return jsonResponse({ status: 'error', message: 'Missing fileId: กรุณาระบุรหัสไฟล์' });
      }

      // 🛑 ตรวจสอบความปลอดภัยสูงสุด: ห้ามลบโฟลเดอร์หลัก
      if (targetFileId === ROOT_FOLDER_ID) {
        return jsonResponse({
          status: 'error',
          message: 'ข้อผิดพลาดด้านความปลอดภัย: ห้ามลบโฟลเดอร์หลักของระบบเด็ดขาด'
        });
      }

      try {
        var fileToTrash = DriveApp.getFileById(targetFileId);
        fileToTrash.setTrashed(true);
        return jsonResponse({
          status: 'success',
          message: 'ลบไฟล์ใน Google Drive เรียบร้อย (ย้ายไปถังขยะ)',
          fileId: targetFileId
        });
      } catch (delErr) {
        return jsonResponse({
          status: 'warning',
          message: 'ไฟล์ถูกลบไปแล้วหรือไม่พบไฟล์: ' + delErr.toString(),
          fileId: targetFileId
        });
      }
    }

    // =========================================================================
    // ACTION 3: ลบไฟล์ทีละหลายรายการ (Batch File Deletion)
    // =========================================================================
    if (action === 'deleteFiles') {
      var fileIds = payload.fileIds || [];
      if (!Array.isArray(fileIds) || fileIds.length === 0) {
        return jsonResponse({ status: 'error', message: 'Missing or empty fileIds array' });
      }

      var deletedCount = 0;
      var errors = [];

      for (var i = 0; i < fileIds.length; i++) {
        var currentId = fileIds[i];
        if (currentId && currentId !== ROOT_FOLDER_ID) {
          try {
            var f = DriveApp.getFileById(currentId);
            f.setTrashed(true);
            deletedCount++;
          } catch (itemErr) {
            errors.push({ fileId: currentId, error: itemErr.toString() });
          }
        }
      }

      return jsonResponse({
        status: 'success',
        message: 'ดำเนินการลบไฟล์เสร็จสิ้น ' + deletedCount + ' รายการ',
        deletedCount: deletedCount,
        errors: errors
      });
    }

    // =========================================================================
    // ACTION 4: สร้างโฟลเดอร์ย่อยตามชื่องาน (Create Subfolder)
    // =========================================================================
    if (action === 'createFolder' || action === 'createTopicFolder') {
      var folderName = payload.folderName || payload.topicName;
      if (!folderName) {
        return jsonResponse({ status: 'error', message: 'Missing folderName' });
      }

      var rootF = DriveApp.getFolderById(ROOT_FOLDER_ID);
      var checkExisting = rootF.getFoldersByName(folderName);
      var targetF;
      if (checkExisting.hasNext()) {
        targetF = checkExisting.next();
      } else {
        targetF = rootF.createFolder(folderName);
      }

      return jsonResponse({
        status: 'success',
        folderId: targetF.getId(),
        folderName: targetF.getName(),
        url: targetF.getUrl()
      });
    }

    // =========================================================================
    // ACTION 5: ดึง Base64 ของไฟล์สำหรับไอคอนรูปตา (Preview)
    // =========================================================================
    if (action === 'getFileBase64' || action === 'getFile') {
      var fetchId = payload.fileId;
      if (!fetchId) return jsonResponse({ status: 'error', message: 'Missing fileId' });

      var fileToReadPost = DriveApp.getFileById(fetchId);
      var blobPost = fileToReadPost.getBlob();
      var base64StrPost = Utilities.base64Encode(blobPost.getBytes());
      return jsonResponse({
        status: 'success',
        fileId: fileToReadPost.getId(),
        fileName: fileToReadPost.getName(),
        mimeType: fileToReadPost.getMimeType(),
        size: fileToReadPost.getSize(),
        base64: base64StrPost,
        viewUrl: 'https://drive.google.com/file/d/' + fileToReadPost.getId() + '/view',
        previewUrl: 'https://drive.google.com/file/d/' + fileToReadPost.getId() + '/preview',
        downloadUrl: 'https://drive.google.com/uc?export=download&id=' + fileToReadPost.getId()
      });
    }

    // =========================================================================
    // ACTION 6: ทดสอบ Ping ทาง POST
    // =========================================================================
    if (action === 'ping') {
      return jsonResponse({
        status: 'success',
        message: 'Google Apps Script POST Endpoint ทำงานปกติ',
        folderId: ROOT_FOLDER_ID,
        timestamp: new Date().toISOString()
      });
    }

    return jsonResponse({ status: 'error', message: 'คำสั่ง action ไม่ถูกต้อง: ' + action });
  } catch (globalErr) {
    return jsonResponse({ status: 'error', message: globalErr.toString() });
  }
}

/**
 * Output Helper: JSON Response พร้อมตั้งค่า MimeType ถูกต้องตามมาตรฐาน
 */
function jsonResponse(data) {
  return ContentService.createTextOutput(JSON.stringify(data))
    .setMimeType(ContentService.MimeType.JSON);
}
`;

export const CLOUDFLARE_D1_SCHEMA = `-- =========================================================================
-- CLOUDFLARE D1 DATABASE SCHEMA FOR ACADEMIC MANAGEMENT SYSTEM
-- ALL TABLES REQUIRE: created_at & updated_at TIMESTAMP FIELDS
-- =========================================================================

-- 1. USERS TABLE (Members and Admins)
CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  username TEXT NOT NULL UNIQUE,
  full_name TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'member', -- 'admin' or 'member'
  status TEXT NOT NULL DEFAULT 'pending', -- 'approved', 'pending', 'rejected'
  email TEXT,
  department TEXT,
  position TEXT,
  avatar_url TEXT,
  password_hash TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 2. ASSIGNMENTS TABLE (Tasks assigned by Admin)
CREATE TABLE IF NOT EXISTS assignments (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT,
  due_date_start DATE NOT NULL,
  due_date_end DATE NOT NULL,
  academic_year TEXT NOT NULL DEFAULT '2569',
  term TEXT NOT NULL DEFAULT '1',
  created_by TEXT NOT NULL,
  created_by_name TEXT NOT NULL,
  drive_folder_id TEXT,
  drive_folder_name TEXT,
  status TEXT NOT NULL DEFAULT 'open', -- 'open' or 'closed'
  type TEXT NOT NULL DEFAULT 'assignment', -- 'assignment' or 'announcement'
  allowed_file_types TEXT,
  max_file_size_mb INTEGER DEFAULT 25,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (created_by) REFERENCES users(id)
);

-- 3. SUBMISSIONS TABLE (Work submitted by Members)
CREATE TABLE IF NOT EXISTS submissions (
  id TEXT PRIMARY KEY,
  assignment_id TEXT NOT NULL,
  assignment_title TEXT NOT NULL,
  member_id TEXT NOT NULL,
  member_name TEXT NOT NULL,
  member_avatar TEXT,
  department TEXT,
  files_json TEXT NOT NULL, -- JSON array of file objects
  note TEXT,
  submission_date DATE NOT NULL,
  status TEXT NOT NULL DEFAULT 'submitted', -- 'submitted', 'late', 'reviewed'
  feedback TEXT,
  score REAL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (assignment_id) REFERENCES assignments(id),
  FOREIGN KEY (member_id) REFERENCES users(id)
);

-- 4. DOCUMENTS TABLE (Official Orders & Sample Templates in Document Center)
CREATE TABLE IF NOT EXISTS documents (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  category TEXT NOT NULL, -- 'sample', 'order', 'general'
  description TEXT,
  doc_number TEXT,
  issue_date DATE NOT NULL,
  file_json TEXT NOT NULL, -- JSON object of file data
  uploader_id TEXT NOT NULL,
  uploader_name TEXT NOT NULL,
  download_count INTEGER DEFAULT 0,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (uploader_id) REFERENCES users(id)
);

-- 5. ANNOUNCEMENTS TABLE (Dashboard notices & banners)
CREATE TABLE IF NOT EXISTS announcements (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  type TEXT NOT NULL DEFAULT 'general', -- 'deadline' (Red) or 'general' (Yellow)
  date DATE NOT NULL,
  assignment_id TEXT,
  author_name TEXT NOT NULL,
  is_urgent INTEGER DEFAULT 0,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 6. WEBSITES TABLE (Recommended educational & governmental websites)
CREATE TABLE IF NOT EXISTS websites (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT,
  url TEXT NOT NULL,
  imageUrl TEXT,
  driveFileId TEXT,
  "order" INTEGER NOT NULL DEFAULT 0,
  createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
  updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- INDEXES FOR HIGH-PERFORMANCE QUERYING
CREATE INDEX IF NOT EXISTS idx_users_username ON users(username);
CREATE INDEX IF NOT EXISTS idx_assignments_due ON assignments(due_date_end);
CREATE INDEX IF NOT EXISTS idx_submissions_assign_member ON submissions(assignment_id, member_id);
CREATE INDEX IF NOT EXISTS idx_documents_category ON documents(category);
CREATE INDEX IF NOT EXISTS idx_announcements_date ON announcements(date);
CREATE INDEX IF NOT EXISTS idx_websites_order ON websites("order");
`;

export const CLOUDFLARE_WORKER_CODE = `/**
 * =========================================================================
 * CLOUDFLARE WORKER BACKEND (worker.js)
 * REST API + D1 DATABASE INTEGRATION + REAL-TIME SSE SYNC
 * =========================================================================
 */

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    const method = request.method;
    const path = url.pathname;

    // CORS Headers
    const corsHeaders = {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      'Content-Type': 'application/json'
    };

    if (method === 'OPTIONS') {
      return new Response(null, { headers: corsHeaders });
    }

    try {
      // 1. MASTER ADMIN & AUTH BYPASS CHECK
      // Master Admin: Username "Admin", Password "456789"
      if (path === '/api/auth/login' && method === 'POST') {
        const { username, password } = await request.json();
        
        // Secure Bypass verification
        if (username === 'Admin' && password === '456789') {
          return new Response(JSON.stringify({
            status: 'success',
            user: {
              id: 'user_admin',
              username: 'Admin',
              fullName: 'Admin ผู้ดูแลระบบ (หัวหน้าฝ่ายวิชาการ)',
              role: 'admin',
              status: 'approved',
              department: 'กลุ่มบริหารงานวิชาการ'
            },
            token: 'bypass_token_' + Date.now()
          }), { headers: corsHeaders });
        }

        // Check in D1 Database
        const stmt = env.DB.prepare('SELECT * FROM users WHERE username = ?');
        const user = await stmt.bind(username).first();

        if (!user) {
          return new Response(JSON.stringify({ status: 'error', message: 'ไม่พบบัญชีผู้ใช้นี้ในระบบ' }), { status: 401, headers: corsHeaders });
        }

        if (user.status === 'pending') {
          return new Response(JSON.stringify({ status: 'error', message: 'บัญชีของคุณอยู่ระหว่างรอผู้ดูแลระบบ (Admin) อนุมัติการเข้าใช้งาน' }), { status: 403, headers: corsHeaders });
        }

        if (user.status === 'rejected') {
          return new Response(JSON.stringify({ status: 'error', message: 'บัญชีนี้ไม่ได้รับการอนุมัติ กรุณาติดต่อฝ่ายวิชาการ' }), { status: 403, headers: corsHeaders });
        }

        // Return user data
        return new Response(JSON.stringify({
          status: 'success',
          user: {
            id: user.id,
            username: user.username,
            fullName: user.full_name,
            role: user.role,
            status: user.status,
            department: user.department,
            avatarUrl: user.avatar_url
          },
          token: 'token_' + user.id
        }), { headers: corsHeaders });
      }

      // 2. LUNCH SYSTEM BACKEND PROXY (Hides script URL from frontend DOM)
      if (path === '/api/lunch-redirect') {
        const targetUrl = 'https://script.google.com/a/macros/krabiedu.go.th/s/AKfycbzgmOBgQ4534lIiTVuUikzaEF0PXofybzvaYZlXPvFeY4U8d3KrcpXZ-MsooaHSgIQ/exec';
        return Response.redirect(targetUrl, 302);
      }

      // 3. REAL-TIME SERVER-SENT EVENTS (SSE) STREAM
      if (path === '/api/sync/events' && method === 'GET') {
        const { readable, writable } = new TransformStream();
        const writer = writable.getWriter();
        const encoder = new TextEncoder();

        writer.write(encoder.encode(': ping\\n\\n'));
        writer.write(encoder.encode('data: ' + JSON.stringify({ type: 'CONNECTED', time: new Date().toISOString() }) + '\\n\\n'));

        return new Response(readable, {
          headers: {
            'Content-Type': 'text/event-stream',
            'Cache-Control': 'no-cache',
            'Connection': 'keep-alive',
            'Access-Control-Allow-Origin': '*'
          }
        });
      }

      // 4. ASSIGNMENTS CRUD
      if (path === '/api/assignments' && method === 'GET') {
        const { results } = await env.DB.prepare('SELECT * FROM assignments ORDER BY due_date_end ASC').all();
        return new Response(JSON.stringify({ status: 'success', data: results }), { headers: corsHeaders });
      }

      // 5. SUBMISSIONS CRUD
      if (path === '/api/submissions' && method === 'GET') {
        const { results } = await env.DB.prepare('SELECT * FROM submissions ORDER BY created_at DESC').all();
        return new Response(JSON.stringify({ status: 'success', data: results }), { headers: corsHeaders });
      }

      // 6. DOCUMENTS CRUD
      if (path === '/api/documents' && method === 'GET') {
        const { results } = await env.DB.prepare('SELECT * FROM documents ORDER BY issue_date DESC').all();
        return new Response(JSON.stringify({ status: 'success', data: results }), { headers: corsHeaders });
      }

      // 7. ANNOUNCEMENTS CRUD
      if (path === '/api/announcements' && method === 'GET') {
        const { results } = await env.DB.prepare('SELECT * FROM announcements ORDER BY date DESC').all();
        return new Response(JSON.stringify({ status: 'success', data: results }), { headers: corsHeaders });
      }

      return new Response(JSON.stringify({ status: 'ok', message: 'Cloudflare Worker Ready' }), { headers: corsHeaders });
    } catch (err: any) {
      return new Response(JSON.stringify({ status: 'error', message: err.message }), { status: 500, headers: corsHeaders });
    }
  }
};
`;

export const GAS_CODE_SNIPPET = GOOGLE_APPS_SCRIPT_CODE;
export const D1_SCHEMA_SQL = CLOUDFLARE_D1_SCHEMA;

