# OralVis Assessment - Oral Health Screening Platform

A comprehensive MERN stack application for oral health assessment with patient uploads, admin annotations, and automated PDF report generation.

### Images and PDFs are stored in AWS S3 bucket.

## Features

### Authentication & Roles
- JWT-based authentication
- Role-based access control (Patient/Admin)
- Secure registration and login

### Patient Features
- Upload teeth photos with patient details
- View submission history and status
- Download generated PDF reports
- Track assessment progress

### Admin Features
- Dashboard with submission statistics
- Review and annotate patient submissions
- Advanced annotation tools (rectangle, circle, arrow, freehand)
- Generate professional PDF reports
- Manage all patient submissions

### PDF Report Generation
- Professional medical report format
- Includes patient details and annotated images
- Treatment recommendations based on findings
- Downloadable reports for patients

## Tech Stack

### Backend
- Node.js & Express.js
- MongoDB with Mongoose
- JWT Authentication
- Multer for file uploads
- PDFKit for report generation
- Canvas for image processing
- AWS S3 for image and PDF storage

### Frontend
- React 18 with Vite
- React Router for navigation
- Tailwind CSS for styling
- Axios for API calls
- Canvas API for annotations
- Lucide React for icons

## Installation & Setup

### Prerequisites
- Node.js (v16 or higher)
- MongoDB (local or cloud)
- Git

### Backend Setup

1. Navigate to backend directory:
```bash
cd backend
```

2. Install dependencies:
```bash
npm install
```

3. Create environment file:
```bash
cp .env.example .env
```

4. Update `.env` file with your configuration:
```env
MONGODB_URI=mongodb://localhost:27017/oralvis
JWT_SECRET=your_secure_jwt_secret_key
JWT_EXPIRE=7d
PORT=5000

AWS_ACCESS_KEY_ID=your_aws_access_key
AWS_SECRET_ACCESS_KEY=your_aws_secret_key
AWS_REGION=us-east-1
S3_BUCKET_NAME=oralvis-storage
```

5. Start the backend server:
```bash
npm run dev
```

The backend will run on `http://localhost:5000`

### Frontend Setup

1. Navigate to frontend directory:
```bash
cd frontend
```

2. Install dependencies:
```bash
npm install
```

3. Start the development server:
```bash
npm run dev
```

The frontend will run on `http://localhost:5173`

### MongoDB Setup

1. **Local MongoDB:**
   - Install MongoDB Community Edition
   - Start MongoDB service
   - Database will be created automatically

2. **MongoDB Atlas (Cloud):**
   - Create account at mongodb.com
   - Create cluster and get connection string
   - Update `MONGODB_URI` in `.env`

## Usage

### For Patients

1. **Registration:**
   - Visit the application
   - Click "Sign up here"
   - Fill in details including Patient ID
   - Select "Patient" role

2. **Upload Your Teeth Photo:**
   - Login to your account
   - Click "Upload New Submission"
   - Fill patient details and upload teeth photo
   - Add any additional notes
   - Submit for review

3. **Track Progress:**
   - View submission status on dashboard
   - Download PDF reports when available

### For Admins

1. **Registration:**
   - Register with "Admin" role
   - No Patient ID required

2. **Review Submissions:**
   - Access admin dashboard
   - View all patient submissions
   - Filter by status or search patients

3. **Annotate Images:**
   - Click "Annotate" on uploaded submissions
   - Use annotation tools:
     - Rectangle: Mark specific areas
     - Circle: Highlight circular regions
     - Arrow: Point to specific issues
     - Freehand: Draw custom shapes
   - Add admin notes
   - Save annotations

4. **Generate Reports:**
   - Click "Generate Report" on annotated submissions
   - PDF reports are automatically created
   - Patients can download their reports

## API Endpoints

### Authentication
- `POST /api/auth/register` - User registration
- `POST /api/auth/login` - User login
- `POST /api/auth/logout` - User logout
- `GET /api/auth/me` - Get current user

### Patient Submissions
- `POST /api/submissions/upload` - Upload new submission
- `GET /api/submissions/my-submissions` - Get patient's submissions
- `GET /api/submissions/:id` - Get specific submission
- `GET /api/submissions/:id/download-report` - Download PDF report

### Admin Operations
- `GET /api/admin/submissions` - Get all submissions
- `GET /api/admin/submissions/:id` - Get submission details
- `POST /api/admin/submissions/:id/annotate` - Save annotations
- `POST /api/admin/submissions/:id/generate-report` - Generate PDF
- `GET /api/admin/dashboard-stats` - Get dashboard statistics

## File Structure

```
OralVis-Assessment/
├── backend/
│   ├── config/
│   │   └── multer.js
│   ├── middleware/
│   │   └── auth.js
│   ├── models/
│   │   ├── User.js
│   │   └── Submission.js
│   ├── routes/
│   │   ├── auth.js
│   │   ├── submissions.js
│   │   └── admin.js
│   ├── utils/
│   │   ├── imageProcessor.js
│   │   └── pdfGenerator.js
│   ├── uploads/
│   │   ├── images/
│   │   └── pdfs/
│   ├── server.js
│   ├── package.json
│   └── .env
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   │   ├── auth/
│   │   │   ├── patient/
│   │   │   ├── admin/
│   │   │   └── layout/
│   │   ├── contexts/
│   │   │   └── AuthContext.jsx
│   │   ├── utils/
│   │   │   └── api.js
│   │   ├── App.jsx
│   │   └── main.jsx
│   ├── package.json
│   └── vite.config.js
└── README.md
```

## Security Features

- JWT token-based authentication
- Password hashing with bcrypt
- Role-based access control
- File upload validation
- CORS protection
- Environment variable protection

## Troubleshooting

### Common Issues

1. **MongoDB Connection Error:**
   - Ensure MongoDB is running
   - Check connection string in `.env`
   - Verify network connectivity

2. **File Upload Issues:**
   - Check file size limits (10MB max)
   - Verify supported formats (JPEG, PNG, GIF, WebP)
   - Ensure uploads directory exists

3. **PDF Generation Errors:**
   - Verify Canvas dependencies are installed
   - Check image file paths
   - Ensure sufficient disk space

4. **Authentication Issues:**
   - Verify JWT_SECRET in `.env`
   - Check token expiration
   - Clear browser localStorage if needed

### Development Tips

- Use `npm run dev` for development with auto-restart
- Check browser console for frontend errors
- Monitor backend logs for API issues
- Use MongoDB Compass for database inspection

## Contributing

1. Fork the repository
2. Create feature branch
3. Make changes
4. Test thoroughly
5. Submit pull request

## License

This project is licensed under the ISC License.

## Support

For support and questions:
- Check troubleshooting section
- Review API documentation
- Contact development team

---

**Note:** This application is designed for educational and demonstration purposes. For production use, implement additional security measures and testing.
