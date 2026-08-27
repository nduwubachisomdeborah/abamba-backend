import Plunk from '@plunk/node';
import { readFileSync, existsSync } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import * as Handlebars from 'handlebars';
import { EMAIL_FAILED } from '../config/strings.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

class EmailService {
    constructor() {
        // Initialize Plunk client with API key
        if (!process.env.PLUNK_API_KEY) {
            console.warn('PLUNK_API_KEY environment variable not set. Email functionality will be limited.');
        }

        const PlunkClient = Plunk.default || Plunk;
        this.plunk = process.env.PLUNK_API_KEY ? new PlunkClient(process.env.PLUNK_API_KEY) : null;
    }

    async sendEmail(to, subject, template, data) {
        try {
            // Read and compile template
            let templatePath = path.resolve(__dirname, '../templates', `${template}.hbs`);
            if (!existsSync(templatePath)) {
                templatePath = path.resolve(process.cwd(), 'src/templates', `${template}.hbs`);
            }
            const templateContent = readFileSync(templatePath, 'utf8');

            const html = Handlebars.compile(templateContent)({
                ...data,
                subject,
                companyName: process.env.COMPANY_NAME || 'Abamba',
                logoUrl: process.env.COMPANY_LOGO || 'https://via.placeholder.com/150x50?text=Abamba',
                year: new Date().getFullYear(),
                supportEmail: process.env.SUPPORT_EMAIL || 'support@abamba.com',
            });

            // If in development mode without API key, log email instead of sending
            if (!this.plunk) {
                console.log('Email would be sent in production:');
                console.log(`To: ${to}`);
                console.log(`Subject: ${subject}`);
                console.log(`Content: ${html.substring(0, 100)}...`);
                return { id: 'dev-mode', status: 'success' };
            }

            // Construct email payload
            const emailData = {
                to,
                subject: subject,
                body: html,
            };

            if (process.env.FROM_EMAIL) {
                emailData.from = process.env.FROM_EMAIL;
            }

            const response = await this.plunk.emails.send(emailData);

            console.log(`Email sent successfully to ${to}`);
            return response;
        } catch (error) {
            console.error('Failed to send email:', error);
            throw new Error(EMAIL_FAILED || 'Failed to send email');
        }
    }

    // Optional: Method to verify email
    async verifyEmail(email) {
        try {
            if (!this.plunk) {
                console.log(`Email verification would happen in production for: ${email}`);
                return { status: 'dev-mode', valid: true };
            }
            
            const response = await this.plunk.emails.verify(email);
            return response;
        } catch (error) {
            console.error('Email verification failed:', error);
            throw new Error(`Email verification failed: ${error.message}`);
        }
    }
}

export default new EmailService();
