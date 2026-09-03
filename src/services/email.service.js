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
            const orderIdStr = order.orderId ? `${order.orderId}` : (order._id ? order._id.toString().slice(-6).toUpperCase() : "ORDER");
            const recipientEmail = order.logistics?.courierEmail || company?.email;
            const courierName = order.logistics?.courierName || company?.name || "Logistics Partner";
            const deliveryFee = order.logistics?.shippingFee || order.logisticsDispatch?.deliveryFee || order.shippingCost || company?.defaultBasePrice || 3000;
            
            const customerName = order.shippingAddress?.fullName || order.user?.name || "Valued Customer";
            const customerPhone = order.shippingAddress?.phoneNumber || order.user?.phoneNumber || "N/A";
            const addressLine = order.shippingAddress?.addressLine1 || "N/A";
            const landmark = order.shippingAddress?.addressLine2 ? ` (Landmark: ${order.shippingAddress.addressLine2})` : "";
            const city = order.shippingAddress?.city || "";
            const state = order.shippingAddress?.state || company?.state || "";

            // Package Details
            const itemsList = Array.isArray(order.items) && order.items.length > 0
                ? order.items.map(item => `<li style="margin: 4px 0;"><strong>${item.name || "Product"}</strong> x ${item.quantity || 1}</li>`).join("")
                : "<li>Standard Marketplace Package</li>";

            // Seller Store / Pickup Location
            const sellerName = order.seller?.business?.businessName || order.seller?.name || "Verified Abamba Merchant";
            const pickupLocation = order.seller?.business?.storeAddress || order.seller?.business?.city || "Registered Store Location";

            // Accept Delivery Action Link
            const acceptDeliveryUrl = `${process.env.FRONTEND_URL || "https://abamba.store"}/delivery/accept/${order._id}?courier=${encodeURIComponent(courierName)}`;

            const htmlBody = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #e5e7eb; border-radius: 12px; overflow: hidden; background-color: #ffffff;">
        <div style="background-color: #003459; padding: 24px; text-align: center; color: white;">
          <h2 style="margin: 0; font-size: 22px;">📦 New Delivery Request - Order #${orderIdStr}</h2>
          <p style="margin: 6px 0 0; opacity: 0.9; font-size: 14px;">Abamba Logistics Dispatch Service</p>
        </div>
        <div style="padding: 24px; color: #1f2937;">
          <p style="font-size: 16px;">Hello <strong>${courierName}</strong> Team,</p>
          <p>A customer has placed an order and selected your courier service for standard regional delivery. Please review the shipment details below:</p>
          
          <div style="background-color: #f8fafc; border-left: 4px solid #003459; padding: 16px; margin: 20px 0; border-radius: 6px;">
            <p style="margin: 4px 0;"><strong>Order Number:</strong> #${orderIdStr}</p>
            <p style="margin: 4px 0;"><strong>Delivery Fee:</strong> <span style="color: #003459; font-weight: bold; font-size: 17px;">₦${Number(deliveryFee).toLocaleString()}</span></p>
          </div>

          <!-- Customer Details -->
          <div style="background-color: #ffffff; border: 1px solid #e2e8f0; border-radius: 8px; padding: 16px; margin-bottom: 16px;">
            <h4 style="color: #003459; margin: 0 0 10px 0; border-bottom: 1px solid #edf2f7; padding-bottom: 6px;">📍 Customer Details (Delivery Destination):</h4>
            <p style="margin: 4px 0;"><strong>Name:</strong> ${customerName}</p>
            <p style="margin: 4px 0;"><strong>Phone:</strong> <a href="tel:${customerPhone !== "N/A" ? customerPhone : ''}" style="color: #003459; font-weight: bold;">${customerPhone}</a></p>
            <p style="margin: 4px 0;"><strong>Full Delivery Address:</strong> ${addressLine}${landmark}, ${city}, ${state}</p>
          </div>

          <!-- Package Details -->
          <div style="background-color: #ffffff; border: 1px solid #e2e8f0; border-radius: 8px; padding: 16px; margin-bottom: 16px;">
            <h4 style="color: #003459; margin: 0 0 10px 0; border-bottom: 1px solid #edf2f7; padding-bottom: 6px;">📦 Package Details:</h4>
            <ul style="margin: 6px 0 12px 18px; padding: 0;">
              ${itemsList}
            </ul>
            <p style="margin: 4px 0;"><strong>Seller Store:</strong> ${sellerName}</p>
            <p style="margin: 4px 0;"><strong>Pickup Location:</strong> ${pickupLocation}</p>
          </div>

          <!-- Action Buttons -->
          <div style="margin: 30px 0 20px; text-align: center;">
            <a href="${acceptDeliveryUrl}" style="background-color: #22c55e; color: white; padding: 14px 28px; text-decoration: none; border-radius: 8px; font-weight: bold; font-size: 16px; display: inline-block; margin-right: 10px; margin-bottom: 10px;">
              ✅ Accept Delivery Request
            </a>
            ${customerPhone !== "N/A" ? `
            <a href="tel:${customerPhone}" style="background-color: #003459; color: white; padding: 14px 24px; text-decoration: none; border-radius: 8px; font-weight: bold; font-size: 15px; display: inline-block; margin-bottom: 10px;">
              📞 Call Customer
            </a>` : ''}
          </div>

          <p style="font-size: 12px; color: #64748b; margin-top: 24px; text-align: center; line-height: 1.5;">
            Delivery fees are recorded automatically and settled directly to your bank account at the end of the month by Abamba.
          </p>
        </div>
      </div>
    `;

            if (!this.plunk) {
                console.log(`[Dispatch Email dev-mode] To: ${recipientEmail}, Subject: New Delivery Request - Order #${orderIdStr}`);
                return { id: "dev-mode", status: "success" };
            }

            const emailData = {
                to: recipientEmail,
                subject: `New Delivery Request - Order #${orderIdStr}`,
                body: htmlBody,
            };

            if (process.env.FROM_EMAIL) {
                emailData.from = process.env.FROM_EMAIL;
            }

            const response = await this.plunk.emails.send(emailData);
            console.log(`✅ Dispatch email sent to ${courierName} at ${recipientEmail}`);
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

