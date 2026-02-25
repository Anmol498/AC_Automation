import { sendEmail } from './src/utils/gmailMailer.js';
import dotenv from 'dotenv';
dotenv.config();

console.log("Starting email test...");
sendEmail(
    process.env.EMAIL_USER || "test@example.com",
    "Test Email from CoolBreeze AC Automation",
    "<h1>Success!</h1><p>Your Gmail SMTP App Password setup is working correctly.</p>"
).then(() => {
    console.log("Email test script finished executing.");
    process.exit(0);
}).catch(err => {
    console.error("Test failed:", err);
    process.exit(1);
});
