// @mui/material version ^5.0.0
// react version ^18.0.0
// react-redux version ^8.0.5

// Human Tasks:
// 1. Verify real-time update interval (30 seconds) is configured in environment
// 2. Review table column configuration with UX team
// 3. Set up monitoring for real-time data synchronization performance
// 4. Configure error notification settings with the team
// 5. Validate accessibility requirements for interactive elements

import React, { useEffect, useState, useCallback, useMemo } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { Box, Modal } from '@mui/material';
import Table from '../common/Table';
import Loading from '../common/Loading';
import RouteDetails from './RouteDetails';
import { selectAllRoutes, fetchRoutes } from '../../store/slices/routeSlice';

// Implements requirement: Interactive fleet management dashboard
interface RouteListProps {
  onRouteSelect?: (routeId: string) => void;
}

/**
 * RouteList Component
 * Displays a list of delivery routes with real-time updates and interactive features
 * Implements requirements:
 * - Interactive fleet management dashboard (1.2 Scope/Core Functionality)
 * - Real-time data synchronization (1.2 Scope/Technical Implementation)
 * - Route optimization and planning (1.2 Scope/Core Functionality)
 */
const RouteList: React.FC<RouteListProps> = ({ onRouteSelect }) => {
  // Redux hooks for state management
  const dispatch = useDispatch();
  const routes = useSelector(selectAllRoutes);
  
  // Local state
  const [loading, setLoading] = useState(true);
  const [selectedRouteId, setSelectedRouteId] = useState<string | null>(null);
  const [modalOpen, setModalOpen] = useState(false);

  // Fetch routes on component mount and set up real-time updates
  useEffect(() => {
    const fetchData = async () => {
      try {
        await dispatch(fetchRoutes());
      } finally {
        setLoading(false);
      }
    };

    fetchData();

    // Set up 30-second polling interval for real-time updates
    const updateInterval = setInterval(() => {
      dispatch(fetchRoutes());
    }, 30000);

    return () => clearInterval(updateInterval);
  }, [dispatch]);

  // Handle route selection
  const handleRouteClick = useCallback((row: any) => {
    setSelectedRouteId(row.id);
    setModalOpen(true);
    onRouteSelect?.(row.id);
  }, [onRouteSelect]);

  // Handle modal close
  const handleCloseModal = useCallback(() => {
    setModalOpen(false);
    setSelectedRouteId(null);
  }, []);

  // Table column configuration
  const columns = useMemo(() => [
    {
      id: 'id',
      label: 'Route ID',
      sortable: true
    },
    {
      id: 'status',
      label: 'Status',
      sortable: true,
      format: (value: string) => value.toUpperCase()
    },
    {
      id: 'vehicleId',
      label: 'Vehicle',
      sortable: true
    },
    {
      id: 'driverId',
      label: 'Driver',
      sortable: true
    },
    {
      id: 'deliveryCount',
      label: 'Deliveries',
      sortable: true,
      format: (value: number) => value.toString()
    },
    {
      id: 'startTime',
      label: 'Start Time',
      sortable: true,
      format: (value: string) => new Date(value).toLocaleString()
    },
    {
      id: 'endTime',
      label: 'End Time',
      sortable: true,
      format: (value: string) => new Date(value).toLocaleString()
    },
    {
      id: 'progress',
      label: 'Progress',
      sortable: true,
      format: (value: number) => `${Math.round(value)}%`
    }
  ], []);

  // Transform routes data for table display
  const tableData = useMemo(() => routes.map(route => ({
    id: route.id,
    status: route.status,
    vehicleId: route.vehicleId,
    driverId: route.driverId,
    deliveryCount: route.deliveries.length,
    startTime: route.startTime,
    endTime: route.endTime,
    progress: (route.deliveries.filter(d => d.status === 'COMPLETED').length / route.deliveries.length) * 100
  })), [routes]);

  // Show loading state while fetching initial data
  if (loading) {
    return <Loading size={40} overlay />;
  }

  return (
    <Box sx={{ width: '100%', height: '100%' }}>
      {/* Route List Table */}
      <Table
        columns={columns}
        data={tableData}
        defaultSort="startTime"
        defaultSortDirection="desc"
        onRowClick={handleRouteClick}
        rowsPerPageOptions={[10, 25, 50, 100]}
      />

      {/* Route Details Modal */}
      <Modal
        open={modalOpen}
        onClose={handleCloseModal}
        aria-labelledby="route-details-modal"
        sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center'
        }}
      >
        <Box sx={{
          position: 'relative',
          width: '90%',
          maxWidth: 1200,
          maxHeight: '90vh',
          overflow: 'auto',
          bgcolor: 'background.paper',
          boxShadow: 24,
          p: 4,
          borderRadius: 1
        }}>
          {selectedRouteId && (
            <RouteDetails routeId={selectedRouteId} />
          )}
        </Box>
      </Modal>
    </Box>
  );
};

export default RouteList;