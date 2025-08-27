import React, { useState, useEffect } from 'react';
import { AlertTriangle, Clock, Users, MapPin, CheckCircle, XCircle, Calendar } from 'lucide-react';
import { format, parseISO, isWithinInterval, parse } from 'date-fns';

const ConflictDetector = ({ schedules, onConflictResolve }) => {
  const [conflicts, setConflicts] = useState([]);
  const [showResolved, setShowResolved] = useState(false);

  useEffect(() => {
    if (schedules.length > 0) {
      detectConflicts();
    }
  }, [schedules]);

  const detectConflicts = () => {
    const detectedConflicts = [];
    
    // Check for overlapping time slots
    for (let i = 0; i < schedules.length; i++) {
      for (let j = i + 1; j < schedules.length; j++) {
        const schedule1 = schedules[i];
        const schedule2 = schedules[j];
        
        // Check if schedules are on the same day
        if (schedule1.dayOfWeek === schedule2.dayOfWeek) {
          const start1 = parse(schedule1.startTime, 'HH:mm', new Date());
          const end1 = parse(schedule1.endTime, 'HH:mm', new Date());
          const start2 = parse(schedule2.startTime, 'HH:mm', new Date());
          const end2 = parse(schedule2.endTime, 'HH:mm', new Date());
          
          // Check for time overlap
          if (start1 < end2 && start2 < end1) {
            // Check teacher conflict
            if (schedule1.teacherId === schedule2.teacherId) {
              detectedConflicts.push({
                id: `teacher-${schedule1.id}-${schedule2.id}`,
                type: 'teacher',
                severity: 'high',
                message: `Teacher conflict: ${schedule1.teacher} has overlapping classes`,
                schedule1,
                schedule2,
                conflictTime: `${format(start1, 'HH:mm')} - ${format(end1, 'HH:mm')} vs ${format(start2, 'HH:mm')} - ${format(end2, 'HH:mm')}`,
                day: schedule1.dayOfWeek,
                resolved: false
              });
            }
            
            // Check classroom conflict
            if (schedule1.classroomId === schedule2.classroomId) {
              detectedConflicts.push({
                id: `classroom-${schedule1.id}-${schedule2.id}`,
                type: 'classroom',
                severity: 'high',
                message: `Classroom conflict: ${schedule1.classroom} is double-booked`,
                schedule1,
                schedule2,
                conflictTime: `${format(start1, 'HH:mm')} - ${format(end1, 'HH:mm')} vs ${format(start2, 'HH:mm')} - ${format(end2, 'HH:mm')}`,
                day: schedule1.dayOfWeek,
                resolved: false
              });
            }
          }
        }
      }
    }
    
    // Check for teacher workload issues (more than 6 hours per day)
    const teacherDailyHours = {};
    schedules.forEach(schedule => {
      const teacherId = schedule.teacherId;
      const day = schedule.dayOfWeek;
      const start = parse(schedule.startTime, 'HH:mm', new Date());
      const end = parse(schedule.endTime, 'HH:mm', new Date());
      const duration = (end - start) / (1000 * 60 * 60); // hours
      
      if (!teacherDailyHours[teacherId]) {
        teacherDailyHours[teacherId] = {};
      }
      if (!teacherDailyHours[teacherId][day]) {
        teacherDailyHours[teacherId][day] = 0;
      }
      teacherDailyHours[teacherId][day] += duration;
    });
    
    Object.entries(teacherDailyHours).forEach(([teacherId, days]) => {
      Object.entries(days).forEach(([day, hours]) => {
        if (hours > 6) {
          const teacherSchedule = schedules.find(s => s.teacherId === parseInt(teacherId) && s.dayOfWeek === day);
          detectedConflicts.push({
            id: `workload-${teacherId}-${day}`,
            type: 'workload',
            severity: 'medium',
            message: `Workload issue: Teacher has ${hours.toFixed(1)} hours on ${day}`,
            schedule1: teacherSchedule,
            schedule2: null,
            conflictTime: `${hours.toFixed(1)} hours`,
            day,
            resolved: false
          });
        }
      });
    });
    
    // Check for classroom capacity issues
    schedules.forEach(schedule => {
      if (schedule.classroom && schedule.classroom.capacity && schedule.students && schedule.students.length > schedule.classroom.capacity) {
        detectedConflicts.push({
          id: `capacity-${schedule.id}`,
          type: 'capacity',
          severity: 'low',
          message: `Capacity issue: ${schedule.students.length} students for ${schedule.classroom.capacity} capacity`,
          schedule1: schedule,
          schedule2: null,
          conflictTime: `${schedule.students.length}/${schedule.classroom.capacity}`,
          day: schedule.dayOfWeek,
          resolved: false
        });
      }
    });
    
    setConflicts(detectedConflicts);
  };

  const resolveConflict = (conflictId) => {
    setConflicts(prev => 
      prev.map(conflict => 
        conflict.id === conflictId 
          ? { ...conflict, resolved: true }
          : conflict
      )
    );
    
    if (onConflictResolve) {
      const conflict = conflicts.find(c => c.id === conflictId);
      onConflictResolve(conflict);
    }
  };

  const getSeverityColor = (severity) => {
    switch (severity) {
      case 'high': return 'text-red-600 bg-red-50 border-red-200';
      case 'medium': return 'text-yellow-600 bg-yellow-50 border-yellow-200';
      case 'low': return 'text-blue-600 bg-blue-50 border-blue-200';
      default: return 'text-gray-600 bg-gray-50 border-gray-200';
    }
  };

  const getSeverityIcon = (severity) => {
    switch (severity) {
      case 'high': return <AlertTriangle className="w-5 h-5 text-red-600" />;
      case 'medium': return <AlertTriangle className="w-5 h-5 text-yellow-600" />;
      case 'low': return <AlertTriangle className="w-5 h-5 text-blue-600" />;
      default: return <AlertTriangle className="w-5 h-5 text-gray-600" />;
    }
  };

  const filteredConflicts = showResolved 
    ? conflicts 
    : conflicts.filter(conflict => !conflict.resolved);

  const unresolvedCount = conflicts.filter(c => !c.resolved).length;
  const resolvedCount = conflicts.filter(c => c.resolved).length;

  return (
    <div className="bg-white rounded-lg shadow-lg p-6">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h3 className="text-xl font-semibold text-gray-800">Conflict Detection</h3>
          <p className="text-sm text-gray-600">
            Automatically detects scheduling conflicts and issues
          </p>
        </div>
        <div className="flex items-center gap-4">
          <div className="text-sm">
            <span className="text-red-600 font-medium">{unresolvedCount}</span> unresolved
            {resolvedCount > 0 && (
              <span className="text-gray-500 ml-2">
                • <span className="text-green-600 font-medium">{resolvedCount}</span> resolved
              </span>
            )}
          </div>
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={showResolved}
              onChange={(e) => setShowResolved(e.target.checked)}
              className="rounded border-gray-300"
            />
            Show resolved
          </label>
        </div>
      </div>

      {filteredConflicts.length === 0 ? (
        <div className="text-center py-8">
          <CheckCircle className="w-12 h-12 text-green-500 mx-auto mb-4" />
          <p className="text-gray-600">
            {conflicts.length === 0 
              ? 'No conflicts detected. All schedules are valid!'
              : 'No unresolved conflicts to display.'
            }
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredConflicts.map(conflict => (
            <div
              key={conflict.id}
              className={`border rounded-lg p-4 ${getSeverityColor(conflict.severity)} ${
                conflict.resolved ? 'opacity-60' : ''
              }`}
            >
              <div className="flex items-start justify-between">
                <div className="flex items-start gap-3 flex-1">
                  {getSeverityIcon(conflict.severity)}
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <h4 className="font-medium">{conflict.message}</h4>
                      {conflict.resolved && (
                        <span className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded-full">
                          Resolved
                        </span>
                      )}
                    </div>
                    
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div className="flex items-center gap-2">
                        <Clock className="w-4 h-4" />
                        <span>{conflict.conflictTime}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Calendar className="w-4 h-4" />
                        <span>{conflict.day}</span>
                      </div>
                    </div>
                    
                    {conflict.schedule1 && (
                      <div className="mt-3 p-3 bg-white rounded border">
                        <div className="flex items-center gap-2 mb-2">
                          <Users className="w-4 h-4" />
                          <span className="font-medium">Schedule 1:</span>
                        </div>
                        <div className="text-sm text-gray-600">
                          {conflict.schedule1.title} - {conflict.schedule1.teacher} - {conflict.schedule1.classroom}
                        </div>
                      </div>
                    )}
                    
                    {conflict.schedule2 && (
                      <div className="mt-2 p-3 bg-white rounded border">
                        <div className="flex items-center gap-2 mb-2">
                          <Users className="w-4 h-4" />
                          <span className="font-medium">Schedule 2:</span>
                        </div>
                        <div className="text-sm text-gray-600">
                          {conflict.schedule2.title} - {conflict.schedule2.teacher} - {conflict.schedule2.classroom}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
                
                {!conflict.resolved && (
                  <button
                    onClick={() => resolveConflict(conflict.id)}
                    className="text-sm bg-green-600 text-white px-3 py-1 rounded hover:bg-green-700 transition-colors"
                  >
                    Mark Resolved
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
      
      {conflicts.length > 0 && (
        <div className="mt-6 p-4 bg-gray-50 rounded-lg">
          <h4 className="font-medium text-gray-800 mb-2">Conflict Types:</h4>
          <div className="grid grid-cols-2 gap-4 text-sm text-gray-600">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 bg-red-500 rounded-full"></div>
              <span>High: Teacher/Classroom conflicts</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 bg-yellow-500 rounded-full"></div>
              <span>Medium: Workload issues</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
              <span>Low: Capacity issues</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ConflictDetector;
