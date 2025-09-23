# Student Portal - Charusat University by yash

A comprehensive full-stack student management portal built with Next.js, MongoDB, and Tailwind CSS. Features role-based access control, real-time notifications, and modern UI inspired by Notion and Google Classroom.

## Features

### 🔐 Authentication & Authorization
- College email validation (e.g., 23DIT015@charusat.edu.in)
- Automatic department and admission year extraction from email
- Role-based access control (Student, Admin, Counselor, Faculty, HOD)
- Secure session management with NextAuth.js

### 👨‍🎓 Student Features
- Academic information onboarding
- View enrolled subjects and course materials
- Upload and submit assignments
- Track grades and academic progress
- Download timetables
- Real-time notifications

### 👨‍💼 Admin Features (CSE, CE, IT)
- Manage student registrations
- Assign counselors to students
- Approve Faculty/HOD registrations
### 🏛️ HOD Features
- View department students and subjects
- Review and approve software project groups
- Assign Internal/External guides to groups

### 💻 Software Project Groups
- Students submit group details (title, domain, description, members)
- Auto-generated unique Group ID
- HOD approval workflow and guide assignment
- API: `/api/projects` (POST/GET/PATCH)

- Monitor system statistics
- User management and permissions

### 👨‍🏫 Counselor Features
- View assigned students
- Track academic progress
- Generate progress reports
- Upload and manage timetables

### 👨‍🏫 Faculty Features
- Post assignments with attachments
- Grade student submissions
- Track student performance
- Manage course materials

### 🎨 Advanced Features
- Real-time notifications via Socket.io
- PDF export for progress reports
- Mobile-responsive design
- Dark/light theme toggle
- Modern UI with Framer Motion animations
- File uploads via Cloudinary

## Tech Stack

- **Frontend**: Next.js 14 (App Router), React 18, Tailwind CSS
- **Backend**: Next.js API Routes, MongoDB with Mongoose
- **Authentication**: NextAuth.js
- **Real-time**: Socket.io
- **File Storage**: Cloudinary
- **PDF Generation**: jsPDF
- **Animations**: Framer Motion
- **UI Components**: Lucide React Icons

## Prerequisites

- Node.js 18+ 
- MongoDB (local or Atlas)
- Cloudinary account (for file uploads)

## Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd student-portal
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up environment variables**
   Create a `.env.local` file in the root directory:
   ```env
   # Database
   MONGODB_URI=mongodb://localhost:27017/student-portal
   
   # NextAuth
   NEXTAUTH_URL=http://localhost:3000
   NEXTAUTH_SECRET=your-secret-key-here
   
   # Cloudinary
   CLOUDINARY_CLOUD_NAME=your-cloud-name
   CLOUDINARY_API_KEY=your-api-key
   CLOUDINARY_API_SECRET=your-api-secret
   
   # Email (for notifications)
   EMAIL_SERVER_HOST=smtp.gmail.com
   EMAIL_SERVER_PORT=587
   EMAIL_SERVER_USER=your-email@gmail.com
   EMAIL_SERVER_PASSWORD=your-app-password
   ```

4. **Set up MongoDB**
   - Install MongoDB locally or use MongoDB Atlas
   - Create a database named `student-portal`
   - The application will automatically create collections

5. **Set up Cloudinary** (optional for file uploads)
   - Create a Cloudinary account
   - Get your cloud name, API key, and API secret
   - Add them to your environment variables

6. **Run the development server**
   ```bash
   npm run dev
   ```

7. **Open your browser**
   Navigate to [http://localhost:3000](http://localhost:3000)

## Database Schema

### User Model
- Email (college email format)
- Password (hashed)
- Role (student, admin, counselor, faculty)
- Department (extracted from email)
- Admission Year (extracted from email)
- Academic Information (name, semester, section, etc.)
- Counselor assignment
- Active status

### Subject Model
- Subject code and name
- Department and semester
- Credits and faculty assignment
- Description and syllabus

### Assignment Model
- Title and description
- Subject and faculty
- Due date and max marks
- File attachments

### Submission Model
- Assignment reference
- Student reference
- Submitted files
- Grades and feedback
- Submission status

## API Routes

### Authentication
- `POST /api/auth/[...nextauth]` - NextAuth configuration

### User Management
- `POST /api/user/onboarding` - Save academic information

### Subjects
- `GET /api/subjects` - Get subjects for user
- `POST /api/subjects` - Create new subject (admin/faculty)

### Assignments
- `GET /api/assignments` - Get assignments
- `POST /api/assignments` - Create assignment (faculty)
- `PUT /api/assignments/[id]` - Update assignment

### Submissions
- `GET /api/submissions` - Get submissions
- `POST /api/submissions` - Submit assignment (student)
- `PUT /api/submissions/[id]` - Grade submission (faculty)

## Role-Based Access

### Student
- View enrolled subjects
- Submit assignments
- View grades and progress
- Download timetables
- Receive notifications

### Admin (CSE, CE, IT)
- Manage student registrations
- Assign counselors
- View system statistics
- Manage user permissions

### Counselor
- View assigned students
- Track academic progress
- Generate progress reports
- Upload timetables

### Faculty
- Post assignments
- Grade submissions
- Track student performance
- Manage course materials

## Email Format Validation

The system validates college email addresses using the format:
- Pattern: `[YY][DEPT][XXX]@charusat.edu.in`
- Example: `23DIT015@charusat.edu.in`
- Extracts: Year (23), Department (DIT), Roll Number (015)

## Real-time Features

- Socket.io integration for live notifications
- Real-time updates for assignments and grades
- Instant notifications for new assignments and grades

## File Upload

- Cloudinary integration for file storage
- Support for multiple file types
- Automatic file optimization
- Secure file access

## PDF Generation

- jsPDF for progress report generation
- Customizable report templates
- Download functionality for reports

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## License

This project is licensed under the MIT License.

## Support

For support, please contact the development team or create an issue in the repository.

---

**Note**: This is a comprehensive student portal system designed for Charusat University. Make sure to customize the email domain validation and other institution-specific features according to your requirements. 

## Principal Role (Read-Only) & Feedback Chat

The `principal` role has cross-module visibility (students, guides, subjects, projects, settings) but is intentionally prevented from performing write operations. Any protected POST/PATCH endpoints should check `canWrite(role)` from `src/lib/permissions.js`.

### How Feedback Works

1. A floating "Chat with Admin" button is available on all dashboard pages for principals.
2. Messages are stored with the originating page path so admins see full context.
3. Real-time delivery occurs through Socket.IO using events:
   - `principal:message` (to admins)
   - `admin:reply` (to principal)
4. Admins can view a summary of active pages with principal feedback at: `/dashboard/admin/principal-chats`.

### Key Files

| Feature | File |
|---------|------|
| Chat UI | `src/components/chat/ChatWithAdmin.jsx` |
| API (list/send) | `src/app/api/principal-chat/route.js` |
| Model | `src/models/PrincipalChat.js` |
| Socket wiring | `server.js` |
| Permissions helper | `src/lib/permissions.js` |

### Extending Read-Only Enforcement

Import and use `canWrite` (or `assertCanWrite`) in any new mutating API route to automatically block principal actions.
