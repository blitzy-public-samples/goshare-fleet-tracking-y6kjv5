// Human Tasks:
// 1. Configure notification rate limiting thresholds in production
// 2. Set up monitoring for notification delivery success rates
// 3. Configure notification batching for high-volume scenarios
// 4. Set up Socket.IO clustering for horizontal scaling
// 5. Configure Firebase Cloud Messaging credentials

// Third-party imports
import express, { Router } from 'express'; // ^4.18.2
import Joi from 'joi'; // ^17.9.2

// Internal imports
import { NotificationController } from '../controllers/notificationController';
import { authenticateToken, authorizeRoles } from '../../auth/middleware/authMiddleware';
import { validateSchema } from '../../../common/middleware/validator';
import { NotificationType, NotificationPriority } from '../models/notificationModel';

/**
 * Validation schema for creating notifications
 * Requirement: Security Protocols - Request validation
 */
const createNotificationSchema = Joi.object({
  userId: Joi.string().required(),
  type: Joi.string()
    .valid(...Object.values(NotificationType))
    .required(),
  title: Joi.string().required().max(100),
  message: Joi.string().required().max(500),
  priority: Joi.string()
    .valid(...Object.values(NotificationPriority))
    .default(NotificationPriority.MEDIUM),
  metadata: Joi.object().default({}),
  deliveryChannel: Joi.array()
    .items(Joi.string().valid('web', 'mobile', 'email'))
    .default(['web'])
});

/**
 * Configures and returns Express router with secured notification endpoints
 * Requirement: Two-way communication system, Real-time data synchronization
 */
const configureNotificationRoutes = (): Router => {
  const router = express.Router();

  /**
   * POST /
   * Create a new notification with real-time delivery support
   * Requirement: Two-way communication system
   */
  router.post(
    '/',
    authenticateToken,
    validateSchema(createNotificationSchema),
    NotificationController.createNotification
  );

  /**
   * GET /
   * Get paginated list of notifications with filtering options
   * Requirement: Real-time data synchronization
   */
  router.get(
    '/',
    authenticateToken,
    NotificationController.getNotifications
  );

  /**
   * PUT /:id/delivered
   * Mark notification as delivered with timestamp tracking
   * Requirement: Real-time data synchronization
   */
  router.put(
    '/:id/delivered',
    authenticateToken,
    NotificationController.markNotificationDelivered
  );

  /**
   * PUT /:id/read
   * Mark notification as read with timestamp tracking
   * Requirement: Real-time data synchronization
   */
  router.put(
    '/:id/read',
    authenticateToken,
    NotificationController.markNotificationRead
  );

  /**
   * DELETE /:id
   * Delete a notification with role-based access control
   * Requirement: Security Protocols - Role-based authorization
   */
  router.delete(
    '/:id',
    authenticateToken,
    authorizeRoles(['admin', 'manager']),
    NotificationController.deleteNotification
  );

  return router;
};

// Export configured notification router
export default configureNotificationRoutes();