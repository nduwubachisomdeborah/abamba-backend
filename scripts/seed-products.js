import mongoose from "mongoose";
import dotenv from "dotenv";
import { dirname } from "path";
import { fileURLToPath } from "url";

// Load environment variables
dotenv.config();

// ES module paths
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Import models
import Product from "../src/models/product.model.js";
import User from "../src/models/user.model.js";
import CategoryOption from "../src/models/categoryOptions.model.js";

// MongoDB connection
mongoose
    .connect(
        "mongodb://abamba:HzfJuQcNNn1@130.185.118.226:27018/abamba?authSource=admin" ||
            process.env.MONGODB_URI
    )
    .then(() => console.log("✅ Connected to MongoDB"))
    .catch((err) => {
        console.error("❌ MongoDB connection error:", err);
        process.exit(1);
    });

// API configuration
const DUMMYJSON_API_BASE = "https://dummyjson.com";
const PRODUCTS_PER_BATCH = 30; // DummyJSON returns 30 products per request

// Category mapping from DummyJSON to your database categories
const CATEGORY_MAPPING = {
    beauty: "beauty",
    fragrances: "beauty",
    furniture: "furniture",
    groceries: "food",
    "home-decoration": "furniture",
    "kitchen-accessories": "furniture",
    laptops: "electronics",
    "mens-shirts": "clothing",
    "mens-shoes": "clothing",
    "mens-watches": "electronics",
    "mobile-accessories": "electronics",
    motorcycle: "electronics",
    "skin-care": "beauty",
    smartphones: "electronics",
    "sports-accessories": "other",
    sunglasses: "other",
    tablets: "electronics",
    tops: "clothing",
    vehicle: "electronics",
    "womens-bags": "clothing",
    "womens-dresses": "clothing",
    "womens-jewellery": "other",
    "womens-shoes": "clothing",
    "womens-watches": "electronics",
};

// Fetch products from DummyJSON API
const fetchProductsFromAPI = async (skip = 0, limit = 30) => {
    try {
        const response = await fetch(
            `${DUMMYJSON_API_BASE}/products?limit=${limit}&skip=${skip}`
        );
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        const data = await response.json();
        return data;
    } catch (error) {
        console.error("Error fetching products from API:", error);
        throw error;
    }
};

// Ensure categories exist in database
const ensureCategoriesExist = async () => {
    const uniqueCategories = [...new Set(Object.values(CATEGORY_MAPPING))];

    for (const category of uniqueCategories) {
        const existingCategory = await CategoryOption.findOne({ category });
        if (!existingCategory) {
            await CategoryOption.create({
                category,
                options: [
                    {
                        id: "color",
                        name: "Color",
                        values: [
                            "Red",
                            "Blue",
                            "Green",
                            "Black",
                            "White",
                            "Yellow",
                        ],
                        type: "color",
                    },
                    {
                        id: "size",
                        name: "Size",
                        values: ["XS", "S", "M", "L", "XL", "XXL"],
                        type: "dropdown",
                    },
                ],
            });
            console.log(`✅ Created category: ${category}`);
        }
    }
};

const createDefaultSeller = async () => {
    const email = "seller@example.com";
    let seller = await User.findOne({
        role: "seller",
        email: "zek.tech24@gmail.com",
    });

    if (!seller) {
        seller = await User.create({
            name: "Default Seller",
            email,
            phoneNumber: "+1234567890",
            password: "password123", // Will be hashed by pre-save hook
            role: "seller",
        });
        console.log("✅ Created default seller");
    } else {
        console.log("ℹ️ Default seller already exists");
    }

    return seller;
};

// Convert API product data to your Product model format
const createProductFromAPI = (apiProduct, sellerId) => {
    const basePrice = apiProduct.price * 100;
    const promoPrice =
        apiProduct.discountPercentage > 0
            ? basePrice * (1 - apiProduct.discountPercentage / 100)
            : null;

    // Map API category to your database category
    const mappedCategory = CATEGORY_MAPPING[apiProduct.category] || "other";

    // Create variants from the API data
    const variants = [];
    if (apiProduct.tags && apiProduct.tags.length > 0) {
        // Create 2-3 variants with different attributes
        const colors = ["Red", "Blue", "Black", "White"];
        const sizes = ["S", "M", "L", "XL"];

        for (let i = 0; i < Math.min(3, colors.length); i++) {
            variants.push({
                attributes: new Map([
                    ["color", colors[i]],
                    ["size", sizes[i % sizes.length]],
                ]),
                price: basePrice + i * 5, // Slight price variation
                promoPrice: promoPrice ? promoPrice + i * 5 : null,
                quantity: Math.floor(Math.random() * 50) + 10,
                weight: apiProduct.weight || 1,
                sku: `${apiProduct.sku}-${colors[i].toUpperCase()}`,
                images: apiProduct.images
                    ? apiProduct.images.slice(0, 3).map((url, idx) => ({
                          url,
                          altText: `${apiProduct.title} - ${
                              colors[i]
                          } variant image ${idx + 1}`,
                      }))
                    : [],
                inStock: true,
            });
        }
    }

    return new Product({
        name: apiProduct.title,
        description: apiProduct.description,
        basePrice,
        promoPrice,
        weight: apiProduct.weight || 1,
        quantity: apiProduct.stock || 0,
        category: mappedCategory,
        brand: apiProduct.brand || "Unknown",
        rating: apiProduct.rating || 0,
        numReviews: Math.floor(Math.random() * 100),
        featured: Math.random() > 0.8, // 20% chance of being featured
        images: apiProduct.images
            ? apiProduct.images.map((url, idx) => ({
                  url,
                  altText: `${apiProduct.title} image ${idx + 1}`,
              }))
            : [],
        variants,
        hasVariants: variants.length > 0,
        user: sellerId,
        approved: true,
        approvedAt: new Date(),
        approvedBy: sellerId,
        onSale: promoPrice !== null,
        status: "approved",
    });
};

const seedProducts = async () => {
    try {
        await Product.deleteMany(); // Clear previous products
        console.log("🗑️ Cleared existing products");

        // Ensure categories exist
        await ensureCategoriesExist();
        console.log("✅ Categories verified/created");

        const seller = await createDefaultSeller();
        console.log("⏳ Fetching products from API and inserting into DB...");

        let totalInserted = 0;
        let skip = 0;
        const limit = PRODUCTS_PER_BATCH;

        // Fetch all available products from DummyJSON API
        while (true) {
            const apiResponse = await fetchProductsFromAPI(skip, limit);

            if (!apiResponse.products || apiResponse.products.length === 0) {
                break; // No more products to fetch
            }

            const productsBatch = [];

            for (const apiProduct of apiResponse.products) {
                try {
                    const product = createProductFromAPI(
                        apiProduct,
                        seller._id
                    );
                    productsBatch.push(product);
                } catch (error) {
                    console.warn(
                        `⚠️ Skipped product ${apiProduct.title}: ${error.message}`
                    );
                }
            }

            if (productsBatch.length > 0) {
                await Product.insertMany(productsBatch);
                totalInserted += productsBatch.length;
                console.log(
                    `✅ Inserted batch: ${productsBatch.length} products (Total: ${totalInserted})`
                );
            }

            skip += limit;

            // If we got fewer products than requested, we've reached the end
            if (apiResponse.products.length < limit) {
                break;
            }

            // Add a small delay to be respectful to the API
            await new Promise((resolve) => setTimeout(resolve, 100));
        }

        console.log(
            `🌱 Seeding complete! Total products inserted: ${totalInserted}`
        );
        process.exit(0);
    } catch (err) {
        console.error("❌ Seeding failed:", err);
        process.exit(1);
    }
};

seedProducts();
