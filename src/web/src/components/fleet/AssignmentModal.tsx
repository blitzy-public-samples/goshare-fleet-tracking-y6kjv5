// @mui/material version ^5.0.0
// react-redux version ^8.0.5
import React, { useState, useCallback } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import {
  Box,
  Typography,
  Select,
  MenuItem,
  Button,
  SelectChangeEvent,
} from '@mui/material';
import Modal from '../common/Modal';
import { Vehicle, Driver } from '../../types';
import { selectDriversByStatus } from '../../store/slices/fleetSlice';

/*
Human Tasks:
1. Verify Material-UI theme configuration
2. Test modal accessibility with screen readers
3. Ensure real-time status updates are properly configured
4. Review error handling thresholds with operations team
*/

// Interface for AssignmentModal component props
interface AssignmentModalProps {
  open: boolean;
  onClose: () => void;
  selectedVehicle: Vehicle | null;
}

/**
 * AssignmentModal component for managing vehicle-driver assignments
 * Implements requirements:
 * - Interactive fleet management dashboard
 * - Two-way communication system for real-time updates
 */
const AssignmentModal: React.FC<AssignmentModalProps> = ({
  open,
  onClose,
  selectedVehicle,
}) => {
  // Local state for driver selection and error handling
  const [selectedDriverId, setSelectedDriverId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Redux hooks
  const dispatch = useDispatch();
  const availableDrivers = useSelector((state: any) => 
    selectDriversByStatus(state, 'AVAILABLE')
  );

  // Handle driver selection from dropdown
  const handleDriverChange = useCallback((event: SelectChangeEvent<string>) => {
    setSelectedDriverId(event.target.value);
    setError(null);
  }, []);

  // Process vehicle-driver assignment
  const handleAssignment = useCallback(async () => {
    if (!selectedVehicle || !selectedDriverId) {
      setError('Please select a driver to proceed with assignment');
      return;
    }

    try {
      // Dispatch assignment action to Redux store
      await dispatch({
        type: 'fleet/assignDriver',
        payload: {
          vehicleId: selectedVehicle.id,
          driverId: selectedDriverId,
        },
      });

      // Close modal on successful assignment
      onClose();
    } catch (err) {
      setError('Failed to assign driver. Please try again.');
    }
  }, [selectedVehicle, selectedDriverId, dispatch, onClose]);

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={`Assign Driver to Vehicle ${selectedVehicle?.registrationNumber || ''}`}
    >
      <Box sx={styles.modalContent}>
        {/* Vehicle Information */}
        <Typography variant="body1">
          Vehicle Status: {selectedVehicle?.status || 'N/A'}
        </Typography>
        <Typography variant="body2" color="textSecondary">
          Last Updated: {selectedVehicle?.lastUpdate.toLocaleString() || 'N/A'}
        </Typography>

        {/* Driver Selection Dropdown */}
        <Select
          value={selectedDriverId || ''}
          onChange={handleDriverChange}
          displayEmpty
          fullWidth
          sx={styles.driverSelect}
        >
          <MenuItem value="" disabled>
            Select a driver
          </MenuItem>
          {availableDrivers.map((driver: Driver) => (
            <MenuItem key={driver.id} value={driver.id}>
              {driver.name} - {driver.status}
            </MenuItem>
          ))}
        </Select>

        {/* Error Message Display */}
        {error && (
          <Typography variant="body2" sx={styles.error}>
            {error}
          </Typography>
        )}

        {/* Action Buttons */}
        <Box sx={styles.actions}>
          <Button
            variant="outlined"
            onClick={onClose}
            sx={{ marginRight: 1 }}
          >
            Cancel
          </Button>
          <Button
            variant="contained"
            onClick={handleAssignment}
            disabled={!selectedDriverId}
          >
            Assign Driver
          </Button>
        </Box>
      </Box>
    </Modal>
  );
};

// Component styles
const styles = {
  modalContent: {
    padding: 3,
    display: 'flex',
    flexDirection: 'column',
    gap: 2,
  },
  driverSelect: {
    width: '100%',
    marginTop: 2,
  },
  actions: {
    marginTop: 3,
    display: 'flex',
    justifyContent: 'flex-end',
    gap: 1,
  },
  error: {
    color: 'error.main',
    marginTop: 1,
  },
} as const;

export default AssignmentModal;