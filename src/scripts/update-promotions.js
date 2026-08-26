import mongoose from 'mongoose';
import Product from '../models/product.model.js';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

// Set up environment variables
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

/**
 * Script to update promotion status for all products
 * Can be run manually or as a scheduled job
 */
const updateProductPromotions = async () => {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB');
    
    const now = new Date();
    
    // Find all products with promotional pricing
    const products = await Product.find({
      promoPrice: { $ne: null },
      deleted: false
    });
    
    console.log(`Found ${products.length} products with promotional pricing`);
    
    let activatedCount = 0;
    let deactivatedCount = 0;
    
    // Update each product's promotion status
    for (const product of products) {
      let shouldBeOnSale = true;
      
      // If sale has start date and it's in the future, product is not on sale yet
      if (product.saleStartDate && now < product.saleStartDate) {
        shouldBeOnSale = false;
      }
      // If sale has end date and it's in the past, sale has ended
      else if (product.saleEndDate && now > product.saleEndDate) {
        shouldBeOnSale = false;
      }
      
      // Update if status changed
      if (product.onSale !== shouldBeOnSale) {
        product.onSale = shouldBeOnSale;
        await product.save();
        
        if (shouldBeOnSale) {
          activatedCount++;
          console.log(`Activated promotion for product: ${product.name} (${product._id})`);
        } else {
          deactivatedCount++;
          console.log(`Deactivated promotion for product: ${product.name} (${product._id})`);
        }
      }
    }
    
    console.log(`Promotion update complete: Activated ${activatedCount}, Deactivated ${deactivatedCount}`);
  } catch (error) {
    console.error('Error updating product promotions:', error);
  } finally {
    // Disconnect from MongoDB
    await mongoose.disconnect();
    console.log('Disconnected from MongoDB');
  }
};

// Run the update if script is executed directly
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  updateProductPromotions().then(() => {
    console.log('Promotion update process completed');
    process.exit(0);
  }).catch((error) => {
    console.error('Error in promotion update process:', error);
    process.exit(1);
  });
}

export default updateProductPromotions;
