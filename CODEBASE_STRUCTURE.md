# Node.js Express Backend - Codebase Structure & Architecture Guide

This document provides a comprehensive guide to recreate a Node.js Express backend codebase structure, including architectural patterns, class usage, and essential components.

## Project Overview

A Node.js Express application with MVC architecture designed with features including:

-   User authentication and authorization
-   Resource management
-   Entity relationships
-   Role-based access control
-   User preferences system
-   Feedback and rating system
-   Email notification services

## Directory Structure

```
backend/
├── config/                  # Configuration files
│   ├── db.js                # Database connection
│   ├── logger.js            # Logging configuration
│   ├── auth-provider.js     # Auth provider config
│   └── env.js               # Environment variables
├── rest/                    # REST client test files
│   ├── auth.rest            # Authentication test requests
│   ├── resource1.rest       # Resource 1 test requests
│   ├── resource2.rest       # Resource 2 test requests
│   ├── profile.rest         # Profile test requests
│   └── preferences.rest     # User preferences test requests
├── src/
│   ├── app.js               # Main application entry point
│   ├── server.js            # Server initialization
│   ├── controllers/         # Controller classes
│   │   ├── auth.controller.js
│   │   ├── resource1.controller.js
│   │   ├── resource2.controller.js
│   │   ├── profile.controller.js
│   │   ├── preferences.controller.js
│   │   └── admin.controller.js
│   ├── middlewares/         # Middleware functions
│   │   ├── auth.js          # Authentication & authorization
│   │   ├── error-handler.js # Global error handling
│   │   ├── validator.js     # Input validation middleware
│   │   └── rate-limiter.js  # API rate limiting
│   ├── models/              # Mongoose models
│   │   ├── user.model.js
│   │   ├── resource1.model.js
│   │   ├── resource2.model.js
│   │   ├── relationship.model.js
│   │   ├── preference.model.js
│   │   ├── feedback.model.js
│   │   ├── notification.model.js
│   │   └── activity.model.js
│   ├── routes/              # API routes
│   │   ├── v1/              # API v1 routes
│   │   │   ├── index.js     # Route aggregator
│   │   │   ├── auth.routes.js
│   │   │   ├── resource1.routes.js
│   │   │   ├── resource2.routes.js
│   │   │   ├── profile.routes.js
│   │   │   └── preferences.routes.js
│   │   └── v2/              # API v2 routes (future expansion)
│   ├── services/            # Business logic
│   │   ├── auth.service.js
│   │   ├── resource1.service.js
│   │   ├── resource2.service.js
│   │   ├── profile.service.js
│   │   ├── relationship.service.js
│   │   ├── preference.service.js
│   │   ├── feedback.service.js
│   │   ├── email.service.js
│   │   └── notification.service.js
│   ├── validators/          # Joi validation schemas
│   │   ├── auth.validator.js
│   │   ├── resource1.validator.js
│   │   ├── resource2.validator.js
│   │   ├── preference.validator.js
│   │   └── common.validator.js
│   └── utils/               # Utility functions
│       ├── async-handler.js # Async error handling
│       ├── api-response.js  # Standardized API responses
│       ├── otp.js           # OTP generation and verification
│       ├── jwt.js           # JWT token handling
│       ├── email-templates/ # Email templates (Handlebars)
│       │   ├── otp-verification.hbs
│       │   ├── password-reset.hbs
│       │   └── welcome.hbs
│       └── seed/            # Database seed scripts
├── tests/                   # Unit and integration tests
├── .env.example             # Example environment variables
├── .gitignore               # Git ignore file
├── package.json             # NPM package configuration
└── README.md                # Project documentation
```

## Key NPM Packages

```json
{
    "dependencies": {
        "bcryptjs": "^2.4.3",
        "compression": "^1.7.4",
        "cors": "^2.8.5",
        "dotenv": "^16.3.1",
        "express": "^4.18.2",
        "express-rate-limit": "^7.1.5",
        "firebase-admin": "^12.0.0",
        "handlebars": "^4.7.8",
        "helmet": "^7.1.0",
        "joi": "^17.11.0",
        "jsonwebtoken": "^9.0.2",
        "mongoose": "^8.0.3",
        "morgan": "^1.10.0",
        "multer": "^1.4.5-lts.1",
        "winston": "^3.11.0"
    },
    "devDependencies": {
        "nodemon": "^3.0.2",
        "jest": "^29.7.0",
        "supertest": "^6.3.3"
    }
}
```

## Application Entry Point (src/app.js)

```javascript
import express from "express";
import cors from "cors";
import helmet from "helmet";
import compression from "compression";
import morgan from "morgan";
import rateLimit from "express-rate-limit";
import { connectToDatabase } from "./config/db.js";
import { errorHandler } from "./middlewares/error-handler.js";
import { logger } from "./config/logger.js";
import v1Routes from "./routes/v1/index.js";

// Initialize express app
const app = express();

// Connect to database
connectToDatabase();

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cors());
app.use(helmet());
app.use(compression());
app.use(morgan("dev"));

// Rate limiting
const limiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100, // limit each IP to 100 requests per windowMs
    message: "Too many requests from this IP, please try again later",
});
app.use("/api", limiter);

// API Routes
app.use("/api/v1", v1Routes);

// Health check endpoint
app.get("/health", (req, res) => {
    res.status(200).json({ status: "ok", message: "Server is running" });
});

// Error handling middleware
app.use(errorHandler);

export default app;
```

## Controllers Pattern

Controllers handle HTTP requests and delegate business logic to services. They follow this pattern:

```javascript
import { asyncHandler } from "../utils/async-handler.js";
import { ApiResponse } from "../utils/api-response.js";
import SomeService from "../services/some.service.js";

class SomeController {
    constructor() {
        this.someService = new SomeService();
    }

    getSomeResource = asyncHandler(async (req, res) => {
        const result = await this.someService.getSomeResource(req.params.id);
        return ApiResponse.success(
            res,
            result,
            "Resource retrieved successfully"
        );
    });

    createSomeResource = asyncHandler(async (req, res) => {
        const result = await this.someService.createSomeResource(req.body);
        return ApiResponse.created(
            res,
            result,
            "Resource created successfully"
        );
    });

    // Other controller methods...
}

export default new SomeController();
```

## Services Pattern

Services contain the business logic and interact with models:

```javascript
import SomeModel from "../models/some.model.js";

class SomeService {
    async getSomeResource(id) {
        return await SomeModel.findById(id);
    }

    async createSomeResource(data) {
        const newResource = new SomeModel(data);
        return await newResource.save();
    }

    // Other service methods...
}

export default SomeService;
```

## Middleware Pattern

### Authentication Middleware

```javascript
import jwt from "jsonwebtoken";
import { asyncHandler } from "../utils/async-handler.js";
import UserModel from "../models/user.model.js";

export const authenticate = asyncHandler(async (req, res, next) => {
    const token = req.header("Authorization")?.replace("Bearer ", "");

    if (!token) {
        return res.status(401).json({
            success: false,
            message: "Authentication token is required",
        });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await UserModel.findById(decoded.id).select("-password");

    if (!user) {
        return res.status(401).json({
            success: false,
            message: "Invalid authentication token",
        });
    }

    req.user = user;
    next();
});

export const adminOnly = asyncHandler(async (req, res, next) => {
    if (req.user && req.user.role === "admin") {
        next();
    } else {
        return res.status(403).json({
            success: false,
            message: "Access denied: Admin only",
        });
    }
});

export const optionalAuthenticate = (authMiddleware) => {
    return asyncHandler(async (req, res, next) => {
        try {
            const mockNext = () => {};
            await new Promise((resolve) => {
                authMiddleware(req, {}, () => resolve());
            });
            next();
        } catch (error) {
            req.user = null;
            next();
        }
    });
};

export const optionalAuth = optionalAuthenticate(authenticate);
```

### AsyncHandler Utility

```javascript
// utils/async-handler.js
export const asyncHandler = (fn) => {
    return (req, res, next) => {
        Promise.resolve(fn(req, res, next)).catch(next);
    };
};
```

## Routes Pattern

```javascript
// routes/v1/some.routes.js
import express from 'express';
import SomeController from '../../controllers/some.controller.js';
import { authenticate, adminOnly } from '../../middlewares/auth.js';
import { validateRequest } from '../../middlewares/validator.js';
import { someSchema } from '../../validators/some.validator.js';

const router = express.Router();

router.get('/', SomeController.getAllResources);
router.get('/:id', SomeController.getResourceById);
router.post(
  '/',
  authenticate,
  validateRequest(someSchema.create),
  SomeController.createResource
);
router.put(
  '/:id',
  authenticate,
  validateRequest(someSchema.update),
  SomeController.updateResource
);
router.delete('/:id', authenticate, adminOnly, SomeController.deleteResource);

export default router;

// routes/v1/index.js
import express from 'express';
import authRoutes from './auth.routes.js';
import productRoutes from './product.routes.js';
// Import other route files

const router = express.Router();

router.use('/auth', authRoutes);
router.use('/products', productRoutes);
// Use other routes

export default router;
```

## Validators Pattern

```javascript
// validators/some.validator.js
import Joi from "joi";

export const someSchema = {
    create: Joi.object({
        name: Joi.string().required(),
        description: Joi.string().required(),
        price: Joi.number().required(),
        // Other validations...
    }),

    update: Joi.object({
        name: Joi.string(),
        description: Joi.string(),
        price: Joi.number(),
        // Other validations...
    }),
};

// middlewares/validator.js
export const validateRequest = (schema, type = "body") => {
    return (req, res, next) => {
        const { error } = schema.validate(req[type]);
        if (error) {
            return res.status(400).json({
                success: false,
                message: error.details[0].message.replace(/['"]/g, ""),
            });
        }
        next();
    };
};
```

## Models Pattern (using Mongoose)

```javascript
// models/some.model.js
import mongoose from "mongoose";

const someSchema = new mongoose.Schema(
    {
        name: {
            type: String,
            required: true,
            trim: true,
        },
        description: {
            type: String,
            required: true,
        },
        status: {
            type: String,
            enum: ["active", "inactive", "pending"],
            default: "active",
        },
        createdBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true,
        },
    },
    { timestamps: true }
);

// Virtual properties
someSchema.virtual("formattedPrice").get(function () {
    return `$${this.price.toFixed(2)}`;
});

// Methods
someSchema.methods.someMethod = function () {
    // Custom instance method
};

// Static methods
someSchema.statics.someStaticMethod = function () {
    // Custom static method
};

// Middlewares
someSchema.pre("save", function (next) {
    // Do something before saving
    next();
});

const SomeModel = mongoose.model("SomeName", someSchema);
export default SomeModel;
```

## API Response Utility

```javascript
// utils/response.util.js
/**
 * Send a custom response
 * @param {Object} res - Express response object
 * @param {number} status - HTTP status code
 * @param {boolean} success - Success indicator
 * @param {string} message - Response message
 * @param {Object|Array} data - Response data
 * @returns {Object} Express response
 */
export const sendResponse = (
    res,
    status = 200,
    success = true,
    message = "",
    data = {}
) => {
    const response = {
        status,
        success,
        message,
        data,
    };

    return res.status(status).json(response);
};

/**
 * Send a success response
 * @param {Object} res - Express response object
 * @param {string} message - Success message
 * @param {Object|Array} data - Response data
 * @returns {Object} Express response
 */
export const successResponse = (res, message = "", data = {}) => {
    const response = {
        status: 200,
        success: true,
        message,
        data,
    };

    return res.status(200).json(response);
};

/**
 * Send a bad request response
 * @param {Object} res - Express response object
 * @param {string} message - Error message
 * @param {Object|Array} data - Response data
 * @returns {Object} Express response
 */
export const badResponse = (res, message = "", data = {}) => {
    const response = {
        status: 400,
        success: false,
        message,
        data,
    };

    return res.status(400).json(response);
};

/**
 * Send an error response
 * @param {Object} res - Express response object
 * @param {string} message - Error message
 * @param {Object|Array} data - Response data
 * @returns {Object} Express response
 */
export const errorResponse = (
    res,
    message = "Internal server error!",
    data = {},
    status = 500
) => {
    const response = {
        status,
        success: false,
        message,
        data,
    };

    return res.status(status).json(response);
};
```

## Email Service with Plunk and Handlebars

```javascript
// services/email.service.js
import handlebars from "handlebars";
import fs from "fs/promises";
import path from "path";
import { fileURLToPath } from "url";
import logger from "../config/logger.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

class EmailService {
    constructor() {
        this.emailApiKey = process.env.EMAIL_API_KEY;
        this.companyName = process.env.COMPANY_NAME || "Company Name";
        this.companyLogo =
            process.env.COMPANY_LOGO || "https://example.com/logo.png";
        this.supportEmail = process.env.SUPPORT_EMAIL || "support@example.com";
        this.fromEmail = process.env.FROM_EMAIL || "noreply@example.com";
        this.templateDir = path.join(__dirname, "../utils/email-templates");
    }

    async getTemplate(templateName) {
        const filePath = path.join(this.templateDir, `${templateName}.hbs`);
        const template = await fs.readFile(filePath, "utf8");
        return handlebars.compile(template);
    }

    async sendEmail(to, subject, templateName, data) {
        try {
            const template = await this.getTemplate(templateName);
            const html = template({
                ...data,
                companyName: this.companyName,
                companyLogo: this.companyLogo,
                supportEmail: this.supportEmail,
            });

            if (!this.plunkApiKey) {
                logger.warn("No Plunk API key found, skipping email send");
                logger.info(
                    `Would have sent email to ${to} with subject: ${subject}`
                );
                return { success: true, dev: true };
            }

            // API call to email service would go here
            const response = await fetch(
                "https://api.emailservice.com/v1/send",
                {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                        Authorization: `Bearer ${this.emailApiKey}`,
                    },
                    body: JSON.stringify({
                        to,
                        subject,
                        html,
                        from: this.fromEmail,
                    }),
                }
            );

            const result = await response.json();
            return { success: true, result };
        } catch (error) {
            logger.error("Email send failed:", error);
            return { success: false, error: error.message };
        }
    }

    async sendOtpEmail(to, otp) {
        return this.sendEmail(
            to,
            "Your Verification Code",
            "otp-verification",
            { otp }
        );
    }

    async sendPasswordResetEmail(to, otp) {
        return this.sendEmail(to, "Password Reset Request", "password-reset", {
            otp,
        });
    }

    async sendWelcomeEmail(to, name) {
        return this.sendEmail(to, "Welcome to our platform!", "welcome", {
            name,
        });
    }
}

export default new EmailService();
```

## Special Features

### 1. Optional Authentication

The `optionalAuth` middleware provides graceful fallback to anonymous access when authentication fails, allowing both authenticated and non-authenticated users to access the same endpoints with different levels of detail.

### 2. Dynamic Entity Attributes

Entities support dynamic attributes using MongoDB's Map type, allowing for flexible schema design and extension without requiring database migrations.

### 3. Relationship Management

Relationships between entities are managed with comprehensive statistics tracking and bidirectional association functionality.

### 4. User Preferences System

Users can maintain personal preferences for various aspects of the application, with preference status included in relevant entity responses.

### 5. Status Tracking System

Entities support status tracking with start/end dates, status history, and virtual properties for determining current state.

## Deployment Considerations

1. **Environment Variables**: Ensure all required environment variables are set (see .env.example).
2. **Database**: Configure MongoDB connection string and credentials.
3. **Email Service**: Set up email service API key for email functionality.
4. **Authentication Provider**: Configure authentication provider for OAuth/social logins.
5. **Security**: Set secure JWT secret and ensure proper CORS configuration.

## Getting Started

1. Clone the repository
2. Copy `.env.example` to `.env` and fill in required values
3. Install dependencies: `npm install`
4. Start development server: `npm run dev`
5. Start production server: `npm start`
