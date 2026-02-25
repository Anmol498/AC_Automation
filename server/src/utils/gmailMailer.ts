import nodemailer from 'nodemailer';
import { google } from 'googleapis';
import dotenv from 'dotenv';
import dns from 'dns';

// Force Node.js to prioritize IPv4 over IPv6. 
// Railway's internal networks often drop external port 465 IPv6 packets (ETIMEDOUT).
dns.setDefaultResultOrder('ipv4first');

dotenv.config();

const OAuth2 = google.auth.OAuth2;

const createTransporter = async () => {
    try {
        const oauth2Client = new OAuth2(
            process.env.GMAIL_CLIENT_ID,
            process.env.GMAIL_CLIENT_SECRET,
            "https://developers.google.com/oauthplayground"
        );

        oauth2Client.setCredentials({
            refresh_token: process.env.GMAIL_REFRESH_TOKEN,
        });

        const accessToken = await new Promise((resolve, reject) => {
            oauth2Client.getAccessToken((err, token) => {
                if (err) {
                    reject("Failed to create access token: " + err.message);
                }
                resolve(token);
            });
        });

        const transporter = nodemailer.createTransport({
            host: 'smtp.gmail.com',
            port: 465,
            secure: true,
            auth: {
                type: "OAuth2",
                user: process.env.EMAIL_USER,
                accessToken,
                clientId: process.env.GMAIL_CLIENT_ID,
                clientSecret: process.env.GMAIL_CLIENT_SECRET,
                refreshToken: process.env.GMAIL_REFRESH_TOKEN
            }
        } as any);

        return transporter;
    } catch (err) {
        console.error("Transporter creation error:", err);
        throw err;
    }
};

export const sendEmail = async (to: string, subject: string, html: string) => {
    try {
        if (!process.env.GMAIL_CLIENT_ID || !process.env.GMAIL_REFRESH_TOKEN) {
            console.log("--- MOCK GMAIL LOG (Set GMAIL_CLIENT_ID, GMAIL_CLIENT_SECRET, GMAIL_REFRESH_TOKEN, EMAIL_USER in .env) ---");
            console.log(`To: ${to}`);
            console.log(`Subject: ${subject}`);
            console.log("------------------------------------------------------------------------------------------------------");
            return;
        }

        const emailTransporter = await createTransporter();

        const mailOptions = {
            subject: subject,
            html: html,
            to: to,
            from: `"${process.env.EMAIL_FROM || 'Satguru Engineers'}" <${process.env.EMAIL_USER}>`,
        };

        await emailTransporter.sendMail(mailOptions);
        console.log(`Gmail API email sent successfully to ${to}`);
    } catch (error) {
        console.error("Email delivery failed:", error);
    }
};
