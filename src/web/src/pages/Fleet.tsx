// @mui/material version ^5.0.0
// react version ^18.0.0
// react-redux version ^8.0.0

/* Human Tasks:
1. Verify Google Maps API key is properly configured in environment variables
2. Ensure WebSocket connection is established for real-time updates
3. Configure monitoring alerts for tracking data latency
4. Review error handling thresholds with operations team
5. Test real-time updates with different network conditions
*/

import React, { useEffect, useState, useCallback } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { Grid, Box } from '@mui/material';

// Internal component imports
import FleetList from '../components/fleet/FleetList';
import VehicleDetails from '../components/fleet/VehicleDetails';
import AssignmentModal from '../components/fleet/AssignmentModal';
import MapContainer from '../components/map/MapContainer';

// Redux actions and selectors
import {
  fetchVehicles,
  setSelectedVehicle,
  selectVehicles,
  selectSelectedVehicle,
  LOCATION_POLLING_INTERVAL
} from '../store/slices/fleetSlice';

/**
 * Interface for local state management
 * Implements requirement: Interactive fleet management dashboard
 */
interface FleetPageState {
  isAssignmentModalOpen: boolean;
  selectedVehicleId: string | null;
}

/**
 * Main Fleet management page component
 * Implements requirements:
 * - Interactive fleet management dashboard (1.2 Scope/Core Functionality)
 * - Real-time GPS tracking with 30-second intervals (1.2 Scope/Core Functionality)
 * - Interactive mapping (1.1 System Overview/Web Dashboard)
 */
const Fleet: React.FC = () => {
  // Initialize Redux hooks
  const dispatch = useDispatch();
  const vehicles = useSelector(selectVehicles);
  const selectedVehicle = useSelector(selectSelectedVehicle);

  // Initialize local state
  const [state, setState] = useState<FleetPageState>({
    isAssignmentModalOpen: false,
    selectedVehicleId: null
  });

  /**
   * Fetch initial fleet data and set up real-time updates
   * Implements requirement: Real-time GPS tracking with 30-second intervals
   */
  useEffect(() => {
    // Initial data fetch
    dispatch(fetchVehicles());

    // Set up polling interval for real-time updates
    const intervalId = setInterval(() => {
      dispatch(fetchVehicles());
    }, LOCATION_POLLING_INTERVAL);

    // Cleanup interval on component unmount
    return () => clearInterval(intervalId);
  }, [dispatch]);

  /**
   * Handle vehicle selection from list or map
   * Implements requirement: Interactive fleet management dashboard
   */
  const handleVehicleSelect = useCallback((vehicleId: string) => {
    setState(prev => ({
      ...prev,
      selectedVehicleId: vehicleId
    }));
    dispatch(setSelectedVehicle(vehicleId));
  }, [dispatch]);

  /**
   * Handle assignment modal visibility
   * Implements requirement: Interactive fleet management dashboard
   */
  const handleAssignmentModalToggle = useCallback(() => {
    setState(prev => ({
      ...prev,
      isAssignmentModalOpen: !prev.isAssignmentModalOpen
    }));
  }, []);

  /**
   * Handle closing vehicle details panel
   */
  const handleDetailsClose = useCallback(() => {
    setState(prev => ({
      ...prev,
      selectedVehicleId: null
    }));
    dispatch(setSelectedVehicle(null));
  }, [dispatch]);

  return (
    <Box sx={{
      height: '100vh',
      display: 'flex',
      flexDirection: 'column',
      overflow: 'hidden'
    }}>
      <Grid container sx={{ flex: 1, overflow: 'hidden' }}>
        {/* Interactive Map Section */}
        <Grid item xs={12} md={8} sx={{ height: '100%' }}>
          <MapContainer
            vehicles={vehicles}
            onVehicleClick={handleVehicleSelect}
          />
        </Grid>

        {/* Fleet Management Section */}
        <Grid item xs={12} md={4} sx={{ 
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden'
        }}>
          {/* Fleet List Component */}
          <Box sx={{ flex: 1, overflow: 'auto' }}>
            <FleetList
              onVehicleSelect={handleVehicleSelect}
            />
          </Box>

          {/* Vehicle Details Panel */}
          {state.selectedVehicleId && (
            <Box sx={{ 
              flex: 0,
              minHeight: '300px',
              borderTop: 1,
              borderColor: 'divider'
            }}>
              <VehicleDetails
                vehicleId={state.selectedVehicleId}
                onClose={handleDetailsClose}
              />
            </Box>
          )}
        </Grid>
      </Grid>

      {/* Driver Assignment Modal */}
      <AssignmentModal
        open={state.isAssignmentModalOpen}
        onClose={handleAssignmentModalToggle}
        selectedVehicle={selectedVehicle}
      />
    </Box>
  );
};

export default Fleet;