import { db } from "../config/db.js";

export const generateClinicCode = async () => {
    const [rows] = await db.query(
        "SELECT clinic_code FROM branches ORDER BY id DESC LIMIT 1"
    );

    if (!rows[0]?.clinic_code) return "CLN-0001";

    const num = Number(rows[0].clinic_code.replace(/\D/g, "")) + 1;
    return `CLN-${String(num).padStart(4, "0")}`;
};
