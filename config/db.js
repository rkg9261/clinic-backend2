import mysql from "mysql2/promise";
import dotenv from 'dotenv'

dotenv.config();

// const db = mysql.createPool({
//     host: process.env.DB_HOST,
//     user: process.env.DB_USER,
//     password: process.env.DB_PASSWORD,
//     database: process.env.DB_NAME,
//     port: process.env.DB_PORT,

//     waitForConnections: true,
//     connectionLimit: 10,
//     queueLimit: 0
// });

// const connectDB = async () => {
//     try {
//         const connection = await db.getConnection();

//         console.log("MySQL DB Connected Successfully");

//         connection.release();

//     } catch (error) {
//         console.error("DB Connection Failed:", error.message);

//         process.exit(1);
//     }
// };

// export { db, connectDB };



const db = mysql.createPool({
    host: process.env.DB_HOST || "localhost",
    port: Number(process.env.DB_PORT || 3306),
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,

    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
});

export async function connectDB() {
    try {
        const connection = await db.getConnection();

        console.log("MySQL database connected successfully");

        connection.release();
    } catch (error) {
        console.error("MySQL connection failed:", error);
        throw error;
    }
}

export default db;