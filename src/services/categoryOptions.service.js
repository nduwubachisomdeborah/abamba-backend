import CategoryOption from "../models/categoryOptions.model.js";
import { AppError } from "../middlewares/error.js";

/**
 * Default category options to seed if none exist
 */
const defaultCategoryOptions = {
    Electronics: [
        {
            id: "color",
            name: "Color",
            values: ["Black", "Silver", "White"],
            type: "color",
            immutable: true,
        },
        {
            id: "storage",
            name: "Storage Capacity",
            values: ["64GB", "128GB", "256GB"],
            type: "dropdown",
        },
        {
            id: "connectivity",
            name: "Connectivity",
            values: ["WiFi", "Bluetooth"],
            type: "dropdown",
        },
    ],

    Clothing: [
        {
            id: "color",
            name: "Color",
            values: ["Red", "Blue", "Green", "Black"],
            type: "color",
            immutable: true,
        },
        {
            id: "size",
            name: "Size",
            values: ["XS", "S", "M", "L", "XL"],
            type: "dropdown",
            immutable: true,
        },
        {
            id: "material",
            name: "Material",
            values: ["Cotton", "Polyester", "Wool"],
            type: "dropdown",
        },
    ],

    Furniture: [
        {
            id: "finish",
            name: "Finish",
            values: ["Oak", "Walnut", "Espresso"],
            type: "dropdown",
        },
        {
            id: "upholstery",
            name: "Upholstery",
            values: ["Leather", "Fabric"],
            type: "dropdown",
        },
        {
            id: "style",
            name: "Style",
            values: ["Modern", "Traditional"],
            type: "dropdown",
        },
    ],

    Books: [
        {
            id: "format",
            name: "Format",
            values: ["Hardcover", "Paperback", "eBook"],
            type: "dropdown",
        },
        {
            id: "language",
            name: "Language",
            values: ["English", "Spanish", "French"],
            type: "dropdown",
        },
        {
            id: "edition",
            name: "Edition",
            values: ["1st", "2nd", "Collector's"],
            type: "dropdown",
        },
    ],

    Food: [
        {
            id: "flavor",
            name: "Flavor",
            values: ["Original", "Spicy", "Sweet"],
            type: "dropdown",
        },
        {
            id: "size",
            name: "Package Size",
            values: ["100g", "250g", "500g"],
            type: "dropdown",
        },
        {
            id: "organic",
            name: "Organic",
            values: ["Yes", "No"],
            type: "dropdown",
        },
    ],
};

class CategoryOptionsService {
    /**
     * Initialize the database with default category options if empty
     */
    async initializeCategoryOptions() {
        try {
            const count = await CategoryOption.countDocuments();
            if (count === 0) {
                console.log("Seeding default category options...");
                const optionsToCreate = Object.entries(
                    defaultCategoryOptions
                ).map(([category, options]) => ({
                    category,
                    options,
                }));

                await CategoryOption.insertMany(optionsToCreate);
                console.log("Default category options seeded successfully");
            }
        } catch (error) {
            console.error("Failed to seed category options:", error);
        }
    }

    /**
     * Get all category options
     * @returns {Promise<Array>} Category options
     */
    async getAllCategoryOptions() {
        // Ensure default options exist
        await this.initializeCategoryOptions();

        const categoryOptions = await CategoryOption.find().sort({
            category: 1,
        });
        return categoryOptions;
    }

    /**
     * Get options for a specific category
     * @param {string} category - Category name
     * @returns {Promise<Object>} Category options
     */
    async getCategoryOptionsByCategory(category) {
        // Ensure default options exist
        await this.initializeCategoryOptions();

        const categoryOptions = await CategoryOption.findOne({ category });

        if (!categoryOptions) {
            throw new AppError(
                `No options found for category: ${category}`,
                404
            );
        }

        return categoryOptions;
    }

    /**
     * Update or create options for a specific category
     * @param {string} category - Category name
     * @param {Array} options - Array of option objects
     * @returns {Promise<Object>} Updated category options
     */
    async updateCategoryOptions(category, options) {
        // Ensure default options exist
        await this.initializeCategoryOptions();

        // Validate category name
        if (
            ![
                "Electronics",
                "Clothing",
                "Furniture",
                "Books",
                "Food",
                "Other",
            ].includes(category)
        ) {
            throw new AppError("Invalid category name", 400);
        }

        // Find existing options
        const existingOptions = await CategoryOption.findOne({ category });

        if (existingOptions) {
            // Update only non-immutable options
            const currentOptions = existingOptions.options || [];
            const updatedOptions = options.map((newOption) => {
                // Check if this option exists and is immutable
                const existingOption = currentOptions.find(
                    (opt) => opt.id === newOption.id
                );
                if (existingOption && existingOption.immutable) {
                    throw new AppError(
                        `Cannot update immutable option: ${newOption.id}`,
                        400
                    );
                }
                return newOption;
            });

            existingOptions.options = updatedOptions;
            await existingOptions.save();
            return existingOptions;
        } else {
            // Create new category options
            return await CategoryOption.create({ category, options });
        }
    }
}

export default new CategoryOptionsService();
