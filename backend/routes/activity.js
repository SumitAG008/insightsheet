import express from 'express';
import { authMiddleware } from '../middleware/auth.js';
import UserActivity from '../models/UserActivity.js';

const router = express.Router();
router.use(authMiddleware);

// @route   POST /api/activity
// @desc    Log user activity
// @access  Private
router.post('/', async (req, res) => {
  try {
    const { action, resource, resourceId, metadata } = req.body;

    const activity = new UserActivity({
      userId: req.user._id,
      action,
      resource,
      resourceId,
      metadata,
      ipAddress: req.ip,
      userAgent: req.headers['user-agent']
    });

    await activity.save();
    res.status(201).json({ activity });
  } catch (error) {
    res.status(500).json({ error: { message: 'Server error' } });
  }
});

// @route   GET /api/activity
// @desc    Get user activity log
// @access  Private
router.get('/', async (req, res) => {
  try {
    const { page = 1, limit = 50 } = req.query;

    const activities = await UserActivity.find({ userId: req.user._id })
      .sort({ timestamp: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);

    const count = await UserActivity.countDocuments({ userId: req.user._id });

    res.json({
      activities,
      totalPages: Math.ceil(count / limit),
      currentPage: page
    });
  } catch (error) {
    res.status(500).json({ error: { message: 'Server error' } });
  }
});

export default router;
