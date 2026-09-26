import { db } from "../config/db.js";
import { getManagerBranchId } from "../utils/patient.helpers.js";
//import { useParams } from 'react-router-dom';

export const getNext7DaysAvailability = async (req, res) => {
    try {
            // return res.status(400).json({
            //     success: false,
            //     message: "temp return.-"+req.user?.id
            // });
            // 
            //testing purpose


        // Get branch from authenticated user
        //const branchId = req.user?.id;
        //get branchid from params with branch_id
        //const { branch_id } = useParams(); 
        console.log("useParams branch_id:", req.params);
        const branchId = req.params.branch_id;

        console.log("branchId:", branchId);
        if (!branchId) {
            return res.status(400).json({
                success: false,
                message: "Branch ID is required."
            });
        }

        const sql = `
            WITH RECURSIVE dates AS
            (
                SELECT CURDATE() AS appointment_date

                UNION ALL

                SELECT DATE_ADD(appointment_date, INTERVAL 1 DAY)
                FROM dates
                WHERE appointment_date < DATE_ADD(CURDATE(), INTERVAL 7 DAY)
            ),

            leave_matches AS
            (
                SELECT
                    d.appointment_date,

                    GROUP_CONCAT(
                        DISTINCT l.reason
                        ORDER BY l.id
                        SEPARATOR ', '
                    ) AS leave_reason

                FROM dates d

                INNER JOIN appointment_leaves l
                    ON l.branch_id = ?
                   AND
                   (
                        (
                            l.repeat_type = 'NONE'
                            AND d.appointment_date
                                BETWEEN l.from_date AND l.to_date
                        )

                        OR

                        (
                            l.repeat_type = 'DAILY'
                            AND d.appointment_date >= l.from_date
                        )

                        OR

                        (
                            l.repeat_type = 'WEEKLY'
                            AND d.appointment_date >= l.from_date
                            AND MOD(
                                DATEDIFF(
                                    d.appointment_date,
                                    l.from_date
                                ),
                                7
                            ) = 0
                        )

                        OR

                        (
                            l.repeat_type = 'MONTHLY'
                            AND d.appointment_date >= l.from_date
                            AND DAY(d.appointment_date) = DAY(l.from_date)
                        )
                   )

                GROUP BY d.appointment_date
            )

            SELECT

                d.appointment_date AS date,

                DAYNAME(d.appointment_date) AS day_name,

                CASE

                    WHEN lm.leave_reason IS NOT NULL
                        THEN 'OFF'

                    WHEN ws.id IS NULL
                        THEN 'OFF'

                    WHEN ws.is_enabled = 0
                        THEN 'OFF'

                    WHEN ws.morning_enabled = 0
                     AND ws.evening_enabled = 0
                        THEN 'OFF'

                    ELSE 'WORKING'

                END AS status,

                CASE

                    WHEN lm.leave_reason IS NOT NULL
                        THEN lm.leave_reason

                    WHEN ws.id IS NULL
                        THEN 'Weekly schedule not configured'

                    WHEN ws.is_enabled = 0
                        THEN 'Clinic Closed'

                    WHEN ws.morning_enabled = 0
                     AND ws.evening_enabled = 0
                        THEN 'Clinic Closed'

                    ELSE NULL

                END AS reason,

                COALESCE(ws.is_enabled, 0) AS is_clinic_open,

                COALESCE(ws.morning_enabled, 0)
                    AS morning_enabled,

                ws.morning_start_time,
                ws.morning_end_time,

                COALESCE(ws.evening_enabled, 0)
                    AS evening_enabled,

                ws.evening_start_time,
                ws.evening_end_time,

                lm.leave_reason

            FROM dates d

            LEFT JOIN weekly_schedules ws
                ON ws.branch_id = ?
               AND ws.day_of_week =
                   UPPER(DAYNAME(d.appointment_date))

            LEFT JOIN leave_matches lm
                ON lm.appointment_date = d.appointment_date

            ORDER BY d.appointment_date
        `;
            //console.log("sql query: ", sql);
        const [rows] = await db.execute(sql, [
            branchId,
            branchId
        ]);

        return res.status(200).json({
            success: true,
            branch_id: branchId,
            from_date: rows[0]?.date || null,
            to_date: rows[rows.length - 1]?.date || null,
            total_days: rows.length,
            data: rows
        });

    } catch (error) {

        console.error(
            "getNext7DaysAvailability error:",
            error
        );

        return res.status(500).json({
            success: false,
            message: "Failed to get appointment availability.",
            error: error.message
        });
    }
};