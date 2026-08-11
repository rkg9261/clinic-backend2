import { db } from "../config/db.js";

export const createAppointment = async (req, res)=>{
    const { name, age, gender, whatsapp_number, appointment_date, appointment_time } = req.body;

    // Basic validation
    if (!name || !age || !gender || !whatsapp_number || !appointment_date || !appointment_time) {
        return res.status(400).json({ error: "Missing required fields" });
    }

    try {
        const [result] = await db.query(
            `INSERT INTO appointments 
             (name, age, gender, whatsapp_number, appointment_date, appointment_time) 
             VALUES (?, ?, ?, ?, ?, ?)`,
            [name, age, gender, whatsapp_number, appointment_date, appointment_time]
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
        const [rows] = await db.query('SELECT * FROM appointments ORDER BY created_at DESC');
        console.log(rows)
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