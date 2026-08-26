import StoreLocation from "../models/storeLocation.model.js";
import shipBubbleService from "./shiping/shipbubble.service.js";
import { AppError } from "../middlewares/error.js";

class StoreLocationService {
    /**
     * Get all store locations
     * @param {Object} filters - Optional filters
     * @returns {Promise<Array>} Array of store locations
     */
    async getAllStoreLocations(filters = {}) {
        const query = { ...filters };

        // Remove the default filter that hides disabled locations
        // Now it returns all locations unless 'disabled' is explicitly specified in filters

        const storeLocations = await StoreLocation.find(query).sort({
            name: 1,
        });
        return storeLocations;
    }

    /**
     * Get store location by ID
     * @param {string} id - Store location ID
     * @returns {Promise<Object>} Store location object
     */
    async getStoreLocationById(id) {
        const storeLocation = await StoreLocation.findById(id);

        if (!storeLocation) {
            throw new AppError("Store location not found", 404);
        }

        return storeLocation;
    }

    /**
     * Get store location by address code
     * @param {string} addressCode - Store location address code
     * @returns {Promise<Object>} Store location object
     */
    async getStoreLocationByAddressCode(addressCode) {
        const storeLocation = await StoreLocation.findOne({ addressCode });

        if (!storeLocation) {
            throw new AppError("Store location not found", 404);
        }

        return storeLocation;
    }

    /**
     * Create a new store location
     * @param {Object} storeLocationData - Store location data
     * @returns {Promise<Object>} Created store location
     */
    async createStoreLocation(storeLocationData) {
        const {
            address,
            latitude,
            longitude,
            firstName,
            lastName,
            phoneNumber,
            email,
        } = storeLocationData;

        // Verify address with ShipBubble
        let verificationResult;

        try {
            verificationResult = await shipBubbleService.verifyAddress({
                address,
                latitude,
                longitude,
                firstName,
                lastName,
                phoneNumber,
                email,
            });
        } catch (error) {
            console.log(error.response.data);
            throw new AppError(
                error?.response?.data?.message || "Failed to verify address",
                error?.response?.status,
            );
        }

        const {
            address_code: addressCode,
            city,
            state,
            country,
            postal_code: postalCode,
        } = verificationResult;

        // Check if store location with this address code already exists
        const existingLocation = await StoreLocation.findOne({
            addressCode,
        });

        if (existingLocation) {
            throw new AppError(
                "Store location with this address code already exists",
                400,
            );
        }

        const storeLocation = new StoreLocation({
            ...storeLocationData,
            addressCode,
            city,
            state,
            country,
            postalCode,
        });
        await storeLocation.save();

        return storeLocation;
    }

    /**
     * Update store location
     * @param {string} id - Store location ID
     * @param {Object} updateData - Data to update
     * @returns {Promise<Object>} Updated store location
     */
    async updateStoreLocation(id, updateData) {
        let dataToUpdate = { ...updateData };

        // If address or coordinates are being updated, we need to re-verify with ShipBubble
        // We need all three (address, lat, long) for verification.
        // If only some are provided in updateData, we might need to fetch the existing ones from DB?
        // However, usually for an address update, the frontend should send the new address and its coordinates.
        // Let's assume if any of these are present, we re-verify. Even better if we check presence.

        if (
            updateData.address ||
            updateData.latitude !== undefined ||
            updateData.longitude !== undefined
        ) {
            // Check if we have all necessary fields in updateData, if not fetch from DB
            let {
                address,
                latitude,
                longitude,
                firstName,
                lastName,
                phoneNumber,
                email,
            } = updateData;

            if (
                !address ||
                latitude === undefined ||
                longitude === undefined ||
                !firstName ||
                !lastName ||
                !phoneNumber ||
                !email
            ) {
                const currentLoc = await StoreLocation.findById(id);
                if (!currentLoc) {
                    throw new AppError("Store location not found", 404);
                }
                if (!address) address = currentLoc.address;
                if (latitude === undefined) latitude = currentLoc.latitude;
                if (longitude === undefined) longitude = currentLoc.longitude;

                if (!firstName) firstName = currentLoc.firstName;
                if (!lastName) lastName = currentLoc.lastName;
                if (!phoneNumber) phoneNumber = currentLoc.phoneNumber;
                if (!email) email = currentLoc.email;
            }

            const verificationResult = await shipBubbleService.verifyAddress({
                address,
                latitude,
                longitude,
                firstName,
                lastName,
                phoneNumber,
                email,
            });

            const {
                address_code: addressCode,
                city,
                state,
                country,
                postal_code: postalCode,
            } = verificationResult;

            dataToUpdate = {
                ...dataToUpdate,
                addressCode,
                city,
                state,
                country,
                postalCode,
                // Ensure the address/lat/long used for verification are the ones saved
                address,
                latitude,
                longitude,
            };
        } else if (
            updateData.firstName ||
            updateData.lastName ||
            updateData.phoneNumber ||
            updateData.email
        ) {
            const currentLoc = await StoreLocation.findById(id);

            if (!currentLoc) {
                throw new AppError("Store location not found", 404);
            }

            const addressCode = currentLoc.addressCode;

            if (addressCode) {
                const firstName = updateData.firstName || currentLoc.firstName;
                const lastName = updateData.lastName || currentLoc.lastName;
                const email = updateData.email || currentLoc.email;
                const phoneNumber =
                    updateData.phoneNumber || currentLoc.phoneNumber;

                const name =
                    firstName && lastName
                        ? `${firstName} ${lastName}`
                        : "Mr. Okey Igbonagwam";

                await shipBubbleService.updateAddressDetails(addressCode, {
                    name,
                    email,
                    phone: phoneNumber,
                });
            }
        }

        const storeLocation = await StoreLocation.findByIdAndUpdate(
            id,
            dataToUpdate,
            { new: true, runValidators: true },
        );

        if (!storeLocation) {
            throw new AppError("Store location not found", 404);
        }

        return storeLocation;
    }

    /**
     * Delete store location (soft delete by setting disabled to true)
     * @param {string} id - Store location ID
     * @returns {Promise<Object>} Updated store location
     */
    async deleteStoreLocation(id) {
        const storeLocation = await StoreLocation.findByIdAndUpdate(
            id,
            { disabled: true },
            { new: true },
        );

        if (!storeLocation) {
            throw new AppError("Store location not found", 404);
        }

        return storeLocation;
    }

    /**
     * Get enabled store locations only
     * @returns {Promise<Array>} Array of enabled store locations
     */
    async getEnabledStoreLocations() {
        return await this.getAllStoreLocations({ disabled: false });
    }
}

export default new StoreLocationService();
