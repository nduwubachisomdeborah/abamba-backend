import addressService from "../services/address.service.js";
import { asyncHandler } from "../middlewares/error.js";
import { successResponse } from "../utils/response.util.js";

class AddressController {
  /**
   * @desc    Get all user addresses
   * @route   GET /api/v1/users/addresses
   * @access  Private
   */
  static getAddresses = asyncHandler(async (req, res) => {
    const addresses = await addressService.getAddresses(req.user.id);

    return successResponse(res, "Addresses retrieved successfully", addresses);
  });

  /**
   * @desc    Get address by ID
   * @route   GET /api/v1/users/addresses/:id
   * @access  Private
   */
  static getAddressById = asyncHandler(async (req, res) => {
    const address = await addressService.getAddressById(
      req.user.id,
      req.params.id,
    );
    return successResponse(res, "Address retrieved successfully", address);
  });

  /**
   * @desc    Add a new address
   * @route   POST /api/v1/users/addresses
   * @access  Private
   */
  static addAddress = asyncHandler(async (req, res) => {
    const result = await addressService.addAddress(req.user.id, req.body);
    const newAddress = result.address || result;

    return successResponse(res, "Address added successfully", {
      address: newAddress,
      addresses: result.addresses || (result.user && result.user.addresses) || [],
      _id: newAddress._id,
      id: newAddress._id,
      ...(typeof newAddress.toObject === "function" ? newAddress.toObject() : newAddress)
    });
  });

  /**
   * @desc    Update an address
   * @route   PATCH /api/v1/users/addresses/:id
   * @access  Private
   */
  static updateAddress = asyncHandler(async (req, res) => {
    const user = await addressService.updateAddress(
      req.user.id,
      req.params.id,
      req.body,
    );

    return successResponse(res, "Address updated successfully", user.addresses);
  });

  /**
   * @desc    Set address as default
   * @route   PATCH /api/v1/users/addresses/:id/default
   * @access  Private
   */
  static setDefaultAddress = asyncHandler(async (req, res) => {
    const user = await addressService.setDefaultAddress(
      req.user.id,
      req.params.id,
    );

    return successResponse(
      res,
      "Default address updated successfully",
      user.addresses,
    );
  });

  /**
   * @desc    Delete an address
   * @route   DELETE /api/v1/users/addresses/:id
   * @access  Private
   */
  static deleteAddress = asyncHandler(async (req, res) => {
    const user = await addressService.deleteAddress(req.user.id, req.params.id);

    return successResponse(res, "Address deleted successfully", user.addresses);
  });
}

export default AddressController;
