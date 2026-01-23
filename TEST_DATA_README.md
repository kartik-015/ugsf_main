# Test Registration Data Import

## Overview
This directory contains test registration data for the UGSF project. The data includes students and faculty members from three departments: CSE, CE, and IT.

## Files

### 1. test-registration-data.csv
Contains 45 test users:
- **30 Students**: 
  - 10 from CSE (5 from batch 2023, 5 from batch 2024)
  - 10 from CE (5 from batch 2023, 5 from batch 2024)
  - 10 from IT (5 from batch 2023, 5 from batch 2024)
  
- **15 Faculty Members**:
  - 5 from CSE department
  - 5 from CE department
  - 5 from IT department

### 2. scripts/import-test-data.js
Node.js script to import the CSV data into MongoDB database.

## CSV Structure

The CSV file contains the following columns:

| Column | Description | Required For |
|--------|-------------|--------------|
| role | User role (student/guide) | All |
| email | User email address | All |
| password | User password (kartik123 for all) | All |
| name | Full name | All |
| phoneNumber | Phone number with +91 | All |
| address | Physical address | All |
| department | Department (CSE/CE/IT) | All |
| university | University name (CHARUSAT) | All |
| institute | Institute (CSPIT/DEPSTAR) | All |
| admissionYear | Year of admission | Students only |
| semester | Current semester (1-8) | Students only |
| batch | Batch section (A/B/C/D) | Students only |
| rollNumber | Student roll number | Students only |
| specialization | Area of specialization | Faculty only |
| education | Educational qualifications | Faculty only |
| experience | Years of experience | Faculty only |
| interests | Semicolon-separated interests | All |

## How to Use

### Step 1: Ensure MongoDB is Running
Make sure your MongoDB server is running and the connection string is properly configured in `.env.local`:

```bash
MONGODB_URI=mongodb://localhost:27017/student-portal
```

### Step 2: Run the Import Script

```bash
node scripts/import-test-data.js
```

The script will:
1. Connect to MongoDB
2. Read the CSV file
3. Create user accounts with all registration and onboarding data completed
4. Display a summary of created users

### Features
- **Auto-verification**: All users are created with email verified status
- **Auto-onboarding**: All users are marked as onboarded with complete profiles
- **Auto-approval**: All users are approved and can immediately login
- **Duplicate checking**: Skips users that already exist in the database

## Sample Login Credentials

All users have the same password: **kartik123**

### Students - CSE Department
- 23CS001@charusat.edu.in (Rahul Sharma - Sem 3, Batch A)
- 23CS002@charusat.edu.in (Priya Patel - Sem 3, Batch A)
- 24CS001@charusat.edu.in (Neha Desai - Sem 1, Batch A)
- 24CS002@charusat.edu.in (Karan Singh - Sem 1, Batch A)
- ... and more

### Students - CE Department
- 23CE001@charusat.edu.in (Rajesh Modi - Sem 3, Batch A)
- 23CE002@charusat.edu.in (Kavita Trivedi - Sem 3, Batch A)
- 24CE001@charusat.edu.in (Divya Nair - Sem 1, Batch A)
- 24CE002@charusat.edu.in (Harsh Malhotra - Sem 1, Batch A)
- ... and more

### Students - IT Department (DEPSTAR)
- 23DIT001@charusat.edu.in (Deepak Saxena - Sem 3, Batch A)
- 23DIT002@charusat.edu.in (Sonal Kapoor - Sem 3, Batch A)
- 24DIT001@charusat.edu.in (Ishita Bansal - Sem 1, Batch A)
- 24DIT002@charusat.edu.in (Siddharth Jain - Sem 1, Batch A)
- ... and more

### Faculty - All Departments
- rajesh.kumar@charusat.ac.in (Dr. Rajesh Kumar - CSE)
- priya.shah@charusat.ac.in (Dr. Priya Shah - CSE)
- kavita.trivedi@charusat.ac.in (Dr. Kavita Trivedi - CE)
- ramesh.joshi@charusat.ac.in (Prof. Ramesh Joshi - CE)
- deepak.saxena@charusat.ac.in (Dr. Deepak Saxena - IT)
- sonal.kapoor@charusat.ac.in (Prof. Sonal Kapoor - IT)
- ... and more

## Data Characteristics

### Students
- **Email Format**: `yydeprol@charusat.edu.in`
  - `yy`: Admission year (23 for 2023, 24 for 2024)
  - `dep`: Department code (CS, CE, DIT)
  - `rol`: Roll number sequence (001-005)
- **Semesters**: 
  - 2023 batch: Semester 3
  - 2024 batch: Semester 1
- **Batches**: A and B
- **Interests**: 2-3 interests from the allowed list

### Faculty
- **Email Format**: `name.surname@charusat.ac.in`
- **Departments**: Distributed across CSE, CE, and IT
- **Experience**: 7-15 years
- **Education**: PhDs and MTechs from premier institutes
- **Specializations**: Various areas like AI/ML, Web Dev, Cybersecurity, etc.

## Modifying Test Data

To add or modify test data:

1. Edit `test-registration-data.csv` directly
2. Follow the same column structure
3. Ensure email formats match the required pattern
4. Use semicolons (;) to separate multiple interests
5. Run the import script again

## Troubleshooting

### Error: MONGODB_URI not found
- Check if `.env.local` file exists
- Verify the MONGODB_URI variable is set

### Error: CSV file not found
- Make sure `test-registration-data.csv` is in the root directory
- Check the file path in the error message

### Validation Errors
- Ensure phone numbers start with +91 and have 12 total characters
- Verify email formats match the required patterns
- Check that all required fields are filled

### Duplicate Email Errors
- The script skips existing users automatically
- To reimport, delete the existing users from MongoDB first

## Cleaning Up Test Data

To remove all test users from the database:

```bash
# Connect to MongoDB shell
mongosh

# Use the database
use student-portal

# Remove all users except admins
db.users.deleteMany({ role: { $in: ['student', 'guide'] } })
```

Or use the existing cleanup scripts:
```bash
node scripts/pruneToAdmin.js
```

## Notes

- All users are created with `isEmailVerified: true` for immediate testing
- All users are created with `isOnboarded: true` with complete profiles
- All users are created with `isApproved: true` for immediate access
- Passwords are hashed using bcrypt before storing
- The script is idempotent - running it multiple times won't create duplicates
