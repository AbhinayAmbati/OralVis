const PDFDocument = require('pdfkit');
const fs = require('fs');
const path = require('path');
const https = require('https');
const http = require('http');
const sharp = require('sharp');
const { createCanvas, loadImage } = require('canvas');
const { pdfsDir, isS3Configured } = require('../config/multer');
const { uploadBufferToS3 } = require('./s3');

// Helper function to download image from URL and convert to JPEG
const downloadAndConvertImage = (url) => {
  return new Promise((resolve, reject) => {
    const protocol = url.startsWith('https:') ? https : http;
    protocol.get(url, (response) => {
      if (response.statusCode !== 200) {
        reject(new Error(`Failed to download image: ${response.statusCode}`));
        return;
      }
      
      const chunks = [];
      response.on('data', (chunk) => chunks.push(chunk));
      response.on('end', async () => {
        try {
          const imageBuffer = Buffer.concat(chunks);
          // Convert any image format to JPEG for PDFKit compatibility
          const jpegBuffer = await sharp(imageBuffer)
            .jpeg({ quality: 80 })
            .toBuffer();
          resolve(jpegBuffer);
        } catch (error) {
          reject(error);
        }
      });
      response.on('error', reject);
    }).on('error', reject);
  });
};

// Helper function to render annotations on image
const renderAnnotationsOnImage = async (imageBuffer, annotationData) => {
  try {
    if (!annotationData || !annotationData.annotations || annotationData.annotations.length === 0) {
      return imageBuffer;
    }

    // Load the image
    const image = await loadImage(imageBuffer);
    const canvas = createCanvas(image.width, image.height);
    const ctx = canvas.getContext('2d');

    // Draw the original image
    ctx.drawImage(image, 0, 0);

    // Draw annotations
    annotationData.annotations.forEach(annotation => {
      ctx.strokeStyle = annotation.color || '#ff0000';
      ctx.lineWidth = annotation.strokeWidth || 2;
      ctx.fillStyle = 'transparent';

      switch (annotation.type) {
        case 'rectangle':
          ctx.strokeRect(
            annotation.x,
            annotation.y,
            annotation.width,
            annotation.height
          );
          break;

        case 'circle':
          ctx.beginPath();
          const radius = Math.sqrt(Math.pow(annotation.width, 2) + Math.pow(annotation.height, 2)) / 2;
          ctx.arc(
            annotation.x + annotation.width / 2,
            annotation.y + annotation.height / 2,
            radius,
            0,
            2 * Math.PI
          );
          ctx.stroke();
          break;

        case 'arrow':
          ctx.beginPath();
          ctx.moveTo(annotation.startX, annotation.startY);
          ctx.lineTo(annotation.endX, annotation.endY);
          ctx.stroke();

          // Draw arrowhead
          const angle = Math.atan2(annotation.endY - annotation.startY, annotation.endX - annotation.startX);
          const arrowLength = 10;
          ctx.beginPath();
          ctx.moveTo(annotation.endX, annotation.endY);
          ctx.lineTo(
            annotation.endX - arrowLength * Math.cos(angle - Math.PI / 6),
            annotation.endY - arrowLength * Math.sin(angle - Math.PI / 6)
          );
          ctx.moveTo(annotation.endX, annotation.endY);
          ctx.lineTo(
            annotation.endX - arrowLength * Math.cos(angle + Math.PI / 6),
            annotation.endY - arrowLength * Math.sin(angle + Math.PI / 6)
          );
          ctx.stroke();
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
      }
    });

    // Convert canvas to buffer
    return canvas.toBuffer('image/jpeg', { quality: 0.8 });
  } catch (error) {
    console.error('Error rendering annotations:', error);
    return imageBuffer; // Return original if annotation fails
  }
};

// Generate PDF report based on the sample format
const generatePDF = async (submission) => {
    return new Promise(async (resolve, reject) => {
      try {
        // Create new PDF document
        const doc = new PDFDocument({ size: 'A4', margin: 50 });
        
        // Generate filename
        const timestamp = Date.now();
        const filename = `oral-health-report-${submission.patientIdNumber}-${timestamp}.pdf`;
        
        let buffers = [];
        
        // Collect PDF data in memory for S3 upload
        doc.on('data', buffers.push.bind(buffers));
        doc.on('end', async () => {
          try {
            const pdfBuffer = Buffer.concat(buffers);
            
            if (isS3Configured()) {
              // Upload to S3
              const s3Key = `reports/${filename}`;
              const result = await uploadBufferToS3(pdfBuffer, s3Key, 'application/pdf');
              resolve({
                path: result.url,
                url: result.url,
                key: result.key
              });
            } else {
              // Save locally
              const pdfPath = path.join(pdfsDir, filename);
              fs.writeFileSync(pdfPath, pdfBuffer);
              resolve({
                path: pdfPath,
                url: `/uploads/pdfs/${filename}`
              });
            }
          } catch (error) {
            reject(error);
          }
        });
        
        // Constants for layout
        const pageWidth = doc.page.width;
        const leftMargin = 50;
        const rightMargin = pageWidth - 50;
        const contentWidth = rightMargin - leftMargin;
        
        // Header with purple background
        doc.rect(0, 0, pageWidth, 120).fill('#8B5A96');
        
        // Title - properly centered
        doc.fontSize(28).fillColor('white').font('Helvetica-Bold');
        doc.text('Oral Health Screening', 0, 30, { 
          width: pageWidth, 
          align: 'center' 
        });
        doc.text('Report', 0, 65, { 
          width: pageWidth, 
          align: 'center' 
        });
        
        // Patient Information Section
        doc.fillColor('black').fontSize(12).font('Helvetica');
        let yPosition = 150;
        
        // Patient details in properly aligned columns
        const col1X = leftMargin;
        const col2X = leftMargin + (contentWidth / 3);
        const col3X = leftMargin + (2 * contentWidth / 3);
        
        doc.text(`Name: ${submission.patientName}`, col1X, yPosition);
        doc.text(`Mail: ${submission.email}`, col2X, yPosition);
        doc.text(`Date: ${new Date(submission.createdAt).toLocaleDateString('en-GB')}`, col3X, yPosition);
        
        yPosition += 40;
        
        // Screening Report Section - properly sized box
        const boxHeight = 320;
        doc.rect(leftMargin, yPosition, contentWidth, boxHeight)
           .stroke('#E0E0E0')
           .fillAndStroke('#F5F5F5', '#E0E0E0');
        
        yPosition += 20;
        doc.fontSize(14).font('Helvetica-Bold').fillColor('black');
        doc.text('SCREENING REPORT:', leftMargin + 20, yPosition);
        
        yPosition += 30;
        
        // Images section - properly centered and aligned
        const imageWidth = 120;
        const imageHeight = 90;
        const imageSpacing = 30;
        const totalImageWidth = (imageWidth * 2) + imageSpacing;
        const imageStartX = leftMargin + (contentWidth - totalImageWidth) / 2;
        
        if (submission.originalImageUrl) {
          try {
            let imageBuffer;
            if (submission.originalImageUrl.startsWith('http')) {
              imageBuffer = await downloadAndConvertImage(submission.originalImageUrl);
            } else if (!isS3Configured() && submission.originalImageUrl.startsWith('/uploads')) {
              const imagePath = path.join(__dirname, '..', submission.originalImageUrl);
              const localBuffer = fs.readFileSync(imagePath);
              imageBuffer = await sharp(localBuffer).jpeg({ quality: 80 }).toBuffer();
            }
            
            if (imageBuffer) {
              // Original image - properly positioned
              doc.image(imageBuffer, imageStartX, yPosition, { 
                width: imageWidth, 
                height: imageHeight 
              });
              
              // Label for original image - centered under image
              doc.fontSize(10).font('Helvetica-Bold').fillColor('white');
              const labelHeight = 20;
              doc.rect(imageStartX, yPosition + imageHeight, imageWidth, labelHeight).fill('#E74C3C');
              doc.text('Upper Teeth', imageStartX, yPosition + imageHeight + 5, {
                width: imageWidth,
                align: 'center'
              });
            }
          } catch (imgError) {
            console.log('Error adding original image:', imgError);
          }
        }
        
        // Annotated image - properly aligned next to original
        if (submission.originalImageUrl) {
          try {
            let baseImageBuffer;
            if (submission.originalImageUrl.startsWith('http')) {
              baseImageBuffer = await downloadAndConvertImage(submission.originalImageUrl);
            } else if (!isS3Configured() && submission.originalImageUrl.startsWith('/uploads')) {
              const imagePath = path.join(__dirname, '..', submission.originalImageUrl);
              const localBuffer = fs.readFileSync(imagePath);
              baseImageBuffer = await sharp(localBuffer).jpeg({ quality: 80 }).toBuffer();
            }
            
            if (baseImageBuffer) {
              // Render annotations on the image if annotation data exists
              let annotatedImageBuffer = baseImageBuffer;
              if (submission.annotationData) {
                annotatedImageBuffer = await renderAnnotationsOnImage(baseImageBuffer, submission.annotationData);
              }
              
              const annotatedImageX = imageStartX + imageWidth + imageSpacing;
              doc.image(annotatedImageBuffer, annotatedImageX, yPosition, { 
                width: imageWidth, 
                height: imageHeight 
              });
              
              // Label for annotated image - centered under image
              const labelHeight = 20;
              doc.rect(annotatedImageX, yPosition + imageHeight, imageWidth, labelHeight).fill('#E74C3C');
              doc.fontSize(10).font('Helvetica-Bold').fillColor('white');
              doc.text('Annotated Image', annotatedImageX, yPosition + imageHeight + 5, {
                width: imageWidth,
                align: 'center'
              });
            }
          } catch (imgError) {
            console.log('Error adding annotated image:', imgError);
          }
        }
        
        // Legend - properly aligned in grid
        yPosition += imageHeight + 50;
        doc.fontSize(8).fillColor('black').font('Helvetica');
        
        const legendItems = [
          { color: '#8B4513', text: 'Inflammed / Red gums' },
          { color: '#FFD700', text: 'Misaligned' },
          { color: '#8B4513', text: 'Receded gums' },
          { color: '#FF0000', text: 'Stains' },
          { color: '#00FFFF', text: 'Attrition' },
          { color: '#FF1493', text: 'Crowns' }
        ];
        
        const legendCols = 3;
        const legendColWidth = contentWidth / legendCols;
        const legendStartY = yPosition;
        
        legendItems.forEach((item, index) => {
          const col = index % legendCols;
          const row = Math.floor(index / legendCols);
          const xPos = leftMargin + 20 + (col * legendColWidth);
          const yPos = legendStartY + (row * 20);
          
          // Color square
          doc.rect(xPos, yPos, 10, 10).fill(item.color);
          // Text aligned properly next to square
          doc.fillColor('black').text(item.text, xPos + 15, yPos + 1);
        });
        
        yPosition = legendStartY + (Math.ceil(legendItems.length / legendCols) * 20) + 30;
        
        // Treatment Recommendations Section
        doc.fontSize(14).font('Helvetica-Bold').fillColor('black');
        doc.text('TREATMENT RECOMMENDATIONS:', leftMargin, yPosition);
        
        yPosition += 25;
        doc.fontSize(10).font('Helvetica');
        
        // Treatment recommendations with proper alignment
        const treatments = [
          { color: '#8B4513', condition: 'Inflammed or Red gums', treatment: 'Scaling.' },
          { color: '#FFD700', condition: 'Misaligned', treatment: 'Braces or Clear Aligner.' },
          { color: '#8B4513', condition: 'Receded gums', treatment: 'Gum Surgery.' },
          { color: '#FF0000', condition: 'Stains', treatment: 'Teeth cleaning and polishing.' },
          { color: '#00FFFF', condition: 'Attrition', treatment: 'Filling/ Night Guard.' },
          { color: '#FF1493', condition: 'Crowns', treatment: 'If the crown is loose or broken, better get it checked. Teeth coloured caps are the best ones.' }
        ];
        
        const colorSquareX = leftMargin;
        const conditionX = leftMargin + 20;
        const colonX = leftMargin + 170;
        const treatmentX = leftMargin + 180;
        
        treatments.forEach(item => {
          // Color square aligned
          doc.rect(colorSquareX, yPosition, 10, 10).fill(item.color);
          
          // Condition text aligned
          doc.fillColor('black').text(item.condition, conditionX, yPosition + 1);
          
          // Colon aligned
          doc.text(':', colonX, yPosition + 1);
          
          // Treatment text aligned with proper wrapping
          const treatmentWidth = rightMargin - treatmentX;
          doc.text(item.treatment, treatmentX, yPosition + 1, { 
            width: treatmentWidth,
            continued: false
          });
          
          yPosition += 22; // Consistent spacing between items
        });
        
        // Admin notes if available - properly formatted
        if (submission.adminNotes) {
          yPosition += 20;
          doc.fontSize(12).font('Helvetica-Bold').fillColor('black');
          doc.text('Additional Notes:', leftMargin, yPosition);
          yPosition += 18;
          doc.fontSize(10).font('Helvetica');
          doc.text(submission.adminNotes, leftMargin, yPosition, { 
            width: contentWidth,
            align: 'left'
          });
        }
        
        // Footer - properly aligned at bottom
        const footerY = doc.page.height - 80;
        doc.fontSize(8).fillColor('gray').font('Helvetica');
        doc.text(`Report generated on: ${new Date().toLocaleString()}`, leftMargin, footerY);
        doc.text(`Submission ID: ${submission._id}`, leftMargin, footerY + 12);
        
        // Finalize PDF
        doc.end();
        
      } catch (error) {
        reject(error);
      }
    });
  };
  
  module.exports = { generatePDF };