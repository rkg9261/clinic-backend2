# Cloudinary + Multer Setup Guide

## Configuration Complete ✓

Your Cloudinary credentials are already set in `.env`:
```
CLOUDINARY_CLOUD_NAME=di3qkucqw
CLOUDINARY_API_KEY=222324962995752
CLOUDINARY_API_SECRET=htTCRgbb7FHepUX4VRjTkD_psyU
```

## Usage in Routes

### Example: Upload files with clinicUpload middleware

```javascript
import express from "express";
import { clinicUpload } from "../middlewares/upload.middleware.js";
import { yourController } from "../controllers/yourController.js";

const router = express.Router();

// Use the middleware - files will be uploaded to Cloudinary
router.post("/upload", clinicUpload, yourController.handleUpload);

export default router;
```

## Accessing Uploaded Files in Controllers

```javascript
// In your controller
export const handleUpload = async (req, res) => {
    try {
        // Files uploaded to Cloudinary are available in req.files
        const uploadedFiles = req.files;
        
        // Each file has:
        // - path: Cloudinary URL
        // - filename: Cloudinary public ID
        // - size: File size
        
        console.log("Logo:", req.files.logoFile?.[0]?.path);
        console.log("Header:", req.files.header?.[0]?.path);
        
        // Store these URLs in your database
        res.json({
            logo: req.files.logoFile?.[0]?.path,
            header: req.files.header?.[0]?.path,
            footer: req.files.footer?.[0]?.path,
            idCard: req.files.idCard?.[0]?.path,
            license: req.files.licenseFile?.[0]?.path
        });
    } catch (error) {
        res.status(400).json({ error: error.message });
    }
};
```

## File Structure

```
config/
  └── cloudinary.js          (NEW - Cloudinary config)
middlewares/
  └── upload.middleware.js   (UPDATED - Now uses Cloudinary)
```

## Supported File Types
- **Images**: PNG, JPG, JPEG
- **Documents**: PDF
- **Max Size**: 5MB per file

## Features

✓ Files uploaded directly to Cloudinary cloud storage
✓ No local disk storage needed (removes `uploads/` directory dependency)
✓ Files are backed up and always available
✓ CDN delivery included
✓ Automatic file optimization

## Installation Note

⚠️ When installing dependencies, use:
```bash
npm install --legacy-peer-deps
```

This is needed due to Cloudinary version compatibility.
