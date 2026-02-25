import { google } from 'googleapis';
import http from 'http';
import url from 'url';
import dotenv from 'dotenv';
import { exec } from 'child_process';

dotenv.config();

const CLIENT_ID = process.env.GMAIL_CLIENT_ID;
const CLIENT_SECRET = process.env.GMAIL_CLIENT_SECRET;
const REDIRECT_URI = 'http://localhost:3000/oauth2callback';

if (!CLIENT_ID || !CLIENT_SECRET) {
    console.error("❌ ERROR: Please set GMAIL_CLIENT_ID and GMAIL_CLIENT_SECRET in your .env file.");
    process.exit(1);
}

const oauth2Client = new google.auth.OAuth2(
    CLIENT_ID,
    CLIENT_SECRET,
    REDIRECT_URI
);

// Generate an authentication URL
const authUrl = oauth2Client.generateAuthUrl({
    access_type: 'offline', // Request a refresh token
    scope: ['https://mail.google.com/'],
    prompt: 'consent', // Force to get refresh token
    login_hint: process.env.EMAIL_USER // Pre-fill the correct email address
});

console.log('🔗 Visit this URL to authorize the app:');
console.log(authUrl);

// Create a simple server to handle the OAuth2 callback
const server = http.createServer(async (req, res) => {
    if (req.url && req.url.startsWith('/oauth2callback')) {
        const q = url.parse(req.url, true).query;

        if (q.error) {
            console.error('Error returned from Google:', q.error);
            res.end('Error occurred. Please check the terminal.');
            server.close();
            return;
        }

        const code = q.code as string;
        try {
            console.log('\n✅ Authorization code received, exchanging for tokens...');
            const { tokens } = await oauth2Client.getToken(code);

            console.log('\n🎉 Successfully retrieved tokens!');
            console.log('------------------------------------------------------');
            console.log(`GMAIL_REFRESH_TOKEN=${tokens.refresh_token}`);
            console.log('------------------------------------------------------');
            console.log('📋 Copy the above line into your .env file.');

            res.writeHead(200, { 'Content-Type': 'text/html' });
            res.end(`
                <html>
                    <body>
                        <h1>Authentication Successful!</h1>
                        <p>You can close this tab now. Please check your terminal for the Refresh Token.</p>
                    </body>
                </html>
            `);
        } catch (error) {
            console.error('❌ Error getting tokens:', error);
            res.end('Failed to get tokens. Check the terminal.');
        } finally {
            server.close();
        }
    }
}).listen(3000, () => {
    console.log('\n🚀 Server is listening on http://localhost:3000 for the Google callback...');

    // Attempt to automatically open the browser based on platform
    let command = '';
    if (process.platform === 'win32') command = `start "" "${authUrl}"`;
    else if (process.platform === 'darwin') command = `open "${authUrl}"`;
    else command = `xdg-open "${authUrl}"`;

    exec(command, (err) => {
        if (err) {
            console.log("Could not automatically open your browser. Please click the link above.");
        }
    });
});
