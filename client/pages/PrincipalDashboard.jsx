import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { toast } from 'react-hot-toast';
import { 
  Calendar, 
  Clock, 
  Users, 
  MapPin, 
  FileText, 
  BarChart3, 
  Settings,
  Download,
  Plus,
  Search,
  Filter,
  AlertTriangle
} from 'lucide-react';
import CalendarComponent from '../components/calendar/Calendar';
import ConflictDetector from '../components/calendar/ConflictDetector';
import scheduleService from '../services/scheduleService';

const PrincipalDashboard = () => {
  const { user } = useAuth();
  const [schedules, setSchedules] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('calendar');
  const [stats, setStats] = useState({
    totalSchedules: 0,
    activeTeachers: 0,
    totalClassrooms: 0,
    conflicts: 0
  });
  const [filters, setFilters] = useState({
    teacher: '',
    subject: '',
    classroom: '',
    dateRange: 'week'
  });

  useEffect(() => {
    if (user) {
      fetchDashboardData();
    }
  }, [user]);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      
      // Fetch schedules and stats
      const [schedulesData, statsData] = await Promise.all([
        scheduleService.getAllSchedules(),
        scheduleService.getScheduleStats()
      ]);
      
      setSchedules(schedulesData);
      setStats(statsData);
    } catch (error) {
      toast.error('Failed to fetch dashboard data');
      console.error('Dashboard data fetch error:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleScheduleCreate = async (newSchedule) => {
    try {
      // Check for conflicts first
      const conflicts = await scheduleService.checkConflicts(newSchedule);
      
      if (conflicts.length > 0) {
        toast.error(`Conflicts detected: ${conflicts.length} issues found`);
        return;
      }
      
      // Create the schedule
      const createdSchedule = await scheduleService.createSchedule(newSchedule);
      setSchedules(prev => [...prev, createdSchedule]);
      toast.success('Schedule created successfully');
      
      // Refresh stats
      const updatedStats = await scheduleService.getScheduleStats();
      setStats(updatedStats);
    } catch (error) {
      toast.error(error.message);
    }
  };

  const handleScheduleUpdate = async (updatedSchedule) => {
    try {
      const updated = await scheduleService.updateSchedule(updatedSchedule.id, updatedSchedule);
      setSchedules(prev => 
        prev.map(schedule => 
          schedule.id === updatedSchedule.id ? updated : schedule
        )
      );
      toast.success('Schedule updated successfully');
    } catch (error) {
      toast.error(error.message);
    }
  };

  const handleScheduleDelete = async (scheduleId) => {
    try {
      await scheduleService.deleteSchedule(scheduleId);
      setSchedules(prev => prev.filter(schedule => schedule.id !== scheduleId));
      toast.success('Schedule deleted successfully');
      
      // Refresh stats
      const updatedStats = await scheduleService.getScheduleStats();
      setStats(updatedStats);
    } catch (error) {
      toast.error(error.message);
    }
  };

  const handleConflictResolve = (conflict) => {
    // Log conflict resolution for audit purposes
    console.log('Conflict resolved:', conflict);
    toast.success('Conflict marked as resolved');
  };

  const handleExportPDF = async () => {
    try {
      await scheduleService.exportToPDF(filters);
      toast.success('PDF exported successfully');
    } catch (error) {
      toast.error(error.message);
    }
  };

  const filteredSchedules = schedules.filter(schedule => {
    if (filters.teacher && schedule.teacherId !== parseInt(filters.teacher)) return false;
    if (filters.subject && schedule.subjectId !== parseInt(filters.subject)) return false;
    if (filters.classroom && schedule.classroomId !== parseInt(filters.classroom)) return false;
    return true;
  });

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Principal Dashboard</h1>
              <p className="text-gray-600">Manage college timetables and schedules</p>
            </div>
            <div className="flex items-center gap-4">
              <button
                onClick={handleExportPDF}
                className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg flex items-center gap-2 transition-colors"
              >
                <Download className="w-4 h-4" />
                Export PDF
              </button>
              <button className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg flex items-center gap-2 transition-colors">
                <Settings className="w-4 h-4" />
                Settings
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <div className="p-2 bg-blue-100 rounded-lg">
                <Calendar className="w-6 h-6 text-blue-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Total Schedules</p>
                <p className="text-2xl font-bold text-gray-900">{stats.totalSchedules}</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <div className="p-2 bg-green-100 rounded-lg">
                <Users className="w-6 h-6 text-green-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Active Teachers</p>
                <p className="text-2xl font-bold text-gray-900">{stats.activeTeachers}</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <div className="p-2 bg-purple-100 rounded-lg">
                <MapPin className="w-6 h-6 text-purple-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Classrooms</p>
                <p className="text-2xl font-bold text-gray-900">{stats.totalClassrooms}</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <div className="p-2 bg-red-100 rounded-lg">
                <AlertTriangle className="w-6 h-6 text-red-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Active Conflicts</p>
                <p className="text-2xl font-bold text-gray-900">{stats.conflicts}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-white rounded-lg shadow p-6 mb-8">
          <div className="flex items-center gap-4 mb-4">
            <Filter className="w-5 h-5 text-gray-500" />
            <h3 className="text-lg font-medium text-gray-900">Filters</h3>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Teacher</label>
              <select
                value={filters.teacher}
                onChange={(e) => setFilters({...filters, teacher: e.target.value})}
                className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">All Teachers</option>
                {/* Teacher options would be populated from API */}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Subject</label>
              <select
                value={filters.subject}
                onChange={(e) => setFilters({...filters, subject: e.target.value})}
                className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">All Subjects</option>
                {/* Subject options would be populated from API */}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Classroom</label>
              <select
                value={filters.classroom}
                onChange={(e) => setFilters({...filters, classroom: e.target.value})}
                className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">All Classrooms</option>
                {/* Classroom options would be populated from API */}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Date Range</label>
              <select
                value={filters.dateRange}
                onChange={(e) => setFilters({...filters, dateRange: e.target.value})}
                className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="week">This Week</option>
                <option value="month">This Month</option>
                <option value="semester">This Semester</option>
              </select>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="bg-white rounded-lg shadow">
          <div className="border-b border-gray-200">
            <nav className="-mb-px flex space-x-8 px-6">
              <button
                onClick={() => setActiveTab('calendar')}
                className={`py-4 px-1 border-b-2 font-medium text-sm ${
                  activeTab === 'calendar'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <Calendar className="w-4 h-4 inline mr-2" />
                Calendar View
              </button>
              <button
                onClick={() => setActiveTab('conflicts')}
                className={`py-4 px-1 border-b-2 font-medium text-sm ${
                  activeTab === 'conflicts'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <AlertTriangle className="w-4 h-4 inline mr-2" />
                Conflict Detection
              </button>
              <button
                onClick={() => setActiveTab('analytics')}
                className={`py-4 px-1 border-b-2 font-medium text-sm ${
                  activeTab === 'analytics'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <BarChart3 className="w-4 h-4 inline mr-2" />
                Analytics
              </button>
            </nav>
          </div>

          <div className="p-6">
            {activeTab === 'calendar' && (
              <CalendarComponent
                schedules={filteredSchedules}
                onScheduleCreate={handleScheduleCreate}
                onScheduleUpdate={handleScheduleUpdate}
                onScheduleDelete={handleScheduleDelete}
              />
            )}

            {activeTab === 'conflicts' && (
              <ConflictDetector
                schedules={filteredSchedules}
                onConflictResolve={handleConflictResolve}
              />
            )}

            {activeTab === 'analytics' && (
              <div className="text-center py-12">
                <BarChart3 className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">Analytics Dashboard</h3>
                <p className="text-gray-600">Advanced reporting and analytics coming soon...</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default PrincipalDashboard;
