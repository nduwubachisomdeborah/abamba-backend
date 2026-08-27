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

    async sendLogisticsDispatchEmail(order, company) {
        try {
            const orderIdStr = order._id ? order._id.toString().slice(-6).toUpperCase() : "ORDER";
            const deliveryFee = order.logisticsDispatch?.deliveryFee || order.shippingCost || company.defaultBasePrice || 3000;
            const customerName = order.shippingAddress?.fullName || order.user?.name || "Valued Customer";
            const customerPhone = order.shippingAddress?.phoneNumber || order.user?.phoneNumber || "N/A";
            const addressLine = order.shippingAddress?.addressLine1 || "N/A";
            const city = order.shippingAddress?.city || "";
            const state = order.shippingAddress?.state || company.state || "";

            const htmlBody = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #e5e7eb; border-radius: 12px; overflow: hidden;">
        <div style="background-color: #003459; padding: 20px; text-align: center; color: white;">
          <h2 style="margin: 0;">📦 New Delivery Dispatch Request</h2>
          <p style="margin: 5px 0 0; opacity: 0.85;">Abamba Marketplace Dispatch Notification</p>
        </div>
        <div style="padding: 24px; color: #1f2937;">
          <p style="font-size: 16px;">Hello <strong>${company.name}</strong> Team,</p>
          <p>A customer has selected your service for delivery on Abamba. Below are the order and delivery details:</p>
          <div style="background-color: #f8fafc; border-left: 4px solid #003459; padding: 16px; margin: 20px 0; border-radius: 4px;">
            <p style="margin: 4px 0;"><strong>Order ID:</strong> #${orderIdStr}</p>
            <p style="margin: 4px 0;"><strong>Delivery Fee:</strong> <span style="color: #003459; font-weight: bold; font-size: 16px;">₦${deliveryFee.toLocaleString()}</span></p>
          </div>
          <h4 style="color: #003459; border-bottom: 1px solid #e5e7eb; padding-bottom: 8px; margin-top: 20px;">📍 Delivery Destination (Buyer):</h4>
          <p style="margin: 4px 0;"><strong>Customer Name:</strong> ${customerName}</p>
          <p style="margin: 4px 0;"><strong>Phone:</strong> ${customerPhone}</p>
          <p style="margin: 4px 0;"><strong>Address:</strong> ${addressLine}${city ? `, ${city}` : ""}${state ? `, ${state}` : ""}</p>
          <div style="margin-top: 30px; text-align: center;">
            <a href="tel:${customerPhone !== "N/A" ? customerPhone : ''}" style="background-color: #003459; color: white; padding: 12px 24px; text-decoration: none; border-radius: 8px; font-weight: bold; display: inline-block;">
              Call Customer for Delivery
            </a>
          </div>
          <p style="font-size: 12px; color: #6b7280; margin-top: 30px; text-align: center;">
            Delivery fees are recorded automatically and settled directly to your bank account at the end of the month by Abamba.
          </p>
        </div>
      </div>
    `;

            if (!this.plunk) {
                console.log(`[Dispatch Email dev-mode] To: ${company.email}, Subject: New Delivery Dispatch #${orderIdStr}`);
                return { id: "dev-mode", status: "success" };
            }

            const emailData = {
                to: company.email,
                subject: `🚨 New Delivery Dispatch #${orderIdStr} (${company.state} State)`,
                body: htmlBody,
            };

            if (process.env.FROM_EMAIL) {
                emailData.from = process.env.FROM_EMAIL;
            }

            const response = await this.plunk.emails.send(emailData);
            console.log(`✅ Dispatch email sent to ${company.name} at ${company.email}`);
            return response;
        } catch (error) {
            console.error("Failed to send dispatch email via Plunk:", error);
        }
    }
}

const emailServiceInstance = new EmailService();

export const sendLogisticsDispatchEmail = (order, company) =>
    emailServiceInstance.sendLogisticsDispatchEmail(order, company);

export default emailServiceInstance;

