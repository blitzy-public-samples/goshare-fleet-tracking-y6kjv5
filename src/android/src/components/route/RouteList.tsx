/**
 * HUMAN TASKS:
 * 1. Verify proper offline storage configuration for route data caching
 * 2. Test pull-to-refresh behavior on different Android devices
 * 3. Validate accessibility features with screen readers
 * 4. Configure proper error tracking for failed route fetches
 */

// Third-party imports
import React, { useEffect, useCallback, memo } from 'react'; // ^18.0.0
import {
  StyleSheet,
  FlatList,
  View,
  Text,
  RefreshControl
} from 'react-native'; // ^0.72.0
import { useDispatch, useSelector } from 'react-redux'; // ^8.1.0

// Internal imports
import { Route, RouteStatus } from '../../types';
import { Card, CardProps } from '../common/Card';
import { routeActions, routeThunks } from '../../store/slices/routeSlice';

/**
 * Props interface for the RouteList component
 * Requirement: Interactive route management and status tracking
 */
export interface RouteListProps {
  onRouteSelect: (routeId: string) => void;
  refreshing: boolean;
  onRefresh: () => void;
}

/**
 * Props interface for individual route items
 * Requirement: Route optimization and planning
 */
interface RouteItemProps {
  route: Route;
  onPress: (routeId: string) => void;
}

/**
 * Returns the appropriate color for route status following Material Design guidelines
 * Requirement: Consistent visual presentation
 */
const getRouteStatusColor = (status: RouteStatus): string => {
  switch (status) {
    case RouteStatus.NOT_STARTED:
      return '#757575'; // Grey
    case RouteStatus.IN_PROGRESS:
      return '#2196F3'; // Blue
    case RouteStatus.COMPLETED:
      return '#4CAF50'; // Green
    case RouteStatus.CANCELLED:
      return '#F44336'; // Red
    default:
      return '#757575';
  }
};

/**
 * Renders an individual route item with its details and progress
 * Requirement: Interactive route management and status tracking
 */
const RouteItem = memo<RouteItemProps>(({ route, onPress }) => {
  // Calculate delivery completion percentage
  const completedDeliveries = route.deliveries.filter(
    delivery => delivery.status === 'COMPLETED'
  ).length;
  const completionPercentage = (completedDeliveries / route.deliveries.length) * 100;

  const handlePress = useCallback(() => {
    onPress(route.id);
  }, [route.id, onPress]);

  return (
    <Card
      onPress={handlePress}
      style={styles.routeItem}
    >
      <View style={styles.routeHeader}>
        <Text style={styles.routeId}>Route #{route.id}</Text>
        <View
          style={[
            styles.routeStatus,
            { backgroundColor: getRouteStatusColor(route.status) }
          ]}
        >
          <Text style={styles.routeStatusText}>{route.status}</Text>
        </View>
      </View>

      <Text style={styles.deliveryCount}>
        {completedDeliveries} of {route.deliveries.length} deliveries completed
      </Text>

      <View style={styles.progressBar}>
        <View
          style={[
            styles.progressFill,
            {
              width: `${completionPercentage}%`,
              backgroundColor: getRouteStatusColor(route.status)
            }
          ]}
        />
      </View>
    </Card>
  );
});

/**
 * Main route list component for displaying and managing routes with offline support
 * Requirement: Offline-first data handling capabilities for route management
 */
export const RouteList: React.FC<RouteListProps> = ({
  onRouteSelect,
  refreshing,
  onRefresh
}) => {
  const dispatch = useDispatch();
  const routes = useSelector((state: any) => state.route.routes);
  const loading = useSelector((state: any) => state.route.loading);

  // Initial route fetch and 30-second interval updates
  useEffect(() => {
    const fetchRoutes = () => {
      dispatch(routeThunks.fetchActiveRoute());
    };

    fetchRoutes();
    const interval = setInterval(fetchRoutes, 30000);

    return () => clearInterval(interval);
  }, [dispatch]);

  const renderItem = useCallback(({ item }: { item: Route }) => (
    <RouteItem route={item} onPress={onRouteSelect} />
  ), [onRouteSelect]);

  const keyExtractor = useCallback((item: Route) => item.id, []);

  return (
    <View style={styles.container}>
      <FlatList
        data={routes}
        renderItem={renderItem}
        keyExtractor={keyExtractor}
        contentContainerStyle={styles.listContainer}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={['#2196F3']} // Material Design primary color
          />
        }
      />
    </View>
  );
};

/**
 * Styles following Material Design principles
 * Requirement: Consistent visual presentation
 */
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#ffffff'
  },
  listContainer: {
    paddingVertical: 8
  },
  routeItem: {
    padding: 16,
    marginBottom: 8
  },
  routeHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8
  },
  routeId: {
    fontSize: 16,
    fontWeight: '600',
    color: '#212121'
  },
  routeStatus: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4
  },
  routeStatusText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '500'
  },
  deliveryCount: {
    marginTop: 8,
    color: '#666666',
    fontSize: 14
  },
  progressBar: {
    height: 4,
    backgroundColor: '#e0e0e0',
    borderRadius: 2,
    marginTop: 8,
    overflow: 'hidden'
  },
  progressFill: {
    height: '100%',
    borderRadius: 2
  }
});