// import multer from "multer";

// const allowedMimeTypes = new Set([
//     "image/png",
//     "image/jpeg",
//     "application/pdf"
// ]);

// const allowedExtensions = new Set([
//     ".png",
//     ".jpg",
//     ".jpeg",
//     ".pdf"
// ]);

// const storage = multer.memoryStorage();

// const fileFilter = (_req, file, cb) => {
//     const ext = file.originalname
//         .substring(file.originalname.lastIndexOf("."))
//         .toLowerCase();

//     const mimeValid = allowedMimeTypes.has(
//         (file.mimetype || "").toLowerCase()
//     );

//     const extValid = allowedExtensions.has(ext);

//     if (!mimeValid || !extValid) {
//         return cb(
//             new Error("Only PNG, JPG, JPEG and PDF files are allowed")
//         );
//     }

//     cb(null, true);
// };

// const uploader = multer({
//     storage,
//     fileFilter,
//     limits: {
//         fileSize: 5 * 1024 * 1024
//     }
// });

// export const clinicUpload = uploader.fields([
//     { name: "logoFile", maxCount: 1 },
//     { name: "headerFile", maxCount: 1 },
   
//     { name: "footerFile", maxCount: 1 },
 
//     { name: "idCardFile", maxCount: 1 },
  
   
// ]);



import multer from "multer";

const allowedMimeTypes = [
  "application/pdf",
  "image/jpeg",
  "image/png",
  "image/jpg"
];

const storage = multer.memoryStorage();

const fileFilter = (_req, file, cb) => {
  const isMimeValid = allowedMimeTypes.includes(file.mimetype);

  if (isMimeValid) {
    return cb(null, true);
  }

  cb(new Error("Only PDF, JPG, and PNG files are allowed"));
};

const insuranceUpload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB per file
  }
});

export const clinicUpload = insuranceUpload.fields([
 { name: "logoFile", maxCount: 1 },
    { name: "headerFile", maxCount: 1 },
   
    { name: "footerFile", maxCount: 1 },
 
    { name: "idCardFile", maxCount: 1 },
]);
