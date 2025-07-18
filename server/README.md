# SkillSync Server

Backend API server for SkillSync - an AI-powered recruitment platform.

## 🚀 Tech Stack

- **Runtime**: Node.js (v18+ recommended)
- **Framework**: Express.js
- **Database**: MongoDB
- **AI/ML**: Groq AI (Llama 3.3 70B)
- **Cloud Storage**: AWS S3
- **Authentication**: JWT
- **File Processing**: Multer, PDF-Parse, Mammoth

## 📋 Prerequisites

Before running the server, ensure you have:

- Node.js v18 or higher installed
- MongoDB installed and running locally (or MongoDB Atlas connection string)
- AWS account with S3 bucket configured
- Groq AI API key

## 🔧 Installation

1. Navigate to the server directory:
```bash
cd server
```

2. Install dependencies:
```bash
npm install
```

3. Create a `.env` file in the server directory with the following variables:

```env
# MongoDB Configuration
MONGODB_URI=mongodb://localhost:27017/SkillSync

# JWT Configuration
JWT_SECRET=your_super_secret_jwt_key_change_this_in_production
JWT_EXPIRES_IN=7d

# Groq AI Configuration (for resume analysis)
# Get your API key from: https://console.groq.com/
GROQ_API_KEY=your_groq_api_key_here

# Email Configuration (for notifications)
EMAIL_SERVICE=gmail
EMAIL_USER=your_email@gmail.com
EMAIL_PASS=your_app_password_here

# Company Configuration
COMPANY_NAME=SkillSync

# AWS S3 Configuration (for resume storage)
AWS_ACCESS_KEY_ID=your_aws_access_key
AWS_SECRET_ACCESS_KEY=your_aws_secret_key
AWS_REGION=us-east-1
AWS_S3_BUCKET_NAME=your_bucket_name
```

## 🏃 Running the Server

### Development Mode
```bash
npm run dev
```

### Production Mode
```bash
npm start
```

The server will start on `http://localhost:5000`

## 📡 API Endpoints

### Authentication
- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - Login user
- `GET /api/auth/me` - Get current user (protected)

### Jobs
- `GET /api/jobs` - Get all jobs
- `GET /api/jobs/:id` - Get job by ID
- `POST /api/jobs` - Create new job (admin only)
- `PUT /api/jobs/:id` - Update job (admin only)
- `DELETE /api/jobs/:id` - Delete job (admin only)

### Applications
- `GET /api/applications` - Get all applications
- `GET /api/applications/:id` - Get application by ID
- `POST /api/applications` - Submit job application
- `PUT /api/applications/:id/status` - Update application status (admin only)
- `POST /api/applications/:id/analyze` - Trigger ATS score analysis

### Candidates
- `GET /api/candidates` - Get all candidates (admin only)
- `GET /api/candidates/:id` - Get candidate by ID (admin only)
- `GET /api/candidates/job/:jobId` - Get candidates for specific job

### Dashboard
- `GET /api/dashboard/stats` - Get dashboard statistics
- `GET /api/dashboard/recent-activity` - Get recent activity

### Search
- `GET /api/search/unified?query=` - Unified search across jobs and candidates
- `GET /api/search/jobs?query=` - Search jobs
- `GET /api/search/candidates?query=` - Search candidates

## 🧠 ATS Scoring System

The server uses an advanced AI-powered ATS (Applicant Tracking System) scoring algorithm with weighted categories:

### Scoring Categories

1. **Skills Match (35%)** - Technical and soft skills alignment
2. **Experience Match (30%)** - Work experience relevance
3. **Education Match (15%)** - Educational qualifications
4. **Keywords Match (20%)** - Job description keyword density

### Score Ranges

- **0-40**: Poor match - Lacks most required skills/experience
- **41-60**: Average match - Has some relevant skills but missing key requirements
- **61-80**: Good match - Meets most requirements with relevant experience
- **81-100**: Excellent match - Exceeds requirements, highly qualified

### Features

- Weighted scoring for accurate candidate ranking
- Synonym matching (e.g., JS = JavaScript, React.js = React)
- Detailed breakdown by category
- Match summary explanation
- Retry mechanism with exponential backoff

## 📁 Project Structure

```
server/
├── src/
│   ├── config/           # Configuration files
│   │   ├── database.js   # MongoDB connection
│   │   ├── aws.js        # AWS S3 configuration
│   │   ├── logger.js     # Winston logger setup
│   │   └── constants.js  # Application constants
│   ├── controllers/      # Request handlers
│   │   ├── auth.controller.js
│   │   ├── job.controller.js
│   │   ├── application.controller.js
│   │   ├── candidate.controller.js
│   │   ├── dashboard.controller.js
│   │   └── search.controller.js
│   ├── models/           # Mongoose schemas
│   │   ├── User.js
│   │   ├── Job.js
│   │   ├── Application.js
│   │   └── index.js
│   ├── routes/           # API routes
│   │   ├── index.js
│   │   ├── auth.routes.js
│   │   ├── job.routes.js
│   │   ├── application.routes.js
│   │   ├── candidate.routes.js
│   │   ├── dashboard.routes.js
│   │   └── search.routes.js
│   ├── services/         # Business logic
│   │   ├── ats-score.service.js      # AI-powered ATS scoring
│   │   ├── application.service.js
│   │   ├── job.service.js
│   │   ├── resume-analysis.service.js
│   │   ├── resume-parser.service.js  # PDF/DOCX parsing
│   │   ├── s3.service.js             # AWS S3 operations
│   │   └── index.js
│   ├── middleware/       # Custom middleware
│   │   ├── auth.middleware.js        # JWT authentication
│   │   ├── error.middleware.js       # Error handling
│   │   └── upload.middleware.js      # File upload handling
│   ├── utils/            # Helper functions
│   │   ├── ApiError.js
│   │   ├── ApiResponse.js
│   │   ├── catchAsync.js
│   │   └── search.utils.js
│   └── app.js            # Express app configuration
├── server.js             # Entry point
├── package.json
└── .env
```

## 🔐 Security Features

- JWT-based authentication
- Password hashing with bcrypt
- Role-based access control (admin/user)
- Input validation with express-validator
- CORS protection
- Environment variable management
- Secure file upload handling

## 📊 Logging

The server uses Winston for structured logging:

- **Development**: Console output with colors
- **Production**: File-based logging with rotation
- Log levels: error, warn, info, debug
- Request/response logging
- Error stack traces

## 🚨 Error Handling

Centralized error handling with:

- Custom ApiError class
- HTTP status code mapping
- Detailed error messages in development
- Generic error messages in production
- Automatic error logging

## 🧪 Testing

```bash
# Run tests (when implemented)
npm test
```

## 📦 Dependencies

### Production
- `express` - Web framework
- `mongoose` - MongoDB ODM
- `groq-sdk` - AI/ML for resume analysis
- `@aws-sdk/client-s3` - AWS S3 client
- `bcryptjs` - Password hashing
- `jsonwebtoken` - JWT authentication
- `multer` - File upload handling
- `pdf-parse` - PDF text extraction
- `mammoth` - DOCX text extraction
- `winston` - Logging
- `nodemailer` - Email notifications
- `cors` - CORS middleware
- `dotenv` - Environment variables
- `express-validator` - Input validation

## 🚀 Deployment

### Environment Setup

1. Set all environment variables in production
2. Use MongoDB Atlas for database
3. Configure AWS S3 bucket with proper permissions
4. Set NODE_ENV=production

### Recommended Hosting

- **Server**: Heroku, AWS EC2, DigitalOcean
- **Database**: MongoDB Atlas
- **Storage**: AWS S3

## 📝 License

MIT

## 👥 Support

For issues and questions, please create an issue in the repository.
