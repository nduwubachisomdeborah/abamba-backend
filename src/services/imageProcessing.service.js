import sharp from "sharp";

/**
 * Optimizes an uploaded image buffer into 3 WebP variants:
 * 1. Thumbnail: 400x400 WebP (~20KB - 35KB) for listing & home grids
 * 2. Medium: 800x800 WebP (~60KB - 80KB) for product details view
 * 3. Full: 1600x1600 WebP (~120KB - 160KB) for zoom lightbox
 *
 * @param {Buffer} buffer - Image file buffer
 * @returns {Promise<{ thumbnailBuffer: Buffer, mediumBuffer: Buffer, fullBuffer: Buffer }>}
 */
export async function processProductImage(buffer) {
    // 1. Thumbnail for product cards
    const thumbnailBuffer = await sharp(buffer)
        .rotate() // Handles phone camera EXIF orientation
        .resize(400, 400, {
            fit: "cover",
            position: "center",
        })
        .webp({ quality: 80, effort: 4 })
        .toBuffer();

    // 2. Medium view for product page
    const mediumBuffer = await sharp(buffer)
        .rotate()
        .resize(800, 800, {
            fit: "inside",
            withoutEnlargement: true,
        })
        .webp({ quality: 82, effort: 4 })
        .toBuffer();

    // 3. Full original size
    const fullBuffer = await sharp(buffer)
        .rotate()
        .resize(1600, 1600, {
            fit: "inside",
            withoutEnlargement: true,
        })
        .webp({ quality: 85, effort: 4 })
        .toBuffer();

    return { thumbnailBuffer, mediumBuffer, fullBuffer };
}

export default { processProductImage };
