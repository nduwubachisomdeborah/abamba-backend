import mongoose from 'mongoose';
import Product from '../models/product.model.js';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

function normalizeUrl(url, baseUrl) {
  if (!url || typeof url !== 'string') return url;
  let trimmed = url.trim();
  if (!trimmed) return trimmed;

  // Cloudinary optimization
  if (trimmed.includes('res.cloudinary.com') && trimmed.includes('/image/upload/')) {
    if (
      !/\/image\/upload\/(?:[a-z]_[^/]+,?)+\//.test(trimmed) &&
      !trimmed.includes('/f_auto') &&
      !trimmed.includes('/q_auto') &&
      !trimmed.includes('/w_')
    ) {
      trimmed = trimmed.replace('/image/upload/', '/image/upload/f_auto,q_auto,w_800,c_limit/');
    }
  }

  // Relative upload path resolution
  if (trimmed.startsWith('/uploads/') || trimmed.startsWith('uploads/')) {
    const base = (baseUrl || 'http://localhost:5500').replace(/\/+$/, '');
    const cleanPath = trimmed.startsWith('/') ? trimmed : `/${trimmed}`;
    return `${base}${cleanPath}`;
  }

  return trimmed;
}

export const fixProductImageUrls = async () => {
  try {
    const mongoUri = process.env.MONGODB_URI;
    if (!mongoUri) {
      console.error('MONGODB_URI is not defined in environment variables.');
      return;
    }

    console.log('Connecting to MongoDB...');
    await mongoose.connect(mongoUri);
    console.log('Connected to MongoDB.');

    const baseUrl = process.env.BASE_URL || process.env.APP_URL || 'http://localhost:5500';
    console.log(`Using BASE_URL for relative paths: ${baseUrl}`);

    const products = await Product.find({ deleted: false });
    console.log(`Scanning ${products.length} products for image URL updates...`);

    let updatedCount = 0;

    for (const product of products) {
      let isModified = false;

      // Check thumbnail
      if (product.thumbnail) {
        const norm = normalizeUrl(product.thumbnail, baseUrl);
        if (norm !== product.thumbnail) {
          product.thumbnail = norm;
          isModified = true;
        }
      }

      // Check image
      if (product.image) {
        const norm = normalizeUrl(product.image, baseUrl);
        if (norm !== product.image) {
          product.image = norm;
          isModified = true;
        }
      }

      // Check images array
      if (Array.isArray(product.images) && product.images.length > 0) {
        product.images.forEach((img) => {
          if (img && typeof img === 'object') {
            if (img.url) {
              const norm = normalizeUrl(img.url, baseUrl);
              if (norm !== img.url) {
                img.url = norm;
                isModified = true;
              }
            }
            if (img.thumbnail) {
              const norm = normalizeUrl(img.thumbnail, baseUrl);
              if (norm !== img.thumbnail) {
                img.thumbnail = norm;
                isModified = true;
              }
            }
            if (img.medium) {
              const norm = normalizeUrl(img.medium, baseUrl);
              if (norm !== img.medium) {
                img.medium = norm;
                isModified = true;
              }
            }
          }
        });
      }

      // Fallbacks
      if (!product.thumbnail && Array.isArray(product.images) && product.images.length > 0) {
        const first = product.images[0];
        const fallbackUrl = typeof first === 'string' ? first : (first?.thumbnail || first?.url);
        if (fallbackUrl) {
          product.thumbnail = normalizeUrl(fallbackUrl, baseUrl);
          isModified = true;
        }
      }

      if (!product.image && product.thumbnail) {
        product.image = product.thumbnail;
        isModified = true;
      }

      if (isModified) {
        await product.save({ validateBeforeSave: false });
        updatedCount++;
      }
    }

    console.log(`Finished processing. Updated ${updatedCount} products.`);
    await mongoose.disconnect();
    console.log('Database connection closed.');
  } catch (error) {
    console.error('Error fixing image URLs:', error);
    try {
      await mongoose.disconnect();
    } catch (e) {
      // ignore
    }
  }
};

// Execute if run directly from CLI
if (process.argv[1] && process.argv[1].endsWith('fix-image-urls.js')) {
  fixProductImageUrls();
}
