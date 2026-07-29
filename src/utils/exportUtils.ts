import { format, isAfter, startOfDay, getDaysInMonth } from 'date-fns';
import * as XLSX from 'xlsx';
import ExcelJS from 'exceljs';
import { saveAs } from 'file-saver';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { calculateTimeNum, formatDur, getAttendanceHeaders, generateShortName } from './attendanceUtils';

export const transformAttendanceRowsForExport = (employees: any[], attendance: any[], currentDate: Date) => {
  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();
  const daysInMonth = getDaysInMonth(currentDate);
  const today = startOfDay(new Date());

  const days = Array.from({ length: daysInMonth }, (_, i) => i + 1);
  const pastDays = days.filter(day => !isAfter(new Date(year, month, day), today));

  let monthSundaysCount = 0;
  for (let d = 1; d <= daysInMonth; d++) {
    if (new Date(year, month, d).getDay() === 0) monthSundaysCount++;
  }
  const fixedWorkingDays = daysInMonth - monthSundaysCount;

  const exportData = employees.map(emp => {
    const empAttendance = attendance.find((a: any) => a.userId === emp.id)?.records || [];

    let totalPresent = 0;
    let totalAbsent = 0;
    let totalMissedPunches = 0;
    let totalPresentOnHoliday = 0;
    let totalActualMins = 0;

    const row: any = { 'Code': emp.code, 'Name': generateShortName(emp.name) };

    days.forEach(day => { row[day.toString()] = '0'; });

    pastDays.forEach(day => {
      const dateObj = new Date(year, month, day);
      const dateStr = format(dateObj, 'yyyy-MM-dd');
      const record = empAttendance.find((r: any) => r.date === dateStr);
      let status = record?.status || '-';

      if (['P', 'P/MP', 'PH'].includes(status)) totalPresent++;
      if (['A', 'L'].includes(status)) totalAbsent++;
      if (status === 'MP') totalMissedPunches++;
      if (status === 'PH') totalPresentOnHoliday++;
      const { totalMins } = calculateTimeNum(record?.checkIn, record?.checkOut);
      totalActualMins += totalMins;

      row[day.toString()] = status;
    });

    const expectedMonthlyMins = totalPresent * 9 * 60;
    let displayedActualMins = totalActualMins;
    let displayedOtMins = 0;
    if (totalActualMins > expectedMonthlyMins) {
      displayedActualMins = expectedMonthlyMins;
      displayedOtMins = totalActualMins - expectedMonthlyMins;
    }
    // console.log(`${emp.name} | P: ${totalPresent}, A: ${totalAbsent}, MP: ${totalMissedPunches}, PH: ${totalPresentOnHoliday}, AHrs: ${formatDur(totalActualMins)}, OTHrs: ${formatDur(displayedOtMins)}, THrs: ${formatDur(expectedMonthlyMins)}`)
    row['Working Days'] = fixedWorkingDays;
    row['Present Days'] = totalPresent;
    row['Absent Days'] = totalAbsent;
    row['Missed Punch'] = totalMissedPunches;
    row['Present on Holiday'] = totalPresentOnHoliday;
    row['Actual Hrs.'] = formatDur(displayedActualMins);
    row['Overtime Hrs.'] = formatDur(displayedOtMins);
    row['Total Hrs.'] = formatDur(totalActualMins);

    return row;
  });

  const headersArray = getAttendanceHeaders(days.map(d => d.toString()));

  return { data: exportData, headers: headersArray };
};

export const exportAttendanceToExcel = async (exportObj: { data: any[], headers: string[] }, currentDate: Date, customColors: any = {}) => {
  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet('Attendance');

  worksheet.addRow(exportObj.headers);
  const headerRow = worksheet.getRow(1);
  headerRow.font = { bold: true, color: { argb: 'FFFFFFFF' } };
  headerRow.fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FF476282' }
  };
  headerRow.alignment = { horizontal: 'center', vertical: 'middle' };

  worksheet.columns = exportObj.headers.map((_, i) => ({
    width: i === 0 ? 15 : i === 1 ? 25 : 8
  }));

  exportObj.data.forEach(rowData => {
    const row = exportObj.headers.map(h => rowData[h]);
    const excelRow = worksheet.addRow(row);

    excelRow.eachCell((cell, colNumber) => {
      const val = cell.value as string;

      cell.alignment = { horizontal: 'center', vertical: 'middle' };
      cell.border = {
        top: { style: 'thin', color: { argb: 'FFE2E8F0' } },
        left: { style: 'thin', color: { argb: 'FFE2E8F0' } },
        bottom: { style: 'thin', color: { argb: 'FFE2E8F0' } },
        right: { style: 'thin', color: { argb: 'FFE2E8F0' } }
      };

      if (colNumber > 2) {
        let bgColor = 'FFFFFFFF';
        let textColor = 'FF334155';

        if (customColors[val]) {
          const hex = customColors[val].replace('#', '');
          if (hex.length === 6) {
            bgColor = 'FF' + hex.toUpperCase();
            textColor = 'FFFFFFFF';
          }
        } else {
          switch (val) {
            case 'P': case 'In': bgColor = 'FF16A34A'; textColor = 'FFFFFFFF'; break;
            case 'A': bgColor = 'FFDC2626'; textColor = 'FFFFFFFF'; break;
            case 'WO': bgColor = 'FF3B82F6'; textColor = 'FFFFFFFF'; break;
            case 'MP': case 'P/MP': bgColor = 'FFCA8A04'; textColor = 'FFFFFFFF'; break;
            case 'PH': bgColor = 'FF10B981'; textColor = 'FFFFFFFF'; break;
            case 'HD': bgColor = 'FF94A3B8'; textColor = 'FFFFFFFF'; break;
            case 'H': bgColor = 'FF9333EA'; textColor = 'FFFFFFFF'; break;
            case 'L': bgColor = 'FFF59E0B'; textColor = 'FFFFFFFF'; break;
          }
        }

        if (bgColor !== 'FFFFFFFF') {
          cell.fill = {
            type: 'pattern',
            pattern: 'solid',
            fgColor: { argb: bgColor }
          };
          cell.font = { color: { argb: textColor }, bold: true };
        }
      }
    });
  });

  const monthStr = format(currentDate, 'MMM_yyyy');
  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
  saveAs(blob, `Attendance_${monthStr}.xlsx`);
};

export const exportAttendanceToCsv = (exportObj: { data: any[], headers: string[] }, currentDate: Date) => {
  const worksheet = XLSX.utils.json_to_sheet(exportObj.data, { header: exportObj.headers });
  const csv = XLSX.utils.sheet_to_csv(worksheet);

  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement("a");
  const url = URL.createObjectURL(blob);
  link.setAttribute("href", url);

  const monthStr = format(currentDate, 'MMM_yyyy');
  link.setAttribute("download", `Attendance_${monthStr}.csv`);
  link.style.visibility = 'hidden';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};

export const exportAttendanceToPdf = async (exportObj: { data: any[], headers: string[] }, currentDate: Date, customColors: any = {}) => {
  if (exportObj.data.length === 0) return;

  const doc = new jsPDF('landscape', 'pt', 'a3');
  const monthStr = format(currentDate, 'MMMM yyyy');

  doc.setFontSize(18);
  doc.text(`Attendance Tracker - ${monthStr}`, 20, 30);

  doc.setFontSize(12);
  doc.setTextColor(100, 100, 100);
  doc.text(`Generated on: ${format(new Date(), 'dd-MMM-yyyy HH:mm:ss')}`, 20, 45);

  const headers = exportObj.headers;
  const rows = exportObj.data.map(row => headers.map(header => row[header]));

  autoTable(doc, {
    head: [headers],
    body: rows,
    startY: 60,
    styles: { fontSize: 9, cellPadding: 2, textColor: [100, 100, 100], fontStyle: 'normal' },
    headStyles: { fillColor: [248, 250, 252], textColor: [71, 98, 130], lineWidth: 0.1, lineColor: [226, 232, 240], fontStyle: 'bold' },
    bodyStyles: { lineWidth: 0.1, lineColor: [241, 245, 249] },
    didParseCell: (data) => {
      if (data.section === 'body') {
        const val = data.cell.raw;
        if (typeof val === 'string') {
          let color: number[] | null = null;
          if (customColors[val]) {
            const hex = customColors[val].replace('#', '');
            if (hex.length === 6) {
              color = [
                parseInt(hex.substring(0, 2), 16),
                parseInt(hex.substring(2, 4), 16),
                parseInt(hex.substring(4, 6), 16)
              ];
            }
          } else {
            switch (val) {
              case 'P': case 'In': color = [22, 163, 74]; break;
              case 'A': color = [220, 38, 38]; break;
              case 'WO': color = [59, 130, 246]; break;
              case 'MP': case 'P/MP': color = [202, 138, 4]; break;
              case 'PH': color = [16, 185, 129]; break;
              case 'HD': color = [148, 163, 184]; break;
              case 'H': color = [147, 51, 234]; break;
              case 'L': color = [245, 158, 11]; break;
            }
          }

          if (color) {
            data.cell.styles.textColor = color as [number, number, number];
          }
        }
      }
    }
  });

  doc.save(`Attendance_${format(currentDate, 'MMM_yyyy')}.pdf`);
};
