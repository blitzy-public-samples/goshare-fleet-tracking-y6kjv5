// Human Tasks:
// 1. Configure MongoDB replica set for high availability
// 2. Set up PostgreSQL read replicas in each region
// 3. Configure geospatial indexes in MongoDB for location tracking
// 4. Set up monitoring alerts for database connection health
// 5. Configure backup schedules for both databases
// 6. Set up Redis pub/sub for location updates

// Third-party imports
import mongoose, { Schema, Document } from 'mongoose'; // ^7.4.0
import { Pool } from 'pg'; // ^8.11.0

// Internal imports
import { DatabaseConfig, postgresPool, mongoConnection } from '../../../common/config/database';
import { Vehicle, VehicleStatus, Coordinates, LocationUpdate } from '../../../common/types';

// Requirement: Real-time GPS tracking - Location schema with geospatial indexing
interface LocationDocument extends Document {
  vehicleId: string;
  coordinates: Coordinates;
  timestamp: Date;
  speed: number;
  heading: number;
}

// Requirement: Fleet Management - Fleet model class implementation
export class FleetModel {
  private postgresPool: Pool;
  private mongoConnection: mongoose.Connection;
  private locationSchema: Schema;
  private locationModel: mongoose.Model<LocationDocument>;

  constructor() {
    // Initialize database connections
    this.postgresPool = postgresPool;
    this.mongoConnection = mongoConnection;

    // Define MongoDB schema for location tracking
    this.locationSchema = new Schema({
      vehicleId: { type: String, required: true, index: true },
      coordinates: {
        latitude: { type: Number, required: true },
        longitude: { type: Number, required: true }
      },
      timestamp: { type: Date, required: true, index: true },
      speed: { type: Number, required: true },
      heading: { type: Number, required: true }
    }, {
      timestamps: true
    });

    // Add geospatial index for location queries
    this.locationSchema.index({ coordinates: '2dsphere' });

    // Initialize MongoDB model
    this.locationModel = mongoose.model<LocationDocument>('Location', this.locationSchema);
  }

  // Requirement: Fleet Management - Create new vehicle record
  async createVehicle(vehicleData: Vehicle): Promise<Vehicle> {
    const client = await this.postgresPool.connect();
    
    try {
      await client.query('BEGIN');

      // Insert vehicle record into PostgreSQL
      const result = await client.query(
        `INSERT INTO vehicles (registration_number, status, last_location)
         VALUES ($1, $2, point($3, $4))
         RETURNING id, registration_number, status, last_location`,
        [vehicleData.registrationNumber, vehicleData.status, 
         vehicleData.lastLocation.longitude, vehicleData.lastLocation.latitude]
      );

      // Initialize location tracking in MongoDB
      await this.locationModel.create({
        vehicleId: result.rows[0].id,
        coordinates: vehicleData.lastLocation,
        timestamp: new Date(),
        speed: 0,
        heading: 0
      });

      await client.query('COMMIT');

      return {
        id: result.rows[0].id,
        registrationNumber: result.rows[0].registration_number,
        status: result.rows[0].status as VehicleStatus,
        lastLocation: {
          latitude: result.rows[0].last_location.x,
          longitude: result.rows[0].last_location.y
        }
      };
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  // Requirement: Real-time GPS tracking - Update vehicle location
  async updateVehicleLocation(locationUpdate: LocationUpdate): Promise<void> {
    const client = await this.postgresPool.connect();
    
    try {
      await client.query('BEGIN');

      // Validate 30-second interval
      const lastUpdate = await this.locationModel
        .findOne({ vehicleId: locationUpdate.vehicleId })
        .sort({ timestamp: -1 });

      if (lastUpdate && 
          new Date().getTime() - lastUpdate.timestamp.getTime() < 30000) {
        throw new Error('Location updates must be at least 30 seconds apart');
      }

      // Update current location in PostgreSQL
      await client.query(
        `UPDATE vehicles 
         SET last_location = point($1, $2), 
             last_updated = NOW()
         WHERE id = $3`,
        [locationUpdate.coordinates.longitude, 
         locationUpdate.coordinates.latitude,
         locationUpdate.vehicleId]
      );

      // Store location history in MongoDB
      await this.locationModel.create({
        vehicleId: locationUpdate.vehicleId,
        coordinates: locationUpdate.coordinates,
        timestamp: locationUpdate.timestamp,
        speed: locationUpdate.speed,
        heading: locationUpdate.heading
      });

      await client.query('COMMIT');
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  // Requirement: Real-time GPS tracking - Get vehicle location
  async getVehicleLocation(vehicleId: string): Promise<Coordinates> {
    try {
      // Try MongoDB first for latest location
      const lastLocation = await this.locationModel
        .findOne({ vehicleId })
        .sort({ timestamp: -1 });

      if (lastLocation) {
        return lastLocation.coordinates;
      }

      // Fallback to PostgreSQL if MongoDB unavailable
      const result = await this.postgresPool.query(
        `SELECT last_location 
         FROM vehicles 
         WHERE id = $1`,
        [vehicleId]
      );

      if (result.rows.length === 0) {
        throw new Error('Vehicle not found');
      }

      return {
        latitude: result.rows[0].last_location.x,
        longitude: result.rows[0].last_location.y
      };
    } catch (error) {
      throw error;
    }
  }

  // Requirement: Fleet Management - Update vehicle status
  async updateVehicleStatus(vehicleId: string, status: VehicleStatus): Promise<Vehicle> {
    const client = await this.postgresPool.connect();
    
    try {
      await client.query('BEGIN');

      const result = await client.query(
        `UPDATE vehicles 
         SET status = $1, 
             updated_at = NOW()
         WHERE id = $2
         RETURNING id, registration_number, status, last_location`,
        [status, vehicleId]
      );

      if (result.rows.length === 0) {
        throw new Error('Vehicle not found');
      }

      await client.query('COMMIT');

      return {
        id: result.rows[0].id,
        registrationNumber: result.rows[0].registration_number,
        status: result.rows[0].status as VehicleStatus,
        lastLocation: {
          latitude: result.rows[0].last_location.x,
          longitude: result.rows[0].last_location.y
        }
      };
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  // Requirement: Fleet Management - Get vehicles by status
  async getVehiclesByStatus(status: VehicleStatus): Promise<Vehicle[]> {
    try {
      const result = await this.postgresPool.query(
        `SELECT id, registration_number, status, last_location
         FROM vehicles 
         WHERE status = $1
         ORDER BY updated_at DESC
         LIMIT 100`,
        [status]
      );

      return result.rows.map(row => ({
        id: row.id,
        registrationNumber: row.registration_number,
        status: row.status as VehicleStatus,
        lastLocation: {
          latitude: row.last_location.x,
          longitude: row.last_location.y
        }
      }));
    } catch (error) {
      throw error;
    }
  }
}