const express = require('express');
const path = require('path');
const fs = require('fs');
const Submission = require('../models/Submission');
const { auth, adminAuth } = require('../middleware/auth');
const { generatePDF } = require('../utils/pdfGenerator');
const { saveAnnotatedImage } = require('../utils/imageProcessor');

const router = express.Router();

// @route   GET /api/admin/submissions
// @desc    Get all submissions for admin dashboard
// @access  Private (Admin)
router.get('/submissions', auth, adminAuth, async (req, res) => {
  try {
    const { status, page = 1, limit = 10 } = req.query;
    
    const query = status ? { status } : {};
    const skip = (page - 1) * limit;

    const submissions = await Submission.find(query)
      .populate('patientId', 'name email')
      .populate('reviewedBy', 'name')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    const total = await Submission.countDocuments(query);

    res.json({
      submissions: submissions.map(submission => ({
        id: submission._id,
        patientName: submission.patientName,
        patientIdNumber: submission.patientIdNumber,
        email: submission.email,
        note: submission.note,
        originalImageUrl: submission.originalImageUrl,
        annotatedImageUrl: submission.annotatedImageUrl,
        status: submission.status,
        reportUrl: submission.reportUrl,
        createdAt: submission.createdAt,
        reviewedAt: submission.reviewedAt,
        reviewedBy: submission.reviewedBy?.name,
        adminNotes: submission.adminNotes
      })),
      pagination: {
        current: parseInt(page),
        total: Math.ceil(total / limit),
        count: total
      }
    });
  } catch (error) {
    console.error('Get admin submissions error:', error);
    res.status(500).json({ message: 'Server error fetching submissions' });
  }
});

// @route   GET /api/admin/submissions/:id
// @desc    Get a specific submission with full details for admin
// @access  Private (Admin)
router.get('/submissions/:id', auth, adminAuth, async (req, res) => {
  try {
    const submission = await Submission.findById(req.params.id)
      .populate('patientId', 'name email')
      .populate('reviewedBy', 'name');

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
        originalImagePath: submission.originalImagePath,
        annotatedImageUrl: submission.annotatedImageUrl,
        annotationData: submission.annotationData,
        status: submission.status,
        reportUrl: submission.reportUrl,
        adminNotes: submission.adminNotes,
        createdAt: submission.createdAt,
        reviewedAt: submission.reviewedAt,
        reviewedBy: submission.reviewedBy?.name
      }
    });
  } catch (error) {
    console.error('Get admin submission error:', error);
    res.status(500).json({ message: 'Server error fetching submission' });
  }
});

// @route   POST /api/admin/submissions/:id/annotate
// @desc    Save annotation data and generate annotated image
// @access  Private (Admin)
router.post('/submissions/:id/annotate', auth, adminAuth, async (req, res) => {
  try {
    const { annotationData, adminNotes } = req.body;

    const submission = await Submission.findById(req.params.id);
    if (!submission) {
      return res.status(404).json({ message: 'Submission not found' });
    }

    // Save annotation data
    submission.annotationData = annotationData;
    submission.adminNotes = adminNotes;
    submission.status = 'annotated';
    submission.reviewedBy = req.user._id;
    submission.reviewedAt = new Date();

    // Generate annotated image
    try {
      const annotatedImageInfo = await saveAnnotatedImage(
        submission.originalImagePath,
        annotationData,
        submission._id
      );
      
      submission.annotatedImagePath = annotatedImageInfo.path;
      submission.annotatedImageUrl = annotatedImageInfo.url;
    } catch (imageError) {
      console.error('Error generating annotated image:', imageError);
      // Continue without annotated image - we still save the annotation data
    }

    await submission.save();

    res.json({
      message: 'Annotation saved successfully',
      submission: {
        id: submission._id,
        status: submission.status,
        annotatedImageUrl: submission.annotatedImageUrl,
        reviewedAt: submission.reviewedAt
      }
    });
  } catch (error) {
    console.error('Save annotation error:', error);
    res.status(500).json({ message: 'Server error saving annotation' });
  }
});

// @route   POST /api/admin/submissions/:id/generate-report
// @desc    Generate PDF report for a submission
// @access  Private (Admin)
router.post('/submissions/:id/generate-report', auth, adminAuth, async (req, res) => {
  try {
    const submission = await Submission.findById(req.params.id)
      .populate('reviewedBy', 'name');

    if (!submission) {
      return res.status(404).json({ message: 'Submission not found' });
    }

    if (submission.status !== 'annotated') {
      return res.status(400).json({ message: 'Submission must be annotated before generating report' });
    }

    // Generate PDF report
    const pdfInfo = await generatePDF(submission);
    
    submission.reportPath = pdfInfo.path;
    submission.reportUrl = pdfInfo.url;
    submission.status = 'reported';

    await submission.save();

    res.json({
      message: 'Report generated successfully',
      submission: {
        id: submission._id,
        status: submission.status,
        reportUrl: submission.reportUrl
      }
    });
  } catch (error) {
    console.error('Generate report error:', error);
    res.status(500).json({ message: 'Server error generating report' });
  }
});

// @route   GET /api/admin/dashboard-stats
// @desc    Get dashboard statistics for admin
// @access  Private (Admin)
router.get('/dashboard-stats', auth, adminAuth, async (req, res) => {
  try {
    const stats = await Promise.all([
      Submission.countDocuments({ status: 'uploaded' }),
      Submission.countDocuments({ status: 'annotated' }),
      Submission.countDocuments({ status: 'reported' }),
      Submission.countDocuments()
    ]);

    res.json({
      stats: {
        pending: stats[0],
        annotated: stats[1],
        reported: stats[2],
        total: stats[3]
      }
    });
  } catch (error) {
    console.error('Get dashboard stats error:', error);
    res.status(500).json({ message: 'Server error fetching dashboard stats' });
  }
});

module.exports = router;
