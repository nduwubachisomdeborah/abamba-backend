import mongoose from "mongoose";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import userCache from "../utils/userCache.js";

// Address schema for user addresses
const addressSchema = new mongoose.Schema(
    {
        fullName: {
            type: String,
            trim: true,
        },
        addressLine1: {
            type: String,
            required: [true, "Address line 1 is required"],
            trim: true,
        },
        addressLine2: {
            type: String,
            trim: true,
        },
        city: {
            type: String,
            required: [true, "City is required"],
            trim: true,
        },
        state: {
            type: String,
            required: [true, "State is required"],
            trim: true,
        },
        zipCode: {
            type: String,
            trim: true,
        },
        country: {
            type: String,
            default: "NG",
            trim: true,
        },
        phoneNumber: {
            type: String,
            trim: true,
        },
        isDefault: {
            type: Boolean,
            default: false,
        },
        coordinates: {
            type: {
                required: false,
                type: String,
                enum: ["Point"],
                default: "Point",
            },
            coordinates: {
                type: [Number], // [longitude, latitude]
                default: [0, 0],
            },
            lastUpdated: {
                type: Date,
                default: Date.now,
            },
        },
    },
    { _id: true, timestamps: true },
);

const businessSchema = new mongoose.Schema({
    approved: {
        type: Boolean,
        default: false,
    },
    message: {
        type: String,
        default: "",
        trim: true,
        maxlength: 500,
    },
    businessName: {
        type: String,
        required: [true, "Please provide your business name"],
        trim: true,
    },
    businessType: {
        type: String,
        required: [true, "Please provide your business type"],
        trim: true,
    },
    businessAddress: {
        type: addressSchema,
        required: [true, "Please provide your business address"],
    },
    businessPhone: {
        type: String,
        required: [true, "Please provide your business phone number"],
        trim: true,
    },
    businessEmail: {
        type: String,
        required: [true, "Please provide your business email"],
        unique: false,
        lowercase: true,
        match: [
            /^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/,
            "Please provide a valid email",
        ],
    },
    documentType: {
        type: String,
        required: [true, "Please provide your document type"],
        trim: true,
    },
    personalDocument: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "File",
        default: null,
    },
    businessDocument: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "File",
        default: null,
    },
    storeLocation: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "StoreLocation",
        default: null,
    },
});

const bankSchema = new mongoose.Schema({
    verified: {
        type: Boolean,
        default: false,
    },
    bankName: {
        type: String,
        trim: true,
    },
    accountNumber: {
        type: String,
        trim: true,
    },
    accountName: {
        type: String,
        trim: true,
    },
    bankCode: {
        type: String,
        trim: true,
    },
    bvn: {
        type: String,
        trim: true,
        select: false,
    },
    bvnPlaceholder: {
        type: String,
        trim: true,
        default: "",
    },
    transferId: {
        type: String,
        trim: true,
        select: false,
    },
});

const userSchema = new mongoose.Schema(
    {
        name: {
            type: String,
            required: [true, "Please provide your name"],
            trim: true,
        },
        title: {
            type: String,
            trim: true,
            select: false,
        },
        email: {
            type: String,
            required: [true, "Please provide your email"],
            unique: false,
            lowercase: true,
            match: [
                /^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/,
                "Please provide a valid email",
            ],
        },
        phoneNumber: {
            type: String,
            trim: true,
            match: [
                /^(\+?[0-9]{10,15}|google_[0-9]+)$/, // Allow Google placeholder format
                "Please provide a valid phone number",
            ],
        },
        password: {
            type: String,
            required: [
                function () {
                    // Password is required unless the user signed up with Google
                    return !this.googleId;
                },
                "Please provide a password",
            ],
            minlength: [8, "Password must be at least 8 characters long"],
            select: false, // Don't return password in queries
        },
        googleId: {
            type: String,
            unique: true,
            sparse: true, // Allows null values and enforces uniqueness only for non-null values
        },
        profilePicture: {
            type: String,
            default: null,
        },
        role: {
            type: String,
            enum: ["user", "buyer", "seller", "admin"],
            default: "user",
        },
        roles: {
            type: [String],
            enum: ["user", "buyer", "seller", "admin", "superAdmin"],
            default: ["buyer"],
        },
        wallet: {
            balance: {
                type: Number,
                default: 0,
                description: "Current balance",
            },
            pendingBalance: {
                type: Number,
                default: 0,
                description: "Pending balance",
            },
            holdBalance: {
                type: Number,
                default: 0,
                description: "Balance on hold",
            },
        },
        passwordChangedAt: Date,
        passwordResetToken: String,
        passwordResetExpires: Date,
        active: {
            type: Boolean,
            default: true,
            select: false, // Don't return active status in queries
        },
        otp: {
            code: {
                type: String,
                select: false,
            },
            expiresAt: {
                type: Date,
                select: false,
            },
            verified: {
                type: Boolean,
                default: false,
            },
            attempts: {
                type: Number,
                default: 0,
            },
        },
        dob: {
            type: String, // DD/MM/YYYY
            default: null,
        },
        addresses: [addressSchema],
        business: {
            type: businessSchema,
            default: null,
            select: false,
        },
        bank: {
            type: bankSchema,
            default: null,
            select: false,
        },
        isGuest: {
            type: Boolean,
            default: false,
        },
        lastLoginAt: {
            type: Date,
            default: Date.now,
        },
        deleted: {
            type: Boolean,
            default: false,
        },
        deletedAt: {
            type: Date,
            default: null,
        },
        suspended: {
            type: Boolean,
            default: false,
        },
    },
    {
        timestamps: true,
    },
);

// Add index for faster queries
userSchema.index({ "addresses.coordinates": "2dsphere" });

// Automatically delete abandoned guest accounts after 7 days
userSchema.index(
    { createdAt: 1 },
    {
        expireAfterSeconds: 7 * 24 * 60 * 60, // 7 days in seconds
        partialFilterExpression: { isGuest: true },
    },
);

// Hash password before saving
// Add active field to schema
userSchema.add({
    active: {
        type: Boolean,
        default: true,
        select: false, // Don't include in query results by default
    },
    disabledAt: {
        type: Date,
    },
    disabledBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
    },
    disabledReason: {
        type: String,
        trim: true,
    },
});

userSchema.pre("updateOne", async function (next) {
    const update = this.getUpdate();

    // Check if bank.bvn is being updated
    if (update.$set?.bank?.bvn) {
        const bvn = update.$set.bank.bvn;
        update.$set.bank.bvnPlaceholder =
            bvn.length > 4
                ? bvn[0] + "*".repeat(bvn.length - 3) + bvn.slice(-2)
                : bvn; // If BVN is too short, return as is
    } else if (update.bank?.bvn) {
        // For direct updates
        const bvn = update.bank.bvn;
        update.bank.bvnPlaceholder =
            bvn.length > 4
                ? bvn[0] + "*".repeat(bvn.length - 3) + bvn.slice(-2)
                : bvn; // If BVN is too short, return as is
    }

    next();
});

// Invalidate cache after document updates
userSchema.post("updateOne", async function () {
    const docId = this.getQuery()._id;
    if (docId) {
        userCache.invalidate(docId.toString());
    }
});

// Handle findOneAndUpdate operations
userSchema.post("findOneAndUpdate", async function (doc) {
    if (doc && doc._id) {
        userCache.invalidate(doc._id.toString());
    }
});

// Handle updateMany operations
userSchema.post("updateMany", async function () {
    // Since updateMany could affect multiple documents,
    // we can't target specific cache entries
    // This would require a more sophisticated cache invalidation strategy
    // For simplicity, we're not handling this case
});

userSchema.pre("save", async function (next) {
    // Only hash the password if it has been modified (or is new)
    if (!this.isModified("password")) {
        return next();
    }

    // Hash password with cost of 12
    this.password = await bcrypt.hash(this.password, 12);
    next();
});

// Update passwordChangedAt when password is changed
userSchema.pre("save", function (next) {
    if (!this.isModified("password") || this.isNew) {
        return next();
    }

    // Set passwordChangedAt to current time minus 1 second
    // This ensures the token is created after the password has been changed
    this.passwordChangedAt = Date.now() - 1000;
    next();
});

// Invalidate cache when user is saved (new or updated)
userSchema.post("save", function () {
    userCache.invalidate(this._id.toString());
});

// Check if password is correct
userSchema.methods.correctPassword = async function (candidatePassword) {
    return await bcrypt.compare(candidatePassword, this.password);
};

// Check if password was changed after token was issued
userSchema.methods.passwordChangedAfter = function (JWTTimestamp) {
    if (this.passwordChangedAt) {
        const changedTimestamp = parseInt(
            this.passwordChangedAt.getTime() / 1000,
            10,
        );
        return JWTTimestamp < changedTimestamp;
    }

    // False means NOT changed
    return false;
};

// Generate JWT token
userSchema.methods.generateAuthToken = function () {
    return jwt.sign(
        {
            id: this._id,
            role: this.role,
            roles: this.roles || [this.role],
        },
        process.env.JWT_SECRET,
        {
            expiresIn: process.env.JWT_EXPIRES_IN,
        }
    );
};

const User = mongoose.model("User", userSchema);

export default User;
