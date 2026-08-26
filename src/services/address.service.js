import User from "../models/user.model.js";
import { AppError } from "../middlewares/error.js";
import mongoose from "mongoose";
import shipBubbleService from "./shiping/shipbubble.service.js";
import ShippingAddress from "../models/shippingAddress.model.js";

class AddressService {
    /**
     * Get all addresses for a user
     * @param {string} userId - User ID
     * @returns {Promise<Array>} List of user addresses
     */
    async getAddresses(userId) {
        const user = await User.findById(userId);
        if (!user) {
            throw new AppError("User not found", 404);
        }

        return user.addresses || [];
    }

    /**
     * Get a specific address by ID
     * @param {string} userId - User ID
     * @param {string} addressId - Address ID
     * @returns {Promise<Object>} Address object
     */
    async getAddressById(userId, addressId) {
        if (!mongoose.Types.ObjectId.isValid(addressId)) {
            throw new AppError("Invalid address ID", 400);
        }

        const user = await User.findById(userId);
        if (!user) {
            throw new AppError("User not found", 404);
        }

        const address = user.addresses.id(addressId);
        if (!address) {
            throw new AppError("Address not found", 404);
        }

        return address;
    }

    /**
     * Add a new address for a user
     * @param {string} userId - User ID
     * @param {Object} addressData - Address data
     * @returns {Promise<Object>} Updated user with addresses
     */
    async addAddress(userId, addressData) {
        const user = await User.findById(userId);
        if (!user) {
            throw new AppError("User not found", 404);
        }

        // Initialize addresses array if it doesn't exist
        if (!user.addresses) {
            user.addresses = [];
        }

        console.log({ addressData });

        // If this is the first address or if isDefault is true, set it as default
        if (user.addresses.length === 0 || addressData.isDefault) {
            // If setting this address as default, unset any existing default
            if (user.addresses.length > 0) {
                user.addresses.forEach((addr) => {
                    addr.isDefault = false;
                });
            }
            addressData.isDefault = true;
        }

        // format coordinates
        addressData.coordinates = {
            type: "Point",
            coordinates: [
                addressData.coordinates.longitude,
                addressData.coordinates.latitude,
            ],
        };

        // Add the new address
        user.addresses.push(addressData);

        await user.save();

        // Get the newly created address _id
        const newAddress = user.addresses[user.addresses.length - 1];

        // Store the address validation with the address ID
        try {
            const validatedAddress = await shipBubbleService.validateAddress({
                userId,
                addressId: newAddress._id,
                name: addressData.fullName,
                email: user.email,
                phone: addressData.phoneNumber,
                address: addressData.addressLine1,
                longitude: addressData.coordinates.coordinates[0],
                latitude: addressData.coordinates.coordinates[1],
            });

            console.log({ validatedAddress });
        } catch (error) {
            console.error("Address validation error:", error);

            // Remove the invalid address from user
            user.addresses.pull(newAddress._id);
            await user.save();

            // Throw the validation error
            throw error;
        }

        return user;
    }

    /**
     * Update an existing address
     * @param {string} userId - User ID
     * @param {string} addressId - Address ID
     * @param {Object} addressData - Updated address data
     * @returns {Promise<Object>} Updated user with addresses
     */
    async updateAddress(userId, addressId, addressData) {
        if (!mongoose.Types.ObjectId.isValid(addressId)) {
            throw new AppError("Invalid address ID", 400);
        }

        const user = await User.findById(userId);
        if (!user) {
            throw new AppError("User not found", 404);
        }

        const address = user.addresses.id(addressId);
        if (!address) {
            throw new AppError("Address not found", 404);
        }

        // Store original address data for potential rollback
        const originalAddress = {
            fullName: address.fullName,
            addressLine1: address.addressLine1,
            addressLine2: address.addressLine2,
            city: address.city,
            state: address.state,
            zipCode: address.zipCode,
            country: address.country,
            phoneNumber: address.phoneNumber,
            coordinates: address.coordinates,
            isDefault: address.isDefault,
        };

        // Handle setting this address as default
        if (addressData.isDefault && !address.isDefault) {
            // Unset any existing default
            user.addresses.forEach((addr) => {
                addr.isDefault = false;
            });
            address.isDefault = true;
        }

        // format coordinates if provided
        if (addressData.coordinates) {
            addressData.coordinates = {
                type: "Point",
                coordinates: [
                    addressData.coordinates.longitude,
                    addressData.coordinates.latitude,
                ],
            };
        }

        // Update address fields
        Object.keys(addressData).forEach((key) => {
            if (key !== "isDefault") {
                // We've already handled the default flag
                address[key] = addressData[key];
            }
        });

        await user.save();

        // If coordinates were updated, validate the address
        if (addressData.coordinates) {
            try {
                const validatedAddress =
                    await shipBubbleService.validateAddress({
                        userId,
                        addressId: address._id,
                        name: addressData?.fullName || address.fullName,
                        email: user.email || address.email,
                        phone: addressData?.phoneNumber || address.phoneNumber,
                        address:
                            addressData.addressLine1 || address.addressLine1,
                        longitude: addressData.coordinates.coordinates[0],
                        latitude: addressData.coordinates.coordinates[1],
                    });
            } catch (error) {
                console.error("Address validation error:", error);

                // Revert address changes
                Object.keys(originalAddress).forEach((key) => {
                    address[key] = originalAddress[key];
                });
                await user.save();

                // Throw the validation error
                throw error;
            }
        }

        return user;
    }

    /**
     * Set an address as the default
     * @param {string} userId - User ID
     * @param {string} addressId - Address ID
     * @returns {Promise<Object>} Updated user with addresses
     */
    async setDefaultAddress(userId, addressId) {
        if (!mongoose.Types.ObjectId.isValid(addressId)) {
            throw new AppError("Invalid address ID", 400);
        }

        const user = await User.findById(userId);
        if (!user) {
            throw new AppError("User not found", 404);
        }

        const address = user.addresses.id(addressId);
        if (!address) {
            throw new AppError("Address not found", 404);
        }

        // Already the default, nothing to do
        if (address.isDefault) {
            return user;
        }

        // Unset any existing default
        user.addresses.forEach((addr) => {
            addr.isDefault = false;
        });

        // Set the new default
        address.isDefault = true;

        await user.save();
        return user;
    }

    /**
     * Get the default address for a user
     * @param {string} userId - User ID
     * @returns {Promise<Object>} Default address object
     */
    async getDefaultAddress(userId) {
        const user = await User.findById(userId);
        if (!user) {
            throw new AppError("User not found", 404);
        }

        const defaultAddress = user.addresses.find((addr) => addr.isDefault);
        if (!defaultAddress) {
            throw new AppError("Default address not found", 404);
        }

        return await ShippingAddress.findOne({
            user: userId,
            addressId: defaultAddress._id,
        });
    }

    /**
     * Delete an address
     * @param {string} userId - User ID
     * @param {string} addressId - Address ID
     * @returns {Promise<Object>} Updated user with addresses
     */
    async deleteAddress(userId, addressId) {
        if (!mongoose.Types.ObjectId.isValid(addressId)) {
            throw new AppError("Invalid address ID", 400);
        }

        const user = await User.findById(userId);
        if (!user) {
            throw new AppError("User not found", 404);
        }

        const address = user.addresses.id(addressId);
        if (!address) {
            throw new AppError("Address not found", 404);
        }

        // Check if this is the default address
        const wasDefault = address.isDefault;

        // Remove the address
        user.addresses.pull(addressId);

        // Remove the validated address
        await ShippingAddress.deleteOne({
            user: userId,
            addressId,
        });

        // If we removed the default address and other addresses exist, set a new default
        if (wasDefault && user.addresses.length > 0) {
            user.addresses[0].isDefault = true;
        }

        await user.save();
        return user;
    }
}

export default new AddressService();
