import mysql from 'mysql2/promise';
import dotenv from 'dotenv';
dotenv.config();

async function run() {
    const pool = mysql.createPool({
        host: process.env.DB_HOST,
        user: process.env.DB_USER,
        password: process.env.DB_PASSWORD,
        database: process.env.DB_NAME,
        waitForConnections: true,
        connectionLimit: 10,
        queueLimit: 0
    });

    await pool.execute('DROP TABLE IF EXISTS material_copper_logs');
    await pool.execute('DROP TABLE IF EXISTS material_drain_logs');
    await pool.execute('DROP TABLE IF EXISTS material_remote_logs');
    await pool.execute('DROP TABLE IF EXISTS material_other_logs');

    console.log("Tables dropped successfully");
    process.exit(0);
}

run();
