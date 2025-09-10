const path = require('path');
const fs = require('fs');
const { imagesDir, isS3Configured } = require('../config/multer');
const { uploadBufferToS3 } = require('./s3');

// Simplified annotation storage - store annotation data only, generate visual overlay on frontend
const saveAnnotatedImage = async (originalImagePath, annotationData, submissionId) => {
  try {
    // For now, we'll just store the annotation data and return the original image info
    // The frontend will handle the visual overlay of annotations
    
    const timestamp = Date.now();
    
    if (isS3Configured()) {
      // For S3, we'll store annotation metadata and reference the original image
      const annotationKey = `annotations/annotation-${submissionId}-${timestamp}.json`;
      const annotationBuffer = Buffer.from(JSON.stringify(annotationData));
      
      await uploadBufferToS3(annotationBuffer, annotationKey, 'application/json');
      
      return {
        path: originalImagePath, // Keep original image path
        url: originalImagePath.startsWith('http') ? originalImagePath : `https://${process.env.S3_BUCKET_NAME}.s3.${process.env.AWS_REGION}.amazonaws.com/${originalImagePath}`,
        annotationKey: annotationKey
      };
    } else {
      // For local storage, save annotation data as JSON file
      const annotationPath = path.join(imagesDir, `annotation-${submissionId}-${timestamp}.json`);
      fs.writeFileSync(annotationPath, JSON.stringify(annotationData));
      
      return {
        path: originalImagePath,
        url: originalImagePath.startsWith('/uploads') ? originalImagePath : `/uploads/images/${path.basename(originalImagePath)}`,
        annotationPath: annotationPath
      };
    }
  } catch (error) {
    console.error('Error saving annotation data:', error);
    throw error;
  }
};

// Helper function to draw arrow
const drawArrow = (ctx, startX, startY, endX, endY) => {
  const headLength = 10;
  const angle = Math.atan2(endY - startY, endX - startX);
  
  // Draw line
  ctx.beginPath();
  ctx.moveTo(startX, startY);
  ctx.lineTo(endX, endY);
  ctx.stroke();
  
  // Draw arrowhead
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

module.exports = { saveAnnotatedImage };
