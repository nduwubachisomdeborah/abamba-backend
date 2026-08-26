/**
 * Helper functions for product promotion handling
 */

/**
 * Process promotion information for a product
 * Adds promoActive and discount percentage to product objects
 * 
 * @param {Object} productObj - Product object from toObject() 
 * @param {Object} product - Mongoose product document with virtuals
 * @returns {Object} Enhanced product object with promotion data
 */
export const processPromoInfo = (productObj, product) => {
  // Ensure virtual fields for promotions are included
  productObj.promoActive = product.promoActive;
  productObj.formattedBasePrice = product.formattedBasePrice;
  
  // Include promo price if available  
  if (product.promoActive) {
    productObj.formattedPromoPrice = product.formattedPromoPrice;
  }
  
  // Add discount percentage if promo is active
  if (productObj.promoActive && productObj.promoPrice && productObj.basePrice) {
    const discount = productObj.basePrice - productObj.promoPrice;
    const discountPercentage = (discount / productObj.basePrice) * 100;
    productObj.discountPercentage = Math.round(discountPercentage);
    productObj.formattedDiscountPercentage = `${Math.round(discountPercentage)}%`;
  }
  
  return productObj;
};
