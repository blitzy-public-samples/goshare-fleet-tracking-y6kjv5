// Human Tasks:
// 1. Configure test environment variables in .env.test
// 2. Set up test database instances with appropriate permissions
// 3. Configure monitoring tools to capture test metrics
// 4. Review and adjust performance thresholds based on infrastructure
// 5. Set up test data generation scripts for large-scale testing

// @version: jest ^29.6.0
import { describe, beforeAll, afterAll, test, expect } from '@jest/globals';
// @version: autocannon ^7.11.0
import autocannon, { Result as AutocannonResults } from 'autocannon';
// @version: socket.io-client ^4.7.0
import { io as Client, Socket } from 'socket.io-client';
// @version: express ^4.18.2
import express, { Express } from 'express';
import { Server } from 'http';

// Internal imports
import logger from '../../src/common/utils/logger';
import { DatabaseConfig } from '../../src/common/config/database';
import initializeLocationService from '../../src/services/location';

// Test configuration constants
const TEST_CONFIG = {
  maxConcurrentUsers: 10000,
  testDuration: 300,
  targetRPS: 5000,
  maxLatency: 1000,
  updateInterval: 30000,
  pipelining: 10
};

// Performance thresholds
const PERFORMANCE_THRESHOLDS = {
  p95ResponseTime: 500,
  errorRate: 0.001,
  minThroughput: 1000,
  maxCpuUtilization: 70,
  maxMemoryUtilization: 75,
  maxDbConnections: 80
};

// Test types and interfaces
interface TestResults {
  latency: {
    p50: number;
    p95: number;
    p99: number;
  };
  throughput: number;
  errors: number;
  errorRate: number;
  duration: number;
}

interface SocketClient {
  client: Socket;
  vehicleId: string;
}

let app: Express;
let server: Server;
let socketClients: SocketClient[] = [];
let testPort: number;

/**
 * Requirement: System Performance - Support for 10,000+ concurrent users
 * Sets up test environment with required services and connections
 */
beforeAll(async () => {
  try {
    // Initialize Express application
    app = express();
    testPort = parseInt(process.env.TEST_PORT || '4000', 10);
    server = app.listen(testPort);

    // Initialize Socket.io server
    const io = require('socket.io')(server, {
      cors: { origin: '*' },
      transports: ['websocket'],
      pingTimeout: 60000,
      pingInterval: 25000
    });

    // Initialize location service
    initializeLocationService(app, io);

    // Initialize database connections
    await DatabaseConfig.createPostgresPool();
    await DatabaseConfig.connectMongoDB();

    logger.info('Test environment setup completed successfully');
  } catch (error) {
    logger.error('Failed to setup test environment:', error);
    throw error;
  }
});

/**
 * Cleans up test resources and connections
 */
afterAll(async () => {
  try {
    // Close all socket connections
    await Promise.all(socketClients.map(({ client }) => client.close()));
    socketClients = [];

    // Close server
    await new Promise<void>((resolve) => server.close(() => resolve()));

    // Close database connections
    await Promise.all([
      DatabaseConfig.postgresPool.end(),
      DatabaseConfig.mongoConnection.close()
    ]);

    logger.info('Test environment cleanup completed successfully');
  } catch (error) {
    logger.error('Failed to cleanup test environment:', error);
    throw error;
  }
});

/**
 * Requirement: Real-time Data Synchronization - 30-second maximum data latency
 * Tests system performance under high volume of location updates via WebSocket
 */
test('Location update stress test', async () => {
  const results: TestResults = {
    latency: { p50: 0, p95: 0, p99: 0 },
    throughput: 0,
    errors: 0,
    errorRate: 0,
    duration: 0
  };

  try {
    // Create concurrent WebSocket clients
    const clientPromises = Array.from({ length: TEST_CONFIG.maxConcurrentUsers }, async (_, index) => {
      const client = Client(`http://localhost:${testPort}`, {
        transports: ['websocket'],
        reconnection: false
      });

      const vehicleId = `test-vehicle-${index}`;
      socketClients.push({ client, vehicleId });

      return new Promise<void>((resolve) => {
        client.on('connect', () => {
          logger.debug(`Client ${vehicleId} connected`);
          resolve();
        });
      });
    });

    await Promise.all(clientPromises);
    logger.info(`Connected ${TEST_CONFIG.maxConcurrentUsers} WebSocket clients`);

    // Start location updates
    const startTime = Date.now();
    let updateCount = 0;
    let errorCount = 0;

    // Send location updates from all clients
    while (Date.now() - startTime < TEST_CONFIG.testDuration * 1000) {
      const updatePromises = socketClients.map(({ client, vehicleId }) => {
        return new Promise<void>((resolve) => {
          const locationUpdate = {
            vehicleId,
            location: {
              latitude: 40.7128 + (Math.random() - 0.5) * 0.1,
              longitude: -74.0060 + (Math.random() - 0.5) * 0.1,
              speed: Math.random() * 100,
              heading: Math.random() * 360
            },
            timestamp: new Date().toISOString()
          };

          client.emit('location:update', locationUpdate, (error: any) => {
            if (error) {
              errorCount++;
              logger.error(`Location update error for ${vehicleId}:`, error);
            }
            updateCount++;
            resolve();
          });
        });
      });

      await Promise.all(updatePromises);
      await new Promise(resolve => setTimeout(resolve, TEST_CONFIG.updateInterval));
    }

    // Calculate results
    const duration = (Date.now() - startTime) / 1000;
    results.throughput = updateCount / duration;
    results.errors = errorCount;
    results.errorRate = errorCount / updateCount;
    results.duration = duration;

    logger.info('Location update stress test results:', results);

    // Assert performance requirements
    expect(results.errorRate).toBeLessThan(PERFORMANCE_THRESHOLDS.errorRate);
    expect(results.throughput).toBeGreaterThan(PERFORMANCE_THRESHOLDS.minThroughput);
  } catch (error) {
    logger.error('Location update stress test failed:', error);
    throw error;
  }
});

/**
 * Requirement: System Performance - Sub-second response times
 * Tests REST API endpoints under heavy load using autocannon
 */
test('API endpoint stress test', async () => {
  const endpoints = [
    { url: '/api/v1/vehicles', method: 'GET' },
    { url: '/api/v1/locations/latest', method: 'GET' },
    { url: '/api/v1/routes/active', method: 'GET' }
  ];

  for (const endpoint of endpoints) {
    const instance = autocannon({
      url: `http://localhost:${testPort}${endpoint.url}`,
      connections: TEST_CONFIG.maxConcurrentUsers,
      pipelining: TEST_CONFIG.pipelining,
      duration: TEST_CONFIG.testDuration,
      method: endpoint.method,
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer test-token'
      }
    });

    const results: AutocannonResults = await new Promise((resolve) => {
      instance.on('done', resolve);
    });

    logger.info(`Stress test results for ${endpoint.url}:`, {
      latency: results.latency,
      throughput: results.throughput,
      errors: results.errors,
      timeouts: results.timeouts,
      duration: results.duration
    });

    // Assert performance requirements
    expect(results.latency.p95).toBeLessThan(PERFORMANCE_THRESHOLDS.p95ResponseTime);
    expect(results.errors).toBe(0);
    expect(results.timeouts).toBe(0);
  }
});