import mongoose from "mongoose";

const platformSettingsSchema = new mongoose.Schema(
    {
        // Platform Details
        platformName: {
            type: String,
            trim: true,
            default: "Abamba",
        },
        platformUrl: {
            type: String,
            trim: true,
            default: "https://abamba.com.ng",
        },
        adminEmail: {
            type: String,
            trim: true,
            lowercase: true,
            default: "abambanigeria@gmail.com",
            match: [/^\S+@\S+\.\S+$/, "Please provide a valid email"],
        },
        supportEmail: {
            type: String,
            trim: true,
            lowercase: true,
            default: "Abambasupport@gmail.com",
            match: [/^\S+@\S+\.\S+$/, "Please provide a valid email"],
        },
        contactInfo: {
            type: String,
            trim: true,
            default: "+2348060039760",
        },
        companyAddress: {
            type: String,
            trim: true,
            default: "",
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
            bonusWeekEnabled: {
                type: Boolean,
                default: true,
            },
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
            default: true,
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
                    default: "Contact our support team",
                },
                content: {
                    type: String,
                    trim: true,
                    default: "We're here to help.",
                },
            },
            storeLocation: {
                address: {
                    type: String,
                    trim: true,
                    default: "Nigeria",
                },
            },
            contactCall: {
                phoneNumber1: {
                    type: String,
                    trim: true,
                    default: "+234 806 003 9760",
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
                    default: "abambanigeria@gmail.com",
                },
                email2: {
                    type: String,
                    trim: true,
                    lowercase: true,
                    default: "Abambasupport@gmail.com",
                },
            },
            workingHours: {
                line1: {
                    type: String,
                    trim: true,
                    default: "Mon - Fri  8:00 - 18:00",
                },
                line2: {
                    type: String,
                    trim: true,
                    default: "Sat - Sun  10:00 - 16:00",
                },
            },
            helpCenterUrl: {
                type: String,
                trim: true,
                default: "http://wa.me/2348060039760",
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

// Sync isBonusEventActive and systemPreferences.bonusWeekEnabled on save
platformSettingsSchema.pre("save", function (next) {
    if (this.systemPreferences?.bonusWeekEnabled !== undefined) {
        this.isBonusEventActive = this.systemPreferences.bonusWeekEnabled;
    } else if (this.isBonusEventActive !== undefined) {
        if (!this.systemPreferences) this.systemPreferences = {};
        this.systemPreferences.bonusWeekEnabled = this.isBonusEventActive;
    }
    next();
});

// Ensure only one platform settings document exists
platformSettingsSchema.statics.getInstance = async function () {
    let settings = await this.findOne();
    if (!settings) {
        settings = await this.create({
            adminEmail: "abambanigeria@gmail.com",
            supportEmail: "Abambasupport@gmail.com",
            systemPreferences: { bonusWeekEnabled: true },
        });
    }
    return settings;
};

const PlatformSettings = mongoose.model(
    "PlatformSettings",
    platformSettingsSchema
);

export default PlatformSettings;
