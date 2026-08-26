import User from "../models/user.model.js";
import AdminPermission from "../models/adminPermission.model.js";

/**
 * Ensure at least one admin user exists.
 * If none exists, create one using environment variables.
 * Required env vars to create: ADMIN_EMAIL, ADMIN_PASSWORD
 * Optional: ADMIN_NAME, ADMIN_PHONE
 */
export async function initializeAdminUser() {
  try {
    const exists = await User.exists({ role: "admin" });
    if (exists) {
      console.log("Admin user already exists. Skipping admin initialization.");
      return;
    }

    const email = process.env.ADMIN_EMAIL;
    const password = process.env.ADMIN_PASSWORD;
    const name = process.env.ADMIN_NAME || "Administrator";
    const phoneNumber = process.env.ADMIN_PHONE || "+10000000000";

    if (!email || !password) {
      console.warn(
        "ADMIN_EMAIL and ADMIN_PASSWORD are required to seed an admin user. Skipping admin initialization."
      );
      return;
    }

    const adminUser = new User({
      name,
      email,
      phoneNumber,
      password,
      role: "admin",
      otp: {
        code: null,
        expiresAt: null,
        verified: true,
        attempts: 0,
      },
    });

    await adminUser.save();

    // Grant full permissions to the seeded admin
    await AdminPermission.findOneAndUpdate(
      { admin: adminUser._id },
      { $set: { full: true }, $setOnInsert: { pages: [] } },
      { upsert: true, new: true }
    );

    console.log(
      `Admin user created: ${email}. You can change credentials later from the database or an admin settings UI.`
    );
  } catch (err) {
    console.error("Failed to initialize admin user:", err);
  }
}
