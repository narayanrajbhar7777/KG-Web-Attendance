import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import {
  fetchGatePassEntity,
  fetchEmployeeImage,
  fetchCombineEntityData,
  fetchGatePassAuth,
  fetchGatePassReasonCategory,
  insertGatePass,
  fetchGatePassList
} from '../../api';
import Loader from '../../components/Loader';
import { format } from 'date-fns';
import { toast } from 'react-hot-toast';
import Select from 'react-select';

const customSelectClassNames = {
  control: (state: any) => `flex items-center justify-between px-2 h-[36px] w-full bg-white dark:bg-slate-900 border rounded-lg text-sm transition-colors cursor-pointer shrink-0 ${state.isFocused ? 'border-blue-500 ring-2 ring-blue-500' : 'border-slate-300 dark:border-slate-600 hover:border-blue-400 dark:hover:border-slate-500'}`,
  menu: () => 'absolute z-50 w-full mt-1 bg-white dark:bg-[#1e293b] border border-slate-200 dark:border-slate-700 rounded-lg shadow-lg overflow-hidden',
  menuList: () => 'max-h-[300px] overflow-y-auto custom-scrollbar',
  option: (state: any) => `px-3 py-2 text-sm cursor-pointer transition-colors truncate ${state.isSelected ? 'bg-blue-50 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300 font-medium' : state.isFocused ? 'bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200' : 'text-slate-700 dark:text-slate-300'}`,
  singleValue: () => 'text-slate-900 dark:text-white truncate',
  input: () => 'text-slate-900 dark:text-white',
  placeholder: () => 'text-slate-500 dark:text-slate-400',
  clearIndicator: () => 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1 flex items-center',
  dropdownIndicator: () => 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1 flex items-center',
  valueContainer: () => 'flex items-center flex-1 gap-1 px-1 flex-nowrap overflow-hidden',
  indicatorsContainer: () => 'flex items-center shrink-0',
  indicatorSeparator: () => 'bg-slate-200 dark:bg-slate-700 mx-1 w-[1px] my-2'
};

const ExitPass: React.FC = () => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);

  // Entity State
  const [entityData, setEntityData] = useState<any>(null);
  const [empImage, setEmpImage] = useState<string>('');
  const [hasPass, setHasPass] = useState(false);
  const [myPasses, setMyPasses] = useState<any[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 15;

  const [isReportEnabled, setIsReportEnabled] = useState(false);
  const [filterDate, setFilterDate] = useState("");

  // Form Dropdowns
  const [departments, setDepartments] = useState<any[]>([]);
  const [authorizedPersons, setAuthorizedPersons] = useState<any[]>([]);
  const [floors, setFloors] = useState<any[]>([]);
  const [reasons, setReasons] = useState<any[]>([]);

  // Form State
  const [formData, setFormData] = useState({
    empCode: user?.code || '',
    empName: user?.name || '',
    department: '',
    departmentNode: '',
    manager: '',
    passDate: format(new Date(), 'yyyy-MM-dd'),
    outTime: '',
    isReturn: false, // false by default (enable/disable button)
    reasonCategory: '',
    reason: '',
    belongings: '',
    floor: '',
    authorizedPerson: ''
  });

  // Track if we're fetching dynamic details
  const [fetchingDetails, setFetchingDetails] = useState(false);

  const loadData = async () => {
    if (!user) return;
    try {
      setLoading(true);
      const entityRes = await fetchGatePassEntity(user.code);
      const entity = entityRes?.DATA?.[0] || entityRes;
      setEntityData(entity);

      // We do not fetch pass list here anymore by default.
      // It is fetched when the user enables the report toggle.

      // Load Image
      try {
        const imgRes = await fetchEmployeeImage(user.code);
        if (imgRes?.p_img) setEmpImage(imgRes.p_img);
      } catch (err) {
        console.error("Error fetching image", err);
      }

      // Always Load Form Dropdowns
      const deptRes = await fetchCombineEntityData(user.code, "1.1.8");
      const authRes = await fetchGatePassAuth();
      const reasonRes = await fetchGatePassReasonCategory();

      // Populate Reason Categories
      if (Array.isArray(reasonRes)) setReasons(reasonRes);
      else if (reasonRes?.RESPONSE) setReasons(reasonRes.RESPONSE);

      // Populate Auth Persons and Floors
      const authData = Array.isArray(authRes) ? authRes : authRes?.RESPONSE || authRes?.DATA || [];
      const extractedFloors = Array.from(new Set(authData.map((a: any) => a.floor).filter(Boolean)));
      setAuthorizedPersons(authData);
      setFloors(extractedFloors.map(f => ({ label: f as string, value: f as string })));

      // Pre-fill department/manager based on current user
      let deptName = "FACETS GEMS POLISHING WORKS PVT.LTD";

      if (entity) {
        setFormData(prev => ({
          ...prev,
          department: deptName, // Display Name
          departmentNode: entity.dept_node || "1.1.8", // Payload Node
          manager: entity.managername || entity.manager || "",
          empName: entity.emp_name || user?.name || ""
        }));
      }

    } catch (err) {
      console.error(err);
      toast.error('Failed to load exit pass data');
    } finally {
      setLoading(false);
    }
  };

  const fetchUserDetails = async (code: string) => {
    if (!code) return;
    try {
      setFetchingDetails(true);
      const entityRes = await fetchGatePassEntity(code);
      const entity = entityRes?.DATA?.[0] || entityRes;

      const imgRes = await fetchEmployeeImage(code);
      const deptRes = await fetchCombineEntityData(code, "1.1.8");

      let deptName = "FACETS GEMS POLISHING WORKS PVT.LTD";

      if (entity) {
        setEntityData(entity);
        setFormData(prev => ({
          ...prev,
          empName: entity.emp_name || '',
          department: deptName,
          departmentNode: entity.dept_node || "1.1.8",
          manager: entity.managername || entity.manager || ""
        }));
      } else {
        toast.error("Employee not found");
      }

      if (imgRes?.p_img) {
        setEmpImage(imgRes.p_img);
      } else {
        setEmpImage('');
      }

      // Fetch dynamic passes for this user
      const passRes = await fetchGatePassList({
        P_EMP_ID: code,
        P_GP_DATE: "",
        P_APRVR_ID: "",
        P_APRVL_STATUS: "",
        P_FRM_FLG: "E"
      });
      const passList = Array.isArray(passRes) ? passRes : (passRes?.DATA || passRes?.RESPONSE || []);
      if (passList && passList.length > 0) {
        setHasPass(true);
        const sorted = passList.sort((a: any, b: any) => new Date(b.gp_date || b.ent_date || 0).getTime() - new Date(a.gp_date || a.ent_date || 0).getTime());
        setMyPasses(sorted);
      } else {
        setHasPass(false);
        setMyPasses([]);
      }

    } catch (err) {
      console.error("Error fetching user details", err);
      toast.error("Error fetching employee details");
    } finally {
      setFetchingDetails(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [user]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleToggleReport = async () => {
    const newState = !isReportEnabled;
    setIsReportEnabled(newState);
    if (newState && user) {
      try {
        setLoading(true);
        const passRes = await fetchGatePassList({
          P_EMP_ID: user.code,
          P_GP_DATE: "",
          P_APRVR_ID: "",
          P_APRVL_STATUS: "",
          P_FRM_FLG: "E"
        });
        const passList = Array.isArray(passRes) ? passRes : (passRes?.DATA || passRes?.RESPONSE || []);
        if (passList && passList.length > 0) {
          setHasPass(true);
          const sorted = passList.sort((a: any, b: any) => new Date(b.gp_date || b.ent_date || 0).getTime() - new Date(a.gp_date || a.ent_date || 0).getTime());
          setMyPasses(sorted);
        } else {
          setHasPass(false);
          setMyPasses([]);
        }
      } catch (err) {
        console.error(err);
        toast.error("Failed to fetch report data");
      } finally {
        setLoading(false);
      }
    } else {
      setMyPasses([]);
      setHasPass(false);
      setFilterDate("");
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    // Validation
    const { empCode, departmentNode, passDate, outTime, reasonCategory, reason, floor, authorizedPerson } = formData;
    if (!empCode || !departmentNode || !passDate || !outTime || !reasonCategory || !reason || !floor || !authorizedPerson) {
      toast.error("Please fill all required fields");
      return;
    }

    try {
      setLoading(true);
      const payload = {
        P_COID: "KG01",
        P_BRID: "FP02",
        P_EMP_ID: empCode, // Use the dynamically entered code
        P_DEPT_NODE: departmentNode || "1.1.8",
        P_PARENT_NODE: "1.1",
        P_GP_DATE: format(new Date(passDate), 'dd-MMM-yyyy').toUpperCase(),
        P_GP_FR_TIME: `${passDate} ${outTime}:00`,
        P_GP_TO_TIME: "", // Not used as requested
        P_RTN_FLG: formData.isReturn ? "Y" : "N", // Pass return flag
        P_RSN_CATEGORY: reasonCategory,
        P_REASON: reason,
        P_BELONGINGS: formData.belongings || "",
        P_FLOOR: floor,
        P_APPROVER_ID: authorizedPerson,
        P_ENT_USER: user.code, // Logged in user creating it
        P_ENT_TERM: "172.16.37.219" // Hardcoded terminal ip for now
      };

      const res = await insertGatePass(payload);
      if (res && res[0]?.P_FLG === 'Y') {
        toast.success(res[0]?.P_MSG || "Gate Pass Created Successfully");
        setFormData(prev => ({
          ...prev,
          outTime: '',
          reasonCategory: '',
          reason: '',
          belongings: '',
          floor: '',
          authorizedPerson: ''
        }));
        loadData(); // Refresh to show pass details
      } else {
        toast.error("Failed to create Gate Pass");
      }
    } catch (err) {
      console.error(err);
      toast.error("Error submitting form");
    } finally {
      setLoading(false);
    }
  };

  if (loading && !entityData) {
    return <div className="flex items-center justify-center min-h-[70vh]"><Loader /></div>;
  }

  const profileImageSrc = empImage ? (empImage.startsWith('data:') || empImage.startsWith('http') ? empImage : `data:image/jpeg;base64,${empImage}`) : '';
  const isLimitExceeded = entityData?.pass_cnt > 1;

  const displayedPasses = isReportEnabled
    ? (filterDate
      ? myPasses.filter(p => p.gp_date && format(new Date(p.gp_date), 'yyyy-MM-dd') === filterDate)
      : myPasses)
    : [];

  return (
    <div className="p-6 h-full flex flex-col overflow-hidden">
      <div className="w-full flex-grow flex flex-col min-h-0">

        {/* Split Layout: Form on Left, Details on Right */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 flex-grow min-h-0">

          {/* Left: Create Exit Pass Form */}
          <div className="lg:col-span-4 bg-white dark:bg-[#1e293b] rounded-xl shadow-sm border border-slate-200 dark:border-slate-800 p-5 flex flex-col min-h-0">
            <div className="flex items-start justify-between mb-4 border-b border-slate-100 dark:border-slate-800 pb-2">
              <h3 className="text-lg font-bold text-slate-800 dark:text-white pt-1">Create Exit Pass</h3>
              {/* Profile Image moved to header */}
              <div className="w-[50px] h-[50px] shrink-0 rounded-lg overflow-hidden bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-600">
                {profileImageSrc ? (
                  <img src={profileImageSrc} alt="Profile" className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-slate-400 text-[10px] text-center leading-tight p-1">No Image</div>
                )}
              </div>
            </div>
            <form id="exitPassForm" onSubmit={handleSubmit} className="space-y-3 flex-grow relative overflow-y-auto overflow-x-hidden">
              {fetchingDetails && (
                <div className="absolute inset-0 z-10 bg-white/50 dark:bg-[#1e293b]/50 backdrop-blur-sm flex items-center justify-center rounded-lg">
                  <span className="w-8 h-8 border-4 border-blue-500/30 border-t-blue-600 rounded-full animate-spin"></span>
                </div>
              )}


              <div className="flex flex-col gap-3">
                {/* Emp Code */}
                <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-3">
                  <label className="w-full sm:w-1/3 shrink-0 text-sm font-medium text-slate-700 dark:text-slate-300">Emp Code *</label>
                  <div className="w-full sm:w-2/3">
                    <input
                      type="text"
                      name="empCode"
                      value={formData.empCode}
                      onChange={handleChange}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          fetchUserDetails(formData.empCode);
                        }
                      }}
                      required
                      className="w-full px-3 py-1.5 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 uppercase h-[36px]"
                    />
                  </div>
                </div>

                {/* Emp Name */}
                <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-3">
                  <label className="w-full sm:w-1/3 shrink-0 text-sm font-medium text-slate-700 dark:text-slate-300">Emp Name</label>
                  <div className="w-full sm:w-2/3">
                    <input
                      type="text"
                      name="empName"
                      value={formData.empName}
                      readOnly
                      className="w-full px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-600 bg-slate-50 dark:bg-slate-800/50 text-slate-500 dark:text-slate-400 cursor-not-allowed h-[36px]"
                    />
                  </div>
                </div>

                {/* Department */}
                <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-3">
                  <label className="w-full sm:w-1/3 shrink-0 text-sm font-medium text-slate-700 dark:text-slate-300">Department</label>
                  <div className="w-full sm:w-2/3">
                    <input
                      type="text"
                      name="department"
                      value={formData.department}
                      readOnly
                      className="w-full px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-600 bg-slate-50 dark:bg-slate-800/50 text-slate-500 dark:text-slate-400 cursor-not-allowed truncate h-[36px]"
                    />
                  </div>
                </div>

                {/* Manager */}
                <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-3">
                  <label className="w-full sm:w-1/3 shrink-0 text-sm font-medium text-slate-700 dark:text-slate-300">Manager</label>
                  <div className="w-full sm:w-2/3">
                    <input
                      type="text"
                      name="manager"
                      value={formData.manager}
                      readOnly
                      className="w-full px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-600 bg-slate-50 dark:bg-slate-800/50 text-slate-500 dark:text-slate-400 cursor-not-allowed truncate h-[36px]"
                    />
                  </div>
                </div>

                {/* Floor */}
                <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-3">
                  <label className="w-full sm:w-1/3 shrink-0 text-sm font-medium text-slate-700 dark:text-slate-300">Floor *</label>
                  <div className="w-full sm:w-2/3">
                    <Select
                      options={floors}
                      value={floors.find(f => f.value === formData.floor) || null}
                      onChange={(option: any) => setFormData({ ...formData, floor: option?.value || '', authorizedPerson: '' })}
                      placeholder="Select Floor..."
                      isClearable
                      isSearchable
                      unstyled
                      classNames={customSelectClassNames}
                    />
                  </div>
                </div>

                {/* Auth Person */}
                <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-3">
                  <label className="w-full sm:w-1/3 shrink-0 text-sm font-medium text-slate-700 dark:text-slate-300">Authorised Person *</label>
                  <div className="w-full sm:w-2/3">
                    <Select
                      options={authorizedPersons
                        .filter(p => p.floor === formData.floor)
                        .map(p => ({
                          value: p.authorised_emp_id || p.emp_code || p.id,
                          label: p.auth_emp || (p.emp_code + ' - ' + p.emp_name)
                        }))}
                      value={formData.authorizedPerson ? {
                        value: formData.authorizedPerson,
                        label: authorizedPersons.find(p => (p.authorised_emp_id || p.emp_code || p.id) === formData.authorizedPerson)?.auth_emp || formData.authorizedPerson
                      } : null}
                      onChange={(option: any) => setFormData({ ...formData, authorizedPerson: option?.value || '' })}
                      isDisabled={!formData.floor}
                      placeholder="Select Person..."
                      isClearable
                      isSearchable
                      unstyled
                      classNames={customSelectClassNames}
                    />
                  </div>
                </div>

                {/* Reason Category */}
                <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-3">
                  <label className="w-full sm:w-1/3 shrink-0 text-sm font-medium text-slate-700 dark:text-slate-300">Reason Category *</label>
                  <div className="w-full sm:w-2/3">
                    <Select
                      options={reasons.map(r => ({
                        value: r.category || r.CATEGORY || r,
                        label: r.category || r.CATEGORY || r
                      }))}
                      value={formData.reasonCategory ? { value: formData.reasonCategory, label: formData.reasonCategory } : null}
                      onChange={(option: any) => setFormData({ ...formData, reasonCategory: option?.value || '' })}
                      placeholder="Select Category..."
                      isClearable
                      isSearchable
                      unstyled
                      classNames={customSelectClassNames}
                    />
                  </div>
                </div>

                {/* Reason */}
                <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-3">
                  <label className="w-full sm:w-1/3 shrink-0 text-sm font-medium text-slate-700 dark:text-slate-300">Reason *</label>
                  <div className="w-full sm:w-2/3">
                    <input
                      type="text"
                      name="reason"
                      value={formData.reason}
                      onChange={handleChange}
                      required
                      className="w-full px-3 py-1.5 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 h-[36px]"
                    />
                  </div>
                </div>

                {/* Belongings */}
                <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-3">
                  <label className="w-full sm:w-1/3 shrink-0 text-sm font-medium text-slate-700 dark:text-slate-300">Belongings</label>
                  <div className="w-full sm:w-2/3">
                    <input
                      type="text"
                      name="belongings"
                      value={formData.belongings}
                      onChange={handleChange}
                      className="w-full px-3 py-1.5 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 h-[36px]"
                    />
                  </div>
                </div>
                {/* Date & Out Time */}
                <div className="flex flex-col sm:flex-row gap-3">
                  {/* Date */}
                  <div className="flex-1 flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-3">
                    <label className="w-full sm:w-1/3 shrink-0 text-sm font-medium text-slate-700 dark:text-slate-300">Date</label>
                    <div className="w-full sm:w-2/3 px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-600 bg-slate-50 dark:bg-slate-800/50 text-slate-500 dark:text-slate-400 cursor-not-allowed h-[36px] flex items-center">
                      {format(new Date(formData.passDate), 'dd-MMM-yyyy')}
                    </div>
                  </div>
                  {/* Out Time */}
                  <div className="flex-1 flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-3">
                    <label className="w-full sm:w-1/3 shrink-0 text-sm font-medium text-slate-700 dark:text-slate-300">Out Time *</label>
                    <div className="w-full sm:w-2/3">
                      <input
                        type="time"
                        name="outTime"
                        value={formData.outTime}
                        onChange={handleChange}
                        required
                        className="w-full px-3 py-1.5 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 h-[36px] dark:[color-scheme:dark]"
                      />
                    </div>
                  </div>
                </div>
                {/* Submit Button Row */}
                {isLimitExceeded && (
                  <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-3">
                    <div className="w-full text-red-500 text-xs font-medium bg-red-50 dark:bg-red-900/20 p-2 rounded border border-red-100 dark:border-red-900/30">
                      Maximum pass limit reached. You cannot apply for a new request.
                    </div>
                  </div>
                )}
                <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-3 pt-1">
                  <div className="w-full sm:w-1/2 flex items-center gap-3">
                    <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Return</label>
                    <div className="h-[36px] flex items-center">
                      <button
                        type="button"
                        onClick={() => setFormData({ ...formData, isReturn: !formData.isReturn })}
                        className={`relative inline-flex h-5 w-10 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 dark:focus:ring-offset-slate-900 ${formData.isReturn ? 'bg-blue-600' : 'bg-slate-200 dark:bg-slate-700'}`}
                      >
                        <span className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white transition-transform ${formData.isReturn ? 'translate-x-5' : 'translate-x-1'}`} />
                      </button>
                      <span className="ml-2 text-sm font-medium text-slate-700 dark:text-slate-300">
                        {formData.isReturn ? 'Yes' : 'No'}
                      </span>
                    </div>
                  </div>
                  <div className="w-full sm:w-1/2">
                    <button type="submit" disabled={loading || isLimitExceeded} className="w-full bg-blue-600 hover:bg-blue-700 text-white text-sm font-bold rounded-lg shadow-sm transition-colors disabled:opacity-50 h-[36px]">
                      {loading ? 'SUBMITTING...' : 'SUBMIT'}
                    </button>
                  </div>
                </div>
              </div>
            </form>
          </div>

          {/* Right: Pass Details */}
          <div id="pass-details-table" className="lg:col-span-8 bg-white dark:bg-[#1e293b] rounded-xl shadow-sm border border-slate-200 dark:border-slate-800 p-6 flex flex-col min-h-0">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-4 border-b border-slate-100 dark:border-slate-800 pb-2 shrink-0 gap-4">

              <div className="flex items-center gap-4">
                <h3 className="text-lg font-bold text-slate-800 dark:text-white">My Exit Pass Details</h3>
                {/* Enable/Disable Toggle */}
                <div className="flex items-center gap-2 border-l border-slate-200 dark:border-slate-700 pl-4">
                  <button
                    type="button"
                    onClick={handleToggleReport}
                    className={`relative inline-flex h-5 w-10 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 dark:focus:ring-offset-slate-900 ${isReportEnabled ? 'bg-blue-600' : 'bg-slate-200 dark:bg-slate-700'}`}
                  >
                    <span className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white transition-transform ${isReportEnabled ? 'translate-x-5' : 'translate-x-1'}`} />
                  </button>
                </div>
              </div>

              <div className="flex items-center gap-4">
                {/* Date Input */}
                <input
                  type="date"
                  value={filterDate}
                  onChange={(e) => setFilterDate(e.target.value)}
                  disabled={!isReportEnabled}
                  className="px-2 py-1.5 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 text-sm h-[32px] dark:[color-scheme:dark] disabled:opacity-50 disabled:cursor-not-allowed w-[140px]"
                />
              </div>

            </div>
            {!isReportEnabled ? (
              <div className="flex-grow flex items-center justify-center">
                <p className="text-slate-400 dark:text-slate-500 text-center italic">Enable "Show Data" to view exit pass history.</p>
              </div>
            ) : hasPass && displayedPasses.length > 0 ? (
              <div className="flex flex-col flex-grow overflow-hidden min-h-0">
                <div className="overflow-auto border border-slate-200 dark:border-slate-700 rounded-lg flex-grow min-h-0">
                  <table className="w-full text-left text-sm text-slate-600 dark:text-slate-300 min-w-max relative">
                    <thead className="bg-slate-50 dark:bg-[#1e293b] border-b border-slate-200 dark:border-slate-700 sticky top-0 z-10 shadow-[0_1px_2px_rgba(0,0,0,0.1)]">
                      <tr>
                        <th className="py-3 px-4 font-medium text-slate-700 dark:text-slate-200 border-x border-slate-200 dark:border-slate-700">Date</th>
                        <th className="py-3 px-4 font-medium text-slate-700 dark:text-slate-200 border-x border-slate-200 dark:border-slate-700">Time</th>
                        <th className="py-3 px-4 font-medium text-slate-700 dark:text-slate-200 border-x border-slate-200 dark:border-slate-700">Category</th>
                        <th className="py-3 px-4 font-medium text-slate-700 dark:text-slate-200 border-x border-slate-200 dark:border-slate-700">Reason</th>
                        <th className="py-3 px-4 font-medium text-slate-700 dark:text-slate-200 border-x border-slate-200 dark:border-slate-700">Auth Person</th>
                        <th className="py-3 px-4 font-medium text-slate-700 dark:text-slate-200 border-x border-slate-200 dark:border-slate-700">Auth Reason</th>
                        <th className="py-3 px-4 font-medium text-slate-700 dark:text-slate-200 border-x border-slate-200 dark:border-slate-700">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
                      {displayedPasses.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage).map((pass, idx) => (
                        <tr key={idx} className="hover:bg-slate-50 dark:hover:bg-slate-800/30">
                          <td className="py-3 px-4 border-x border-slate-200 dark:border-slate-700">{pass.gp_date ? format(new Date(pass.gp_date), 'dd-MMM-yyyy') : '-'}</td>
                          <td className="py-3 px-4 border-x border-slate-200 dark:border-slate-700">
                            {pass.gp_fr_time ? format(new Date(pass.gp_fr_time), 'HH:mm') : '-'}
                          </td>
                          <td className="py-3 px-4 border-x border-slate-200 dark:border-slate-700">
                            <div><span className="font-medium text-slate-800 dark:text-slate-200">{pass.reason_category || '-'}</span></div>
                          </td>
                          <td className="py-3 px-4 border-x border-slate-200 dark:border-slate-700">
                            <div className="text-xs text-slate-500 truncate max-w-[150px]" title={pass.reason}>{pass.reason || '-'}</div>
                          </td>
                          <td className="py-3 px-4 border-x border-slate-200 dark:border-slate-700">{pass.approver_by || '-'}</td>
                          <td className="py-3 px-4 border-x border-slate-200 dark:border-slate-700">
                            <div className="text-xs text-slate-500 truncate max-w-[150px]" title={pass.rejection_reason}>{pass.rejection_reason || '-'}</div>
                          </td>
                          <td className="py-3 px-4 border-x border-slate-200 dark:border-slate-700">
                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold ${pass.approval_status === 'C' ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' :
                              pass.approval_status === 'R' ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400' :
                                pass.approval_status === 'B' ? 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400' :
                                  'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400'
                              }`}>
                              {pass.approval_status === 'C' ? 'Complete' : pass.approval_status === 'R' ? 'Rejected' : pass.approval_status === 'B' ? 'Return' : 'Pending'}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Pagination Controls */}
                <div className="flex items-center justify-between pt-4 mt-auto shrink-0 border-t border-slate-100 dark:border-slate-800">
                  <span className="text-sm text-slate-500 dark:text-slate-400">
                    Showing {(currentPage - 1) * itemsPerPage + (displayedPasses.length > 0 ? 1 : 0)} to {Math.min(currentPage * itemsPerPage, displayedPasses.length)} of {displayedPasses.length} entries
                  </span>
                  <div className="flex gap-2">
                    <button
                      onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                      disabled={currentPage === 1}
                      className="px-3 py-1 border border-slate-200 dark:border-slate-700 rounded-lg text-sm disabled:opacity-50 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors dark:text-slate-300"
                    >
                      Prev
                    </button>
                    <button
                      onClick={() => setCurrentPage(prev => Math.min(prev + 1, Math.ceil(displayedPasses.length / itemsPerPage)))}
                      disabled={currentPage === Math.ceil(displayedPasses.length / itemsPerPage) || displayedPasses.length === 0}
                      className="px-3 py-1 border border-slate-200 dark:border-slate-700 rounded-lg text-sm disabled:opacity-50 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors dark:text-slate-300"
                    >
                      Next
                    </button>
                  </div>
                </div>
              </div>
            ) : (
              <div className="flex-grow flex items-center justify-center">
                <p className="text-slate-400 dark:text-slate-500 text-center italic">No exit passes found.</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ExitPass;
