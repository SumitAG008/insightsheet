import express from 'express';
import { authMiddleware } from '../middleware/auth.js';
import Subscription from '../models/Subscription.js';

const router = express.Router();
router.use(authMiddleware);

// @route   GET /api/subscriptions
// @desc    Get user subscription
// @access  Private
router.get('/', async (req, res) => {
  try {
    const subscription = await Subscription.findOne({ userId: req.user._id });
    res.json({ subscription });
  } catch (error) {
    res.status(500).json({ error: { message: 'Server error' } });
  }
});

// @route   POST /api/subscriptions/upgrade
// @desc    Upgrade subscription
// @access  Private
router.post('/upgrade', async (req, res) => {
  try {
    const { plan } = req.body;

    let subscription = await Subscription.findOne({ userId: req.user._id });
    if (!subscription) {
      subscription = new Subscription({ userId: req.user._id });
    }

    subscription.plan = plan;
    subscription.status = 'active';

    // Set features based on plan
    switch (plan) {
      case 'basic':
        subscription.features = {
          maxFiles: 50,
          maxStorage: 500,
          aiAnalysis: false,
          advancedFeatures: false
        };
        break;
      case 'pro':
        subscription.features = {
          maxFiles: 200,
          maxStorage: 2000,
          aiAnalysis: true,
          advancedFeatures: true
        };
        break;
      case 'enterprise':
        subscription.features = {
          maxFiles: -1, // unlimited
          maxStorage: -1, // unlimited
          aiAnalysis: true,
          advancedFeatures: true
        };
        break;
    }

    await subscription.save();
    res.json({ subscription });
  } catch (error) {
    res.status(500).json({ error: { message: 'Server error' } });
  }
});

export default router;
