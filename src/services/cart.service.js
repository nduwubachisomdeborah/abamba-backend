import Cart from "../models/cart.model.js";
import Product from "../models/product.model.js";
import { AppError } from "../middlewares/error.js";
import mongoose from "mongoose";
import ShippingOptions from "../models/shippingOptions.model.js";
import LogisticsCompany from "../models/logisticsCompany.model.js";
import shipbubbleService from "./shiping/shipbubble.service.js";
import addressService from "./address.service.js";
import PlatformSettings from "../models/platformSettings.model.js";

class CartService {
    /**
     * Get user's cart or create if it doesn't exist
     * @param {string} userId - User ID
     * @returns {Promise<Object>} Cart object
     */
    async getCart(userId) {
        let cart = await Cart.findOne({ user: userId });

        if (!cart) {
            // Create a new cart if none exists
            cart = await this.createCart(userId);
        }

        return await this.populateCart(cart);
    }

    async getCartTotalWeight(userId) {
        const cart = await Cart.findOne({ user: userId });
        if (!cart) {
            return 0;
        }

        // Preload all products referenced in the cart to avoid N+1 queries
        const productIds = cart.items.map((i) => i.product).filter(Boolean);
        if (productIds.length === 0) return 0;

        const products = await Product.find({
            _id: { $in: productIds },
        }).select("_id weight variants");

        const productMap = new Map(products.map((p) => [p._id.toString(), p]));

        let totalWeight = 0;
        for (const item of cart.items) {
            const product = productMap.get(item.product?.toString());
            if (!product) continue;

            // Default to base product weight
            let unitWeight = Number(product.weight) || 0;

            // If a variant is selected, use the variant's weight when available
            if (item.variant) {
                const variantDoc = product.variants?.id?.(item.variant);
                if (variantDoc && typeof variantDoc.weight === "number") {
                    unitWeight = variantDoc.weight;
                }
            }

            const qty = Number(item.quantity) || 0;
            totalWeight += unitWeight * qty;
        }

        return totalWeight;
    }

    /**
     * Create a new cart for a user
     * @param {string} userId - User ID
     * @returns {Promise<Object>} New cart object
     */
    async createCart(userId) {
        const cart = new Cart({
            user: userId,
            items: [],
            totalItems: 0,
            totalPrice: 0,
        });

        return await cart.save();
    }

    /**
     * Add an item to the cart
     * @param {string} userId - User ID
     * @param {Object} cartItemData - Cart item data
     * @returns {Promise<Object>} Updated cart
     */
    async addItem(userId, cartItemData) {
        const { productId, variantId, quantity, carrierId, request_token } =
            cartItemData;

        // Validate product exists and is not deleted
        const product = await Product.findOne({
            _id: productId,
            deleted: false,
        });

        if (!product) {
            throw new AppError("Product not found", 404);
        }

        // Find the variant if provided
        let variant = null;
        let price = product.basePrice;

        if (variantId) {
            variant = product.variants.id(variantId);
            if (!variant) {
                throw new AppError("Variant not found", 404);
            }
            price = variant.price;

            // Check variant stock
            if (variant.quantity < quantity) {
                throw new AppError(
                    `Only ${variant.quantity} items available in stock`,
                    400
                );
            }
        } else {
            // Check product stock
            if (product.quantity < quantity) {
                throw new AppError(
                    `Only ${product.quantity} items available in stock`,
                    400
                );
            }
        }

        // Get or create cart
        let cart = await Cart.findOne({ user: userId });

        if (!cart) {
            cart = await this.createCart(userId);
        }

        let shipping = null;

        // 1. If frontend passed a structured shipping object in itemData.shipping
        if (itemData.shipping && typeof itemData.shipping === "object") {
            const shipObj = itemData.shipping;
            const carrierCode =
                shipObj.carrierId ||
                shipObj.courier_id ||
                shipObj.code ||
                carrierId ||
                "richmond";
            const carrierName =
                shipObj.carrierName ||
                shipObj.courier_name ||
                shipObj.name ||
                "RichmondLogistics (Standard Delivery)";
            const fee =
                Number(
                    shipObj.amount ||
                        shipObj.price ||
                        shipObj.total ||
                        shipObj.fee ||
                        itemData.shippingFee ||
                        3000,
                ) || 3000;

            shipping = {
                amount: fee,
                price: fee,
                total: fee,
                fee: fee,
                service_code: shipObj.service_code || carrierCode || "regional",
                carrierId: carrierCode,
                courier_id: carrierCode,
                carrierName: carrierName,
                courier_name: carrierName,
                name: carrierName,
                carrierLogo: shipObj.carrierLogo || null,
                request_token:
                    shipObj.request_token || request_token || "REQ-REGIONAL",
            };
        } else if (
            typeof itemData.shipping === "number" ||
            typeof itemData.shippingFee === "number"
        ) {
            // Raw numeric shipping
            const fee =
                Number(itemData.shipping || itemData.shippingFee || 3000) || 3000;
            const carrierCode = carrierId || "richmond";
            shipping = {
                amount: fee,
                price: fee,
                total: fee,
                fee: fee,
                service_code: carrierCode,
                carrierId: carrierCode,
                courier_id: carrierCode,
                carrierName: "RichmondLogistics (Standard Delivery)",
                courier_name: "RichmondLogistics (Standard Delivery)",
                name: "RichmondLogistics",
                carrierLogo: null,
                request_token: request_token || "REQ-REGIONAL",
            };
        } else if (carrierId) {
            // First check cached ShippingOptions
            let shippingOption = null;
            if (request_token) {
                shippingOption = await ShippingOptions.findOne({
                    request_token: request_token,
                });
            }

            if (shippingOption && shippingOption.data?.couriers) {
                const selectedCarrier = shippingOption.data.couriers.find(
                    (carrier) => carrier.courier_id === carrierId,
                );

                if (selectedCarrier) {
                    shipping = {
                        amount: selectedCarrier.total || 3000,
                        price: selectedCarrier.total || 3000,
                        total: selectedCarrier.total || 3000,
                        fee: selectedCarrier.total || 3000,
                        service_code: selectedCarrier.service_code,
                        carrierId: selectedCarrier.courier_id,
                        courier_id: selectedCarrier.courier_id,
                        carrierName: selectedCarrier.courier_name,
                        courier_name: selectedCarrier.courier_name,
                        name: selectedCarrier.courier_name,
                        carrierLogo: selectedCarrier.courier_image,
                        request_token: request_token || "REQ-REGIONAL",
                    };
                }
            }

            // If not found in ShippingOptions, fallback directly to Regional LogisticsCompany
            if (!shipping) {
                const company = await LogisticsCompany.findOne({
                    $or: [
                        { code: carrierId },
                        {
                            _id: mongoose.Types.ObjectId.isValid(carrierId)
                                ? carrierId
                                : null,
                        },
                    ],
                });

                if (company) {
                    shipping = {
                        amount: company.defaultBasePrice || 3000,
                        price: company.defaultBasePrice || 3000,
                        total: company.defaultBasePrice || 3000,
                        fee: company.defaultBasePrice || 3000,
                        service_code: company.code || "regional",
                        carrierId: company.code || company._id.toString(),
                        courier_id: company.code || company._id.toString(),
                        carrierName: `${company.name} (Standard Delivery)`,
                        courier_name: `${company.name} (Standard Delivery)`,
                        name: company.name,
                        carrierLogo: null,
                        request_token: request_token || "REQ-REGIONAL",
                    };
                }
            }
        }

        if (!shipping) {
            shipping = {
                amount: 3000,
                price: 3000,
                total: 3000,
                fee: 3000,
                service_code: "richmond",
                carrierId: "richmond",
                courier_id: "richmond",
                carrierName: "RichmondLogistics (Standard Delivery)",
                courier_name: "RichmondLogistics (Standard Delivery)",
                name: "RichmondLogistics",
                carrierLogo: null,
                request_token: request_token || "REQ-REGIONAL",
            };
        }

        // Check if item already exists in cart
        const existingItemIndex = cart.items.findIndex((item) => {
            if (variantId) {
                return (
                    item.product.toString() === productId &&
                    item.variant &&
                    item.variant.toString() === variantId
                );
            } else {
                return item.product.toString() === productId && !item.variant;
            }
        });

        if (existingItemIndex > -1) {
            // Update existing item quantity
            cart.items[existingItemIndex].quantity += quantity;
            if (shipping) {
                cart.items[existingItemIndex].shipping = shipping;
            }
        } else {
            const newItem = {
                product: productId,
                variant: variantId || null,
                quantity,
                price,
                shipping,
            };

            // Add new item to cart
            cart.items.push(newItem);
        }

        // Save cart and populate
        await cart.save();
        return await this.populateCart(cart);
    }

    /**
     * Update cart item quantity
     * @param {string} userId - User ID
     * @param {string} itemId - Cart item ID
     * @param {number} quantity - New quantity
     * @returns {Promise<Object>} Updated cart
     */
    async updateItemQuantity(userId, itemId, quantity) {
        if (!itemId) {
            throw new AppError("Invalid item ID", 400);
        }

        const cart = await Cart.findOne({ user: userId });

        if (!cart) {
            throw new AppError("Cart not found", 404);
        }

        // Find the item in the cart by item._id, product ID, or variant ID
        let item = null;
        if (mongoose.Types.ObjectId.isValid(itemId)) {
            item = cart.items.id(itemId);
        }
        if (!item) {
            const targetIdStr = itemId.toString();
            item = cart.items.find((it) => {
                const subDocId = it._id ? it._id.toString() : null;
                const prodId = it.product
                    ? it.product._id
                        ? it.product._id.toString()
                        : it.product.toString()
                    : null;
                const variantId = it.variant ? it.variant.toString() : null;
                return (
                    subDocId === targetIdStr ||
                    prodId === targetIdStr ||
                    variantId === targetIdStr
                );
            });
        }

        if (!item) {
            throw new AppError("Item not found in cart", 404);
        }

        // If quantity is 0 or negative, remove the item
        if (quantity <= 0) {
            cart.items.pull(item._id);
            await cart.save();
            return await this.populateCart(cart);
        }

        // Check product stock
        const product = await Product.findById(item.product);

        if (!product) {
            throw new AppError("Product not found", 404);
        }

        if (item.variant) {
            const variant = product.variants.id(item.variant);
            if (!variant) {
                throw new AppError("Variant not found", 404);
            }

            if (variant.quantity < quantity) {
                throw new AppError(
                    `Only ${variant.quantity} items available in stock`,
                    400
                );
            }
        } else {
            if (product.quantity < quantity) {
                throw new AppError(
                    `Only ${product.quantity} items available in stock`,
                    400
                );
            }
        }

        // Update the quantity
        item.quantity = quantity;

        // Maintain shipping rate safely without throwing
        if (!item.shipping || !item.shipping.amount) {
            item.shipping = {
                amount: 3000,
                price: 3000,
                total: 3000,
                fee: 3000,
                service_code: "richmond",
                carrierId: "richmond",
                courier_id: "richmond",
                carrierName: "RichmondLogistics (Standard Delivery)",
                courier_name: "RichmondLogistics (Standard Delivery)",
                name: "RichmondLogistics",
                request_token: "REQ-REGIONAL",
            };
        }

        // Save cart and populate
        await cart.save();
        return await this.populateCart(cart);
    }

    /**
     * Remove an item from the cart
     * @param {string} userId - User ID
     * @param {string} itemId - Cart item ID or Product ID
     * @returns {Promise<Object>} Updated cart
     */
    async removeItem(userId, itemId) {
        if (!itemId) {
            throw new AppError("Item ID is required", 400);
        }

        const cart = await Cart.findOne({ user: userId });
        if (!cart) {
            return {
                items: [],
                totalItems: 0,
                totalPrice: 0,
                subtotal: 0,
                shipping: 0,
                shippingFee: 0,
                shippingCost: 0,
                shippingTotal: 0,
                estimatedTotal: 0,
                total: 0,
                count: 0,
            };
        }

        const targetIdStr = itemId.toString();

        // Match by cart item subdocument _id, product ID, or variant ID
        const itemIndex = cart.items.findIndex((item) => {
            const subDocId = item._id ? item._id.toString() : null;
            const prodId = item.product
                ? item.product._id
                    ? item.product._id.toString()
                    : item.product.toString()
                : null;
            const variantId = item.variant ? item.variant.toString() : null;

            return (
                subDocId === targetIdStr ||
                prodId === targetIdStr ||
                variantId === targetIdStr
            );
        });

        if (itemIndex > -1) {
            cart.items.splice(itemIndex, 1);
            await cart.save();
        }

        return await this.populateCart(cart);
    }

    /**
     * Clear all items from the cart
     * @param {string} userId - User ID
     * @returns {Promise<Object>} Empty cart
     */
    async clearCart(userId) {
        let cart = await Cart.findOne({ user: userId });
        if (!cart) {
            cart = await this.createCart(userId);
        }

        cart.items = [];
        cart.totalItems = 0;
        cart.totalPrice = 0;
        await cart.save();

        return {
            _id: cart._id,
            user: userId,
            items: [],
            totalItems: 0,
            totalPrice: 0,
            subtotal: 0,
            shippingCost: 0,
            shippingFee: 0,
            shippingTotal: 0,
            shipping: 0,
            estimatedTotal: 0,
            total: 0,
            selectedCourier: null,
            courier: null,
            count: 0,
        };
    }

    /**
     * Populate cart with product details
     * @param {Object} cart - Cart document
     * @returns {Promise<Object>} Populated cart
     */
    /**
     * Populate cart with product details and variant information
     * @param {Object} cart - Cart document
     * @returns {Promise<Object>} Populated cart with enhanced variant information
     */
    async populateCart(cart) {
        // Fetch platform settings to check if global bonus week is active
        const platformSettings = await PlatformSettings.getInstance();
        const isBonusActive = Boolean(platformSettings?.isBonusEventActive);

        // First populate just the products
        const populatedCart = await Cart.findById(cart._id).populate({
            path: "items.product",
            select: "name images basePrice sku deleted variants variantAttributes promoPrice bonusPrice onSale saleStartDate saleEndDate",
        });

        // If cart doesn't exist or is empty, return early
        if (
            !populatedCart ||
            !populatedCart.items ||
            populatedCart.items.length === 0
        ) {
            return populatedCart.toObject();
        }

        // Calculate totals
        let totalItems = 0;
        let totalPrice = 0;

        // Process each item to include variant details if needed
        // Using Promise.all to handle async operations in map
        const enhancedItems = await Promise.all(
            populatedCart.items.map(async (item) => {
                const product = item.product;
                let itemObj = item.toObject ? item.toObject() : item;

                // If product is deleted or doesn't exist
                if (!product || product.deleted) {
                    itemObj.isAvailable = false;
                    itemObj.unavailableReason = "Product no longer available";
                    return itemObj;
                }

                // Set default price to product base price
                let regularPrice = product.basePrice;
                let finalPrice = product.basePrice;
                itemObj.isAvailable = true;

                // If there's a variant ID, fetch complete variant details directly from the product model
                if (item.variant && product) {
                    try {
                        // Fetch the complete product to ensure we have all variant details
                        const fullProduct = await Product.findById(product._id);

                        if (
                            fullProduct &&
                            fullProduct.variants &&
                            fullProduct.variants.length > 0
                        ) {
                            const variant = fullProduct.variants.id(
                                item.variant
                            );

                            if (variant) {
                                // Add variant details to the cart item
                                const variantObj = variant.toObject();
                                itemObj.variantDetails = variantObj;
                                regularPrice = variant.price;

                                // Extract variant attributes for easier access
                                if (variantObj.attributes) {
                                    itemObj.variantAttributes =
                                        variantObj.attributes;

                                    const attributeEntries = Object.entries(
                                        variantObj.attributes
                                    );
                                    if (attributeEntries.length > 0) {
                                        itemObj.variantDisplay =
                                            attributeEntries
                                                .map(
                                                    ([key, value]) =>
                                                        `${key}: ${value}`
                                                )
                                                .join(", ");
                                    }
                                }

                                // Check price priority: Bonus Price > Promo Price > Regular Price
                                const variantBonus =
                                    variant.bonusPrice !== undefined &&
                                    variant.bonusPrice !== null
                                        ? variant.bonusPrice
                                        : product.bonusPrice;

                                if (
                                    isBonusActive &&
                                    variantBonus !== undefined &&
                                    variantBonus !== null &&
                                    variantBonus > 0 &&
                                    variantBonus < variant.price
                                ) {
                                    finalPrice = variantBonus;
                                    itemObj.isBonusPrice = true;
                                    itemObj.regularPrice = variant.price;
                                } else if (
                                    fullProduct.onSale &&
                                    fullProduct.promoActive &&
                                    variant.promoPrice
                                ) {
                                    finalPrice = variant.promoPrice;
                                    itemObj.isOnSale = true;
                                    itemObj.regularPrice = variant.price;
                                } else {
                                    finalPrice = variant.price;
                                }

                                // Check if variant is in stock
                                if (variant.quantity < item.quantity) {
                                    itemObj.isAvailable = false;
                                    itemObj.unavailableReason =
                                        variant.quantity > 0
                                            ? `Only ${variant.quantity} in stock`
                                            : "Out of stock";
                                }
                            } else {
                                // Variant not found
                                itemObj.isAvailable = false;
                                itemObj.unavailableReason =
                                    "Variant no longer available";
                            }
                        }
                    } catch (error) {
                        console.error(
                            `Error fetching variant details: ${error.message}`
                        );
                        itemObj.isAvailable = false;
                        itemObj.unavailableReason =
                            "Error loading variant details";
                    }
                } else {
                    // No variant - check product bonus and promo pricing
                    if (
                        isBonusActive &&
                        product.bonusPrice !== undefined &&
                        product.bonusPrice !== null &&
                        product.bonusPrice > 0 &&
                        product.bonusPrice < product.basePrice
                    ) {
                        finalPrice = product.bonusPrice;
                        itemObj.isBonusPrice = true;
                        itemObj.regularPrice = product.basePrice;
                    } else if (
                        product.onSale &&
                        product.promoActive &&
                        product.promoPrice
                    ) {
                        finalPrice = product.promoPrice;
                        itemObj.isOnSale = true;
                        itemObj.regularPrice = product.basePrice;
                    } else {
                        finalPrice = product.basePrice;
                    }
                }

                itemObj.price = finalPrice;

                // Update totals (only count available items in total)
                if (itemObj.isAvailable) {
                    totalItems += item.quantity;
                    totalPrice += itemObj.price * item.quantity;
                }

                return itemObj;
            })
        );

        // Calculate accumulated shipping fee across cart items
        let totalShippingFee = 0;
        let activeCourier = null;

        if (enhancedItems.length > 0) {
            enhancedItems.forEach((item) => {
                const shipAmount =
                    item.shipping?.amount !== undefined &&
                    !isNaN(Number(item.shipping?.amount))
                        ? Number(item.shipping.amount)
                        : 3000;
                totalShippingFee += shipAmount;
                if (!activeCourier && item.shipping) {
                    activeCourier = item.shipping;
                }
            });

            // Default to standard regional delivery (3000) if item shipping wasn't specified
            if (totalShippingFee === 0) {
                totalShippingFee = 3000;
            }

            if (!activeCourier) {
                activeCourier = {
                    amount: 3000,
                    price: 3000,
                    total: 3000,
                    fee: 3000,
                    service_code: "richmond",
                    carrierId: "richmond",
                    courier_id: "richmond",
                    carrierName: "RichmondLogistics",
                    courier_name: "RichmondLogistics",
                    name: "RichmondLogistics",
                    state: "Imo",
                    hub: "Owerri Hub",
                };
            }
        }

        const estimatedTotal =
            enhancedItems.length > 0
                ? Number(totalPrice || 0) + Number(totalShippingFee || 3000)
                : 0;

        // Update cart totals in memory only
        const result = populatedCart.toObject();
        result.items = enhancedItems;
        result.totalItems = totalItems;
        result.totalPrice = totalPrice;
        result.subtotal = totalPrice;
        result.shippingCost = totalShippingFee;
        result.shippingFee = totalShippingFee;
        result.shippingTotal = totalShippingFee;
        result.shipping = totalShippingFee;
        result.shippingDetails = activeCourier;
        result.selectedCourier = activeCourier;
        result.courier = activeCourier;
        result.estimatedTotal = estimatedTotal;
        result.total = estimatedTotal;

        // Save only the essential cart data back to the database
        // This prevents loss of calculated fields that aren't part of the schema
        await Cart.findByIdAndUpdate(cart._id, {
            totalItems: totalItems,
            totalPrice: totalPrice,
            lastUpdated: new Date(),
        });

        return result;
    }
}

export default new CartService();
