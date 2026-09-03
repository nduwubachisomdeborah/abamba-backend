import Shipment from "../models/shipment.model.js";
import Order from "../models/order.model.js";
import { AppError } from "../middlewares/error.js";
import PaginationUtil from "../utils/pagination.util.js";
import mongoose from "mongoose";
import LogisticsCompany from "../models/logisticsCompany.model.js";
import ShippingOptions from "../models/shippingOptions.model.js";
import shipbubbleService from "./shiping/shipbubble.service.js";

class ShipmentService {
    /**
     * Create a new shipment for one or more orders
     * @param {Object} shipmentData - Shipment data
     * @param {string} userId - User ID making the request
     * @param {string} userRole - User role
     * @returns {Promise<Object>} New shipment
     */
    async createShipment(shipmentData, userId, userRole) {
        // Only admin can create shipments
        if (userRole !== "admin") {
            throw new AppError("Not authorized to create shipments", 403);
        }

        const {
            orderIds,
            carrier,
            trackingNumber,
            shippingMethod,
            estimatedDelivery,
        } = shipmentData;

        if (!orderIds || !Array.isArray(orderIds) || orderIds.length === 0) {
            throw new AppError("At least one order ID is required", 400);
        }

        // Validate all orders exist and are in a valid state for shipping
        const orders = await Promise.all(
            orderIds.map(async (orderId) => {
                let order;

                // Check if orderId is a number (sequential ID) or ObjectId
                if (!isNaN(orderId)) {
                    order = await Order.findOne({ orderId: Number(orderId) });
                } else {
                    if (!mongoose.Types.ObjectId.isValid(orderId)) {
                        throw new AppError(`Invalid order ID: ${orderId}`, 400);
                    }
                    order = await Order.findById(orderId);
                }

                if (!order) {
                    throw new AppError(`Order not found: ${orderId}`, 404);
                }

                if (order.status !== "processing") {
                    throw new AppError(
                        `Order ${order.orderId} must be in 'processing' status to be shipped`,
                        400,
                    );
                }

                if (order.shipment) {
                    throw new AppError(
                        `Order ${order.orderId} already has a shipment assigned`,
                        400,
                    );
                }

                return order;
            }),
        );

        // Create shipment
        const shipment = new Shipment({
            orders: orders.map((order) => order._id),
            carrier,
            trackingNumber,
            trackingUrl: shipmentData.trackingUrl,
            status: "pending",
            shippingMethod,
            estimatedDelivery: estimatedDelivery
                ? new Date(estimatedDelivery)
                : undefined,
            shippingCost: shipmentData.shippingCost,
            packageWeight: shipmentData.packageWeight,
            packageDimensions: shipmentData.packageDimensions,
            notes: shipmentData.notes,
            trackingHistory: [
                {
                    status: "information_received",
                    description: "Shipping information received",
                    timestamp: new Date(),
                },
            ],
        });

        const savedShipment = await shipment.save();

        // Update all orders with the shipment reference and change status to shipped
        await Promise.all(
            orders.map(async (order) => {
                order.shipment = savedShipment._id;
                order.status = "shipped";
                await order.save();
            }),
        );

        return savedShipment;
    }

    /**
     * Get shipment by ID
     * @param {string} shipmentId - Shipment ID
     * @param {string} userId - User ID making the request
     * @param {string} userRole - User role
     * @returns {Promise<Object>} Shipment object
     */
    async getShipmentById(shipmentId, userId, userRole) {
        if (!mongoose.Types.ObjectId.isValid(shipmentId)) {
            throw new AppError("Invalid shipment ID", 400);
        }

        const shipment = await Shipment.findById(shipmentId).populate({
            path: "orders",
            select: "orderId user status shippingAddress items",
        });

        if (!shipment) {
            throw new AppError("Shipment not found", 404);
        }

        // Check authorization based on user role
        if (userRole === "admin") {
            // Admin can see any shipment
            return shipment;
        } else if (userRole === "seller") {
            // Get all order IDs in this shipment
            const orderIds = shipment.orders.map((order) => order._id);

            // Get all products from these orders
            const orders = await Order.find({ _id: { $in: orderIds } }).select(
                "items.product",
            );

            // Extract product IDs from all orders
            const productIds = [];
            orders.forEach((order) => {
                order.items.forEach((item) => {
                    productIds.push(item.product.toString());
                });
            });

            // Check if any products belong to this seller
            const sellerProducts = await mongoose.model("Product").find({
                _id: { $in: productIds },
                user: userId,
            });

            if (sellerProducts.length === 0) {
                throw new AppError("Not authorized to view this shipment", 403);
            }
        } else {
            // Regular users can only see shipments for their orders
            const ordersWithDetails = await Order.find({
                _id: { $in: shipment.orders },
                user: userId,
            });

            if (ordersWithDetails.length === 0) {
                throw new AppError("Not authorized to view this shipment", 403);
            }
        }

        return shipment;
    }

    /**
     * Get shipment by tracking number
     * @param {string} trackingNumber - Tracking number
     * @returns {Promise<Object>} Shipment object
     */
    async getShipmentByTracking(trackingNumber) {
        const shipment = await Shipment.findOne({ trackingNumber }).populate({
            path: "orders",
            select: "orderId status shippingAddress",
        });

        if (!shipment) {
            throw new AppError("Shipment not found", 404);
        }

        return shipment;
    }

    /**
     * Get all shipments with pagination and filtering
     * @param {Object} query - Query parameters
     * @param {string} userId - User ID making the request
     * @param {string} userRole - User role
     * @returns {Promise<Object>} Shipments and pagination data
     */
    async getShipments(query = {}, userId, userRole) {
        // Extract pagination parameters
        const { page, limit, skip } =
            PaginationUtil.getPaginationOptions(query);

        // Build filter based on user role
        const filter = { deleted: false };

        if (userRole === "admin") {
            // Admins can see all shipments
            // No additional filters needed
        } else if (userRole === "seller") {
            // For sellers, find shipments containing their products
            // Step 1: Find all products by this seller
            const sellerProducts = await mongoose
                .model("Product")
                .find({ user: userId }, { _id: 1 });
            // Use ObjectId values directly to match the Order.items.product ObjectId type
            const sellerProductIds = sellerProducts.map(
                (product) => product._id,
            );

            if (sellerProductIds.length === 0) {
                // If seller has no products, return empty result
                return {
                    shipments: [],
                    pagination: PaginationUtil.getPaginationData(
                        0,
                        page,
                        limit,
                    ),
                };
            }

            // Step 2: Find all orders containing seller's products
            const ordersWithSellerProducts = await Order.find(
                {
                    "items.product": { $in: sellerProductIds },
                },
                { _id: 1 },
            );

            const orderIds = ordersWithSellerProducts.map((order) => order._id);

            if (orderIds.length === 0) {
                // If no orders with seller's products, return empty result
                return {
                    shipments: [],
                    pagination: PaginationUtil.getPaginationData(
                        0,
                        page,
                        limit,
                    ),
                };
            }

            // Step 3: Filter shipments containing these orders
            filter.orders = { $in: orderIds };
        } else {
            // Regular users can only see shipments for their orders
            const userOrders = await Order.find({ user: userId }, { _id: 1 });
            const userOrderIds = userOrders.map((order) => order._id);

            // Filter shipments that contain user's orders
            filter.orders = { $in: userOrderIds };
        }

        // Add carrier filter if provided
        if (query.carrier) {
            filter.carrier = query.carrier;
        }

        // Add status filter if provided
        if (query.status) {
            filter.status = query.status;
        }

        // Add date range filter if provided
        if (query.startDate || query.endDate) {
            filter.createdAt = {};
            if (query.startDate) {
                filter.createdAt.$gte = new Date(query.startDate);
            }
            if (query.endDate) {
                filter.createdAt.$lte = new Date(query.endDate);
            }
        }

        // Build sort object
        let sort = {};
        if (query.sort) {
            const sortFields = query.sort.split(",");
            sortFields.forEach((field) => {
                if (field.startsWith("-")) {
                    sort[field.substring(1)] = -1;
                } else {
                    sort[field] = 1;
                }
            });
        } else {
            // Default sort by createdAt in descending order
            sort = { createdAt: -1 };
        }

        // Count total matching documents
        const total = await Shipment.countDocuments(filter);

        // Get shipments with pagination, filtering, and sorting
        const shipments = await Shipment.find(filter)
            .sort(sort)
            .skip(skip)
            .limit(limit)
            .populate({
                path: "orders",
                select: "orderId user status",
            });

        // Generate pagination metadata
        const pagination = PaginationUtil.getPaginationData(total, page, limit);

        return { shipments, pagination };
    }

    /**
     * Add tracking update to shipment
     * @param {string} shipmentId - Shipment ID
     * @param {Object} updateData - Tracking update data
     * @param {string} userId - User ID making the request
     * @param {string} userRole - User role
     * @returns {Promise<Object>} Updated shipment
     */
    async addTrackingUpdate(shipmentId, updateData, userId, userRole) {
        // Only admin can add tracking updates
        if (userRole !== "admin") {
            throw new AppError(
                "Not authorized to update shipment tracking",
                403,
            );
        }

        const shipment = await this.getShipmentById(
            shipmentId,
            userId,
            userRole,
        );

        const { status, location, description } = updateData;

        // Add new tracking update
        shipment.trackingHistory.push({
            status,
            location,
            description,
            timestamp: new Date(),
        });

        // Save shipment (status is updated automatically by pre-save hook)
        const updatedShipment = await shipment.save();

        // If shipment status changed to delivered, update order statuses
        if (updatedShipment.status === "delivered") {
            await Order.updateMany(
                { _id: { $in: updatedShipment.orders } },
                { $set: { status: "delivered" } },
            );
        }

        return updatedShipment;
    }

    /**
     * Update shipment details
     * @param {string} shipmentId - Shipment ID
     * @param {Object} updateData - Data to update
     * @param {string} userId - User ID making the request
     * @param {string} userRole - User role
     * @returns {Promise<Object>} Updated shipment
     */
    async updateShipment(shipmentId, updateData, userId, userRole) {
        // Only admin can update shipments
        if (userRole !== "admin") {
            throw new AppError(
                "Not authorized to update shipment details",
                403,
            );
        }

        const shipment = await this.getShipmentById(
            shipmentId,
            userId,
            userRole,
        );

        // Update allowable fields
        const allowedFields = [
            "carrier",
            "trackingNumber",
            "trackingUrl",
            "estimatedDelivery",
            "shippingMethod",
            "shippingCost",
            "packageWeight",
            "packageDimensions",
            "notes",
        ];

        allowedFields.forEach((field) => {
            if (updateData[field] !== undefined) {
                shipment[field] = updateData[field];
            }
        });

        return await shipment.save();
    }

    /**
     * Delete a shipment (soft delete)
     * @param {string} shipmentId - Shipment ID
     * @param {string} userId - User ID making the request
     * @param {string} userRole - User role
     * @returns {Promise<Object>} Deleted shipment
     */
    async deleteShipment(shipmentId, userId, userRole) {
        // Only admin can delete shipments
        if (userRole !== "admin") {
            throw new AppError("Not authorized to delete shipments", 403);
        }

        const shipment = await this.getShipmentById(
            shipmentId,
            userId,
            userRole,
        );

        // Remove shipment reference from orders
        await Order.updateMany(
            { _id: { $in: shipment.orders } },
            { $set: { shipment: null } },
        );

        // Soft delete
        shipment.deleted = true;
        shipment.deletedAt = Date.now();

        return await shipment.save();
    }

    async getCarriers(
        userId,
        shippingAddressId,
        productId,
        variantId,
        quantity,
    ) {
        // Query active Regional Logistics Companies directly (Richmond, Apex, Hens, Prince Swift, OK Saturday)
        const companies = await LogisticsCompany.find({ active: true });
        const defaultDeliveryFee = 3000;
        const request_token =
            "REQ-" +
            Math.random().toString(36).substring(2, 10).toUpperCase() +
            "-" +
            Date.now();

        const couriersList =
            companies.length > 0
                ? companies.map((comp) => ({
                      courier_id: comp.code || comp._id.toString(),
                      courier_name: `${comp.name} (${comp.state} Hub)`,
                      courier_image: null,
                      service_code: comp.code || "regional",
                      total: comp.defaultBasePrice || defaultDeliveryFee,
                      delivery_eta:
                          comp.state === "Imo"
                              ? "Same Day / Next Day"
                              : "1-2 Business Days",
                  }))
                : [
                      {
                          courier_id: "richmond",
                          courier_name: "Richmond Logistics (Imo Hub)",
                          courier_image: null,
                          service_code: "richmond",
                          total: 3000,
                          delivery_eta: "Same Day / Next Day",
                      },
                      {
                          courier_id: "apex",
                          courier_name: "Apex Delivery (Abia Hub)",
                          courier_image: null,
                          service_code: "apex",
                          total: 3000,
                          delivery_eta: "1-2 Business Days",
                      },
                      {
                          courier_id: "hens",
                          courier_name: "Hens Express (Imo Hub)",
                          courier_image: null,
                          service_code: "hens",
                          total: 3000,
                          delivery_eta: "Same Day / Next Day",
                      },
                      {
                          courier_id: "princeswift",
                          courier_name: "Prince Swift Logistics (Imo Hub)",
                          courier_image: null,
                          service_code: "princeswift",
                          total: 3000,
                          delivery_eta: "Same Day / Next Day",
                      },
                      {
                          courier_id: "oksaturday",
                          courier_name: "OK Saturday Express (Abia Hub)",
                          courier_image: null,
                          service_code: "oksaturday",
                          total: 3000,
                          delivery_eta: "1-2 Business Days",
                      },
                  ];

        const responseData = {
            request_token,
            fastest_courier: couriersList[0],
            cheapest_courier: couriersList[0],
            couriers: couriersList,
        };

        // Cache in ShippingOptions so cart can lookup if needed
        try {
            await ShippingOptions.create({
                user: userId || null,
                request_token,
                service_code: responseData.fastest_courier.service_code,
                courier_id: responseData.fastest_courier.courier_id,
                courier_name: responseData.fastest_courier.courier_name,
                data: responseData,
                product: productId,
                variant: variantId,
                quantity: quantity || 1,
            });
        } catch (err) {
            // Ignore duplicate error
        }

        return responseData;
    }

    async handleWebhookShipment(data) {
        try {
            console.log(data);
        } catch (error) {
            console.log(error);
            throw new Error(error?.response?.data?.message || error?.message);
        }
    }
}

export default new ShipmentService();
