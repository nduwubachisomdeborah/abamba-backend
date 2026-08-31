import CategoryOption from "../models/categoryOptions.model.js";
import { AppError } from "../middlewares/error.js";

/**
 * Default category options to seed and synchronize
 */
const defaultCategoryOptions = {
    "Gadgets & Accessories": [
        {
            id: "color",
            name: "Color",
            values: ["Black", "Silver", "White", "Gold", "Blue", "Space Grey"],
            type: "color",
            immutable: true,
        },
        {
            id: "storage",
            name: "Storage Capacity",
            values: ["32GB", "64GB", "128GB", "256GB", "512GB", "1TB"],
            type: "dropdown",
        },
        {
            id: "connectivity",
            name: "Connectivity",
            values: ["WiFi", "Bluetooth", "Cellular + WiFi", "USB-C", "Wireless"],
            type: "dropdown",
        },
    ],

    "Jewelries & Accessories": [
        {
            id: "material",
            name: "Material",
            values: [
                "Gold",
                "Silver",
                "Stainless Steel",
                "Brass",
                "Beads",
                "Leather",
                "Pearl",
                "Crystal",
            ],
            type: "dropdown",
        },
        {
            id: "color",
            name: "Color",
            values: [
                "Gold",
                "Silver",
                "Rose Gold",
                "Black",
                "Multi-color",
                "White",
            ],
            type: "color",
            immutable: true,
        },
        {
            id: "gender",
            name: "Gender",
            values: ["Unisex", "Female", "Male"],
            type: "dropdown",
        },
    ],

    "Home Appliances": [
        {
            id: "color",
            name: "Color",
            values: ["Black", "Silver", "White", "Grey", "Red"],
            type: "color",
        },
        {
            id: "power_rating",
            name: "Power / Wattage",
            values: ["500W", "1000W", "1500W", "2000W", "2500W+"],
            type: "dropdown",
        },
        {
            id: "capacity",
            name: "Capacity / Size",
            values: [
                "Small",
                "Medium",
                "Large",
                "Extra Large",
                "1.5L",
                "2L",
                "5L",
                "10L+",
            ],
            type: "dropdown",
        },
    ],

    "Wigs & Human Hair Bundles": [
        {
            id: "length",
            name: "Hair Length (Inches)",
            values: [
                "8 inch",
                "10 inch",
                "12 inch",
                "14 inch",
                "16 inch",
                "18 inch",
                "20 inch",
                "22 inch",
                "24 inch",
                "26 inch",
                "28 inch",
                "30 inch",
                "32 inch",
            ],
            type: "dropdown",
        },
        {
            id: "texture",
            name: "Texture / Type",
            values: [
                "Straight",
                "Body Wave",
                "Deep Wave",
                "Water Wave",
                "Curly",
                "Kinky Curly",
                "Bob",
                "Pixie",
            ],
            type: "dropdown",
        },
        {
            id: "color",
            name: "Color / Shade",
            values: [
                "Natural Black (1B)",
                "Jet Black (1)",
                "Brown (2)",
                "Blonde (613)",
                "Burgundy (99J)",
                "Ombre",
                "Ginger",
            ],
            type: "dropdown",
        },
        {
            id: "density",
            name: "Density",
            values: ["150%", "180%", "200%", "250%"],
            type: "dropdown",
        },
    ],

    "Room Deco & Lightings": [
        {
            id: "color",
            name: "Color / Light Hue",
            values: [
                "Warm White",
                "Cool White",
                "RGB / Multi-Color",
                "Neutral",
                "Sunset Amber",
            ],
            type: "dropdown",
        },
        {
            id: "power_source",
            name: "Power Source",
            values: [
                "Plug-in (AC)",
                "USB Powered",
                "Battery Operated",
                "Solar Powered",
                "Rechargeable",
            ],
            type: "dropdown",
        },
        {
            id: "size",
            name: "Size",
            values: ["Small", "Medium", "Large", "Custom"],
            type: "dropdown",
        },
    ],

    "Hair Care Tools & Styling Accessories": [
        {
            id: "type",
            name: "Tool Type",
            values: [
                "Straightener / Flat Iron",
                "Curling Iron",
                "Hot Comb",
                "Hair Dryer",
                "Brush & Comb",
                "Hair Clips & Bands",
                "Diffuser",
            ],
            type: "dropdown",
        },
        {
            id: "color",
            name: "Color",
            values: ["Black", "Pink", "Purple", "Gold", "White"],
            type: "color",
        },
    ],

    "Bags & Footwears": [
        {
            id: "size",
            name: "Size",
            values: [
                "36",
                "37",
                "38",
                "39",
                "40",
                "41",
                "42",
                "43",
                "44",
                "45",
                "46",
                "Small",
                "Medium",
                "Large",
            ],
            type: "dropdown",
            immutable: true,
        },
        {
            id: "color",
            name: "Color",
            values: [
                "Black",
                "Brown",
                "White",
                "Nude",
                "Red",
                "Blue",
                "Green",
                "Pink",
            ],
            type: "color",
            immutable: true,
        },
        {
            id: "material",
            name: "Material",
            values: [
                "Leather",
                "Suede",
                "Canvas",
                "Patent Leather",
                "Fabric",
                "Rubber",
            ],
            type: "dropdown",
        },
    ],

    "Skin Care & Cosmetics": [
        {
            id: "skin_type",
            name: "Skin Type",
            values: [
                "All Skin Types",
                "Oily Skin",
                "Dry Skin",
                "Combination",
                "Sensitive Skin",
            ],
            type: "dropdown",
        },
        {
            id: "volume",
            name: "Volume / Net Weight",
            values: [
                "30ml",
                "50ml",
                "100ml",
                "150ml",
                "200ml",
                "250ml",
                "500ml",
                "100g",
                "200g",
            ],
            type: "dropdown",
        },
        {
            id: "shade",
            name: "Shade / Tone",
            values: [
                "Fair",
                "Light",
                "Medium",
                "Tan",
                "Rich / Deep",
                "Dark",
                "Translucent",
            ],
            type: "dropdown",
        },
    ],

    "Perfumes & Deodorants": [
        {
            id: "volume",
            name: "Bottle Volume",
            values: [
                "10ml (Oil/Pocket)",
                "30ml",
                "50ml",
                "100ml",
                "150ml",
                "200ml",
                "250ml (Body Spray)",
            ],
            type: "dropdown",
        },
        {
            id: "fragrance_type",
            name: "Fragrance Type",
            values: [
                "Eau De Parfum (EDP)",
                "Eau De Toilette (EDT)",
                "Body Mist / Spray",
                "Perfume Oil",
                "Roll-on Deodorant",
                "Antiperspirant Stick",
            ],
            type: "dropdown",
        },
        {
            id: "scent_profile",
            name: "Scent Profile",
            values: [
                "Floral",
                "Woody",
                "Oud / Oriental",
                "Fresh & Citrus",
                "Sweet & Fruity",
                "Spicy",
                "Vanilla",
            ],
            type: "dropdown",
        },
    ],

    "Dental Care": [
        {
            id: "type",
            name: "Product Type",
            values: [
                "Toothpaste",
                "Toothbrush (Manual)",
                "Electric Toothbrush",
                "Mouthwash",
                "Teeth Whitening",
                "Dental Floss",
            ],
            type: "dropdown",
        },
        {
            id: "pack_size",
            name: "Pack Size",
            values: ["Single Pack", "Pack of 2", "Pack of 3", "Family Pack (4+)"],
            type: "dropdown",
        },
    ],

    "Foodstuffs & Medication": [
        {
            id: "size",
            name: "Package Weight / Size",
            values: [
                "100g",
                "250g",
                "500g",
                "1kg",
                "2kg",
                "5kg",
                "10kg",
                "25kg",
                "50kg",
                "1 Paint Bucket",
                "1 Bag",
            ],
            type: "dropdown",
        },
        {
            id: "type",
            name: "Form / Type",
            values: [
                "Raw / Grains",
                "Dried / Smoked",
                "Powder / Spices",
                "Oils & Liquids",
                "Packaged / Canned",
                "Tablets / Capsules",
                "Syrup",
            ],
            type: "dropdown",
        },
        {
            id: "storage",
            name: "Storage Requirement",
            values: [
                "Room Temperature",
                "Keep Refrigerated",
                "Keep Frozen",
                "Cool & Dry Place",
            ],
            type: "dropdown",
        },
    ],

    "School Items & Stationery": [
        {
            id: "format",
            name: "Item Type",
            values: [
                "Notebook / Higher Education",
                "Textbook",
                "Writing Utensils (Pen/Pencil)",
                "Art & Drawing Materials",
                "Backpack & Bag",
                "Calculator & Math Set",
                "Office Stationery",
            ],
            type: "dropdown",
        },
        {
            id: "pack_size",
            name: "Pack Quantity",
            values: [
                "1 Piece",
                "Pack of 3",
                "Pack of 6",
                "Pack of 12 (Dozen)",
                "Carton",
            ],
            type: "dropdown",
        },
    ],

    "Clothing & Underwears": [
        {
            id: "size",
            name: "Size",
            values: ["XS", "S", "M", "L", "XL", "XXL", "3XL", "Free Size"],
            type: "dropdown",
            immutable: true,
        },
        {
            id: "color",
            name: "Color",
            values: [
                "Red",
                "Blue",
                "Green",
                "Black",
                "White",
                "Grey",
                "Navy",
                "Multi-color",
                "Nude",
            ],
            type: "color",
            immutable: true,
        },
        {
            id: "material",
            name: "Material",
            values: [
                "Cotton",
                "Polyester",
                "Silk / Satin",
                "Lace",
                "Denim",
                "Wool",
                "Spandex / Elastane",
            ],
            type: "dropdown",
        },
    ],

    "Ankara Materials & Styling": [
        {
            id: "yards",
            name: "Yard Quantity",
            values: [
                "3 Yards",
                "6 Yards",
                "Complete Piece (12 Yards)",
                "Ready to Wear",
            ],
            type: "dropdown",
        },
        {
            id: "fabric_type",
            name: "Fabric Type",
            values: [
                "100% Cotton Ankara",
                "Wax Print",
                "Hollandis / Dutch Wax",
                "Lace / Brocade Combination",
                "Silk Ankara",
            ],
            type: "dropdown",
        },
        {
            id: "primary_color",
            name: "Primary Color",
            values: [
                "Multi-Color",
                "Blue",
                "Red",
                "Yellow / Orange",
                "Green",
                "Purple",
                "Brown / Earthy",
                "Black / Monochrome",
            ],
            type: "dropdown",
        },
    ],

    Furniture: [
        {
            id: "finish",
            name: "Finish",
            values: [
                "Oak",
                "Walnut",
                "Espresso",
                "Mahogany",
                "White Gloss",
                "Matte Black",
            ],
            type: "dropdown",
        },
        {
            id: "upholstery",
            name: "Upholstery",
            values: [
                "Leather",
                "Fabric",
                "Velvet",
                "Mesh",
                "Faux Leather",
            ],
            type: "dropdown",
        },
        {
            id: "style",
            name: "Style",
            values: [
                "Modern",
                "Traditional",
                "Minimalist",
                "Industrial",
                "Luxury",
            ],
            type: "dropdown",
        },
    ],

    Other: [
        {
            id: "type",
            name: "Type / Specification",
            values: ["Standard", "Custom"],
            type: "dropdown",
        },
        {
            id: "size",
            name: "Size",
            values: ["Small", "Medium", "Large", "One Size"],
            type: "dropdown",
        },
    ],
};

class CategoryOptionsService {
    /**
     * Initialize or update category options in database
     */
    async initializeCategoryOptions() {
        try {
            // Old to new category name migrations
            const migrations = {
                electronics: "gadgets & accessories",
                food: "foodstuffs & medication",
                books: "school items & stationery",
                clothing: "clothing & underwears",
            };

            for (const [oldCat, newCat] of Object.entries(migrations)) {
                const oldDoc = await CategoryOption.findOne({ category: oldCat });
                if (oldDoc) {
                    const existsNew = await CategoryOption.findOne({ category: newCat });
                    if (!existsNew) {
                        oldDoc.category = newCat;
                        await oldDoc.save();
                    } else {
                        await CategoryOption.deleteOne({ _id: oldDoc._id });
                    }
                }
            }

            // Sync and upsert all default category options
            for (const [category, options] of Object.entries(defaultCategoryOptions)) {
                const normalizedCategory = category.trim().toLowerCase();
                await CategoryOption.findOneAndUpdate(
                    { category: normalizedCategory },
                    {
                        $set: {
                            category: normalizedCategory,
                            options,
                            approved: true,
                        },
                    },
                    { upsert: true, new: true }
                );
            }

            // Ensure any custom or legacy category in database is also marked approved
            await CategoryOption.updateMany({}, { $set: { approved: true } });
        } catch (error) {
            console.error("Failed to seed/sync category options:", error);
        }
    }

    /**
     * Get all category options
     * @returns {Promise<Array>} Category options
     */
    async getAllCategoryOptions() {
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
        await this.initializeCategoryOptions();

        const normalizedCategory = category?.trim().toLowerCase();
        const categoryOptions = await CategoryOption.findOne({
            category: normalizedCategory,
        });

        if (!categoryOptions) {
            return {
                category: normalizedCategory,
                options: [
                    {
                        id: "type",
                        name: "Type",
                        values: ["Standard"],
                        type: "dropdown",
                    },
                ],
                approved: true,
            };
        }

        return categoryOptions;
    }

    /**
     * Create / Add a new category option dynamically
     * @param {string} categoryName - Name of category
     * @param {Array} options - Array of options
     * @param {string|null} userId - User ID of creator
     * @returns {Promise<Object>} Created or existing category option document
     */
    async createCategoryOption(categoryName, options = [], userId = null) {
        if (!categoryName || typeof categoryName !== "string" || !categoryName.trim()) {
            throw new AppError("Category name is required", 400);
        }

        const normalizedCategory = categoryName.trim().toLowerCase();

        let existing = await CategoryOption.findOne({
            category: normalizedCategory,
        });

        if (existing) {
            if (options && options.length > 0 && (!existing.options || existing.options.length === 0)) {
                existing.options = options;
                await existing.save();
            }
            return existing;
        }

        const newCategoryOption = await CategoryOption.create({
            category: normalizedCategory,
            options: options || [],
            approved: true,
            user: userId,
        });

        return newCategoryOption;
    }

    /**
     * Update or create options for a specific category
     * @param {string} category - Category name
     * @param {Array} options - Array of option objects
     * @returns {Promise<Object>} Updated category options
     */
    async updateCategoryOptions(category, options) {
        if (!category || typeof category !== "string" || !category.trim()) {
            throw new AppError("Invalid category name", 400);
        }

        const normalizedCategory = category.trim().toLowerCase();

        const existingOptions = await CategoryOption.findOne({
            category: normalizedCategory,
        });

        if (existingOptions) {
            const currentOptions = existingOptions.options || [];
            const updatedOptions = options.map((newOption) => {
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
            return await CategoryOption.create({
                category: normalizedCategory,
                options,
                approved: true,
            });
        }
    }
}

export default new CategoryOptionsService();
