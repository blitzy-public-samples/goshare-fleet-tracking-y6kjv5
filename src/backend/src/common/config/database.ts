// Human Tasks:
// 1. Set up PostgreSQL and MongoDB environment variables in .env file
// 2. Configure read replica connection strings for each region
// 3. Set up database credentials in secure credential store
// 4. Configure database backup schedule and retention policy
// 5. Verify network security groups allow database access from application subnets
// 6. Set up database monitoring and alerting thresholds

// Third-party imports
import { Pool } from 'pg'; // ^8.11.0
import mongoose from 'mongoose'; // ^7.4.0
import { env } from 'process'; // built-in

// Internal imports
import { APP_CONSTANTS } from '../constants/index';

// Requirement: Database Architecture - PostgreSQL for relational data, MongoDB for location data
// Default PostgreSQL connection pool configuration for high performance
const DEFAULT_PG_POOL_CONFIG = {
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
  maxUses: 7500,
  statement_timeout: 10000,
  query_timeout: 10000,
  keepAlive: true,
  keepAliveInitialDelayMillis: 10000
};

// Default MongoDB connection options for high availability
const DEFAULT_MONGO_OPTIONS = {
  useNewUrlParser: true,
  useUnifiedTopology: true,
  retryWrites: true,
  w: 'majority',
  readPreference: 'nearest',
  maxPoolSize: 100,
  minPoolSize: 10,
  maxIdleTimeMS: 30000,
  serverSelectionTimeoutMS: 5000,
  heartbeatFrequencyMS: 10000
};

// Requirement: High Availability - Multi-region database deployment with failover capabilities
@retryable
export async function createPostgresPool(): Promise<Pool> {
  const isProd = APP_CONSTANTS.NODE_ENV === 'production';
  
  const poolConfig = {
    ...DEFAULT_PG_POOL_CONFIG,
    host: env.POSTGRES_HOST,
    port: parseInt(env.POSTGRES_PORT || '5432', 10),
    database: env.POSTGRES_DB,
    user: env.POSTGRES_USER,
    password: env.POSTGRES_PASSWORD,
    // Enable SSL for production environment
    ssl: isProd ? {
      rejectUnauthorized: true,
      ca: env.POSTGRES_CA_CERT
    } : false
  };

  const pool = new Pool(poolConfig);

  // Set up event handlers for connection management
  pool.on('connect', () => {
    console.log('New PostgreSQL client connected');
  });

  pool.on('error', (err, client) => {
    console.error('Unexpected PostgreSQL error:', err);
    console.error('Client:', client);
  });

  // Verify connection
  try {
    const client = await pool.connect();
    client.release();
    console.log('PostgreSQL connection pool established successfully');
  } catch (error) {
    console.error('Failed to establish PostgreSQL connection pool:', error);
    throw error;
  }

  return pool;
}

// Requirement: Scalable Database Architecture - MongoDB with replica set support
@retryable
export async function connectMongoDB(): Promise<mongoose.Connection> {
  const isProd = APP_CONSTANTS.NODE_ENV === 'production';
  
  const mongoOptions = {
    ...DEFAULT_MONGO_OPTIONS,
    // Additional production configurations
    ...(isProd && {
      replicaSet: env.MONGO_REPLICA_SET,
      authSource: 'admin',
      retryReads: true,
      compressors: ['snappy', 'zlib']
    })
  };

  try {
    await mongoose.connect(env.MONGODB_URI!, mongoOptions);
    
    // Set up connection event handlers
    mongoose.connection.on('connected', () => {
      console.log('MongoDB connected successfully');
    });

    mongoose.connection.on('error', (err) => {
      console.error('MongoDB connection error:', err);
    });

    mongoose.connection.on('disconnected', () => {
      console.log('MongoDB disconnected');
    });

    // Handle application termination
    process.on('SIGINT', async () => {
      await mongoose.connection.close();
      console.log('MongoDB connection closed through app termination');
      process.exit(0);
    });

    return mongoose.connection;
  } catch (error) {
    console.error('Failed to connect to MongoDB:', error);
    throw error;
  }
}

// Requirement: System Performance - Support for read replicas
export function getReadReplica(region: string): string {
  // Map of regions to read replica connection strings
  const readReplicas: { [key: string]: string[] } = {
    'us-east-1': env.POSTGRES_READ_REPLICAS_US_EAST?.split(',') || [],
    'us-west-2': env.POSTGRES_READ_REPLICAS_US_WEST?.split(',') || [],
    'eu-west-1': env.POSTGRES_READ_REPLICAS_EU?.split(',') || []
  };

  const replicas = readReplicas[region];
  if (!replicas || replicas.length === 0) {
    console.warn(`No read replicas found for region ${region}, using primary connection`);
    return env.POSTGRES_HOST!;
  }

  // Simple round-robin selection for read replicas
  const replicaIndex = Math.floor(Math.random() * replicas.length);
  return replicas[replicaIndex];
}

// Export database configuration utilities
export const DatabaseConfig = {
  createPostgresPool,
  connectMongoDB,
  getReadReplica
};

// Initialize primary PostgreSQL connection pool
export const postgresPool = await createPostgresPool();

// Initialize MongoDB connection
export const mongoConnection = await connectMongoDB();