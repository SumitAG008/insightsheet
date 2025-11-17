import { DataTypes } from 'sequelize';
import sequelize from '../config/database-postgres.js';
import User from './User.js';

const Subscription = sequelize.define('Subscription', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  userId: {
    type: DataTypes.UUID,
    allowNull: false,
    references: {
      model: User,
      key: 'id'
    }
  },
  plan: {
    type: DataTypes.ENUM('free', 'basic', 'pro', 'enterprise'),
    defaultValue: 'free'
  },
  status: {
    type: DataTypes.ENUM('active', 'cancelled', 'expired', 'trial'),
    defaultValue: 'active'
  },
  stripeCustomerId: {
    type: DataTypes.STRING
  },
  stripeSubscriptionId: {
    type: DataTypes.STRING
  },
  currentPeriodStart: {
    type: DataTypes.DATE
  },
  currentPeriodEnd: {
    type: DataTypes.DATE
  },
  cancelAtPeriodEnd: {
    type: DataTypes.BOOLEAN,
    defaultValue: false
  },
  features: {
    type: DataTypes.JSONB,
    defaultValue: {
      maxFiles: 10,
      maxStorage: 100, // MB
      aiAnalysis: false,
      advancedFeatures: false
    }
  }
}, {
  timestamps: true
});

// Associations
User.hasOne(Subscription, { foreignKey: 'userId' });
Subscription.belongsTo(User, { foreignKey: 'userId' });

export default Subscription;
