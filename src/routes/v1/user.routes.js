import { Router } from "express";
import UserController from "../../controllers/user.controller.js";
import {
    createUserSchema,
    updateUserSchema,
    loginUserSchema,
    disableAccountSchema,
    updatePasswordSchema,
} from "../../validators/user.validator.js";
import validate from "../../middlewares/validate.js";
import { authenticate, restrictTo } from "../../middlewares/auth.js";
import addressRoutes from "./address.routes.js";

const router = Router();

// Public routes
router.post("/register", validate(createUserSchema), UserController.createUser);
router.post("/login", validate(loginUserSchema), UserController.loginUser);

// Protected routes
router.use(authenticate); // All routes after this middleware require authentication

// User routes (authenticated user can access)
router.get("/me", UserController.getMe);
router.put("/:id", validate(updateUserSchema), UserController.updateUser);
router.patch(
    "/:id/disable",
    validate(disableAccountSchema),
    UserController.disableAccount,
);
router.get("/:id/status", UserController.getAccountStatus);
router.patch(
    "/password",
    validate(updatePasswordSchema),
    UserController.updatePassword,
);

// Address routes
router.use("/addresses", addressRoutes);

// Admin only routes
router.get("/", restrictTo("admin"), UserController.getUsers);
router.get("/:id", restrictTo("admin"), UserController.getUserById);
router.patch("/:id/enable", restrictTo("admin"), UserController.enableAccount);

export default router;
