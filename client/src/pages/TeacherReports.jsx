import React, { useEffect, useState, useMemo } from 'react';
import attendanceService from '../services/attendanceService';
import classService from '../services/classService';
import sectionService from '../services/sectionService';
import gradeService from '../services/gradeService';
import { TrendingUp, Users, CheckCircle, Clock, AlertCircle } from 'lucide-react';

const StatCard = ({ icon: Icon, label, value, helper }) => (
  <div className="bg-white border rounded-lg p-5 flex items-center shadow-sm">
    <div className="p-3 rounded-lg bg-blue-50 text-blue-600 mr-4">
      <Icon className="w-6 h-6" />
    </div>
    <div>
      <div className="text-sm text-gray-500">{label}</div>
      <div className="text-2xl font-semibold text-gray-900">{value}</div>
      {helper && <div className="text-xs text-gray-500 mt-1">{helper}</div>}
    </div>
  </div>
);

const ProgressBar = ({ percent }) => (
  <div className="w-full bg-gray-200 rounded-full h-2.5">
    <div
      className="bg-green-500 h-2.5 rounded-full"
      style={{ width: `${Math.min(Math.max(Number(percent) || 0, 0), 100)}%` }}
    />
  </div>
);

const TeacherReports = () => {
  const [attendance, setAttendance] = useState({});
  const [grades, setGrades] = useState([]);
  const [loading, setLoading] = useState(true);
  const [teacherClasses, setTeacherClasses] = useState([]);
  const [teacherSections, setTeacherSections] = useState([]);
  const [selectedClass, setSelectedClass] = useState('');
  const [selectedSection, setSelectedSection] = useState('');
  const [error, setError] = useState(null);
  const [attendanceRecords, setAttendanceRecords] = useState([]);

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);
        setError(null);
        
        // Fetch teacher's classes and sections from teacher_subject_class (same as attendance page)
        const classesResponse = await attendanceService.getTeacherClasses();
        if (classesResponse.success) {
          const teacherClassesData = classesResponse.data || [];
          setTeacherClasses(teacherClassesData);
          
          // Extract unique sections from teacher classes
          const uniqueSections = [...new Map(
            teacherClassesData
              .filter(cls => cls.section_id)
              .map(cls => [cls.section_id, cls.section_name])
          ).entries()].map(([id, name]) => ({ id, name }));
          setTeacherSections(uniqueSections);
        }

        const [att, gr] = await Promise.all([
          attendanceService.getTeacherStats().catch(() => ({ data: {} })),
          gradeService.getTeacherGrades().catch(() => ({ data: [] })),
        ]);
        setAttendance(att?.data || {});
        setGrades(gr?.data || []);
      } catch (e) {
        setError('Failed to load reports');
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  // Load attendance records when class/section changes
  useEffect(() => {
    if (selectedClass || selectedSection) {
      loadAttendanceRecords();
    }
  }, [selectedClass, selectedSection]);

  const loadAttendanceRecords = async () => {
    try {
      const filters = {};
      if (selectedClass) filters.class_id = selectedClass;
      if (selectedSection) filters.section_id = selectedSection;
      
      const response = await attendanceService.getTeacherReports(filters);
      if (response.success) {
        setAttendanceRecords(response.data || []);
      }
    } catch (error) {
      console.error('Error loading attendance records:', error);
    }
  };

  const gradeSummary = useMemo(() => {
    if (!Array.isArray(grades) || grades.length === 0) return null;
    const total = grades.length;
    const avg = (
      grades.reduce((acc, g) => acc + (Number(g.score) / Number(g.max_score || 1)) * 100, 0) / total
    ).toFixed(1);
    const best = Math.max(...grades.map(g => (Number(g.score) / Number(g.max_score || 1)) * 100)).toFixed(0);
    const worst = Math.min(...grades.map(g => (Number(g.score) / Number(g.max_score || 1)) * 100)).toFixed(0);
    const uniqueStudents = new Set(grades.map(g => g.student_id)).size;
    return { total, avg, best, worst, uniqueStudents };
  }, [grades]);

  if (loading) return <div className="p-6">Loading…</div>;
  if (error) {
    return (
      <div className="p-6">
        <div className="flex items-center text-red-600"><AlertCircle className="w-5 h-5 mr-2" /> {error}</div>
      </div>
    );
  }

  const attendanceRate = attendance?.attendance_rate ?? 0;

  return (
    <div className="p-6 space-y-6">
      {/* Filters */}
      <div className="bg-white border rounded p-4 grid grid-cols-1 md:grid-cols-3 gap-4">
        <div>
          <label className="block text-sm text-gray-600 mb-1">Class</label>
          <select
            value={selectedClass}
            onChange={async (e) => {
              const val = e.target.value;
              setSelectedClass(val);
              setSelectedSection('');
              if (val) {
                const att = await attendanceService.getTeacherStats({ class_id: val }).catch(() => ({ data: {} }));
                setAttendance(att?.data || {});
              } else {
                const att = await attendanceService.getTeacherStats().catch(() => ({ data: {} }));
                setAttendance(att?.data || {});
              }
            }}
            className="w-full border rounded px-3 py-2"
          >
            <option value="">All Classes</option>
            {teacherClasses
              .filter(cls => cls.teaches) // Only show classes the teacher teaches
              .map(cls => (
                <option key={cls.class_id} value={cls.class_id}>
                  {cls.class_name} - {cls.section_name} ({cls.subject_name})
                </option>
              ))}
          </select>
        </div>
        <div>
          <label className="block text-sm text-gray-600 mb-1">Section</label>
          <select
            value={selectedSection}
            onChange={async (e) => {
              const val = e.target.value;
              setSelectedSection(val);
              const att = await attendanceService.getTeacherStats({ 
                class_id: selectedClass || undefined, 
                section_id: val || undefined 
              }).catch(() => ({ data: {} }));
              setAttendance(att?.data || {});
            }}
            className="w-full border rounded px-3 py-2"
            disabled={!selectedClass}
          >
            <option value="">All Sections</option>
            {teacherSections
              .filter(section => {
                // Only show sections for the selected class
                if (!selectedClass) return true;
                return teacherClasses.some(cls => 
                  cls.class_id === selectedClass && 
                  cls.section_id === section.id && 
                  cls.teaches
                );
              })
              .map(section => (
                <option key={section.id} value={section.id}>
                  {section.name}
                </option>
              ))}
          </select>
        </div>
        <div className="flex items-end">
          <button
            onClick={() => {
              setSelectedClass('');
              setSelectedSection('');
              setAttendance({});
              setAttendanceRecords([]);
            }}
            className="px-4 py-2 bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200"
          >
            Clear Filters
          </button>
        </div>
      </div>

      {/* Available Classes Section */}
      <div className="bg-white border rounded p-6">
        <h3 className="text-lg font-semibold mb-4">Available Classes</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {teacherClasses.map((cls) => (
            <div
              key={`${cls.class_id}-${cls.section_id}`}
              className={`p-4 rounded-lg border cursor-pointer transition-colors ${
                cls.teaches
                  ? 'bg-green-50 border-green-200 hover:bg-green-100'
                  : 'bg-gray-50 border-gray-200'
              } ${selectedClass === cls.class_id && selectedSection === cls.section_id ? 'ring-2 ring-blue-500' : ''}`}
              onClick={() => {
                if (cls.teaches) {
                  setSelectedClass(cls.class_id);
                  setSelectedSection(cls.section_id);
                }
              }}
            >
              <h4 className="font-medium text-gray-900">
                {cls.class_name} - {cls.section_name}
              </h4>
              {cls.teaches ? (
                <div className="mt-2 text-sm text-gray-600">
                  <p>Teaching: {cls.subject_name} ({cls.subject_code})</p>
                  <p>Attendance Count: {cls.attendance_count || 0}</p>
                </div>
              ) : (
                <p className="mt-2 text-sm text-gray-500">
                  You don't teach any subjects for this class
                </p>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Selected Class Details */}
      {selectedClass && selectedSection && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <h4 className="font-medium text-blue-900 mb-2">Selected Class</h4>
          {(() => {
            const selectedClassData = teacherClasses.find(cls => 
              cls.class_id === selectedClass && 
              cls.section_id === selectedSection && 
              cls.teaches
            );
            if (selectedClassData) {
              return (
                <div className="text-sm text-blue-800">
                  <p><strong>Class:</strong> {selectedClassData.class_name} - {selectedClassData.section_name}</p>
                  <p><strong>Subject:</strong> {selectedClassData.subject_name} ({selectedClassData.subject_code})</p>
                  <p><strong>Attendance Count:</strong> {selectedClassData.attendance_count || 0}</p>
                </div>
              );
            }
            return <p className="text-sm text-blue-600">No class selected</p>;
          })()}
        </div>
      )}

      {/* Top stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <StatCard icon={Users} label="Total Classes" value={attendance?.total_classes || 0} />
        <StatCard icon={CheckCircle} label="Classes With Attendance" value={attendance?.classes_with_attendance || 0} />
        <StatCard icon={TrendingUp} label="Attendance Rate" value={`${attendanceRate}%`} helper={<ProgressBar percent={attendanceRate} />} />
        <StatCard icon={Clock} label="Records" value={attendance?.total_attendance_records || 0} helper={`${attendance?.present_count || 0} present • ${attendance?.late_count || 0} late`} />
      </div>

      {/* Attendance breakdown */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white border rounded-lg p-4">
          <div className="text-sm text-gray-500">Present</div>
          <div className="text-xl font-semibold text-gray-900">{attendance?.present_count || 0}</div>
        </div>
        <div className="bg-white border rounded-lg p-4">
          <div className="text-sm text-gray-500">Late</div>
          <div className="text-xl font-semibold text-gray-900">{attendance?.late_count || 0}</div>
        </div>
        <div className="bg-white border rounded-lg p-4">
          <div className="text-sm text-gray-500">Absent</div>
          <div className="text-xl font-semibold text-gray-900">{attendance?.absent_count || 0}</div>
        </div>
        <div className="bg-white border rounded-lg p-4">
          <div className="text-sm text-gray-500">Excused</div>
          <div className="text-xl font-semibold text-gray-900">{attendance?.excused_count || 0}</div>
        </div>
      </div>

      {/* Attendance Records */}
      {attendanceRecords.length > 0 && (
        <div className="bg-white border rounded p-6">
          <h3 className="text-lg font-semibold mb-4">Recent Attendance Records</h3>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Student
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Class & Section
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Subject
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Date & Time
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Location
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {attendanceRecords.slice(0, 10).map((record) => (
                  <tr key={record.id}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {record.student_name}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      <div>
                        <div className="font-medium">Class {record.class_name}</div>
                        <div className="text-gray-500">Section {record.section_name}</div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      <div>
                        <div className="font-medium">{record.subject_name}</div>
                        <div className="text-gray-500">{record.subject_code}</div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      <div>
                        <div>{record.date}</div>
                        <div className="text-gray-500">
                          {record.start_time} - {record.end_time}
                        </div>
                      </div>
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
                      <div>
                        <div>Room {record.room_number}</div>
                        <div className="text-gray-500">
                          {record.building} (Floor {record.floor})
                        </div>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {attendanceRecords.length > 10 && (
            <div className="mt-4 text-center text-sm text-gray-500">
              Showing first 10 of {attendanceRecords.length} records
            </div>
          )}
        </div>
      )}

      {/* Grade summary */}
      <div className="bg-white border rounded p-5">
        <h2 className="text-lg font-semibold mb-4">Grade Summary</h2>
        {gradeSummary ? (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <div className="text-sm text-gray-500">Average %</div>
              <div className="text-2xl font-semibold">{gradeSummary.avg}%</div>
            </div>
            <div>
              <div className="text-sm text-gray-500">Best %</div>
              <div className="text-2xl font-semibold">{gradeSummary.best}%</div>
            </div>
            <div>
              <div className="text-sm text-gray-500">Worst %</div>
              <div className="text-2xl font-semibold">{gradeSummary.worst}%</div>
            </div>
            <div>
              <div className="text-sm text-gray-500">Unique Students</div>
              <div className="text-2xl font-semibold">{gradeSummary.uniqueStudents}</div>
            </div>
          </div>
        ) : (
          <div className="text-gray-600">No grade data yet.</div>
        )}
      </div>

      {/* Recent grades */}
      <div className="bg-white border rounded p-5">
        <h2 className="text-lg font-semibold mb-3">Recent Grades</h2>
        {grades.length === 0 ? (
          <div className="text-gray-600">No grade records yet.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Student</th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Subject</th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Title</th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Score</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {grades.map((g) => (
                  <tr key={`${g.student_id}-${g.subject_id}-${g.title}-${g.score}`}>
                    <td className="px-4 py-2 text-sm text-gray-700">{g.student_name || g.student_id}</td>
                    <td className="px-4 py-2 text-sm text-gray-700">{g.subject_name || g.subject_id}</td>
                    <td className="px-4 py-2 text-sm text-gray-700">{g.title}</td>
                    <td className="px-4 py-2 text-sm text-gray-700">{Number(g.score).toFixed(2)}/{Number(g.max_score).toFixed(2)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default TeacherReports;


