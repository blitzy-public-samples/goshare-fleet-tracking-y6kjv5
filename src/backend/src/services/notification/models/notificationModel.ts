// Third-party imports
import mongoose, { Schema, Document } from 'mongoose'; // ^7.4.0

// Internal imports
import { DeliveryStatus, VehicleStatus } from '../../../common/types';
import { mongoConnection } from '../../../common/config/database';

// Human Tasks:
// 1. Configure MongoDB indexes for notification queries
// 2. Set up TTL index for notification expiration
// 3. Configure notification retention policy
// 4. Set up monitoring for notification delivery rates
// 5. Configure notification batching thresholds

// Requirement: Support for real-time notifications and communication between system components
export enum NotificationType {
  DELIVERY_UPDATE = 'delivery_update',
  VEHICLE_ALERT = 'vehicle_alert',
  SYSTEM_ALERT = 'system_alert',
  GEOFENCE_ALERT = 'geofence_alert'
}

// Requirement: Real-time notification delivery for system events and updates
export enum NotificationPriority {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  URGENT = 'urgent'
}

// Requirement: Real-time notification delivery for system events and updates
export enum NotificationStatus {
  PENDING = 'pending',
  SENT = 'sent',
  DELIVERED = 'delivered',
  READ = 'read',
  FAILED = 'failed'
}

// Requirement: Support for real-time notifications and communication between system components
export interface INotification extends Document {
  id: string;
  userId: string;
  type: NotificationType;
  title: string;
  message: string;
  priority: NotificationPriority;
  status: NotificationStatus;
  metadata: {
    deliveryStatus?: DeliveryStatus;
    vehicleStatus?: VehicleStatus;
    locationData?: {
      latitude: number;
      longitude: number;
    };
    routeId?: string;
    deliveryId?: string;
    vehicleId?: string;
    [key: string]: any;
  };
  createdAt: Date;
  updatedAt: Date;
  deliveredAt: Date | null;
  readAt: Date | null;
}

// Requirement: Notification service for delivering real-time updates and alerts
const notificationSchema = new Schema<INotification>({
  userId: {
    type: String,
    required: true,
    index: true
  },
  type: {
    type: String,
    enum: Object.values(NotificationType),
    required: true,
    index: true
  },
  title: {
    type: String,
    required: true,
    trim: true,
    maxlength: 200
  },
  message: {
    type: String,
    required: true,
    trim: true,
    maxlength: 1000
  },
  priority: {
    type: String,
    enum: Object.values(NotificationPriority),
    required: true,
    default: NotificationPriority.MEDIUM,
    index: true
  },
  status: {
    type: String,
    enum: Object.values(NotificationStatus),
    required: true,
    default: NotificationStatus.PENDING,
    index: true
  },
  metadata: {
    type: Schema.Types.Mixed,
    default: {}
  },
  createdAt: {
    type: Date,
    default: Date.now,
    index: true
  },
  updatedAt: {
    type: Date,
    default: Date.now
  },
  deliveredAt: {
    type: Date,
    default: null
  },
  readAt: {
    type: Date,
    default: null
  }
}, {
  timestamps: true,
  versionKey: false
});

// Requirement: Real-time notification delivery for system events and updates
notificationSchema.pre('save', function(next) {
  if (this.isNew) {
    this.status = NotificationStatus.PENDING;
    this.createdAt = new Date();
  }
  this.updatedAt = new Date();
  next();
});

// Requirement: Support for real-time notifications and communication between system components
notificationSchema.methods.markAsDelivered = async function(notificationId: string): Promise<boolean> {
  try {
    const notification = await this.model('Notification').findById(notificationId);
    if (!notification) {
      return false;
    }
    
    notification.status = NotificationStatus.DELIVERED;
    notification.deliveredAt = new Date();
    await notification.save();
    
    return true;
  } catch (error) {
    console.error('Error marking notification as delivered:', error);
    return false;
  }
};

// Requirement: Support for real-time notifications and communication between system components
notificationSchema.methods.markAsRead = async function(notificationId: string): Promise<boolean> {
  try {
    const notification = await this.model('Notification').findById(notificationId);
    if (!notification) {
      return false;
    }
    
    notification.status = NotificationStatus.READ;
    notification.readAt = new Date();
    await notification.save();
    
    return true;
  } catch (error) {
    console.error('Error marking notification as read:', error);
    return false;
  }
};

// Create indexes for efficient querying
notificationSchema.index({ userId: 1, status: 1 });
notificationSchema.index({ userId: 1, type: 1 });
notificationSchema.index({ userId: 1, priority: 1 });
notificationSchema.index({ createdAt: 1 }, { expireAfterSeconds: 30 * 24 * 60 * 60 }); // TTL index for 30 days

// Export the notification model and interfaces
export const NotificationModel = mongoConnection.model<INotification>('Notification', notificationSchema);
export { INotification, NotificationType, NotificationPriority, NotificationStatus };