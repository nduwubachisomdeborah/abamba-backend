import Joi from "joi";
import validate from "../middlewares/validate.js";

export const updatePlatformSettingsSchema = Joi.object({
    platformName: Joi.string().trim().min(1).max(100).optional(),
    platformUrl: Joi.string().uri().trim().optional(),
    adminEmail: Joi.string().email().trim().optional(),
    supportEmail: Joi.string().email().trim().optional(),
    contactInfo: Joi.string().trim().optional(),
    timeZone: Joi.string().trim().optional(),
    logo: Joi.string().uri().trim().optional().allow(""),
    favicon: Joi.string().uri().trim().optional().allow(""),
    
    // Social Media Links
    socialMedia: Joi.object({
        facebookUrl: Joi.string().uri().trim().optional().allow(""),
        twitterUrl: Joi.string().uri().trim().optional().allow(""),
        linkedinUrl: Joi.string().uri().trim().optional().allow(""),
        instagramUrl: Joi.string().uri().trim().optional().allow(""),
    }).optional(),
    
    // System Preferences
    systemPreferences: Joi.object({
        maintenanceMode: Joi.boolean().optional(),
        userRegistration: Joi.boolean().optional(),
        emailNotification: Joi.boolean().optional(),
        multiLanguageSupport: Joi.boolean().optional(),
    }).optional(),
    
    // Security & Configurations
    security: Joi.object({
        passwordPolicy: Joi.object({
            minimumLength: Joi.number().min(6).max(32).optional(),
            requireSpecialCharacters: Joi.boolean().optional(),
        }).optional(),
        sessionTimeout: Joi.number().min(5).max(1440).optional(),
        twoFactorAuthentication: Joi.boolean().optional(),
    }).optional(),
    
    // Legal Documents
    termsOfUse: Joi.object({
        title: Joi.string().trim().max(200).optional(),
        content: Joi.string().trim().optional().allow(""),
        lastUpdated: Joi.date().optional(),
    }).optional(),
    
    privacyPolicy: Joi.object({
        title: Joi.string().trim().max(200).optional(),
        content: Joi.string().trim().optional().allow(""),
        lastUpdated: Joi.date().optional(),
    }).optional(),
    
    // Contact Us Page
    contactUs: Joi.object({
        heroSection: Joi.object({
            title: Joi.string().trim().max(200).optional(),
            content: Joi.string().trim().optional().allow(""),
        }).optional(),
        storeLocation: Joi.object({
            address: Joi.string().trim().max(500).optional().allow(""),
        }).optional(),
        contactCall: Joi.object({
            phoneNumber1: Joi.string().trim().max(20).optional().allow(""),
            phoneNumber2: Joi.string().trim().max(20).optional().allow(""),
        }).optional(),
        contactEmail: Joi.object({
            email1: Joi.string().email().trim().optional().allow(""),
            email2: Joi.string().email().trim().optional().allow(""),
        }).optional(),
    }).optional(),
    
    // Home Page Banners
    homePage: Joi.object({
        banners: Joi.array()
            .items(
                Joi.object({
                    link: Joi.string().trim().uri().optional().allow(""),
                    bannerUrl: Joi.string().trim().uri().optional().allow(""),
                    order: Joi.number().integer().min(0).optional(),
                    isActive: Joi.boolean().optional(),
                })
            )
            .optional(),
        featuredBanners: Joi.array()
            .items(
                Joi.object({
                    link: Joi.string().trim().uri().optional().allow(""),
                    bannerUrl: Joi.string().trim().uri().optional().allow(""),
                    order: Joi.number().integer().min(0).optional(),
                    isActive: Joi.boolean().optional(),
                })
            )
            .optional(),
    }).optional(),
});

export const validateUpdatePlatformSettings = validate(
    updatePlatformSettingsSchema
);
