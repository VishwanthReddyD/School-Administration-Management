import React, { useState, useEffect } from 'react';
import { toast } from 'react-hot-toast';
import attendanceService from '../services/attendanceService';
import studentService from '../services/studentService';

const TeacherAttendance = () => {
  const [loading, setLoading] = useState(true);
  const [selectedClass, setSelectedClass] = useState(null);
  const [teacherClasses, setTeacherClasses] = useState([]);
  const [filterDate, setFilterDate] = useState('');
  const [filterSection, setFilterSection] = useState('');
  const [filterClass, setFilterClass] = useState('');
  const [attendanceData, setAttendanceData] = useState([]);
  const [showMarkAttendance, setShowMarkAttendance] = useState(false);
  const [students, setStudents] = useState([]);
  const [newAttendance, setNewAttendance] = useState({});

  useEffect(() => {
    fetchTeacherClasses();
  }, []);

  const fetchTeacherClasses = async () => {
    try {
      setLoading(true);
      const response = await attendanceService.getTeacherClasses();
      if (response.success) {
        setTeacherClasses(response.data || []);
      }
    } catch (error) {
      console.error('Error fetching teacher classes:', error);
      toast.error('Failed to fetch teacher classes');
    } finally {
      setLoading(false);
    }
  };

  const handleClassSelect = async (classItem) => {
    if (!classItem.teaches) {
      toast.error('You don\'t teach any subjects for this class');
      return;
    }

    setSelectedClass(classItem);
    setShowMarkAttendance(false);
    
    try {
      // Fetch students for this class
      const studentsResponse = await studentService.getStudentsByClass(classItem.class_id, classItem.section_id);
      if (studentsResponse.success) {
        setStudents(studentsResponse.data || []);
      }

      // Fetch existing attendance for this class (we'll need to get schedule_id first)
      // For now, we'll show a message that we need to implement this
      setAttendanceData([]);
    } catch (error) {
      console.error('Error fetching class data:', error);
      toast.error('Failed to fetch class data');
    }
  };

  const handleMarkAttendance = async () => {
    try {
      // This would need to be implemented based on the selected class
      // We need to get the schedule_id for the selected class
      toast.error('Attendance marking functionality needs to be implemented');
    } catch (error) {
      console.error('Error marking attendance:', error);
      toast.error('Failed to mark attendance');
    }
  };

  // Helpers for filtering
  const dateToDayOfWeek = (isoDate) => {
    if (!isoDate) return null;
    const d = new Date(isoDate);
    const jsDay = d.getDay(); // 0-6 (Sun-Sat)
    return jsDay === 0 ? 7 : jsDay; // 1-7 (Mon-Sun)
  };

  // Get unique classes for filter dropdown
  const uniqueClasses = Array.from(
    new Map(
      teacherClasses
        .filter(c => c.teaches)
        .map(c => [c.class_id, c.class_name])
    ).entries()
  ).map(([id, name]) => ({ id, name }));

  // Get unique sections for filter dropdown
  const uniqueSections = Array.from(
    new Map(
      teacherClasses
        .filter(c => c.teaches && c.section_id)
        .map(c => [c.section_id, c.section_name])
    ).entries()
  ).map(([id, name]) => ({ id, name }));

  // Filter classes based on selected filters
  const filteredClasses = teacherClasses.filter(c => {
    const byClass = !filterClass || c.class_id === filterClass;
    const bySection = !filterSection || c.section_id === filterSection;
    return byClass && bySection;
  });

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading teacher classes...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Attendance Management</h1>
          <p className="mt-2 text-gray-600">Manage student attendance for your classes</p>
        </div>

        {/* Filters */}
        <div className="mb-6 grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm text-gray-600 mb-1">Class</label>
            <select
              value={filterClass || ''}
              onChange={(e) => setFilterClass(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">All Classes</option>
              {uniqueClasses.map(cls => (
                <option key={cls.id} value={cls.id}>
                  {cls.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm text-gray-600 mb-1">Section</label>
            <select
              value={filterSection}
              onChange={(e) => setFilterSection(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">All Sections</option>
              {uniqueSections.map(s => (
                <option key={s.id} value={s.id}>{s.name}</option>
              ))}
            </select>
          </div>
          <div className="flex items-end">
            <button
              onClick={() => { setFilterSection(''); setFilterClass(''); }}
              className="px-4 py-2 bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200"
            >
              Clear Filters
            </button>
          </div>
        </div>

        {/* Class Selection */}
        <div className="mb-8">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Available Classes</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredClasses.map((classItem) => (
              <div
                key={`${classItem.class_id}-${classItem.section_id || 'no-section'}`}
                onClick={() => handleClassSelect(classItem)}
                className={`p-4 rounded-lg border-2 cursor-pointer transition-all duration-200 ${
                  selectedClass?.class_id === classItem.class_id && 
                  selectedClass?.section_id === classItem.section_id
                    ? 'border-blue-500 bg-blue-50'
                    : classItem.teaches
                    ? 'border-green-200 hover:border-green-300 hover:shadow-md bg-green-50'
                    : 'border-gray-200 bg-gray-100 cursor-not-allowed'
                }`}
              >
                <div className="flex justify-between items-start mb-2">
                  <h3 className="font-semibold text-gray-900">
                    {classItem.class_name}
                    {classItem.section_name && ` - Section ${classItem.section_name}`}
                  </h3>
                  {classItem.teaches && (
                    <span className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded">
                      Teaching
                    </span>
                  )}
                </div>
                
                {classItem.teaches ? (
                  <div className="space-y-1 text-sm text-gray-600">
                    <div className="flex items-center">
                      <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.246 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                      </svg>
                      {classItem.subject_name} ({classItem.subject_code})
                    </div>
                    <div className="flex items-center">
                      <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      {classItem.attendance_count} attendance records
                    </div>
                  </div>
                ) : (
                  <div className="text-sm text-gray-500 italic">
                    You don't teach any subjects for this class
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Selected Class Details and Attendance */}
        {selectedClass && selectedClass.teaches && (
          <div className="bg-white rounded-lg shadow-md p-6">
            <div className="flex justify-between items-center mb-6">
              <div>
                <h2 className="text-xl font-semibold text-gray-900">
                  {selectedClass.subject_name} - {selectedClass.class_name}
                  {selectedClass.section_name && ` Section ${selectedClass.section_name}`}
                </h2>
                <p className="text-gray-600">
                  Subject Code: {selectedClass.subject_code}
                </p>
                <p className="text-gray-600">
                  Total Attendance Records: {selectedClass.attendance_count}
                </p>
              </div>
              <button
                onClick={() => setShowMarkAttendance(!showMarkAttendance)}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
              >
                {showMarkAttendance ? 'Cancel' : 'Mark Attendance'}
              </button>
            </div>

            {showMarkAttendance && (
              <div className="mb-6 p-4 bg-gray-50 rounded-lg">
                <h3 className="text-lg font-semibold mb-4">Mark Attendance</h3>
                <p className="text-gray-600 mb-4">
                  This functionality needs to be implemented to get the schedule_id for the selected class.
                </p>
                <div className="text-center py-8">
                  <p className="text-gray-500">Attendance marking will be available once schedule integration is complete.</p>
                </div>
              </div>
            )}

            {/* Existing Attendance Records */}
            <div>
              <h3 className="text-lg font-semibold mb-4">Attendance Records</h3>
              {attendanceData.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Student
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Status
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Date
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Marked At
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Notes
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {attendanceData.map((record) => (
                        <tr key={record.id}>
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                            {record.student_name}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                              record.status === 'present' ? 'bg-green-100 text-green-800' :
                              record.status === 'absent' ? 'bg-red-100 text-red-800' :
                              record.status === 'late' ? 'bg-yellow-100 text-yellow-800' :
                              'bg-gray-100 text-gray-800'
                            }`}>
                              {record.status}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {record.date}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {new Date(record.marked_at).toLocaleString()}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {record.notes || '-'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <p className="text-gray-500 text-center py-4">
                  No attendance records found for this class. 
                  {selectedClass.attendance_count > 0 && ' Records may be available but need schedule integration to display.'}
                </p>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default TeacherAttendance;
