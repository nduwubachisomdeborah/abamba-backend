import categoryOptionsService from "../services/categoryOptions.service.js";

/**
 * Initialize category options in the database
 * This should be called when the application starts
 */
export const initializeCategoryOptions = async () => {
  try {
    console.log("Initializing category options...");
    await categoryOptionsService.initializeCategoryOptions();
    console.log("Category options initialization complete");
  } catch (error) {
    console.error("Failed to initialize category options:", error);
  }
};

export default initializeCategoryOptions;
