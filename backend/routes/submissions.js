const express = require('express');
const Submission = require('../models/Submission');
const { auth, patientAuth } = require('../middleware/auth');
const { upload, isS3Configured } = require('../config/multer');

const router = express.Router();

// @route   POST /api/submissions/upload
// @desc    Upload a new submission (patient only)
// @access  Private (Patient)
router.post('/upload', auth, patientAuth, upload.single('image'), async (req, res) => {
  try {
    const { patientName, patientIdNumber, email, note } = req.body;

    if (!req.file) {
      return res.status(400).json({ message: 'Image file is required' });
    }

    // Create new submission with S3 or local storage
    const submission = new Submission({
      patientId: req.user._id,
      patientName,
      patientIdNumber,
      email,
      note,
      originalImagePath: isS3Configured() ? req.file.key : req.file.path,
      originalImageUrl: isS3Configured() ? req.file.location : `/uploads/images/${req.file.filename}`,
      status: 'uploaded'
    });

    await submission.save();

    res.status(201).json({
      message: 'Submission uploaded successfully',
      submission: {
        id: submission._id,
        patientName: submission.patientName,
        patientIdNumber: submission.patientIdNumber,
        email: submission.email,
        note: submission.note,
        originalImageUrl: submission.originalImageUrl,
        status: submission.status,
        createdAt: submission.createdAt
      }
    });
  } catch (error) {
    console.error('Upload error:', error);
    res.status(500).json({ message: 'Server error during upload' });
  }
});

// @route   GET /api/submissions/my-submissions
// @desc    Get all submissions for the logged-in patient
// @access  Private (Patient)
router.get('/my-submissions', auth, patientAuth, async (req, res) => {
  try {
    const submissions = await Submission.find({ patientId: req.user._id })
      .sort({ createdAt: -1 })
      .select('-annotationData'); // Exclude annotation data for patient view

    res.json({
      submissions: submissions.map(submission => ({
        id: submission._id,
        patientName: submission.patientName,
        patientIdNumber: submission.patientIdNumber,
        email: submission.email,
        note: submission.note,
        originalImageUrl: submission.originalImageUrl,
        status: submission.status,
        reportUrl: submission.reportUrl,
        createdAt: submission.createdAt,
        reviewedAt: submission.reviewedAt
      }))
    });
  } catch (error) {
    console.error('Get submissions error:', error);
    res.status(500).json({ message: 'Server error fetching submissions' });
  }
});

// @route   GET /api/submissions/:id
// @desc    Get a specific submission (patient can only see their own)
// @access  Private (Patient)
router.get('/:id', auth, patientAuth, async (req, res) => {
  try {
    const submission = await Submission.findOne({
      _id: req.params.id,
      patientId: req.user._id
    }).select('-annotationData');

    if (!submission) {
      return res.status(404).json({ message: 'Submission not found' });
    }

    res.json({
      submission: {
        id: submission._id,
        patientName: submission.patientName,
        patientIdNumber: submission.patientIdNumber,
        email: submission.email,
        note: submission.note,
        originalImageUrl: submission.originalImageUrl,
        status: submission.status,
        reportUrl: submission.reportUrl,
        createdAt: submission.createdAt,
        reviewedAt: submission.reviewedAt
      }
    });
  } catch (error) {
    console.error('Get submission error:', error);
    res.status(500).json({ message: 'Server error fetching submission' });
  }
});

// @route   GET /api/submissions/:id/download-report
// @desc    Download PDF report for a submission
// @access  Private (Patient)
router.get('/:id/download-report', auth, patientAuth, async (req, res) => {
  try {
    const submission = await Submission.findOne({
      _id: req.params.id,
      patientId: req.user._id
    });

    if (!submission) {
      return res.status(404).json({ message: 'Submission not found' });
    }

    if (!submission.reportPath || submission.status !== 'reported') {
      return res.status(400).json({ message: 'Report not available yet' });
    }

    // Handle PDF download for both S3 URLs and local files
    if (submission.reportPath.startsWith('http')) {
      // For S3 URLs, proxy the download to avoid CORS issues
      const https = require('https');
      const http = require('http');
      
      const protocol = submission.reportPath.startsWith('https:') ? https : http;
      const filename = `oral-health-report-${submission.patientIdNumber}.pdf`;
      
      res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
      res.setHeader('Content-Type', 'application/pdf');
      
      protocol.get(submission.reportPath, (s3Response) => {
        s3Response.pipe(res);
      }).on('error', (err) => {
        console.error('Error downloading from S3:', err);
        res.status(500).json({ message: 'Error downloading file' });
      });
    } else {
      // For local files, use download
      res.download(submission.reportPath, `oral-health-report-${submission.patientIdNumber}.pdf`);
    }
  } catch (error) {
    console.error('Download report error:', error);
    res.status(500).json({ message: 'Server error downloading report' });
  }
});

module.exports = router;
