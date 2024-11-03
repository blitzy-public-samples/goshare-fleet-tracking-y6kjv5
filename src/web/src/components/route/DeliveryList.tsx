// @mui/material version ^5.0.0
import React, { useCallback, useMemo } from 'react';
import { Box, Typography } from '@mui/material';
import Table from '../common/Table';
import { Delivery } from '../../types';
import { formatDateTime, formatDeliveryStatus } from '../../utils/format';

// Human Tasks:
// 1. Verify date format preferences with UX team
// 2. Confirm delivery status color coding with design team
// 3. Review table column widths for optimal data display
// 4. Validate accessibility requirements for delivery status indicators

interface DeliveryListProps {
  deliveries: Delivery[];
  onDeliveryClick: (delivery: Delivery) => void;
  loading: boolean;
}

/**
 * Defines the table columns configuration for the delivery list
 * Implements requirement: Dashboard Layout - Component for displaying delivery data in the main content area data grid
 */
const getTableColumns = () => [
  {
    id: 'id',
    label: 'Delivery ID',
    sortable: true,
  },
  {
    id: 'address',
    label: 'Delivery Address',
    sortable: true,
  },
  {
    id: 'scheduledTime',
    label: 'Scheduled Time',
    sortable: true,
    format: (value: Date) => formatDateTime(value, 'MMM dd, yyyy HH:mm'),
  },
  {
    id: 'status',
    label: 'Status',
    sortable: true,
    format: (value: string) => formatDeliveryStatus(value),
  },
];

/**
 * A React component that displays a list of deliveries in a tabular format
 * Implements requirements:
 * - Interactive fleet management dashboard - Provides interactive delivery list management
 * - Digital proof of delivery - Displays delivery status information
 * - Dashboard Layout - Component for displaying delivery data in the main content area data grid
 */
const DeliveryList: React.FC<DeliveryListProps> = ({
  deliveries,
  onDeliveryClick,
  loading,
}) => {
  // Memoize table columns configuration
  const columns = useMemo(() => getTableColumns(), []);

  // Handle click events on delivery rows
  const handleDeliveryClick = useCallback(
    (delivery: Delivery) => {
      // Prevent event bubbling and call the click handler
      onDeliveryClick(delivery);
    },
    [onDeliveryClick]
  );

  // Display loading state or empty state message
  if (loading) {
    return (
      <Box sx={{ p: 2, textAlign: 'center' }}>
        <Typography variant="body1" color="textSecondary">
          Loading deliveries...
        </Typography>
      </Box>
    );
  }

  if (!deliveries.length) {
    return (
      <Box sx={{ p: 2, textAlign: 'center' }}>
        <Typography variant="body1" color="textSecondary">
          No deliveries found
        </Typography>
      </Box>
    );
  }

  return (
    <Box sx={{ width: '100%', overflow: 'hidden' }}>
      <Table
        columns={columns}
        data={deliveries}
        onRowClick={handleDeliveryClick}
        defaultSort="scheduledTime"
        defaultSortDirection="asc"
        rowsPerPageOptions={[10, 25, 50, 100]}
      />
    </Box>
  );
};

export default DeliveryList;