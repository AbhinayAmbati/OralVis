import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { adminAPI } from '../../utils/api';
import { Save, Square, Circle, ArrowRight, Pen, Type, Undo, Redo, Palette } from 'lucide-react';

const AdminAnnotation = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const canvasRef = useRef(null);
  const [submission, setSubmission] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [adminNotes, setAdminNotes] = useState('');
  
  // Annotation state
  const [currentTool, setCurrentTool] = useState('rectangle');
  const [currentColor, setCurrentColor] = useState('#ff0000');
  const [strokeWidth, setStrokeWidth] = useState(2);
  const [annotations, setAnnotations] = useState([]);
  const [isDrawing, setIsDrawing] = useState(false);
  const [startPos, setStartPos] = useState({ x: 0, y: 0 });
  const [currentAnnotation, setCurrentAnnotation] = useState(null);
  const [freehandPoints, setFreehandPoints] = useState([]);
  const [history, setHistory] = useState([]);
  const [historyIndex, setHistoryIndex] = useState(-1);

  const colors = [
    '#ff0000', '#00ff00', '#0000ff', '#ffff00', '#ff00ff', '#00ffff',
    '#8b4513', '#ffd700', '#8b4513', '#ff1493', '#32cd32', '#ff4500'
  ];

  useEffect(() => {
    fetchSubmission();
  }, [id]);

  useEffect(() => {
    if (submission && canvasRef.current) {
      setupCanvas();
    }
  }, [submission]);

  const fetchSubmission = async () => {
    try {
      const response = await adminAPI.getSubmission(id);
      setSubmission(response.data.submission);
      setAdminNotes(response.data.submission.adminNotes || '');
      if (response.data.submission.annotationData) {
        setAnnotations(response.data.submission.annotationData.annotations || []);
      }
    } catch (error) {
      setError('Failed to fetch submission');
      console.error('Error fetching submission:', error);
    } finally {
      setLoading(false);
    }
  };

  const setupCanvas = () => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    const img = new Image();
    
    img.onload = () => {
      // Set canvas size to match image
      canvas.width = img.width;
      canvas.height = img.height;
      
      // Draw the image
      ctx.drawImage(img, 0, 0);
      
      // Draw existing annotations
      drawAnnotations(ctx);
    };
    
    img.src = submission.originalImageUrl.startsWith('http') ? submission.originalImageUrl : `http://localhost:5000${submission.originalImageUrl}`;
  };

  const drawAnnotations = (ctx) => {
    annotations.forEach(annotation => {
      ctx.strokeStyle = annotation.color || currentColor;
      ctx.lineWidth = annotation.strokeWidth || strokeWidth;
      ctx.fillStyle = annotation.fillColor || 'transparent';
      
      switch (annotation.type) {
        case 'rectangle':
          ctx.strokeRect(annotation.x, annotation.y, annotation.width, annotation.height);
          if (annotation.fillColor && annotation.fillColor !== 'transparent') {
            ctx.globalAlpha = 0.3;
            ctx.fillRect(annotation.x, annotation.y, annotation.width, annotation.height);
            ctx.globalAlpha = 1.0;
          }
          break;
          
        case 'circle':
          ctx.beginPath();
          ctx.arc(annotation.x, annotation.y, annotation.radius, 0, 2 * Math.PI);
          ctx.stroke();
          if (annotation.fillColor && annotation.fillColor !== 'transparent') {
            ctx.globalAlpha = 0.3;
            ctx.fill();
            ctx.globalAlpha = 1.0;
          }
          break;
          
        case 'arrow':
          drawArrow(ctx, annotation.startX, annotation.startY, annotation.endX, annotation.endY);
          break;
          
        case 'freehand':
          if (annotation.points && annotation.points.length > 1) {
            ctx.beginPath();
            ctx.moveTo(annotation.points[0].x, annotation.points[0].y);
            for (let i = 1; i < annotation.points.length; i++) {
              ctx.lineTo(annotation.points[i].x, annotation.points[i].y);
            }
            ctx.stroke();
          }
          break;
          
        case 'text':
          ctx.font = `${annotation.fontSize || 16}px Arial`;
          ctx.fillStyle = annotation.color || currentColor;
          ctx.fillText(annotation.text, annotation.x, annotation.y);
          break;
      }
    });
  };

  const drawArrow = (ctx, startX, startY, endX, endY) => {
    const headLength = 10;
    const angle = Math.atan2(endY - startY, endX - startX);
    
    ctx.beginPath();
    ctx.moveTo(startX, startY);
    ctx.lineTo(endX, endY);
    ctx.stroke();
    
    ctx.beginPath();
    ctx.moveTo(endX, endY);
    ctx.lineTo(
      endX - headLength * Math.cos(angle - Math.PI / 6),
      endY - headLength * Math.sin(angle - Math.PI / 6)
    );
    ctx.moveTo(endX, endY);
    ctx.lineTo(
      endX - headLength * Math.cos(angle + Math.PI / 6),
      endY - headLength * Math.sin(angle + Math.PI / 6)
    );
    ctx.stroke();
  };

  const getMousePos = (e) => {
    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    
    return {
      x: (e.clientX - rect.left) * scaleX,
      y: (e.clientY - rect.top) * scaleY
    };
  };

  const handleMouseDown = (e) => {
    const pos = getMousePos(e);
    setIsDrawing(true);
    setStartPos(pos);
    
    if (currentTool === 'freehand') {
      setFreehandPoints([pos]);
    }
  };

  const handleMouseMove = (e) => {
    if (!isDrawing) return;
    
    const pos = getMousePos(e);
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    
    // Clear canvas and redraw image and existing annotations
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    const img = new Image();
    img.onload = () => {
      ctx.drawImage(img, 0, 0);
      drawAnnotations(ctx);
      
      // Draw current annotation
      ctx.strokeStyle = currentColor;
      ctx.lineWidth = strokeWidth;
      
      switch (currentTool) {
        case 'rectangle':
          const width = pos.x - startPos.x;
          const height = pos.y - startPos.y;
          ctx.strokeRect(startPos.x, startPos.y, width, height);
          break;
          
        case 'circle':
          const radius = Math.sqrt(Math.pow(pos.x - startPos.x, 2) + Math.pow(pos.y - startPos.y, 2));
          ctx.beginPath();
          ctx.arc(startPos.x, startPos.y, radius, 0, 2 * Math.PI);
          ctx.stroke();
          break;
          
        case 'arrow':
          drawArrow(ctx, startPos.x, startPos.y, pos.x, pos.y);
          break;
          
        case 'freehand':
          setFreehandPoints(prev => [...prev, pos]);
          if (freehandPoints.length > 0) {
            ctx.beginPath();
            ctx.moveTo(freehandPoints[0].x, freehandPoints[0].y);
            freehandPoints.forEach(point => {
              ctx.lineTo(point.x, point.y);
            });
            ctx.lineTo(pos.x, pos.y);
            ctx.stroke();
          }
          break;
      }
    };
    img.src = submission.originalImageUrl.startsWith('http') ? submission.originalImageUrl : `http://localhost:5000${submission.originalImageUrl}`;
  };

  const handleMouseUp = (e) => {
    if (!isDrawing) return;
    
    const pos = getMousePos(e);
    setIsDrawing(false);
    
    let newAnnotation = {
      type: currentTool,
      color: currentColor,
      strokeWidth: strokeWidth
    };
    
    switch (currentTool) {
      case 'rectangle':
        newAnnotation = {
          ...newAnnotation,
          x: startPos.x,
          y: startPos.y,
          width: pos.x - startPos.x,
          height: pos.y - startPos.y
        };
        break;
        
      case 'circle':
        const radius = Math.sqrt(Math.pow(pos.x - startPos.x, 2) + Math.pow(pos.y - startPos.y, 2));
        newAnnotation = {
          ...newAnnotation,
          x: startPos.x,
          y: startPos.y,
          radius: radius
        };
        break;
        
      case 'arrow':
        newAnnotation = {
          ...newAnnotation,
          startX: startPos.x,
          startY: startPos.y,
          endX: pos.x,
          endY: pos.y
        };
        break;
        
      case 'freehand':
        newAnnotation = {
          ...newAnnotation,
          points: [...freehandPoints, pos]
        };
        setFreehandPoints([]);
        break;
    }
    
    const newAnnotations = [...annotations, newAnnotation];
    setAnnotations(newAnnotations);
    
    // Add to history
    const newHistory = history.slice(0, historyIndex + 1);
    newHistory.push(newAnnotations);
    setHistory(newHistory);
    setHistoryIndex(newHistory.length - 1);
  };

  const handleUndo = () => {
    if (historyIndex > 0) {
      setHistoryIndex(historyIndex - 1);
      setAnnotations(history[historyIndex - 1]);
      setupCanvas();
    }
  };

  const handleRedo = () => {
    if (historyIndex < history.length - 1) {
      setHistoryIndex(historyIndex + 1);
      setAnnotations(history[historyIndex + 1]);
      setupCanvas();
    }
  };

  const handleSave = async () => {
    try {
      const annotationData = {
        annotations: annotations,
        timestamp: new Date().toISOString()
      };
      
      await adminAPI.saveAnnotation(id, {
        annotationData,
        adminNotes
      });
      
      alert('Annotation saved successfully!');
      navigate('/admin');
    } catch (error) {
      console.error('Error saving annotation:', error);
      alert('Failed to save annotation');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-purple-600"></div>
      </div>
    );
  }

  if (error || !submission) {
    return (
      <div className="max-w-2xl mx-auto py-12 px-4 sm:px-6 lg:px-8">
        <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-md">
          {error || 'Submission not found'}
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
      <div className="px-4 py-6 sm:px-0">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900">
            Annotate Submission - {submission.patientName}
          </h1>
          <p className="text-gray-600">
            Patient ID: {submission.patientIdNumber} | Submitted: {new Date(submission.createdAt).toLocaleDateString()}
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Tools Panel */}
          <div className="lg:col-span-1">
            <div className="bg-white shadow rounded-lg p-4">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Annotation Tools</h3>
              
              {/* Tool Selection */}
              <div className="space-y-2 mb-4">
                {[
                  { id: 'rectangle', icon: Square, label: 'Rectangle' },
                  { id: 'circle', icon: Circle, label: 'Circle' },
                  { id: 'arrow', icon: ArrowRight, label: 'Arrow' },
                  { id: 'freehand', icon: Pen, label: 'Freehand' }
                ].map(tool => (
                  <button
                    key={tool.id}
                    onClick={() => setCurrentTool(tool.id)}
                    className={`w-full flex items-center px-3 py-2 text-sm font-medium rounded-md ${
                      currentTool === tool.id
                        ? 'bg-purple-100 text-purple-700 border-purple-300'
                        : 'text-gray-700 hover:bg-gray-50'
                    } border`}
                  >
                    <tool.icon className="w-4 h-4 mr-2" />
                    {tool.label}
                  </button>
                ))}
              </div>

              {/* Color Palette */}
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  <Palette className="w-4 h-4 inline mr-1" />
                  Color
                </label>
                <div className="grid grid-cols-6 gap-1">
                  {colors.map(color => (
                    <button
                      key={color}
                      onClick={() => setCurrentColor(color)}
                      className={`w-8 h-8 rounded border-2 ${
                        currentColor === color ? 'border-gray-800' : 'border-gray-300'
                      }`}
                      style={{ backgroundColor: color }}
                    />
                  ))}
                </div>
              </div>

              {/* Stroke Width */}
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Stroke Width: {strokeWidth}px
                </label>
                <input
                  type="range"
                  min="1"
                  max="10"
                  value={strokeWidth}
                  onChange={(e) => setStrokeWidth(parseInt(e.target.value))}
                  className="w-full"
                />
              </div>

              {/* History Controls */}
              <div className="flex space-x-2 mb-4">
                <button
                  onClick={handleUndo}
                  disabled={historyIndex <= 0}
                  className="flex-1 flex items-center justify-center px-3 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Undo className="w-4 h-4 mr-1" />
                  Undo
                </button>
                <button
                  onClick={handleRedo}
                  disabled={historyIndex >= history.length - 1}
                  className="flex-1 flex items-center justify-center px-3 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Redo className="w-4 h-4 mr-1" />
                  Redo
                </button>
              </div>

              {/* Admin Notes */}
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Admin Notes
                </label>
                <textarea
                  value={adminNotes}
                  onChange={(e) => setAdminNotes(e.target.value)}
                  rows={4}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-purple-500 focus:border-purple-500"
                  placeholder="Add your observations and recommendations..."
                />
              </div>

              {/* Save Button */}
              <button
                onClick={handleSave}
                className="w-full flex items-center justify-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-purple-600 hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500"
              >
                <Save className="w-4 h-4 mr-2" />
                Save Annotation
              </button>
            </div>
          </div>

          {/* Canvas Area */}
          <div className="lg:col-span-3">
            <div className="bg-white shadow rounded-lg p-4">
              <h3 className="text-lg font-medium text-gray-900 mb-4">
                Image Annotation
              </h3>
              <div className="border border-gray-300 rounded-lg overflow-hidden">
                <canvas
                  ref={canvasRef}
                  onMouseDown={handleMouseDown}
                  onMouseMove={handleMouseMove}
                  onMouseUp={handleMouseUp}
                  className="max-w-full h-auto cursor-crosshair"
                  style={{ display: 'block' }}
                />
              </div>
              
              {/* Patient Info */}
              <div className="mt-4 p-4 bg-gray-50 rounded-lg">
                <h4 className="font-medium text-gray-900 mb-2">Patient Information</h4>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="font-medium">Name:</span> {submission.patientName}
                  </div>
                  <div>
                    <span className="font-medium">ID:</span> {submission.patientIdNumber}
                  </div>
                  <div>
                    <span className="font-medium">Email:</span> {submission.email}
                  </div>
                  <div>
                    <span className="font-medium">Submitted:</span> {new Date(submission.createdAt).toLocaleDateString()}
                  </div>
                </div>
                {submission.note && (
                  <div className="mt-2">
                    <span className="font-medium">Patient Note:</span>
                    <p className="text-gray-600 mt-1">{submission.note}</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminAnnotation;
