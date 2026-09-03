import PlatformSettings from "../models/platformSettings.model.js";

/**
 * Process pricing, promotion, and bonus information for a product object.
 * When a product has a bonus price:
 * - Current Selling Price is set to bonusPrice (e.g. 2000)
 * - Slashed Former Cost Price is set to basePrice (e.g. 2500)
 * - Original / Regular price fields explicitly show 2500
 */
export const processPromoInfo = (productObj, isBonusActive = true) => {
    if (!productObj) return productObj;

    const basePrice = Number(productObj.basePrice || productObj.price || 0);
    const bonusPrice =
        productObj.bonusPrice !== undefined &&
        productObj.bonusPrice !== null &&
        productObj.bonusPrice !== ""
            ? Number(productObj.bonusPrice)
            : null;
    const promoPrice =
        productObj.promoPrice !== undefined &&
        productObj.promoPrice !== null &&
        productObj.promoPrice !== ""
            ? Number(productObj.promoPrice)
            : null;

    // Default prices
    productObj.originalPrice = basePrice;
    productObj.regularPrice = basePrice;
    productObj.slashedPrice = null;
    productObj.formattedBasePrice = `₦${basePrice.toLocaleString()}`;

    const hasValidBonus =
        bonusPrice !== null && bonusPrice > 0 && bonusPrice < basePrice;
    const isPromoActive = Boolean(productObj.promoActive || productObj.onSale);

    if (hasValidBonus && isBonusActive) {
        productObj.price = bonusPrice;
        productObj.currentPrice = bonusPrice;
        productObj.sellingPrice = bonusPrice;
        productObj.slashedPrice = basePrice;
        productObj.isBonusPrice = true;
        productObj.hasBonus = true;
        productObj.onSale = true;
        productObj.formattedPrice = `₦${bonusPrice.toLocaleString()}`;
        productObj.formattedCurrentPrice = `₦${bonusPrice.toLocaleString()}`;
        productObj.formattedOriginalPrice = `₦${basePrice.toLocaleString()}`;
        productObj.formattedSlashedPrice = `₦${basePrice.toLocaleString()}`;
        const discountPercentage = Math.round(
            ((basePrice - bonusPrice) / basePrice) * 100
        );
        productObj.discountPercentage = discountPercentage;
        productObj.formattedDiscountPercentage = `${discountPercentage}%`;
    } else if (
        isPromoActive &&
        promoPrice !== null &&
        promoPrice > 0 &&
        promoPrice < basePrice
    ) {
        productObj.price = promoPrice;
        productObj.currentPrice = promoPrice;
        productObj.sellingPrice = promoPrice;
        productObj.slashedPrice = basePrice;
        productObj.isOnSale = true;
        productObj.formattedPrice = `₦${promoPrice.toLocaleString()}`;
        productObj.formattedCurrentPrice = `₦${promoPrice.toLocaleString()}`;
        productObj.formattedOriginalPrice = `₦${basePrice.toLocaleString()}`;
        productObj.formattedSlashedPrice = `₦${basePrice.toLocaleString()}`;
        const discountPercentage = Math.round(
            ((basePrice - promoPrice) / basePrice) * 100
        );
        productObj.discountPercentage = discountPercentage;
        productObj.formattedDiscountPercentage = `${discountPercentage}%`;
    } else {
        productObj.price = basePrice;
        productObj.currentPrice = basePrice;
        productObj.sellingPrice = basePrice;
        productObj.formattedPrice = `₦${basePrice.toLocaleString()}`;
        productObj.formattedCurrentPrice = `₦${basePrice.toLocaleString()}`;
    }

    // Process Variants if present
    if (Array.isArray(productObj.variants) && productObj.variants.length > 0) {
        productObj.variants = productObj.variants.map((v) => {
            const variantBase = Number(v.price || basePrice);
            const variantBonus =
                v.bonusPrice !== undefined &&
                v.bonusPrice !== null &&
                v.bonusPrice !== ""
                    ? Number(v.bonusPrice)
                    : bonusPrice;
            const variantPromo =
                v.promoPrice !== undefined &&
                v.promoPrice !== null &&
                v.promoPrice !== ""
                    ? Number(v.promoPrice)
                    : promoPrice;

            const vObj =
                typeof v.toObject === "function" ? v.toObject() : { ...v };
            vObj.originalPrice = variantBase;
            vObj.regularPrice = variantBase;

            if (
                variantBonus !== null &&
                variantBonus > 0 &&
                variantBonus < variantBase &&
                isBonusActive
            ) {
                vObj.price = variantBonus;
                vObj.currentPrice = variantBonus;
                vObj.sellingPrice = variantBonus;
                vObj.slashedPrice = variantBase;
                vObj.isBonusPrice = true;
                vObj.formattedPrice = `₦${variantBonus.toLocaleString()}`;
                vObj.formattedOriginalPrice = `₦${variantBase.toLocaleString()}`;
                vObj.discountPercentage = Math.round(
                    ((variantBase - variantBonus) / variantBase) * 100
                );
            } else if (
                isPromoActive &&
                variantPromo !== null &&
                variantPromo > 0 &&
                variantPromo < variantBase
            ) {
                vObj.price = variantPromo;
                vObj.currentPrice = variantPromo;
                vObj.sellingPrice = variantPromo;
                vObj.slashedPrice = variantBase;
                vObj.isOnSale = true;
                vObj.formattedPrice = `₦${variantPromo.toLocaleString()}`;
                vObj.formattedOriginalPrice = `₦${variantBase.toLocaleString()}`;
                vObj.discountPercentage = Math.round(
                    ((variantBase - variantPromo) / variantBase) * 100
                );
            } else {
                vObj.price = variantBase;
                vObj.currentPrice = variantBase;
                vObj.sellingPrice = variantBase;
                vObj.formattedPrice = `₦${variantBase.toLocaleString()}`;
            }
            return vObj;
        });
    }

    return productObj;
};
