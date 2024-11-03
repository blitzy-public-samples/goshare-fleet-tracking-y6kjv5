/**
 * Human Tasks:
 * 1. Install google-or-tools package version 7.8.0 with npm install google-or-tools@7.8.0
 * 2. Configure proper memory allocation for VRP solver in production environment
 * 3. Set up monitoring for optimization performance metrics
 * 4. Configure traffic data provider API keys in environment variables
 */

// @version: google-or-tools ^7.8.0
// @version: lodash ^4.17.21
import { VehicleRoutingProblem } from 'google-or-tools';
import { cloneDeep, chunk } from 'lodash';
import { Route, Delivery, Coordinates, DeliveryStatus } from '../../../common/types';
import { calculateDistance } from '../../location/utils/geoUtils';

// Constants for optimization parameters
const AVERAGE_SPEED_KMH = 35; // Average vehicle speed in urban areas
const TIME_WINDOW_BUFFER_MINUTES = 15; // Buffer time for deliveries
const MAX_COMPUTATION_TIME_MS = 5000; // Maximum time for optimization computation
const TRAFFIC_FACTOR_DEFAULT = 1.2; // Default traffic impact factor

/**
 * Requirement: Route optimization and planning
 * Optimizes the sequence of deliveries for a route using the Vehicle Routing Problem (VRP) algorithm
 */
export const optimizeDeliverySequence = async (route: Route): Promise<Delivery[]> => {
    // Validate input route
    if (!route || !route.deliveries || route.deliveries.length === 0) {
        throw new Error('Invalid route data for optimization');
    }

    // Filter out completed deliveries
    const pendingDeliveries = route.deliveries.filter(
        delivery => delivery.status !== DeliveryStatus.DELIVERED && 
                   delivery.status !== DeliveryStatus.CANCELLED
    );

    if (pendingDeliveries.length === 0) {
        return [];
    }

    try {
        // Build distance matrix
        const distanceMatrix = buildDistanceMatrix(pendingDeliveries);
        
        // Calculate time windows for each delivery
        const timeWindows = calculateTimeWindows(pendingDeliveries);

        // Initialize VRP solver
        const vrp = new VehicleRoutingProblem({
            computeTimeLimit: MAX_COMPUTATION_TIME_MS,
            numVehicles: 1, // Single route optimization
            depot: 0 // Start from first delivery
        });

        // Add distance matrix to the model
        vrp.setDistanceMatrix(distanceMatrix);

        // Add time windows constraints
        timeWindows.forEach((window, index) => {
            vrp.addTimeWindow(index, window.start, window.end);
        });

        // Solve the VRP
        const solution = await vrp.solve();

        if (!solution.routes || solution.routes.length === 0) {
            throw new Error('No feasible solution found for route optimization');
        }

        // Reorder deliveries based on optimization result
        const optimizedSequence = solution.routes[0].map(
            index => pendingDeliveries[index]
        );

        return optimizedSequence;
    } catch (error) {
        console.error('Route optimization failed:', error);
        throw new Error('Failed to optimize delivery sequence');
    }
};

/**
 * Requirement: Real-time Data Synchronization
 * Calculates a matrix of estimated travel times between all delivery points
 */
export const calculateTimeMatrix = (deliveries: Delivery[]): number[][] => {
    if (!deliveries || deliveries.length === 0) {
        throw new Error('Invalid deliveries data for time matrix calculation');
    }

    const matrix: number[][] = [];
    const locations = deliveries.map(delivery => delivery.location);

    // Calculate time matrix with traffic considerations
    for (let i = 0; i < locations.length; i++) {
        matrix[i] = [];
        for (let j = 0; j < locations.length; j++) {
            if (i === j) {
                matrix[i][j] = 0;
                continue;
            }

            const distance = calculateDistance(locations[i], locations[j]);
            // Convert distance to time in minutes considering traffic
            const timeInMinutes = (distance / 1000) * (60 / AVERAGE_SPEED_KMH) * TRAFFIC_FACTOR_DEFAULT;
            matrix[i][j] = Math.round(timeInMinutes);
        }
    }

    return matrix;
};

/**
 * Requirement: Route optimization and planning
 * Validates delivery time windows for feasibility in route optimization
 */
export const validateTimeWindows = (deliveries: Delivery[]): boolean => {
    if (!deliveries || deliveries.length === 0) {
        return false;
    }

    try {
        const sortedDeliveries = [...deliveries].sort(
            (a, b) => a.scheduledTime.getTime() - b.scheduledTime.getTime()
        );

        for (let i = 0; i < sortedDeliveries.length - 1; i++) {
            const current = sortedDeliveries[i];
            const next = sortedDeliveries[i + 1];

            // Calculate minimum travel time between consecutive deliveries
            const distance = calculateDistance(current.location, next.location);
            const minTravelTime = (distance / 1000) * (60 / AVERAGE_SPEED_KMH);

            // Check if there's enough time between deliveries
            const timeDiff = (next.scheduledTime.getTime() - current.scheduledTime.getTime()) / (1000 * 60);
            
            if (timeDiff < minTravelTime) {
                return false;
            }
        }

        return true;
    } catch (error) {
        console.error('Time window validation failed:', error);
        return false;
    }
};

/**
 * Requirement: Real-time Data Synchronization
 * Reoptimizes a route in real-time based on current conditions and progress
 */
export const reoptimizeRoute = async (
    route: Route,
    currentConditions: { trafficFactor?: number; roadClosures?: Coordinates[] }
): Promise<Delivery[]> => {
    // Filter out completed deliveries
    const remainingDeliveries = route.deliveries.filter(
        delivery => delivery.status === DeliveryStatus.PENDING ||
                   delivery.status === DeliveryStatus.IN_TRANSIT
    );

    if (remainingDeliveries.length <= 1) {
        return remainingDeliveries;
    }

    try {
        // Apply current traffic conditions to the optimization
        const trafficFactor = currentConditions.trafficFactor || TRAFFIC_FACTOR_DEFAULT;
        
        // Build new distance matrix with current conditions
        const distanceMatrix = buildDistanceMatrix(remainingDeliveries, trafficFactor);
        
        // Initialize VRP solver with updated parameters
        const vrp = new VehicleRoutingProblem({
            computeTimeLimit: MAX_COMPUTATION_TIME_MS,
            numVehicles: 1,
            depot: 0
        });

        vrp.setDistanceMatrix(distanceMatrix);

        // Add time windows for remaining deliveries
        const timeWindows = calculateTimeWindows(remainingDeliveries);
        timeWindows.forEach((window, index) => {
            vrp.addTimeWindow(index, window.start, window.end);
        });

        // Handle road closures if any
        if (currentConditions.roadClosures && currentConditions.roadClosures.length > 0) {
            applyRoadClosureConstraints(vrp, remainingDeliveries, currentConditions.roadClosures);
        }

        const solution = await vrp.solve();

        if (!solution.routes || solution.routes.length === 0) {
            throw new Error('No feasible solution found for route reoptimization');
        }

        // Reorder deliveries based on new optimization
        return solution.routes[0].map(index => remainingDeliveries[index]);
    } catch (error) {
        console.error('Route reoptimization failed:', error);
        throw new Error('Failed to reoptimize route');
    }
};

/**
 * Helper function to build distance matrix between delivery points
 */
const buildDistanceMatrix = (deliveries: Delivery[], trafficFactor: number = TRAFFIC_FACTOR_DEFAULT): number[][] => {
    const matrix: number[][] = [];
    const locations = deliveries.map(delivery => delivery.location);

    for (let i = 0; i < locations.length; i++) {
        matrix[i] = [];
        for (let j = 0; j < locations.length; j++) {
            if (i === j) {
                matrix[i][j] = 0;
                continue;
            }
            const distance = calculateDistance(locations[i], locations[j]);
            // Apply traffic factor to distances
            matrix[i][j] = Math.round(distance * trafficFactor);
        }
    }

    return matrix;
};

/**
 * Helper function to calculate time windows for deliveries
 */
const calculateTimeWindows = (deliveries: Delivery[]): { start: number; end: number; }[] => {
    const baseTime = new Date(Math.min(...deliveries.map(d => d.scheduledTime.getTime())));
    
    return deliveries.map(delivery => {
        const scheduledMinutes = Math.floor(
            (delivery.scheduledTime.getTime() - baseTime.getTime()) / (1000 * 60)
        );
        
        return {
            start: Math.max(0, scheduledMinutes - TIME_WINDOW_BUFFER_MINUTES),
            end: scheduledMinutes + TIME_WINDOW_BUFFER_MINUTES
        };
    });
};

/**
 * Helper function to apply road closure constraints to the VRP solver
 */
const applyRoadClosureConstraints = (
    vrp: VehicleRoutingProblem,
    deliveries: Delivery[],
    roadClosures: Coordinates[]
): void => {
    deliveries.forEach((delivery, index) => {
        roadClosures.forEach(closure => {
            const distanceToClosure = calculateDistance(delivery.location, closure);
            if (distanceToClosure < 1000) { // Within 1km of road closure
                vrp.addDisjunction([index]); // Prevent this delivery from being scheduled
            }
        });
    });
};