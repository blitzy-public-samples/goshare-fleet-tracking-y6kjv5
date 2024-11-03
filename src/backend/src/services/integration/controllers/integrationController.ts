// Human Tasks:
// 1. Configure external system connection timeouts in environment variables
// 2. Set up monitoring for integration health checks
// 3. Configure webhook retry intervals in environment variables
// 4. Set up alerts for failed integration synchronizations
// 5. Configure rate limiting for external system API calls

// Third-party imports - versions specified as per package.json
import { Request, Response } from 'express'; // ^4.18.2
import { StatusCodes } from 'http-status-codes'; // ^2.2.0
import axios from 'axios'; // ^1.4.0

// Internal imports
import {
  Integration,
  Webhook,
  IntegrationSchema,
  INTEGRATION_TYPES,
  INTEGRATION_STATUS,
  WEBHOOK_STATUS,
  validateWebhookUrl
} from '../models/integrationModel';
import { encrypt, decrypt } from '../../../common/utils/encryption';
import { validateSchema } from '../../../common/middleware/validator';

// Global constants from specification
const MAX_WEBHOOK_RETRIES = 3;
const WEBHOOK_TIMEOUT = 5000;
const SYNC_BATCH_SIZE = 100;

/**
 * Creates a new external system integration
 * Requirement: Enterprise System Connectors - Manages WMS, ERP connections
 */
export const createIntegration = async (req: Request, res: Response): Promise<Response> => {
  try {
    // Validate integration request data
    const validationResult = await validateSchema(IntegrationSchema);
    if (!validationResult) {
      return res.status(StatusCodes.BAD_REQUEST).json({
        status: 'error',
        message: 'Invalid integration configuration'
      });
    }

    const { systemType, credentials, configuration, name } = req.body;

    // Encrypt sensitive credentials
    const encryptedCredentials = encrypt(
      JSON.stringify(credentials),
      process.env.ENCRYPTION_KEY!,
      process.env.ENCRYPTION_IV!
    );

    // Create integration record
    const integration = new Integration({
      systemType,
      name,
      credentials: encryptedCredentials,
      configuration,
      status: INTEGRATION_STATUS.INACTIVE
    });

    // Initialize connection to external system
    try {
      const testConnection = await axios.get(configuration.baseUrl, {
        headers: { Authorization: credentials.apiKey },
        timeout: 5000
      });
      
      if (testConnection.status === 200) {
        integration.status = INTEGRATION_STATUS.ACTIVE;
      }
    } catch (error) {
      integration.status = INTEGRATION_STATUS.ERROR;
    }

    await integration.save();

    return res.status(StatusCodes.CREATED).json({
      status: 'success',
      data: integration
    });
  } catch (error) {
    return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
      status: 'error',
      message: error.message
    });
  }
};

/**
 * Updates an existing integration configuration
 * Requirement: Enterprise System Connectors - Updates system connections
 */
export const updateIntegration = async (req: Request, res: Response): Promise<Response> => {
  try {
    const { id } = req.params;
    const { credentials, configuration, name } = req.body;

    const integration = await Integration.findById(id);
    if (!integration) {
      return res.status(StatusCodes.NOT_FOUND).json({
        status: 'error',
        message: 'Integration not found'
      });
    }

    // Update and encrypt new credentials if provided
    if (credentials) {
      integration.credentials = encrypt(
        JSON.stringify(credentials),
        process.env.ENCRYPTION_KEY!,
        process.env.ENCRYPTION_IV!
      );
    }

    // Update configuration if provided
    if (configuration) {
      integration.configuration = configuration;
    }

    if (name) {
      integration.name = name;
    }

    // Reinitialize connection if needed
    try {
      const testConnection = await axios.get(integration.configuration.baseUrl, {
        headers: {
          Authorization: JSON.parse(
            decrypt(
              integration.credentials,
              process.env.ENCRYPTION_KEY!,
              process.env.ENCRYPTION_IV!
            )
          ).apiKey
        },
        timeout: 5000
      });
      
      integration.status = testConnection.status === 200 
        ? INTEGRATION_STATUS.ACTIVE 
        : INTEGRATION_STATUS.ERROR;
    } catch (error) {
      integration.status = INTEGRATION_STATUS.ERROR;
    }

    await integration.save();

    return res.status(StatusCodes.OK).json({
      status: 'success',
      data: integration
    });
  } catch (error) {
    return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
      status: 'error',
      message: error.message
    });
  }
};

/**
 * Removes an integration configuration
 * Requirement: Enterprise System Connectors - Manages system connections
 */
export const deleteIntegration = async (req: Request, res: Response): Promise<Response> => {
  try {
    const { id } = req.params;

    // Remove associated webhooks
    await Webhook.deleteMany({ integrationId: id });

    // Delete integration record
    const integration = await Integration.findByIdAndDelete(id);
    if (!integration) {
      return res.status(StatusCodes.NOT_FOUND).json({
        status: 'error',
        message: 'Integration not found'
      });
    }

    return res.status(StatusCodes.OK).json({
      status: 'success',
      message: 'Integration deleted successfully'
    });
  } catch (error) {
    return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
      status: 'error',
      message: error.message
    });
  }
};

/**
 * Creates a new webhook for integration events
 * Requirement: Webhook Support - Handles webhook event notifications
 */
export const createWebhook = async (req: Request, res: Response): Promise<Response> => {
  try {
    const { integrationId, url, event, headers } = req.body;

    // Validate webhook URL
    const isValidUrl = await validateWebhookUrl(url);
    if (!isValidUrl) {
      return res.status(StatusCodes.BAD_REQUEST).json({
        status: 'error',
        message: 'Invalid webhook URL'
      });
    }

    // Create webhook record
    const webhook = new Webhook({
      integrationId,
      url,
      event,
      headers,
      status: WEBHOOK_STATUS.ACTIVE
    });

    await webhook.save();

    return res.status(StatusCodes.CREATED).json({
      status: 'success',
      data: webhook
    });
  } catch (error) {
    return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
      status: 'error',
      message: error.message
    });
  }
};

/**
 * Triggers a webhook with event data
 * Requirement: Webhook Support - Handles webhook event notifications
 */
export const triggerWebhook = async (webhookId: string, eventData: object): Promise<void> => {
  try {
    const webhook = await Webhook.findById(webhookId);
    if (!webhook) {
      throw new Error('Webhook not found');
    }

    let retryCount = 0;
    let delivered = false;

    while (retryCount < MAX_WEBHOOK_RETRIES && !delivered) {
      try {
        await axios.post(webhook.url, eventData, {
          headers: Object.fromEntries(webhook.headers),
          timeout: WEBHOOK_TIMEOUT
        });
        delivered = true;
        webhook.status = WEBHOOK_STATUS.ACTIVE;
        webhook.lastTriggered = new Date();
      } catch (error) {
        retryCount++;
        webhook.retryCount = retryCount;
        
        if (retryCount === MAX_WEBHOOK_RETRIES) {
          webhook.status = WEBHOOK_STATUS.FAILED;
        }
        
        // Exponential backoff for retries
        await new Promise(resolve => setTimeout(resolve, Math.pow(2, retryCount) * 1000));
      }
    }

    await webhook.save();
  } catch (error) {
    throw new Error(`Failed to trigger webhook: ${error.message}`);
  }
};

/**
 * Synchronizes data with external system
 * Requirement: Real-time Data Streaming - Handles real-time data streaming interfaces
 */
export const syncIntegrationData = async (integrationId: string): Promise<object> => {
  try {
    const integration = await Integration.findById(integrationId);
    if (!integration) {
      throw new Error('Integration not found');
    }

    integration.status = INTEGRATION_STATUS.SYNCING;
    await integration.save();

    // Decrypt credentials for external system access
    const credentials = JSON.parse(
      decrypt(
        integration.credentials,
        process.env.ENCRYPTION_KEY!,
        process.env.ENCRYPTION_IV!
      )
    );

    const results = {
      processed: 0,
      failed: 0,
      errors: [] as string[]
    };

    let hasMore = true;
    let offset = 0;

    // Perform batch synchronization
    while (hasMore) {
      try {
        const response = await axios.get(
          `${integration.configuration.baseUrl}/data`,
          {
            headers: { Authorization: credentials.apiKey },
            params: {
              limit: SYNC_BATCH_SIZE,
              offset
            },
            timeout: 30000
          }
        );

        const { data, total } = response.data;
        
        // Process batch data
        for (const item of data) {
          try {
            await processIntegrationItem(item, integration.systemType);
            results.processed++;
          } catch (error) {
            results.failed++;
            results.errors.push(`Failed to process item ${item.id}: ${error.message}`);
          }
        }

        offset += data.length;
        hasMore = offset < total;
      } catch (error) {
        throw new Error(`Sync failed at offset ${offset}: ${error.message}`);
      }
    }

    // Update integration status
    integration.status = results.failed === 0 ? INTEGRATION_STATUS.ACTIVE : INTEGRATION_STATUS.ERROR;
    integration.lastSyncTime = new Date();
    integration.syncStatus = {
      lastAttempt: new Date(),
      errorCount: results.failed,
      lastError: results.errors[results.errors.length - 1],
      nextRetry: results.failed > 0 ? new Date(Date.now() + 3600000) : null
    };

    await integration.save();

    // Trigger webhooks for sync completion
    const webhooks = await Webhook.find({
      integrationId,
      event: 'sync.completed'
    });

    for (const webhook of webhooks) {
      await triggerWebhook(webhook._id.toString(), results);
    }

    return results;
  } catch (error) {
    throw new Error(`Integration sync failed: ${error.message}`);
  }
};

/**
 * Helper function to process individual integration items
 * @param item - Data item from external system
 * @param systemType - Type of integration system
 */
const processIntegrationItem = async (item: any, systemType: INTEGRATION_TYPES): Promise<void> => {
  switch (systemType) {
    case INTEGRATION_TYPES.ERP:
      // Process ERP data
      await processERPItem(item);
      break;
    case INTEGRATION_TYPES.WMS:
      // Process WMS data
      await processWMSItem(item);
      break;
    case INTEGRATION_TYPES.TMS:
      // Process TMS data
      await processTMSItem(item);
      break;
    case INTEGRATION_TYPES.CRM:
      // Process CRM data
      await processCRMItem(item);
      break;
    default:
      throw new Error(`Unsupported system type: ${systemType}`);
  }
};

// Export controller functions
export const IntegrationController = {
  createIntegration,
  updateIntegration,
  deleteIntegration,
  createWebhook,
  triggerWebhook,
  syncIntegrationData
};