import AdminPermission from "../models/adminPermission.model.js";

class AdminPermissionService {
  async getPermissions(adminId) {
    let record = await AdminPermission.findOne({ admin: adminId });
    if (!record) {
      // Initialize empty permissions record for this admin on first access
      record = await AdminPermission.create({ admin: adminId, pages: [], full: false });
    }
    return { pages: record.pages, full: record.full };
  }

  async setPermissions(adminId, pages, full = false) {
    // Upsert the permissions document
    const record = await AdminPermission.findOneAndUpdate(
      { admin: adminId },
      { $set: { pages, full } },
      { upsert: true, new: true }
    );
    return { pages: record.pages, full: record.full };
  }
}

export default new AdminPermissionService();
