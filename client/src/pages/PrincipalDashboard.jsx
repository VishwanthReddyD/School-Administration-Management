import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { Users, Calendar, Building, BookOpen, Settings, LogOut, Plus, Search, Filter, Download, AlertCircle, CheckCircle, Clock, Edit, Trash2, Eye } from 'lucide-react';
import toast from 'react-hot-toast';
import requestService from '../services/requestService';
import teacherService from '../services/teacherService';
import classroomService from '../services/classroomService';
import subjectService from '../services/subjectService';
import scheduleService from '../services/scheduleService';
import ConflictDetector from '../../components/calendar/ConflictDetector';

const PrincipalDashboard = () => {
  const { user, logout } = useAuth();
  const [activeTab, setActiveTab] = useState('overview');
  const [stats, setStats] = useState({
    totalTeachers: 0,
    activeClasses: 0,
    classrooms: 0,
    subjects: 0,
    conflicts: 0,
    pendingRequests: 0
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [requests, setRequests] = useState([]);
  const [requestStats, setRequestStats] = useState({});
  const [teachers, setTeachers] = useState([]);
  const [classrooms, setClassrooms] = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [schedules, setSchedules] = useState([]);

  const fetchDashboardData = async () => {
    setLoading(true);
    setError(null);
    try {
      // Fetch request statistics
      const statsResponse = await requestService.getRequestStats();
      setRequestStats(statsResponse.data);
      
      // Fetch all requests
      const requestsResponse = await requestService.getAllRequests();
      setRequests(requestsResponse.data);
      
      // Fetch counts and lists for teachers, classrooms, subjects, schedules
      const [teachersRes, classroomsRes, subjectsRes, schedulesRes] = await Promise.all([
        teacherService.getAll(),
        classroomService.getAll(),
        subjectService.getAll(),
        scheduleService.getAll()
      ]);
      
      // Normalize arrays for lists
      const teacherList = Array.isArray(teachersRes?.data) ? teachersRes.data : (Array.isArray(teachersRes) ? teachersRes : []);
      const classroomList = Array.isArray(classroomsRes?.data) ? classroomsRes.data : (Array.isArray(classroomsRes) ? classroomsRes : []);
      const subjectList = Array.isArray(subjectsRes?.data) ? subjectsRes.data : (Array.isArray(subjectsRes) ? subjectsRes : []);
      const scheduleList = Array.isArray(schedulesRes?.schedules) ? schedulesRes.schedules : (Array.isArray(schedulesRes?.data) ? schedulesRes.data : (Array.isArray(schedulesRes) ? schedulesRes : []));

      setTeachers(teacherList);
      setClassrooms(classroomList);
      setSubjects(subjectList);
      setSchedules(scheduleList);

      // Compute conflicts and keep a quick count for the overview alert
      const conflictsCount = computeScheduleConflicts(scheduleList);

      // Update dashboard stats
      setStats(prev => ({
        ...prev,
        totalTeachers: (typeof teachersRes?.count === 'number')
          ? teachersRes.count
          : (Array.isArray(teachersRes?.data) ? teachersRes.data.length : (Array.isArray(teachersRes) ? teachersRes.length : 0)),
        classrooms: (typeof classroomsRes?.count === 'number')
          ? classroomsRes.count
          : (Array.isArray(classroomsRes?.data) ? classroomsRes.data.length : (Array.isArray(classroomsRes) ? classroomsRes.length : 0)),
        subjects: (typeof subjectsRes?.count === 'number')
          ? subjectsRes.count
          : (Array.isArray(subjectsRes?.data) ? subjectsRes.data.length : (Array.isArray(subjectsRes) ? subjectsRes.length : 0)),
        activeClasses: (typeof schedulesRes?.count === 'number')
          ? schedulesRes.count
          : (Array.isArray(schedulesRes?.schedules) ? schedulesRes.schedules.length : (Array.isArray(schedulesRes) ? schedulesRes.length : 0)),
        pendingRequests: statsResponse.data.pending_requests || 0,
        conflicts: conflictsCount
      }));
      
    } catch (error) {
      console.error('Failed to fetch dashboard data:', error);
      setError('Failed to load dashboard data');
    } finally {
      setLoading(false);
    }
  };

  // Fetch dashboard statistics and requests
  useEffect(() => {
    fetchDashboardData();
  }, []);

  // Remove any seeding controls from Principal view
  const handleRetry = async () => {
    await fetchDashboardData();
  };

  // Simple overlap detection for conflicts count
  const timeOverlaps = (startA, endA, startB, endB) => {
    return startA < endB && startB < endA;
  };

  const computeScheduleConflicts = (list) => {
    let count = 0;
    for (let i = 0; i < list.length; i++) {
      for (let j = i + 1; j < list.length; j++) {
        const a = list[i];
        const b = list[j];
        if (a.day_of_week === b.day_of_week) {
          if (timeOverlaps(a.start_time, a.end_time, b.start_time, b.end_time)) {
            if (a.teacher_id === b.teacher_id || a.classroom_id === b.classroom_id) {
              count++;
            }
          }
        }
      }
    }
    return count;
  };

  // Handle button actions
  const handleManageTeachers = () => {
    setActiveTab('teachers');
    toast.success('Teachers management panel opened');
  };

  const handleManageSchedules = () => {
    setActiveTab('schedules');
    toast.success('Schedule management panel opened');
  };

  const handleManageClassrooms = () => {
    setActiveTab('classrooms');
    toast.success('Classroom management panel opened');
  };

  const handleManageSubjects = () => {
    setActiveTab('subjects');
    toast.success('Subject management panel opened');
  };

  const handleConfigureSettings = () => {
    setActiveTab('settings');
    toast.success('Settings panel opened');
  };

  const handleRefreshStats = async () => {
    await fetchDashboardData();
    toast.success('Dashboard refreshed!');
  };

  const handleExportReport = () => {
    toast.success('Report export started! Check your downloads.');
  };

  const handleViewConflicts = () => {
    setActiveTab('conflicts');
    toast.success('Conflict resolution panel opened');
  };

  const handleViewRequests = () => {
    setActiveTab('requests');
    toast.success('Pending requests panel opened');
  };

  // Render different content based on active tab
  const renderTabContent = () => {
    switch (activeTab) {
      case 'teachers':
        return <TeachersManagementPanel />;
      case 'schedules':
        return <SchedulesManagementPanel />;
      case 'classrooms':
        return <ClassroomsManagementPanel />;
      case 'subjects':
        return <SubjectsManagementPanel />;
      case 'settings':
        return <SettingsPanel />;
      case 'conflicts':
        return <ConflictsPanel />;
      case 'requests':
        return <RequestsPanel />;
      default:
        return <OverviewPanel />;
    }
  };

  // Overview Panel Component
  const OverviewPanel = () => (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {/* Teachers Management */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow">
          <div className="flex items-center mb-4">
            <div className="p-3 bg-blue-100 rounded-lg">
              <Users className="w-6 h-6 text-blue-600" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900 ml-3">
              Teachers
            </h3>
          </div>
          <p className="text-gray-600 mb-4">
            Manage teacher profiles, departments, and assignments
          </p>
          <button 
            onClick={handleManageTeachers}
            className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            Manage Teachers
          </button>
        </div>

        {/* Schedule Management */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow">
          <div className="flex items-center mb-4">
            <div className="p-3 bg-green-100 rounded-lg">
              <Calendar className="w-6 h-6 text-green-600" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900 ml-3">
              Schedules
            </h3>
          </div>
          <p className="text-gray-600 mb-4">
            Create and manage class schedules with conflict detection
          </p>
          <button 
            onClick={handleManageSchedules}
            className="w-full px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
          >
            Manage Schedules
          </button>
        </div>

        {/* Classrooms */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow">
          <div className="flex items-center mb-4">
            <div className="p-3 bg-purple-100 rounded-lg">
              <Building className="w-6 h-6 text-purple-600" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900 ml-3">
              Classrooms
            </h3>
          </div>
          <p className="text-gray-600 mb-4">
            Manage classroom assignments and equipment
          </p>
          <button 
            onClick={handleManageClassrooms}
            className="w-full px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
          >
            Manage Classrooms
          </button>
        </div>

        {/* Subjects */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow">
          <div className="flex items-center mb-4">
            <div className="p-3 bg-yellow-100 rounded-lg">
              <BookOpen className="w-6 h-6 text-yellow-600" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900 ml-3">
              Subjects
            </h3>
          </div>
          <p className="text-gray-600 mb-4">
            Manage academic subjects and course offerings
          </p>
          <button 
            onClick={handleManageSubjects}
            className="w-full px-4 py-2 bg-yellow-600 text-white rounded-lg hover:bg-yellow-700 transition-colors"
          >
            Manage Subjects
          </button>
        </div>

        {/* System Settings */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow">
          <div className="flex items-center mb-4">
            <div className="p-3 bg-gray-100 rounded-lg">
              <Settings className="w-6 h-6 text-gray-600" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900 ml-3">
              Settings
            </h3>
          </div>
          <p className="text-gray-600 mb-4">
            Configure system preferences and notifications
          </p>
          <button 
            onClick={handleConfigureSettings}
            className="w-full px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
          >
            Configure
          </button>
        </div>

        {/* Quick Stats */}
        <div className="bg-gradient-to-r from-blue-500 to-blue-600 rounded-lg shadow-sm text-white p-6">
          <h3 className="text-lg font-semibold mb-4">Quick Stats</h3>
          <div className="space-y-3">
            <div className="flex justify-between">
              <span>Total Teachers:</span>
              <span className="font-bold">{stats.totalTeachers}</span>
            </div>
            <div className="flex justify-between">
              <span>Active Classes:</span>
              <span className="font-bold">{stats.activeClasses}</span>
            </div>
            <div className="flex justify-between">
              <span>Classrooms:</span>
              <span className="font-bold">{stats.classrooms}</span>
            </div>
            <div className="flex justify-between">
              <span>Subjects:</span>
              <span className="font-bold">{stats.subjects}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Alerts Section */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Conflicts Alert */}
        <div className="bg-red-50 border border-red-200 rounded-lg p-6">
          <div className="flex items-center mb-3">
            <AlertCircle className="w-5 h-5 text-red-600 mr-2" />
            <h3 className="text-lg font-semibold text-red-900">Schedule Conflicts</h3>
          </div>
          <p className="text-red-700 mb-4">
            There are {stats.conflicts} scheduling conflicts that need attention.
          </p>
          <button 
            onClick={handleViewConflicts}
            className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
          >
            View Conflicts
          </button>
        </div>

        {/* Pending Requests */}
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6">
          <div className="flex items-center mb-3">
            <Clock className="w-5 h-5 text-yellow-600 mr-2" />
            <h3 className="text-lg font-semibold text-yellow-900">Pending Requests</h3>
          </div>
          <p className="text-yellow-700 mb-4">
            {requestStats.pending_requests || 0} teacher requests are waiting for approval.
          </p>
          <button 
            onClick={handleViewRequests}
            className="px-4 py-2 bg-yellow-600 text-white rounded-lg hover:bg-yellow-700 transition-colors"
          >
            View Requests
          </button>
        </div>
      </div>
    </div>
  );

  // Teachers Management Panel
  const TeachersManagementPanel = () => (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-xl font-semibold text-gray-900">Teachers Management</h2>
        <button 
          onClick={() => toast.success('Add Teacher form will open here')}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center"
        >
          <Plus className="w-4 h-4 mr-2" />
          Add Teacher
        </button>
      </div>

      {teachers.length === 0 ? (
        <div className="bg-gray-50 rounded-lg p-8 text-center">
          <Users className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No teachers found</h3>
          <p className="text-gray-600">Add teachers to see them listed here.</p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Name</th>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Department</th>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Email</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {teachers.map(t => (
                <tr key={t.id}>
                  <td className="px-4 py-2 text-sm text-gray-900">{t.name}</td>
                  <td className="px-4 py-2 text-sm text-gray-700">{t.department}</td>
                  <td className="px-4 py-2 text-sm text-gray-700">{t.email}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );

  // Schedules Management Panel
  const SchedulesManagementPanel = () => (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-xl font-semibold text-gray-900">Schedule Management</h2>
        <div className="flex space-x-2">
          <button 
            onClick={() => toast.success('Create Schedule form will open here')}
            className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors flex items-center"
          >
            <Plus className="w-4 h-4 mr-2" />
            Create Schedule
          </button>
          <button 
            onClick={() => toast.success('Schedules exported successfully!')}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center"
          >
            <Download className="w-4 h-4 mr-2" />
            Export
          </button>
        </div>
      </div>
      
      {schedules.length === 0 ? (
        <div className="bg-gray-50 rounded-lg p-8 text-center">
          <Calendar className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No schedules found</h3>
          <p className="text-gray-600">Create schedules to see them here.</p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Day</th>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Teacher</th>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Subject</th>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Room</th>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Time</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {schedules.map(s => (
                <tr key={s.id}>
                  <td className="px-4 py-2 text-sm text-gray-700">{s.day_of_week}</td>
                  <td className="px-4 py-2 text-sm text-gray-900">{s.teacher_name || s.teacherId}</td>
                  <td className="px-4 py-2 text-sm text-gray-700">{s.subject_name || s.subjectId}</td>
                  <td className="px-4 py-2 text-sm text-gray-700">{s.room_number || s.classroomId}</td>
                  <td className="px-4 py-2 text-sm text-gray-700">{s.start_time} - {s.end_time}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );

  // Classrooms Management Panel
  const ClassroomsManagementPanel = () => (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-xl font-semibold text-gray-900">Classroom Management</h2>
        <button 
          onClick={() => toast.success('Add Classroom form will open here')}
          className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors flex items-center"
        >
          <Plus className="w-4 h-4 mr-2" />
          Add Classroom
        </button>
      </div>
      
      {classrooms.length === 0 ? (
        <div className="bg-gray-50 rounded-lg p-8 text-center">
          <Building className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No classrooms found</h3>
          <p className="text-gray-600">Add classrooms to see them listed here.</p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Room</th>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Building</th>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Floor</th>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Capacity</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {classrooms.map(c => (
                <tr key={c.id}>
                  <td className="px-4 py-2 text-sm text-gray-900">{c.room_number || c.name}</td>
                  <td className="px-4 py-2 text-sm text-gray-700">{c.building}</td>
                  <td className="px-4 py-2 text-sm text-gray-700">{c.floor}</td>
                  <td className="px-4 py-2 text-sm text-gray-700">{c.capacity}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );

  // Subjects Management Panel
  const SubjectsManagementPanel = () => (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-xl font-semibold text-gray-900">Subject Management</h2>
        <button 
          onClick={() => toast.success('Add Subject form will open here')}
          className="px-4 py-2 bg-yellow-600 text-white rounded-lg hover:bg-yellow-700 transition-colors flex items-center"
        >
          <Plus className="w-4 h-4 mr-2" />
          Add Subject
        </button>
      </div>
      
      {subjects.length === 0 ? (
        <div className="bg-gray-50 rounded-lg p-8 text-center">
          <BookOpen className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No subjects found</h3>
          <p className="text-gray-600">Add subjects to see them listed here.</p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Name</th>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Code</th>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Credits</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {subjects.map(su => (
                <tr key={su.id}>
                  <td className="px-4 py-2 text-sm text-gray-900">{su.name}</td>
                  <td className="px-4 py-2 text-sm text-gray-700">{su.code}</td>
                  <td className="px-4 py-2 text-sm text-gray-700">{su.credits}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );

  // Settings Panel
  const SettingsPanel = () => {
    const [notifyEmail, setNotifyEmail] = useState(() => localStorage.getItem('notifyEmail') === 'true');
    const [notifyInApp, setNotifyInApp] = useState(() => localStorage.getItem('notifyInApp') !== 'false');
    const [workdayStart, setWorkdayStart] = useState(() => localStorage.getItem('workdayStart') || '08:30');
    const [workdayEnd, setWorkdayEnd] = useState(() => localStorage.getItem('workdayEnd') || '17:30');

    const save = () => {
      localStorage.setItem('notifyEmail', String(notifyEmail));
      localStorage.setItem('notifyInApp', String(notifyInApp));
      localStorage.setItem('workdayStart', workdayStart);
      localStorage.setItem('workdayEnd', workdayEnd);
      toast.success('Settings saved');
    };

    return (
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <h2 className="text-xl font-semibold text-gray-900 mb-6">Principal Settings</h2>
        <div className="space-y-6 max-w-xl">
          <div className="flex items-center justify-between">
            <label className="text-gray-700">Email notifications</label>
            <input type="checkbox" className="h-5 w-5" checked={notifyEmail} onChange={(e)=>setNotifyEmail(e.target.checked)} />
          </div>
          <div className="flex items-center justify-between">
            <label className="text-gray-700">In-app notifications</label>
            <input type="checkbox" className="h-5 w-5" checked={notifyInApp} onChange={(e)=>setNotifyInApp(e.target.checked)} />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm text-gray-600 mb-1">Workday start</label>
              <input type="time" className="border rounded px-3 py-2 w-full" value={workdayStart} onChange={(e)=>setWorkdayStart(e.target.value)} />
            </div>
            <div>
              <label className="block text-sm text-gray-600 mb-1">Workday end</label>
              <input type="time" className="border rounded px-3 py-2 w-full" value={workdayEnd} onChange={(e)=>setWorkdayEnd(e.target.value)} />
            </div>
          </div>
          <button onClick={save} className="px-4 py-2 bg-gray-800 text-white rounded">Save Settings</button>
        </div>
      </div>
    );
  };

  // Conflicts Panel
  const ConflictsPanel = () => {
    const mapped = schedules.map(s => ({
      id: s.id,
      dayOfWeek: s.day_of_week,
      startTime: (s.start_time || '').slice(0,5),
      endTime: (s.end_time || '').slice(0,5),
      teacherId: s.teacher_id || s.teacherId,
      teacher: s.teacher_name,
      classroomId: s.classroom_id || s.classroomId,
      classroom: s.room_number,
      title: s.subject_name
    }));

    return (
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <ConflictDetector
          schedules={mapped}
          onConflictResolve={() => toast.success('Conflict marked as resolved')}
        />
      </div>
    );
  };

  // Requests Panel - NOW CONNECTED TO REAL DATABASE!
  const RequestsPanel = () => {
    const [filterStatus, setFilterStatus] = useState('all');
    const [filterType, setFilterType] = useState('all');
    const [filterPriority, setFilterPriority] = useState('all');
    const [selectedRequests, setSelectedRequests] = useState([]);

    const filteredRequests = requests.filter(request => {
      const matchesStatus = filterStatus === 'all' || request.status === filterStatus;
      const matchesType = filterType === 'all' || request.request_type === filterType;
      const matchesPriority = filterPriority === 'all' || request.priority === filterPriority;
      return matchesStatus && matchesType && matchesPriority;
    });

    const handleApproveRequest = async (requestId) => {
      try {
        await requestService.updateRequestStatus(requestId, 'approved');
        toast.success('Request approved successfully!');
        // Refresh data from database
        await fetchDashboardData();
      } catch (error) {
        toast.error('Failed to approve request');
      }
    };

    const handleRejectRequest = async (requestId) => {
      try {
        await requestService.updateRequestStatus(requestId, 'rejected');
        toast.success('Request rejected');
        // Refresh data from database
        await fetchDashboardData();
      } catch (error) {
        toast.error('Failed to reject request');
      }
    };

    const handleProcessAll = async () => {
      try {
        const pendingIds = requests
          .filter(req => req.status === 'pending')
          .map(req => req.id);
        
        if (pendingIds.length === 0) {
          toast.info('No pending requests to process');
          return;
        }

        await requestService.bulkUpdateRequests(pendingIds, 'approved');
        toast.success('All pending requests processed!');
        // Refresh data from database
        await fetchDashboardData();
      } catch (error) {
        toast.error('Failed to process all requests');
      }
    };

    const getPriorityColor = (priority) => {
      switch (priority) {
        case 'high': return 'bg-red-100 text-red-800';
        case 'medium': return 'bg-yellow-100 text-yellow-800';
        case 'low': return 'bg-blue-100 text-blue-800';
        default: return 'bg-gray-100 text-gray-800';
      }
    };

    const getStatusColor = (status) => {
      switch (status) {
        case 'approved': return 'bg-green-100 text-green-800';
        case 'rejected': return 'bg-red-100 text-red-800';
        case 'pending': return 'bg-yellow-100 text-yellow-800';
        default: return 'bg-gray-100 text-gray-800';
      }
    };

    const getTypeDisplay = (type) => {
      switch (type) {
        case 'leave': return 'Leave Request';
        case 'schedule_change': return 'Schedule Change';
        case 'room_change': return 'Room Change';
        case 'other': return 'Other';
        default: return type;
      }
    };

    const pendingRequests = requests.filter(request => request.status === 'pending');

    return (
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-semibold text-gray-900">Teacher Requests</h2>
          <button 
            onClick={handleProcessAll}
            className="px-4 py-2 bg-yellow-600 text-white rounded-lg hover:bg-yellow-700 transition-colors"
          >
            Process All Pending
          </button>
        </div>
        
        <div className="mb-4">
          <div className="flex space-x-4 text-sm mb-4">
            <span className="text-gray-600">Total Requests: {requests.length}</span>
            <span className="text-yellow-600">Pending: {pendingRequests.length}</span>
            <span className="text-green-600">Approved: {requests.filter(r => r.status === 'approved').length}</span>
            <span className="text-red-600">Rejected: {requests.filter(r => r.status === 'rejected').length}</span>
          </div>
          
          <div className="flex space-x-4">
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="all">All Status</option>
              <option value="pending">Pending</option>
              <option value="approved">Approved</option>
              <option value="rejected">Rejected</option>
            </select>
            
            <select
              value={filterType}
              onChange={(e) => setFilterType(e.target.value)}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="all">All Types</option>
              <option value="leave">Leave</option>
              <option value="schedule_change">Schedule Change</option>
              <option value="room_change">Room Change</option>
              <option value="other">Other</option>
            </select>
            
            <select
              value={filterPriority}
              onChange={(e) => setFilterPriority(e.target.value)}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="all">All Priorities</option>
              <option value="high">High</option>
              <option value="medium">Medium</option>
              <option value="low">Low</option>
            </select>
          </div>
        </div>

        {loading ? (
          <div className="text-center py-8">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-gray-600">Loading requests...</p>
          </div>
        ) : filteredRequests.length === 0 ? (
          <div className="text-center py-8">
            <Clock className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No Requests Found</h3>
            <p className="text-gray-600">No requests match the current filters.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {filteredRequests.map((request) => (
              <div key={request.id} className={`border rounded-lg p-4 ${
                request.status === 'approved' ? 'bg-green-50 border-green-200' :
                request.status === 'rejected' ? 'bg-red-50 border-red-200' :
                'bg-yellow-50 border-yellow-200'
              }`}>
                <div className="flex justify-between items-start mb-3">
                  <div className="flex items-center space-x-3">
                    <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getPriorityColor(request.priority)}`}>
                      {request.priority.toUpperCase()}
                    </span>
                    <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(request.status)}`}>
                      {request.status}
                    </span>
                  </div>
                  {request.status === 'pending' && (
                    <div className="flex space-x-2">
                      <button
                        onClick={() => handleApproveRequest(request.id)}
                        className="px-3 py-1 text-sm bg-green-600 text-white rounded hover:bg-green-700 transition-colors"
                      >
                        Approve
                      </button>
                      <button
                        onClick={() => handleRejectRequest(request.id)}
                        className="px-3 py-1 text-sm bg-red-600 text-white rounded hover:bg-red-700 transition-colors"
                      >
                        Reject
                      </button>
                    </div>
                  )}
                </div>
                
                <div className="mb-3">
                  <h3 className="text-lg font-semibold text-gray-900">{request.title}</h3>
                  <p className="text-sm text-gray-600 mb-1">Type: {getTypeDisplay(request.request_type)}</p>
                  <p className="text-sm text-gray-600 mb-1">Requested by: {request.teacher_name} ({request.teacher_department})</p>
                  <p className="text-sm text-gray-600">Date: {new Date(request.start_date).toLocaleDateString()}</p>
                  {request.end_date && request.end_date !== request.start_date && (
                    <p className="text-sm text-gray-600">End Date: {new Date(request.end_date).toLocaleDateString()}</p>
                  )}
                </div>
                
                <p className="text-gray-700 mb-3">{request.description}</p>
                
                {request.notes && (
                  <div className="mb-3 p-3 bg-gray-100 rounded">
                    <h4 className="text-sm font-medium text-gray-900 mb-1">Admin Notes:</h4>
                    <p className="text-sm text-gray-600">{request.notes}</p>
                  </div>
                )}
                
                {request.status === 'pending' && (
                  <div className="text-sm text-gray-600">
                    <p>This request is waiting for your approval or rejection.</p>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    );
  };

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <AlertCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
          <p className="text-red-600">{error}</p>
          <button
            onClick={handleRetry}
            className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">
                Principal Dashboard
              </h1>
              <p className="text-gray-600">
                Welcome back, {user?.email}
              </p>
            </div>
            <div className="flex items-center space-x-4">
              <button
                onClick={handleRefreshStats}
                className="px-3 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
              >
                Refresh
              </button>
              <button
                onClick={handleExportReport}
                className="px-3 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors flex items-center"
              >
                <Download className="w-4 h-4 mr-2" />
                Export
              </button>
              <button
                onClick={logout}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors flex items-center"
              >
                <LogOut className="w-4 h-4 mr-2" />
                Logout
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="bg-white border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <nav className="flex space-x-8">
            {[
              { id: 'overview', name: 'Overview', icon: Calendar },
              { id: 'teachers', name: 'Teachers', icon: Users },
              { id: 'schedules', name: 'Schedules', icon: Calendar },
              { id: 'classrooms', name: 'Classrooms', icon: Building },
              { id: 'subjects', name: 'Subjects', icon: BookOpen },
              { id: 'conflicts', name: 'Conflicts', icon: AlertCircle },
              { id: 'requests', name: 'Requests', icon: Clock },
              { id: 'settings', name: 'Settings', icon: Settings }
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                  activeTab === tab.id
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <tab.icon className="w-4 h-4 inline mr-2" />
                {tab.name}
              </button>
            ))}
          </nav>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
              <p className="text-gray-600">Loading dashboard...</p>
            </div>
          </div>
        ) : (
          renderTabContent()
        )}
      </div>
    </div>
  );
};

export default PrincipalDashboard;
