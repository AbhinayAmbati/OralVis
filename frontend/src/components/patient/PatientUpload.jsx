import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { submissionsAPI } from '../../utils/api';
import { Upload, User, Mail, FileText, Image, AlertCircle, CheckCircle } from 'lucide-react';

const PatientUpload = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  
  const [formData, setFormData] = useState({
    patientName: user?.name || '',
    patientIdNumber: user?.patientId || '',
    email: user?.email || '',
    note: ''
  });
  const [selectedFiles, setSelectedFiles] = useState([]);
  const [previewUrls, setPreviewUrls] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const handleInputChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
    setError('');
  };

  const handleFileChange = (e) => {
    const files = Array.from(e.target.files);
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
    const maxFileSize = 10 * 1024 * 1024; // 10MB
    const maxFiles = 5; // Maximum 5 images

    // Validate number of files
    if (selectedFiles.length + files.length > maxFiles) {
      setError(`You can upload a maximum of ${maxFiles} images`);
      return;
    }

    const validFiles = [];
    const newPreviewUrls = [];

    for (const file of files) {
      // Validate file type
      if (!allowedTypes.includes(file.type)) {
        setError(`Invalid file type: ${file.name}. Please select valid image files (JPEG, PNG, GIF, or WebP)`);
        return;
      }

      // Validate file size
      if (file.size > maxFileSize) {
        setError(`File ${file.name} is too large. File size must be less than 10MB`);
        return;
      }

      validFiles.push(file);
      newPreviewUrls.push(URL.createObjectURL(file));
    }

    setSelectedFiles([...selectedFiles, ...validFiles]);
    setPreviewUrls([...previewUrls, ...newPreviewUrls]);
    setError('');
  };

  const removeFile = (index) => {
    const newFiles = selectedFiles.filter((_, i) => i !== index);
    const newUrls = previewUrls.filter((_, i) => i !== index);
    
    // Revoke the URL to prevent memory leaks
    URL.revokeObjectURL(previewUrls[index]);
    
    setSelectedFiles(newFiles);
    setPreviewUrls(newUrls);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (selectedFiles.length === 0) {
      setError('Please select at least one image file');
      return;
    }

    setLoading(true);
    setError('');

    try {
      // Upload each image as a separate submission
      for (let i = 0; i < selectedFiles.length; i++) {
        const uploadData = new FormData();
        uploadData.append('image', selectedFiles[i]);
        uploadData.append('patientName', formData.patientName);
        uploadData.append('patientIdNumber', formData.patientIdNumber);
        uploadData.append('email', formData.email);
        uploadData.append('note', `${formData.note} ${selectedFiles.length > 1 ? `(Image ${i + 1} of ${selectedFiles.length})` : ''}`);

        await submissionsAPI.upload(uploadData);
      }
      
      setSuccess(true);
      setTimeout(() => {
        navigate('/');
      }, 2000);
    } catch (error) {
      setError(error.response?.data?.message || 'Failed to upload submission');
    } finally {
      setLoading(false);
    }
  };

  const handleReset = () => {
    setFormData({
      patientName: user?.name || '',
      patientIdNumber: user?.patientId || '',
      email: user?.email || '',
      note: ''
    });
    // Revoke all preview URLs to prevent memory leaks
    previewUrls.forEach(url => URL.revokeObjectURL(url));
    setSelectedFiles([]);
    setPreviewUrls([]);
    setError('');
    setSuccess(false);
  };

  if (success) {
    return (
      <div className="max-w-2xl mx-auto py-12 px-4 sm:px-6 lg:px-8">
        <div className="bg-white rounded-lg shadow-lg p-8 text-center">
          <CheckCircle className="mx-auto h-16 w-16 text-green-500 mb-4" />
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Upload Successful!</h2>
          <p className="text-gray-600 mb-4">
            Your oral health assessment has been submitted successfully. 
            You will be redirected to your dashboard shortly.
          </p>
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600 mx-auto"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 to-blue-50 py-8">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="bg-white shadow-xl rounded-2xl overflow-hidden">
          {/* Header Section */}
          <div className="bg-gradient-to-r from-purple-600 to-blue-600 px-6 py-8 sm:px-8">
            <div className="flex items-center">
              <Upload className="h-8 w-8 text-white mr-3" />
              <div>
                <h1 className="text-2xl font-bold text-white">
                  Upload Oral Health Assessment
                </h1>
                <p className="text-purple-100 mt-1">
                  Submit your dental images for professional analysis
                </p>
              </div>
            </div>
          </div>

          <div className="px-6 py-8 sm:px-8">

            {error && (
              <div className="mb-6 bg-red-50 border-l-4 border-red-400 p-4 rounded-r-lg">
                <div className="flex">
                  <AlertCircle className="h-5 w-5 text-red-400 mr-3 mt-0.5" />
                  <div>
                    <p className="text-red-700 font-medium">Error</p>
                    <p className="text-red-600 text-sm mt-1">{error}</p>
                  </div>
                </div>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-8">
              {/* Patient Information Section */}
              <div className="bg-gray-50 rounded-xl p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                  <User className="h-5 w-5 text-purple-600 mr-2" />
                  Patient Information
                </h3>
                <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
                  <div>
                    <label htmlFor="patientName" className="block text-sm font-semibold text-gray-700 mb-2">
                      Patient Name *
                    </label>
                    <div className="relative">
                      <input
                        type="text"
                        name="patientName"
                        id="patientName"
                        required
                        value={formData.patientName}
                        onChange={handleInputChange}
                        className="block w-full pl-10 pr-3 py-3 border border-gray-300 rounded-lg shadow-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all duration-200"
                        placeholder="Enter patient name"
                      />
                      <User className="absolute left-3 top-3.5 h-4 w-4 text-gray-400" />
                    </div>
                  </div>

                  <div>
                    <label htmlFor="patientIdNumber" className="block text-sm font-semibold text-gray-700 mb-2">
                      Patient ID *
                    </label>
                    <div className="relative">
                      <input
                        type="text"
                        name="patientIdNumber"
                        id="patientIdNumber"
                        required
                        value={formData.patientIdNumber}
                        onChange={handleInputChange}
                        className="block w-full pl-10 pr-3 py-3 border border-gray-300 rounded-lg shadow-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all duration-200"
                        placeholder="Enter patient ID"
                      />
                      <FileText className="absolute left-3 top-3.5 h-4 w-4 text-gray-400" />
                    </div>
                  </div>
                </div>

                <div className="mt-6">
                  <label htmlFor="email" className="block text-sm font-semibold text-gray-700 mb-2">
                    Email Address *
                  </label>
                  <div className="relative">
                    <input
                      type="email"
                      name="email"
                      id="email"
                      required
                      value={formData.email}
                      onChange={handleInputChange}
                      className="block w-full pl-10 pr-3 py-3 border border-gray-300 rounded-lg shadow-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all duration-200"
                      placeholder="Enter email address"
                    />
                    <Mail className="absolute left-3 top-3.5 h-4 w-4 text-gray-400" />
                  </div>
                </div>

                <div className="mt-6">
                  <label htmlFor="note" className="block text-sm font-semibold text-gray-700 mb-2">
                    Additional Notes
                    <span className="text-gray-500 font-normal ml-1">(Optional)</span>
                  </label>
                  <div className="relative">
                    <textarea
                      name="note"
                      id="note"
                      rows={4}
                      value={formData.note}
                      onChange={handleInputChange}
                      className="block w-full pl-10 pr-3 py-3 border border-gray-300 rounded-lg shadow-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all duration-200 resize-none"
                      placeholder="Any additional information, symptoms, or concerns..."
                    />
                    <FileText className="absolute left-3 top-3.5 h-4 w-4 text-gray-400" />
                  </div>
                </div>
              </div>

              {/* Image Upload Section */}
              <div className="bg-blue-50 rounded-xl p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                  <Image className="h-5 w-5 text-blue-600 mr-2" />
                  Upload Dental Images (Max 5)
                </h3>
                <div className="border-2 border-dashed border-blue-300 rounded-xl p-8 text-center hover:border-blue-400 hover:bg-blue-25 transition-all duration-300 group">
                  {previewUrls.length > 0 ? (
                    <div className="space-y-4">
                      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                        {previewUrls.map((url, index) => (
                          <div key={index} className="relative group">
                            <img
                              src={url}
                              alt={`Preview ${index + 1}`}
                              className="w-full h-32 object-cover rounded-lg shadow-md border-2 border-white"
                            />
                            <button
                              type="button"
                              onClick={() => removeFile(index)}
                              className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-600"
                            >
                              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                              </svg>
                            </button>
                            <div className="absolute -top-2 -left-2 bg-green-500 text-white rounded-full p-1">
                              <CheckCircle className="h-4 w-4" />
                            </div>
                          </div>
                        ))}
                      </div>
                      <div className="bg-white rounded-lg p-3 inline-block shadow-sm">
                        <p className="text-sm font-medium text-gray-700">
                          {selectedFiles.length} image{selectedFiles.length !== 1 ? 's' : ''} selected
                        </p>
                        <p className="text-xs text-gray-500 mt-1">
                          Total size: {(selectedFiles.reduce((total, file) => total + file.size, 0) / (1024 * 1024)).toFixed(2)} MB
                        </p>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      <div className="mx-auto w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center group-hover:bg-blue-200 transition-colors">
                        <Image className="h-8 w-8 text-blue-600" />
                      </div>
                      <div>
                        <h4 className="text-lg font-medium text-gray-900 mb-2">
                          Upload Your Dental Images
                        </h4>
                        <p className="text-sm text-gray-600 mb-4">
                          Select up to 5 clear photos of your teeth for professional analysis
                        </p>
                      </div>
                    </div>
                  )}
                  
                  <div className="mt-6">
                    <label
                      htmlFor="file-upload"
                      className="inline-flex items-center px-6 py-3 border border-transparent text-base font-medium rounded-lg shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 cursor-pointer transition-all duration-200 transform hover:scale-105"
                    >
                      <Upload className="w-5 h-5 mr-2" />
                      {previewUrls.length > 0 ? 'Add More Images' : 'Choose Images'}
                      <input
                        id="file-upload"
                        name="file-upload"
                        type="file"
                        className="sr-only"
                        accept="image/*"
                        multiple
                        onChange={handleFileChange}
                      />
                    </label>
                  </div>
                  
                  <div className="mt-4 text-xs text-gray-500 space-y-1">
                    <p>Supported formats: PNG, JPG, GIF, WebP</p>
                    <p>Maximum file size: 10MB per image</p>
                    <p>Maximum 5 images per upload</p>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex flex-col sm:flex-row gap-4 sm:justify-end pt-6 border-t border-gray-200">
                <button
                  type="button"
                  onClick={handleReset}
                  className="w-full sm:w-auto px-6 py-3 border border-gray-300 rounded-lg shadow-sm text-base font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500 transition-all duration-200"
                >
                  Reset Form
                </button>
                <button
                  type="submit"
                  disabled={loading || selectedFiles.length === 0}
                  className="w-full sm:w-auto inline-flex items-center justify-center px-8 py-3 border border-transparent text-base font-medium rounded-lg shadow-sm text-white bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 transform hover:scale-105 disabled:hover:scale-100"
                >
                  {loading ? (
                    <>
                      <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-3"></div>
                      Uploading Assessment...
                    </>
                  ) : (
                    <>
                      <Upload className="w-5 h-5 mr-3" />
                      Submit Assessment
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PatientUpload;
