// Third-party imports
import { Server as SocketServer } from 'socket.io'; // ^4.7.1
import { Socket } from 'socket.io-client'; // ^4.7.1
import mongoose from 'mongoose'; // ^7.4.0
import request from 'supertest'; // ^6.3.3
import { Express } from 'express';

// Internal imports
import { NotificationModel, NotificationType, NotificationPriority, NotificationStatus } from '../../src/services/notification/models/notificationModel';
import NotificationController from '../../src/services/notification/controllers/notificationController';
import logger from '../../src/common/utils/logger';

// Human Tasks:
// 1. Configure test MongoDB database with appropriate indexes
// 2. Set up test Socket.IO server for real-time testing
// 3. Configure test Firebase Cloud Messaging credentials
// 4. Set up test user accounts with device tokens
// 5. Configure test notification templates

describe('Notification Service Tests', () => {
  let app: Express;
  let io: SocketServer;
  let socketClient: Socket;
  let testUserId: string;
  let testNotificationId: string;

  // Test data
  const testNotification = {
    userId: 'test-user-123',
    type: NotificationType.DELIVERY_UPDATE,
    title: 'Test Notification',
    message: 'This is a test notification message',
    priority: NotificationPriority.HIGH,
    metadata: {
      deliveryId: 'test-delivery-123',
      routeId: 'test-route-123',
      locationData: {
        latitude: 40.7128,
        longitude: -74.0060
      }
    }
  };

  beforeAll(async () => {
    // Requirement: Testing real-time notification system functionality
    try {
      // Connect to test database
      await mongoose.connect(process.env.MONGODB_TEST_URI || 'mongodb://localhost:27017/fleet-tracker-test');
      
      // Clear notification collection
      await NotificationModel.deleteMany({});

      // Initialize Socket.IO server and client
      io = new SocketServer(3001, {
        cors: {
          origin: '*',
          methods: ['GET', 'POST']
        }
      });

      socketClient = new Socket('http://localhost:3001');
      await new Promise(resolve => socketClient.on('connect', resolve));

      logger.info('Test environment setup completed');
    } catch (error) {
      logger.error('Error setting up test environment:', error);
      throw error;
    }
  });

  afterAll(async () => {
    // Cleanup test environment
    try {
      await NotificationModel.deleteMany({});
      await mongoose.connection.close();
      socketClient.disconnect();
      io.close();
      logger.info('Test environment cleanup completed');
    } catch (error) {
      logger.error('Error cleaning up test environment:', error);
      throw error;
    }
  });

  // Requirement: Testing real-time notification delivery and synchronization
  describe('createNotification', () => {
    it('should create a new notification and emit real-time event', async () => {
      // Setup Socket.IO event listener
      const notificationPromise = new Promise(resolve => {
        socketClient.on('notification:new', resolve);
      });

      // Create notification
      const response = await request(app)
        .post('/api/notifications')
        .send(testNotification)
        .expect(201);

      // Verify response
      expect(response.body.status).toBe('success');
      expect(response.body.data).toMatchObject({
        userId: testNotification.userId,
        type: testNotification.type,
        title: testNotification.title,
        message: testNotification.message,
        priority: testNotification.priority,
        status: NotificationStatus.PENDING
      });

      // Verify database entry
      const savedNotification = await NotificationModel.findById(response.body.data.id);
      expect(savedNotification).toBeTruthy();
      expect(savedNotification?.status).toBe(NotificationStatus.PENDING);

      // Verify Socket.IO event
      const emittedNotification = await notificationPromise;
      expect(emittedNotification).toMatchObject(testNotification);

      testNotificationId = response.body.data.id;
    });

    // Requirement: Validation of notification service delivery capabilities
    it('should handle invalid notification data', async () => {
      const invalidNotification = {
        userId: '',
        type: 'INVALID_TYPE',
        title: '',
        message: ''
      };

      const response = await request(app)
        .post('/api/notifications')
        .send(invalidNotification)
        .expect(400);

      expect(response.body.status).toBe('error');
      expect(response.body.message).toMatch(/validation failed/i);
    });
  });

  // Requirement: Testing real-time notification system functionality
  describe('getNotifications', () => {
    it('should retrieve paginated notifications with filters', async () => {
      // Create multiple test notifications
      const notifications = [
        { ...testNotification, priority: NotificationPriority.LOW },
        { ...testNotification, priority: NotificationPriority.MEDIUM },
        { ...testNotification, priority: NotificationPriority.HIGH }
      ];

      await NotificationModel.insertMany(notifications);

      // Test pagination and filtering
      const response = await request(app)
        .get('/api/notifications')
        .query({
          userId: testNotification.userId,
          type: NotificationType.DELIVERY_UPDATE,
          priority: NotificationPriority.HIGH,
          page: 1,
          limit: 10
        })
        .expect(200);

      expect(response.body.status).toBe('success');
      expect(response.body.data).toBeInstanceOf(Array);
      expect(response.body.pagination).toMatchObject({
        page: 1,
        limit: 10,
        total: expect.any(Number)
      });

      // Verify sorting
      expect(response.body.data[0].createdAt).toBeGreaterThan(response.body.data[1].createdAt);
    });
  });

  // Requirement: Testing real-time delivery tracking and status updates
  describe('markNotificationDelivered', () => {
    it('should mark notification as delivered with timestamp', async () => {
      const response = await request(app)
        .put(`/api/notifications/${testNotificationId}/delivered`)
        .expect(200);

      expect(response.body.status).toBe('success');

      // Verify database update
      const updatedNotification = await NotificationModel.findById(testNotificationId);
      expect(updatedNotification?.status).toBe(NotificationStatus.DELIVERED);
      expect(updatedNotification?.deliveredAt).toBeTruthy();
    });

    it('should handle non-existent notification', async () => {
      const nonExistentId = new mongoose.Types.ObjectId();
      
      const response = await request(app)
        .put(`/api/notifications/${nonExistentId}/delivered`)
        .expect(404);

      expect(response.body.status).toBe('error');
      expect(response.body.message).toMatch(/not found/i);
    });
  });

  // Requirement: Testing real-time delivery tracking and status updates
  describe('markNotificationRead', () => {
    it('should mark notification as read with timestamp', async () => {
      const response = await request(app)
        .put(`/api/notifications/${testNotificationId}/read`)
        .expect(200);

      expect(response.body.status).toBe('success');

      // Verify database update
      const updatedNotification = await NotificationModel.findById(testNotificationId);
      expect(updatedNotification?.status).toBe(NotificationStatus.READ);
      expect(updatedNotification?.readAt).toBeTruthy();
    });

    it('should handle non-existent notification', async () => {
      const nonExistentId = new mongoose.Types.ObjectId();
      
      const response = await request(app)
        .put(`/api/notifications/${nonExistentId}/read`)
        .expect(404);

      expect(response.body.status).toBe('error');
      expect(response.body.message).toMatch(/not found/i);
    });
  });

  // Requirement: Testing real-time notification system functionality
  describe('deleteNotification', () => {
    it('should delete notification and emit deletion event', async () => {
      // Setup Socket.IO event listener
      const deletionPromise = new Promise(resolve => {
        socketClient.on('notification:deleted', resolve);
      });

      const response = await request(app)
        .delete(`/api/notifications/${testNotificationId}`)
        .query({ userId: testNotification.userId })
        .expect(200);

      expect(response.body.status).toBe('success');

      // Verify database deletion
      const deletedNotification = await NotificationModel.findById(testNotificationId);
      expect(deletedNotification).toBeNull();

      // Verify Socket.IO deletion event
      const emittedId = await deletionPromise;
      expect(emittedId).toBe(testNotificationId);
    });

    it('should handle unauthorized deletion attempt', async () => {
      const response = await request(app)
        .delete(`/api/notifications/${testNotificationId}`)
        .query({ userId: 'wrong-user-id' })
        .expect(404);

      expect(response.body.status).toBe('error');
      expect(response.body.message).toMatch(/not found/i);
    });
  });
});