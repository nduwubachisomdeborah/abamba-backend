import mongoose from "mongoose";

const platformSettingsSchema = new mongoose.Schema(
    {
        // Platform Details
        platformName: {
            type: String,
            trim: true,
            default: "Your Platform Name",
        },
        platformUrl: {
            type: String,
            trim: true,
            default: "http://example.com",
        },
        adminEmail: {
            type: String,
            trim: true,
            lowercase: true,
            match: [/^\S+@\S+\.\S+$/, "Please provide a valid email"],
        },
        supportEmail: {
            type: String,
            trim: true,
            lowercase: true,
            match: [/^\S+@\S+\.\S+$/, "Please provide a valid email"],
        },
        contactInfo: {
            type: String,
            trim: true,
        },
        timeZone: {
            type: String,
            trim: true,
            default: "UTC (Coordinated Universal Time)",
        },

        // Brand Settings
        logo: {
            type: String,
            trim: true,
        },
        favicon: {
            type: String,
            trim: true,
        },

        // Social Media Links
        socialMedia: {
            facebookUrl: {
                type: String,
                trim: true,
            },
            twitterUrl: {
                type: String,
                trim: true,
            },
            linkedinUrl: {
                type: String,
                trim: true,
            },
            instagramUrl: {
                type: String,
                trim: true,
            },
        },

        // System Preferences
        systemPreferences: {
            maintenanceMode: {
                type: Boolean,
                default: false,
            },
            userRegistration: {
                type: Boolean,
                default: true,
            },
            emailNotification: {
                type: Boolean,
                default: true,
            },
            multiLanguageSupport: {
                type: Boolean,
                default: false,
            },
        },

        // Global Bonus Week / Promotion Status
        isBonusEventActive: {
            type: Boolean,
            default: false,
        },

        // Security & Configurations
        security: {
            passwordPolicy: {
                minimumLength: {
                    type: Number,
                    default: 8,
                    min: 6,
                    max: 32,
                },
                requireSpecialCharacters: {
                    type: Boolean,
                    default: true,
                },
            },
            sessionTimeout: {
                type: Number,
                default: 30,
                min: 5,
                max: 1440, // 24 hours in minutes
            },
            twoFactorAuthentication: {
                type: Boolean,
                default: false,
            },
        },

        // Legal Documents
        termsOfUse: {
            title: {
                type: String,
                trim: true,
                default: "Terms of Use",
            },
            content: {
                type: String,
                trim: true,
                default: "",
            },
            lastUpdated: {
                type: Date,
            },
        },

        privacyPolicy: {
            title: {
                type: String,
                trim: true,
                default: "Privacy Policy",
            },
            content: {
                type: String,
                trim: true,
                default: "",
            },
            lastUpdated: {
                type: Date,
            },
        },

        // Contact Us Page
        contactUs: {
            heroSection: {
                title: {
                    type: String,
                    trim: true,
                    default: "Contact Us",
                },
                content: {
                    type: String,
                    trim: true,
                    default: "",
                },
            },
            storeLocation: {
                address: {
                    type: String,
                    trim: true,
                    default: "",
                },
            },
            contactCall: {
                phoneNumber1: {
                    type: String,
                    trim: true,
                    default: "",
                },
                phoneNumber2: {
                    type: String,
                    trim: true,
                    default: "",
                },
            },
            contactEmail: {
                email1: {
                    type: String,
                    trim: true,
                    lowercase: true,
                    default: "",
                },
                email2: {
                    type: String,
                    trim: true,
                    lowercase: true,
                    default: "",
                },
            },
        },

        // Home Page Banners
        homePage: {
            banners: [
                {
                    link: {
                        type: String,
                        trim: true,
                        default: "",
                    },
                    bannerUrl: {
                        type: String,
                        trim: true,
                        default: "",
                    },
                    order: {
                        type: Number,
                        default: 0,
                    },
                    isActive: {
                        type: Boolean,
                        default: true,
                    },
                },
            ],
            featuredBanners: [
                {
                    link: {
                        type: String,
                        trim: true,
                        default: "",
                    },
                    bannerUrl: {
                        type: String,
                        trim: true,
                        default: "",
                    },
                    order: {
                        type: Number,
                        default: 0,
                    },
                    isActive: {
                        type: Boolean,
                        default: true,
                    },
                },
            ],
        },
    },
    {
        timestamps: true,
    }
);

// Ensure only one platform settings document exists
platformSettingsSchema.statics.getInstance = async function () {
    let settings = await this.findOne();
    if (!settings) {
        settings = await this.create({});
    }
    return settings;
};

const PlatformSettings = mongoose.model(
    "PlatformSettings",
    platformSettingsSchema
);

export default PlatformSettings;
