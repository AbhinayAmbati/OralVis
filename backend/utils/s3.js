const { S3Client, PutObjectCommand, DeleteObjectCommand, GetObjectCommand } = require('@aws-sdk/client-s3');
const { Upload } = require('@aws-sdk/lib-storage');
const { getSignedUrl: getSignedUrlV3 } = require('@aws-sdk/s3-request-presigner');
const fs = require('fs');
const path = require('path');

// Configure AWS S3 Client (v3)
const s3Client = new S3Client({
  region: process.env.AWS_REGION || 'us-east-1',
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  },
});

const bucketName = process.env.S3_BUCKET_NAME;

// Upload file to S3
const uploadToS3 = async (filePath, key, contentType = 'application/octet-stream') => {
  try {
    const fileContent = fs.readFileSync(filePath);
    
    const upload = new Upload({
      client: s3Client,
      params: {
        Bucket: bucketName,
        Key: key,
        Body: fileContent,
        ContentType: contentType,
        ACL: 'public-read'
      },
    });

    const result = await upload.done();
    
    // Clean up local file after successful upload
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }
    
    return {
      url: result.Location,
      key: result.Key,
      bucket: result.Bucket
    };
  } catch (error) {
    console.error('Error uploading to S3:', error);
    throw error;
  }
};

// Upload buffer to S3 (for generated content)
const uploadBufferToS3 = async (buffer, key, contentType = 'application/octet-stream') => {
  try {
    const upload = new Upload({
      client: s3Client,
      params: {
        Bucket: bucketName,
        Key: key,
        Body: buffer,
        ContentType: contentType,
        ACL: 'public-read'
      },
    });

    const result = await upload.done();
    
    return {
      url: result.Location,
      key: result.Key,
      bucket: result.Bucket
    };
  } catch (error) {
    console.error('Error uploading buffer to S3:', error);
    throw error;
  }
};

// Delete file from S3
const deleteFromS3 = async (key) => {
  try {
    const command = new DeleteObjectCommand({
      Bucket: bucketName,
      Key: key
    });

    await s3Client.send(command);
    return true;
  } catch (error) {
    console.error('Error deleting from S3:', error);
    throw error;
  }
};

// Get signed URL for private access (if needed)
const getSignedUrl = async (key, expires = 3600) => {
  const command = new GetObjectCommand({
    Bucket: bucketName,
    Key: key,
  });

  return await getSignedUrlV3(s3Client, command, { expiresIn: expires });
};

// Check if S3 is configured
const isS3Configured = () => {
  return !!(process.env.AWS_ACCESS_KEY_ID && 
           process.env.AWS_SECRET_ACCESS_KEY && 
           process.env.S3_BUCKET_NAME);
};

module.exports = {
  uploadToS3,
  uploadBufferToS3,
  deleteFromS3,
  getSignedUrl,
  isS3Configured,
  s3Client,
  bucketName
};
