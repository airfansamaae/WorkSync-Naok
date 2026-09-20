/**
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
        viewUrl: file.getUrl(),
        downloadUrl: 'https://drive.google.com/uc?export=download&id=' + file.getId()
      });
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
    // ACTION 5: ทดสอบ Ping ทาง POST
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
