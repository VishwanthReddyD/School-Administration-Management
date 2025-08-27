import React, { useState, useEffect, useRef } from 'react';
import FullCalendar from '@fullcalendar/react';
import dayGridPlugin from '@fullcalendar/daygrid';
import timeGridPlugin from '@fullcalendar/timegrid';
import interactionPlugin from '@fullcalendar/interaction';
import { toast } from 'react-hot-toast';
import { Calendar, Clock, Users, MapPin, Edit, Trash2, Plus } from 'lucide-react';
import { format } from 'date-fns';
import teacherService from '../../src/services/teacherService';
import subjectService from '../../src/services/subjectService';
import classroomService from '../../src/services/classroomService';

const CalendarComponent = ({ schedules, onScheduleCreate, onScheduleUpdate, onScheduleDelete }) => {
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [showEventModal, setShowEventModal] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [formData, setFormData] = useState({
    title: '',
    teacherId: '',
    subjectId: '',
    classroomId: '',
    startTime: '',
    endTime: '',
    dayOfWeek: '',
    startDate: '',
    endDate: ''
  });
  const [teachers, setTeachers] = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [classrooms, setClassrooms] = useState([]);
  const calendarRef = useRef(null);

  useEffect(() => {
    // Fetch teachers, subjects, and classrooms for the form
    fetchFormData();
  }, []);

  const fetchFormData = async () => {
    try {
      const [teachersRes, subjectsRes, classroomsRes] = await Promise.all([
        teacherService.getAll(),
        subjectService.getAll(),
        classroomService.getAll(),
      ]);
      setTeachers(teachersRes.data || teachersRes || []);
      setSubjects(subjectsRes.data || subjectsRes || []);
      setClassrooms(classroomsRes.data || classroomsRes || []);
    } catch (error) {
      console.error(error);
      toast.error('Failed to fetch form data');
    }
  };

  const handleDateSelect = (selectInfo) => {
    setFormData({
      ...formData,
      startDate: selectInfo.startStr,
      endDate: selectInfo.endStr,
      startTime: format(selectInfo.start, 'HH:mm'),
      endTime: format(selectInfo.end, 'HH:mm')
    });
    setShowCreateModal(true);
  };

  const handleEventClick = (clickInfo) => {
    setSelectedEvent(clickInfo.event);
    setShowEventModal(true);
  };

  const handleEventDrop = (dropInfo) => {
    const event = dropInfo.event;
    const updatedSchedule = {
      id: event.id,
      startTime: format(event.start, 'HH:mm'),
      endTime: format(event.end, 'HH:mm'),
      dayOfWeek: format(event.start, 'EEEE'),
      startDate: format(event.start, 'yyyy-MM-dd'),
      endDate: format(event.end, 'yyyy-MM-dd')
    };
    
    onScheduleUpdate(updatedSchedule);
    toast.success('Schedule updated successfully');
  };

  const handleEventResize = (resizeInfo) => {
    const event = resizeInfo.event;
    const updatedSchedule = {
      id: event.id,
      startTime: format(event.start, 'HH:mm'),
      endTime: format(event.end, 'HH:mm')
    };
    
    onScheduleUpdate(updatedSchedule);
    toast.success('Schedule duration updated');
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    
    if (!formData.teacherId || !formData.subjectId || !formData.classroomId) {
      toast.error('Please fill in all required fields');
      return;
    }

    const newSchedule = {
      ...formData,
      id: Date.now().toString(),
      title: `${subjects.find(s => s.id === parseInt(formData.subjectId))?.name} - ${teachers.find(t => t.id === parseInt(formData.teacherId))?.name}`,
      backgroundColor: subjects.find(s => s.id === parseInt(formData.subjectId))?.color
    };

    onScheduleCreate(newSchedule);
    setShowCreateModal(false);
    setFormData({
      title: '',
      teacherId: '',
      subjectId: '',
      classroomId: '',
      startTime: '',
      endTime: '',
      dayOfWeek: '',
      startDate: '',
      endDate: ''
    });
    toast.success('Schedule created successfully');
  };

  const handleDelete = () => {
    if (selectedEvent) {
      onScheduleDelete(selectedEvent.id);
      setShowEventModal(false);
      setSelectedEvent(null);
      toast.success('Schedule deleted successfully');
    }
  };

  const events = schedules.map(schedule => ({
    id: schedule.id,
    title: schedule.title,
    start: `${schedule.startDate}T${schedule.startTime}`,
    end: `${schedule.endDate}T${schedule.endTime}`,
    backgroundColor: schedule.backgroundColor || '#3B82F6',
    borderColor: schedule.backgroundColor || '#3B82F6',
    extendedProps: {
      teacher: schedule.teacher,
      subject: schedule.subject,
      classroom: schedule.classroom,
      dayOfWeek: schedule.dayOfWeek
    }
  }));

  return (
    <div className="bg-white rounded-lg shadow-lg p-6">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold text-gray-800">Timetable Calendar</h2>
        <button
          onClick={() => setShowCreateModal(true)}
          className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg flex items-center gap-2 transition-colors"
        >
          <Plus className="w-4 h-4" />
          Add Schedule
        </button>
      </div>

      <div className="calendar-container">
        <FullCalendar
          ref={calendarRef}
          plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin]}
          headerToolbar={{
            left: 'prev,next today',
            center: 'title',
            right: 'dayGridMonth,timeGridWeek,timeGridDay'
          }}
          initialView="timeGridWeek"
          editable={true}
          selectable={true}
          selectMirror={true}
          dayMaxEvents={true}
          weekends={true}
          events={events}
          select={handleDateSelect}
          eventClick={handleEventClick}
          eventDrop={handleEventDrop}
          eventResize={handleEventResize}
          height="auto"
          slotMinTime="07:00:00"
          slotMaxTime="22:00:00"
          allDaySlot={false}
          slotDuration="00:30:00"
          selectConstraint={{
            startTime: '07:00',
            endTime: '22:00',
            dows: [1, 2, 3, 4, 5] // Monday to Friday
          }}
          businessHours={{
            daysOfWeek: [1, 2, 3, 4, 5],
            startTime: '07:00',
            endTime: '22:00',
          }}
        />
      </div>

      {/* Create Schedule Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h3 className="text-lg font-semibold mb-4">Create New Schedule</h3>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Teacher
                </label>
                <select
                  value={formData.teacherId}
                  onChange={(e) => setFormData({...formData, teacherId: e.target.value})}
                  className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                >
                  <option value="">Select Teacher</option>
                  {teachers.map(teacher => (
                    <option key={teacher.id} value={teacher.id}>
                      {teacher.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Subject
                </label>
                <select
                  value={formData.subjectId}
                  onChange={(e) => setFormData({...formData, subjectId: e.target.value})}
                  className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                >
                  <option value="">Select Subject</option>
                  {subjects.map(subject => (
                    <option key={subject.id} value={subject.id}>
                      {subject.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Classroom
                </label>
                <select
                  value={formData.classroomId}
                  onChange={(e) => setFormData({...formData, classroomId: e.target.value})}
                  className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                >
                  <option value="">Select Classroom</option>
                  {classrooms.map(classroom => (
                    <option key={classroom.id} value={classroom.id}>
                      {classroom.name} ({classroom.building})
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Start Time
                  </label>
                  <input
                    type="time"
                    value={formData.startTime}
                    onChange={(e) => setFormData({...formData, startTime: e.target.value})}
                    className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    End Time
                  </label>
                  <input
                    type="time"
                    value={formData.endTime}
                    onChange={(e) => setFormData({...formData, endTime: e.target.value})}
                    className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required
                  />
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-4 py-2 text-gray-600 border border-gray-300 rounded-md hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                >
                  Create Schedule
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Event Details Modal */}
      {showEventModal && selectedEvent && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h3 className="text-lg font-semibold mb-4">Schedule Details</h3>
            <div className="space-y-3 mb-6">
              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4 text-gray-500" />
                <span className="text-sm text-gray-600">
                  {format(selectedEvent.start, 'EEEE, MMMM d, yyyy')}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-gray-500" />
                <span className="text-sm text-gray-600">
                  {format(selectedEvent.start, 'HH:mm')} - {format(selectedEvent.end, 'HH:mm')}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <Users className="w-4 h-4 text-gray-500" />
                <span className="text-sm text-gray-600">
                  {selectedEvent.extendedProps.teacher || 'Teacher'}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <MapPin className="w-4 h-4 text-gray-500" />
                <span className="text-sm text-gray-600">
                  {selectedEvent.extendedProps.classroom || 'Classroom'}
                </span>
              </div>
            </div>

            <div className="flex justify-end gap-3">
              <button
                onClick={handleDelete}
                className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 flex items-center gap-2"
              >
                <Trash2 className="w-4 h-4" />
                Delete
              </button>
              <button
                onClick={() => setShowEventModal(false)}
                className="px-4 py-2 text-gray-600 border border-gray-300 rounded-md hover:bg-gray-50"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CalendarComponent;
