import StoreLocation from "../models/storeLocation.model.js";

const initializeStoreLocations = async () => {
    try {
        console.log("Initializing store locations...");

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
            {
                addressCode: process.env.IMO_SHIPBUBBLE_ADDRESS_CODE || "578579550",
                name: process.env.IMO_SHIPBUBBLE_NAME || "Imo Main Hub",
                address: process.env.IMO_SHIPBUBBLE_ADDRESS || "Owerri, Imo State",
                latitude: Number(process.env.IMO_SHIPBUBBLE_LATITUDE) || 5.4836,
                longitude: Number(process.env.IMO_SHIPBUBBLE_LONGITUDE) || 7.0336,
                city: "Owerri",
                state: "Imo",
                country: "NG",
                disabled: false,
            },
        ];

        for (const loc of defaultStoreLocations) {
            const exists = await StoreLocation.findOne({
                $or: [
                    { state: loc.state, city: loc.city },
                    { name: loc.name },
                    { addressCode: loc.addressCode },
                ],
            });

            if (!exists) {
                await StoreLocation.create(loc);
                console.log(`✅ Seeded store location: ${loc.name} (${loc.state})`);
            }
        }

        console.log("Store locations initialization complete");
    } catch (error) {
        console.error("Failed to initialize store locations:", error);
    }
};

export default initializeStoreLocations;
