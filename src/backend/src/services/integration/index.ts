// Human Tasks:
// 1. Configure MongoDB connection string in environment variables
// 2. Set up monitoring alerts for integration health checks
// 3. Configure webhook retry policy in environment variables
// 4. Set up SSL certificates for external system connections
// 5. Configure rate limiting thresholds for integration endpoints

// Third-party imports - versions specified in package.json
import express from 'express'; // ^4.18.2
import mongoose from 'mongoose'; // ^7.4.0

// Internal imports
import router from './routes/integrationRoutes';
import { Integration, validateCredentials } from './models/integrationModel';
import logger from '../../common/utils/logger';

// Constants for health check and reconnection attempts
const HEALTH_CHECK_INTERVAL = 300000; // 5 minutes
const MAX_RECONNECT_ATTEMPTS = 3;
const INTEGRATION_TYPES = ['WMS', 'ERP', 'TMS', 'CRM'];

/**
 * Initializes the integration service and its dependencies
 * Requirement: Integration Layer - Initializes RESTful APIs for external system integration
 */
export const initializeIntegrationService = async (app: express.Application): Promise<void> => {
  try {
    logger.info('Initializing integration service...');

    // Configure express middleware for request parsing
    app.use(express.json({ limit: '10mb' }));
    app.use(express.urlencoded({ extended: true }));

    // Mount integration routes
    app.use('/api/v1/integration', router);

    // Initialize MongoDB connection for integration models
    await mongoose.connect(process.env.MONGODB_URI as string, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
      serverSelectionTimeoutMS: 5000
    });

    logger.info('MongoDB connection established for integration service');

    // Start integration health monitoring
    startIntegrationHealthCheck();

    logger.info('Integration service initialized successfully');
  } catch (error) {
    logger.error('Failed to initialize integration service:', error);
    throw error;
  }
};

/**
 * Starts periodic health checks for all active integrations
 * Requirement: Enterprise System Connectors - Monitors integration health
 */
export const startIntegrationHealthCheck = (): void => {
  logger.debug('Starting integration health check monitoring');

  const checkIntegrationHealth = async () => {
    try {
      // Query all active integrations
      const activeIntegrations = await Integration.find({ status: 'active' });
      logger.info(`Checking health for ${activeIntegrations.length} active integrations`);

      for (const integration of activeIntegrations) {
        let attempts = 0;
        let isHealthy = false;

        // Attempt to validate credentials with retry logic
        while (attempts < MAX_RECONNECT_ATTEMPTS && !isHealthy) {
          try {
            isHealthy = await validateCredentials(integration.credentials);
            
            if (isHealthy) {
              logger.debug(`Integration ${integration.systemId} health check passed`);
              
              // Update integration status
              await Integration.updateOne(
                { _id: integration._id },
                { 
                  $set: { 
                    status: 'active',
                    'syncStatus.lastAttempt': new Date(),
                    'syncStatus.errorCount': 0
                  }
                }
              );
            }
          } catch (error) {
            attempts++;
            logger.warn(`Health check attempt ${attempts} failed for integration ${integration.systemId}:`, error);
            
            // Exponential backoff for retry attempts
            await new Promise(resolve => setTimeout(resolve, Math.pow(2, attempts) * 1000));
          }
        }

        // Update integration status if health check failed
        if (!isHealthy) {
          logger.error(`Integration ${integration.systemId} health check failed after ${MAX_RECONNECT_ATTEMPTS} attempts`);
          
          await Integration.updateOne(
            { _id: integration._id },
            { 
              $set: { 
                status: 'error',
                'syncStatus.lastAttempt': new Date(),
                'syncStatus.lastError': 'Health check failed',
                'syncStatus.errorCount': integration.syncStatus?.errorCount + 1 || 1
              }
            }
          );
        }
      }
    } catch (error) {
      logger.error('Error during integration health check:', error);
    }

    // Schedule next health check
    setTimeout(checkIntegrationHealth, HEALTH_CHECK_INTERVAL);
  };

  // Start initial health check
  checkIntegrationHealth();
};

/**
 * Exports the integration router for use in the main application
 * Requirement: Integration Layer - Exposes integration endpoints
 */
export default router;