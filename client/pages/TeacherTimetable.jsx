import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { toast } from 'react-hot-toast';
import { 
  Calendar, 
  Clock, 
  MapPin, 
  Users, 
  BookOpen, 
  AlertCircle,
  CheckCircle,
  XCircle,
  Download,
  Eye,
  EyeOff
} from 'lucide-react';
import { format, parseISO, isToday, isTomorrow, isAfter, isBefore } from 'date-fns';
import scheduleService from '../services/scheduleService';

const TeacherTimetable = () => {
  const { user } = useAuth();
  const [schedules, setSchedules] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showPastClasses, setShowPastClasses] = useState(false);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [stats, setStats] = useState({
    totalClasses: 0,
    thisWeek: 0,
    nextWeek: 0,
    totalHours: 0
  });

  useEffect(() => {
    if (user) {
      fetchTeacherSchedules();
      // Update current time every minute
      const interval = setInterval(() => setCurrentTime(new Date()), 60000);
      return () => clearInterval(interval);
    }
  }, [user]);

  const fetchTeacherSchedules = async () => {
    try {
      setLoading(true);
      const teacherSchedules = await scheduleService.getTeacherSchedules(user.id);
      setSchedules(teacherSchedules);
      
      // Calculate stats
      const now = new Date();
      const weekStart = new Date(now.getFullYear(), now.getMonth(), now.getDate() - now.getDay());
      const nextWeekStart = new Date(weekStart.getTime() + 7 * 24 * 60 * 60 * 1000);
      
      const thisWeek = teacherSchedules.filter(schedule => {
        const scheduleDate = parseISO(schedule.startDate);
        return isAfter(scheduleDate, weekStart) && isBefore(scheduleDate, nextWeekStart);
      }).length;
      
      const nextWeek = teacherSchedules.filter(schedule => {
        const scheduleDate = parseISO(schedule.startDate);
        return isAfter(scheduleDate, nextWeekStart);
      }).length;
      
      const totalHours = teacherSchedules.reduce((total, schedule) => {
        const start = parseISO(`2000-01-01T${schedule.startTime}`);
        const end = parseISO(`2000-01-01T${schedule.endTime}`);
        return total + (end - start) / (1000 * 60 * 60);
      }, 0);
      
      setStats({
        totalClasses: teacherSchedules.length,
        thisWeek,
        nextWeek,
        totalHours: Math.round(totalHours * 10) / 10
      });
    } catch (error) {
      toast.error('Failed to fetch schedules');
      console.error('Schedule fetch error:', error);
    } finally {
      setLoading(false);
    }
  };

  const getCurrentClass = () => {
    const now = currentTime;
    const currentDay = format(now, 'EEEE');
    const currentTimeStr = format(now, 'HH:mm');
    
    return schedules.find(schedule => 
      schedule.dayOfWeek === currentDay &&
      schedule.startTime <= currentTimeStr &&
      schedule.endTime > currentTimeStr
    );
  };

  const getNextClass = () => {
    const now = currentTime;
    const currentDay = format(now, 'EEEE');
    const currentTimeStr = format(now, 'HH:mm');
    
    const todayClasses = schedules.filter(schedule => 
      schedule.dayOfWeek === currentDay &&
      schedule.startTime > currentTimeStr
    );
    
    if (todayClasses.length > 0) {
      return todayClasses.sort((a, b) => a.startTime.localeCompare(b.startTime))[0];
    }
    
    // If no more classes today, find next class on any day
    const futureSchedules = schedules.filter(schedule => {
      if (schedule.dayOfWeek === currentDay) return false;
      const scheduleDate = parseISO(schedule.startDate);
      return isAfter(scheduleDate, now);
    });
    
    return futureSchedules.sort((a, b) => 
      new Date(a.startDate + 'T' + a.startTime) - new Date(b.startDate + 'T' + b.startTime)
    )[0];
  };

  const getClassStatus = (schedule) => {
    const now = currentTime;
    const currentDay = format(now, 'EEEE');
    const currentTimeStr = format(now, 'HH:mm');
    
    if (schedule.dayOfWeek !== currentDay) return 'future';
    
    if (schedule.startTime <= currentTimeStr && schedule.endTime > currentTimeStr) {
      return 'current';
    } else if (schedule.startTime > currentTimeStr) {
      return 'upcoming';
    } else {
      return 'past';
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'current':
        return <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse"></div>;
      case 'upcoming':
        return <div className="w-3 h-3 bg-blue-500 rounded-full"></div>;
      case 'past':
        return <div className="w-3 h-3 bg-gray-400 rounded-full"></div>;
      default:
        return <div className="w-3 h-3 bg-gray-300 rounded-full"></div>;
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'current':
        return 'border-green-200 bg-green-50';
      case 'upcoming':
        return 'border-blue-200 bg-blue-50';
      case 'past':
        return 'border-gray-200 bg-gray-50';
      default:
        return 'border-gray-200 bg-white';
    }
  };

  const exportTimetable = async () => {
    try {
      await scheduleService.exportToPDF({ teacherId: user.id });
      toast.success('Timetable exported successfully');
    } catch (error) {
      toast.error('Failed to export timetable');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading timetable...</p>
        </div>
      </div>
    );
  }

  const currentClass = getCurrentClass();
  const nextClass = getNextClass();

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">My Timetable</h1>
              <p className="text-gray-600">Welcome back, {user.name}</p>
            </div>
            <div className="flex items-center gap-4">
              <button
                onClick={exportTimetable}
                className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg flex items-center gap-2 transition-colors"
              >
                <Download className="w-4 h-4" />
                Export PDF
              </button>
              <button
                onClick={() => setShowPastClasses(!showPastClasses)}
                className={`px-4 py-2 rounded-lg flex items-center gap-2 transition-colors ${
                  showPastClasses 
                    ? 'bg-blue-600 text-white' 
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                {showPastClasses ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                {showPastClasses ? 'Hide Past' : 'Show Past'}
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <div className="p-2 bg-blue-100 rounded-lg">
                <Calendar className="w-6 h-6 text-blue-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Total Classes</p>
                <p className="text-2xl font-bold text-gray-900">{stats.totalClasses}</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <div className="p-2 bg-green-100 rounded-lg">
                <Clock className="w-6 h-6 text-green-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">This Week</p>
                <p className="text-2xl font-bold text-gray-900">{stats.thisWeek}</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <div className="p-2 bg-purple-100 rounded-lg">
                <Calendar className="w-6 h-6 text-purple-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Next Week</p>
                <p className="text-2xl font-bold text-gray-900">{stats.nextWeek}</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <div className="p-2 bg-yellow-100 rounded-lg">
                <Clock className="w-6 h-6 text-yellow-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Total Hours</p>
                <p className="text-2xl font-bold text-gray-900">{stats.totalHours}h</p>
              </div>
            </div>
          </div>
        </div>

        {/* Current Status */}
        {(currentClass || nextClass) && (
          <div className="bg-white rounded-lg shadow p-6 mb-8">
            <h2 className="text-xl font-semibold text-gray-800 mb-4">Current Status</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {currentClass && (
                <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse"></div>
                    <h3 className="font-medium text-green-800">Currently Teaching</h3>
                  </div>
                  <div className="space-y-2 text-sm">
                    <div className="flex items-center gap-2">
                      <BookOpen className="w-4 h-4 text-green-600" />
                      <span className="text-green-700">{currentClass.title}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Clock className="w-4 h-4 text-green-600" />
                      <span className="text-green-700">
                        {currentClass.startTime} - {currentClass.endTime}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <MapPin className="w-4 h-4 text-green-600" />
                      <span className="text-green-700">{currentClass.classroom}</span>
                    </div>
                  </div>
                </div>
              )}

              {nextClass && (
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
                    <h3 className="font-medium text-blue-800">Next Class</h3>
                  </div>
                  <div className="space-y-2 text-sm">
                    <div className="flex items-center gap-2">
                      <BookOpen className="w-4 h-4 text-blue-600" />
                      <span className="text-blue-700">{nextClass.title}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Clock className="w-4 h-4 text-blue-600" />
                      <span className="text-blue-700">
                        {nextClass.startTime} - {nextClass.endTime}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <MapPin className="w-4 h-4 text-blue-600" />
                      <span className="text-blue-700">{nextClass.classroom}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Calendar className="w-4 h-4 text-blue-600" />
                      <span className="text-blue-700">
                        {isToday(parseISO(nextClass.startDate)) 
                          ? 'Today' 
                          : isTomorrow(parseISO(nextClass.startDate)) 
                            ? 'Tomorrow' 
                            : format(parseISO(nextClass.startDate), 'EEEE, MMMM d')
                        }
                      </span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Weekly Schedule */}
        <div className="bg-white rounded-lg shadow">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-xl font-semibold text-gray-800">Weekly Schedule</h2>
          </div>
          <div className="p-6">
            {['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'].map(day => {
              const daySchedules = schedules.filter(schedule => schedule.dayOfWeek === day);
              
              return (
                <div key={day} className="mb-6 last:mb-0">
                  <h3 className="text-lg font-medium text-gray-700 mb-3">{day}</h3>
                  {daySchedules.length === 0 ? (
                    <div className="text-center py-8 text-gray-500">
                      <Calendar className="w-12 h-12 mx-auto mb-2 text-gray-300" />
                      <p>No classes scheduled</p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {daySchedules
                        .sort((a, b) => a.startTime.localeCompare(b.startTime))
                        .map(schedule => {
                          const status = getClassStatus(schedule);
                          if (status === 'past' && !showPastClasses) return null;
                          
                          return (
                            <div
                              key={schedule.id}
                              className={`border rounded-lg p-4 ${getStatusColor(status)}`}
                            >
                              <div className="flex items-start justify-between">
                                <div className="flex items-start gap-3 flex-1">
                                  {getStatusIcon(status)}
                                  <div className="flex-1">
                                    <div className="flex items-center gap-2 mb-2">
                                      <h4 className="font-medium text-gray-900">{schedule.title}</h4>
                                      <span className="text-xs px-2 py-1 bg-gray-100 text-gray-600 rounded-full">
                                        {schedule.subject}
                                      </span>
                                    </div>
                                    <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-sm text-gray-600">
                                      <div className="flex items-center gap-2">
                                        <Clock className="w-4 h-4" />
                                        <span>{schedule.startTime} - {schedule.endTime}</span>
                                      </div>
                                      <div className="flex items-center gap-2">
                                        <MapPin className="w-4 h-4" />
                                        <span>{schedule.classroom}</span>
                                      </div>
                                      <div className="flex items-center gap-2">
                                        <Users className="w-4 h-4" />
                                        <span>Class</span>
                                      </div>
                                    </div>
                                  </div>
                                </div>
                                
                                <div className="flex items-center gap-2">
                                  {status === 'current' && (
                                    <span className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded-full">
                                      In Progress
                                    </span>
                                  )}
                                  {status === 'upcoming' && (
                                    <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded-full">
                                      Upcoming
                                    </span>
                                  )}
                                  {status === 'past' && (
                                    <span className="text-xs bg-gray-100 text-gray-800 px-2 py-1 rounded-full">
                                      Completed
                                    </span>
                                  )}
                                </div>
                              </div>
                            </div>
                          );
                        })}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};

export default TeacherTimetable;
