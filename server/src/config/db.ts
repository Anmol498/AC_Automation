import mysql from 'mysql2/promise';
import dotenv from 'dotenv';

dotenv.config();

const dbConfig = {
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'coolbreeze_ac',
    port: process.env.DB_PORT ? parseInt(process.env.DB_PORT, 10) : 3306,
    waitForConnections: true,
    connectionLimit: 10
};

let pool: mysql.Pool;
try {
    pool = mysql.createPool(dbConfig);
} catch (err: any) {
    console.error("CRITICAL: Failed to create database pool:", err.message);
    process.exit(1);
}

export default pool;
