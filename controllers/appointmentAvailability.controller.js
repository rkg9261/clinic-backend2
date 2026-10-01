import { db } from "../config/db.js";
import { getManagerBranchId } from "../utils/patient.helpers.js";
//import { useParams } from 'react-router-dom';
import { formatMySQLDate } from "../utils/dateUtils.js";

export const getNext7DaysAvailability = async (req, res) => {
  try {
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
        message: "Branch ID is required.",
      });
    }
    // ==================================================
    // 1. APPOINTMENT SETTINGS
    // ==================================================

    const [settingsRows] = await db.execute(
      `
            SELECT
                enable_appointment,
                slot_duration,
                max_appointments_per_slot,
                same_day_booking,
                appointment_start_time,
                appointment_end_time,
                future_appointment_days
            FROM appointment_settings
            WHERE branch_id = ?
            LIMIT 1
            `,
      [branchId],
    );

    if (settingsRows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Appointment settings not configured.",
      });
    }

    const settings = settingsRows[0];

    const sql = `
            WITH RECURSIVE dates AS
            (
                SELECT CURDATE() AS appointment_date

                UNION ALL

                SELECT DATE_ADD(appointment_date, INTERVAL 1 DAY)
                FROM dates
                WHERE appointment_date < DATE_ADD(CURDATE(), INTERVAL ${settings.future_appointment_days} DAY)
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
    const [rows] = await db.execute(sql, [branchId, branchId]);
    console.log("rows:", rows);
    // return res.status(200).json({
    //   success: true,
    //   branch_id: branchId,
    //   from_date: rows[0]?.date || null,
    //   to_date: rows[rows.length - 1]?.date || null,
    //   total_days: rows.length,
    //   data: rows,
    // });
    const formattedRows = rows.map((row) => ({
      ...row,
      date: formatMySQLDate(row.date),
    }));

    return res.status(200).json({
      success: true,
      branch_id: branchId,
      from_date: formattedRows[0]?.date || null,
      to_date: formattedRows[formattedRows.length - 1]?.date || null,
      total_days: formattedRows.length,
      data: formattedRows,
    });
  } catch (error) {
    console.error("getNext7DaysAvailability error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to get appointment availability.",
      error: error.message,
    });
  }
};

export const getAvailableTimeSlots = async (req, res) => {
  try {
    const { branch_id, date } = req.params;

    const branchId = Number(branch_id);
    const selectedDate = date;

    console.log("branchId:", branchId);
    console.log("selectedDate:", selectedDate);
    // --------------------------------------------------
    // Validate branch
    // --------------------------------------------------

    if (!branchId) {
      return res.status(401).json({
        success: false,
        message: "Branch not found.",
      });
    }

    // --------------------------------------------------
    // Validate date
    // --------------------------------------------------

    if (!selectedDate) {
      return res.status(400).json({
        success: false,
        message: "Appointment date is required.",
      });
    }

    const dateRegex = /^\d{4}-\d{2}-\d{2}$/;

    if (!dateRegex.test(selectedDate)) {
      return res.status(400).json({
        success: false,
        message: "Invalid date format. Use YYYY-MM-DD.",
      });
    }

    // ==================================================
    // 1. APPOINTMENT SETTINGS
    // ==================================================

    const [settingsRows] = await db.execute(
      `
            SELECT
                enable_appointment,
                slot_duration,
                max_appointments_per_slot,
                same_day_booking,
                appointment_start_time,
                appointment_end_time,
                future_appointment_days
            FROM appointment_settings
            WHERE branch_id = ?
            LIMIT 1
            `,
      [branchId],
    );

    if (settingsRows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Appointment settings not configured.",
      });
    }

    const settings = settingsRows[0];

    // --------------------------------------------------
    // Appointment disabled
    // --------------------------------------------------

    if (Number(settings.enable_appointment) !== 1) {
      return res.status(200).json({
        success: true,
        date: selectedDate,
        slots: [],
        message: "Appointment booking is disabled.",
      });
    }

    // ==================================================
    // 2. CHECK DATE RANGE
    // ==================================================

    const today = getTodayDate();

    // Past date
    if (selectedDate < today) {
      return res.status(200).json({
        success: true,
        date: selectedDate,
        slots: [],
        message: "Appointment date cannot be in the past.",
      });
    }

    // --------------------------------------------------
    // Future appointment limit
    // --------------------------------------------------

    const futureDays = Number(settings.future_appointment_days);
    const maximumDate = addDays(today, futureDays);
    if (selectedDate > maximumDate) {
      return res.status(200).json({
        success: true,
        date: selectedDate,
        slots: [],
        message: `Appointments can only be booked up to ${futureDays} days in advance.`,
      });
    }

    // ==================================================
    // 3. SAME DAY BOOKING
    // ==================================================

    if (selectedDate === today && Number(settings.same_day_booking) !== 1) {
      return res.status(200).json({
        success: true,
        date: selectedDate,
        slots: [],
        message: "Same-day booking is disabled.",
      });
    }

    // ==================================================
    // 4. WEEKLY SCHEDULE
    // ==================================================

    const [scheduleRows] = await db.execute(
      `
            SELECT

                day_of_week,
                is_enabled,

                morning_enabled,
                morning_start_time,
                morning_end_time,

                evening_enabled,
                evening_start_time,
                evening_end_time

            FROM weekly_schedules

            WHERE branch_id = ?

              AND day_of_week =
                  UPPER(DAYNAME(?))

            LIMIT 1
            `,
      [branchId, selectedDate],
    );
    console.log(
      "query:",
      `
            SELECT

                day_of_week,
                is_enabled,

                morning_enabled,
                morning_start_time,
                morning_end_time,

                evening_enabled,
                evening_start_time,
                evening_end_time

            FROM weekly_schedules

            WHERE branch_id = ?

              AND day_of_week =
                  UPPER(DAYNAME(?))

            LIMIT 1
            `,
      branchId,
      selectedDate,
    );
    if (scheduleRows.length === 0) {
      return res.status(200).json({
        success: true,
        date: selectedDate,
        slots: [],
        message: "Weekly schedule not configured.",
      });
    }

    console.log("scheduleRows:", scheduleRows);
    const schedule = scheduleRows[0];
    console.log("schedule:", schedule);
    if (Number(schedule.is_enabled) !== 1) {
      return res.status(200).json({
        success: true,
        date: selectedDate,
        slots: [],
        message: "Clinic is closed on this day.",
      });
    }

    // ==================================================
    // 5. CHECK LEAVES
    // ==================================================

    const [leaveRows] = await db.execute(
      `
            SELECT
                id,
                reason,
                repeat_type,
                from_date,
                to_date

            FROM appointment_leaves

            WHERE branch_id = ?

            AND
            (
                (
                    repeat_type = 'NONE'

                    AND ? BETWEEN from_date AND to_date
                )

                OR

                (
                    repeat_type = 'DAILY'

                    AND ? >= from_date
                )

                OR

                (
                    repeat_type = 'WEEKLY'

                    AND ? >= from_date

                    AND MOD(
                        DATEDIFF(
                            ?,
                            from_date
                        ),
                        7
                    ) = 0
                )

                OR

                (
                    repeat_type = 'MONTHLY'

                    AND ? >= from_date

                    AND DAY(?) = DAY(from_date)
                )
            )

            ORDER BY id
            `,
      [
        branchId,

        selectedDate,

        selectedDate,

        selectedDate,
        selectedDate,

        selectedDate,
        selectedDate,
      ],
    );

    if (leaveRows.length > 0) {
      return res.status(200).json({
        success: true,

        date: selectedDate,

        slots: [],

        message: leaveRows.map((x) => x.reason).join(", "),
      });
    }

    // ==================================================
    // 6. GET EXISTING APPOINTMENTS
    // ==================================================

    /*
     * IMPORTANT:
     *
     * Your appointments table uses clinic_id,
     * while other tables use branch_id.
     *
     * This assumes:
     *
     * clinic_id = branch_id
     *
     */

    const [appointmentRows] = await db.execute(
      `
            SELECT
                appointment_time,
                appointment_time_to

            FROM appointments

            WHERE clinic_id = ?

              AND appointment_date = ?

            ORDER BY appointment_time
            `,
      [branchId, selectedDate],
    );

    // ==================================================
    // 7. GENERATE SLOTS
    // ==================================================

    const slots = [];

    const slotDuration = Number(settings.slot_duration);

    const maxAppointments = Number(settings.max_appointments_per_slot);

    // --------------------------------------------------
    // Generate session slots
    // --------------------------------------------------

    const generateSlots = (startTime, endTime, session) => {
      if (!startTime || !endTime) {
        return;
      }

      let currentMinutes = timeToMinutes(startTime);

      const endMinutes = timeToMinutes(endTime);

      while (currentMinutes + slotDuration <= endMinutes) {
        const slotStart = minutesToTime(currentMinutes);

        const slotEnd = minutesToTime(currentMinutes + slotDuration);

        // ------------------------------------------
        // Count overlapping appointments
        // ------------------------------------------

        const bookedCount = appointmentRows.filter((appointment) => {
          const appointmentStart = timeToMinutes(appointment.appointment_time);

          const appointmentEnd = timeToMinutes(appointment.appointment_time_to);

          const slotStartMinutes = currentMinutes;

          const slotEndMinutes = currentMinutes + slotDuration;

          /*
           * Overlap condition:
           *
           * appointmentStart < slotEnd
           * AND
           * appointmentEnd > slotStart
           */

          return appointmentStart < slotEndMinutes && appointmentEnd > slotStartMinutes;
        }).length;

        // ------------------------------------------
        // 70-minute booking rule
        // ------------------------------------------

        let allowedByNotice = true;

        if (selectedDate === today) {
          const now = new Date();

          const minimumBookingTime = new Date(now.getTime() + 70 * 60 * 1000);

          const slotDateTime = createDateTime(selectedDate, slotStart);

          if (slotDateTime <= minimumBookingTime) {
            allowedByNotice = false;
          }
        }

        // ------------------------------------------
        // Remaining capacity
        // ------------------------------------------

        const remaining = Math.max(maxAppointments - bookedCount, 0);

        slots.push({
          value: slotStart,

          label: formatTime(slotStart),

          time_from: slotStart,

          time_to: slotEnd,

          session: session,

          booked: bookedCount,

          remaining: remaining,

          available: allowedByNotice && remaining > 0,
        });

        currentMinutes += slotDuration;
      }
    };

    // ==================================================
    // 8. MORNING
    // ==================================================

    if (Number(schedule.morning_enabled) === 1) {
      generateSlots(schedule.morning_start_time, schedule.morning_end_time, "MORNING");
    }

    // ==================================================
    // 9. EVENING
    // ==================================================

    if (Number(schedule.evening_enabled) === 1) {
      generateSlots(schedule.evening_start_time, schedule.evening_end_time, "EVENING");
    }

    // ==================================================
    // 10. ONLY AVAILABLE SLOTS
    // ==================================================

    const availableSlots = slots.filter((slot) => slot.available);

    // ==================================================
    // RESPONSE
    // ==================================================

    return res.status(200).json({
      success: true,

      date: selectedDate,

      slot_duration: slotDuration,

      max_appointments_per_slot: maxAppointments,

      minimum_booking_notice_minutes: 70,

      total_slots: slots.length,

      available_slots: availableSlots.length,

      slots: availableSlots,
    });
  } catch (error) {
    console.error("getAvailableTimeSlots error:", error);

    return res.status(500).json({
      success: false,

      message: "Failed to get available time slots.",

      error: error.message,
    });
  }
};

// ======================================================
// HELPER FUNCTIONS
// ======================================================

function timeToMinutes(time) {
  const [hours, minutes] = String(time).substring(0, 5).split(":");

  return Number(hours) * 60 + Number(minutes);
}

function minutesToTime(minutes) {
  const hours = Math.floor(minutes / 60);

  const mins = minutes % 60;

  return String(hours).padStart(2, "0") + ":" + String(mins).padStart(2, "0");
}

function formatTime(time) {
  const [hour, minute] = time.substring(0, 5).split(":");

  let h = Number(hour);

  const suffix = h >= 12 ? "PM" : "AM";

  h = h % 12 || 12;

  return String(h).padStart(2, "0") + ":" + minute + " " + suffix;
}

function getTodayDate() {
  const now = new Date();

  const year = now.getFullYear();

  const month = String(now.getMonth() + 1).padStart(2, "0");

  const day = String(now.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

function addDays(dateString, days) {
  const date = new Date(`${dateString}T00:00:00`);

  date.setDate(date.getDate() + days);

  const year = date.getFullYear();

  const month = String(date.getMonth() + 1).padStart(2, "0");

  const day = String(date.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

function createDateTime(date, time) {
  const [hours, minutes] = time.substring(0, 5).split(":");

  const result = new Date(`${date}T00:00:00`);

  result.setHours(Number(hours), Number(minutes), 0, 0);

  return result;
}
