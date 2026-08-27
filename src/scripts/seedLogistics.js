import LogisticsCompany from "../models/logisticsCompany.model.js";
import DispatchTracker from "../models/dispatchTracker.model.js";

export async function seedLogisticsCompanies() {
    try {
        const count = await LogisticsCompany.countDocuments();
        if (count > 0) return;

        const companies = [
            // IMO STATE (3)
            {
                code: "richmond",
                name: "RichmondLogistics",
                email: "richmondoc2@gmail.com",
                phone: "+2348012345671",
                state: "Imo",
                hub: "Owerri Hub",
                pricingType: "location-matrix",
                defaultBasePrice: 3000,
                bankDetails: {
                    bankName: "Zenith Bank",
                    accountNumber: "1012345678",
                    accountName: "Richmond Logistics",
                },
            },
            {
                code: "apex",
                name: "Apexgologisticservices",
                email: "Apexgologisticservices@gmail.com",
                phone: "+2348012345672",
                state: "Imo",
                hub: "Owerri Hub",
                pricingType: "distance-zones",
                defaultBasePrice: 2400,
                bankDetails: {
                    bankName: "Access Bank",
                    accountNumber: "0123456789",
                    accountName: "ApexGo Logistics Services",
                },
            },
            {
                code: "hens",
                name: "HensLogistics",
                email: "cchineduikechukwu@gmail.com",
                phone: "+2348012345673",
                state: "Imo",
                hub: "Owerri Hub",
                pricingType: "location-matrix",
                defaultBasePrice: 3000,
                bankDetails: {
                    bankName: "UBA Bank",
                    accountNumber: "2012345678",
                    accountName: "Hens Logistics",
                },
            },
            // ABIA STATE (2)
            {
                code: "princeswift",
                name: "PrinceswiftLogistics",
                email: "chisomprince722@gmail.com",
                phone: "+2348012345674",
                state: "Abia",
                hub: "Aba Hub",
                pricingType: "distance-zones",
                defaultBasePrice: 3000,
                bankDetails: {
                    bankName: "GTBank",
                    accountNumber: "0212345678",
                    accountName: "PrinceSwift Logistics",
                },
            },
            {
                code: "oksaturday",
                name: "OkSaturdaylogistics",
                email: "sattyugo2@gmail.com",
                phone: "+2348012345675",
                state: "Abia",
                hub: "Aba Hub",
                pricingType: "distance-zones",
                defaultBasePrice: 3000,
                bankDetails: {
                    bankName: "First Bank",
                    accountNumber: "3012345678",
                    accountName: "OkSaturday Dispatch",
                },
            },
        ];

        await LogisticsCompany.insertMany(companies);

        const existingTrackers = await DispatchTracker.find();
        if (existingTrackers.length === 0) {
            await DispatchTracker.create([
                { state: "Imo", currentCompanyIndex: 0, currentTurnCount: 0 },
                { state: "Abia", currentCompanyIndex: 0, currentTurnCount: 0 },
            ]);
        }

        console.log("✅ Seeded 5 Regional Logistics Partners for Imo and Abia");
    } catch (error) {
        console.error("Error seeding logistics companies:", error.message);
    }
}

export default seedLogisticsCompanies;
