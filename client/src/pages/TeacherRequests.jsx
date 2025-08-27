import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { 
  ArrowLeft, FileText, Clock, Building, MessageSquare, 
  Calendar, User, AlertCircle, CheckCircle, X, Loader2
} from 'lucide-react';
import toast from 'react-hot-toast';
import { useNavigate } from 'react-router-dom';
import requestService from '../services/requestService';

const TeacherRequests = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [selectedType, setSelectedType] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    start_date: '',
    end_date: '',
    priority: 'medium',
    request_type: ''
  });
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(false);

  const requestTypes = [
    {
      id: 'leave',
      title: 'Leave Request',
      description: 'Request for personal leave, sick leave, or vacation',
      icon: <Calendar className="w-8 h-8 text-blue-600" />,
      color: 'bg-blue-50 border-blue-200 hover:bg-blue-100',
      textColor: 'text-blue-700'
    },
    {
      id: 'schedule_change',
      title: 'Schedule Change',
      description: 'Request to modify class timings or dates',
      icon: <Clock className="w-8 h-8 text-yellow-600" />,
      color: 'bg-yellow-50 border-yellow-200 hover:bg-yellow-100',
      textColor: 'text-yellow-700'
    },
    {
      id: 'room_change',
      title: 'Room Change',
      description: 'Request to change classroom or venue',
      icon: <Building className="w-8 h-8 text-green-600" />,
      color: 'bg-green-50 border-green-200 hover:bg-green-100',
      textColor: 'text-green-700'
    },
    {
      id: 'other',
      title: 'Other Request',
      description: 'Any other administrative or academic request',
      icon: <MessageSquare className="w-8 h-8 text-purple-600" />,
      color: 'bg-purple-50 border-purple-200 hover:bg-purple-100',
      textColor: 'text-purple-700'
    }
  ];

  const handleTypeSelect = (type) => {
    setSelectedType(type);
    setFormData({
      title: type.title,
      description: '',
      start_date: new Date().toISOString().split('T')[0],
      end_date: new Date().toISOString().split('T')[0],
      priority: 'medium',
      request_type: type.id
    });
    setShowForm(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!formData.title || !formData.description || !formData.start_date) {
      toast.error('Please fill in all required fields');
      return;
    }

    try {
      await requestService.createRequest(formData);
      toast.success('Request submitted successfully!');
      setShowForm(false);
      setSelectedType('');
      setFormData({
        title: '',
        description: '',
        start_date: '',
        end_date: '',
        priority: 'medium',
        request_type: ''
      });
      // Refresh the requests list to show the new request
      refreshRequests();
    } catch (error) {
      console.error('Failed to submit request:', error);
      toast.error('Failed to submit request. Please try again.');
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  // Fetch teacher's requests
  const fetchRequests = async () => {
    try {
      setLoading(true);
      const response = await requestService.getMyRequests();
      if (response.success) {
        setRequests(response.data || []);
      }
    } catch (error) {
      console.error('Failed to fetch requests:', error);
      toast.error('Failed to fetch requests');
    } finally {
      setLoading(false);
    }
  };

  // Refresh requests after creating a new one
  const refreshRequests = () => {
    fetchRequests();
  };

  // Fetch requests on component mount
  useEffect(() => {
    fetchRequests();
  }, []);

  // Helper function to get status color and icon
  const getStatusInfo = (status) => {
    switch (status) {
      case 'pending':
        return {
          color: 'text-yellow-600',
          bgColor: 'bg-yellow-100',
          icon: <Clock className="w-4 h-4" />,
          text: 'Pending'
        };
      case 'approved':
        return {
          color: 'text-green-600',
          bgColor: 'bg-green-100',
          icon: <CheckCircle className="w-4 h-4" />,
          text: 'Approved'
        };
      case 'rejected':
        return {
          color: 'text-red-600',
          bgColor: 'bg-red-100',
          icon: <X className="w-4 h-4" />,
          text: 'Rejected'
        };
      default:
        return {
          color: 'text-gray-600',
          bgColor: 'bg-gray-100',
          icon: <AlertCircle className="w-4 h-4" />,
          text: status
        };
    }
  };

  // Helper function to format date
  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
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
    
    return formatDate(dateString);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center py-4">
            <button
              onClick={() => navigate('/teacher')}
              className="mr-4 p-2 text-gray-400 hover:text-gray-600 transition-colors"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">
                Submit Request
              </h1>
              <p className="text-gray-600">
                Choose the type of request you'd like to submit
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {!showForm ? (
          <>
            {/* Request Type Selection */}
            <div className="mb-8">
              <h2 className="text-xl font-semibold text-gray-900 mb-6">
                Select Request Type
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {requestTypes.map((type) => (
                  <div
                    key={type.id}
                    onClick={() => handleTypeSelect(type)}
                    className={`p-6 rounded-lg border-2 cursor-pointer transition-all duration-200 ${type.color}`}
                  >
                    <div className="flex items-start space-x-4">
                      <div className="flex-shrink-0">
                        {type.icon}
                      </div>
                      <div className="flex-1">
                        <h3 className={`text-lg font-semibold mb-2 ${type.textColor}`}>
                          {type.title}
                        </h3>
                        <p className="text-gray-600 text-sm">
                          {type.description}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Recent Requests */}
            <div className="bg-white rounded-lg p-6 shadow-sm border border-gray-200">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-900">
                  Recent Requests
                </h3>
                <button
                  onClick={refreshRequests}
                  disabled={loading}
                  className="p-2 text-gray-400 hover:text-gray-600 transition-colors disabled:opacity-50"
                >
                  {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <FileText className="w-4 h-4" />}
                </button>
              </div>
              
              {loading ? (
                <div className="text-center py-8">
                  <Loader2 className="w-8 h-8 mx-auto mb-4 animate-spin text-blue-600" />
                  <p className="text-gray-500">Loading requests...</p>
                </div>
              ) : requests.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <FileText className="w-16 h-16 mx-auto mb-4 text-gray-300" />
                  <p>No recent requests to display</p>
                  <p className="text-sm">Submit your first request above</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {requests.map((request) => {
                    const statusInfo = getStatusInfo(request.status);
                    return (
                      <div
                        key={request.id}
                        className="border border-gray-200 rounded-lg p-4 hover:bg-gray-50 transition-colors"
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center space-x-3 mb-2">
                              <h4 className="font-medium text-gray-900">
                                {request.title}
                              </h4>
                              <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${statusInfo.bgColor} ${statusInfo.color}`}>
                                {statusInfo.icon}
                                <span className="ml-1">{statusInfo.text}</span>
                              </span>
                            </div>
                            
                            <p className="text-sm text-gray-600 mb-2">
                              {request.description}
                            </p>
                            
                            <div className="flex items-center space-x-4 text-xs text-gray-500">
                              <span className="flex items-center">
                                <Calendar className="w-3 h-3 mr-1" />
                                {formatDate(request.start_date)} - {formatDate(request.end_date)}
                              </span>
                              <span className="flex items-center">
                                <AlertCircle className="w-3 h-3 mr-1" />
                                Priority: {request.priority}
                              </span>
                              <span className="flex items-center">
                                <Clock className="w-3 h-3 mr-1" />
                                {getTimeAgo(request.requested_at)}
                              </span>
                            </div>
                            
                            {request.processed_at && (
                              <div className="mt-2 text-xs text-gray-500">
                                <span className="flex items-center">
                                  <CheckCircle className="w-3 h-3 mr-1" />
                                  Processed {getTimeAgo(request.processed_at)}
                                  {request.processed_by_name && (
                                    <span className="ml-1">by {request.processed_by_name}</span>
                                  )}
                                </span>
                              </div>
                            )}
                            
                            {request.notes && (
                              <div className="mt-2 p-2 bg-gray-50 rounded text-xs text-gray-600">
                                <strong>Notes:</strong> {request.notes}
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </>
        ) : (
          /* Request Form */
          <div className="max-w-2xl mx-auto">
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-semibold text-gray-900">
                  {selectedType.title}
                </h2>
                <button
                  onClick={() => setShowForm(false)}
                  className="p-2 text-gray-400 hover:text-gray-600 transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleSubmit} className="space-y-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Request Title *
                  </label>
                  <input
                    type="text"
                    name="title"
                    value={formData.title}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Enter a descriptive title for your request"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Description *
                  </label>
                  <textarea
                    name="description"
                    value={formData.description}
                    onChange={handleInputChange}
                    rows={4}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Please provide detailed information about your request..."
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Start Date *
                    </label>
                    <input
                      type="date"
                      name="start_date"
                      value={formData.start_date}
                      onChange={handleInputChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      End Date
                    </label>
                    <input
                      type="date"
                      name="end_date"
                      value={formData.end_date}
                      onChange={handleInputChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Priority Level
                  </label>
                  <select
                    name="priority"
                    value={formData.priority}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="low">Low - Can be processed later</option>
                    <option value="medium">Medium - Standard processing time</option>
                    <option value="high">High - Urgent attention required</option>
                  </select>
                </div>

                <div className="flex space-x-3 pt-4">
                  <button
                    type="button"
                    onClick={() => setShowForm(false)}
                    className="flex-1 px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="flex-1 px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors"
                  >
                    Submit Request
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default TeacherRequests;
