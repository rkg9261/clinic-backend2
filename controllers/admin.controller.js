import { db } from "../config/db.js";

export const createSubscriptionPackage = async (req, res) => {
    try {
        const { name, description, price, durationDays, maxPatients } = req.body;

        if (!name?.trim()) {
            return res.status(400).json({ success: false, message: "Package name is required" });
        }

        const [result] = await db.query(
            `INSERT INTO subscription_packages (name, description, price, duration_days, max_patients)
             VALUES (?, ?, ?, ?, ?)`,
            [
                name.trim(),
                description?.trim() || null,
                Number(price) || 0,
                Number(durationDays) || 30,
                maxPatients ? Number(maxPatients) : null
            ]
        );

        const [rows] = await db.query("SELECT * FROM subscription_packages WHERE id = ?", [
            result.insertId
        ]);

        return res.status(201).json({
            success: true,
            message: "Subscription package created",
            data: rows[0]
        });
    } catch (error) {
        return res.status(500).json({ success: false, message: error.message });
    }
};

export const listSubscriptionPackages = async (req, res) => {
    try {
        const activeOnly = req.query.active !== "false";
        const [rows] = await db.query(
            `SELECT * FROM subscription_packages
             ${activeOnly ? "WHERE is_active = 1" : ""}
             ORDER BY price ASC`
        );
        return res.status(200).json({ success: true, data: rows });
    } catch (error) {
        return res.status(500).json({ success: false, message: error.message });
    }
};

export const updateSubscriptionPackage = async (req, res) => {
    try {
        const { id } = req.params;
        const { name, description, price, durationDays, maxPatients, isActive } = req.body;

        const [existing] = await db.query(
            "SELECT * FROM subscription_packages WHERE id = ?",
            [id]
        );
        if (!existing[0]) {
            return res.status(404).json({ success: false, message: "Package not found" });
        }

        const pkg = existing[0];
        await db.query(
            `UPDATE subscription_packages
             SET name = ?, description = ?, price = ?, duration_days = ?, max_patients = ?, is_active = ?
             WHERE id = ?`,
            [
                name?.trim() || pkg.name,
                description ?? pkg.description,
                price !== undefined ? Number(price) : pkg.price,
                durationDays !== undefined ? Number(durationDays) : pkg.duration_days,
                maxPatients !== undefined ? (maxPatients ? Number(maxPatients) : null) : pkg.max_patients,
                isActive !== undefined ? (isActive ? 1 : 0) : pkg.is_active,
                id
            ]
        );

        const [rows] = await db.query("SELECT * FROM subscription_packages WHERE id = ?", [id]);
        return res.status(200).json({ success: true, data: rows[0] });
    } catch (error) {
        return res.status(500).json({ success: false, message: error.message });
    }
};

export const assignBranchSubscription = async (req, res) => {
    try {
        const { branchId, packageId, startDate, amountPaid } = req.body;
        const adminId = req.user.id;

        if (!branchId || !packageId) {
            return res.status(400).json({
                success: false,
                message: "branchId and packageId are required"
            });
        }

        const [pkgRows] = await db.query(
            "SELECT * FROM subscription_packages WHERE id = ? AND is_active = 1",
            [packageId]
        );
        if (!pkgRows[0]) {
            return res.status(404).json({ success: false, message: "Package not found" });
        }

        const pkg = pkgRows[0];
        const start = startDate ? new Date(startDate) : new Date();
        const end = new Date(start);
        end.setDate(end.getDate() + pkg.duration_days);

        const [result] = await db.query(
            `INSERT INTO branch_subscriptions
             (branch_id, package_id, start_date, end_date, amount_paid, created_by_admin_id)
             VALUES (?, ?, ?, ?, ?, ?)`,
            [
                branchId,
                packageId,
                start.toISOString().slice(0, 10),
                end.toISOString().slice(0, 10),
                Number(amountPaid) ?? pkg.price,
                adminId
            ]
        );

        const [rows] = await db.query(
            `SELECT bs.*, sp.name AS package_name, b.name AS branch_name
             FROM branch_subscriptions bs
             JOIN subscription_packages sp ON sp.id = bs.package_id
             JOIN branches b ON b.id = bs.branch_id
             WHERE bs.id = ?`,
            [result.insertId]
        );

        return res.status(201).json({
            success: true,
            message: "Subscription assigned to clinic",
            data: rows[0]
        });
    } catch (error) {
        return res.status(500).json({ success: false, message: error.message });
    }
};

export const viewFinancialReport = async (req, res) => {
    try {
        const { month, year, branchId } = req.query;
        const targetYear = Number(year) || new Date().getFullYear();
        const targetMonth = month ? Number(month) : null;

        let dateFilter = "YEAR(created_at) = ?";
        const params = [targetYear];

        if (targetMonth) {
            dateFilter += " AND MONTH(created_at) = ?";
            params.push(targetMonth);
        }

        let branchFilter = "";
        if (branchId) {
            branchFilter = " AND branch_id = ?";
            params.push(branchId);
        }

        const [rechargeRevenue] = await db.query(
            `SELECT branch_id, SUM(amount) AS total, COUNT(*) AS transactions
             FROM recharge_transactions
             WHERE ${dateFilter}${branchFilter}
             GROUP BY branch_id`,
            params
        );

        const subParams = [targetYear];
        let subDateFilter = "YEAR(bs.created_at) = ?";
        if (targetMonth) {
            subDateFilter += " AND MONTH(bs.created_at) = ?";
            subParams.push(targetMonth);
        }
        let subBranchFilter = "";
        if (branchId) {
            subBranchFilter = " AND bs.branch_id = ?";
            subParams.push(branchId);
        }

        const [subscriptionRevenue] = await db.query(
            `SELECT bs.branch_id, SUM(bs.amount_paid) AS total, COUNT(*) AS subscriptions
             FROM branch_subscriptions bs
             WHERE ${subDateFilter.replace(/created_at/g, "bs.created_at")}${subBranchFilter}
             GROUP BY bs.branch_id`,
            subParams
        );

        const [branches] = await db.query(
            `SELECT id, clinic_code, name, approval_status, is_active FROM branches ORDER BY name`
        );

        const [patientCounts] = await db.query(
            `SELECT branch_id, COUNT(*) AS patientCount FROM patients GROUP BY branch_id`
        );

        const branchMap = branches.map((b) => {
            const recharge = rechargeRevenue.find((r) => r.branch_id === b.id);
            const sub = subscriptionRevenue.find((s) => s.branch_id === b.id);
            const patients = patientCounts.find((p) => p.branch_id === b.id);
            return {
                ...b,
                patientCount: Number(patients?.patientCount || 0),
                sessionRevenue: Number(recharge?.total || 0),
                sessionTransactions: Number(recharge?.transactions || 0),
                subscriptionRevenue: Number(sub?.total || 0),
                totalRevenue:
                    Number(recharge?.total || 0) + Number(sub?.total || 0)
            };
        });

        const totals = branchMap.reduce(
            (acc, b) => {
                acc.sessionRevenue += b.sessionRevenue;
                acc.subscriptionRevenue += b.subscriptionRevenue;
                acc.totalRevenue += b.totalRevenue;
                acc.patients += b.patientCount;
                return acc;
            },
            { sessionRevenue: 0, subscriptionRevenue: 0, totalRevenue: 0, patients: 0 }
        );

        return res.status(200).json({
            success: true,
            data: {
                period: { year: targetYear, month: targetMonth },
                totals,
                branches: branchMap
            }
        });
    } catch (error) {
        return res.status(500).json({ success: false, message: error.message });
    }
};

export const listAllClinicsAdmin = async (req, res) => {
    try {
        let query = `SELECT b.*,
            (SELECT COUNT(*) FROM patients p WHERE p.branch_id = b.id) AS patient_count,
            (SELECT COUNT(*) FROM users u WHERE u.branch_id = b.id AND u.role = 'CLINIC') AS clinic_user_count
            FROM branches b WHERE 1=1`;
        const params = [];

        query += " ORDER BY b.created_at DESC";
        const [rows] = await db.query(query, params);

        return res.status(200).json({ success: true, data: rows });
    } catch (error) {
        return res.status(500).json({ success: false, message: error.message });
    }
};
