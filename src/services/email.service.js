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
            const recipientEmail = order.logistics?.courierEmail || company?.email || order.courierEmail;
            const courierName = order.logistics?.courierName || company?.name || "Logistics Partner";
            const deliveryFee = order.logistics?.shippingFee !== undefined
                ? order.logistics.shippingFee
                : (order.logisticsDispatch?.deliveryFee !== undefined
                    ? order.logisticsDispatch.deliveryFee
                    : (order.shippingCost !== undefined ? order.shippingCost : (company?.defaultBasePrice || 3000)));
            
            const customerName = order.shippingAddress?.fullName || order.user?.name || "Valued Customer";
            const customerPhone = order.shippingAddress?.phoneNumber || order.user?.phoneNumber || "N/A";
            const addressLine = order.shippingAddress?.addressLine1 || "N/A";
            const landmark = order.shippingAddress?.addressLine2 ? ` (Landmark: ${order.shippingAddress.addressLine2})` : "";
            const city = order.shippingAddress?.city || "";
            const state = order.shippingAddress?.state || company?.state || "";

            // Seller Store / Pickup Location
            const sellerName = order.seller?.business?.businessName || order.seller?.name || "Verified Abamba Merchant";
            const sellerAddressObj = order.seller?.business?.businessAddress;
            const pickupLocation = sellerAddressObj?.addressLine1
                ? `${sellerAddressObj.addressLine1}, ${sellerAddressObj.city || ""}, ${sellerAddressObj.state || ""}`
                : (order.seller?.business?.storeAddress || order.seller?.business?.city || "Registered Store Location");

            // Package Details
            const itemsList = Array.isArray(order.items) && order.items.length > 0
                ? order.items.map(item => `<li style="margin: 6px 0; font-size: 14px;"><strong>${item.name || "Product"}</strong> (Qty: ${item.quantity || 1}) &mdash; <span style="color: #4b5563;">Pickup from: ${sellerName} (${pickupLocation})</span></li>`).join("")
                : `<li>Standard Marketplace Package &mdash; Pickup from: ${sellerName} (${pickupLocation})</li>`;

            // Accept Delivery Action Link
            const acceptDeliveryUrl = `${process.env.FRONTEND_URL || "https://www.abamba.com.ng"}/delivery/accept/${order._id}?courier=${encodeURIComponent(courierName)}`;

            const subject = `[New Dispatch Request] Order #${orderIdStr} - Abamba Marketplace`;

            const htmlBody = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #e5e7eb; border-radius: 12px; overflow: hidden; background-color: #ffffff;">
        <div style="background-color: #003459; padding: 24px; text-align: center; color: white;">
          <h2 style="margin: 0; font-size: 22px;">📦 New Dispatch Request - Order #${orderIdStr}</h2>
          <p style="margin: 6px 0 0; opacity: 0.9; font-size: 14px;">Abamba Logistics Dispatch Service</p>
        </div>
        <div style="padding: 24px; color: #1f2937;">
          <p style="font-size: 16px;">Hello <strong>${courierName}</strong> Team,</p>
          <p>A customer has placed an order and assigned delivery to your service. Please review the shipment and pickup details below:</p>
          
          <div style="background-color: #f8fafc; border-left: 4px solid #003459; padding: 16px; margin: 20px 0; border-radius: 6px;">
            <p style="margin: 4px 0;"><strong>Order Number:</strong> #${orderIdStr}</p>
            <p style="margin: 4px 0;"><strong>Delivery Fee Assigned:</strong> <span style="color: #003459; font-weight: bold; font-size: 17px;">₦${Number(deliveryFee).toLocaleString("en-NG", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span></p>
          </div>

          <!-- Customer Details -->
          <div style="background-color: #ffffff; border: 1px solid #e2e8f0; border-radius: 8px; padding: 16px; margin-bottom: 16px;">
            <h4 style="color: #003459; margin: 0 0 10px 0; border-bottom: 1px solid #edf2f7; padding-bottom: 6px;">📍 Customer Details (Delivery Destination):</h4>
            <p style="margin: 4px 0;"><strong>Customer Name:</strong> ${customerName}</p>
            <p style="margin: 4px 0;"><strong>Customer Phone:</strong> <a href="tel:${customerPhone !== "N/A" ? customerPhone : ''}" style="color: #003459; font-weight: bold;">${customerPhone}</a></p>
            <p style="margin: 4px 0;"><strong>Delivery Address:</strong> ${addressLine}${landmark}, ${city}, ${state}</p>
          </div>

          <!-- Package Details -->
          <div style="background-color: #ffffff; border: 1px solid #e2e8f0; border-radius: 8px; padding: 16px; margin-bottom: 16px;">
            <h4 style="color: #003459; margin: 0 0 10px 0; border-bottom: 1px solid #edf2f7; padding-bottom: 6px;">📦 Ordered Items & Seller Pickup Locations:</h4>
            <ul style="margin: 6px 0 12px 18px; padding: 0;">
              ${itemsList}
            </ul>
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
            Delivery fees are recorded automatically and settled directly to your bank account by Abamba.
          </p>
        </div>
      </div>
    `;

            if (!this.plunk) {
                console.log(`[Dispatch Email dev-mode] To: ${recipientEmail}, Subject: ${subject}`);
                return { id: "dev-mode", status: "success" };
            }

            if (!recipientEmail) {
                console.warn("[Dispatch Email] No recipient email found for courier dispatch");
                return null;
            }

            const emailData = {
                to: recipientEmail,
                subject: subject,
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

    /**
     * Send buyer payment confirmation email
     * Handles both pick-up station and doorstep delivery orders
     */
    async sendBuyerPaymentConfirmationEmail({ user, orderHolder, orders = [] }) {
        try {
            const recipientEmail = user?.email || orderHolder?.user?.email;
            if (!recipientEmail) {
                console.warn("[Buyer Email] No recipient email for buyer payment confirmation");
                return null;
            }

            const primaryOrder = orders[0] || {};
            const isPickupStation = Boolean(
                orderHolder?.isPickupStation ||
                orderHolder?.fulfillmentType === "pickup_station" ||
                primaryOrder?.isPickupStation ||
                primaryOrder?.fulfillmentType === "pickup_station"
            );

            const orderIdStr = orderHolder?.orderId || primaryOrder?.orderId || (orderHolder?._id ? orderHolder._id.toString().slice(-6).toUpperCase() : "ORDER");
            const customerName = user?.name || user?.firstName || orderHolder?.shippingAddress?.fullName || "Valued Customer";
            const totalAmount = orderHolder?.total || orders.reduce((sum, o) => sum + (o.total || 0), 0);

            // Aggregate items across orders
            const allItems = [];
            for (const ord of orders) {
                if (Array.isArray(ord.items)) {
                    allItems.push(...ord.items);
                }
            }

            const itemsRowsHtml = allItems.map((it) => {
                const price = Number(it.price || 0).toLocaleString("en-NG", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
                const total = Number((it.price || 0) * (it.quantity || 1)).toLocaleString("en-NG", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
                return `
                <tr>
                    <td style="padding: 10px; border-bottom: 1px solid #edf2f7; font-size: 14px; color: #1f2937;">
                        <strong>${it.name || "Product"}</strong>
                    </td>
                    <td style="padding: 10px; border-bottom: 1px solid #edf2f7; font-size: 14px; text-align: center; color: #4b5563;">${it.quantity || 1}</td>
                    <td style="padding: 10px; border-bottom: 1px solid #edf2f7; font-size: 14px; text-align: right; color: #4b5563;">₦${price}</td>
                    <td style="padding: 10px; border-bottom: 1px solid #edf2f7; font-size: 14px; text-align: right; font-weight: bold; color: #1f2937;">₦${total}</td>
                </tr>
                `;
            }).join("");

            let subject = `Your Abamba Order #${orderIdStr} - Payment Confirmed`;
            let fulfillmentBlock = "";

            if (isPickupStation) {
                subject = `Your Abamba Order #${orderIdStr} - Ready for Office Collection in 5-7 Days`;
                fulfillmentBlock = `
                <!-- Pick-Up Station Specific Information -->
                <div style="background-color: #f0fdf4; border: 1px solid #86efac; border-radius: 8px; padding: 18px; margin: 20px 0;">
                    <div style="display: flex; align-items: center; margin-bottom: 12px;">
                        <span style="font-size: 20px; margin-right: 8px;">🏢</span>
                        <h3 style="margin: 0; color: #15803d; font-size: 17px;">Abamba Official Pick-Up Station Receipt</h3>
                    </div>
                    <table style="width: 100%; border-collapse: collapse; font-size: 14px; line-height: 1.6;">
                        <tr>
                            <td style="padding: 4px 0; color: #4b5563; width: 160px;"><strong>Delivery Method:</strong></td>
                            <td style="padding: 4px 0; color: #15803d; font-weight: bold;">Abamba Official Pick-Up Station (Zero Fee - ₦0)</td>
                        </tr>
                        <tr>
                            <td style="padding: 4px 0; color: #4b5563;"><strong>Shipping Fee:</strong></td>
                            <td style="padding: 4px 0; color: #15803d; font-weight: bold;">₦0.00 (FREE)</td>
                        </tr>
                        <tr>
                            <td style="padding: 4px 0; color: #4b5563;"><strong>Office Collection Address:</strong></td>
                            <td style="padding: 4px 0; color: #1f2937; font-weight: bold;">ANGELINA HOUSE, 31 WETHERAL ROAD OWERRI IMO STATE NIGERIA</td>
                        </tr>
                        <tr>
                            <td style="padding: 4px 0; color: #4b5563;"><strong>Contact Numbers:</strong></td>
                            <td style="padding: 4px 0;">Customers: <a href="tel:+2348060039760" style="color: #003459; font-weight: bold;">+2348060039760</a> | Support: <a href="tel:+2349077758206" style="color: #003459; font-weight: bold;">+2349077758206</a></td>
                        </tr>
                        <tr>
                            <td style="padding: 4px 0; color: #4b5563;"><strong>Collection Timeline:</strong></td>
                            <td style="padding: 4px 0; color: #1f2937; font-weight: 500;">5 to 7 working days</td>
                        </tr>
                    </table>

                    <div style="margin-top: 14px; padding: 12px; background-color: #ffffff; border-radius: 6px; border-left: 4px solid #15803d;">
                        <p style="margin: 0; font-size: 13px; color: #166534; font-weight: 500;">
                            📌 <strong>Timeline Note:</strong> Your product will be ready for pickup at our office within 5 to 7 working days. Please bring your <strong>Order ID (#${orderIdStr})</strong> and a valid ID when coming to collect your order.
                        </p>
                    </div>
                </div>
                `;
            } else {
                const shippingAddr = orderHolder?.shippingAddress || primaryOrder?.shippingAddress;
                const shippingFee = Number(orderHolder?.shippingCost || primaryOrder?.shippingCost || 3000).toLocaleString("en-NG", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
                const fullAddress = shippingAddr
                    ? `${shippingAddr.addressLine1 || ""}${shippingAddr.addressLine2 ? ` (${shippingAddr.addressLine2})` : ""}, ${shippingAddr.city || ""}, ${shippingAddr.state || ""}`
                    : "Address on file";

                fulfillmentBlock = `
                <!-- Doorstep Delivery Information -->
                <div style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 18px; margin: 20px 0;">
                    <h3 style="margin: 0 0 12px 0; color: #003459; font-size: 16px;">🚚 Delivery Destination Details</h3>
                    <table style="width: 100%; border-collapse: collapse; font-size: 14px; line-height: 1.6;">
                        <tr>
                            <td style="padding: 4px 0; color: #4b5563; width: 140px;"><strong>Recipient Name:</strong></td>
                            <td style="padding: 4px 0; color: #1f2937; font-weight: bold;">${shippingAddr?.fullName || customerName}</td>
                        </tr>
                        <tr>
                            <td style="padding: 4px 0; color: #4b5563;"><strong>Contact Phone:</strong></td>
                            <td style="padding: 4px 0; color: #1f2937;">${shippingAddr?.phoneNumber || user?.phoneNumber || "N/A"}</td>
                        </tr>
                        <tr>
                            <td style="padding: 4px 0; color: #4b5563;"><strong>Delivery Address:</strong></td>
                            <td style="padding: 4px 0; color: #1f2937;">${fullAddress}</td>
                        </tr>
                        <tr>
                            <td style="padding: 4px 0; color: #4b5563;"><strong>Delivery Fee:</strong></td>
                            <td style="padding: 4px 0; color: #003459; font-weight: bold;">₦${shippingFee}</td>
                        </tr>
                    </table>
                </div>
                `;
            }

            const htmlBody = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #e5e7eb; border-radius: 12px; overflow: hidden; background-color: #ffffff;">
        <div style="background-color: #003459; padding: 24px; text-align: center; color: white;">
          <h2 style="margin: 0; font-size: 22px;">🎉 Payment Confirmed</h2>
          <p style="margin: 6px 0 0; opacity: 0.9; font-size: 14px;">Order #${orderIdStr} is being processed</p>
        </div>
        <div style="padding: 24px; color: #1f2937;">
          <p style="font-size: 16px; margin-top: 0;">Hello <strong>${customerName}</strong>,</p>
          <p>Thank you for shopping on <strong>Abamba Marketplace</strong>! We have received your payment of <strong style="color: #003459; font-size: 17px;">₦${Number(totalAmount).toLocaleString("en-NG", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</strong>.</p>
          
          ${fulfillmentBlock}

          <!-- Items Summary Table -->
          <div style="margin-top: 24px;">
            <h4 style="color: #003459; margin: 0 0 10px 0; border-bottom: 1px solid #edf2f7; padding-bottom: 6px;">🛒 Ordered Items</h4>
            <table style="width: 100%; border-collapse: collapse; margin-bottom: 16px;">
                <thead>
                    <tr style="background-color: #f8fafc;">
                        <th style="padding: 8px 10px; text-align: left; font-size: 13px; color: #64748b;">Item</th>
                        <th style="padding: 8px 10px; text-align: center; font-size: 13px; color: #64748b;">Qty</th>
                        <th style="padding: 8px 10px; text-align: right; font-size: 13px; color: #64748b;">Price</th>
                        <th style="padding: 8px 10px; text-align: right; font-size: 13px; color: #64748b;">Total</th>
                    </tr>
                </thead>
                <tbody>
                    ${itemsRowsHtml || '<tr><td colspan="4" style="padding: 10px; text-align: center; color: #64748b;">Order items processed</td></tr>'}
                </tbody>
            </table>
            
            <div style="text-align: right; border-top: 2px solid #edf2f7; padding-top: 10px; font-size: 16px;">
                <p style="margin: 4px 0; color: #1f2937;"><strong>Total Paid:</strong> <span style="color: #003459; font-weight: bold; font-size: 18px;">₦${Number(totalAmount).toLocaleString("en-NG", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span></p>
            </div>
          </div>

          <div style="margin: 30px 0 10px; text-align: center;">
            <a href="${process.env.FRONTEND_URL || "https://www.abamba.com.ng"}/account/orders" style="background-color: #003459; color: white; padding: 12px 26px; text-decoration: none; border-radius: 8px; font-weight: bold; font-size: 15px; display: inline-block;">
              View My Orders
            </a>
          </div>

          <p style="font-size: 12px; color: #64748b; margin-top: 30px; text-align: center; line-height: 1.5; border-top: 1px solid #f1f5f9; padding-top: 16px;">
            Need help? Contact Abamba Customer Care at <a href="tel:+2348060039760" style="color: #003459;">+2348060039760</a> or Support Line <a href="tel:+2349077758206" style="color: #003459;">+2349077758206</a>.<br>
            &copy; ${new Date().getFullYear()} Abamba Marketplace. All rights reserved.
          </p>
        </div>
      </div>
      `;

            if (!this.plunk) {
                console.log(`[Buyer Payment Email dev-mode] To: ${recipientEmail}, Subject: ${subject}`);
                return { id: "dev-mode", status: "success" };
            }

            const emailData = {
                to: recipientEmail,
                subject: subject,
                body: htmlBody,
            };

            if (process.env.FROM_EMAIL) {
                emailData.from = process.env.FROM_EMAIL;
            }

            const response = await this.plunk.emails.send(emailData);
            console.log(`✅ Buyer payment confirmation email sent to ${recipientEmail}`);
            return response;
        } catch (error) {
            console.error("Failed to send buyer payment confirmation email via Plunk:", error);
        }
    }
}

const emailServiceInstance = new EmailService();

export const sendLogisticsDispatchEmail = (order, company) =>
    emailServiceInstance.sendLogisticsDispatchEmail(order, company);

export const sendBuyerPaymentConfirmationEmail = (data) =>
    emailServiceInstance.sendBuyerPaymentConfirmationEmail(data);

export default emailServiceInstance;


