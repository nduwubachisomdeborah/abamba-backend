import axios from "axios";

const BASE_URL = "https://abamba-backend.onrender.com/api/v1";

const api = axios.create({
    baseURL: BASE_URL,
    headers: {
        "Content-Type": "application/json",
    },
});

// Request interceptor to add auth token
api.interceptors.request.use((config) => {
    const token = localStorage.getItem("token");
    if (token) {
        config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
});

export const authApi = {
    /**
     * Authenticate a user with email and password
     * @param {Object} data - Login credentials
     * @param {string} data.email - User's email
     * @param {string} data.password - User's password
     * @returns {Promise<Object>} - Response with user data and token
     */
    login: (data) => api.post("/auth/login", data),

    /**
     * Register a new user
     * @param {Object} data - User registration data
     * @param {string} data.name - User's full name
     * @param {string} data.email - User's email
     * @param {string} data.phoneNumber - User's phone number
     * @param {string} data.password - User's password
     * @returns {Promise<Object>} - Response with registered user data
     */
    signup: (data) => api.post("/auth/signup", data),

    /**
     * Resend OTP verification code
     * @param {Object} data - Resend OTP data
     * @param {string} data.email - User's email
     * @returns {Promise<Object>} - Response with OTP status
     */
    resendOtp: (data) => api.post("/auth/resend-otp", data),

    /**
     * Verify OTP code to complete authentication
     * @param {Object} data - OTP verification data
     * @param {string} data.email - User's email
     * @param {string} data.otpCode - OTP code
     * @returns {Promise<Object>} - Response with verification status and token
     */
    verifyOtp: (data) => api.post("/auth/verify-otp", data),

    /**
     * Sign in with Google using Firebase ID token
     * @param {Object} data - Google sign-in data
     * @param {string} data.idToken - Firebase ID token
     * @returns {Promise<Object>} - Response with user data and token
     */
    googleSignIn: (data) => api.post("/auth/google", data),

    /**
     * Request a password reset (forgot password)
     * @param {Object} data - Password reset request data
     * @param {string} data.email - User's email
     * @returns {Promise<Object>} - Response with reset request status
     */
    forgotPassword: (data) => api.post("/auth/forgot-password", data),

    /**
     * Reset password with OTP verification
     * @param {Object} data - Password reset data
     * @param {string} data.email - User's email
     * @param {string} data.otpCode - OTP code
     * @param {string} data.newPassword - New password
     * @param {string} data.confirmPassword - Confirm new password
     * @returns {Promise<Object>} - Response with reset status and new token
     */
    resetPassword: (data) => api.post("/auth/reset-password", data),
};

export const userApi = {
    /**
     * Register a new user
     * @param {Object} data - User registration data
     * @param {string} data.name - User's name
     * @param {string} data.email - User's email
     * @param {string} data.phoneNumber - User's phone number
     * @param {string} data.password - User's password
     * @returns {Promise<Object>} - Response with registered user data
     */
    register: (data) => api.post("/users/register", data),

    /**
     * Authenticate a user with email and password
     * @param {Object} data - Login credentials
     * @param {string} data.email - User's email
     * @param {string} data.password - User's password
     * @returns {Promise<Object>} - Response with user data and token
     */
    login: (data) => api.post("/users/login", data),

    /**
     * Get the current user's profile
     * @returns {Promise<Object>} - Response with user profile data
     */
    getProfile: () => api.get("/users/me"),

    /**
     * Get all users (admin only)
     * @returns {Promise<Object>} - Response with list of users
     */
    getAllUsers: () => api.get("/users"),

    /**
     * Get a user by ID (admin only)
     * @param {string} userId - User ID
     * @returns {Promise<Object>} - Response with user data
     */
    getUserById: (userId) => api.get(`/users/${userId}`),

    /**
     * Update a user's information
     * @param {string} userId - User ID
     * @param {Object} data - User data to update
     * @param {string} [data.name] - User's name
     * @param {string} [data.email] - User's email
     * @returns {Promise<Object>} - Response with updated user data
     */
    updateUser: (userId, data) => api.put(`/users/${userId}`, data),

    /**
     * Delete a user (admin only)
     * @param {string} userId - User ID
     * @returns {Promise<Object>} - Response with deletion status
     */
    deleteUser: (userId) => api.delete(`/users/${userId}`),
};

export const productApi = {
    /**
     * Get all products with optional filtering
     * @param {Object} [params] - Query parameters
     * @param {number} [params.page] - Page number
     * @param {number} [params.limit] - Items per page
     * @param {string} [params.sort] - Sort field with direction (e.g., '-createdAt')
     * @param {number} [params.minPrice] - Minimum price filter
     * @param {number} [params.maxPrice] - Maximum price filter
     * @param {string} [params.category] - Category filter
     * @param {string} [params.brand] - Brand filter
     * @param {boolean} [params.featured] - Featured products only
     * @param {boolean} [params.includeRatingStats] - Include rating statistics
     * @param {Object} [params.attributes] - Filter by variant attributes
     * @returns {Promise<Object>} - Response with products and pagination
     */
    getAllProducts: (params) => api.get("/products", { params }),

    /**
     * Get a product by ID
     * @param {string} productId - Product ID
     * @param {Object} [params] - Query parameters
     * @param {boolean} [params.includeRatingStats] - Include rating statistics
     * @returns {Promise<Object>} - Response with product data
     */
    getProductById: (productId, params) =>
        api.get(`/products/${productId}`, { params }),

    /**
     * Get featured products
     * @param {Object} [params] - Query parameters
     * @param {number} [params.limit] - Maximum number to return
     * @param {boolean} [params.includeRatingStats] - Include rating statistics
     * @returns {Promise<Object>} - Response with featured products
     */
    getFeaturedProducts: (params) => api.get("/products/featured", { params }),

    /**
     * Create a new product
     * @param {Object} data - Product data
     * @param {string} data.name - Product name
     * @param {string} data.description - Product description
     * @param {number} data.basePrice - Base price
     * @param {number} [data.discountPrice] - Discounted price
     * @param {string} data.sku - Stock keeping unit
     * @param {number} data.stock - Available stock
     * @param {boolean} [data.featured] - Featured status
     * @param {string[]} data.categories - Product categories
     * @param {string} [data.brand] - Product brand
     * @param {Object} [data.attributes] - Product attributes
     * @param {Object[]} [data.images] - Product images
     * @param {Object[]} [data.variants] - Product variants
     * @returns {Promise<Object>} - Response with created product
     */
    createProduct: (data) => api.post("/products", data),

    /**
     * Update a product
     * @param {string} productId - Product ID
     * @param {Object} data - Product data to update
     * @returns {Promise<Object>} - Response with updated product
     */
    updateProduct: (productId, data) => api.put(`/products/${productId}`, data),

    /**
     * Delete a product
     * @param {string} productId - Product ID
     * @returns {Promise<Object>} - Response with deletion status
     */
    deleteProduct: (productId) => api.delete(`/products/${productId}`),

    // Variant-related endpoints

    /**
     * Get all variants for a product
     * @param {string} productId - Product ID
     * @returns {Promise<Object>} - Response with product variants
     */
    getProductVariants: (productId) =>
        api.get(`/products/${productId}/variants`),

    /**
     * Get a specific variant
     * @param {string} productId - Product ID
     * @param {string} variantId - Variant ID
     * @returns {Promise<Object>} - Response with variant data
     */
    getVariantById: (productId, variantId) =>
        api.get(`/products/${productId}/variants/${variantId}`),

    /**
     * Add a variant to a product
     * @param {string} productId - Product ID
     * @param {Object} data - Variant data
     * @param {Object} data.attributes - Variant attributes (color, size, etc.)
     * @param {string} data.sku - Variant SKU
     * @param {number} data.price - Variant price
     * @param {number} data.stock - Variant stock
     * @param {Object[]} [data.images] - Variant images
     * @returns {Promise<Object>} - Response with created variant
     */
    addVariant: (productId, data) =>
        api.post(`/products/${productId}/variants`, data),

    /**
     * Update a variant
     * @param {string} productId - Product ID
     * @param {string} variantId - Variant ID
     * @param {Object} data - Variant data to update
     * @returns {Promise<Object>} - Response with updated variant
     */
    updateVariant: (productId, variantId, data) =>
        api.put(`/products/${productId}/variants/${variantId}`, data),

    /**
     * Delete a variant
     * @param {string} productId - Product ID
     * @param {string} variantId - Variant ID
     * @returns {Promise<Object>} - Response with deletion status
     */
    deleteVariant: (productId, variantId) =>
        api.delete(`/products/${productId}/variants/${variantId}`),

    /**
     * Update a variant's stock
     * @param {string} productId - Product ID
     * @param {string} variantId - Variant ID
     * @param {Object} data - Stock update data
     * @param {number} data.stock - New stock value
     * @returns {Promise<Object>} - Response with updated stock info
     */
    updateVariantStock: (productId, variantId, data) =>
        api.patch(`/products/${productId}/variants/${variantId}/stock`, data),
};

export const reviewApi = {
    /**
     * Get all reviews with pagination and filtering
     * @param {Object} [params] - Query parameters
     * @param {number} [params.page] - Page number
     * @param {number} [params.limit] - Items per page
     * @param {string} [params.sort] - Sort field with direction
     * @param {string} [params.status] - Filter by status
     * @returns {Promise<Object>} - Response with reviews and pagination
     */
    getAllReviews: (params) => api.get("/reviews", { params }),

    /**
     * Get a review by ID
     * @param {string} reviewId - Review ID
     * @returns {Promise<Object>} - Response with review data
     */
    getReviewById: (reviewId) => api.get(`/reviews/${reviewId}`),

    /**
     * Get all reviews for a specific product
     * @param {string} productId - Product ID
     * @param {Object} [params] - Query parameters
     * @param {number} [params.rating] - Filter by rating
     * @param {string} [params.sort] - Sort field with direction
     * @param {boolean} [params.verified] - Filter for verified reviews only
     * @param {number} [params.page] - Page number
     * @param {number} [params.limit] - Items per page
     * @returns {Promise<Object>} - Response with product reviews
     */
    getProductReviews: (productId, params) =>
        api.get(`/products/${productId}/reviews`, { params }),

    /**
     * Create a new review for a product
     * @param {string} productId - Product ID
     * @param {Object} data - Review data
     * @param {number} data.rating - Rating (1-5)
     * @param {string} data.title - Review title
     * @param {string} data.comment - Review comment
     * @param {string} [data.variant] - Variant ID (if reviewing specific variant)
     * @param {Object[]} [data.photos] - Review photos
     * @returns {Promise<Object>} - Response with created review
     */
    createReview: (productId, data) =>
        api.post(`/products/${productId}/reviews`, data),

    /**
     * Update a review
     * @param {string} reviewId - Review ID
     * @param {Object} data - Review data to update
     * @param {number} [data.rating] - Updated rating
     * @param {string} [data.title] - Updated title
     * @param {string} [data.comment] - Updated comment
     * @returns {Promise<Object>} - Response with updated review
     */
    updateReview: (reviewId, data) => api.put(`/reviews/${reviewId}`, data),

    /**
     * Delete a review (soft delete)
     * @param {string} reviewId - Review ID
     * @returns {Promise<Object>} - Response with deletion status
     */
    deleteReview: (reviewId) => api.delete(`/reviews/${reviewId}`),

    // Review actions

    /**
     * Mark a review as helpful
     * @param {string} reviewId - Review ID
     * @returns {Promise<Object>} - Response with updated helpful count
     */
    markHelpful: (reviewId) => api.post(`/reviews/${reviewId}/helpful`),

    /**
     * Mark a review as unhelpful
     * @param {string} reviewId - Review ID
     * @returns {Promise<Object>} - Response with updated unhelpful count
     */
    markUnhelpful: (reviewId) => api.post(`/reviews/${reviewId}/unhelpful`),

    /**
     * Add an official reply to a review (admin only)
     * @param {string} reviewId - Review ID
     * @param {Object} data - Reply data
     * @param {string} data.content - Reply content
     * @returns {Promise<Object>} - Response with updated review including reply
     */
    addReply: (reviewId, data) => api.post(`/reviews/${reviewId}/reply`, data),

    /**
     * Update review status (admin only)
     * @param {string} reviewId - Review ID
     * @param {Object} data - Status update data
     * @param {string} data.status - New status ('published', 'pending', 'rejected')
     * @returns {Promise<Object>} - Response with updated status
     */
    updateStatus: (reviewId, data) =>
        api.patch(`/reviews/${reviewId}/status`, data),

    /**
     * Mark a review as verified (admin only)
     * @param {string} reviewId - Review ID
     * @returns {Promise<Object>} - Response with verification status
     */
    verifyReview: (reviewId) => api.patch(`/reviews/${reviewId}/verify`),
};

export const cartApi = {
    /**
     * Get the current user's cart
     * @returns {Promise<Object>} - Response with cart data
     */
    getCart: () => api.get("/cart"),

    /**
     * Add an item to the cart
     * @param {Object} data - Cart item data
     * @param {string} data.productId - Product ID
     * @param {string} [data.variantId] - Variant ID (if applicable)
     * @param {number} data.quantity - Quantity to add
     * @returns {Promise<Object>} - Response with updated cart
     */
    addItem: (data) => api.post("/cart", data),

    /**
     * Update the quantity of an item in the cart
     * @param {string} itemId - Cart item ID
     * @param {Object} data - Update data
     * @param {number} data.quantity - New quantity
     * @returns {Promise<Object>} - Response with updated cart
     */
    updateItemQuantity: (itemId, data) =>
        api.patch(`/cart/items/${itemId}`, data),

    /**
     * Remove an item from the cart
     * @param {string} itemId - Cart item ID
     * @returns {Promise<Object>} - Response with updated cart
     */
    removeItem: (itemId) => api.delete(`/cart/items/${itemId}`),

    /**
     * Clear all items from the cart
     * @returns {Promise<Object>} - Response with empty cart
     */
    clearCart: () => api.delete("/cart"),
};

export const addressApi = {
    /**
     * Get all addresses for the current user
     * @returns {Promise<Object>} - Response with list of user addresses
     */
    getAllAddresses: () => api.get("/users/addresses"),

    /**
     * Get a specific address by ID
     * @param {string} addressId - Address ID
     * @returns {Promise<Object>} - Response with address data
     */
    getAddressById: (addressId) => api.get(`/users/addresses/${addressId}`),

    /**
     * Add a new address to the user's address book
     * @param {Object} data - Address data
     * @param {string} data.fullName - Full name for the address
     * @param {string} data.addressLine1 - Address line 1
     * @param {string} [data.addressLine2] - Address line 2
     * @param {string} data.city - City
     * @param {string} data.state - State/Province
     * @param {string} data.zipCode - Zip/Postal code
     * @param {string} data.country - Country
     * @param {string} data.phoneNumber - Phone number
     * @param {boolean} [data.isDefault] - Whether this is the default address
     * @returns {Promise<Object>} - Response with created address
     */
    addAddress: (data) => api.post("/users/addresses", data),

    /**
     * Update an existing address
     * @param {string} addressId - Address ID
     * @param {Object} data - Address data to update
     * @returns {Promise<Object>} - Response with updated address
     */
    updateAddress: (addressId, data) =>
        api.patch(`/users/addresses/${addressId}`, data),

    /**
     * Set an address as default
     * @param {string} addressId - Address ID
     * @returns {Promise<Object>} - Response with updated address status
     */
    setDefaultAddress: (addressId) =>
        api.patch(`/users/addresses/${addressId}/default`),

    /**
     * Delete an address
     * @param {string} addressId - Address ID
     * @returns {Promise<Object>} - Response with deletion status
     */
    deleteAddress: (addressId) => api.delete(`/users/addresses/${addressId}`),
};

export const orderApi = {
    /**
     * Create a new order
     * @param {Object} data - Order data
     * @param {Object} [data.shippingAddress] - Direct shipping address
     * @param {string} [data.addressId] - ID of saved address to use
     * @param {string} data.paymentMethod - Payment method
     * @param {Object} data.paymentDetails - Payment details
     * @param {number} data.shippingCost - Shipping cost
     * @param {number} data.tax - Tax amount
     * @param {number} [data.discount] - Discount amount
     * @param {string} [data.notes] - Order notes
     * @returns {Promise<Object>} - Response with created order
     */
    createOrder: (data) => api.post("/orders", data),

    /**
     * Get all orders with optional filtering
     * @param {Object} [params] - Query parameters
     * @param {number} [params.page] - Page number
     * @param {number} [params.limit] - Items per page
     * @param {string} [params.status] - Filter by status
     * @param {string} [params.startDate] - Filter by start date
     * @param {string} [params.endDate] - Filter by end date
     * @param {string} [params.sort] - Sort field with direction
     * @returns {Promise<Object>} - Response with orders and pagination
     */
    getAllOrders: (params) => api.get("/orders", { params }),

    /**
     * Get order by ID
     * @param {string} orderId - Order ID
     * @returns {Promise<Object>} - Response with order data
     */
    getOrderById: (orderId) => api.get(`/orders/${orderId}`),

    /**
     * Update order status (admin only)
     * @param {string} orderId - Order ID
     * @param {Object} data - Status update data
     * @param {string} data.status - New status
     * @returns {Promise<Object>} - Response with updated order
     */
    updateOrderStatus: (orderId, data) =>
        api.patch(`/orders/${orderId}/status`, data),

    /**
     * Update order payment (admin only)
     * @param {string} orderId - Order ID
     * @param {Object} data - Payment update data
     * @param {string} data.status - Payment status
     * @param {string} [data.transactionId] - Transaction ID
     * @param {Object} [data.details] - Additional payment details
     * @returns {Promise<Object>} - Response with updated order
     */
    updateOrderPayment: (orderId, data) =>
        api.patch(`/orders/${orderId}/payment`, data),

    /**
     * Delete order (admin only - soft delete)
     * @param {string} orderId - Order ID
     * @returns {Promise<Object>} - Response with deletion status
     */
    deleteOrder: (orderId) => api.delete(`/orders/${orderId}`),
};

export const shipmentApi = {
    /**
     * Track a shipment by tracking number (public)
     * @param {string} trackingNumber - Shipment tracking number
     * @returns {Promise<Object>} - Response with tracking information
     */
    trackShipment: (trackingNumber) =>
        api.get(`/shipments/tracking/${trackingNumber}`),

    /**
     * Get all shipments with optional filtering
     * @param {Object} [params] - Query parameters
     * @param {number} [params.page] - Page number
     * @param {number} [params.limit] - Items per page
     * @param {string} [params.status] - Filter by status
     * @param {string} [params.carrier] - Filter by carrier
     * @param {string} [params.startDate] - Filter by start date
     * @param {string} [params.endDate] - Filter by end date
     * @param {string} [params.sort] - Sort field with direction
     * @returns {Promise<Object>} - Response with shipments and pagination
     */
    getAllShipments: (params) => api.get("/shipments", { params }),

    /**
     * Get shipment by ID
     * @param {string} shipmentId - Shipment ID
     * @returns {Promise<Object>} - Response with shipment data
     */
    getShipmentById: (shipmentId) => api.get(`/shipments/${shipmentId}`),

    /**
     * Create a new shipment (admin only)
     * @param {Object} data - Shipment data
     * @param {string[]} data.orderIds - Order IDs to include in shipment
     * @param {string} data.carrier - Shipping carrier
     * @param {string} data.trackingNumber - Tracking number
     * @param {string} [data.trackingUrl] - Tracking URL
     * @param {string} data.shippingMethod - Shipping method
     * @param {string} [data.estimatedDelivery] - Estimated delivery date
     * @param {number} data.shippingCost - Shipping cost
     * @param {number} [data.packageWeight] - Package weight
     * @param {Object} [data.packageDimensions] - Package dimensions
     * @param {string} [data.notes] - Shipment notes
     * @returns {Promise<Object>} - Response with created shipment
     */
    createShipment: (data) => api.post("/shipments", data),

    /**
     * Add tracking update to shipment (admin only)
     * @param {string} shipmentId - Shipment ID
     * @param {Object} data - Tracking update data
     * @param {string} data.status - Status update
     * @param {string} [data.location] - Current location
     * @param {string} [data.description] - Update description
     * @returns {Promise<Object>} - Response with updated shipment
     */
    addTrackingUpdate: (shipmentId, data) =>
        api.post(`/shipments/${shipmentId}/tracking`, data),

    /**
     * Update shipment details (admin only)
     * @param {string} shipmentId - Shipment ID
     * @param {Object} data - Shipment data to update
     * @returns {Promise<Object>} - Response with updated shipment
     */
    updateShipment: (shipmentId, data) =>
        api.patch(`/shipments/${shipmentId}`, data),

    /**
     * Delete shipment (admin only - soft delete)
     * @param {string} shipmentId - Shipment ID
     * @returns {Promise<Object>} - Response with deletion status
     */
    deleteShipment: (shipmentId) => api.delete(`/shipments/${shipmentId}`),
};

export const wishlistApi = {
    /**
     * Get all wishlists for the authenticated user
     * @returns {Promise<Object>} - Response with user's wishlists
     */
    getAllWishlists: () => api.get("/wishlists"),

    /**
     * Create a new wishlist
     * @param {Object} data - Wishlist data
     * @param {string} data.name - Name of the wishlist
     * @returns {Promise<Object>} - Response with created wishlist
     */
    createWishlist: (data) => api.post("/wishlists", data),

    /**
     * Get a specific wishlist by ID
     * @param {string} wishlistId - Wishlist ID
     * @returns {Promise<Object>} - Response with wishlist data
     */
    getWishlistById: (wishlistId) => api.get(`/wishlists/${wishlistId}`),

    /**
     * Update a wishlist
     * @param {string} wishlistId - Wishlist ID
     * @param {Object} data - Wishlist data to update
     * @param {string} [data.name] - New name for the wishlist
     * @returns {Promise<Object>} - Response with updated wishlist
     */
    updateWishlist: (wishlistId, data) => api.patch(`/wishlists/${wishlistId}`, data),

    /**
     * Delete a wishlist (soft delete)
     * @param {string} wishlistId - Wishlist ID
     * @returns {Promise<Object>} - Response with deletion status
     */
    deleteWishlist: (wishlistId) => api.delete(`/wishlists/${wishlistId}`),

    /**
     * Add a product to a specific wishlist
     * @param {string} wishlistId - Wishlist ID
     * @param {Object} data - Product data
     * @param {string} data.productId - Product ID to add
     * @param {string} [data.notes] - Optional notes about the product
     * @returns {Promise<Object>} - Response with updated wishlist
     */
    addProductToWishlist: (wishlistId, data) => 
        api.post(`/wishlists/${wishlistId}/products`, data),

    /**
     * Add a product to the default wishlist
     * @param {Object} data - Product data
     * @param {string} data.productId - Product ID to add
     * @param {string} [data.notes] - Optional notes about the product
     * @returns {Promise<Object>} - Response with updated wishlist
     */
    addProductToDefaultWishlist: (data) => api.post("/wishlists/products", data),
    
    /**
     * Remove a product from a wishlist
     * @param {string} wishlistId - Wishlist ID
     * @param {string} productId - Product ID to remove
     * @returns {Promise<Object>} - Response with updated wishlist
     */
    removeProductFromWishlist: (wishlistId, productId) => 
        api.delete(`/wishlists/${wishlistId}/products/${productId}`)
};

export const accountManagementApi = {
    /**
     * Get account status
     * @param {string} userId - User ID
     * @returns {Promise<Object>} - Response with account status
     */
    getAccountStatus: (userId) => api.get(`/users/${userId}/status`),

    /**
     * Disable account
     * @param {string} userId - User ID
     * @param {Object} data - Disable data
     * @param {string} data.reason - Reason for disabling
     * @returns {Promise<Object>} - Response with updated account status
     */
    disableAccount: (userId, data) =>
        api.patch(`/users/${userId}/disable`, data),

    /**
     * Enable account (admin only)
     * @param {string} userId - User ID
     * @returns {Promise<Object>} - Response with updated account status
     */
    enableAccount: (userId) => api.patch(`/users/${userId}/enable`),
};

export const uploadApi = {
    /**
     * Upload a file
     * @param {FormData} formData - Form data containing the file
     * @returns {Promise<Object>} - Response with file upload details
     */
    uploadFile: (formData) => 
        api.post('/upload', formData, {
            headers: {
                'Content-Type': 'multipart/form-data'
            }
        }),

    /**
     * Get file by ID
     * @param {string} fileId - File ID
     * @returns {Promise<Object>} - Response with file details
     */
    getFile: (fileId) => api.get(`/upload/${fileId}`),

    /**
     * Delete a file
     * @param {string} fileId - File ID
     * @returns {Promise<Object>} - Response with deletion status
     */
    deleteFile: (fileId) => api.delete(`/upload/${fileId}`)
};

export const sellerApi = {
    /**
     * Register as a seller
     * @param {Object} data - Seller registration data
     * @param {string} data.name - Full name
     * @param {string} data.email - Email address
     * @param {string} data.phoneNumber - Phone number
     * @param {string} data.password - Password
     * @param {string} data.dob - Date of birth (MM/DD/YYYY)
     * @param {Object} data.address - Address information
     * @returns {Promise<Object>} - Response with registration status
     */
    register: (data) => api.post('/seller/register', data),

    /**
     * Login as a seller
     * @param {Object} data - Login credentials
     * @param {string} data.email - Email address
     * @param {string} data.password - Password
     * @returns {Promise<Object>} - Response with authentication token
     */
    login: (data) => api.post('/seller/login', data),

    /**
     * Sign up as a seller
     * @param {Object} data - Seller signup data
     * @param {string} data.name - Full name
     * @param {string} data.email - Email address
     * @param {string} data.phoneNumber - Phone number
     * @param {string} data.password - Password
     * @param {string} data.dob - Date of birth (MM/DD/YYYY)
     * @param {Object} data.address - Address information
     * @returns {Promise<Object>} - Response with signup status
     */
    signup: (data) => api.post('/seller/signup', data),

    /**
     * Verify OTP for seller
     * @param {Object} data - OTP verification data
     * @param {string} data.email - Email address
     * @param {string} data.otpCode - OTP code
     * @returns {Promise<Object>} - Response with verification status
     */
    verifyOtp: (data) => api.post('/seller/verify-otp', data),

    /**
     * Resend OTP for seller
     * @param {Object} data - Resend OTP data
     * @param {string} data.email - Email address
     * @returns {Promise<Object>} - Response with OTP status
     */
    resendOtp: (data) => api.post('/seller/resend-otp', data),

    /**
     * Complete seller onboarding
     * @param {Object} data - Onboarding data
     * @param {string} data.name - Full name
     * @param {string} data.dob - Date of birth
     * @param {string} data.phoneNumber - Phone number
     * @param {Object} data.address - Address information
     * @param {Object} data.bank - Bank information
     * @param {string} data.businessName - Business name
     * @param {string} data.businessType - Type of business
     * @param {Object} data.businessAddress - Business address
     * @param {string} data.businessPhone - Business phone
     * @param {string} data.businessEmail - Business email
     * @param {string} data.documentType - Type of ID document
     * @param {string} data.personalDocument - Personal document ID
     * @param {string} data.businessDocument - Business document ID
     * @returns {Promise<Object>} - Response with onboarding status
     */
    onboard: (data) => api.post('/seller/onboard', data, {
        headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
    })
};

export const sellerProductApi = {
    /**
     * Get all seller products
     * @param {Object} [params] - Query parameters
     * @param {number} [params.page] - Page number
     * @param {number} [params.limit] - Items per page
     * @param {boolean} [params.onSale] - Filter products on sale
     * @returns {Promise<Object>} - Response with products and pagination
     */
    getAllProducts: (params) => api.get('/seller/products', { params }),

    /**
     * Create a new product
     * @param {Object} data - Product data
     * @returns {Promise<Object>} - Response with created product
     */
    createProduct: (data) => api.post('/seller/products', data),

    /**
     * Update a product
     * @param {string} productId - Product ID
     * @param {Object} data - Product data to update
     * @returns {Promise<Object>} - Response with updated product
     */
    updateProduct: (productId, data) => api.put(`/seller/products/${productId}`, data),

    /**
     * Delete a product
     * @param {string} productId - Product ID
     * @returns {Promise<Object>} - Response with deletion status
     */
    deleteProduct: (productId) => api.delete(`/seller/products/${productId}`),

    /**
     * Set product promotion
     * @param {string} productId - Product ID
     * @param {Object} data - Promotion data
     * @param {number} data.promoPrice - Promotional price
     * @param {string} data.saleStartDate - Start date of promotion (ISO string)
     * @param {string} data.saleEndDate - End date of promotion (ISO string)
     * @returns {Promise<Object>} - Response with updated product
     */
    setPromotion: (productId, data) => 
        api.post(`/seller/products/${productId}/promotion`, data),

    /**
     * Remove product promotion
     * @param {string} productId - Product ID
     * @returns {Promise<Object>} - Response with updated product
     */
    removePromotion: (productId) => 
        api.delete(`/seller/products/${productId}/promotion`),

    /**
     * Add variant to product
     * @param {string} productId - Product ID
     * @param {Object} data - Variant data
     * @returns {Promise<Object>} - Response with updated product
     */
    addVariant: (productId, data) => 
        api.post(`/seller/products/${productId}/variants`, data),

    /**
     * Update variant
     * @param {string} productId - Product ID
     * @param {string} variantId - Variant ID
     * @param {Object} data - Variant data to update
     * @returns {Promise<Object>} - Response with updated variant
     */
    updateVariant: (productId, variantId, data) => 
        api.put(`/seller/products/${productId}/variants/${variantId}`, data),

    /**
     * Delete variant
     * @param {string} productId - Product ID
     * @param {string} variantId - Variant ID
     * @returns {Promise<Object>} - Response with deletion status
     */
    deleteVariant: (productId, variantId) => 
        api.delete(`/seller/products/${productId}/variants/${variantId}`),

    /**
     * Set variant promotion
     * @param {string} productId - Product ID
     * @param {string} variantId - Variant ID
     * @param {Object} data - Promotion data
     * @param {number} data.promoPrice - Promotional price
     * @returns {Promise<Object>} - Response with updated variant
     */
    setVariantPromotion: (productId, variantId, data) => 
        api.post(`/seller/products/${productId}/variants/${variantId}/promotion`, data),

    /**
     * Remove variant promotion
     * @param {string} productId - Product ID
     * @param {string} variantId - Variant ID
     * @returns {Promise<Object>} - Response with updated variant
     */
    removeVariantPromotion: (productId, variantId) => 
        api.delete(`/seller/products/${productId}/variants/${variantId}/promotion`),

    /**
     * Get seller product statistics
     * @returns {Promise<Object>} - Response with product statistics
     */
    getStats: () => api.get('/seller/products/stats')
};

export const subscriptionApi = {
    /**
     * Subscribe to email updates
     * @param {Object} data - Subscription data
     * @param {string} data.email - Email address to subscribe
     * @returns {Promise<Object>} - Response with subscription status
     */
    subscribe: (data) => api.post("/subscriptions", data),
    
    /**
     * Confirm a subscription (via email link)
     * @param {string} token - Confirmation token
     * @returns {Promise<Object>} - Response with confirmation status
     */
    confirmSubscription: (token) => api.get(`/subscriptions/confirm/${token}`),
    
    /**
     * Unsubscribe from emails (via email link)
     * @param {string} token - Unsubscribe token
     * @returns {Promise<Object>} - Response with unsubscribe status
     */
    unsubscribe: (token) => api.get(`/subscriptions/unsubscribe/${token}`),
    
    /**
     * Get all subscriptions (admin only)
     * @param {Object} [params] - Query parameters
     * @param {number} [params.page] - Page number
     * @param {number} [params.limit] - Items per page
     * @param {string} [params.status] - Filter by status
     * @param {string} [params.source] - Filter by source
     * @returns {Promise<Object>} - Response with subscriptions and pagination
     */
    getAllSubscriptions: (params) => api.get("/subscriptions", { params }),
    
    /**
     * Get subscription by email (admin only)
     * @param {string} email - Email address
     * @returns {Promise<Object>} - Response with subscription data
     */
    getSubscriptionByEmail: (email) => api.get(`/subscriptions/${email}`),
    
    /**
     * Delete a subscription (admin only)
     * @param {string} email - Email address to delete
     * @returns {Promise<Object>} - Response with deletion status
     */
    deleteSubscription: (email) => api.delete(`/subscriptions/${email}`),
};



export default api;
