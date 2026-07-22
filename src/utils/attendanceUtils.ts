import { format } from 'date-fns';

export const getStatusColor = (status: string) => {
  switch (status) {
    case 'In': return 'text-green-600 font-bold';
    case 'PH': return 'text-emerald-500 font-bold';
    case 'P':
    case 'Present': return 'text-green-600 font-bold';
    case 'A':
    case 'Absent': return 'text-red-600 font-bold';
    case 'WO':
    case 'Week Off': return 'text-blue-500 font-medium';
    case 'H':
    case 'Holiday': return 'text-purple-600 font-bold';
    case 'HD': return 'text-slate-400 font-bold';
    case 'EL': return 'text-teal-600 font-bold';
    case 'HDEL': return 'text-teal-400 font-bold';
    case 'L':
    case 'Leave': return 'text-amber-500 font-bold';
    case 'EO': return 'text-orange-500 font-bold';
    case 'NJ': return 'text-slate-300 font-bold';
    case 'LWP': return 'text-pink-600 font-bold';
    case 'P/MP': return 'text-yellow-600 font-bold';
    case 'M':
    case 'Missed Punch': return 'text-yellow-600 font-bold';
    case '-': return 'text-slate-400 font-bold';
    default: return 'text-slate-400 font-bold';
  }
};

export const normalizeAttendanceStatus = (rawStatus: string, checkIn: string, checkOut: string, recordDate: string) => {
  let status = rawStatus || '-';
  if (status === 'PRESENT') status = 'P';
  else if (status === 'ABSENT') status = 'A';
  else if (status === 'MISPUNCH') status = 'M';
  else if (status === 'WEEK OFF' || status === 'WEEKOFF') status = 'WO';
  else if (status === 'HOLIDAY') status = 'H';
  else if (status === 'LEAVE') status = 'L';
  else if (status === 'HALF DAY') status = 'HD';

  const currDate = format(new Date(), 'yyyy-MM-dd');
  const pDate = recordDate ? recordDate.split(' ')[0] : currDate;
  const dateObj = new Date(pDate);
  const dayOfWeek = isNaN(dateObj.getTime()) ? '' : dateObj.toLocaleDateString('en-US', { weekday: 'short' });
  const isCurrentDate = pDate === currDate;

  const cIn = !checkIn || checkIn === '-' ? '' : checkIn;
  const cOut = !checkOut || checkOut === '-' ? '' : checkOut;
  // console.log(`dayOfWeek: ${dayOfWeek} Status: ${status} RecDate: ${recordDate} cIn: ${cIn} cOut: ${cOut}`)
  if (!cIn && !cOut && status !== 'WO') {
    if (dayOfWeek === 'Sun') {
      status = 'WO';
    } else {
      status = 'A';
    }
  } else if (cIn && !cOut && status !== 'WO') {
    if (isCurrentDate) {
      status = 'In';
    } else {
      status = 'M';
    }
  } else if (dayOfWeek === 'Sun' && status === 'P') {
    status = 'PH';
  }

  return status;
};

export const calculateTimeNum = (checkIn: string, checkOut: string) => {
  const cIn = !checkIn || checkIn === '-' ? '' : checkIn;
  const cOut = !checkOut || checkOut === '-' ? '' : checkOut;
  if (!cIn || !cOut) return { totalMins: 0, otMins: 0 };
  const [inH, inM] = cIn.split(':').map(Number);
  const [outH, outM] = cOut.split(':').map(Number);
  let diff = (outH * 60 + outM) - (inH * 60 + inM);
  if (diff < 0) diff += 24 * 60;
  return {
    totalMins: diff,
    otMins: Math.max(0, diff - 9 * 60)
  };
};

export const formatDur = (m: number) => `${Math.floor(m / 60)}h ${m % 60}m`;

export const calculateTime = (checkIn: string, checkOut: string) => {
  const { totalMins, otMins } = calculateTimeNum(checkIn, checkOut);
  if (totalMins === 0) return { total: '-', overtime: '-' };
  return {
    total: formatDur(totalMins),
    overtime: otMins > 0 ? formatDur(otMins) : '-'
  };
};

export const getFullStatus = (status: string) => {
  switch (status) {
    case 'P': return 'Present';
    case 'In': return 'In';
    case 'A': return 'Absent';
    case 'WO': return 'Week Off';
    case 'H': return 'Holiday';
    case 'L': return 'Leave';
    case 'EO': return 'Early Out';
    case 'P/MP': return 'Present/Missed Punch';
    case 'M': return 'Missed Punch';
    case 'HD': return 'Half Day';
    case 'PH': return 'Present on Holiday';
    case 'EL': return 'Earned Leave';
    case 'HDEL': return 'Half Day Earned Leave';
    case 'NJ': return 'Not Joined';
    case 'LWP': return 'Leave without Pay';
    default: return status;
  }
};
