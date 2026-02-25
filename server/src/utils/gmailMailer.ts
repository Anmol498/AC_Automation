import { google } from 'googleapis';
import dotenv from 'dotenv';

dotenv.config();

const OAuth2 = google.auth.OAuth2;

const getGmailService = async () => {
    try {
        const oauth2Client = new OAuth2(
            process.env.GMAIL_CLIENT_ID,
            process.env.GMAIL_CLIENT_SECRET,
            "https://developers.google.com/oauthplayground"
        );

        oauth2Client.setCredentials({
            refresh_token: process.env.GMAIL_REFRESH_TOKEN,
        });

        const gmail = google.gmail({ version: 'v1', auth: oauth2Client });
        return gmail;
    } catch (err) {
        console.error("Gmail service creation error:", err);
        throw err;
    }
};

const makeRawEmail = (to: string, subject: string, html: string) => {
    const defaultFrom = `"${process.env.EMAIL_FROM || 'Satguru Engineers'}" <${process.env.EMAIL_USER}>`;

    // Modern way to construct raw email headers and body
    const emailLines = [
        `To: ${to}`,
        `From: ${defaultFrom}`,
        `Subject: =?utf-8?B?${Buffer.from(subject).toString('base64')}?=`,
        'MIME-Version: 1.0',
        'Content-Type: text/html; charset=utf-8',
        '',
        html
    ];

    const email = emailLines.join('\r\n');

    // Base64URL encode the string
    return Buffer.from(email)
        .toString('base64')
        .replace(/\+/g, '-')
        .replace(/\//g, '_')
        .replace(/=+$/, '');
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

        const gmail = await getGmailService();
        const rawMessage = makeRawEmail(to, subject, html);

        // Send via official Gmail REST API (HTTPS port 443), completely bypassing SMTP
        const response = await gmail.users.messages.send({
            userId: 'me',
            requestBody: {
                raw: rawMessage,
            },
        });

        console.log(`Gmail API email sent successfully to ${to} (Message ID: ${response.data.id})`);
    } catch (error: any) {
        console.error("Email delivery failed:", error.message || error);
    }
};
