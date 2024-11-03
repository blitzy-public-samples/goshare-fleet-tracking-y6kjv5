/**
 * HUMAN TASKS:
 * 1. Verify that the progress bar color matches the app's theme
 * 2. Test offline functionality with various network conditions
 * 3. Validate accessibility labels for screen readers
 * 4. Confirm that the estimated completion time calculation matches business requirements
 */

// Third-party imports
import React, { useMemo, useEffect } from 'react'; // ^18.2.0
import { StyleSheet, View, Text, ProgressBar } from 'react-native'; // ^0.72.0
import { MaterialIcons } from '@expo/vector-icons'; // ^13.0.0

// Internal imports
import { Route, RouteStatus, Delivery, DeliveryStatus } from '../../types';
import { useDelivery } from '../../hooks/useDelivery';
import { Card } from '../common/Card';

/**
 * Props interface for the RouteProgress component
 * Implements requirement: Display real-time route progress with 30-second update intervals
 */
export interface RouteProgressProps {
  route: Route;
  onProgressUpdate: (progress: number) => void;
}

/**
 * A component that displays the current progress of an active delivery route
 * Implements requirements:
 * - Real-time GPS tracking: Display real-time route progress with 30-second update intervals
 * - Mobile driver applications: React Native driver application with offline-first architecture
 * - Digital proof of delivery: Track completion status of deliveries within route
 */
export const RouteProgress: React.FC<RouteProgressProps> = ({ 
  route, 
  onProgressUpdate 
}) => {
  // Get delivery management functionality from useDelivery hook
  const { deliveries, updateDeliveryStatus } = useDelivery();

  /**
   * Calculate the current progress percentage of the route based on completed deliveries
   * Implements requirement: Track completion status of deliveries within route
   */
  const calculateProgress = (deliveries: Delivery[]): number => {
    if (!deliveries.length) return 0;
    
    const completedDeliveries = deliveries.filter(
      delivery => delivery.status === DeliveryStatus.COMPLETED
    ).length;
    
    return completedDeliveries / deliveries.length;
  };

  /**
   * Calculate the estimated completion time based on remaining deliveries
   * Implements requirement: Display real-time route progress with completion estimates
   */
  const getEstimatedCompletion = (route: Route, progress: number): string => {
    if (progress >= 1) return 'Completed';
    if (route.status === RouteStatus.NOT_STARTED) return 'Not Started';
    
    // Calculate average delivery time from completed deliveries
    const completedDeliveries = route.deliveries.filter(
      d => d.status === DeliveryStatus.COMPLETED
    );
    
    if (!completedDeliveries.length) return 'Calculating...';
    
    const now = Date.now();
    const remainingDeliveries = route.deliveries.length - completedDeliveries.length;
    
    // Calculate average time per delivery
    const avgTimePerDelivery = completedDeliveries.reduce((acc, delivery) => {
      const deliveryTime = delivery.proofOfDelivery?.timestamp || now;
      return acc + (deliveryTime - route.startTime) / completedDeliveries.length;
    }, 0);
    
    // Estimate remaining time
    const estimatedCompletion = now + (avgTimePerDelivery * remainingDeliveries);
    
    // Format the time
    return new Date(estimatedCompletion).toLocaleTimeString([], {
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  // Calculate current progress
  const progress = useMemo(() => calculateProgress(route.deliveries), [route.deliveries]);

  // Calculate stats
  const stats = useMemo(() => {
    const total = route.deliveries.length;
    const completed = route.deliveries.filter(
      d => d.status === DeliveryStatus.COMPLETED
    ).length;
    const remaining = total - completed;
    const estimatedCompletion = getEstimatedCompletion(route, progress);

    return {
      completed,
      remaining,
      total,
      estimatedCompletion
    };
  }, [route, progress]);

  // Update parent component when progress changes
  useEffect(() => {
    onProgressUpdate(progress);
  }, [progress, onProgressUpdate]);

  return (
    <Card style={styles.container}>
      {/* Progress Bar */}
      <View style={styles.progressContainer}>
        <MaterialIcons name="local-shipping" size={24} color="#666" />
        <ProgressBar
          style={styles.progressBar}
          progress={progress}
          color="#4CAF50"
        />
      </View>

      {/* Stats */}
      <View style={styles.statsContainer}>
        {/* Completed Deliveries */}
        <View style={styles.statItem}>
          <MaterialIcons name="check-circle" size={24} color="#4CAF50" />
          <Text style={styles.statValue}>{stats.completed}</Text>
          <Text style={styles.statLabel}>Completed</Text>
        </View>

        {/* Remaining Deliveries */}
        <View style={styles.statItem}>
          <MaterialIcons name="pending" size={24} color="#FFA000" />
          <Text style={styles.statValue}>{stats.remaining}</Text>
          <Text style={styles.statLabel}>Remaining</Text>
        </View>

        {/* Estimated Completion */}
        <View style={styles.statItem}>
          <MaterialIcons name="schedule" size={24} color="#1976D2" />
          <Text style={styles.statValue}>{stats.estimatedCompletion}</Text>
          <Text style={styles.statLabel}>Est. Completion</Text>
        </View>
      </View>
    </Card>
  );
};

/**
 * Styles for the RouteProgress component
 */
const styles = StyleSheet.create({
  container: {
    padding: 16,
    marginVertical: 8
  },
  progressContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 8
  },
  progressBar: {
    flex: 1,
    height: 8,
    borderRadius: 4,
    marginLeft: 12
  },
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 8
  },
  statItem: {
    alignItems: 'center'
  },
  statValue: {
    fontSize: 18,
    fontWeight: 'bold',
    marginVertical: 4
  },
  statLabel: {
    fontSize: 12,
    color: '#666'
  }
});