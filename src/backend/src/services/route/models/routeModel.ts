// Human Tasks:
// 1. Configure MongoDB geospatial indexes for delivery location queries
// 2. Set up PostgreSQL database indexes for route queries
// 3. Configure database backup and replication settings
// 4. Set up monitoring alerts for database performance
// 5. Configure connection pooling parameters based on load testing results

// Third-party imports
import mongoose, { Schema, Document } from 'mongoose'; // ^7.4.0
import { Pool } from 'pg'; // ^8.11.0

// Internal imports
import { DatabaseConfig, postgresPool, mongoConnection } from '../../../common/config/database';
import { Route, RouteStatus, Delivery, DeliveryStatus } from '../../../common/types';

// Requirement: Digital proof of delivery tracking and management with real-time status updates
const deliverySchema = new Schema({
  id: { type: String, required: true, index: true },
  routeId: { type: String, required: true, index: true },
  status: { 
    type: String, 
    enum: Object.values(DeliveryStatus),
    required: true,
    index: true 
  },
  location: {
    type: {
      latitude: Number,
      longitude: Number
    },
    required: true,
    index: '2dsphere' // Enable geospatial queries
  },
  scheduledTime: { type: Date, required: true },
  completedTime: { type: Date, default: null },
  proofOfDelivery: {
    signature: String,
    photos: [String],
    notes: String,
    timestamp: Date
  }
}, {
  timestamps: true
});

// Requirement: Route management data model that handles route planning and optimization
export class RouteModel {
  private postgresPool: Pool;
  private mongoConnection: mongoose.Connection;
  private deliveryModel: mongoose.Model<Document>;

  constructor() {
    this.postgresPool = postgresPool;
    this.mongoConnection = mongoConnection;
    this.deliveryModel = mongoose.model('Delivery', deliverySchema);
  }

  // Requirement: Route optimization and planning capabilities with efficient delivery sequence calculation
  public async createRoute(routeData: Route): Promise<Route> {
    const client = await this.postgresPool.connect();
    
    try {
      await client.query('BEGIN');

      // Insert route into PostgreSQL
      const routeQuery = `
        INSERT INTO routes (id, vehicle_id, driver_id, status, start_time, end_time, optimization_score)
        VALUES ($1, $2, $3, $4, $5, $6, $7)
        RETURNING *
      `;
      const routeValues = [
        routeData.id,
        routeData.vehicleId,
        routeData.driverId,
        routeData.status,
        routeData.startTime,
        routeData.endTime,
        routeData.optimizationScore
      ];
      const routeResult = await client.query(routeQuery, routeValues);

      // Create delivery documents in MongoDB
      const deliveryPromises = routeData.deliveries.map(delivery => 
        this.deliveryModel.create({
          ...delivery,
          routeId: routeData.id
        })
      );
      await Promise.all(deliveryPromises);

      await client.query('COMMIT');
      return { ...routeResult.rows[0], deliveries: routeData.deliveries };
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  // Requirement: Real-time route and delivery status synchronization
  public async updateRouteStatus(routeId: string, status: RouteStatus): Promise<Route> {
    const client = await this.postgresPool.connect();
    
    try {
      await client.query('BEGIN');

      // Update route status in PostgreSQL
      const routeQuery = `
        UPDATE routes 
        SET status = $1, updated_at = NOW()
        WHERE id = $2
        RETURNING *
      `;
      const routeResult = await client.query(routeQuery, [status, routeId]);

      // Update delivery statuses in MongoDB if route is completed or cancelled
      if (status === RouteStatus.COMPLETED || status === RouteStatus.CANCELLED) {
        const deliveryStatus = status === RouteStatus.COMPLETED ? 
          DeliveryStatus.DELIVERED : DeliveryStatus.CANCELLED;
        
        await this.deliveryModel.updateMany(
          { routeId, status: { $ne: deliveryStatus } },
          { $set: { status: deliveryStatus, completedTime: new Date() } }
        );
      }

      await client.query('COMMIT');

      // Fetch updated deliveries
      const deliveries = await this.deliveryModel.find({ routeId }).lean();
      return { ...routeResult.rows[0], deliveries };
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  // Requirement: Real-time route and delivery status synchronization
  public async getRouteById(routeId: string): Promise<Route> {
    const client = await this.postgresPool.connect();
    
    try {
      // Fetch route data from PostgreSQL
      const routeQuery = `
        SELECT * FROM routes WHERE id = $1
      `;
      const routeResult = await client.query(routeQuery, [routeId]);
      
      if (routeResult.rows.length === 0) {
        throw new Error(`Route not found: ${routeId}`);
      }

      // Fetch deliveries from MongoDB
      const deliveries = await this.deliveryModel.find({ routeId }).lean();
      
      return { ...routeResult.rows[0], deliveries };
    } finally {
      client.release();
    }
  }

  // Requirement: Route optimization and planning capabilities
  public async getActiveRoutes(): Promise<Route[]> {
    const client = await this.postgresPool.connect();
    
    try {
      // Fetch active routes from PostgreSQL
      const routeQuery = `
        SELECT * FROM routes 
        WHERE status = $1 
        ORDER BY start_time ASC
      `;
      const routeResult = await client.query(routeQuery, [RouteStatus.IN_PROGRESS]);

      // Fetch deliveries for all active routes from MongoDB
      const routeIds = routeResult.rows.map(route => route.id);
      const deliveries = await this.deliveryModel.find({
        routeId: { $in: routeIds }
      }).lean();

      // Combine route and delivery data
      return routeResult.rows.map(route => ({
        ...route,
        deliveries: deliveries.filter(d => d.routeId === route.id)
      }));
    } finally {
      client.release();
    }
  }

  // Requirement: Digital proof of delivery tracking and management
  public async updateDeliveryStatus(
    routeId: string,
    deliveryId: string,
    status: DeliveryStatus
  ): Promise<Delivery> {
    const client = await this.postgresPool.connect();
    
    try {
      await client.query('BEGIN');

      // Update delivery in MongoDB
      const delivery = await this.deliveryModel.findOneAndUpdate(
        { id: deliveryId, routeId },
        { 
          $set: { 
            status,
            completedTime: status === DeliveryStatus.DELIVERED ? new Date() : null
          }
        },
        { new: true }
      ).lean();

      if (!delivery) {
        throw new Error(`Delivery not found: ${deliveryId}`);
      }

      // Check if all deliveries are completed to update route status
      if (status === DeliveryStatus.DELIVERED) {
        const pendingDeliveries = await this.deliveryModel.countDocuments({
          routeId,
          status: { $nin: [DeliveryStatus.DELIVERED, DeliveryStatus.CANCELLED] }
        });

        if (pendingDeliveries === 0) {
          await client.query(`
            UPDATE routes 
            SET status = $1, updated_at = NOW()
            WHERE id = $2
          `, [RouteStatus.COMPLETED, routeId]);
        }
      }

      await client.query('COMMIT');
      return delivery as Delivery;
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  // Requirement: Route optimization and planning capabilities
  public async optimizeRoute(routeId: string): Promise<Route> {
    const client = await this.postgresPool.connect();
    
    try {
      await client.query('BEGIN');

      // Fetch route and delivery data
      const route = await this.getRouteById(routeId);
      
      // Calculate optimal delivery sequence using nearest neighbor algorithm
      const optimizedDeliveries = this.calculateOptimalSequence(route.deliveries);
      
      // Update delivery sequence in MongoDB
      for (let i = 0; i < optimizedDeliveries.length; i++) {
        await this.deliveryModel.updateOne(
          { id: optimizedDeliveries[i].id },
          { $set: { sequenceNumber: i } }
        );
      }

      // Update optimization score in PostgreSQL
      const optimizationScore = this.calculateOptimizationScore(optimizedDeliveries);
      await client.query(`
        UPDATE routes 
        SET optimization_score = $1, updated_at = NOW()
        WHERE id = $2
      `, [optimizationScore, routeId]);

      await client.query('COMMIT');

      return { ...route, deliveries: optimizedDeliveries, optimizationScore };
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  private calculateOptimalSequence(deliveries: Delivery[]): Delivery[] {
    // Implementation of nearest neighbor algorithm for route optimization
    const optimized = [...deliveries];
    for (let i = 0; i < optimized.length - 1; i++) {
      let minDistance = Infinity;
      let minIndex = i + 1;

      for (let j = i + 1; j < optimized.length; j++) {
        const distance = this.calculateDistance(
          optimized[i].location,
          optimized[j].location
        );
        if (distance < minDistance) {
          minDistance = distance;
          minIndex = j;
        }
      }

      // Swap to put nearest delivery next in sequence
      if (minIndex !== i + 1) {
        [optimized[i + 1], optimized[minIndex]] = 
        [optimized[minIndex], optimized[i + 1]];
      }
    }
    return optimized;
  }

  private calculateDistance(point1: { latitude: number; longitude: number }, 
                          point2: { latitude: number; longitude: number }): number {
    // Haversine formula for calculating distance between two points
    const R = 6371; // Earth's radius in km
    const dLat = this.toRad(point2.latitude - point1.latitude);
    const dLon = this.toRad(point2.longitude - point1.longitude);
    const lat1 = this.toRad(point1.latitude);
    const lat2 = this.toRad(point2.latitude);

    const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
              Math.sin(dLon/2) * Math.sin(dLon/2) * 
              Math.cos(lat1) * Math.cos(lat2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c;
  }

  private toRad(degrees: number): number {
    return degrees * Math.PI / 180;
  }

  private calculateOptimizationScore(deliveries: Delivery[]): number {
    // Calculate optimization score based on total distance and time windows
    let totalDistance = 0;
    let timeWindowViolations = 0;

    for (let i = 0; i < deliveries.length - 1; i++) {
      totalDistance += this.calculateDistance(
        deliveries[i].location,
        deliveries[i + 1].location
      );

      if (deliveries[i].scheduledTime > deliveries[i + 1].scheduledTime) {
        timeWindowViolations++;
      }
    }

    // Score calculation: 100 - (normalized distance penalty + time window penalty)
    const distancePenalty = Math.min(50, (totalDistance / deliveries.length) * 10);
    const timeWindowPenalty = timeWindowViolations * 5;
    
    return Math.max(0, 100 - distancePenalty - timeWindowPenalty);
  }
}