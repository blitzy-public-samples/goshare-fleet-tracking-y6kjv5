/**
 * Human Tasks:
 * 1. Configure environment variables for location update intervals
 * 2. Set up monitoring alerts for location service health
 * 3. Configure geofencing alert thresholds in production
 * 4. Review and optimize WebSocket connection limits
 * 5. Set up backup strategy for location data
 */

// @version: express ^4.18.2
// @version: socket.io ^4.7.0
import { Express } from 'express';
import { Server } from 'socket.io';
import { locationRouter } from './routes/locationRoutes';
import { SOCKET_EVENTS } from '../../common/config/socket';

/**
 * Requirement: Real-time GPS tracking (1.2 Scope/Core Functionality)
 * Initializes the location service with Express routes and Socket.io event handlers
 */
export const initializeLocationService = (app: Express, io: Server): void => {
    // Register location routes with Express app
    app.use('/api/v1', locationRouter);

    // Initialize Socket.io event handlers
    setupLocationEventHandlers(io);

    console.log('Location service initialized successfully');
};

/**
 * Requirement: Real-time Communications (1.1 System Overview/Core Backend Services)
 * Sets up Socket.io event handlers for location-related events
 */
const setupLocationEventHandlers = (io: Server): void => {
    // Location update buffer to handle high-frequency updates
    const locationBuffer = new Map<string, any>();
    const BUFFER_INTERVAL = 30000; // 30 seconds

    io.on('connection', (socket) => {
        console.log(`Client connected to location service: ${socket.id}`);

        /**
         * Requirement: Real-time GPS tracking
         * Handle location updates with 30-second intervals
         */
        socket.on(SOCKET_EVENTS.LOCATION_UPDATE, async (data) => {
            try {
                const { vehicleId, location, timestamp } = data;

                // Validate location update data
                if (!vehicleId || !location || !timestamp) {
                    throw new Error('Invalid location update data');
                }

                // Buffer location updates
                locationBuffer.set(vehicleId, {
                    location,
                    timestamp,
                    socketId: socket.id
                });

                // Process buffered locations every 30 seconds
                setTimeout(() => {
                    processBufferedLocations(io, locationBuffer);
                }, BUFFER_INTERVAL);

            } catch (error) {
                console.error('Location update error:', error);
                socket.emit('error', {
                    message: 'Failed to process location update',
                    error: error instanceof Error ? error.message : 'Unknown error'
                });
            }
        });

        /**
         * Requirement: Real-time Communications
         * Handle vehicle status updates
         */
        socket.on(SOCKET_EVENTS.VEHICLE_STATUS, (data) => {
            try {
                const { vehicleId, status } = data;
                
                // Broadcast vehicle status to authorized clients
                socket.broadcast.emit(`${SOCKET_EVENTS.VEHICLE_STATUS}:${vehicleId}`, {
                    vehicleId,
                    status,
                    timestamp: new Date().toISOString()
                });
            } catch (error) {
                console.error('Vehicle status update error:', error);
                socket.emit('error', {
                    message: 'Failed to process vehicle status update',
                    error: error instanceof Error ? error.message : 'Unknown error'
                });
            }
        });

        // Handle client disconnection
        socket.on('disconnect', () => {
            console.log(`Client disconnected from location service: ${socket.id}`);
            // Clean up any resources associated with the socket
            cleanupDisconnectedClient(socket.id, locationBuffer);
        });
    });
};

/**
 * Requirement: Real-time GPS tracking
 * Process buffered location updates and broadcast to clients
 */
const processBufferedLocations = (io: Server, buffer: Map<string, any>): void => {
    try {
        const updates: any[] = [];

        // Process all buffered locations
        buffer.forEach((data, vehicleId) => {
            updates.push({
                vehicleId,
                location: data.location,
                timestamp: data.timestamp
            });
        });

        if (updates.length > 0) {
            // Broadcast batch updates to all connected clients
            io.emit('location:batch_update', updates);

            // Clear the buffer after processing
            buffer.clear();
        }
    } catch (error) {
        console.error('Error processing buffered locations:', error);
    }
};

/**
 * Requirement: Real-time Communications
 * Clean up resources when a client disconnects
 */
const cleanupDisconnectedClient = (socketId: string, buffer: Map<string, any>): void => {
    // Remove disconnected client's buffered locations
    buffer.forEach((data, vehicleId) => {
        if (data.socketId === socketId) {
            buffer.delete(vehicleId);
        }
    });
};

export default initializeLocationService;