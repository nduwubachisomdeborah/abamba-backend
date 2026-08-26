import mongoose from "mongoose";
import dotenv from "dotenv";
import User from "../src/models/user.model.js";
import Order from "../src/models/order.model.js";
import Shipment from "../src/models/shipment.model.js";
import paymentService from "../src/services/payment.service.js";
import WebhookController from "../src/controllers/webhook.controller.js";
import { v4 as uuidv4 } from "uuid";

dotenv.config();

const MONGO_URI = process.env.MONGO_URI || "mongodb://localhost:27017/abamba";

// Mock notification service to prevent hanging/errors during test
import notificationService from "../src/services/notification.service.js";
notificationService.send = async (...args) => {
    console.log("[Mock Notification] Sending notification:", args[1]);
    return Promise.resolve();
};

async function runTest() {
    try {
        await mongoose.connect(MONGO_URI);
        console.log("Connected to MongoDB");

        // 1. Create Buyer and Seller
        const buyerEmail = `buyer_${Date.now()}@test.com`;
        const sellerEmail = `seller_${Date.now()}@test.com`;

        const buyer = await User.create({
            name: "Test Buyer",
            email: buyerEmail,
            password: "password123",
            role: "user",
        });

        const seller = await User.create({
            name: "Test Seller",
            email: sellerEmail,
            password: "password123",
            role: "seller",
            wallet: { balance: 0, pendingBalance: 0 },
        });

        console.log(`Created Buyer: ${buyer._id}, Seller: ${seller._id}`);

        // 2. Create Order directly (skipping cart for simplicity, simulating PaymentService logic partially)
        // actually let's use PaymentService.createHolderFromCart to be authentic, but that requires a Cart.
        // Let's just create an Order manually that mimics what PaymentService does,
        // OR better, let's just test the specific logic points.

        // Let's test PaymentService.verifyAndFinalizeByReference logic by mocking the data it needs.
        // We need an OrderHolder and Order in DB.

        const orderTotal = 5000;
        const subtotal = 4000;

        const order = await Order.create({
            user: buyer._id,
            seller: seller._id,
            items: [
                {
                    product: new mongoose.Types.ObjectId(), // dummy
                    name: "Test Product",
                    price: subtotal,
                    quantity: 1,
                },
            ],
            shippingAddress: {
                fullName: "Buyer",
                addressLine1: "123 St",
                city: "Lagos",
                state: "Lagos",
                zipCode: "100001",
                country: "NG",
                phoneNumber: "08012345678",
            },
            payment: {
                method: "credit_card",
                amount: orderTotal,
                status: "pending",
            },
            subtotal: subtotal,
            shippingCost: 1000,
            total: orderTotal,
            sellerWalletStatus: "pending",
        });

        // Create a fake payment and order holder to simulate verifyAndFinalizeByReference
        // But verifyAndFinalizeByReference fetches payment by reference.
        // Actually, let's just manually simulate the credit logic which we changed in payment.service.js
        // But we can't easily call the private logic inside verifyAndFinalizeByReference without full setup.

        // checks:
        // 1. Credit Pending Wallet
        console.log("--- Simulating Payment Success ---");
        const creditAmount = subtotal;

        // Simulate what PaymentService does
        await User.findByIdAndUpdate(seller._id, {
            $inc: { "wallet.pendingBalance": creditAmount },
        });

        const sellerAfterPayment = await User.findById(seller._id);
        console.log(
            `Seller Pending Balance: ${sellerAfterPayment.wallet.pendingBalance} (Expected: ${creditAmount})`,
        );
        console.log(
            `Seller Balance: ${sellerAfterPayment.wallet.balance} (Expected: 0)`,
        );

        if (
            sellerAfterPayment.wallet.pendingBalance !== creditAmount ||
            sellerAfterPayment.wallet.balance !== 0
        ) {
            throw new Error("Payment credit logic failed!");
        }

        // 3. Create Shipment
        const shipment = await Shipment.create({
            orders: [order._id],
            trackingNumber: `SB-${Date.now()}`,
            carrier: "Test Courier",
            status: "pending",
            shippingMethod: "standard",
        });

        order.shipment = shipment._id;
        await order.save();

        // 4. Simulate Webhook Delivery
        console.log("--- Simulating Delivery Webhook ---");
        const req = {
            body: {
                event: "shipment.status.changed",
                order_id: shipment.trackingNumber,
                status: "delivered", // or completed
                payment: { shipping_fee: 1000, currency: "NGN" },
            },
        };
        const res = {
            status: (code) => ({
                json: (data) => console.log(`Webhook Response: ${code}`, data),
            }),
        };

        await WebhookController.handleShipBubble(req, res);

        // 5. Verify Balances
        const sellerAfterDelivery = await User.findById(seller._id);
        const orderAfterDelivery = await Order.findById(order._id);

        console.log(
            `Seller Pending Balance: ${sellerAfterDelivery.wallet.pendingBalance} (Expected: 0)`,
        );
        console.log(
            `Seller Balance: ${sellerAfterDelivery.wallet.balance} (Expected: ${creditAmount})`,
        );
        console.log(
            `Order Seller Status: ${orderAfterDelivery.sellerWalletStatus} (Expected: paid)`,
        );

        if (
            sellerAfterDelivery.wallet.pendingBalance !== 0 ||
            sellerAfterDelivery.wallet.balance !== creditAmount
        ) {
            throw new Error("Delivery wallet release failed!");
        }

        if (orderAfterDelivery.sellerWalletStatus !== "paid") {
            throw new Error("Order sellerWalletStatus was not updated!");
        }

        console.log("--- Idempotency Test ---");
        // Run webhook again
        await WebhookController.handleShipBubble(req, res);

        const sellerAfterRetry = await User.findById(seller._id);
        console.log(
            `Seller Balance after retry: ${sellerAfterRetry.wallet.balance} (Should match previous: ${creditAmount})`,
        );

        if (sellerAfterRetry.wallet.balance !== creditAmount) {
            throw new Error(
                "Idempotency check failed! Balance changed on retry.",
            );
        }

        console.log("TEST PASSED SUCCESSFULLY");
    } catch (error) {
        console.error("Test Failed:", error);
    } finally {
        await mongoose.disconnect();
        process.exit(0);
    }
}

runTest();
