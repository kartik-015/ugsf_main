# Student Data Population Summary

## Overview
Successfully populated MongoDB with **360 students** across 3 departments and 4 years.

## Distribution

### CSE (Computer Science Engineering) - 120 Students
- **1st Year (2025 batch)**: 30 students (25DCS001 - 25DCS030) - Semesters 1-2
- **2nd Year (2024 batch)**: 30 students (24DCS001 - 24DCS030) - Semesters 3-4
- **3rd Year (2023 batch)**: 30 students (23DCS001 - 23DCS030) - Semesters 5-6
- **4th Year (2022 batch)**: 30 students (22DCS001 - 22DCS030) - Semesters 7-8

### CE (Computer Engineering) - 120 Students
- **1st Year (2025 batch)**: 30 students (25DCE001 - 25DCE030) - Semesters 1-2
- **2nd Year (2024 batch)**: 30 students (24DCE001 - 24DCE030) - Semesters 3-4
- **3rd Year (2023 batch)**: 30 students (23DCE001 - 23DCE030) - Semesters 5-6
- **4th Year (2022 batch)**: 30 students (22DCE001 - 22DCE030) - Semesters 7-8

### IT (Information Technology) - 120 Students
- **1st Year (2025 batch)**: 30 students (25DIT001 - 25DIT030) - Semesters 1-2
- **2nd Year (2024 batch)**: 30 students (24DIT001 - 24DIT030) - Semesters 3-4
- **3rd Year (2023 batch)**: 30 students (23DIT001 - 23DIT030) - Semesters 5-6
- **4th Year (2022 batch)**: 30 students (22DIT001 - 22DIT030) - Semesters 7-8

## Student Details

### Email Format
- Pattern: `YYDEPxxx@charusat.edu.in`
- Example: `25DCS001@charusat.edu.in`, `24DCE015@charusat.edu.in`, `23DIT030@charusat.edu.in`

### Default Credentials
- **Password**: `Student@123` (for all students)

### Student Data Includes
Each student has complete registration and onboarding data:
- ✅ **Personal Info**: Full name, roll number, phone number, address
- ✅ **Academic Info**: Department, semester, batch (A/B/C/D), admission year
- ✅ **Onboarding Info**: Interests (2-4 from 12 options), experience level, specialization, education
- ✅ **Status**: All students are verified, registered, onboarded, and approved
- ✅ **Institute**: All belong to DEPSTAR
- ✅ **University**: Charotar University of Science and Technology (CHARUSAT)

### Available Interests
Students have 2-4 randomly selected interests from:
- Web Development
- Mobile Development
- Data Science
- AI/ML
- Cybersecurity
- Cloud Computing
- DevOps
- UI/UX Design
- Blockchain
- IoT
- Game Development
- Software Engineering

### Available Specializations
Students are assigned one of:
- Full Stack Development
- Frontend Development
- Backend Development
- Mobile App Development
- Data Analytics
- Machine Learning
- Cloud Architecture
- DevOps Engineering
- Cybersecurity
- UI/UX Design

## Scripts

### Populate Students
```bash
node scripts/populate-students.js
```
- Removes all existing student data
- Creates 360 new students with complete details
- Shows progress and summary

### Verify Students
```bash
node scripts/verify-students.js
```
- Displays sample students from each department and year
- Lists first 5 students per department
- Useful for verification

## Sample Student Data

### CSE 1st Year Example
- **Email**: 25dcs001@charusat.edu.in
- **Roll Number**: 25DCS001
- **Name**: Diya Amin
- **Semester**: 1
- **Batch**: B
- **Interests**: Data Science, Cybersecurity, AI/ML, UI/UX Design
- **Specialization**: Full Stack Development

### CE 3rd Year Example
- **Email**: 23dce001@charusat.edu.in
- **Roll Number**: 23DCE001
- **Name**: Aryan Jain
- **Semester**: 5
- **Batch**: A
- **Interests**: Data Science, Game Development, Cloud Computing, Cybersecurity
- **Specialization**: Machine Learning

### IT 4th Year Example
- **Email**: 22dit001@charusat.edu.in
- **Roll Number**: 22DIT001
- **Name**: Vivaan Trivedi
- **Semester**: 8
- **Batch**: D
- **Interests**: AI/ML, Web Development
- **Specialization**: Data Analytics

## Notes
- All students can log in immediately with their email and default password
- Students are already approved and don't need additional verification
- Each student has realistic Indian names, phone numbers, and Gujarat addresses
- Semester numbers correctly match the year (1st year: sem 1-2, 2nd year: sem 3-4, etc.)
- Batch letters (A/B/C/D) are randomly assigned for diversity

---
Generated: January 23, 2026
Total Students: 360
