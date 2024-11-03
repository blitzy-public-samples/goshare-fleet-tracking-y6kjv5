// Human Tasks:
// 1. Configure test environment variables for encryption keys and IVs
// 2. Set up test MongoDB instance with proper credentials
// 3. Configure test external system mock endpoints
// 4. Set up test webhook endpoints for validation

// Third-party imports - versions specified in package.json
import { MongoMemoryServer } from 'mongodb-memory-server'; // ^8.13.0
import mongoose from 'mongoose'; // ^7.4.0
import nock from 'nock'; // ^13.3.1
import { jest } from '@jest/globals'; // ^29.6.0

// Internal imports
import {
  IntegrationController,
  createIntegration,
  updateIntegration,
  deleteIntegration,
  createWebhook,
  triggerWebhook,
  syncIntegrationData
} from '../../src/services/integration/controllers/integrationController';

import {
  Integration,
  Webhook,
  INTEGRATION_TYPES,
  INTEGRATION_STATUS,
  WEBHOOK_STATUS
} from '../../src/services/integration/models/integrationModel';

import { encrypt, decrypt } from '../../src/common/utils/encryption';

// Test constants
const TEST_ENCRYPTION_KEY = Buffer.from('dGVzdEtleUZvckFFUzI1NkVuY3J5cHRpb24=', 'base64');
const TEST_ENCRYPTION_IV = Buffer.from('dGVzdEl2Rm9yQUVTMjU2', 'base64');
const MOCK_EXTERNAL_API = 'https://api.external-system.com';

describe('Integration Controller', () => {
  let mongoServer: MongoMemoryServer;

  // Test data fixtures
  const testIntegration = {
    systemType: INTEGRATION_TYPES.ERP,
    name: 'Test ERP Integration',
    credentials: {
      apiKey: 'test-api-key-12345',
      apiSecret: 'test-api-secret-67890',
      baseUrl: MOCK_EXTERNAL_API
    },
    configuration: {
      baseUrl: MOCK_EXTERNAL_API,
      syncInterval: 3600,
      timeout: 5000
    }
  };

  const testWebhook = {
    url: 'https://webhook.test.com/endpoint',
    event: 'sync.completed',
    headers: {
      'X-API-Key': 'webhook-test-key',
      'Content-Type': 'application/json'
    }
  };

  beforeAll(async () => {
    // Start in-memory MongoDB server
    mongoServer = await MongoMemoryServer.create();
    const mongoUri = mongoServer.getUri();
    await mongoose.connect(mongoUri);

    // Set up environment variables
    process.env.ENCRYPTION_KEY = TEST_ENCRYPTION_KEY.toString('base64');
    process.env.ENCRYPTION_IV = TEST_ENCRYPTION_IV.toString('base64');
  });

  afterAll(async () => {
    // Clean up test environment
    await mongoose.disconnect();
    await mongoServer.stop();
    nock.cleanAll();
  });

  beforeEach(async () => {
    // Clear collections before each test
    await Integration.deleteMany({});
    await Webhook.deleteMany({});

    // Mock external system responses
    nock(MOCK_EXTERNAL_API)
      .get('/')
      .reply(200, { status: 'ok' })
      .persist();
  });

  /**
   * Test case for integration creation
   * Requirement: Enterprise System Connectors - Test WMS, ERP connections
   */
  test('should create new integration', async () => {
    // Mock request and response objects
    const req = {
      body: testIntegration
    } as any;
    const res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn()
    } as any;

    // Execute test
    await createIntegration(req, res);

    // Verify response
    expect(res.status).toHaveBeenCalledWith(201);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        status: 'success',
        data: expect.objectContaining({
          systemType: INTEGRATION_TYPES.ERP,
          name: testIntegration.name,
          status: INTEGRATION_STATUS.ACTIVE
        })
      })
    );

    // Verify database record
    const integration = await Integration.findOne({ name: testIntegration.name });
    expect(integration).toBeTruthy();
    expect(integration?.status).toBe(INTEGRATION_STATUS.ACTIVE);

    // Verify credential encryption
    const decryptedCredentials = JSON.parse(
      decrypt(
        integration!.credentials,
        TEST_ENCRYPTION_KEY.toString('base64'),
        TEST_ENCRYPTION_IV.toString('base64')
      )
    );
    expect(decryptedCredentials.apiKey).toBe(testIntegration.credentials.apiKey);
  });

  /**
   * Test case for integration update
   * Requirement: Enterprise System Connectors - Test secure credential management
   */
  test('should update existing integration', async () => {
    // Create initial integration
    const integration = await Integration.create({
      ...testIntegration,
      credentials: encrypt(
        JSON.stringify(testIntegration.credentials),
        TEST_ENCRYPTION_KEY.toString('base64'),
        TEST_ENCRYPTION_IV.toString('base64')
      )
    });

    // Prepare update data
    const updateData = {
      name: 'Updated Integration',
      credentials: {
        ...testIntegration.credentials,
        apiKey: 'updated-api-key'
      }
    };

    // Mock request and response
    const req = {
      params: { id: integration._id.toString() },
      body: updateData
    } as any;
    const res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn()
    } as any;

    // Execute test
    await updateIntegration(req, res);

    // Verify response
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        status: 'success',
        data: expect.objectContaining({
          name: updateData.name
        })
      })
    );

    // Verify database update
    const updatedIntegration = await Integration.findById(integration._id);
    expect(updatedIntegration?.name).toBe(updateData.name);

    // Verify credential update
    const decryptedCredentials = JSON.parse(
      decrypt(
        updatedIntegration!.credentials,
        TEST_ENCRYPTION_KEY.toString('base64'),
        TEST_ENCRYPTION_IV.toString('base64')
      )
    );
    expect(decryptedCredentials.apiKey).toBe(updateData.credentials.apiKey);
  });

  /**
   * Test case for integration deletion
   * Requirement: Enterprise System Connectors - Test integration cleanup
   */
  test('should delete integration', async () => {
    // Create test integration and webhook
    const integration = await Integration.create({
      ...testIntegration,
      credentials: encrypt(
        JSON.stringify(testIntegration.credentials),
        TEST_ENCRYPTION_KEY.toString('base64'),
        TEST_ENCRYPTION_IV.toString('base64')
      )
    });

    await Webhook.create({
      ...testWebhook,
      integrationId: integration._id
    });

    // Mock request and response
    const req = {
      params: { id: integration._id.toString() }
    } as any;
    const res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn()
    } as any;

    // Execute test
    await deleteIntegration(req, res);

    // Verify response
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        status: 'success',
        message: 'Integration deleted successfully'
      })
    );

    // Verify database cleanup
    const deletedIntegration = await Integration.findById(integration._id);
    expect(deletedIntegration).toBeNull();

    const webhooks = await Webhook.find({ integrationId: integration._id });
    expect(webhooks).toHaveLength(0);
  });

  /**
   * Test case for webhook creation
   * Requirement: Webhook Support - Test webhook event notifications
   */
  test('should create webhook', async () => {
    // Create parent integration
    const integration = await Integration.create({
      ...testIntegration,
      credentials: encrypt(
        JSON.stringify(testIntegration.credentials),
        TEST_ENCRYPTION_KEY.toString('base64'),
        TEST_ENCRYPTION_IV.toString('base64')
      )
    });

    // Mock webhook URL validation
    nock(testWebhook.url)
      .head('/')
      .reply(200);

    // Mock request and response
    const req = {
      body: {
        ...testWebhook,
        integrationId: integration._id
      }
    } as any;
    const res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn()
    } as any;

    // Execute test
    await createWebhook(req, res);

    // Verify response
    expect(res.status).toHaveBeenCalledWith(201);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        status: 'success',
        data: expect.objectContaining({
          url: testWebhook.url,
          event: testWebhook.event,
          status: WEBHOOK_STATUS.ACTIVE
        })
      })
    );

    // Verify database record
    const webhook = await Webhook.findOne({ integrationId: integration._id });
    expect(webhook).toBeTruthy();
    expect(webhook?.status).toBe(WEBHOOK_STATUS.ACTIVE);
  });

  /**
   * Test case for webhook triggering
   * Requirement: Webhook Support - Test retry mechanisms and delivery validation
   */
  test('should trigger webhook', async () => {
    // Create test webhook
    const webhook = await Webhook.create({
      ...testWebhook,
      integrationId: new mongoose.Types.ObjectId()
    });

    // Mock webhook endpoint
    const eventData = { event: 'test.event', data: { test: true } };
    nock(testWebhook.url)
      .post('/', eventData)
      .reply(200);

    // Execute test
    await triggerWebhook(webhook._id.toString(), eventData);

    // Verify webhook status update
    const updatedWebhook = await Webhook.findById(webhook._id);
    expect(updatedWebhook?.status).toBe(WEBHOOK_STATUS.ACTIVE);
    expect(updatedWebhook?.lastTriggered).toBeTruthy();
    expect(updatedWebhook?.retryCount).toBe(0);
  });

  /**
   * Test case for integration data synchronization
   * Requirement: RESTful APIs for External Integration - Test data synchronization
   */
  test('should sync integration data', async () => {
    // Create test integration
    const integration = await Integration.create({
      ...testIntegration,
      credentials: encrypt(
        JSON.stringify(testIntegration.credentials),
        TEST_ENCRYPTION_KEY.toString('base64'),
        TEST_ENCRYPTION_IV.toString('base64')
      )
    });

    // Mock external system data
    const mockData = {
      data: Array.from({ length: 10 }, (_, i) => ({
        id: `item-${i}`,
        name: `Test Item ${i}`,
        value: i * 100
      })),
      total: 10
    };

    nock(MOCK_EXTERNAL_API)
      .get('/data')
      .query(true)
      .reply(200, mockData);

    // Execute test
    const result = await syncIntegrationData(integration._id.toString());

    // Verify sync results
    expect(result).toEqual(
      expect.objectContaining({
        processed: 10,
        failed: 0,
        errors: []
      })
    );

    // Verify integration status update
    const updatedIntegration = await Integration.findById(integration._id);
    expect(updatedIntegration?.status).toBe(INTEGRATION_STATUS.ACTIVE);
    expect(updatedIntegration?.lastSyncTime).toBeTruthy();
    expect(updatedIntegration?.syncStatus.errorCount).toBe(0);
  });
});