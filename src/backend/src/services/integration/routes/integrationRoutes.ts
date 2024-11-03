// Human Tasks:
// 1. Configure rate limiting for integration endpoints in environment variables
// 2. Set up monitoring for integration endpoint health checks
// 3. Configure webhook retry policies in environment variables
// 4. Set up alerts for failed integration operations
// 5. Configure external system timeouts in environment variables

// Third-party imports - versions specified in package.json
import { Router } from 'express'; // ^4.18.2
import Joi from 'joi'; // ^17.9.2

// Internal imports
import { 
  IntegrationController,
  createIntegration,
  updateIntegration,
  deleteIntegration,
  createWebhook,
  syncIntegrationData
} from '../controllers/integrationController';
import { authenticateToken, authorizeRoles } from '../../auth/middleware/authMiddleware';
import { validateSchema } from '../../../common/middleware/validator';

// Integration schema validation
const integrationSchema = Joi.object({
  name: Joi.string().required(),
  type: Joi.string().required().valid('WMS', 'ERP', 'TMS'),
  url: Joi.string().required().uri(),
  credentials: Joi.object().required(),
  settings: Joi.object(),
  active: Joi.boolean().default(true)
});

// Webhook schema validation
const webhookSchema = Joi.object({
  url: Joi.string().required().uri(),
  events: Joi.array().items(Joi.string()).required(),
  headers: Joi.object(),
  active: Joi.boolean().default(true)
});

/**
 * Configures and returns the integration service router with all endpoints
 * Requirement: RESTful APIs for External Integration - Implements RESTful API endpoints
 */
const configureIntegrationRoutes = (): Router => {
  const router = Router();

  // Apply authentication middleware to all routes
  router.use(authenticateToken);

  // POST /integrations - Create new integration
  // Requirement: Enterprise System Connectors - Exposes endpoints for WMS/ERP integration
  router.post(
    '/integrations',
    authorizeRoles(['ADMIN']),
    validateSchema(integrationSchema),
    createIntegration
  );

  // PUT /integrations/:id - Update integration
  // Requirement: Enterprise System Connectors - Updates system connections
  router.put(
    '/integrations/:id',
    authorizeRoles(['ADMIN']),
    validateSchema(integrationSchema),
    updateIntegration
  );

  // DELETE /integrations/:id - Delete integration
  // Requirement: Enterprise System Connectors - Manages system connections
  router.delete(
    '/integrations/:id',
    authorizeRoles(['ADMIN']),
    deleteIntegration
  );

  // POST /integrations/:id/webhooks - Create webhook
  // Requirement: Webhook Support - Provides webhook endpoints for event notifications
  router.post(
    '/integrations/:id/webhooks',
    authorizeRoles(['ADMIN']),
    validateSchema(webhookSchema),
    createWebhook
  );

  // POST /integrations/:id/sync - Sync integration data
  // Requirement: Real-time Data Streaming - Handles real-time data streaming interfaces
  router.post(
    '/integrations/:id/sync',
    authorizeRoles(['ADMIN', 'MANAGER']),
    syncIntegrationData
  );

  return router;
};

// Export configured router
export default configureIntegrationRoutes();