import React from 'react';
import { format } from 'date-fns';
import { ATTENDANCE_BASE_MAP, ATTENDANCE_STATUS, ATTENDANCE_STATUS_MAP, DAYS, DEFAULT_ATTENDANCE_COLORS } from '../constants';

export const getAttendanceFieldStyle = (
  status: string,
  customColors: Record<string, string> = {},
  isActive: boolean = false
): React.CSSProperties => {
  if (status === '-') {
    return { backgroundColor: '#f8fafc', color: '#64748b', borderColor: '#e2e8f0' };
  }

  const color = customColors[status] || DEFAULT_ATTENDANCE_COLORS[status] || '#cbd5e1';

  const baseColor = color.startsWith('#') && color.length > 7 ? color.slice(0, 7) : color;

  if (isActive) {
    return {
      backgroundColor: baseColor,
      color: '#ffffff',
      borderColor: baseColor,
    };
  }

  return {
    backgroundColor: `${baseColor}20`,
    color: baseColor,
    borderColor: `${baseColor}40`,
  };
};

export const getStatusColor = (status: string) => {
  switch (status) {
    case ATTENDANCE_STATUS.IN: return 'text-green-600 font-bold';
    case ATTENDANCE_STATUS.PRESENT_ON_HOLIDAY: return 'text-emerald-500 font-bold';
    case ATTENDANCE_STATUS.PRESENT:
    case 'Present': return 'text-green-600 font-bold';
    case ATTENDANCE_STATUS.ABSENT:
    case 'Absent': return 'text-red-600 font-bold';
    case ATTENDANCE_STATUS.WEEK_OFF:
    case ATTENDANCE_STATUS.WEEK_OFF: return 'text-blue-500 font-medium';
    case ATTENDANCE_STATUS.HOLIDAY:
    case ATTENDANCE_STATUS.HOLIDAY: return 'text-purple-600 font-bold';
    case ATTENDANCE_STATUS.HALF_DAY: return 'text-slate-400 font-bold';
    case ATTENDANCE_STATUS.EARNED_LEAVE: return 'text-teal-600 font-bold';
    case ATTENDANCE_STATUS.HALF_DAY_EARNED_LEAVE: return 'text-teal-400 font-bold';
    case ATTENDANCE_STATUS.LEAVE:
    case 'Leave': return 'text-amber-500 font-bold';
    case ATTENDANCE_STATUS.EARLY_OUT: return 'text-orange-500 font-bold';
    case ATTENDANCE_STATUS.NOT_JOINED: return 'text-slate-300 font-bold';
    case ATTENDANCE_STATUS.LEAVE_WITHOUT_PAY: return 'text-pink-600 font-bold';
    case ATTENDANCE_STATUS.PRESENT_MISSPUNCH: return 'text-yellow-600 font-bold';
    case ATTENDANCE_BASE_MAP.MISSPUNCH.label: return 'text-yellow-600 font-bold';
    case ATTENDANCE_STATUS.MISSPUNCH: return 'text-rose-600 font-bold';
    case '-': return 'text-slate-400 font-bold';
    default: return 'text-slate-400 font-bold';
  }
};

export const normalizeAttendanceStatus = (
  rawStatus: string,
  checkIn: string,
  checkOut: string,
  recordDate: string,
  cutoff?: { inTime: string, outTime: string, bufferTime: string }
) => {
  let status = rawStatus || '-';
  if (status === 'PRESENT') status = ATTENDANCE_STATUS.PRESENT;
  else if (status === 'ABSENT') status = ATTENDANCE_STATUS.ABSENT;
  else if (status === 'MISPUNCH') status = ATTENDANCE_STATUS.MISSPUNCH;
  else if (status === 'WEEK OFF' || status === 'WEEKOFF') status = ATTENDANCE_STATUS.WEEK_OFF;
  else if (status === 'HOLIDAY') status = ATTENDANCE_STATUS.HOLIDAY;
  else if (status === 'LEAVE') status = ATTENDANCE_STATUS.LEAVE;
  else if (status === 'HALF DAY') status = ATTENDANCE_STATUS.HALF_DAY;

  const currDate = format(new Date(), 'yyyy-MM-dd');
  const pDate = recordDate ? recordDate.split(' ')[0] : currDate;
  const dateObj = new Date(pDate);
  const dayOfWeek = isNaN(dateObj.getTime()) ? '' : dateObj.toLocaleDateString('en-US', { weekday: 'long' });
  const isCurrentDate = pDate === currDate;

  const cIn = !checkIn || checkIn === '-' ? '' : checkIn;
  const cOut = !checkOut || checkOut === '-' ? '' : checkOut;
  if (!cIn && !cOut && status !== ATTENDANCE_STATUS.WEEK_OFF) {
    if (dayOfWeek === DAYS.SD.name) {
      status = ATTENDANCE_STATUS.WEEK_OFF;
    } else {
      status = ATTENDANCE_STATUS.ABSENT;
    }
  } else if (cIn && !cOut && status !== ATTENDANCE_STATUS.WEEK_OFF) {
    if (isCurrentDate) {
      status = ATTENDANCE_STATUS.IN;
    } else {
      status = ATTENDANCE_STATUS.MISSPUNCH;
    }
  } else if (dayOfWeek === DAYS.SD.name && status === ATTENDANCE_STATUS.PRESENT) {
    status = ATTENDANCE_STATUS.PRESENT_ON_HOLIDAY;
  }

  // Apply custom cutoff rule if provided and it's a regular workday with check-in and check-out
  if (cutoff && cIn && cOut && status !== ATTENDANCE_STATUS.WEEK_OFF && status !== ATTENDANCE_STATUS.HOLIDAY) {
    const { totalMins } = calculateTimeNum(cIn, cOut);

    // Calculate required minutes
    const [reqInH, reqInM] = cutoff.inTime.split(':').map(Number);
    const [reqOutH, reqOutM] = cutoff.outTime.split(':').map(Number);
    let reqMins = (reqOutH * 60 + reqOutM) - (reqInH * 60 + reqInM);
    if (reqMins < 0) reqMins += 24 * 60;

    if (totalMins >= reqMins) {
      status = ATTENDANCE_STATUS.PRESENT;
    } else {
      status = ATTENDANCE_STATUS.MISSPUNCH;
    }
  }

  return status;
};

export const calculateTimeNum = (checkIn: string, checkOut: string, targetHours = 9) => {
  const cIn = !checkIn || checkIn === '-' ? '' : checkIn;
  const cOut = !checkOut || checkOut === '-' ? '' : checkOut;
  if (!cIn || !cOut) return { totalMins: 0, otMins: 0 };
  const [inH, inM] = cIn.split(':').map(Number);
  const [outH, outM] = cOut.split(':').map(Number);
  let diff = (outH * 60 + outM) - (inH * 60 + inM);
  if (diff < 0) diff += 24 * 60;
  return {
    totalMins: diff,
    otMins: Math.max(0, diff - targetHours * 60)
  };
};

export const formatDur = (m: number) => `${Math.floor(m / 60)}h ${m % 60}m`;

export const calculateTime = (checkIn: string, checkOut: string, targetHours = 9) => {
  const { totalMins, otMins } = calculateTimeNum(checkIn, checkOut, targetHours);
  if (totalMins === 0) return { total: '-', overtime: '-' };
  return {
    total: formatDur(totalMins),
    overtime: otMins > 0 ? formatDur(otMins) : '-'
  };
};

export const getFullStatus = (status: string) => {
  return ATTENDANCE_STATUS_MAP[status] || status;
};

export const generateShortName = (fullName: string): string => {
  if (!fullName) return "";
  return fullName.trim().replace(/^(\S+)\s+.*\s+(\S+)$/, "$1 $2");
};

export const getAttendanceHeaders = (daysArray: string[] = []) => {
  return [
    "Code",
    "Name",
    ...(Array.isArray(daysArray) ? daysArray : []),
    "Working Days",
    "Present Days",
    "Absent Days",
    "Missed Punch",
    "Present on Holiday",
    "Actual Hrs.",
    "Overtime Hrs.",
    "Total Hrs."
  ];
};