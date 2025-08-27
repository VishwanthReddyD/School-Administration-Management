import React, { useState, useEffect } from 'react';
import { BarChart3, Plus, Edit, Trash2, Search, Filter } from 'lucide-react';
import gradeService from '../services/gradeService';
import scheduleService from '../services/scheduleService';
import attendanceService from '../services/attendanceService';
import { useAuth } from '../context/AuthContext';

const TeacherGrades = () => {
  const { user } = useAuth();
  const [grades, setGrades] = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [teacherClasses, setTeacherClasses] = useState([]);
  const [teacherSections, setTeacherSections] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedSubject, setSelectedSubject] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [filterClass, setFilterClass] = useState('');
  const [filterSection, setFilterSection] = useState('');
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingGrade, setEditingGrade] = useState(null);
  const [formData, setFormData] = useState({
    student_id: '',
    student_name: '',
    subject_id: '',
    subject_name: '',
    assignment_type: '',
    title: '',
    score: '',
    max_score: '100',
    grade_letter: '',
    feedback: ''
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      // Fetch current teacher's grades
      const gradesResponse = await gradeService.getTeacherGrades();
      if (gradesResponse?.success) {
        setGrades(gradesResponse.data || []);
      } else {
        setGrades(gradesResponse?.data || gradesResponse || []);
      }

      // Fetch teacher's subjects from schedule
      const scheduleResponse = await scheduleService.getPersonalSchedule();
      const scheduleList = Array.isArray(scheduleResponse.full_schedule) ? scheduleResponse.full_schedule : (scheduleResponse.data || []);
      const uniqueSubjects = [...new Map(
        scheduleList.map(schedule => [schedule.subject_id, schedule.subject_name])
      ).entries()].map(([id, name]) => ({ id, name }));
      setSubjects(uniqueSubjects);

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
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAddGrade = async (e) => {
    e.preventDefault();
    try {
      const response = await gradeService.addGrade(formData);
      if (response.success) {
        setShowAddForm(false);
        setFormData({
          student_id: '',
          student_name: '',
          subject_id: '',
          subject_name: '',
          assignment_type: '',
          title: '',
          score: '',
          max_score: '100',
          grade_letter: '',
          feedback: ''
        });
        fetchData();
      }
    } catch (error) {
      console.error('Error adding grade:', error);
    }
  };

  const handleUpdateGrade = async (e) => {
    e.preventDefault();
    try {
      const response = await gradeService.updateGrade(editingGrade.id, {
        score: formData.score,
        max_score: formData.max_score,
        grade_letter: formData.grade_letter,
        feedback: formData.feedback
      });
      if (response.success) {
        setEditingGrade(null);
        setFormData({
          student_id: '',
          student_name: '',
          subject_id: '',
          subject_name: '',
          assignment_type: '',
          title: '',
          score: '',
          max_score: '100',
          grade_letter: '',
          feedback: ''
        });
        fetchData();
      }
    } catch (error) {
      console.error('Error updating grade:', error);
    }
  };

  const handleDeleteGrade = async (gradeId) => {
    if (window.confirm('Are you sure you want to delete this grade?')) {
      try {
        const response = await gradeService.deleteGrade(gradeId);
        if (response.success) {
          fetchData();
        }
      } catch (error) {
        console.error('Error deleting grade:', error);
      }
    }
  };

  const handleEditGrade = (grade) => {
    setEditingGrade(grade);
    setFormData({
      student_id: grade.student_id,
      student_name: grade.student_name,
      subject_id: grade.subject_id,
      subject_name: grade.subject_name,
      assignment_type: grade.assignment_type,
      title: grade.title,
      score: grade.score.toString(),
      max_score: grade.max_score.toString(),
      grade_letter: grade.grade_letter,
      feedback: grade.feedback
    });
  };

  const filteredGrades = grades.filter(grade => {
    const matchesSubject = !selectedSubject || grade.subject_id === selectedSubject;
    const matchesClass = !filterClass || grade.class_id === filterClass;
    const matchesSection = !filterSection || grade.section_id === filterSection;
    const matchesSearch = !searchTerm || 
      grade.student_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      grade.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      grade.assignment_type.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesSubject && matchesClass && matchesSection && matchesSearch;
  });

  const getGradeColor = (percentage) => {
    if (percentage >= 90) return 'text-green-600';
    if (percentage >= 80) return 'text-blue-600';
    if (percentage >= 70) return 'text-yellow-600';
    if (percentage >= 60) return 'text-orange-600';
    return 'text-red-600';
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Grade Management</h1>
          <p className="mt-2 text-gray-600">Manage student grades and assignments</p>
        </div>

        {/* Controls */}
        <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
          <div className="flex flex-col sm:flex-row gap-4 items-center justify-between">
            <div className="flex flex-col sm:flex-row gap-4 flex-1">
              <div className="flex-1">
                <label className="block text-sm font-medium text-gray-700 mb-1">Subject</label>
                <select
                  value={selectedSubject}
                  onChange={(e) => setSelectedSubject(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">All Subjects</option>
                  {subjects.map(subject => (
                    <option key={subject.id} value={subject.id}>{subject.name}</option>
                  ))}
                </select>
              </div>
              <div className="flex-1">
                <label className="block text-sm font-medium text-gray-700 mb-1">Class</label>
                <select
                  value={filterClass}
                  onChange={(e) => setFilterClass(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
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
              <div className="flex-1">
                <label className="block text-sm font-medium text-gray-700 mb-1">Section</label>
                <select
                  value={filterSection}
                  onChange={(e) => setFilterSection(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">All Sections</option>
                  {teacherSections
                    .filter(section => {
                      // Only show sections for the selected class
                      if (!filterClass) return true;
                      return teacherClasses.some(cls => 
                        cls.class_id === filterClass && 
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
              <div className="flex-1">
                <label className="block text-sm font-medium text-gray-700 mb-1">Search</label>
                <div className="relative">
                  <Search className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Search students, assignments..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>
            </div>
            <button
              onClick={() => setShowAddForm(true)}
              className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 flex items-center gap-2"
            >
              <Plus className="h-4 w-4" />
              Add Grade
            </button>
          </div>
        </div>

        {/* Available Classes Section */}
        <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Available Classes</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {teacherClasses.map((cls) => (
              <div
                key={`${cls.class_id}-${cls.section_id}`}
                className={`p-4 rounded-lg border cursor-pointer transition-colors ${
                  cls.teaches
                    ? 'bg-green-50 border-green-200 hover:bg-green-100'
                    : 'bg-gray-50 border-gray-200'
                } ${filterClass === cls.class_id && filterSection === cls.section_id ? 'ring-2 ring-blue-500' : ''}`}
                onClick={() => {
                  if (cls.teaches) {
                    setFilterClass(cls.class_id);
                    setFilterSection(cls.section_id);
                  }
                }}
              >
                <h4 className="font-medium text-gray-900">
                  {cls.class_name} - {cls.section_name}
                </h4>
                {cls.teaches ? (
                  <div className="mt-2 text-sm text-gray-600">
                    <p>Teaching: {cls.subject_name} ({cls.subject_code})</p>
                    <p>Grades Count: {cls.attendance_count || 0}</p>
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
        {filterClass && filterSection && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
            <h4 className="font-medium text-blue-900 mb-2">Selected Class</h4>
            {(() => {
              const selectedClass = teacherClasses.find(cls => 
                cls.class_id === filterClass && 
                cls.section_id === filterSection && 
                cls.teaches
              );
              if (selectedClass) {
                return (
                  <div className="text-sm text-blue-800">
                    <p><strong>Class:</strong> {selectedClass.class_name} - {selectedClass.section_name}</p>
                    <p><strong>Subject:</strong> {selectedClass.subject_name} ({selectedClass.subject_code})</p>
                    <p><strong>Grades Count:</strong> {selectedClass.attendance_count || 0}</p>
                  </div>
                );
              }
              return <p className="text-sm text-blue-600">No class selected</p>;
            })()}
          </div>
        )}

        {/* Grades List */}
        <div className="bg-white rounded-lg shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200">
            <h3 className="text-lg font-medium text-gray-900">
              Grades ({filteredGrades.length})
            </h3>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Student</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Subject</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Assignment</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Score</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Grade</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredGrades.map((grade) => (
                  <tr key={grade.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">{grade.student_name}</div>
                      <div className="text-sm text-gray-500">ID: {grade.student_id}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">{grade.subject_name}</div>
                      <div className="text-sm text-gray-500">{grade.assignment_type}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">{grade.title}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className={`text-sm font-medium ${getGradeColor(grade.percentage)}`}>
                        {grade.score}/{grade.max_score}
                      </div>
                      <div className="text-sm text-gray-500">{grade.percentage}%</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                        grade.grade_letter === 'A' ? 'bg-green-100 text-green-800' :
                        grade.grade_letter === 'B' ? 'bg-blue-100 text-blue-800' :
                        grade.grade_letter === 'C' ? 'bg-yellow-100 text-yellow-800' :
                        grade.grade_letter === 'D' ? 'bg-orange-100 text-orange-800' :
                        'bg-red-100 text-red-800'
                      }`}>
                        {grade.grade_letter}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleEditGrade(grade)}
                          className="text-blue-600 hover:text-blue-900"
                        >
                          <Edit className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => handleDeleteGrade(grade.id)}
                          className="text-red-600 hover:text-red-900"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {filteredGrades.length === 0 && (
              <div className="text-center py-12">
                <BarChart3 className="w-16 h-16 mx-auto mb-4 text-gray-300" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">No grades found</h3>
                <p className="text-gray-600">
                  {searchTerm || selectedSubject ? 'Try adjusting your filters' : 'Start by adding some grades'}
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Add/Edit Grade Modal */}
        {(showAddForm || editingGrade) && (
          <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
            <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
              <div className="mt-3">
                <h3 className="text-lg font-medium text-gray-900 mb-4">
                  {editingGrade ? 'Edit Grade' : 'Add New Grade'}
                </h3>
                <form onSubmit={editingGrade ? handleUpdateGrade : handleAddGrade}>
                  {!editingGrade && (
                    <>
                      <div className="mb-4">
                        <label className="block text-sm font-medium text-gray-700 mb-1">Student ID</label>
                        <input
                          type="text"
                          required
                          value={formData.student_id}
                          onChange={(e) => setFormData({...formData, student_id: e.target.value})}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                      </div>
                      <div className="mb-4">
                        <label className="block text-sm font-medium text-gray-700 mb-1">Student Name</label>
                        <input
                          type="text"
                          required
                          value={formData.student_name}
                          onChange={(e) => setFormData({...formData, student_name: e.target.value})}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                      </div>
                      <div className="mb-4">
                        <label className="block text-sm font-medium text-gray-700 mb-1">Subject</label>
                        <select
                          required
                          value={formData.subject_id}
                          onChange={(e) => {
                            const subject = subjects.find(s => s.id === e.target.value);
                            setFormData({
                              ...formData, 
                              subject_id: e.target.value,
                              subject_name: subject ? subject.name : ''
                            });
                          }}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        >
                          <option value="">Select Subject</option>
                          {subjects.map(subject => (
                            <option key={subject.id} value={subject.id}>{subject.name}</option>
                          ))}
                        </select>
                      </div>
                      <div className="mb-4">
                        <label className="block text-sm font-medium text-gray-700 mb-1">Assignment Type</label>
                        <select
                          required
                          value={formData.assignment_type}
                          onChange={(e) => setFormData({...formData, assignment_type: e.target.value})}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        >
                          <option value="">Select Type</option>
                          <option value="Homework">Homework</option>
                          <option value="Quiz">Quiz</option>
                          <option value="Midterm Exam">Midterm Exam</option>
                          <option value="Final Exam">Final Exam</option>
                          <option value="Project">Project</option>
                          <option value="Lab">Lab</option>
                          <option value="Participation">Participation</option>
                        </select>
                      </div>
                      <div className="mb-4">
                        <label className="block text-sm font-medium text-gray-700 mb-1">Assignment Title</label>
                        <input
                          type="text"
                          required
                          value={formData.title}
                          onChange={(e) => setFormData({...formData, title: e.target.value})}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                      </div>
                    </>
                  )}
                  <div className="grid grid-cols-2 gap-4 mb-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Score</label>
                      <input
                        type="number"
                        required
                        min="0"
                        step="0.1"
                        value={formData.score}
                        onChange={(e) => setFormData({...formData, score: e.target.value})}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Max Score</label>
                      <input
                        type="number"
                        required
                        min="1"
                        value={formData.max_score}
                        onChange={(e) => setFormData({...formData, max_score: e.target.value})}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                  </div>
                  <div className="mb-4">
                    <label className="block text-sm font-medium text-gray-700 mb-1">Grade Letter</label>
                    <select
                      required
                      value={formData.grade_letter}
                      onChange={(e) => setFormData({...formData, grade_letter: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="">Select Grade</option>
                      <option value="A">A (90-100%)</option>
                      <option value="B">B (80-89%)</option>
                      <option value="C">C (70-79%)</option>
                      <option value="D">D (60-69%)</option>
                      <option value="F">F (0-59%)</option>
                    </select>
                  </div>
                  <div className="mb-6">
                    <label className="block text-sm font-medium text-gray-700 mb-1">Feedback</label>
                    <textarea
                      value={formData.feedback}
                      onChange={(e) => setFormData({...formData, feedback: e.target.value})}
                      rows="3"
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="Optional feedback for the student..."
                    />
                  </div>
                  <div className="flex gap-3">
                    <button
                      type="submit"
                      className="flex-1 bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700"
                    >
                      {editingGrade ? 'Update Grade' : 'Add Grade'}
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setShowAddForm(false);
                        setEditingGrade(null);
                        setFormData({
                          student_id: '',
                          student_name: '',
                          subject_id: '',
                          subject_name: '',
                          assignment_type: '',
                          title: '',
                          score: '',
                          max_score: '100',
                          grade_letter: '',
                          feedback: ''
                        });
                      }}
                      className="flex-1 bg-gray-300 text-gray-700 px-4 py-2 rounded-md hover:bg-gray-400"
                    >
                      Cancel
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default TeacherGrades;
