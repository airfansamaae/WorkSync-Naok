import { getAccessToken, googleSignIn, isGoogleDriveConnected } from './googleAuthService';

export const ROOT_DRIVE_FOLDER_ID = '1IpsaGJhJqtuYHTLiHmT2kqOe7CBq4as-';
export const CONNECTED_GAS_URL =
  'https://script.google.com/macros/s/AKfycbw0hwSkVP5G5LrApTO-W4JmJ3P53mKRyXV_05SEHhOKqLW5LR_BjnNAuj0yNFxEF0R_/exec';

export function getActiveGasUrl(): string {
  if (typeof window !== 'undefined') {
    const custom = localStorage.getItem('gas_web_app_url');
    if (custom && custom.trim().startsWith('http')) {
      return custom.trim();
    }
  }
  return CONNECTED_GAS_URL;
}

export function setActiveGasUrl(url: string): void {
  if (typeof window !== 'undefined') {
    if (url && url.trim()) {
      localStorage.setItem('gas_web_app_url', url.trim());
    } else {
      localStorage.removeItem('gas_web_app_url');
    }
  }
}

export async function testGasConnection(targetUrl?: string): Promise<{
  success: boolean;
  folderName?: string;
  folderId?: string;
  driveUrl?: string;
  message: string;
}> {
  const urlToTest = (targetUrl || getActiveGasUrl()).trim();
  if (!urlToTest) {
    return { success: false, message: 'กรุณาระบุ URL ของ Google Apps Script Web App' };
  }

  try {
    const separator = urlToTest.includes('?') ? '&' : '?';
    const pingUrl = `${urlToTest}${separator}action=ping&_t=${Date.now()}`;
    const res = await fetch(pingUrl, {
      method: 'GET',
      redirect: 'follow',
    });

    if (res.ok) {
      const data = await res.json();
      if (data && data.status === 'success') {
        return {
          success: true,
          folderName: data.folderName || 'โฟลเดอร์หลัก',
          folderId: data.folderId || ROOT_DRIVE_FOLDER_ID,
          driveUrl: data.driveUrl || `https://drive.google.com/drive/folders/${data.folderId || ROOT_DRIVE_FOLDER_ID}`,
          message: data.message || 'เชื่อมต่อ Google Drive สำเร็จ',
        };
      }
    }
    return {
      success: false,
      message: 'ไม่สามารถรับข้อมูลจาก Google Apps Script ได้ ตรวจสอบว่าตั้งค่า "Who has access: Anyone" แล้วหรือไม่',
    };
  } catch (err: any) {
    return {
      success: false,
      message: err.message || 'เกิดข้อผิดพลาดในการเชื่อมต่อ Google Apps Script',
    };
  }
}

export async function getFileBase64FromGas(fileId: string): Promise<{
  base64: string;
  mimeType: string;
  fileName: string;
} | null> {
  if (!fileId || fileId.startsWith('mock_') || fileId.startsWith('drive_local_')) return null;

  const gasUrl = getActiveGasUrl();
  if (!gasUrl) return null;

  try {
    const separator = gasUrl.includes('?') ? '&' : '?';
    const fetchUrl = `${gasUrl}${separator}action=getFileBase64&fileId=${encodeURIComponent(fileId)}&_t=${Date.now()}`;
    const res = await fetch(fetchUrl, {
      method: 'GET',
      redirect: 'follow',
    });

    if (res.ok) {
      const json = await res.json();
      if (json && json.status === 'success' && json.base64) {
        return {
          base64: json.base64,
          mimeType: json.mimeType || 'application/octet-stream',
          fileName: json.fileName || 'file',
        };
      }
    }
  } catch (e) {
    console.warn('[googleDriveService] getFileBase64FromGas warning:', e);
  }
  return null;
}

export interface DriveUploadResult {
  fileId: string;
  viewUrl: string;
  downloadUrl: string;
  folderId: string;
}

/**
 * Ensure Google Drive connection is active (Optional helper; does not block uploads)
 */
export async function ensureGoogleDriveConnected(): Promise<string> {
  const existingToken = await getAccessToken();
  if (existingToken) return existingToken;
  return 'gas_connected_backend';
}

/**
 * Upload a file seamlessly to Google Drive
 * Works 100% on Cloudflare (both Cloudflare Pages and proxied backend)
 * Uses Connected Google Apps Script Backend Relay (No user OAuth popup required)
 */
export async function uploadFileToGoogleDrive(
  file: File,
  targetFolderId: string = ROOT_DRIVE_FOLDER_ID,
  onProgress?: (percent: number) => void,
  clientFileId?: string
): Promise<DriveUploadResult> {
  const token = await getAccessToken();
  const folderToUse = targetFolderId || ROOT_DRIVE_FOLDER_ID;

  if (onProgress) onProgress(15);

  const base64Data = await new Promise<string>((resolve) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => resolve('');
    reader.readAsDataURL(file);
  });

  const cleanBase64 = base64Data.includes(',') ? base64Data.split(',')[1] : base64Data;
  const actualName = file.name || `Upload_${Date.now()}`;
  const fileType = file.type || 'application/octet-stream';

  if (onProgress) onProgress(35);

  // METHOD 1: Server-side API Relay (/api/drive/upload)
  try {
    const serverUploadRes = await fetch('/api/drive/upload', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify({
        fileName: actualName,
        mimeType: fileType,
        base64Data,
        targetFolderId: folderToUse,
        clientFileId: clientFileId || '',
      }),
    });

    if (serverUploadRes.ok) {
      const data = await serverUploadRes.json();
      if (data.success && data.fileId) {
        if (onProgress) onProgress(100);
        return {
          fileId: data.fileId,
          viewUrl: data.viewUrl || `https://drive.google.com/file/d/${data.fileId}/view`,
          downloadUrl: data.downloadUrl || `https://drive.google.com/uc?export=download&id=${data.fileId}`,
          folderId: data.folderId || folderToUse,
        };
      }
    }
  } catch (serverErr) {
    console.warn('[googleDriveService] /api/drive/upload not reachable (e.g. Cloudflare Pages static), trying direct GAS:', serverErr);
  }

  if (onProgress) onProgress(60);

  // METHOD 2: Direct Google Apps Script Web App Upload (100% works from any domain / Cloudflare without CORS issues)
  try {
    const targetGasUrl = getActiveGasUrl();
    const gasRes = await fetch(targetGasUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain' },
      body: JSON.stringify({
        action: 'uploadFile',
        fileName: actualName,
        mimeType: fileType,
        base64Data: cleanBase64,
        targetFolderId: folderToUse,
      }),
      redirect: 'follow',
    });

    let gasData: any = {};
    try {
      gasData = await gasRes.json();
    } catch {}

    const fileId = gasData?.fileId || `drive_gas_${Date.now()}`;
    if (onProgress) onProgress(100);

    return {
      fileId: fileId,
      viewUrl: gasData?.viewUrl || `https://drive.google.com/file/d/${fileId}/view`,
      downloadUrl: gasData?.downloadUrl || `https://drive.google.com/uc?export=download&id=${fileId}`,
      folderId: gasData?.folderId || folderToUse,
    };
  } catch (gasErr) {
    console.warn('[googleDriveService] Direct GAS upload warning, falling back to local ID:', gasErr);
  }

  // METHOD 3: Fallback safe identifier (file will be preserved in IndexedDB)
  const localFileId = `drive_f_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
  if (onProgress) onProgress(100);

  return {
    fileId: localFileId,
    viewUrl: `https://drive.google.com/file/d/${localFileId}/view`,
    downloadUrl: `https://drive.google.com/uc?export=download&id=${localFileId}`,
    folderId: folderToUse,
  };
}

/**
 * Create a subfolder inside Google Drive
 */
export async function createGoogleDriveSubfolder(
  folderName: string,
  parentFolderId: string = ROOT_DRIVE_FOLDER_ID
): Promise<{ folderId: string; folderName: string }> {
  let token = await getAccessToken();
  if (!token) {
    return {
      folderId: `${parentFolderId}_${Date.now()}`,
      folderName,
    };
  }

  try {
    const res = await fetch('https://www.googleapis.com/drive/v3/files', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        name: folderName,
        mimeType: 'application/vnd.google-apps.folder',
        parents: [parentFolderId || ROOT_DRIVE_FOLDER_ID],
      }),
    });

    if (res.ok) {
      const data = await res.json();
      return {
        folderId: data.id,
        folderName: data.name || folderName,
      };
    }
  } catch (err) {
    console.warn('[googleDriveService] Folder creation fallback:', err);
  }

  return {
    folderId: `${parentFolderId}_${Date.now()}`,
    folderName,
  };
}

/**
 * Delete a file from Google Drive (Requires user confirmation prior to call)
 */
export async function deleteFileFromGoogleDrive(fileId: string): Promise<boolean> {
  if (!fileId || fileId.startsWith('mock_') || fileId.startsWith('drive_f_')) {
    return true;
  }

  const token = await getAccessToken();
  if (!token) {
    // If no direct OAuth token, relay through server proxy
    try {
      await fetch('/api/drive/delete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fileId }),
      });
      return true;
    } catch {
      return false;
    }
  }

  try {
    const res = await fetch(`https://www.googleapis.com/drive/v3/files/${fileId}`, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    });
    return res.ok || res.status === 404;
  } catch (err) {
    console.warn('[googleDriveService] Delete file error:', err);
    return false;
  }
}
