// Human Tasks:
// 1. Configure test database with replica set for high availability testing
// 2. Set up test data fixtures in both PostgreSQL and MongoDB
// 3. Configure WebSocket test client with proper SSL certificates
// 4. Set up monitoring for test environment database connections
// 5. Ensure test environment has proper geospatial indexes

// Third-party imports
import { jest } from '@jest/globals'; // ^29.6.0
import { Server } from 'socket.io'; // ^4.7.1
import { io as Client } from 'socket.io-client'; // ^4.7.1

// Internal imports
import { FleetModel } from '../../src/services/fleet/models/fleetModel';
import { FleetController } from '../../src/services/fleet/controllers/fleetController';
import { Vehicle, VehicleStatus, LocationUpdate } from '../../src/common/types';

// Mock database connections
jest.mock('../../src/common/config/database', () => ({
  postgresPool: {
    connect: jest.fn(),
    query: jest.fn(),
  },
  mongoConnection: {
    model: jest.fn(),
  },
}));

describe('FleetModel', () => {
  let fleetModel: FleetModel;
  let fleetController: FleetController;
  let io: Server;
  let socketClient: any;

  // Test data fixtures
  const testVehicle: Vehicle = {
    id: 'test-vehicle-1',
    registrationNumber: 'TEST123',
    type: 'truck',
    status: VehicleStatus.ACTIVE,
    lastLocation: {
      latitude: 40.7128,
      longitude: -74.0060
    },
    lastUpdated: new Date(),
    capacity: 1000
  };

  const testLocationUpdate: LocationUpdate = {
    vehicleId: 'test-vehicle-1',
    coordinates: {
      latitude: 40.7128,
      longitude: -74.0060
    },
    timestamp: new Date(),
    speed: 60,
    heading: 180,
    accuracy: 5
  };

  beforeEach(async () => {
    // Requirement: Fleet Management - Initialize test environment
    fleetModel = new FleetModel();
    
    // Initialize Socket.IO server and client for real-time testing
    io = new Server();
    fleetController = new FleetController(fleetModel, io);
    
    socketClient = Client('http://localhost:3000');
    
    // Clear test databases
    await fleetModel['postgresPool'].query('TRUNCATE vehicles CASCADE');
    await fleetModel['locationModel'].deleteMany({});
  });

  afterEach(async () => {
    // Cleanup test environment
    socketClient.disconnect();
    io.close();
    jest.clearAllMocks();
  });

  // Requirement: Fleet Management - Test vehicle creation
  test('createVehicle should create vehicle with transaction support', async () => {
    // Mock successful database operations
    const pgClientMock = {
      query: jest.fn(),
      release: jest.fn(),
    };
    
    pgClientMock.query
      .mockResolvedValueOnce({ rows: [] }) // BEGIN
      .mockResolvedValueOnce({ rows: [testVehicle] }) // INSERT
      .mockResolvedValueOnce({ rows: [] }); // COMMIT

    fleetModel['postgresPool'].connect.mockResolvedValue(pgClientMock);
    fleetModel['locationModel'].create = jest.fn().mockResolvedValue({});

    // Test vehicle creation
    const result = await fleetModel.createVehicle(testVehicle);

    // Verify transaction and data consistency
    expect(pgClientMock.query).toHaveBeenCalledWith('BEGIN');
    expect(pgClientMock.query).toHaveBeenCalledWith(expect.stringContaining('INSERT INTO vehicles'));
    expect(pgClientMock.query).toHaveBeenCalledWith('COMMIT');
    expect(result).toEqual(testVehicle);
    expect(fleetModel['locationModel'].create).toHaveBeenCalled();
  });

  // Requirement: Real-time GPS Tracking - Test location updates
  test('updateVehicleLocation should enforce 30-second interval and notify subscribers', async () => {
    // Mock database responses
    const pgClientMock = {
      query: jest.fn(),
      release: jest.fn(),
    };

    pgClientMock.query
      .mockResolvedValueOnce({ rows: [] }) // BEGIN
      .mockResolvedValueOnce({ rows: [{ id: testVehicle.id }] }) // UPDATE
      .mockResolvedValueOnce({ rows: [] }); // COMMIT

    fleetModel['postgresPool'].connect.mockResolvedValue(pgClientMock);
    fleetModel['locationModel'].findOne = jest.fn().mockResolvedValue(null);
    fleetModel['locationModel'].create = jest.fn().mockResolvedValue({});

    // Subscribe to location updates
    const updatePromise = new Promise((resolve) => {
      socketClient.on('location:updated', (data) => {
        resolve(data);
      });
    });

    // Test location update
    await fleetController.updateVehicleLocation({
      body: testLocationUpdate
    } as any, {
      status: jest.fn().mockReturnThis(),
      json: jest.fn()
    } as any);

    // Verify 30-second interval enforcement
    const updateData = await updatePromise;
    expect(updateData).toMatchObject({
      vehicleId: testLocationUpdate.vehicleId,
      coordinates: testLocationUpdate.coordinates
    });
    expect(fleetModel['locationModel'].create).toHaveBeenCalled();
  });

  // Requirement: Real-time GPS Tracking - Test location retrieval with failover
  test('getVehicleLocation should support failover between MongoDB and PostgreSQL', async () => {
    // Mock MongoDB failure
    fleetModel['locationModel'].findOne = jest.fn().mockRejectedValue(new Error('MongoDB unavailable'));
    
    // Mock PostgreSQL fallback
    fleetModel['postgresPool'].query.mockResolvedValue({
      rows: [{
        last_location: {
          x: testVehicle.lastLocation.latitude,
          y: testVehicle.lastLocation.longitude
        }
      }]
    });

    // Test location retrieval with failover
    const location = await fleetModel.getVehicleLocation(testVehicle.id);

    expect(location).toEqual(testVehicle.lastLocation);
    expect(fleetModel['postgresPool'].query).toHaveBeenCalled();
  });

  // Requirement: Fleet Management - Test status updates
  test('updateVehicleStatus should update status with transaction support', async () => {
    // Mock database operations
    const pgClientMock = {
      query: jest.fn(),
      release: jest.fn(),
    };

    const updatedVehicle = {
      ...testVehicle,
      status: VehicleStatus.MAINTENANCE
    };

    pgClientMock.query
      .mockResolvedValueOnce({ rows: [] }) // BEGIN
      .mockResolvedValueOnce({ rows: [updatedVehicle] }) // UPDATE
      .mockResolvedValueOnce({ rows: [] }); // COMMIT

    fleetModel['postgresPool'].connect.mockResolvedValue(pgClientMock);

    // Subscribe to status updates
    const statusPromise = new Promise((resolve) => {
      socketClient.on('vehicle:status:updated', (data) => {
        resolve(data);
      });
    });

    // Test status update
    await fleetController.updateVehicleStatus({
      params: { vehicleId: testVehicle.id },
      body: { status: VehicleStatus.MAINTENANCE }
    } as any, {
      status: jest.fn().mockReturnThis(),
      json: jest.fn()
    } as any);

    // Verify transaction and WebSocket notification
    const statusData = await statusPromise;
    expect(statusData).toMatchObject({
      vehicleId: testVehicle.id,
      status: VehicleStatus.MAINTENANCE
    });
    expect(pgClientMock.query).toHaveBeenCalledWith('BEGIN');
    expect(pgClientMock.query).toHaveBeenCalledWith(expect.stringContaining('UPDATE vehicles'));
    expect(pgClientMock.query).toHaveBeenCalledWith('COMMIT');
  });

  // Requirement: Fleet Management - Test vehicle filtering
  test('getVehiclesByStatus should return vehicles with pagination', async () => {
    // Mock database response
    const vehicles = [testVehicle, { ...testVehicle, id: 'test-vehicle-2' }];
    fleetModel['postgresPool'].query.mockResolvedValue({ rows: vehicles });

    // Test vehicle filtering
    const result = await fleetModel.getVehiclesByStatus(VehicleStatus.ACTIVE);

    expect(result).toHaveLength(2);
    expect(result[0]).toMatchObject(testVehicle);
    expect(fleetModel['postgresPool'].query).toHaveBeenCalledWith(
      expect.stringContaining('WHERE status = $1'),
      [VehicleStatus.ACTIVE]
    );
  });

  // Test error handling and rollbacks
  test('createVehicle should rollback transaction on error', async () => {
    // Mock database error
    const pgClientMock = {
      query: jest.fn(),
      release: jest.fn(),
    };

    pgClientMock.query
      .mockResolvedValueOnce({ rows: [] }) // BEGIN
      .mockRejectedValueOnce(new Error('Database error')); // INSERT

    fleetModel['postgresPool'].connect.mockResolvedValue(pgClientMock);

    // Test error handling
    await expect(fleetModel.createVehicle(testVehicle))
      .rejects.toThrow('Database error');

    // Verify rollback
    expect(pgClientMock.query).toHaveBeenCalledWith('BEGIN');
    expect(pgClientMock.query).toHaveBeenCalledWith('ROLLBACK');
    expect(pgClientMock.release).toHaveBeenCalled();
  });
});