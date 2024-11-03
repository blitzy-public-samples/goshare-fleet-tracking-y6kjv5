/**
 * Human Tasks:
 * 1. Configure TEST_PORT in environment variables or use default 4001
 * 2. Ensure Redis is running for WebSocket tests
 * 3. Configure test environment variables for WebSocket SSL if needed
 */

// @version: jest ^29.6.0
// @version: socket.io-client ^4.7.0
// @version: supertest ^6.3.0

import { createServer } from 'http';
import { Server } from 'socket.io';
import { io as Client } from 'socket.io-client';
import createSocketServer, { SOCKET_EVENTS } from '../../src/common/config/socket';
import type { LocationUpdate } from '../../src/common/types';

// Test configuration constants
const TEST_PORT = Number(process.env.TEST_PORT) || 4001;
const TEST_VEHICLE_ID = 'test-vehicle-123';
const TEST_COORDINATES = { latitude: 40.7128, longitude: -74.006 };

describe('WebSocket Integration Tests', () => {
    let httpServer: any;
    let socketServer: Server;
    let clientSocket: any;

    // Requirement: Real-time Communications - Setup test environment
    beforeAll((done) => {
        // Create HTTP server
        httpServer = createServer();
        
        // Initialize Socket.io server
        socketServer = createSocketServer(httpServer);
        
        // Start listening on test port
        httpServer.listen(TEST_PORT, () => {
            clientSocket = Client(`http://localhost:${TEST_PORT}`, {
                transports: ['websocket'],
                autoConnect: false
            });
            done();
        });
    });

    // Cleanup after tests
    afterAll((done) => {
        if (clientSocket.connected) {
            clientSocket.disconnect();
        }
        httpServer.close();
        socketServer.close();
        done();
    });

    // Requirement: Real-time Communications - Test connection handling
    test('should handle WebSocket connection successfully', (done) => {
        clientSocket.connect();

        clientSocket.on('connect', () => {
            expect(clientSocket.connected).toBe(true);
            done();
        });
    });

    // Requirement: Real-time Data Synchronization - Test location updates
    test('should handle location updates correctly', (done) => {
        const testLocationUpdate: LocationUpdate = {
            vehicleId: TEST_VEHICLE_ID,
            coordinates: TEST_COORDINATES,
            timestamp: new Date(),
            speed: 50,
            heading: 180,
            accuracy: 10
        };

        // Create a second client to verify broadcast
        const clientSocket2 = Client(`http://localhost:${TEST_PORT}`, {
            transports: ['websocket']
        });

        clientSocket2.on(`${SOCKET_EVENTS.LOCATION_UPDATE}:${TEST_VEHICLE_ID}`, (data: LocationUpdate) => {
            expect(data).toEqual(testLocationUpdate);
            clientSocket2.disconnect();
            done();
        });

        clientSocket.emit(SOCKET_EVENTS.LOCATION_UPDATE, testLocationUpdate);
    });

    // Requirement: System Performance - Test connection options
    test('should apply correct socket configuration', (done) => {
        const socket = Client(`http://localhost:${TEST_PORT}`, {
            transports: ['websocket']
        });

        socket.on('connect', () => {
            // Verify socket configuration
            const engine = (socket as any).io.engine;
            expect(engine.opts.pingTimeout).toBe(30000);
            expect(engine.opts.pingInterval).toBe(25000);
            socket.disconnect();
            done();
        });

        socket.connect();
    });

    // Requirement: Real-time Communications - Test error handling
    test('should handle invalid location updates appropriately', (done) => {
        const invalidLocationUpdate = {
            vehicleId: TEST_VEHICLE_ID,
            // Missing required fields
            timestamp: new Date()
        };

        clientSocket.emit(SOCKET_EVENTS.LOCATION_UPDATE, invalidLocationUpdate);

        clientSocket.on(SOCKET_EVENTS.ERROR, (error: any) => {
            expect(error.message).toBe('Failed to process location update');
            done();
        });
    });

    // Requirement: System Performance - Test concurrent connections
    test('should handle multiple concurrent connections', (done) => {
        const numConnections = 10;
        const clients: any[] = [];
        let connectedClients = 0;

        for (let i = 0; i < numConnections; i++) {
            const client = Client(`http://localhost:${TEST_PORT}`, {
                transports: ['websocket']
            });

            client.on('connect', () => {
                connectedClients++;
                if (connectedClients === numConnections) {
                    // Verify all clients connected successfully
                    expect(connectedClients).toBe(numConnections);
                    
                    // Cleanup
                    clients.forEach(client => client.disconnect());
                    done();
                }
            });

            clients.push(client);
            client.connect();
        }
    });

    // Requirement: Real-time Data Synchronization - Test data broadcast
    test('should broadcast vehicle status updates to all clients', (done) => {
        const testStatus = {
            vehicleId: TEST_VEHICLE_ID,
            status: 'active',
            timestamp: new Date()
        };

        let receivedCount = 0;
        const expectedReceivers = 2;

        // Create additional test clients
        const additionalClients = Array.from({ length: expectedReceivers }).map(() =>
            Client(`http://localhost:${TEST_PORT}`, { transports: ['websocket'] })
        );

        additionalClients.forEach(client => {
            client.on(SOCKET_EVENTS.VEHICLE_STATUS, (data) => {
                expect(data).toEqual(testStatus);
                receivedCount++;

                if (receivedCount === expectedReceivers) {
                    additionalClients.forEach(client => client.disconnect());
                    done();
                }
            });
        });

        // Connect all clients before broadcasting
        Promise.all(additionalClients.map(client => 
            new Promise<void>(resolve => {
                client.on('connect', resolve);
                client.connect();
            })
        )).then(() => {
            // Broadcast status update
            socketServer.emit(SOCKET_EVENTS.VEHICLE_STATUS, testStatus);
        });
    });
});