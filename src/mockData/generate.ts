import type { User, AppRequest, EmployeeAttendance, DailyAttendance, AttendanceStatus } from '../types';

export const generateMockUsers = (): User[] => {
  const users: User[] = [];

  // 2 Admins
  users.push({ id: 'admin1', code: 'ADM001', name: 'Super Admin', role: 'Admin' });
  users.push({ id: 'admin2', code: 'ADM002', name: 'HR Manager', role: 'Admin' });

  const indianNames = [
    "Aarav Sharma", "Aditi Patel", "Rajesh Kumar", "Priya Singh", "Amit Verma",
    "Neha Gupta", "Vikram Malhotra", "Sneha Desai", "Rahul Reddy", "Anjali Joshi",
    "Sanjay Chawla", "Kavita Nair", "Rohan Mehta", "Pooja Agarwal", "Arjun Kapoor",
    "Riya Bhatia", "Karan Singhania", "Tanvi Menon", "Ravi Pillai", "Nisha Das",
    "Siddharth Rao", "Divya Iyer", "Deepak Saxena", "Swati Kadam", "Manoj Tiwari",
    "Meera Ranganathan", "Vivek Anand", "Shruti Iyer", "Nitin Khurana", "Geeta Phogat",
    "Harish Reddy", "Shilpa Shetty", "Gaurav Chauhan", "Kiran Bedi", "Prashant Bhatt",
    "Asha Bhosle", "Suresh Raina", "Pallavi Joshi", "Vishal Dadlani", "Preeti Zinta",
    "Ashish Nehra", "Sonali Bendre", "Anil Kumble", "Juhi Chawla", "Kunal Khemu",
    "Radhika Apte", "Sameer Datt", "Nandini Sen", "Tarun Tejpal", "Bhavna Khatri"
  ];

  // 50 Employees
  for (let i = 0; i < 50; i++) {
    users.push({
      id: `emp${i + 1}`,
      code: `EMP${(i + 1).toString().padStart(3, '0')}`,
      name: indianNames[i],
      role: 'Employee'
    });
  }

  return users;
};

export const generateMockRequests = (users: User[]): AppRequest[] => {
  const requests: AppRequest[] = [];

  // Generate some pending/approved requests
  requests.push({ id: 'req1', userId: 'emp1', type: 'Leave', date: '2026-07-15', reason: 'Sick leave (fever)', status: 'Pending', leaveType: 'Full' });
  requests.push({ id: 'req2', userId: 'emp2', type: 'Leave', date: '2026-07-20', reason: 'Personal work', status: 'Approved', leaveType: 'Half' });
  requests.push({ id: 'req3', userId: 'emp3', type: 'Misspunch', date: '2026-07-09', reason: 'Forgot to punch out due to client meeting', status: 'Pending', inTime: '09:00', outTime: '18:30' });
  requests.push({ id: 'req4', userId: 'emp4', type: 'Leave', date: '2026-07-22', reason: 'Attending family wedding', status: 'Pending', leaveType: 'Full' });
  requests.push({ id: 'req5', userId: 'emp7', type: 'Misspunch', date: '2026-07-10', reason: 'System crash during check-in', status: 'Pending', inTime: '08:45', outTime: '18:00' });
  requests.push({ id: 'req6', userId: 'emp9', type: 'Leave', date: '2026-07-25', reason: 'Doctor appointment', status: 'Pending', leaveType: 'Half' });
  requests.push({ id: 'req7', userId: 'emp12', type: 'Misspunch', date: '2026-07-11', reason: 'ID card forgotten at home', status: 'Pending', inTime: '09:15', outTime: '18:45' });
  requests.push({ id: 'req8', userId: 'emp15', type: 'Leave', date: '2026-07-18', reason: 'Out of town for emergency', status: 'Rejected', leaveType: 'Full' });
  requests.push({ id: 'req9', userId: 'emp21', type: 'Misspunch', date: '2026-07-12', reason: 'Punched at the wrong gate', status: 'Pending', inTime: '09:05', outTime: '18:10' });

  return requests;
};

export const generateMockAttendance = (users: User[]): EmployeeAttendance[] => {
  const attendance: EmployeeAttendance[] = [];
  const employees = users.filter(u => u.role === 'Employee');

  // Generate for current month (July 2026)
  const currentMonth = '2026-07';

  employees.forEach(emp => {
    const records: DailyAttendance[] = [];
    for (let day = 1; day <= 31; day++) {
      const dateStr = `${currentMonth}-${day.toString().padStart(2, '0')}`;
      let status: AttendanceStatus = 'P';

      // Randomize somewhat
      const rand = Math.random();
      if (rand > 0.95) status = 'A';
      else if (rand > 0.90) status = 'L';
      else if (rand > 0.85) status = 'HD';
      else if (rand > 0.80) status = 'H';
      else if (rand > 0.77) status = 'PH';
      else if (rand > 0.74) status = 'EL';
      else if (rand > 0.71) status = 'HDEL';
      else if (rand > 0.68) status = 'EO';
      else if (rand > 0.65) status = 'LWP';

      // Weekends as WO
      const d = new Date(dateStr);
      if (d.getDay() === 0) status = 'WO';

      records.push({
        date: dateStr,
        status,
        checkIn: status === 'P' ? '09:00' : undefined,
        checkOut: status === 'P' ? '18:00' : undefined,
      });
    }
    attendance.push({ employeeId: emp.id, userId: emp.id, records });
  });

  return attendance;
};
