export const buildWhatsAppShareUrl = ({ phone, message }) => {
    const digits = String(phone || "").replace(/\D/g, "");
    const text = encodeURIComponent(message || "");
    return `https://wa.me/${digits}?text=${text}`;
};

export const buildPatientIdShareMessage = (patient) => {
    return (
        `Clinic Patient ID\n` +
        `Name: ${patient.full_name}\n` +
        `File No: ${patient.file_number}\n` +
        `Patient ID: ${patient.patient_code}\n` +
        `Sessions Remaining: ${patient.sessions_remaining ?? 0}`
    );
};
