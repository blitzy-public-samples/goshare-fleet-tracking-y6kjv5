/**
 * Human Tasks:
 * 1. Configure Redis cluster credentials in environment variables
 * 2. Set up SSL certificates for secure WebSocket connections
 * 3. Configure proper network security groups for WebSocket ports
 * 4. Set up monitoring alerts for WebSocket connection thresholds
 */

// @version: socket.io ^4.7.0
// @version: ioredis ^5.3.0

import { Server as HttpServer } from 'http';
import { Server, Socket } from 'socket.io';
import Redis from 'ioredis';
import { LocationUpdate } from '../types/index';

// Requirement: Real-time Communications - Socket event constants
export const SOCKET_EVENTS = {
    LOCATION_UPDATE: 'location:update',
    VEHICLE_STATUS: 'vehicle:status',
    DELIVERY_STATUS: 'delivery:status',
    ROUTE_UPDATE: 'route:update',
    CONNECTION: 'connection',
    DISCONNECT: 'disconnect',
    ERROR: 'error'
} as const;

// Requirement: System Performance - Socket server configuration options
const DEFAULT_SOCKET_OPTIONS = {
    pingTimeout: 30000,           // 30 seconds ping timeout
    pingInterval: 25000,          // 25 seconds ping interval
    upgradeTimeout: 10000,        // 10 seconds upgrade timeout
    maxHttpBufferSize: 1000000,   // 1MB max http buffer size
    transports: ['websocket', 'polling'],
    cors: {
        origin: '*',
        methods: ['GET', 'POST']
    }
} as const;

// Requirement: Real-time Data Synchronization - Redis configuration
const redisClient = new Redis({
    host: process.env.REDIS_HOST || 'localhost',
    port: parseInt(process.env.REDIS_PORT || '6379'),
    password: process.env.REDIS_PASSWORD,
    retryStrategy: (times: number) => {
        return Math.min(times * 50, 2000);
    }
});

/**
 * Requirement: Real-time Communications
 * Creates and configures Socket.io server with Redis adapter for horizontal scaling
 */
export const createSocketServer = (httpServer: HttpServer): Server => {
    const io = new Server(httpServer, DEFAULT_SOCKET_OPTIONS);

    // Set up Redis adapter for horizontal scaling
    io.adapter(require('socket.io-redis')({
        pubClient: redisClient,
        subClient: redisClient.duplicate()
    }));

    setupEventHandlers(io);

    return io;
};

/**
 * Requirement: Real-time Communications
 * Sets up event handlers for Socket.io server events
 */
const setupEventHandlers = (io: Server): void => {
    io.on(SOCKET_EVENTS.CONNECTION, (socket: Socket) => {
        console.log(`Client connected: ${socket.id}`);

        // Handle location updates from vehicles
        socket.on(SOCKET_EVENTS.LOCATION_UPDATE, async (data: LocationUpdate) => {
            try {
                await handleLocationUpdate(socket, data);
            } catch (error) {
                socket.emit(SOCKET_EVENTS.ERROR, {
                    message: 'Failed to process location update',
                    error: error instanceof Error ? error.message : 'Unknown error'
                });
            }
        });

        // Handle disconnection
        socket.on(SOCKET_EVENTS.DISCONNECT, () => {
            console.log(`Client disconnected: ${socket.id}`);
        });

        // Handle errors
        socket.on(SOCKET_EVENTS.ERROR, (error: Error) => {
            console.error(`Socket error for client ${socket.id}:`, error);
        });
    });
};

/**
 * Requirement: Real-time Data Synchronization
 * Handles real-time location updates from vehicles
 */
const handleLocationUpdate = async (socket: Socket, data: LocationUpdate): Promise<void> => {
    // Validate location update data
    if (!data.vehicleId || !data.coordinates || !data.timestamp) {
        throw new Error('Invalid location update data');
    }

    // Store location update in Redis cache with 30-second expiration
    const locationKey = `vehicle:location:${data.vehicleId}`;
    await redisClient.hmset(locationKey, {
        latitude: data.coordinates.latitude,
        longitude: data.coordinates.longitude,
        speed: data.speed,
        heading: data.heading,
        timestamp: data.timestamp.toISOString()
    });
    await redisClient.expire(locationKey, 30);

    // Broadcast location update to subscribers
    socket.broadcast.emit(`${SOCKET_EVENTS.LOCATION_UPDATE}:${data.vehicleId}`, data);
};

export default createSocketServer;