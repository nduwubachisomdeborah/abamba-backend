# Abamba Backend

Abamba is an ecommerce platform for Nigerians. This repository contains the backend API built with Node.js Express, following MVC architecture and utilizing MongoDB, JWT authentication, and versioned API routes.

## Project Structure

```
src/
├── app.js                  # Main application entry point
├── config/                 # Configuration files
├── controllers/            # Request handlers (class-based)
├── middlewares/            # Custom middleware functions
├── models/                 # Database schemas and models
├── routes/                 # API route definitions with versioning
│   ├── v1/                 # Version 1 API routes
│   └── v2/                 # Version 2 API routes
├── services/               # Business logic layer (class-based)
├── utils/                  # Utility functions and helpers
└── validators/             # Joi validation schemas
```

## Features

- MVC architecture with ES6 modules
- Class-based controllers and services
- MongoDB with Mongoose ODM
- JWT authentication and authorization
- Input validation with Joi
- API versioning
- Error handling and logging
- Debug middleware for request/response logging
- Rate limiting and security
- API response standardization

## Prerequisites

- Node.js >= 16.0.0
- MongoDB

## Installation

1. Clone the repository:
   ```
   git clone <repository-url>
   cd abamba-backend
   ```

2. Install dependencies:
   ```
   npm install
   ```

3. Create a `.env` file in the root directory with the following variables:
   ```
   PORT=3000
   MONGODB_URI=mongodb://localhost:27017/abamba
   JWT_SECRET=your_jwt_secret_key
   NODE_ENV=development
   JWT_EXPIRES_IN=90d
   DEBUG=true
   DEBUG_LOG=false
   ```

## Running the Application

### Development Mode
```
npm run dev
```

### Production Mode
```
npm start
```

## Debugging

The application includes a debug middleware that logs detailed request and response information.

### Enable Debug Mode

Set the `DEBUG` environment variable to `true` in your `.env` file:
```
DEBUG=true
```

The middleware automatically activates in development mode or when `DEBUG=true`.

### Features
- Logs all incoming request details (method, URL, headers, query params, body)
- Logs all outgoing response data (status code, response time, body)
- Assigns unique request IDs for tracking
- Console logging with formatted output

### File Logging

To enable file-based debug logging, set:
```
DEBUG_LOG=true
```

Debug logs will be written to `src/logs/debug.log`.

### Example Output
```
=== 📥 INCOMING REQUEST ===
[2024-11-12T00:54:23.123Z] POST /api/v1/users/login
Request ID: 1699753463123-abc123def
Headers: {...}
Body: { "email": "user@example.com", "password": "***" }

=== 📤 OUTGOING RESPONSE ===
[2024-11-12T00:54:23.456Z] POST /api/v1/users/login
Request ID: 1699753463123-abc123def
Status Code: 200
Response Time: 333ms
Response Data: { "success": true, "token": "..." }
```

## API Documentation

The API documentation is available at `/api-docs` when the server is running.

## API Endpoints

### Authentication
- `POST /api/v1/users/register` - Register a new user
- `POST /api/v1/users/login` - Login a user

### Users
- `GET /api/v1/users/me` - Get current user profile
- `PUT /api/v1/users/:id` - Update user
- `GET /api/v1/users` - Get all users (admin only)
- `GET /api/v1/users/:id` - Get user by ID (admin only)
- `DELETE /api/v1/users/:id` - Delete user (admin only)

## License

ISC
