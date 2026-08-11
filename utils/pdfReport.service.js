import fs from "fs";
import path from "path";
import PDFDocument from "pdfkit";

const reportsDir = path.join(process.cwd(), "uploads", "reports");
fs.mkdirSync(reportsDir, { recursive: true });

export const generatePatientPdfReport = async ({ patient, stats, branch, entries }) => {
    const filename = `report-${patient.id}-${Date.now()}.pdf`;
    const filepath = path.join(reportsDir, filename);

    return new Promise((resolve, reject) => {
        const doc = new PDFDocument({ margin: 50 });
        const stream = fs.createWriteStream(filepath);

        doc.pipe(stream);

        doc.fontSize(18).text(branch?.name || "Clinic Report", { align: "center" });
        doc.moveDown();
        doc.fontSize(12);
        doc.text(`Patient: ${patient.full_name}`);
        doc.text(`File Number: ${patient.file_number}`);
        doc.text(`Patient ID: ${patient.patient_code}`);
        doc.text(`Mobile: ${patient.mobile_number}`);
        doc.text(`Disease/Problem: ${patient.disease_problem || "N/A"}`);
        doc.moveDown();
        doc.text(`Attendance: ${stats.attendancePercent}%`);
        doc.text(`Punctuality: ${stats.punctualityPercent}%`);
        doc.text(`Sessions Remaining: ${stats.balanceSessions}`);
        doc.text(`Last Attendance: ${stats.lastAttendanceDate || "N/A"}`);
        doc.moveDown();
        doc.text("Recent File Entries:", { underline: true });

        (entries || []).slice(0, 10).forEach((entry) => {
            doc.moveDown(0.5);
            doc.text(`${entry.entry_type} - ${entry.title} (${entry.created_at})`);
            doc.fontSize(10).text(entry.content.slice(0, 200));
            doc.fontSize(12);
        });

        doc.end();

        stream.on("finish", () =>
            resolve({
                filename,
                filepath: filepath.replace(/\\/g, "/"),
                publicPath: `/uploads/reports/${filename}`
            })
        );
        stream.on("error", reject);
    });
};
