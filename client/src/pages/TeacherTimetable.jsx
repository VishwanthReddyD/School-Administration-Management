import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { 
  Clock, MapPin, BookOpen, Calendar, Download, AlertCircle, CheckCircle, 
  Plus, X, FileText, Users, Building, Clock3, MessageSquare, 
  Clipboard, BarChart3, Bell, Settings, Home, UserCheck, BookOpenCheck,
  CalendarDays, TrendingUp, Award, Target, Zap, Loader2
} from 'lucide-react';
import toast from 'react-hot-toast';
import scheduleService from '../services/scheduleService';
import requestService from '../services/requestService';
import { useNavigate } from 'react-router-dom';

const TeacherTimetable = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [timetable, setTimetable] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [selectedTab, setSelectedTab] = useState('overview');
  const [quickStats, setQuickStats] = useState({
    classesThisWeek: 0,
    pendingRequests: 0,
    totalClasses: 0,
    completedClasses: 0
  });
  const [recentActivity, setRecentActivity] = useState([]);
  const [refreshingRequests, setRefreshingRequests] = useState(false);

  // Update current time every second for real-time updates
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  // Refresh requests data every 30 seconds to show status updates
  useEffect(() => {
    const interval = setInterval(() => {
      refreshRequestsData();
    }, 30000); // 30 seconds

    return () => clearInterval(interval);
  }, []);

  const fetchTimetable = async () => {
    try {
      setLoading(true);
      setError(null);
      
      // Fetch teacher's personal schedule from backend
      const response = await scheduleService.getPersonalSchedule();
      // API returns { current_class, upcoming_classes, full_schedule }
      const schedules = Array.isArray(response.full_schedule) ? response.full_schedule : (response.data || []);
      
      // Process schedules for today's view
      const todaySchedule = processSchedulesForToday(schedules);
      
      setTimetable(todaySchedule);
      
      // Set quick stats based on actual data
      setQuickStats({
        classesThisWeek: schedules.length, 
        pendingRequests: 0,
        totalClasses: todaySchedule.total_classes,
        completedClasses: todaySchedule.completed_classes?.length || 0
      });

      // Fetch pending requests count and recent activity
      try {
        const requestsResponse = await requestService.getMyRequests();
        const pendingCount = requestsResponse.data?.filter(req => req.status === 'pending')?.length || 0;
        setQuickStats(prev => ({ ...prev, pendingRequests: pendingCount }));
        
        // Process recent activity from requests
        const activity = processRecentActivity(requestsResponse.data || []);
        setRecentActivity(activity);
      } catch (error) {
        console.error('Failed to fetch pending requests:', error);
      }
    } catch (error) {
      console.error('Failed to fetch timetable:', error);
      setError('Failed to load timetable from server.');
    } finally {
      setLoading(false);
    }
  };

  // Fetch timetable data
  useEffect(() => {
    fetchTimetable();
  }, []); // Only fetch once on mount

  // Function to refresh just the requests and activity data
  const refreshRequestsData = async () => {
    try {
      setRefreshingRequests(true);
      const requestsResponse = await requestService.getMyRequests();
      const pendingCount = requestsResponse.data?.filter(req => req.status === 'pending')?.length || 0;
      
      // Check for status changes and notify user
      const currentRequests = requestsResponse.data || [];
      const previousRequests = recentActivity.map(activity => {
        const requestId = activity.id.replace('request-', '');
        return currentRequests.find(req => req.id === requestId);
      }).filter(Boolean);
      
      // Notify about new status changes
      currentRequests.forEach(currentRequest => {
        const previousRequest = previousRequests.find(req => req.id === currentRequest.id);
        if (previousRequest && previousRequest.status !== currentRequest.status) {
          if (currentRequest.status === 'approved') {
            toast.success(`Your ${currentRequest.request_type.replace('_', ' ')} request has been approved!`);
          } else if (currentRequest.status === 'rejected') {
            toast.error(`Your ${currentRequest.request_type.replace('_', ' ')} request has been rejected.`);
          }
        }
      });
      
      setQuickStats(prev => ({ ...prev, pendingRequests: pendingCount }));
      
      // Process recent activity from requests
      const activity = processRecentActivity(currentRequests);
      setRecentActivity(activity);
    } catch (error) {
      console.error('Failed to refresh requests data:', error);
    } finally {
      setRefreshingRequests(false);
    }
  };

  // Navigation handler for quick actions
  const handleNavigate = (target) => {
    const routes = {
      requests: '/teacher/requests',
      attendance: '/teacher/attendance',
      grades: '/teacher/grades',
      schedule: '/teacher/schedule',
      reports: '/teacher/reports',
      settings: '/teacher/settings',
    };
    const path = routes[target];
    if (path) {
      navigate(path);
    } else {
      toast.error('This action is not available yet.');
    }
  };

  // Process recent activity from requests and other data
  const processRecentActivity = (requests) => {
    const activity = [];
    
    // Add request activities
    requests.forEach(request => {
      const timeAgo = getTimeAgo(request.requested_at);
      let activityText = '';
      let bgColor = '';
      let dotColor = '';
      
      if (request.status === 'pending') {
        activityText = `${request.request_type.replace('_', ' ')} request submitted`;
        bgColor = 'bg-purple-50';
        dotColor = 'bg-purple-500';
      } else if (request.status === 'approved') {
        activityText = `${request.request_type.replace('_', ' ')} request approved`;
        bgColor = 'bg-green-50';
        dotColor = 'bg-green-500';
      } else if (request.status === 'rejected') {
        activityText = `${request.request_type.replace('_', ' ')} request rejected`;
        bgColor = 'bg-red-50';
        dotColor = 'bg-red-500';
      }
      
      if (activityText) {
        activity.push({
          id: `request-${request.id}`,
          text: activityText,
          timeAgo,
          bgColor,
          dotColor,
          timestamp: new Date(request.requested_at)
        });
      }
    });
    
    // Sort by timestamp (most recent first) and take top 5
    return activity
      .sort((a, b) => b.timestamp - a.timestamp)
      .slice(0, 5);
  };

  // Helper function to get time ago
  const getTimeAgo = (dateString) => {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    const now = new Date();
    const diffInHours = Math.floor((now - date) / (1000 * 60 * 60));
    
    if (diffInHours < 1) return 'Just now';
    if (diffInHours < 24) return `${diffInHours} hour${diffInHours > 1 ? 's' : ''} ago`;
    
    const diffInDays = Math.floor(diffInHours / 24);
    if (diffInDays < 7) return `${diffInDays} day${diffInDays > 1 ? 's' : ''} ago`;
    
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const handleSeedDatabase = async () => {
    try {
      await scheduleService.seedDatabase();
      toast.success('Database seeded successfully!');
      fetchTimetable();
    } catch (error) {
      toast.error('Failed to seed database.');
    }
  };

  // Handler for quick action buttons
  const handleQuickAction = (action) => {
    switch (action) {
      case 'mark_attendance':
        navigate('/teacher/attendance');
        break;
      case 'take_notes':
        toast.success('Notes feature coming soon!');
        break;
      case 'export_schedule':
        toast.success('Export feature coming soon!');
        break;
      default:
        toast.error('This action is not available yet.');
    }
  };

  // Helper function to calculate time until class starts
  const getTimeUntil = (startTime) => {
    if (!startTime) return 'Unknown';
    
    const now = new Date();
    const today = now.toDateString();
    const classStartTime = new Date(`${today} ${startTime}`);
    
    // If class time has passed for today, show "Starting soon"
    if (classStartTime <= now) {
      return 'Starting soon';
    }
    
    const timeDiff = classStartTime - now;
    const minutes = Math.floor(timeDiff / (1000 * 60));
    const hours = Math.floor(minutes / 60);
    
    if (hours > 0) {
      return `in ${hours}h ${minutes % 60}m`;
    } else if (minutes > 0) {
      return `in ${minutes}m`;
    } else {
      return 'Starting now';
    }
  };

  // Helper function to calculate time remaining in current class
  const getTimeRemaining = (endTime) => {
    if (!endTime) return 'Unknown';
    
    const now = new Date();
    const today = now.toDateString();
    const classEndTime = new Date(`${today} ${endTime}`);
    
    // If class has ended, show "Ended"
    if (classEndTime <= now) {
      return 'Ended';
    }
    
    const timeDiff = classEndTime - now;
    const minutes = Math.floor(timeDiff / (1000 * 60));
    const hours = Math.floor(minutes / 60);
    
    if (hours > 0) {
      return `${hours}h ${minutes % 60}m left`;
    } else if (minutes > 0) {
      return `${minutes}m left`;
    } else {
      return 'Ending now';
    }
  };

  // Process schedules from backend for today's view
  const processSchedulesForToday = (schedules) => {
    const now = new Date();
    const today = now.getDay(); // 0 = Sunday, 1 = Monday, etc.
    const todayAdjusted = today === 0 ? 7 : today; // Convert to 1-7 (Monday-Sunday)
    
    // Only show schedule for weekdays (Monday-Friday, days 1-5)
    if (todayAdjusted > 5) {
      return {
        current_class: null,
        upcoming_classes: [],
        completed_classes: [],
        total_classes: 0,
        total_hours: 0
      };
    }

    // Filter schedules for today
    const todaySchedules = schedules.filter(schedule => schedule.day_of_week === todayAdjusted);
    
    // Convert schedule times to Date objects for comparison
    const classes = todaySchedules.map(schedule => {
      const startTime = new Date(now);
      const [startHour, startMinute] = schedule.start_time.split(':');
      startTime.setHours(parseInt(startHour), parseInt(startMinute), 0, 0);
      
      const endTime = new Date(now);
      const [endHour, endMinute] = schedule.end_time.split(':');
      endTime.setHours(parseInt(endHour), parseInt(endMinute), 0, 0);
      
             return {
         id: schedule.id,
         subject_name: schedule.subject_name,
         subject_code: schedule.subject_code,
         subject_color: schedule.subject_color || '#3B82F6',
         room_number: schedule.room_number,
         building: schedule.building,
         floor: schedule.floor,
         class_id: schedule.class_id,
         section_id: schedule.section_id,
         academic_year: schedule.academic_year,
         class_name: schedule.class_name,
         section_name: schedule.section_name,
         start_time: startTime,
         end_time: endTime,
         start_time_str: schedule.start_time,
         end_time_str: schedule.end_time
       };
    });

    // Sort classes by start time
    classes.sort((a, b) => a.start_time - b.start_time);

    // Determine current, upcoming, and completed classes
    const current_class = classes.find(cls => 
      now >= cls.start_time && now < cls.end_time
    ) || null;

    const upcoming_classes = classes.filter(cls => 
      now < cls.start_time
    );

    const completed_classes = classes.filter(cls => 
      now >= cls.end_time
    );

    return {
      current_class,
      upcoming_classes,
      completed_classes,
      all_classes: classes,
      total_classes: classes.length,
      total_hours: classes.length * 1.5
    };
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading your timetable...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <AlertCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
          <p className="text-red-600">{error}</p>
          <button
            onClick={fetchTimetable}
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
                My Timetable
              </h1>
              <p className="text-gray-600">
                Welcome back, {user?.teacher_name || user?.email}
              </p>
            </div>
                         <div className="flex items-center space-x-4">
               <div className="text-right">
                 <p className="text-sm text-gray-500">Current Time</p>
                 <p className="text-lg font-mono font-semibold text-gray-900">
                   {currentTime.toLocaleTimeString()}
                 </p>
                 <p className="text-xs text-gray-500">
                   {currentTime.toLocaleDateString()}
                 </p>
               </div>
               <button
                 onClick={() => handleNavigate('settings')}
                 className="p-2 text-gray-400 hover:text-gray-600 transition-colors"
               >
                 <Settings className="w-5 h-5" />
               </button>
               <button
                 onClick={logout}
                 className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
               >
                 Logout
               </button>
             </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Quick Stats */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <div className="bg-white rounded-lg p-6 shadow-sm border border-gray-200">
            <div className="flex items-center">
              <div className="p-2 bg-blue-100 rounded-lg">
                <Calendar className="w-6 h-6 text-blue-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Today's Classes</p>
                <p className="text-2xl font-bold text-gray-900">{quickStats.totalClasses}</p>
              </div>
            </div>
          </div>
          
          <div className="bg-white rounded-lg p-6 shadow-sm border border-gray-200">
            <div className="flex items-center">
              <div className="p-2 bg-green-100 rounded-lg">
                <CheckCircle className="w-6 h-6 text-green-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Completed</p>
                <p className="text-2xl font-bold text-gray-900">{quickStats.completedClasses}</p>
              </div>
            </div>
          </div>
          
          <div className="bg-white rounded-lg p-6 shadow-sm border border-gray-200">
            <div className="flex items-center">
              <div className="p-2 bg-purple-100 rounded-lg">
                <CalendarDays className="w-6 h-6 text-purple-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Classes This Week</p>
                <p className="text-2xl font-bold text-gray-900">{quickStats.classesThisWeek}</p>
              </div>
            </div>
          </div>
          
          <div className="bg-white rounded-lg p-6 shadow-sm border border-gray-200">
            <div className="flex items-center">
              <div className="p-2 bg-yellow-100 rounded-lg">
                <Bell className="w-6 h-6 text-yellow-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Pending Requests</p>
                <p className="text-2xl font-bold text-gray-900">{quickStats.pendingRequests}</p>
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Current Class */}
          <div className="lg:col-span-2">
            <h2 className="text-xl font-semibold text-gray-900 mb-4 flex items-center">
              <Clock className="w-5 h-5 mr-2 text-blue-600" />
              Current Class
            </h2>
            
            {timetable?.current_class ? (
              <div className="bg-gradient-to-r from-blue-500 to-blue-600 rounded-xl p-6 text-white shadow-lg">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <h3 className="text-2xl font-bold mb-2">
                      {timetable.current_class.subject_name}
                    </h3>
                    <p className="text-blue-100 mb-4">
                      {timetable.current_class.subject_code}
                    </p>
                    
                    <div className="space-y-3">
                      <div className="flex items-center text-blue-100">
                        <BookOpen className="w-4 h-4 mr-2" />
                        <span>
                          {timetable.current_class.class_name} {timetable.current_class.section_name && `• ${timetable.current_class.section_name}`}
                        </span>
                      </div>
                      
                      <div className="flex items-center text-blue-100">
                        <MapPin className="w-4 h-4 mr-2" />
                        <span>
                          Room {timetable.current_class.room_number} • {timetable.current_class.building}
                        </span>
                      </div>
                      
                      <div className="flex items-center text-blue-100">
                        <Calendar className="w-4 h-4 mr-2" />
                        <span>
                          {timetable.current_class.start_time_str} - {timetable.current_class.end_time_str}
                        </span>
                      </div>
                      
                      <div className="flex items-center text-yellow-200 font-semibold">
                        <Clock className="w-4 h-4 mr-2" />
                        <span>
                          {getTimeRemaining(timetable.current_class.end_time)}
                        </span>
                      </div>
                    </div>
                  </div>
                  
                                     <div className="text-right">
                     <div className="bg-blue-400 bg-opacity-30 rounded-full p-3">
                       <BookOpen className="w-8 h-8" />
                     </div>
                   </div>
                 </div>
                 
                 {/* Quick Actions for Current Class */}
                 <div className="mt-6 flex space-x-3">
                   <button 
                     onClick={() => handleQuickAction('mark_attendance')}
                     className="px-4 py-2 bg-blue-400 text-white rounded-lg hover:bg-blue-500 transition-colors flex items-center"
                   >
                     <UserCheck className="w-4 h-4 mr-2" />
                     Mark Attendance
                   </button>
                   <button 
                     onClick={() => handleQuickAction('take_notes')}
                     className="px-4 py-2 bg-blue-400 text-white rounded-lg hover:bg-blue-500 transition-colors flex items-center"
                   >
                     <Clipboard className="w-4 h-4 mr-2" />
                     Take Notes
                   </button>
                 </div>
               </div>
            ) : (
              <div className="bg-gray-100 rounded-xl p-8 text-center">
                <BookOpen className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">
                  No Current Class
                </h3>
                <p className="text-gray-600">
                  You don't have any classes scheduled right now.
                </p>
              </div>
            )}
          </div>

          {/* Quick Actions */}
          <div className="lg:col-span-1">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">
              Quick Actions
            </h2>
            
            <div className="space-y-3">
              <button 
                onClick={() => handleNavigate('requests')}
                className="w-full flex items-center justify-center px-4 py-3 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
              >
                <FileText className="w-4 h-4 mr-2" />
                Submit Requests
              </button>
              
              <button 
                onClick={() => handleNavigate('attendance')}
                className="w-full flex items-center justify-center px-4 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
              >
                <UserCheck className="w-4 h-4 mr-2" />
                Manage Attendance
              </button>
              
              <button 
                onClick={() => handleNavigate('grades')}
                className="w-full flex items-center justify-center px-4 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
              >
                <BarChart3 className="w-4 h-4 mr-2" />
                Grade Management
              </button>
              
              <button 
                onClick={() => handleNavigate('schedule')}
                className="w-full flex items-center justify-center px-4 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                <Calendar className="w-4 h-4 mr-2" />
                View Full Schedule
              </button>
              
              <button 
                onClick={() => handleNavigate('reports')}
                className="w-full flex items-center justify-center px-4 py-3 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
              >
                <TrendingUp className="w-4 h-4 mr-2" />
                Analytics & Reports
              </button>
              
              <button 
                onClick={() => handleQuickAction('export_schedule')}
                className="w-full flex items-center justify-center px-4 py-3 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
              >
                <Download className="w-4 h-4 mr-2" />
                Export Schedule
              </button>
            </div>

            {/* Statistics */}
            <div className="mt-6 bg-white rounded-lg p-4 shadow-sm border">
              <h3 className="text-sm font-medium text-gray-900 mb-3">Today's Summary</h3>
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Total Classes:</span>
                  <span className="font-medium">{timetable?.total_classes || 0}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Total Hours:</span>
                  <span className="font-medium">{timetable?.total_hours || 0}h</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Completed:</span>
                  <span className="font-medium text-green-600">{timetable?.completed_classes?.length || 0}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Remaining:</span>
                  <span className="font-medium text-blue-600">{timetable?.upcoming_classes?.length || 0}</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Upcoming Classes */}
        <div className="mt-8">
          <h2 className="text-xl font-semibold text-gray-900 mb-4 flex items-center">
            <Calendar className="w-5 h-5 mr-2 text-green-600" />
            Upcoming Classes
          </h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {timetable?.upcoming_classes?.map((classItem) => (
              <div key={classItem.id} className="bg-white rounded-lg p-6 shadow-sm border border-gray-200 hover:shadow-md transition-shadow">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1">
                    <h3 className="font-semibold text-gray-900 mb-1">
                      {classItem.subject_name}
                    </h3>
                    <p className="text-sm text-gray-600 mb-2">
                      {classItem.subject_code}
                    </p>
                    <p className="text-xs text-gray-500 mb-2">
                      {classItem.class_name} {classItem.section_name && `• ${classItem.section_name}`}
                    </p>
                  </div>
                  
                  <div className="text-right">
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                      {getTimeUntil(classItem.start_time)}
                    </span>
                  </div>
                </div>
                
                                 <div className="space-y-2 text-sm text-gray-600">
                   <div className="flex items-center">
                     <MapPin className="w-4 h-4 mr-2 text-gray-400" />
                     <span>Room {classItem.room_number} • {classItem.building}</span>
                   </div>
                   
                   <div className="flex items-center">
                     <Clock className="w-4 h-4 mr-2 text-gray-400" />
                     <span>{classItem.start_time_str} - {classItem.end_time_str}</span>
                   </div>
                 </div>
                 
                 <div className="mt-4 flex space-x-2">
                   <button 
                     onClick={() => handleQuickAction('take_notes')}
                     className="flex-1 px-3 py-2 text-xs bg-blue-100 text-blue-700 rounded hover:bg-blue-200 transition-colors"
                   >
                     Prepare Notes
                   </button>
                   <button 
                     onClick={() => handleQuickAction('mark_attendance')}
                     className="flex-1 px-3 py-2 text-xs bg-green-100 text-green-700 rounded hover:bg-green-200 transition-colors"
                   >
                     Ready
                   </button>
                 </div>
               </div>
            ))}
          </div>
          
          {(!timetable?.upcoming_classes || timetable.upcoming_classes.length === 0) && (
            <div className="text-center py-8">
              <Calendar className="w-16 h-16 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                No Upcoming Classes
              </h3>
              <p className="text-gray-600">
                You don't have any classes scheduled for today.
              </p>
            </div>
          )}
        </div>

        {/* Completed Classes */}
        {timetable?.completed_classes && timetable.completed_classes.length > 0 && (
          <div className="mt-8">
            <h2 className="text-xl font-semibold text-gray-900 mb-4 flex items-center">
              <CheckCircle className="w-5 h-5 mr-2 text-green-600" />
              Completed Classes
            </h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {timetable.completed_classes.map((classItem) => (
                <div key={classItem.id} className="bg-gray-50 rounded-lg p-6 border border-gray-200">
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex-1">
                      <h3 className="font-semibold text-gray-700 mb-1">
                        {classItem.subject_name}
                      </h3>
                      <p className="text-sm text-gray-500 mb-2">
                        {classItem.subject_code}
                      </p>
                      <p className="text-xs text-gray-400 mb-2">
                        {classItem.class_name} {classItem.section_name && `• ${classItem.section_name}`}
                      </p>
                    </div>
                    
                    <div className="text-right">
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                        Completed
                      </span>
                    </div>
                  </div>
                  
                  <div className="space-y-2 text-sm text-gray-500">
                    <div className="flex items-center">
                      <MapPin className="w-4 h-4 mr-2 text-gray-400" />
                      <span>Room {classItem.room_number} • {classItem.building}</span>
                    </div>
                    
                    <div className="flex items-center">
                      <Clock className="w-4 h-4 mr-2 text-gray-400" />
                      <span>{classItem.start_time_str} - {classItem.end_time_str}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
                 )}
       </div>

       {/* Recent Activity & Quick Insights */}
       <div className="mt-8 grid grid-cols-1 lg:grid-cols-2 gap-8">
         {/* Recent Activity */}
         <div className="bg-white rounded-lg p-6 shadow-sm border border-gray-200">
           <div className="flex items-center justify-between mb-4">
             <h3 className="text-lg font-semibold text-gray-900 flex items-center">
               <Zap className="w-5 h-5 mr-2 text-yellow-600" />
               Recent Activity
             </h3>
             <button
               onClick={refreshRequestsData}
               disabled={loading || refreshingRequests}
               className="p-2 text-gray-400 hover:text-gray-600 transition-colors disabled:opacity-50"
               title="Refresh activity"
             >
               {refreshingRequests ? (
                 <Loader2 className="w-4 h-4 animate-spin" />
               ) : (
                 <Zap className="w-4 h-4" />
               )}
             </button>
           </div>
           <div className="space-y-3">
             {recentActivity.length === 0 ? (
               <div className="text-center py-8 text-gray-500">
                 <Zap className="w-8 h-8 mx-auto mb-2 text-gray-300" />
                 <p className="text-sm">No recent activity</p>
               </div>
             ) : (
               recentActivity.map((activity) => (
                 <div key={activity.id} className={`flex items-center p-3 ${activity.bgColor} rounded-lg`}>
                   <div className={`w-2 h-2 ${activity.dotColor} rounded-full mr-3`}></div>
                   <div className="flex-1">
                     <p className="text-sm font-medium text-gray-900">{activity.text}</p>
                     <p className="text-xs text-gray-500">{activity.timeAgo}</p>
                   </div>
                 </div>
               ))
             )}
           </div>
         </div>

         {/* Quick Insights */}
         <div className="bg-white rounded-lg p-6 shadow-sm border border-gray-200">
           <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
             <Target className="w-5 h-5 mr-2 text-red-600" />
             Quick Insights
           </h3>
           <div className="space-y-4">
             <div className="flex items-center justify-between p-3 bg-yellow-50 rounded-lg">
               <div className="flex items-center">
                 <AlertCircle className="w-4 h-4 text-yellow-600 mr-2" />
                 <span className="text-sm text-gray-700">Low attendance alert</span>
               </div>
               <span className="text-xs text-yellow-600 font-medium">Physics I</span>
             </div>
             <div className="flex items-center justify-between p-3 bg-green-50 rounded-lg">
               <div className="flex items-center">
                 <Award className="w-4 h-4 text-green-600 mr-2" />
                 <span className="text-sm text-gray-700">High performance</span>
               </div>
               <span className="text-xs text-green-600 font-medium">Calculus I</span>
             </div>
             <div className="flex items-center justify-between p-3 bg-blue-50 rounded-lg">
               <div className="flex items-center">
                 <BookOpenCheck className="w-4 h-4 text-blue-600 mr-2" />
                 <span className="text-sm text-gray-700">Assignment due soon</span>
               </div>
               <span className="text-xs text-blue-600 font-medium">CS101</span>
             </div>
           </div>
         </div>
       </div>
     </div>
   );
 };

export default TeacherTimetable;
