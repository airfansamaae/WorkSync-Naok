export const THAI_MONTH_NAMES = [
  'มกราคม', 'กุมภาพันธ์', 'มีนาคม', 'เมษายน', 'พฤษภาคม', 'มิถุนายน',
  'กรกฎาคม', 'สิงหาคม', 'กันยายน', 'ตุลาคม', 'พฤศจิกายน', 'ธันวาคม'
];

export const THAI_SHORT_MONTHS = [
  'ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.',
  'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.'
];

export const THAI_SHORT_DAYS = ['อา.', 'จ.', 'อ.', 'พ.', 'พฤ.', 'ศ.', 'ส.'];
export const THAI_FULL_DAYS = ['วันอาทิตย์', 'วันจันทร์', 'วันอังคาร', 'วันพุธ', 'วันพฤหัสบดี', 'วันศุกร์', 'วันเสาร์'];

/**
 * Returns current date in YYYY-MM-DD format e.g. 2026-09-07
 */
export function getTodayDateString(): string {
  const d = new Date();
  const pad = (n: number) => n.toString().padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

/**
 * Format YYYY-MM-DD or Date into DD/M/BBBB (Buddhist Era) e.g., 31/8/2569
 */
export function formatThaiDate(dateInput: string | Date | undefined | null, includeLeadingZero = false): string {
  if (!dateInput) return '-';
  
  let d: Date;
  if (typeof dateInput === 'string') {
    // Handle YYYY-MM-DD or ISO
    const parts = dateInput.split('T')[0].split('-');
    if (parts.length === 3) {
      const year = parseInt(parts[0], 10);
      const month = parseInt(parts[1], 10) - 1;
      const day = parseInt(parts[2], 10);
      const buddhistYear = year < 2400 ? year + 543 : year;
      const formattedDay = includeLeadingZero ? day.toString().padStart(2, '0') : day.toString();
      const formattedMonth = includeLeadingZero ? (month + 1).toString().padStart(2, '0') : (month + 1).toString();
      return `${formattedDay}/${formattedMonth}/${buddhistYear}`;
    }
    d = new Date(dateInput);
  } else {
    d = dateInput;
  }

  if (isNaN(d.getTime())) return String(dateInput);

  const day = includeLeadingZero ? d.getDate().toString().padStart(2, '0') : d.getDate().toString();
  const month = includeLeadingZero ? (d.getMonth() + 1).toString().padStart(2, '0') : (d.getMonth() + 1).toString();
  const year = d.getFullYear() < 2400 ? d.getFullYear() + 543 : d.getFullYear();
  return `${day}/${month}/${year}`;
}

/**
 * Get short day of week e.g. จ., อ., พ.
 */
export function getThaiShortDay(dateInput: string | Date | undefined | null): string {
  if (!dateInput) return '';
  let d: Date;
  if (typeof dateInput === 'string') {
    const parts = dateInput.split('T')[0].split('-');
    if (parts.length === 3) {
      const year = parseInt(parts[0], 10);
      const month = parseInt(parts[1], 10) - 1;
      const day = parseInt(parts[2], 10);
      d = new Date(year, month, day);
    } else {
      d = new Date(dateInput);
    }
  } else {
    d = dateInput;
  }
  if (isNaN(d.getTime())) return '';
  return THAI_SHORT_DAYS[d.getDay()] || '';
}

/**
 * Format date with day of week e.g. จ. 31/8/2569
 */
export function formatThaiDateWithDay(dateInput: string | Date | undefined | null): string {
  if (!dateInput) return '-';
  const shortDay = getThaiShortDay(dateInput);
  const formatted = formatThaiDate(dateInput);
  return shortDay ? `${shortDay} ${formatted}` : formatted;
}

/**
 * Format range with day of week e.g. จ. 31/8/2569 or ศ. 7/8/2569 - อา. 9/8/2569
 */
export function formatThaiDateRangeWithDay(startStr?: string, endStr?: string): string {
  if (!startStr && !endStr) return '-';
  if (startStr && (!endStr || startStr === endStr)) {
    return formatThaiDateWithDay(startStr);
  }
  if (!startStr && endStr) {
    return formatThaiDateWithDay(endStr);
  }
  const formattedStart = formatThaiDateWithDay(startStr);
  const formattedEnd = formatThaiDateWithDay(endStr);
  if (formattedStart === formattedEnd) return formattedStart;
  return `${formattedStart} - ${formattedEnd}`;
}

/**
 * Format range e.g. 8/8/2569 - 9/8/2569 or 31/8/2569 if single day
 */
export function formatThaiDateRange(startStr?: string, endStr?: string): string {
  if (!startStr && !endStr) return '-';
  if (startStr && (!endStr || startStr === endStr)) {
    return formatThaiDate(startStr);
  }
  if (!startStr && endStr) {
    return formatThaiDate(endStr);
  }
  const formattedStart = formatThaiDate(startStr);
  const formattedEnd = formatThaiDate(endStr);
  if (formattedStart === formattedEnd) return formattedStart;
  return `${formattedStart} - ${formattedEnd}`;
}

/**
 * Format full Thai Date e.g. 31 สิงหาคม 2569
 */
export function formatThaiFullDate(dateInput: string | Date | undefined | null): string {
  if (!dateInput) return '-';
  let year = 2026;
  let month = 7;
  let day = 31;

  if (typeof dateInput === 'string') {
    const parts = dateInput.split('T')[0].split('-');
    if (parts.length === 3) {
      year = parseInt(parts[0], 10);
      month = parseInt(parts[1], 10) - 1;
      day = parseInt(parts[2], 10);
    } else {
      const d = new Date(dateInput);
      if (!isNaN(d.getTime())) {
        year = d.getFullYear();
        month = d.getMonth();
        day = d.getDate();
      }
    }
  } else {
    year = dateInput.getFullYear();
    month = dateInput.getMonth();
    day = dateInput.getDate();
  }

  const buddhistYear = year < 2400 ? year + 543 : year;
  return `${day} ${THAI_MONTH_NAMES[month] || ''} ${buddhistYear}`;
}
