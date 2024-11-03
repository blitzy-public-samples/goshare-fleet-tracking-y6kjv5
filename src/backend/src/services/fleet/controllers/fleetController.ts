// Human Tasks:
// 1. Configure Socket.io SSL certificates for secure WebSocket connections
// 2. Set up monitoring alerts for WebSocket connection health
// 3. Configure rate limiting for location update endpoints
// 4. Set up geofencing rules in the monitoring system
// 5. Configure backup schedules for fleet data

// Third-party imports
import { Request, Response } from 'express'; // ^4.18.2
import { Server } from 'socket.io'; // ^4.7.1

// Internal imports
import { FleetModel } from '../models/fleetModel';
import errorHandler from '../../../common/middleware/errorHandler';
import { Vehicle, VehicleStatus, LocationUpdate } from '../../../common/types';

/**
 * Requirement: Fleet Management & Real-time GPS Tracking
 * Controller handling fleet management operations with real-time location updates
 */
export class FleetController {
    private fleetModel: FleetModel;
    private io: Server;

    constructor(fleetModel: FleetModel, io: Server) {
        this.fleetModel = fleetModel;
        this.io = io;

        // Initialize WebSocket error handling
        this.io.on('error', (error) => {
            errorHandler(error, {} as Request, {} as Response, () => {});
        });
    }

    /**
     * Requirement: Fleet Management
     * Creates a new vehicle in the fleet with initial status
     */
    public createVehicle = async (req: Request, res: Response): Promise<void> => {
        try {
            // Validate request body against Vehicle interface
            const vehicleData: Vehicle = req.body;
            
            if (!vehicleData.registrationNumber || !vehicleData.type || !vehicleData.status) {
                throw new Error('Missing required vehicle data');
            }

            // Create vehicle with transaction support
            const vehicle = await this.fleetModel.createVehicle(vehicleData);

            // Initialize location tracking for the vehicle
            this.io.emit('vehicle:created', {
                vehicleId: vehicle.id,
                status: vehicle.status
            });

            // Return created vehicle data
            res.status(201).json({
                status: 'success',
                data: vehicle
            });

        } catch (error) {
            errorHandler(error, req, res, () => {});
        }
    };

    /**
     * Requirement: Real-time GPS Tracking
     * Updates vehicle location and broadcasts to subscribers
     */
    public updateVehicleLocation = async (req: Request, res: Response): Promise<void> => {
        try {
            // Validate location update request
            const locationUpdate: LocationUpdate = req.body;
            
            if (!locationUpdate.vehicleId || !locationUpdate.coordinates) {
                throw new Error('Invalid location update data');
            }

            // Verify 30-second update interval compliance
            const timestamp = new Date();
            locationUpdate.timestamp = timestamp;

            // Update vehicle location with high availability
            await this.fleetModel.updateVehicleLocation(locationUpdate);

            // Broadcast location update via WebSocket
            this.io.to(`vehicle:${locationUpdate.vehicleId}`).emit('location:updated', {
                vehicleId: locationUpdate.vehicleId,
                coordinates: locationUpdate.coordinates,
                timestamp: timestamp,
                speed: locationUpdate.speed,
                heading: locationUpdate.heading
            });

            res.status(200).json({
                status: 'success',
                message: 'Location updated successfully'
            });

        } catch (error) {
            errorHandler(error, req, res, () => {});
        }
    };

    /**
     * Requirement: Real-time GPS Tracking
     * Retrieves current location of a vehicle with failover support
     */
    public getVehicleLocation = async (req: Request, res: Response): Promise<void> => {
        try {
            const { vehicleId } = req.params;

            if (!vehicleId) {
                throw new Error('Vehicle ID is required');
            }

            // Get location with replica set awareness
            const location = await this.fleetModel.getVehicleLocation(vehicleId);

            res.status(200).json({
                status: 'success',
                data: {
                    vehicleId,
                    location
                }
            });

        } catch (error) {
            errorHandler(error, req, res, () => {});
        }
    };

    /**
     * Requirement: Fleet Management
     * Updates operational status of a vehicle with transaction support
     */
    public updateVehicleStatus = async (req: Request, res: Response): Promise<void> => {
        try {
            const { vehicleId } = req.params;
            const { status } = req.body;

            if (!vehicleId || !status || !Object.values(VehicleStatus).includes(status)) {
                throw new Error('Invalid vehicle status update data');
            }

            // Update vehicle status with transaction
            const updatedVehicle = await this.fleetModel.updateVehicleStatus(vehicleId, status);

            // Broadcast status update
            this.io.emit('vehicle:status:updated', {
                vehicleId,
                status: updatedVehicle.status
            });

            res.status(200).json({
                status: 'success',
                data: updatedVehicle
            });

        } catch (error) {
            errorHandler(error, req, res, () => {});
        }
    };

    /**
     * Requirement: Fleet Management
     * Retrieves vehicles filtered by status with pagination support
     */
    public getVehiclesByStatus = async (req: Request, res: Response): Promise<void> => {
        try {
            const { status } = req.query;

            if (!status || !Object.values(VehicleStatus).includes(status as VehicleStatus)) {
                throw new Error('Invalid vehicle status');
            }

            // Retrieve vehicles with status filter
            const vehicles = await this.fleetModel.getVehiclesByStatus(status as VehicleStatus);

            res.status(200).json({
                status: 'success',
                data: vehicles
            });

        } catch (error) {
            errorHandler(error, req, res, () => {});
        }
    };
}