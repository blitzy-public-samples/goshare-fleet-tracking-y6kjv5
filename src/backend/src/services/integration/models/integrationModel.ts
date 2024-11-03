// Human Tasks:
// 1. Configure MongoDB credentials in environment variables
// 2. Set up encryption keys for credential storage
// 3. Configure webhook retry policy in environment variables
// 4. Set up monitoring for webhook delivery status
// 5. Configure rate limits for external system connections

// Third-party imports
import { Schema, model } from 'mongoose'; // ^7.4.0

// Internal imports
import { postgresPool } from '../../../common/config/database';

// Requirement: Enterprise System Integration - Define integration types
export enum INTEGRATION_TYPES {
  ERP = 'erp',
  WMS = 'wms',
  TMS = 'tms',
  CRM = 'crm'
}

// Requirement: Integration Layer - Define integration status types
export enum INTEGRATION_STATUS {
  ACTIVE = 'active',
  INACTIVE = 'inactive',
  ERROR = 'error',
  SYNCING = 'syncing'
}

// Requirement: Webhook Support - Define webhook status types
export enum WEBHOOK_STATUS {
  ACTIVE = 'active',
  INACTIVE = 'inactive',
  FAILED = 'failed'
}

// Requirement: Enterprise System Integration - Schema for external system integrations
const IntegrationSchema = new Schema({
  systemId: {
    type: String,
    required: true,
    unique: true,
    index: true
  },
  systemType: {
    type: String,
    required: true,
    enum: Object.values(INTEGRATION_TYPES),
    index: true
  },
  name: {
    type: String,
    required: true,
    trim: true
  },
  credentials: {
    type: Schema.Types.Mixed,
    required: true,
    select: false // Sensitive data not included in default queries
  },
  configuration: {
    type: Schema.Types.Mixed,
    required: true,
    default: {}
  },
  status: {
    type: String,
    required: true,
    enum: Object.values(INTEGRATION_STATUS),
    default: INTEGRATION_STATUS.INACTIVE,
    index: true
  },
  lastSyncTime: {
    type: Date,
    default: null
  },
  syncStatus: {
    lastAttempt: Date,
    errorCount: Number,
    lastError: String,
    nextRetry: Date
  }
}, {
  timestamps: true,
  versionKey: false
});

// Requirement: Enterprise System Integration - Credential validation
IntegrationSchema.methods.validateCredentials = async function(credentials: any): Promise<boolean> {
  try {
    // Check required fields based on system type
    const requiredFields = {
      [INTEGRATION_TYPES.ERP]: ['apiKey', 'apiSecret', 'baseUrl'],
      [INTEGRATION_TYPES.WMS]: ['username', 'password', 'tenant', 'endpoint'],
      [INTEGRATION_TYPES.TMS]: ['clientId', 'clientSecret', 'region'],
      [INTEGRATION_TYPES.CRM]: ['accessToken', 'refreshToken', 'domain']
    };

    const required = requiredFields[this.systemType];
    const hasAllFields = required.every(field => credentials.hasOwnProperty(field));
    if (!hasAllFields) {
      return false;
    }

    // Validate credential format and encryption
    if (this.systemType === INTEGRATION_TYPES.ERP) {
      return /^[A-Za-z0-9-_]{32}$/.test(credentials.apiKey);
    } else if (this.systemType === INTEGRATION_TYPES.WMS) {
      return credentials.endpoint.startsWith('https://');
    } else if (this.systemType === INTEGRATION_TYPES.TMS) {
      return /^[A-Za-z0-9-]{36}$/.test(credentials.clientId);
    } else if (this.systemType === INTEGRATION_TYPES.CRM) {
      return typeof credentials.accessToken === 'string' && credentials.accessToken.length >= 32;
    }

    return false;
  } catch (error) {
    console.error('Credential validation error:', error);
    return false;
  }
};

// Requirement: Webhook Support - Schema for webhook configurations
const WebhookSchema = new Schema({
  integrationId: {
    type: Schema.Types.ObjectId,
    ref: 'Integration',
    required: true,
    index: true
  },
  url: {
    type: String,
    required: true,
    validate: {
      validator: (v: string) => /^https:\/\//.test(v),
      message: 'Webhook URL must use HTTPS protocol'
    }
  },
  event: {
    type: String,
    required: true,
    index: true
  },
  headers: {
    type: Map,
    of: String,
    default: new Map()
  },
  status: {
    type: String,
    required: true,
    enum: Object.values(WEBHOOK_STATUS),
    default: WEBHOOK_STATUS.ACTIVE,
    index: true
  },
  retryCount: {
    type: Number,
    default: 0
  },
  lastTriggered: {
    type: Date,
    default: null
  }
}, {
  timestamps: true,
  versionKey: false
});

// Requirement: Webhook Support - URL validation and accessibility check
WebhookSchema.methods.validateWebhookUrl = async function(url: string): Promise<boolean> {
  try {
    // Check URL format
    const urlPattern = /^https:\/\/(?:[\w-]+\.)+[\w-]+(?::\d+)?(?:\/[\w-./?%&=]*)?$/;
    if (!urlPattern.test(url)) {
      return false;
    }

    // Verify URL accessibility with a HEAD request
    const response = await fetch(url, {
      method: 'HEAD',
      headers: {
        'User-Agent': 'FleetTracker-Webhook-Validator/1.0'
      }
    });

    // Check SSL certificate if HTTPS
    if (url.startsWith('https://')) {
      const sslInfo = await new Promise((resolve, reject) => {
        const https = require('https');
        const options = new URL(url);
        const req = https.request(options, (res: any) => {
          resolve(res.socket.getPeerCertificate());
        });
        req.on('error', reject);
        req.end();
      });

      if (!sslInfo || sslInfo.valid === false) {
        return false;
      }
    }

    return response.ok;
  } catch (error) {
    console.error('Webhook URL validation error:', error);
    return false;
  }
};

// Indexes for performance optimization
IntegrationSchema.index({ systemType: 1, status: 1 });
IntegrationSchema.index({ lastSyncTime: 1 }, { sparse: true });
WebhookSchema.index({ event: 1, status: 1 });
WebhookSchema.index({ integrationId: 1, event: 1 }, { unique: true });

// Create and export models
export const Integration = model('Integration', IntegrationSchema);
export const Webhook = model('Webhook', WebhookSchema);