// @mui/material version ^5.0.0
import React, { useState, useCallback, useMemo } from 'react';
import {
  Table as MuiTable,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TablePagination,
  TableRow,
  TableSortLabel,
  Paper
} from '@mui/material';
import { formatDateTime, formatDeliveryStatus } from '../../utils/format';
import { theme } from '../../config/theme';

// Human Tasks:
// 1. Verify pagination settings with UX team for optimal data display
// 2. Confirm sort direction indicators with design team
// 3. Review table cell padding and typography with design system
// 4. Validate accessibility requirements for table headers and controls

// Implements requirement: Interactive fleet management dashboard - Provides tabular display of fleet management data
interface TableProps {
  columns: Array<{
    id: string;
    label: string;
    sortable?: boolean;
    format?: (value: any) => string;
  }>;
  data: Array<any>;
  defaultSort?: string;
  defaultSortDirection?: 'asc' | 'desc';
  rowsPerPageOptions?: number[];
  onRowClick?: (row: any) => void;
}

// Implements requirement: Analytics and reporting - Supports data presentation for analytics and reporting features
const Table: React.FC<TableProps> = ({
  columns,
  data,
  defaultSort = '',
  defaultSortDirection = 'asc',
  rowsPerPageOptions = [10, 25, 50],
  onRowClick
}) => {
  // State management for sorting and pagination
  const [sortColumn, setSortColumn] = useState<string>(defaultSort);
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>(defaultSortDirection);
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(rowsPerPageOptions[0]);

  // Implements requirement: Dashboard Layout - Component for data grid in main content area
  const handleSort = useCallback((columnId: string) => {
    const isAsc = sortColumn === columnId && sortDirection === 'asc';
    setSortDirection(isAsc ? 'desc' : 'asc');
    setSortColumn(columnId);
  }, [sortColumn, sortDirection]);

  const handlePageChange = useCallback((_: unknown, newPage: number) => {
    setPage(newPage);
  }, []);

  const handleRowsPerPageChange = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0);
  }, []);

  // Sort and paginate data
  const sortedData = useMemo(() => {
    const sorted = [...data].sort((a, b) => {
      if (!sortColumn) return 0;

      const column = columns.find(col => col.id === sortColumn);
      if (!column) return 0;

      let aValue = a[sortColumn];
      let bValue = b[sortColumn];

      // Apply formatting if specified
      if (column.format) {
        aValue = column.format(aValue);
        bValue = column.format(bValue);
      }

      if (aValue < bValue) return sortDirection === 'asc' ? -1 : 1;
      if (aValue > bValue) return sortDirection === 'asc' ? 1 : -1;
      return 0;
    });

    return sorted.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage);
  }, [data, columns, sortColumn, sortDirection, page, rowsPerPage]);

  return (
    <Paper sx={{ width: '100%', overflow: 'hidden', boxShadow: theme.shadows[2] }}>
      <TableContainer sx={{ maxHeight: 'calc(100vh - 300px)' }}>
        <MuiTable stickyHeader>
          <TableHead>
            <TableRow>
              {columns.map(column => (
                <TableCell
                  key={column.id}
                  sortDirection={sortColumn === column.id ? sortDirection : false}
                  sx={{
                    backgroundColor: theme.palette.background.paper,
                    fontWeight: theme.typography.fontWeightBold
                  }}
                >
                  {column.sortable ? (
                    <TableSortLabel
                      active={sortColumn === column.id}
                      direction={sortColumn === column.id ? sortDirection : 'asc'}
                      onClick={() => handleSort(column.id)}
                    >
                      {column.label}
                    </TableSortLabel>
                  ) : (
                    column.label
                  )}
                </TableCell>
              ))}
            </TableRow>
          </TableHead>
          <TableBody>
            {sortedData.map((row, index) => (
              <TableRow
                hover
                key={index}
                onClick={() => onRowClick?.(row)}
                sx={{ cursor: onRowClick ? 'pointer' : 'default' }}
              >
                {columns.map(column => (
                  <TableCell key={column.id}>
                    {column.format ? column.format(row[column.id]) : row[column.id]}
                  </TableCell>
                ))}
              </TableRow>
            ))}
          </TableBody>
        </MuiTable>
      </TableContainer>
      <TablePagination
        rowsPerPageOptions={rowsPerPageOptions}
        component="div"
        count={data.length}
        rowsPerPage={rowsPerPage}
        page={page}
        onPageChange={handlePageChange}
        onRowsPerPageChange={handleRowsPerPageChange}
        sx={{
          borderTop: `1px solid ${theme.palette.divider}`,
          backgroundColor: theme.palette.background.paper
        }}
      />
    </Paper>
  );
};

export default Table;