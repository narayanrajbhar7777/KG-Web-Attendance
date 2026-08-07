import React from 'react';
import { format, isAfter, startOfDay } from 'date-fns';
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
  const cleanStatus = (rawStatus || '').toUpperCase().trim();
  if (cleanStatus === 'PRESENT' || cleanStatus === 'P') status = ATTENDANCE_STATUS.PRESENT;
  else if (cleanStatus === 'ABSENT' || cleanStatus === 'A') status = ATTENDANCE_STATUS.ABSENT;
  else if (cleanStatus === 'MISPUNCH' || cleanStatus === 'MISSPUNCH' || cleanStatus === 'M') status = ATTENDANCE_STATUS.MISSPUNCH;
  else if (cleanStatus === 'WEEK OFF' || cleanStatus === 'WEEKOFF' || cleanStatus === 'WO') status = ATTENDANCE_STATUS.WEEK_OFF;
  else if (cleanStatus === 'HOLIDAY' || cleanStatus === 'H') status = ATTENDANCE_STATUS.HOLIDAY;
  else if (cleanStatus === 'LEAVE' || cleanStatus === 'L') status = ATTENDANCE_STATUS.LEAVE;
  else if (cleanStatus === 'HALF DAY' || cleanStatus === 'HD') status = ATTENDANCE_STATUS.HALF_DAY;

  const currDate = format(new Date(), 'yyyy-MM-dd');
  const pDate = recordDate ? recordDate.split(' ')[0] : currDate;
  const dateObj = new Date(pDate);
  const dayOfWeek = isNaN(dateObj.getTime()) ? '' : dateObj.toLocaleDateString('en-US', { weekday: 'long' });
  const isCurrentDate = pDate === currDate;

  const cIn = !checkIn || checkIn === '-' ? '' : checkIn;
  const cOut = !checkOut || checkOut === '-' ? '' : checkOut;

  if (status === ATTENDANCE_STATUS.HOLIDAY) {
    if (cIn && cOut) status = ATTENDANCE_STATUS.PRESENT_ON_HOLIDAY;
    else if (cIn || cOut) {
      if (cIn && !cOut && isCurrentDate) status = ATTENDANCE_STATUS.IN;
      else status = ATTENDANCE_STATUS.MISSPUNCH;
    } else status = ATTENDANCE_STATUS.HOLIDAY;
  } else if (dayOfWeek === DAYS.SD.name) {
    if (cIn && cOut) status = ATTENDANCE_STATUS.PRESENT_ON_HOLIDAY;
    else if (cIn || cOut) {
      if (cIn && !cOut && isCurrentDate) status = ATTENDANCE_STATUS.IN;
      else status = ATTENDANCE_STATUS.MISSPUNCH;
    } else status = ATTENDANCE_STATUS.WEEK_OFF;
  } else if (status === ATTENDANCE_STATUS.LEAVE) {
    // Keep Leave
  } else {
    if (cIn && cOut) status = ATTENDANCE_STATUS.PRESENT;
    else if (cIn || cOut) {
      if (cIn && !cOut && isCurrentDate) status = ATTENDANCE_STATUS.IN;
      else status = ATTENDANCE_STATUS.MISSPUNCH;
    } else {
      status = ATTENDANCE_STATUS.ABSENT;
    }
  }

  // Apply custom cutoff rule if provided and it's a regular workday with check-in and check-out
  if (cutoff && status === ATTENDANCE_STATUS.PRESENT) {
    // Calculate required minutes
    const [reqInH, reqInM] = cutoff.inTime.split(':').map(Number);
    const [reqOutH, reqOutM] = cutoff.outTime.split(':').map(Number);
    let reqMins = (reqOutH * 60 + reqOutM) - (reqInH * 60 + reqInM);
    if (reqMins < 0) reqMins += 24 * 60;

    // Working hours do not override Present to Missed Punch anymore.
    // So status remains PRESENT regardless of totalMins >= reqMins.
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

export const isRecordLate = (checkIn?: string) => {
  if (!checkIn || checkIn === '-') return false;
  const match = checkIn.match(/(\d+):(\d+)/);
  if (match) {
    let h = parseInt(match[1], 10);
    const m = parseInt(match[2], 10);
    if (checkIn.toLowerCase().includes('pm') && h < 12) h += 12;
    if (checkIn.toLowerCase().includes('am') && h === 12) h = 0;
    return h > 9 || (h === 9 && m > 0);
  }
  return false;
};

export interface AttendanceCalculationResult {
  actualIn: string;
  actualOut: string;
  adjustedIn: string;
  adjustedOut: string;
  appliedRule: 'Worker Rule' | 'Manager Rule' | 'Default Rule';
  cutOffApplied: 'Yes' | 'No';
  managerDayStart: string;
  managerDayClose: string;
  workerDayStart: string;
  workerDayClose: string;
  workingHours: string;
  workingMins: number;
  lateEarlyStatus: string;
  attendanceStatus: string;
  reason: string;
  requiredWorkingHours: string;
  completedWorkingHours: string;
  workingHoursStatus: string;
  overtime: string;
  overtimeMins: number;
}

export const calculateAdvancedAttendance = (
  rawStatus: string,
  checkIn: string,
  checkOut: string,
  recordDate: string,
  workerCutoff?: {
    day_start_time?: string,
    day_close_time?: string,
    in_time?: string,
    out_time?: string,
    day_start?: string,
    day_close?: string,
    buffer_time?: string,
    buffer?: string,
    apply_worker_rule?: boolean,
    apply_cut_off_time?: boolean
  },
  globalRules?: {
    applyManagerCutOff: boolean;
    applyWorkerCutOff: boolean;
    applyCutOffTime: boolean;
  },
  managerCutoff?: {
    day_start_time?: string;
    day_close_time?: string;
    in_time?: string;
    out_time?: string;
    day_start?: string;
    day_close?: string;
    buffer_time?: string;
    buffer?: string;
  },
  empRequests?: any[]
): AttendanceCalculationResult => {
  const defaultTargetHours = 9;

  let appliedRule: 'Worker Rule' | 'Manager Rule' | 'Default Rule' = 'Default Rule';
  let cutOffApplied: 'Yes' | 'No' = 'No';
  let workerDayStart = '-';
  let workerDayClose = '-';
  let managerDayStart = '-';
  let managerDayClose = '-';

  let activeStart = '09:00';
  let activeClose = '18:00';
  let targetHours = defaultTargetHours;

  const useWorkerRule = globalRules?.applyWorkerCutOff ?? true;
  const useManagerRule = globalRules?.applyManagerCutOff !== false; // defaults to true in Layout.tsx
  const useCutoffTimeGlobal = globalRules?.applyCutOffTime ?? true;

  const parseTime = (t: string) => {
    if (!t || t === '-') return 0;
    const [h, m] = t.split(':').map(Number);
    return h * 60 + m;
  };

  const calculateTarget = (start: string, close: string) => {
    let diff = parseTime(close) - parseTime(start);
    if (diff < 0) diff += 24 * 60;
    return diff / 60;
  };

  const workerStart = workerCutoff?.day_start_time || workerCutoff?.day_start || workerCutoff?.in_time;
  const workerClose = workerCutoff?.day_close_time || workerCutoff?.day_close || workerCutoff?.out_time;
  const managerStart = managerCutoff?.day_start_time || managerCutoff?.day_start || managerCutoff?.in_time;
  const managerClose = managerCutoff?.day_close_time || managerCutoff?.day_close || managerCutoff?.out_time;

  let activeBuffer = 15;

  if (useWorkerRule && workerCutoff && workerStart && workerClose) {
    appliedRule = 'Worker Rule';
    workerDayStart = workerStart;
    workerDayClose = workerClose;
    activeStart = workerStart;
    activeClose = workerClose;
    targetHours = calculateTarget(workerStart, workerClose);
    activeBuffer = parseInt(workerCutoff.buffer_time || '') || parseInt(workerCutoff.buffer || '') || 15;
  } else if (useManagerRule && managerCutoff && managerStart && managerClose) {
    appliedRule = 'Manager Rule';
    managerDayStart = managerStart;
    managerDayClose = managerClose;
    activeStart = managerStart;
    activeClose = managerClose;
    targetHours = calculateTarget(managerStart, managerClose);
    activeBuffer = parseInt(managerCutoff.buffer_time || '') || parseInt(managerCutoff.buffer || '') || 15;
  } else {
    appliedRule = 'Default Rule';
    activeStart = '09:00';
    activeClose = '18:00';
    targetHours = 9;
  }

  if (useCutoffTimeGlobal) {
    cutOffApplied = 'Yes';
  }

  let cIn = !checkIn || checkIn === '-' || checkIn === '00:00' ? '' : checkIn;
  let cOut = !checkOut || checkOut === '-' || checkOut === '00:00' ? '' : checkOut;

  let adjIn = cIn;
  let adjOut = cOut;

  const formatTime = (mins: number) => {
    const h = Math.floor(mins / 60);
    const m = mins % 60;
    return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;
  };

  if (cutOffApplied === 'Yes' && cIn && cOut) {
    const actInMins = parseTime(cIn);
    const actOutMins = parseTime(cOut);
    const startMins = parseTime(activeStart);
    const closeMins = parseTime(activeClose);

    if (actInMins < startMins) {
      adjIn = formatTime(startMins);
    }
    if (actOutMins > closeMins) {
      adjOut = formatTime(closeMins);
    }
  }

  let totalMins = 0;
  if (adjIn && adjOut) {
    let diff = parseTime(adjOut) - parseTime(adjIn);
    if (diff < 0) diff += 24 * 60;
    totalMins = diff;
  }

  const workingHoursFormatted = totalMins > 0 ? formatDur(totalMins) : '-';

  let lateEarlyStatus = '-';
  if (adjIn) {
    const inMins = parseTime(adjIn);
    const startMins = parseTime(activeStart);
    if (inMins > startMins + activeBuffer) lateEarlyStatus = 'Late In';
    else if (inMins > startMins && inMins <= startMins + activeBuffer) lateEarlyStatus = 'On Time';
    else if (inMins < startMins) lateEarlyStatus = 'Early In';
    else lateEarlyStatus = 'On Time';
  }

  let reason = '';
  let status = rawStatus || '-';
  const cleanStatus = (rawStatus || '').toUpperCase().trim();
  if (cleanStatus === 'PRESENT' || cleanStatus === 'P') status = ATTENDANCE_STATUS.PRESENT;
  else if (cleanStatus === 'ABSENT' || cleanStatus === 'A') status = ATTENDANCE_STATUS.ABSENT;
  else if (cleanStatus === 'MISPUNCH' || cleanStatus === 'MISSPUNCH' || cleanStatus === 'M') status = ATTENDANCE_STATUS.MISSPUNCH;
  else if (cleanStatus === 'WEEK OFF' || cleanStatus === 'WEEKOFF' || cleanStatus === 'WO') status = ATTENDANCE_STATUS.WEEK_OFF;
  else if (cleanStatus === 'HOLIDAY' || cleanStatus === 'H') status = ATTENDANCE_STATUS.HOLIDAY;
  else if (cleanStatus === 'LEAVE' || cleanStatus === 'L') status = ATTENDANCE_STATUS.LEAVE;
  else if (cleanStatus === 'HALF DAY' || cleanStatus === 'HD') status = ATTENDANCE_STATUS.HALF_DAY;

  const currDate = format(new Date(), 'yyyy-MM-dd');
  const pDate = recordDate ? recordDate.split(' ')[0] : currDate;
  const dateObj = new Date(pDate);
  const dayOfWeek = isNaN(dateObj.getTime()) ? '' : dateObj.toLocaleDateString('en-US', { weekday: 'long' });
  const isCurrentDate = pDate === currDate;

  if (status === ATTENDANCE_STATUS.HOLIDAY) {
    if (cIn && cOut) status = ATTENDANCE_STATUS.PRESENT_ON_HOLIDAY;
    else if (cIn || cOut) {
      if (cIn && !cOut && isCurrentDate) status = ATTENDANCE_STATUS.IN;
      else status = ATTENDANCE_STATUS.MISSPUNCH;
    } else status = ATTENDANCE_STATUS.HOLIDAY;
  } else if (dayOfWeek === DAYS.SD.name) {
    if (cIn && cOut) status = ATTENDANCE_STATUS.PRESENT_ON_HOLIDAY;
    else if (cIn || cOut) {
      if (cIn && !cOut && isCurrentDate) status = ATTENDANCE_STATUS.IN;
      else status = ATTENDANCE_STATUS.MISSPUNCH;
    } else status = ATTENDANCE_STATUS.WEEK_OFF;
  } else {
    if (cIn && cOut) status = ATTENDANCE_STATUS.PRESENT;
    else if (cIn || cOut) {
      if (cIn && !cOut && isCurrentDate) status = ATTENDANCE_STATUS.IN;
      else status = ATTENDANCE_STATUS.MISSPUNCH;
    } else {
      status = ATTENDANCE_STATUS.ABSENT;
    }
  }

  if (empRequests && empRequests.length > 0) {
    const formattedPDate = format(new Date(pDate), 'yyyy-MM-dd');

    const isDateInRange = (r: any, targetDate: string) => {
      const fromDate = r.date ? format(new Date(r.date), 'yyyy-MM-dd') : '';
      const toDate = r.toDate ? format(new Date(r.toDate), 'yyyy-MM-dd') : fromDate;
      if (!fromDate) return false;
      return targetDate >= fromDate && targetDate <= toDate;
    };

    const pendingRequest = empRequests.find((r: any) => {
      return isDateInRange(r, formattedPDate) && r.status === 'Pending';
    });

    const approvedLeave = empRequests.find((r: any) => {
      const typeStr = (r.type || '').toUpperCase().replace(/\s+/g, '');
      return typeStr === 'LEAVE' && isDateInRange(r, formattedPDate) && r.status === 'Approved';
    });

    const approvedMispunch = empRequests.find((r: any) => {
      const typeStr = (r.type || '').toUpperCase().replace(/\s+/g, '');
      return (typeStr === 'MISPUNCH' || typeStr === 'MISSPUNCH' || typeStr === 'MISSEDPUNCH') && isDateInRange(r, formattedPDate) && r.status === 'Approved';
    });

    if (pendingRequest) {
      if (status !== ATTENDANCE_STATUS.WEEK_OFF && status !== ATTENDANCE_STATUS.HOLIDAY) {
        status = 'Pending';
      }
    } else if (approvedLeave) {
      if (status !== ATTENDANCE_STATUS.WEEK_OFF && status !== ATTENDANCE_STATUS.HOLIDAY) {
        if (!cIn && !cOut) {
          status = ATTENDANCE_STATUS.LEAVE;
        }
      }
    } else if (approvedMispunch) {
      status = 'P/MP';
    }
  }

  const reqMins = targetHours * 60;
  let workingHoursStatus = '-';
  let otMins = 0;

  if (adjIn && adjOut && status !== ATTENDANCE_STATUS.WEEK_OFF && status !== ATTENDANCE_STATUS.HOLIDAY && status !== ATTENDANCE_STATUS.PRESENT_ON_HOLIDAY) {
    if (totalMins >= reqMins) {
      workingHoursStatus = 'Completed';
      reason = `Completed ${targetHours} working hours`;
      otMins = totalMins - reqMins;
    } else {
      workingHoursStatus = 'Incomplete';
      reason = `Working hours less than ${targetHours} hours`;
    }
  }

  const formatHoursStr = (hours: number) => {
    const h = Math.floor(hours);
    const m = Math.round((hours - h) * 60);
    return m > 0 ? `${h}h ${m}m` : `${h} hrs`;
  };

  const overtimeFormatted = otMins > 0 ? formatDur(otMins) : '-';

  return {
    actualIn: cIn || '-',
    actualOut: cOut || '-',
    adjustedIn: adjIn || '-',
    adjustedOut: adjOut || '-',
    appliedRule: appliedRule,
    cutOffApplied: cutOffApplied,
    managerDayStart: managerDayStart,
    managerDayClose: managerDayClose,
    workerDayStart: workerDayStart,
    workerDayClose: workerDayClose,
    workingHours: workingHoursFormatted,
    workingMins: totalMins,
    lateEarlyStatus: lateEarlyStatus,
    attendanceStatus: status,
    reason: reason,
    requiredWorkingHours: formatHoursStr(targetHours),
    completedWorkingHours: workingHoursFormatted,
    workingHoursStatus: workingHoursStatus,
    overtime: overtimeFormatted,
    overtimeMins: otMins
  };
};

export interface ProcessedAttendanceRecord {
  date: string;
  dayOfWeek: string;
  checkIn: string;
  checkOut: string;
  status: string;
  duration: string;
  totalHours: string;
  overTime: string;
  diffMs: number;
  otMs: number;
  requiredWorkingHours: string;
  completedWorkingHours: string;
  workingHoursStatus: string;
  advanced: AttendanceCalculationResult;
}

export const processAttendanceRecord = (
  p: any,
  empCutoff?: any,
  attendanceGlobalRules?: any,
  managerCutoffData?: any,
  empRequests?: any[],
  currentDate?: Date
): ProcessedAttendanceRecord => {
  const currDateStr = currentDate ? format(currentDate, 'yyyy-MM-dd') : format(new Date(), 'yyyy-MM-dd');
  const date = p?.logindate ? p.logindate.split(' ')[0] : currDateStr;

  const checkIn = p?.intime && p.intime !== '-' ? p.intime.split(' ')[1]?.substring(0, 5) : '';
  const checkOut = p?.outtime && p.outtime !== '-' ? p.outtime.split(' ')[1]?.substring(0, 5) : '';

  const advanced = calculateAdvancedAttendance(
    p?.status,
    checkIn,
    checkOut,
    date,
    empCutoff,
    attendanceGlobalRules,
    managerCutoffData,
    empRequests
  );

  const status = advanced.attendanceStatus;
  const totalHours = advanced.completedWorkingHours;
  const overTime = advanced.overtime || '-';

  let diffMs = 0;
  if (advanced.workingMins) {
    diffMs = advanced.workingMins * 60 * 1000;
  }
  let otMs = 0;
  if (advanced.overtimeMins) {
    otMs = advanced.overtimeMins * 60 * 1000;
  }

  const dateObj = new Date(date);
  const dayOfWeek = isNaN(dateObj.getTime()) ? '' : dateObj.toLocaleDateString('en-US', { weekday: 'short' });

  const { total: duration } = calculateTime(checkIn || '-', checkOut || '-');

  return {
    date,
    dayOfWeek,
    checkIn: checkIn || '-',
    checkOut: checkOut || '-',
    status,
    duration,
    totalHours,
    overTime,
    diffMs,
    otMs,
    requiredWorkingHours: advanced.requiredWorkingHours,
    completedWorkingHours: advanced.completedWorkingHours,
    workingHoursStatus: advanced.workingHoursStatus,
    advanced
  };
};

export const canApplyLeave = (dateStr: string, status: string, existingRequest?: any): { allowed: boolean; message: string } => {
  if (!dateStr) return { allowed: false, message: 'Please select a date first.' };

  if (existingRequest) {
    if (existingRequest.status === 'Pending') {
      return { allowed: false, message: 'Request already pending for this date.' };
    }
    if (existingRequest.status === 'Approved') {
      return { allowed: false, message: 'Request already approved for this date.' };
    }
  }

  const date = new Date(dateStr);
  const today = startOfDay(new Date());

  if (isAfter(date, today)) {
    return { allowed: true, message: '' };
  }

  if (status === ATTENDANCE_STATUS.ABSENT || status === 'Absent' || status === 'A') {
    return { allowed: true, message: '' };
  }

  let message = "Leave can only be applied on absent or future dates.";
  if (status === ATTENDANCE_STATUS.MISSPUNCH || status === 'M') {
    message = "Leave cannot be applied on missed punch day.";
  } else if (status === ATTENDANCE_STATUS.PRESENT || status === 'P' || status === 'IN' || status === 'HD' || status === 'P/MP' || status === ATTENDANCE_STATUS.PRESENT_ON_HOLIDAY) {
    message = "Leave cannot be applied on present day.";
  } else if (status === ATTENDANCE_STATUS.WEEK_OFF || status === 'WO') {
    message = "Leave cannot be applied on week off day.";
  } else if (status === ATTENDANCE_STATUS.LEAVE || status === 'L') {
    message = "Leave already applied for this date.";
  }

  return { allowed: false, message };
};

export const canApplyMissedPunch = (dateStr: string, status: string, existingRequest?: any): { allowed: boolean; message: string } => {
  if (!dateStr) return { allowed: false, message: 'Please select a date first.' };

  if (existingRequest) {
    if (existingRequest.status === 'Pending') {
      return { allowed: false, message: 'Request already pending for this date.' };
    }
    if (existingRequest.status === 'Approved') {
      return { allowed: false, message: 'Request already approved for this date.' };
    }
  }

  if (status === ATTENDANCE_STATUS.MISSPUNCH || status === 'M' || status === 'Missed Punch' || status === 'P/MP') {
    return { allowed: true, message: '' };
  }

  return { allowed: false, message: "Missed Punch request is available only for missed punch days." };
};