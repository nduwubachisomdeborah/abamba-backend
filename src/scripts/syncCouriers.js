import shipBubbleService from "../services/shiping/shipbubble.service.js";
import CourierService from "../models/courierService.model.js";

export async function syncCouriers() {
    try {
        console.log("Starting courier sync...");

        const couriers = await shipBubbleService.getCouriers();
        console.log(`Found ${couriers.length} couriers from API.`);

        let addedCount = 0;
        for (const courier of couriers) {
            const exists = await CourierService.exists({
                service_code: courier.service_code,
            });

            if (!exists) {
                await CourierService.create({
                    name: courier.name,
                    service_code: courier.service_code,
                    pin_image: courier.pin_image,
                    origin_country: courier.origin_country,
                    international: courier.international,
                    domestic: courier.domestic,
                    on_demand: courier.on_demand,
                    package_categories: courier.package_categories,
                    enabled: true,
                });
                console.log(
                    `Added new courier: ${courier.name} (${courier.service_code})`
                );
                addedCount++;
            }
        }

        if (addedCount > 0) {
            console.log(`Sync complete. Added ${addedCount} new couriers.`);
        } else {
            console.log("Sync complete. No new couriers to add.");
        }
    } catch (error) {
        console.error("Error syncing couriers:", error);
    }
}
