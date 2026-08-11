# Add Patient API - Updated Endpoint

## Endpoint
**POST** `/api/clinic/patients`

## Authentication
- Requires Bearer token (JWT access token)
- Must be logged in as CLINIC role user

## Request Format

### Form Data (multipart/form-data)

```
Content-Type: multipart/form-data

Field Name              | Type      | Required | Description
-----------------------|-----------|----------|------------------------------------------
name                   | string    | Yes      | Full name of the patient
age                    | number    | Yes      | Age of the patient
gender                 | string    | Yes      | Gender (Male/Female/Other)
mobile                 | string    | Yes      | Mobile number (minimum 6 digits for password)
address                | string    | Yes      | Patient address
problem                | string    | Yes      | Disease/health problem description
amount                 | number    | No       | Payment amount (default: 0)
paymentMethod          | string    | No       | Payment method: CASH or UPI (default: CASH)
reportType             | string    | No       | Report type: STANDARD or UPLOAD (default: STANDARD)
document               | file      | No       | Document upload (PDF, PNG, JPEG max 10MB)
packageName            | string    | No       | Package name for billing
totalSessions          | number    | No       | Total sessions (default: 0)
startDate              | date      | No       | Start date (YYYY-MM-DD, default: today)
notes                  | string    | No       | Additional notes about the patient
```

## Example cURL Request

```bash
curl -X POST "http://localhost:5000/api/clinic/patients" \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \
  -F "name=John Doe" \
  -F "age=30" \
  -F "gender=Male" \
  -F "mobile=9876543210" \
  -F "address=123 Main Street, City" \
  -F "problem=Back pain treatment" \
  -F "amount=5000" \
  -F "paymentMethod=CASH" \
  -F "reportType=STANDARD" \
  -F "document=@/path/to/document.pdf" \
  -F "packageName=Therapy Package 1" \
  -F "totalSessions=10" \
  -F "startDate=2025-06-05" \
  -F "notes=Patient requires special care"
```

## Success Response (201)

```json
{
  "success": true,
  "message": "Patient added successfully with login credentials created",
  "data": {
    "patient": {
      "id": 1,
      "file_number": "FILE-001",
      "patient_code": "PAT-001",
      "full_name": "John Doe",
      "mobile_number": "9876543210",
      "age": 30,
      "gender": "Male",
      "disease_problem": "Back pain treatment",
      "address": "123 Main Street, City",
      "notes": "Patient requires special care",
      "package_name": "Therapy Package 1",
      "total_sessions": 10,
      "sessions_remaining": 10,
      "amount": 5000,
      "payment_method": "CASH",
      "report_type": "STANDARD",
      "document_file": "uploads/documents/1717550400000-document.pdf",
      "start_date": "2025-06-05",
      "branch_id": 1,
      "user_id": 5,
      "created_by_manager_id": 2,
      "created_at": "2025-06-05T10:30:00Z",
      "updated_at": "2025-06-05T10:30:00Z"
    },
    "stats": {
      "attendancePercent": 0,
      "punctualityPercent": 0,
      "balanceSessions": 10,
      "lastAttendanceDate": null
    },
    "fileNumber": "FILE-001",
    "patientCode": "PAT-001",
    "loginCredentials": {
      "email": "9876543210@patient.clinic.local",
      "mobile": "9876543210",
      "password": "987654",
      "message": "Patient can now login with these credentials. Password should be changed on first login."
    }
  }
}
```

## Error Responses

### 400 - Validation Error
```json
{
  "success": false,
  "message": "name and mobile are required"
}
```

### 400 - Mobile Too Short
```json
{
  "success": false,
  "message": "Mobile number must have at least 6 digits"
}
```

### 409 - Duplicate Mobile
```json
{
  "success": false,
  "message": "Patient with this mobile number already exists"
}
```

### 401 - Unauthorized
```json
{
  "success": false,
  "message": "Unauthorized. Token missing"
}
```

### 403 - Insufficient Permissions
```json
{
  "success": false,
  "message": "Forbidden. You do not have access to this resource"
}
```

## Key Features

1. **Automatic User Account Creation**: When a patient is added, a login account is automatically created in the `users` table
2. **Default Password**: Password is generated as the first 6 digits of the mobile number (hashed before storage)
3. **Patient Login Email**: Email format is `{mobile}@patient.clinic.local`
4. **Document Upload**: Supports PDF, PNG, and JPEG files (max 10MB)
5. **Payment Tracking**: Records amount and payment method (CASH/UPI)
6. **Date Tracking**: All records include `created_at` and `updated_at` timestamps
7. **Branch Association**: Patient is automatically linked to the clinic/branch creating the record
8. **Session Management**: Initial session count is stored and tracked for attendance

## Patient Login

After patient creation, the patient can login using:
- **Email**: `{mobile}@patient.clinic.local` OR **Mobile**: `{mobile}`
- **Password**: First 6 digits of mobile number

Example: Mobile = 9876543210
- Email: `9876543210@patient.clinic.local`
- Password: `987654`

## Notes

- All dates are stored with full timestamp (created_at, updated_at)
- Document files are stored in `uploads/documents/` directory
- Payment details and report type are stored in the patients table
- The patient record is linked to a user account for portal access
- File numbers and patient codes are auto-generated and unique
