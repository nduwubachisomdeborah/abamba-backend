import Cart from "../models/cart.model.js";
import Product from "../models/product.model.js";
import { AppError } from "../middlewares/error.js";
import mongoose from "mongoose";
import ShippingOptions from "../models/shippingOptions.model.js";
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
        if (carrierId && request_token) {
            const shippingOption = await ShippingOptions.findOne({
                user: userId,
                request_token: request_token,
                product: productId,
                variant: variantId,
                quantity,
            });

            if (shippingOption && shippingOption.data?.couriers) {
                const selectedCarrier = shippingOption.data.couriers.find(
                    (carrier) => carrier.courier_id === carrierId
                );

                if (selectedCarrier) {
                    shipping = {
                        amount: selectedCarrier.total,
                        service_code: selectedCarrier.service_code,
                        carrierId: selectedCarrier.courier_id,
                        carrierName: selectedCarrier.courier_name,
                        carrierLogo: selectedCarrier.courier_image,
                        request_token: request_token,
                    };
                }
            }
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
            };
            if (shipping) {
                newItem.shipping = shipping;
            }

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
        if (!mongoose.Types.ObjectId.isValid(itemId)) {
            throw new AppError("Invalid item ID", 400);
        }

        const cart = await Cart.findOne({ user: userId });

        if (!cart) {
            throw new AppError("Cart not found", 404);
        }

        // Find the item in the cart
        const item = cart.items.id(itemId);

        if (!item) {
            throw new AppError("Item not found in cart", 404);
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
            if (product.stock < quantity) {
                throw new AppError(
                    `Only ${product.stock} items available in stock`,
                    400
                );
            }
        }

        const defaultAddress = await addressService.getDefaultAddress(userId);

        const carriers = await shipbubbleService.getCarriers(
            userId,
            defaultAddress.addressId,
            item.product,
            item.variant,
            quantity
        );

        const selectedCarrier = carriers.couriers.find(
            (carrier) => carrier.courier_id === item.shipping.carrierId
        );

        item.shipping = {
            amount: selectedCarrier.total,
            service_code: selectedCarrier.service_code,
            carrierId: selectedCarrier.courier_id,
            carrierName: selectedCarrier.courier_name,
            carrierLogo: selectedCarrier.courier_image,
            request_token: carriers.request_token,
        };

        // Update the quantity
        item.quantity = quantity;

        // Save cart and populate
        await cart.save();
        return await this.populateCart(cart);
    }

    /**
     * Remove an item from the cart
     * @param {string} userId - User ID
     * @param {string} itemId - Cart item ID
     * @returns {Promise<Object>} Updated cart
     */
    async removeItem(userId, itemId) {
        if (!mongoose.Types.ObjectId.isValid(itemId)) {
            throw new AppError("Invalid item ID", 400);
        }

        const cart = await Cart.findOne({ user: userId });
        if (!cart) {
            throw new AppError("Cart not found", 404);
        }

        // Find and remove the item
        const item = cart.items.id(itemId);
        if (!item) {
            throw new AppError("Item not found in cart", 404);
        }

        cart.items.pull(itemId);

        // Save cart and populate
        await cart.save();
        return await this.populateCart(cart);
    }

    /**
     * Clear all items from the cart
     * @param {string} userId - User ID
     * @returns {Promise<Object>} Empty cart
     */
    async clearCart(userId) {
        const cart = await Cart.findOne({ user: userId });
        if (!cart) {
            throw new AppError("Cart not found", 404);
        }

        cart.items = [];
        await cart.save();

        return cart;
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

        // Update cart totals in memory only
        const result = populatedCart.toObject();
        result.items = enhancedItems;
        result.totalItems = totalItems;
        result.totalPrice = totalPrice;

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
