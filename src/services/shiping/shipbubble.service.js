import axios from "axios";
import ShippingAddress from "../../models/shippingAddress.model.js";
import cartService from "../cart.service.js";
import moment from "moment";
import productService from "../product.service.js";
import ShippingOptions from "../../models/shippingOptions.model.js";
import User from "../../models/user.model.js";
import CourierService from "../../models/courierService.model.js";
import Order from "../../models/order.model.js";

class ShipBubbleService {
    constructor() {
        this.apiKey = process.env.SHIPBUBBLE_API_KEY;
        this.api = axios.create({
            baseURL: process.env.SHIPBUBBLE_API_URL,
            headers: {
                Authorization: `Bearer ${this.apiKey}`,
                "Content-Type": "application/json",
            },
        });
    }

    async getCouriers() {
        try {
            const response = await this.api.get("/shipping/couriers");
            return response.data.data;
        } catch (error) {
            throw new Error(error.response.data.message);
        }
    }

    getNextFriday() {
        const today = moment();
        let nextFriday = moment().day(5);

        // If today is Friday (5) or later in the week, move to next week's Friday
        if (today.day() >= 5) {
            nextFriday.add(1, "weeks");
        }

        // If next Friday is within 2 days, defer to the following week
        if (nextFriday.diff(today, "days") <= 2) {
            nextFriday.add(1, "weeks");
        }

        // If the computed next Friday is more than 7 days away, choose the 7th day from today
        const diffDays = nextFriday
            .clone()
            .startOf("day")
            .diff(today.clone().startOf("day"), "days");
        if (diffDays > 7) {
            return today.clone().add(7, "days").format("YYYY-MM-DD");
        }

        return nextFriday.format("YYYY-MM-DD");
    }

    async verifyAddress({
        longitude,
        latitude,
        address,
        firstName,
        lastName,
        email,
        phoneNumber,
    }) {
        const name =
            firstName && lastName
                ? `${firstName} ${lastName}`
                : "Mr. Okey Igbonagwam";
        const phone = phoneNumber || process.env.COMPANY_PHONE;
        const mail = email || process.env.COMPANY_EMAIL;

        const response = await this.api.post("/shipping/address/validate", {
            name,
            email: mail,
            phone,
            address,
            longitude,
            latitude,
        });
        return response.data.data;
    }

    async updateAddressDetails(addressCode, data) {
        try {
            const { name, email, phone } = data;
            const response = await this.api.patch(
                `/shipping/address/${addressCode}`,
                {
                    name,
                    email,
                    phone,
                },
            );
            return response.data.data;
        } catch (error) {
            throw new Error(error.response?.data?.message || error.message);
        }
    }

    async validateAddress(data) {
        try {
            const {
                addressId,
                name,
                email,
                phone,
                address,
                longitude,
                latitude,
            } = data;

            let shippingAddress = await ShippingAddress.findOne({
                user: data.userId,
                addressId,
            });

            if (shippingAddress) {
                const isAddressSame =
                    shippingAddress.longitude === longitude &&
                    shippingAddress.latitude === latitude &&
                    shippingAddress.address === address;

                if (isAddressSame) {
                    const isContactSame =
                        shippingAddress.name === name &&
                        shippingAddress.email === email &&
                        shippingAddress.phone === phone;

                    if (isContactSame) {
                        return shippingAddress.validated;
                    }

                    // Only contact details changed, update via PATCH
                    const addressCode = shippingAddress.validated?.address_code;
                    if (addressCode) {
                        const validatedAddress =
                            await this.updateAddressDetails(addressCode, {
                                name,
                                email,
                                phone,
                            });

                        shippingAddress.name = name;
                        shippingAddress.email = email;
                        shippingAddress.phone = phone;
                        shippingAddress.validated = validatedAddress;
                        shippingAddress.validatedAt = Date.now();
                        await shippingAddress.save();

                        return shippingAddress;
                    }
                }
            }

            const response = await this.api.post("/shipping/address/validate", {
                name,
                email,
                phone,
                address,
                longitude,
                latitude,
            });

            const validatedAddress = response.data.data;

            if (shippingAddress) {
                shippingAddress.name = name;
                shippingAddress.email = email;
                shippingAddress.phone = phone;
                shippingAddress.address = address;
                shippingAddress.longitude = longitude;
                shippingAddress.latitude = latitude;
                shippingAddress.validated = validatedAddress;
                shippingAddress.validatedAt = Date.now();
                await shippingAddress.save();
            } else {
                shippingAddress = new ShippingAddress({
                    user: data.userId,
                    addressId,
                    name,
                    email,
                    phone,
                    address,
                    longitude,
                    latitude,
                    validated: validatedAddress,
                });
                await shippingAddress.save();
            }

            return shippingAddress;
        } catch (error) {
            throw new Error(error.response?.data?.message || error.message);
        }
    }

    async getBoxPackageForCartItems(userId) {
        try {
            const response = await this.api.get("/shipping/labels/boxes");
            const box = response.data.data;

            const cartWeight = await cartService.getCartTotalWeight(userId);

            const boxPackage = box.find((b) => b.max_weight >= cartWeight);

            return boxPackage;
        } catch (error) {
            throw new Error(error.response.data.message);
        }
    }

    async getBoxPackageForItems(items) {
        try {
            const response = await this.api.get("/shipping/labels/boxes");
            const box = response.data.data;

            const itemsWeight = items.reduce((total, item) => {
                return total + item.unit_weight * item.quantity;
            }, 0);

            const boxPackage = box.find((b) => b.max_weight >= itemsWeight);

            return boxPackage;
        } catch (error) {
            throw new Error(error.response.data.message);
        }
    }

    async getCarriers(
        userId,
        shippingAddressId,
        productId,
        variantId,
        quantity,
    ) {
        try {
            const userAddress = await ShippingAddress.findOne({
                user: userId,
                addressId: shippingAddressId,
            });

            if (!userAddress) {
                throw new Error(
                    "Address not found, please add a shipping address",
                );
            }

            const product = await productService.getProductOrVariantById(
                productId,
                variantId,
            );

            if (!product) {
                throw new Error("Product not found");
            }

            const seller = await User.findById(product.user)
                .select("+business")
                .populate("business.storeLocation");

            if (!seller) {
                throw new Error("Product seller not found");
            }

            const reciever_address_code = userAddress.validated.address_code;
            const sender_address_code =
                seller?.business?.storeLocation?.addressCode;

            const category_id = process.env.SHIPBUBBLE_CATEGORY_ID;
            const pickup_date = this.getNextFriday();
            const package_items = [
                {
                    name: product.name,
                    description: product.description,
                    unit_weight: product.weight,
                    unit_amount: product.basePrice,
                    quantity: quantity,
                },
            ];

            const box = await this.getBoxPackageForItems(package_items);
            const package_dimension = {
                length: box.length,
                width: box.width,
                height: box.height,
            };

            const couriers = (await CourierService.find({ enabled: true }))
                .map((courier) => {
                    return courier.service_code;
                })
                .join(",");

            const response = await this.api.post(
                `/shipping/fetch_rates/${couriers}`,
                {
                    reciever_address_code,
                    sender_address_code,
                    category_id,
                    pickup_date,
                    package_items,
                    package_dimension,
                },
            );

            await ShippingOptions.create({
                user: userId,
                request_token: response.data.data.request_token,
                service_code: response.data.data.fastest_courier.service_code,
                courier_id: response.data.data.fastest_courier.courier_id,
                courier_name: response.data.data.fastest_courier.courier_name,
                data: response.data.data,
                product: productId,
                variant: variantId,
                quantity,
            });

            return response.data.data;
        } catch (error) {
            console.log(error?.response);
            throw new Error(error);
        }
    }

    async getOrderCarriers(orderId) {
        try {
            const order = await Order.findById(orderId);

            if (!order) {
                throw new Error("Order not found");
            }

            // Check if shipping options already exist and are fresh (less than 3 days old)
            const threeDaysAgo = new Date();
            threeDaysAgo.setDate(threeDaysAgo.getDate() - 3);

            const existingOption = await ShippingOptions.findOne({
                order: orderId,
                createdAt: { $gte: threeDaysAgo },
            }).sort({ createdAt: -1 });

            if (existingOption) {
                return existingOption.data;
            }

            const userAddress = await ShippingAddress.findOne({
                user: order.user,
                addressId: order.addressId,
            });

            if (!userAddress) {
                throw new Error(
                    "Address not found, please add a shipping address",
                );
            }

            const seller = await User.findById(order.seller)
                .select("+business")
                .populate("business.storeLocation");

            if (!seller) {
                throw new Error("Product seller not found");
            }
            const reciever_address_code = userAddress.validated.address_code;
            const sender_address_code =
                seller?.business?.storeLocation?.addressCode;

            const category_id = process.env.SHIPBUBBLE_CATEGORY_ID;
            const pickup_date = this.getNextFriday();

            const package_items = await Promise.all(
                order.items.map(async (item) => {
                    const product =
                        await productService.getProductOrVariantById(
                            item.product,
                            item.variant,
                        );

                    return {
                        name: product.name,
                        description: product.description,
                        unit_weight: product.weight,
                        unit_amount: product.basePrice,
                        quantity: item.quantity,
                    };
                }),
            );

            const box = await this.getBoxPackageForItems(package_items);
            const package_dimension = {
                length: box.length,
                width: box.width,
                height: box.height,
            };

            const couriers = (await CourierService.find({ enabled: true }))
                .map((courier) => {
                    return courier.service_code;
                })
                .join(",");

            const response = await this.api.post(
                `/shipping/fetch_rates/${couriers}`,
                {
                    reciever_address_code,
                    sender_address_code,
                    category_id,
                    pickup_date,
                    package_items,
                    package_dimension,
                },
            );

            await ShippingOptions.create({
                user: order.user,
                request_token: response.data.data.request_token,
                service_code: response.data.data.fastest_courier.service_code,
                courier_id: response.data.data.fastest_courier.courier_id,
                courier_name: response.data.data.fastest_courier.courier_name,
                data: response.data.data,
                order: order._id,
                quantity: 1, // Total package quantity is 1
            });

            return response.data.data;
        } catch (error) {
            console.log(error?.response);
            throw new Error(error);
        }
    }

    async createShipment(data) {
        try {
            const response = await this.api.post("/shipping/labels", data);
            return response.data.data;
        } catch (error) {
            throw new Error(
                error.response?.data?.message || "Failed to create shipment",
            );
        }
    }
}

export default new ShipBubbleService();
