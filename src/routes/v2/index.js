import { Router } from 'express';

const router = Router();

// Health check route
router.get('/health', (req, res) => {
  res.status(200).json({
    success: true,
    message: 'API v2 is healthy',
    timestamp: new Date().toISOString()
  });
});

// Placeholder for future v2 routes
// router.use('/users', userV2Routes);
// router.use('/products', productV2Routes);

export default router;
