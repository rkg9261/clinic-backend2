# Clinic Login Flow

This backend supports exactly three user roles:

1. `ADMIN`
2. `CLINIC`
3. `PATIENT`

## Admin Creates Clinic

Endpoint:

```http
POST /api/clinics
```

Required role: `ADMIN`

Supported clinic fields:

- `name` or `clinicName`
- `address` or `clinicAddress`
- `contactNo`
- `email`
- `doctorName`
- `stateCouncilRegistrationNo` or `registrationNumber`
- `gstin`
- `logoFile` or `logo`
- `letterheadHeaderFile` or `header`
- `letterheadFooterFile` or `footer`
- `idCardBackgroundFile` or `idCard`

When a clinic is created, the backend also creates one `CLINIC` user in the `users` table.

Login rules:

- Login identifier is the clinic email when provided, otherwise the contact mobile.
- Default password is the first 6 digits of the contact mobile.
- If no mobile is provided, the backend falls back to the generated clinic code suffix.

## Clinic Login

Endpoint:

```http
POST /api/auth/login
```

Body can use any one identifier style:

```json
{
  "identifier": "9876543210",
  "password": "987654"
}
```

or:

```json
{
  "email": "clinic@example.com",
  "password": "987654"
}
```

Clinic operations are available under:

```http
/api/clinic
/api/clinic/patients
```
