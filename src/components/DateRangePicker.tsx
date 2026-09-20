import React, { useState } from 'react';
import { Calendar as CalendarIcon, ChevronLeft, ChevronRight, X, Check, Sparkles } from 'lucide-react';
import { THAI_MONTH_NAMES, formatThaiDate, formatThaiDateRange, getTodayDateString } from '../lib/dateUtils';

interface DateRangePickerProps {
  startDate: string; // YYYY-MM-DD
  endDate: string;   // YYYY-MM-DD
  onChange: (startDate: string, endDate: string) => void;
  label?: string;
  required?: boolean;
}

export const DateRangePicker: React.FC<DateRangePickerProps> = ({
  startDate,
  endDate,
  onChange,
  label = 'กำหนดวันส่งงาน / ช่วงเวลา',
  required = true,
}) => {
  // Parse initial state or fallback to today
  const now = new Date();
  const todayStr = getTodayDateString();
  const initialDate = startDate ? new Date(startDate) : now;
  const [viewYear, setViewYear] = useState<number>(initialDate.getFullYear() || now.getFullYear());
  const [viewMonth, setViewMonth] = useState<number>(!isNaN(initialDate.getTime()) ? initialDate.getMonth() : now.getMonth());
  const [isOpen, setIsOpen] = useState(false);

  // Click step state for two-click selection
  // 0 = ready for 1st click, 1 = 1st click done (awaiting 2nd click)
  const [clickStep, setClickStep] = useState<number>(0);
  const [firstSelectedDate, setFirstSelectedDate] = useState<string | null>(null);

  const handleOpen = () => {
    // Sync view with currently selected startDate or today
    const d = startDate ? new Date(startDate) : new Date();
    if (!isNaN(d.getTime())) {
      setViewYear(d.getFullYear());
      setViewMonth(d.getMonth());
    }
    setClickStep(0);
    setFirstSelectedDate(null);
    setIsOpen(true);
  };

  const handlePrevMonth = () => {
    if (viewMonth === 0) {
      setViewMonth(11);
      setViewYear((prev) => prev - 1);
    } else {
      setViewMonth((prev) => prev - 1);
    }
  };

  const handleNextMonth = () => {
    if (viewMonth === 11) {
      setViewMonth(0);
      setViewYear((prev) => prev + 1);
    } else {
      setViewMonth((prev) => prev + 1);
    }
  };

  // Days calculation for viewMonth/viewYear
  const firstDayOfWeek = new Date(viewYear, viewMonth, 1).getDay(); // 0 = Sunday
  const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();

  // Two-click selection handler
  const handleDayClick = (dayNum: number) => {
    const formattedMonth = (viewMonth + 1).toString().padStart(2, '0');
    const formattedDay = dayNum.toString().padStart(2, '0');
    const clickedDateStr = `${viewYear}-${formattedMonth}-${formattedDay}`;

    if (clickStep === 0 || !firstSelectedDate) {
      // 1st CLICK: Record first selected date
      setFirstSelectedDate(clickedDateStr);
      setClickStep(1);
    } else if (clickStep === 1) {
      // 2nd CLICK: Auto-save and close!
      if (clickedDateStr === firstSelectedDate) {
        // Clicked SAME date twice -> Single day selection
        onChange(clickedDateStr, clickedDateStr);
      } else {
        // Clicked DIFFERENT date -> Date range selection
        const start = firstSelectedDate < clickedDateStr ? firstSelectedDate : clickedDateStr;
        const end = firstSelectedDate < clickedDateStr ? clickedDateStr : firstSelectedDate;
        onChange(start, end);
      }
      // Reset and auto close immediately
      setClickStep(0);
      setFirstSelectedDate(null);
      setIsOpen(false);
    }
  };

  const displayText = formatThaiDateRange(startDate, endDate);
  const thaiBuddhistYear = viewYear + 543;

  return (
    <div className="relative">
      {label && (
        <label className="block text-xs font-semibold text-slate-700 mb-1">
          {label} {required && <span className="text-rose-500">*</span>}
        </label>
      )}

      {/* Main trigger button displaying Thai Buddhist Date */}
      <button
        type="button"
        id="date-range-picker-trigger"
        onClick={handleOpen}
        className="w-full flex items-center justify-between px-3.5 py-2.5 text-xs font-semibold rounded-xl border border-slate-300 bg-white hover:border-purple-500 focus:outline-none focus:ring-2 focus:ring-purple-500/20 text-slate-800 transition-all shadow-2xs group"
      >
        <div className="flex items-center gap-2">
          <CalendarIcon className="w-4 h-4 text-purple-600 group-hover:scale-110 transition-transform shrink-0" />
          <span className="text-sm font-bold text-purple-950">
            {displayText || 'เลือกวันที่หรือช่วงเวลา'}
          </span>
        </div>
        <span className="text-[11px] text-purple-700 bg-purple-50 px-2.5 py-0.5 rounded-lg font-medium border border-purple-200">
          {startDate === endDate ? 'กำหนด 1 วัน' : 'กำหนดช่วงวัน'}
        </span>
      </button>

      {/* Helper text explaining interaction */}
      <p className="text-[11px] text-slate-500 mt-1">
        * กดวันที่เดิม 2 ครั้ง = กำหนด 1 วัน | กด 2 วันต่างกัน = กำหนดช่วงวัน (บันทึกอัตโนมัติ)
      </p>

      {/* Centered Modal / Popover Viewport-Fit Calendar (No scrolling down needed) */}
      {isOpen && (
        <div className="fixed inset-0 z-[80] flex items-center justify-center p-3 sm:p-4 bg-slate-950/60 backdrop-blur-2xs animate-in fade-in duration-150">
          <div 
            className="bg-white rounded-3xl border border-purple-100 shadow-2xl max-w-sm w-full p-4 sm:p-5 relative animate-in zoom-in-95 duration-150 flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-3">
              <div className="flex items-center gap-2">
                <div className="p-1.5 rounded-xl bg-purple-100 text-purple-700">
                  <CalendarIcon className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-slate-900 leading-tight">
                    เลือกวันที่ / ช่วงเวลากำหนดส่ง
                  </h4>
                  <p className="text-[10px] text-purple-700 font-semibold">
                    {clickStep === 0 
                      ? '👉 คลิกครั้งที่ 1: เลือกวันเริ่มต้น' 
                      : `👉 คลิกครั้งที่ 2: เลือกวันเดิม (1 วัน) หรือวันสิ้นสุด`}
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => {
                  setIsOpen(false);
                  setClickStep(0);
                  setFirstSelectedDate(null);
                }}
                className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-full transition-colors"
                title="ปิด"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Month & Year Navigation with < > buttons */}
            <div className="flex items-center justify-between mb-3 bg-slate-50 p-2 rounded-2xl border border-slate-200/70">
              <button
                type="button"
                onClick={handlePrevMonth}
                className="p-1.5 rounded-xl bg-white hover:bg-purple-100 text-slate-700 hover:text-purple-800 transition-colors shadow-2xs"
                title="เดือนก่อนหน้า"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>

              <div className="text-center">
                <span className="text-xs font-black text-slate-900 block leading-tight">
                  {THAI_MONTH_NAMES[viewMonth]} {thaiBuddhistYear}
                </span>
                <span className="text-[10px] font-medium text-slate-400">
                  (ค.ศ. {viewYear})
                </span>
              </div>

              <button
                type="button"
                onClick={handleNextMonth}
                className="p-1.5 rounded-xl bg-white hover:bg-purple-100 text-slate-700 hover:text-purple-800 transition-colors shadow-2xs"
                title="เดือนถัดไป"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>

            {/* Days of week header */}
            <div className="grid grid-cols-7 gap-1 text-center text-[11px] font-bold text-slate-400 mb-1">
              <div className="text-rose-500">อา.</div>
              <div>จ.</div>
              <div>อ.</div>
              <div>พ.</div>
              <div>พฤ.</div>
              <div>ศ.</div>
              <div className="text-purple-600">ส.</div>
            </div>

            {/* Calendar Days 7-col Grid */}
            <div className="grid grid-cols-7 gap-1">
              {Array.from({ length: firstDayOfWeek }).map((_, idx) => (
                <div key={`empty-${idx}`} className="h-9" />
              ))}

              {Array.from({ length: daysInMonth }).map((_, idx) => {
                const dayNum = idx + 1;
                const formattedMonth = (viewMonth + 1).toString().padStart(2, '0');
                const formattedDay = dayNum.toString().padStart(2, '0');
                const dateStr = `${viewYear}-${formattedMonth}-${formattedDay}`;

                // Check active state
                const isFirstSelection = clickStep === 1 && firstSelectedDate === dateStr;
                const isSelectedStart = clickStep === 0 && startDate === dateStr;
                const isSelectedEnd = clickStep === 0 && endDate === dateStr;
                const isCurrentRange = clickStep === 0 && startDate && endDate && dateStr >= startDate && dateStr <= endDate;
                const isToday = dateStr === todayStr;

                return (
                  <button
                    key={dateStr}
                    type="button"
                    onClick={() => handleDayClick(dayNum)}
                    className={`h-9 text-xs font-semibold rounded-xl transition-all flex items-center justify-center relative ${
                      isFirstSelection
                        ? 'bg-purple-700 text-white font-black shadow-md scale-110 ring-2 ring-purple-300 z-20'
                        : isSelectedStart || isSelectedEnd
                        ? 'bg-purple-600 text-white font-bold shadow-xs scale-105 z-10'
                        : isCurrentRange
                        ? 'bg-purple-100 text-purple-900 rounded-lg'
                        : isToday
                        ? 'border border-purple-400 font-bold text-purple-900 bg-purple-50/50 hover:bg-purple-100'
                        : 'hover:bg-purple-50 hover:text-purple-800 text-slate-700'
                    }`}
                  >
                    {dayNum}
                    {isToday && !isSelectedStart && !isSelectedEnd && !isFirstSelection && (
                      <span className="w-1 h-1 bg-purple-600 rounded-full absolute bottom-1" />
                    )}
                  </button>
                );
              })}
            </div>

            {/* Status Footer */}
            <div className="mt-3 pt-2.5 border-t border-slate-100 flex items-center justify-between text-[11px]">
              <div className="text-slate-600 font-medium truncate">
                {clickStep === 1 && firstSelectedDate ? (
                  <span className="text-purple-700 font-bold">
                    เลือก: {formatThaiDate(firstSelectedDate)} (กดอีกครั้งเพื่อจบ)
                  </span>
                ) : (
                  <span>ปัจจุบัน: <strong className="text-slate-900">{displayText}</strong></span>
                )}
              </div>

              <button
                type="button"
                onClick={() => {
                  setIsOpen(false);
                  setClickStep(0);
                  setFirstSelectedDate(null);
                }}
                className="px-3 py-1 text-xs font-medium text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
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
