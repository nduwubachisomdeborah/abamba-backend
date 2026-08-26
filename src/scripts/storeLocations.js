import StoreLocation from "../models/storeLocation.model.js";

const initializeStoreLocations = async () => {
    try {
        console.log("Initializing store locations...");

        // Only seed when there are no store locations yet
        const count = await StoreLocation.estimatedDocumentCount();
        if (count > 0) {
            console.log(`Store locations already initialized (count=${count}). Skipping seeding.`);
            return;
        }
        const defaultStoreLocations = [
            {
                addressCode: process.env.ABA_SHIPBUBBLE_ADDRESS_CODE || "578579549",
                name: process.env.ABA_SHIPBUBBLE_NAME || "Aba Main Hub",
                address: process.env.ABA_SHIPBUBBLE_ADDRESS || "Aba, Abia State",
                latitude: Number(process.env.ABA_SHIPBUBBLE_LATITUDE) || 5.10658,
                longitude: Number(process.env.ABA_SHIPBUBBLE_LONGITUDE) || 7.36667,
                city: "Aba",
                state: "Abia",
                country: "NG",
                disabled: false,
            },
        ];
        await StoreLocation.insertMany(defaultStoreLocations);
        console.log("Store locations initialization complete");
    } catch (error) {
        console.error("Failed to initialize store locations:", error);
    }
};

export default initializeStoreLocations;
