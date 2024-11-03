// @mui/material version ^5.0.0
// @mui/icons-material version ^5.0.0
import React from 'react';
import { Modal as MuiModal, Box, IconButton } from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import { theme } from '../../config/theme';

/*
Human Tasks:
1. Verify that @mui/material and @mui/icons-material are installed with correct versions
2. Test modal accessibility with screen readers
3. Verify modal responsiveness on different screen sizes
4. Ensure modal z-index doesn't conflict with other overlays
*/

// Interface for Modal component props
interface ModalProps {
  open: boolean;
  onClose: () => void;
  title: React.ReactNode;
  children: React.ReactNode;
  maxWidth?: string;
  fullWidth?: boolean;
}

// Requirement: Material-UI component framework implementation for modal dialogs
const Modal: React.FC<ModalProps> = ({
  open,
  onClose,
  title,
  children,
  maxWidth = '600px',
  fullWidth = false,
}) => {
  // Requirement: Handles modal close events and invokes the onClose callback
  const handleClose = (event: React.MouseEvent<HTMLButtonElement>) => {
    event.stopPropagation(); // Prevent event propagation
    onClose(); // Call onClose callback function
  };

  return (
    // Requirement: Modal component for interactive dashboard operations
    <MuiModal
      open={open}
      onClose={onClose}
      aria-labelledby="modal-title"
      aria-describedby="modal-description"
    >
      <Box
        sx={{
          position: 'absolute',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          width: fullWidth ? '90%' : maxWidth,
          maxWidth: maxWidth,
          bgcolor: theme.palette.background.paper,
          borderRadius: '8px',
          boxShadow: 24,
          padding: theme.spacing(3),
          outline: 'none', // Remove default focus outline
        }}
      >
        {/* Modal Header */}
        <Box
          sx={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: theme.spacing(2),
            color: theme.palette.text.primary,
          }}
        >
          <Box
            id="modal-title"
            sx={{
              fontSize: '1.25rem',
              fontWeight: 500,
            }}
          >
            {title}
          </Box>
          <IconButton
            aria-label="close"
            onClick={handleClose}
            size="small"
            sx={{
              color: theme.palette.text.secondary,
              '&:hover': {
                color: theme.palette.text.primary,
              },
            }}
          >
            <CloseIcon />
          </IconButton>
        </Box>

        {/* Modal Content */}
        <Box
          id="modal-description"
          sx={{
            maxHeight: 'calc(100vh - 200px)',
            overflowY: 'auto',
            color: theme.palette.text.primary,
            '&::-webkit-scrollbar': {
              width: '8px',
            },
            '&::-webkit-scrollbar-track': {
              background: theme.palette.background.default,
            },
            '&::-webkit-scrollbar-thumb': {
              background: theme.palette.grey[300],
              borderRadius: '4px',
            },
            '&::-webkit-scrollbar-thumb:hover': {
              background: theme.palette.grey[400],
            },
          }}
        >
          {children}
        </Box>
      </Box>
    </MuiModal>
  );
};

export default Modal;