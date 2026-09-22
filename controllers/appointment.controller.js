import { db } from "../config/db.js";
import {
    generateFileNumber,
    generatePatientCode,
    computePatientStats,
    fetchPatientByFile,
    getManagerBranchId,
    convertToMySQLTime
} from "../utils/patient.helpers.js";

export const createAppointment = async (req, res)=>{
    const { name, age, gender, whatsapp_number, appointment_date, appointment_time, appointment_time_to } = req.body;

    // Basic validation
    if (!name || !age || !gender || !whatsapp_number || !appointment_date || !appointment_time || !appointment_time_to) {
        return res.status(400).json({ error: "Missing required fields" });
    }
    const appointment_time1 =  convertToMySQLTime(appointment_time);
    const appointment_time_to1 =  convertToMySQLTime(appointment_time_to);
    //const managerId = req.user.id;
    //const branchId = await getManagerBranchId(managerId);
    const branchId = req.user?.id ?? null;
    try {
        const [result] = await db.query(
            `INSERT INTO appointments 
             (name, age, gender, whatsapp_number, appointment_date, appointment_time, appointment_time_to, clinic_id) 
             VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
            [name, age, gender, whatsapp_number, appointment_date, appointment_time1, appointment_time_to1, branchId]
        );

        res.status(201).json({
            success: true,
            message: "Appointment booked successfully",
            appointmentId: result.insertId
        });
    } catch (error) {
        console.error(error);
        return res.status(500).json({ error: "Failed to book appointment" });
    }
}

export const getAppointment = async(req, res)=>{
    try {
        const [rows] = await db.query(`SELECT * FROM appointments a 
            left join appointment_payments ap on a.id= ap.appointment_id 
            #where ap.payment_status = 'CAPTURED' and a.created_at >= NOW() - INTERVAL 7 DAY 
            ORDER BY a.created_at DESC;`);
        console.log(rows)
        return res.json(rows);
    } catch (error) {
        return res.status(500).json({ error: "Failed to fetch appointments" });
    }
}

export const getAppointmentByDate = async(req, res)=>{
    try {
        const [rows] = await db.query(`SELECT * FROM appointments a 
            left join appointment_payments ap on a.id= ap.appointment_id 
            where 
            ap.payment_status = 'CAPTURED' and 
            a.appointment_date BETWEEN ? AND ?
            ORDER BY a.appointment_date DESC;`, [req.params.date, req.params.date]);

            console.log(req.params.date);
        console.log(rows);
        return res.json(rows);
    } catch (error) {
        return res.status(500).json({ error: "Failed to fetch appointments" });
    }
}

export const getAppointmentById = async (req, res) => {
    try {
        const [rows] = await db.query(
            'SELECT * FROM appointments WHERE id = ?', 
            [req.params.id]
        );
        
        if (rows.length === 0) {
            return res.status(404).json({ error: "Appointment not found" });
        }
        
        return res.json(rows[0]);
    } catch (error) {
        return res.status(500).json({ error: "Failed to fetch appointment" });
    }
};

// Delete Appointment (Optional)
export const deleteAppointment = async (req, res) => {
    try {
        const [result] = await db.query(
            'DELETE FROM appointments WHERE id = ?', 
            [req.params.id]
        );
        
        if (result.affectedRows === 0) {
            return res.status(404).json({ error: "Appointment not found" });
        }
        
        return res.json({ success: true, message: "Appointment deleted" });
    } catch (error) {
        return res.status(500).json({ error: "Failed to delete appointment" });
    }
};