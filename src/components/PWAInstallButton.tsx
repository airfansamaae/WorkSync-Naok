import React, { useState } from 'react';
import { Download, Smartphone, X } from 'lucide-react';
import { usePWAInstall } from '../hooks/usePWAInstall';

export const PWAInstallButton: React.FC = () => {
  const { isInstallable, isInstalled, isIOS, install } = usePWAInstall();
  const [showIOSGuide, setShowIOSGuide] = useState(false);

  // If already installed, hide completely
  if (isInstalled) {
    return null;
  }

  // Chromium / Android / Desktop flow
  if (isInstallable) {
    return (
      <button
        id="pwa-install-header-btn"
        onClick={install}
        title="ดาวน์โหลดและติดตั้งเป็นแอปพลิเคชัน (PWA)"
        className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-semibold rounded-full border transition-all cursor-pointer bg-purple-50 text-purple-700 border-purple-200 hover:bg-purple-100 hover:border-purple-300"
      >
        <Download className="w-3.5 h-3.5 text-purple-600" />
        <span className="text-[11px]">ติดตั้งแอป</span>
      </button>
    );
  }

  // iOS Safari flow
  if (isIOS) {
    return (
      <>
        <button
          id="pwa-install-ios-header-btn"
          onClick={() => setShowIOSGuide(true)}
          title="วิธีติดตั้งเป็นแอปบน iPhone / iPad"
          className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium rounded-full border transition-all cursor-pointer bg-purple-50 text-purple-700 border-purple-200 hover:bg-purple-100"
        >
          <Smartphone className="w-3.5 h-3.5 text-purple-600" />
          <span className="text-[11px]">ติดตั้งแอป</span>
        </button>

        {showIOSGuide && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
            <div className="w-full max-w-sm rounded-2xl bg-white p-5 shadow-2xl border border-slate-200 text-slate-800">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-bold text-slate-900 flex items-center gap-1.5">
                  <Smartphone className="w-4 h-4 text-purple-600" />
                  <span>ติดตั้งบน iPhone / iPad</span>
                </h3>
                <button
                  onClick={() => setShowIOSGuide(false)}
                  className="p-1 text-slate-400 hover:text-slate-600 rounded-lg"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
              <p className="text-xs text-slate-600 space-y-1.5 leading-relaxed">
                1. แตะปุ่ม <strong>แชร์ (Share)</strong> ที่แถบเครื่องมือ Safari<br />
                2. เลื่อนลงแล้วแตะ <strong>"เพิ่มไปยังหน้าจอโฮม" (Add to Home Screen)</strong>
              </p>
              <button
                onClick={() => setShowIOSGuide(false)}
                className="mt-4 w-full rounded-xl bg-purple-600 py-2 text-xs font-bold text-white hover:bg-purple-700 transition"
              >
                เข้าใจแล้ว
              </button>
            </div>
          </div>
        )}
      </>
    );
  }

  return null;
};
