// Human Tasks:
// 1. Configure WebSocket SSL certificates for secure real-time communication
// 2. Set up monitoring alerts for concurrent connection thresholds
// 3. Configure rate limiting for WebSocket connections
// 4. Review and adjust fleet tracking data retention policies
// 5. Set up backup strategy for fleet operational data

// Third-party imports
import express, { Express } from 'express'; // ^4.18.2
import { Server } from 'socket.io'; // ^4.7.0

// Internal imports
import initializeFleetRoutes from './routes/fleetRoutes';
import { SOCKET_EVENTS } from '../../common/config/socket';

/**
 * Sets up WebSocket event handlers for real-time fleet updates
 * Requirements: Real-time GPS Tracking, System Performance
 */
const setupFleetSocketHandlers = (io: Server): void => {
    io.on(SOCKET_EVENTS.CONNECTION, (socket) => {
        console.log(`Fleet client connected: ${socket.id}`);

        // Handle real-time location updates with 30-second interval validation
        socket.on(SOCKET_EVENTS.LOCATION_UPDATE, async (data) => {
            try {
                // Validate update interval
                const lastUpdate = await io.sockets.adapter.pubClient.get(`last_update:${data.vehicleId}`);
                const now = Date.now();
                if (lastUpdate && (now - parseInt(lastUpdate)) < 30000) {
                    socket.emit(SOCKET_EVENTS.ERROR, {
                        message: 'Location update interval must be at least 30 seconds'
                    });
                    return;
                }

                // Store last update timestamp
                await io.sockets.adapter.pubClient.set(`last_update:${data.vehicleId}`, now.toString());

                // Broadcast location update to subscribers
                socket.broadcast.emit(`vehicle:${data.vehicleId}:location`, data);
            } catch (error) {
                socket.emit(SOCKET_EVENTS.ERROR, {
                    message: 'Failed to process location update',
                    error: error instanceof Error ? error.message : 'Unknown error'
                });
            }
        });

        // Handle vehicle status updates with role-based access control
        socket.on(SOCKET_EVENTS.VEHICLE_STATUS, (data) => {
            try {
                // Verify user role from socket handshake auth
                const userRole = socket.handshake.auth.role;
                if (!['ADMIN', 'FLEET_MANAGER'].includes(userRole)) {
                    socket.emit(SOCKET_EVENTS.ERROR, {
                        message: 'Unauthorized to update vehicle status'
                    });
                    return;
                }

                // Broadcast status update to subscribers
                socket.broadcast.emit(`vehicle:${data.vehicleId}:status`, data);
            } catch (error) {
                socket.emit(SOCKET_EVENTS.ERROR, {
                    message: 'Failed to process status update',
                    error: error instanceof Error ? error.message : 'Unknown error'
                });
            }
        });

        // Handle client disconnection
        socket.on(SOCKET_EVENTS.DISCONNECT, () => {
            console.log(`Fleet client disconnected: ${socket.id}`);
        });

        // Handle WebSocket errors
        socket.on(SOCKET_EVENTS.ERROR, (error) => {
            console.error(`Fleet socket error for client ${socket.id}:`, error);
        });
    });
}

/**
 * Initializes the Fleet Management Service with routes and WebSocket handlers
 * Requirements: Fleet Management Service, Real-time Communications
 */
const initializeFleetService = (app: Express, io: Server): Express => {
    // Initialize fleet management routes
    app.use('/api/v1/fleet', initializeFleetRoutes());

    // Set up WebSocket handlers for real-time fleet updates
    setupFleetSocketHandlers(io);

    // Configure error handling middleware for fleet service
    app.use((err: Error, req: express.Request, res: express.Response, next: express.NextFunction) => {
        console.error('Fleet Service Error:', err);
        res.status(500).json({
            status: 'error',
            message: 'Internal Fleet Service Error',
            error: process.env.NODE_ENV === 'development' ? err.message : undefined
        });
    });

    // Monitor concurrent connections for performance
    setInterval(() => {
        const connectedClients = io.sockets.sockets.size;
        if (connectedClients > 10000) {
            console.warn(`High number of concurrent connections: ${connectedClients}`);
        }
    }, 60000);

    return app;
}

export default initializeFleetService;