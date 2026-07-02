import nodemailer from 'nodemailer';
import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';

dotenv.config();

/**
 * Log email errors to a persistent file
 */
const logMailError = (error: any, context: string) => {
    try {
        const logDir = path.join(process.cwd(), 'logs');
        if (!fs.existsSync(logDir)) {
            fs.mkdirSync(logDir, { recursive: true });
        }
        const logFile = path.join(logDir, 'mail_errors.log');
        const timestamp = new Date().toISOString();
        const errorMessage = error instanceof Error ? error.message : JSON.stringify(error);
        const stack = error instanceof Error ? error.stack : 'No stack trace';
        
        const logEntry = `[${timestamp}] CONTEXT: ${context}\nERROR: ${errorMessage}\nSTACK: ${stack}\n${'-'.repeat(50)}\n`;
        fs.appendFileSync(logFile, logEntry);
        console.error(`Mail error logged: ${context} - ${errorMessage}`);
    } catch (err) {
        console.error("Failed to write to mail log file:", err);
    }
};

/**
 * Create a transporter for SMTP
 */
const getSmtpTransporter = () => {
    console.log("DEBUG: Creating SMTP transporter (Port 465, family: 4)");
    return nodemailer.createTransport({
        host: process.env.SMTP_HOST || 'satguruengineers.com',
        port: parseInt(process.env.SMTP_PORT || '465'),
        secure: process.env.SMTP_SECURE === 'false' ? false : true, // Default to true (SSL)
        auth: {
            user: process.env.SMTP_USER || 'contact@satguruengineers.com',
            pass: process.env.SMTP_PASS,
        },
        tls: {
            rejectUnauthorized: process.env.SMTP_REJECT_UNAUTHORIZED === 'false' ? false : true
        },
        timeout: 15000,
        family: 4,
        localAddress: '0.0.0.0'
    } as any);
};

const getGmailAccessToken = async (): Promise<string> => {
    const res = await fetch('https://oauth2.googleapis.com/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
            client_id: process.env.GMAIL_CLIENT_ID || '',
            client_secret: process.env.GMAIL_CLIENT_SECRET || '',
            refresh_token: process.env.GMAIL_REFRESH_TOKEN || '',
            grant_type: 'refresh_token'
        })
    });
    if (!res.ok) {
        const errText = await res.text();
        throw new Error(`Token refresh failed: ${res.status} - ${errText}`);
    }
    const data: any = await res.json();
    return data.access_token;
};

/**
 * Send email using the official Google Gmail API (Port 443 - HTTPS)
 * This bypasses SMTP port blocks on shared hosting.
 */
const sendEmailViaGmailApi = async (
    fromEmail: string,
    fromName: string,
    to: string,
    bcc: string | undefined,
    subject: string,
    text: string,
    html: string
): Promise<{ success: boolean; error?: string }> => {
    try {
        console.log("DEBUG: Initializing Gmail API Transport (HTTPS Port 443)");
        console.log("DEBUG: GMAIL_USER:", fromEmail);
        console.log("DEBUG: CLIENT_ID present:", !!process.env.GMAIL_CLIENT_ID);
        console.log("DEBUG: CLIENT_SECRET present:", !!process.env.GMAIL_CLIENT_SECRET);
        console.log("DEBUG: REFRESH_TOKEN present:", !!process.env.GMAIL_REFRESH_TOKEN);

        const accessToken = await getGmailAccessToken();

        // Construct RFC 2822 MIME message
        const utf8Subject = `=?utf-8?B?${Buffer.from(subject).toString('base64')}?=`;
        const messageParts = [
            `From: "${fromName}" <${fromEmail}>`,
            `To: ${to}`,
            bcc ? `Bcc: ${bcc}` : '',
            `Subject: ${utf8Subject}`,
            'MIME-Version: 1.0',
            'Content-Type: text/html; charset=utf-8',
            'Content-Transfer-Encoding: 7bit',
            '',
            html || text,
        ];
        const rawMessage = messageParts.filter(part => part !== '').join('\n');

        // Encode as base64url
        const encodedMessage = Buffer.from(rawMessage)
            .toString('base64')
            .replace(/\+/g, '-')
            .replace(/\//g, '_')
            .replace(/=+$/, '');

        const response = await fetch('https://gmail.googleapis.com/gmail/v1/users/me/messages/send', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${accessToken}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ raw: encodedMessage })
        });

        if (!response.ok) {
            const errText = await response.text();
            throw new Error(`Gmail API send failed: ${response.status} - ${errText}`);
        }

        const resData: any = await response.json();
        console.log(`DEBUG: Email sent via Gmail API: ${resData.id}`);
        return { success: true };
    } catch (error: any) {
        console.error("DEBUG: Gmail API Fail:", error);
        logMailError(error, `Gmail API Failure for ${to}`);
        return { success: false, error: `Gmail API Failed: ${error.message}` };
    }
};

/**
 * Unified sendEmail function
 * @param fromEmail - The sender email (determines transport and BCC)
 * @param to - Recipient email
 * @param subject - Email subject
 * @param text - Plain text body
 * @param html - HTML body
 */
export const sendEmail = async (
    fromEmail: string,
    to: string,
    subject: string,
    text: string,
    html: string
): Promise<{ success: boolean; error?: string }> => {
    console.log(`DEBUG: [Mailer v3] Sending email FROM: ${fromEmail} TO: ${to}`);
    const isOAuth = fromEmail.toLowerCase().includes('gmail.com');

    let bcc: string | undefined;
    let fromName = "Satguru Engineers";

    // Detect sender and configure transport/BCC
    if (fromEmail === 'contactsatguruengineers@gmail.com') {
        console.log("Routing to Gmail API");
        bcc = 'contactsatguruengineers@gmail.com';
        fromName = process.env.GMAIL_FROM_NAME || "Satguru Engineers";
        return await sendEmailViaGmailApi(fromEmail, fromName, to, bcc, subject, text, html);
    } 

    // Default to SMTP (specifically for contact@satguruengineers.com)
    console.log("Routing to SMTP Transport");
    const transporter = getSmtpTransporter();
    bcc = 'contact@satguruengineers.com';
    fromName = process.env.SMTP_FROM_NAME || "Satguru Engineers";

    try {
        const mailOptions = {
            from: `"${fromName}" <${fromEmail}>`,
            to,
            bcc, // Ensure sent email appears in sender inbox
            subject,
            text,
            html,
        };

        const info = await transporter.sendMail(mailOptions);
        console.log(`Email sent successfully: ${info.messageId}`);
        return { success: true };
    } catch (error: any) {
        let errorType = 'Connect Error';
        if (error.address && error.address.includes(':')) {
            errorType = 'IPv6 Connect Error';
        } else if (error.address) {
            errorType = 'IPv4 Connect Error';
        }
        
        const errorMessage = `Email Delivery Failed: ${error.message}${error.address ? ` (to ${error.address})` : ''}`;
        console.error(`DEBUG: [Mailer Fail] ${errorType} - ${errorMessage}`);
        
        logMailError(error, `Email from ${fromEmail} to ${to}`);
        return { success: false, error: errorMessage };
    }
};
