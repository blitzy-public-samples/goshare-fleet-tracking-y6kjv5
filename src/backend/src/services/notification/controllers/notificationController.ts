// Human Tasks:
// 1. Configure Firebase Cloud Messaging credentials in production environment
// 2. Set up Socket.IO clustering for horizontal scaling
// 3. Configure notification rate limiting thresholds
// 4. Set up monitoring for notification delivery success rates
// 5. Configure notification batching for high-volume scenarios

// Third-party imports
import { Request, Response } from 'express'; // ^4.18.2
import { Server as SocketServer } from 'socket.io'; // ^4.7.1
import * as admin from 'firebase-admin'; // ^11.10.1

// Internal imports
import { NotificationModel, INotification, NotificationType, NotificationPriority, NotificationStatus } from '../models/notificationModel';
import logger from '../../../common/utils/logger';
import errorHandler from '../../../common/middleware/errorHandler';

// Decorator for async request handling
const asyncHandler = (fn: Function) => (req: Request, res: Response) => {
  Promise.resolve(fn(req, res)).catch((error) => errorHandler(error, req, res, () => {}));
};

/**
 * Notification Controller handling real-time notifications and delivery tracking
 * Implements requirements from sections 1.2 and 4.1 of the technical specification
 */
class NotificationController {
  private io: SocketServer;
  private firebaseAdmin: admin.app.App;

  constructor(io: SocketServer, firebaseApp: admin.app.App) {
    this.io = io;
    this.firebaseAdmin = firebaseApp;
  }

  /**
   * Creates and delivers a new notification through appropriate channels
   * Requirement: Two-way communication system for real-time notifications
   */
  createNotification = asyncHandler(async (req: Request, res: Response) => {
    logger.info('Creating new notification', { userId: req.body.userId });

    const notification = new NotificationModel({
      userId: req.body.userId,
      type: req.body.type,
      title: req.body.title,
      message: req.body.message,
      priority: req.body.priority || NotificationPriority.MEDIUM,
      metadata: req.body.metadata || {}
    });

    const savedNotification = await notification.save();

    // Emit real-time event via Socket.IO for web clients
    this.io.to(`user:${req.body.userId}`).emit('notification:new', savedNotification);

    // Send push notification for mobile delivery if required
    if (req.body.deliveryChannel?.includes('mobile')) {
      await this.sendPushNotification(req.body.userId, savedNotification);
    }

    logger.info('Notification created successfully', {
      notificationId: savedNotification.id,
      userId: req.body.userId
    });

    res.status(201).json({
      status: 'success',
      data: savedNotification
    });
  });

  /**
   * Retrieves paginated notifications for a user with filtering options
   * Requirement: Real-time notification delivery and management
   */
  getNotifications = asyncHandler(async (req: Request, res: Response) => {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 25;
    const userId = req.params.userId;
    const type = req.query.type as NotificationType;
    const status = req.query.status as NotificationStatus;

    const query: any = { userId };
    if (type) query.type = type;
    if (status) query.status = status;

    const [notifications, total] = await Promise.all([
      NotificationModel.find(query)
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit),
      NotificationModel.countDocuments(query)
    ]);

    logger.info('Notifications retrieved successfully', {
      userId,
      page,
      limit,
      total
    });

    res.status(200).json({
      status: 'success',
      data: notifications,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      }
    });
  });

  /**
   * Marks a notification as delivered with timestamp
   * Requirement: Real-time data synchronization
   */
  markNotificationDelivered = asyncHandler(async (req: Request, res: Response) => {
    const notificationId = req.params.id;
    
    const success = await NotificationModel.prototype.markAsDelivered(notificationId);
    
    if (!success) {
      logger.error('Failed to mark notification as delivered', { notificationId });
      return res.status(404).json({
        status: 'error',
        message: 'Notification not found'
      });
    }

    logger.info('Notification marked as delivered', { notificationId });

    res.status(200).json({
      status: 'success',
      message: 'Notification marked as delivered'
    });
  });

  /**
   * Marks a notification as read with timestamp
   * Requirement: Real-time data synchronization
   */
  markNotificationRead = asyncHandler(async (req: Request, res: Response) => {
    const notificationId = req.params.id;
    
    const success = await NotificationModel.prototype.markAsRead(notificationId);
    
    if (!success) {
      logger.error('Failed to mark notification as read', { notificationId });
      return res.status(404).json({
        status: 'error',
        message: 'Notification not found'
      });
    }

    logger.info('Notification marked as read', { notificationId });

    res.status(200).json({
      status: 'success',
      message: 'Notification marked as read'
    });
  });

  /**
   * Deletes a notification after authorization check
   * Requirement: Two-way communication system
   */
  deleteNotification = asyncHandler(async (req: Request, res: Response) => {
    const notificationId = req.params.id;
    const userId = req.params.userId;

    const notification = await NotificationModel.findOne({
      _id: notificationId,
      userId
    });

    if (!notification) {
      logger.warn('Notification not found or unauthorized', {
        notificationId,
        userId
      });
      return res.status(404).json({
        status: 'error',
        message: 'Notification not found'
      });
    }

    await notification.deleteOne();

    // Emit deletion event to web clients
    this.io.to(`user:${userId}`).emit('notification:deleted', notificationId);

    logger.info('Notification deleted successfully', {
      notificationId,
      userId
    });

    res.status(200).json({
      status: 'success',
      message: 'Notification deleted successfully'
    });
  });

  /**
   * Sends push notification to mobile devices using Firebase Cloud Messaging
   * Requirement: Push Notifications through Firebase Cloud Messaging
   */
  private async sendPushNotification(userId: string, notification: INotification): Promise<void> {
    try {
      // Get user's FCM tokens from database (implementation depends on user model)
      const userDeviceTokens = await this.getUserDeviceTokens(userId);

      if (!userDeviceTokens.length) {
        logger.warn('No device tokens found for user', { userId });
        return;
      }

      const message: admin.messaging.MulticastMessage = {
        tokens: userDeviceTokens,
        notification: {
          title: notification.title,
          body: notification.message
        },
        data: {
          notificationId: notification.id,
          type: notification.type,
          priority: notification.priority,
          metadata: JSON.stringify(notification.metadata)
        },
        android: {
          priority: notification.priority === NotificationPriority.URGENT ? 'high' : 'normal',
          notification: {
            channelId: `fleet_tracker_${notification.type.toLowerCase()}`
          }
        },
        apns: {
          payload: {
            aps: {
              sound: notification.priority === NotificationPriority.URGENT ? 'critical.wav' : 'default',
              category: notification.type.toLowerCase()
            }
          }
        }
      };

      const response = await this.firebaseAdmin.messaging().sendEachForMulticast(message);

      logger.info('Push notifications sent', {
        success: response.successCount,
        failure: response.failureCount,
        userId
      });

      // Handle failed tokens
      if (response.failureCount > 0) {
        const failedTokens = userDeviceTokens.filter((_, index) => !response.responses[index].success);
        await this.handleFailedTokens(userId, failedTokens);
      }
    } catch (error) {
      logger.error('Error sending push notification', {
        error,
        userId,
        notificationId: notification.id
      });
    }
  }

  /**
   * Retrieves user's FCM device tokens
   * Implementation depends on user model structure
   */
  private async getUserDeviceTokens(userId: string): Promise<string[]> {
    // This should be implemented based on your user model
    // Return array of FCM tokens for the user's devices
    return [];
  }

  /**
   * Handles failed FCM tokens by removing or updating them
   */
  private async handleFailedTokens(userId: string, failedTokens: string[]): Promise<void> {
    // Implement token cleanup logic based on your user model
    logger.warn('Removing failed FCM tokens', {
      userId,
      tokenCount: failedTokens.length
    });
  }
}

// Export controller instance
export default NotificationController;