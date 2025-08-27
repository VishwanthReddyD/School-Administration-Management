import React, { useEffect, useState } from 'react';
import scheduleService from '../services/scheduleService';
import { AlertCircle, Calendar, Clock, MapPin, BookOpen, Users } from 'lucide-react';

const TeacherFullSchedule = () => {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);
        setError(null);
        const res = await scheduleService.getPersonalSchedule();
        const list = Array.isArray(res.full_schedule) ? res.full_schedule : (res.data || []);
        setData(list);
      } catch (e) {
        setError('Failed to load schedule');
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const getDayName = (dayNumber) => {
    const days = ['', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
    return days[dayNumber] || `Day ${dayNumber}`;
  };

  const getTimeSlot = (startTime, endTime) => {
    return `${startTime} - ${endTime}`;
  };

  const getSubjectColor = (subjectName) => {
    const colors = {
      'Mathematics': 'bg-blue-100 text-blue-800 border-blue-200',
      'Physics': 'bg-purple-100 text-purple-800 border-purple-200',
      'Chemistry': 'bg-green-100 text-green-800 border-green-200',
      'Biology': 'bg-emerald-100 text-emerald-800 border-emerald-200',
      'English': 'bg-orange-100 text-orange-800 border-orange-200',
      'History': 'bg-red-100 text-red-800 border-red-200',
      'Geography': 'bg-indigo-100 text-indigo-800 border-indigo-200',
      'Computer Science': 'bg-cyan-100 text-cyan-800 border-cyan-200'
    };
    return colors[subjectName] || 'bg-gray-100 text-gray-800 border-gray-200';
  };

  const groupByDay = (schedules) => {
    const grouped = {};
    schedules.forEach(schedule => {
      const day = schedule.day_of_week;
      if (!grouped[day]) {
        grouped[day] = [];
      }
      grouped[day].push(schedule);
    });
    return grouped;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading your schedule...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <AlertCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Error Loading Schedule</h2>
          <p className="text-red-600">{error}</p>
        </div>
      </div>
    );
  }

  const groupedSchedules = groupByDay(data);
  const sortedDays = Object.keys(groupedSchedules).sort((a, b) => parseInt(a) - parseInt(b));

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8 text-center">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-blue-100 rounded-full mb-4">
            <Calendar className="w-8 h-8 text-blue-600" />
          </div>
          <h1 className="text-4xl font-bold text-gray-900 mb-2">Full Schedule</h1>
          <p className="text-lg text-gray-600">Your complete weekly teaching schedule</p>
        </div>

        {data.length === 0 ? (
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-12 text-center">
            <Calendar className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <h3 className="text-xl font-medium text-gray-900 mb-2">No Schedule Found</h3>
            <p className="text-gray-600">Your teaching schedule will appear here once it's configured.</p>
          </div>
        ) : (
          <div className="space-y-6">
            {sortedDays.map(day => (
              <div key={day} className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                <div className="bg-gradient-to-r from-blue-600 to-blue-700 px-6 py-4">
                  <h2 className="text-xl font-semibold text-white flex items-center">
                    <Calendar className="w-5 h-5 mr-2" />
                    {getDayName(parseInt(day))}
                  </h2>
                </div>
                
                <div className="p-6">
                  <div className="grid gap-4">
                    {groupedSchedules[day]
                      .sort((a, b) => a.start_time.localeCompare(b.start_time))
                      .map((schedule, index) => (
                        <div 
                          key={schedule.id} 
                          className="flex items-center p-4 bg-gray-50 rounded-lg border border-gray-200 hover:bg-gray-100 transition-colors"
                        >
                          {/* Time Slot */}
                          <div className="flex-shrink-0 w-32 text-center">
                            <div className="bg-white rounded-lg p-3 border border-gray-200">
                              <div className="text-sm font-medium text-gray-900">
                                {schedule.start_time}
                              </div>
                              <div className="text-xs text-gray-500">to</div>
                              <div className="text-sm font-medium text-gray-900">
                                {schedule.end_time}
                              </div>
                            </div>
                          </div>

                          {/* Subject Info */}
                          <div className="flex-1 ml-4">
                            <div className="flex items-center mb-2">
                              <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium border ${getSubjectColor(schedule.subject_name)}`}>
                                <BookOpen className="w-4 h-4 mr-1" />
                                {schedule.subject_name}
                              </span>
                              {schedule.subject_code && (
                                <span className="ml-2 text-sm text-gray-500 font-mono">
                                  ({schedule.subject_code})
                                </span>
                              )}
                            </div>
                            
                            <div className="flex items-center text-sm text-gray-600 space-x-4">
                              <div className="flex items-center">
                                <Users className="w-4 h-4 mr-1" />
                                <span>{schedule.class_name} {schedule.section_name && `• ${schedule.section_name}`}</span>
                              </div>
                              <div className="flex items-center">
                                <MapPin className="w-4 h-4 mr-1" />
                                <span>Room {schedule.room_number}</span>
                                {schedule.building && (
                                  <span className="ml-1 text-gray-500">• {schedule.building}</span>
                                )}
                              </div>
                            </div>
                          </div>

                          {/* Status Indicator */}
                          <div className="flex-shrink-0">
                            <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                          </div>
                        </div>
                      ))}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Summary Stats */}
        {data.length > 0 && (
          <div className="mt-8 bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Schedule Summary</h3>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="text-center p-4 bg-blue-50 rounded-lg">
                <div className="text-2xl font-bold text-blue-600">{sortedDays.length}</div>
                <div className="text-sm text-blue-600">Teaching Days</div>
              </div>
              <div className="text-center p-4 bg-green-50 rounded-lg">
                <div className="text-2xl font-bold text-green-600">{data.length}</div>
                <div className="text-sm text-green-600">Total Classes</div>
              </div>
              <div className="text-center p-4 bg-purple-50 rounded-lg">
                <div className="text-2xl font-bold text-purple-600">
                  {new Set(data.map(s => s.subject_name)).size}
                </div>
                <div className="text-sm text-purple-600">Subjects</div>
              </div>
              <div className="text-center p-4 bg-orange-50 rounded-lg">
                <div className="text-2xl font-bold text-orange-600">
                  {new Set(data.map(s => `${s.class_name}-${s.section_name}`)).size}
                </div>
                <div className="text-sm text-orange-600">Class Sections</div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default TeacherFullSchedule;


