import React from 'react';
import { X, HelpCircle, Shield, User } from 'lucide-react';

interface LegendModalProps {
  isOpen: boolean;
  onClose: () => void;
  userRole?: 'admin' | 'member';
}

export const LegendModal: React.FC<LegendModalProps> = ({ isOpen, onClose, userRole = 'member' }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-purple-100 relative">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-full transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-3 mb-4">
          <div className="p-2.5 rounded-xl bg-purple-100 text-purple-700">
            <HelpCircle className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-slate-900 leading-tight">
              คำอธิบายความหมายของสีในปฏิทิน
            </h3>
            <p className="text-xs text-slate-500">
              ความหมายของสถานะสี (แดง / เขียว / เหลือง) ตามบทบาทผู้ใช้งาน
            </p>
          </div>
        </div>

        <div className="space-y-4">
          {/* Member View Legend */}
          <div className="p-4 rounded-xl bg-slate-50 border border-slate-200">
            <div className="flex items-center gap-2 mb-2 font-semibold text-sm text-slate-800">
              <User className="w-4 h-4 text-purple-600" />
              <span>มุมมองสำหรับ สมาชิก / อาจารย์ผู้สอน</span>
            </div>
            <div className="space-y-2 text-xs">
              <div className="flex items-center gap-3">
                <span className="w-3.5 h-3.5 rounded-full bg-rose-500 ring-4 ring-rose-100 shrink-0" />
                <div>
                  <strong className="text-rose-700">สีแดง:</strong> มีงานที่ต้องส่งวันนี้ หรือยังไม่ได้ส่งงานตามกำหนด
                </div>
              </div>
              <div className="flex items-center gap-3">
                <span className="w-3.5 h-3.5 rounded-full bg-emerald-500 ring-4 ring-emerald-100 shrink-0" />
                <div>
                  <strong className="text-emerald-700">สีเขียว:</strong> คุณได้อัปโหลดส่งงานเรียบร้อยแล้ว
                </div>
              </div>
              <div className="flex items-center gap-3">
                <span className="w-3.5 h-3.5 rounded-full bg-amber-500 ring-4 ring-amber-100 shrink-0" />
                <div>
                  <strong className="text-amber-700">สีเหลือง:</strong> ข่าวสาร / ประกาศแจ้งเพื่อทราบทั่วไป
                </div>
              </div>
            </div>
          </div>

          {/* Admin View Legend */}
          <div className="p-4 rounded-xl bg-purple-50/70 border border-purple-200">
            <div className="flex items-center gap-2 mb-2 font-semibold text-sm text-purple-900">
              <Shield className="w-4 h-4 text-purple-700" />
              <span>มุมมองสำหรับ ผู้ดูแลระบบ (Admin)</span>
            </div>
            <div className="space-y-2 text-xs">
              <div className="flex items-center gap-3">
                <span className="w-3.5 h-3.5 rounded-full bg-rose-500 ring-4 ring-rose-100 shrink-0" />
                <div>
                  <strong className="text-rose-700">สีแดง:</strong> วันกำหนดส่งงาน และสมาชิกยังส่งงานไม่ครบทุกคน
                </div>
              </div>
              <div className="flex items-center gap-3">
                <span className="w-3.5 h-3.5 rounded-full bg-emerald-500 ring-4 ring-emerald-100 shrink-0" />
                <div>
                  <strong className="text-emerald-700">สีเขียว:</strong> สมาชิกทุกคนส่งงานครบถ้วน 100%
                </div>
              </div>
              <div className="flex items-center gap-3">
                <span className="w-3.5 h-3.5 rounded-full bg-amber-500 ring-4 ring-amber-100 shrink-0" />
                <div>
                  <strong className="text-amber-700">สีเหลือง:</strong> กิจกรรมหรือประกาศแจ้งเพื่อทราบทั่วไป
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="mt-5 text-right">
          <button
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold text-white bg-purple-600 hover:bg-purple-700 rounded-xl transition-all shadow-xs glow-purple-hover"
          >
            เข้าใจแล้ว ปิดหน้าต่าง
          </button>
        </div>
      </div>
    </div>
  );
};
