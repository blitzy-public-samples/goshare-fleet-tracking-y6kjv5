// @mui/material version: ^5.0.0
// @mui/material/styles version: ^5.0.0
// react version: ^18.0.0

// Human Tasks:
// 1. Review and adjust Material-UI theme breakpoints for responsive design
// 2. Configure sidebar width in theme constants
// 3. Test layout responsiveness across different screen sizes
// 4. Verify accessibility compliance with WCAG guidelines
// 5. Set up error boundaries for layout components

import React, { useState, useCallback } from 'react';
import { Box, Container, useTheme, useMediaQuery } from '@mui/material';
import { styled } from '@mui/material/styles';
import { Header, HeaderProps } from './Header';
import { Sidebar } from './Sidebar';
import Footer from './Footer';

// Requirement: Web Dashboard Layout
// Location: 6.1 User Interface Design/6.1.1 Web Dashboard Layout
// Implementation: Core layout structure constants
const SIDEBAR_WIDTH = 240;

// Requirement: Responsive Design
// Location: 1.1 System Overview/Web Dashboard
// Implementation: Styled components for responsive layout
const MainContainer = styled(Box)(({ theme }) => ({
  display: 'flex',
  flexDirection: 'column',
  minHeight: '100vh',
  backgroundColor: theme.palette.background.default
}));

const ContentWrapper = styled(Box)({
  display: 'flex',
  flex: 1,
  position: 'relative',
  zIndex: 1
});

interface MainContentProps {
  sidebarOpen: boolean;
}

const MainContent = styled(Container, {
  shouldForwardProp: (prop) => prop !== 'sidebarOpen'
})<MainContentProps>(({ theme, sidebarOpen }) => ({
  flex: 1,
  padding: theme.spacing(3),
  marginTop: '64px', // Header height
  marginLeft: sidebarOpen ? SIDEBAR_WIDTH : 0,
  transition: theme.transitions.create('margin', {
    easing: theme.transitions.easing.sharp,
    duration: theme.transitions.duration.leavingScreen
  }),
  maxWidth: '100%',
  [theme.breakpoints.down('sm')]: {
    padding: theme.spacing(2),
    marginLeft: 0
  }
}));

// Requirement: Web Dashboard Layout
// Location: 6.1 User Interface Design/6.1.1 Web Dashboard Layout
// Implementation: Main layout component interface
interface MainLayoutProps {
  children: React.ReactNode;
}

// Requirement: Cross-Platform Compatibility
// Location: 1.2 Scope/Performance Requirements
// Implementation: Responsive layout with Material-UI
const MainLayout: React.FC<MainLayoutProps> = ({ children }) => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const [sidebarOpen, setSidebarOpen] = useState(!isMobile);

  // Requirement: Responsive Design
  // Location: 1.1 System Overview/Web Dashboard
  // Implementation: Sidebar toggle handler with responsive behavior
  const handleSidebarToggle = useCallback(() => {
    setSidebarOpen(prev => !prev);
  }, []);

  // Handle responsive behavior
  React.useEffect(() => {
    if (isMobile) {
      setSidebarOpen(false);
    } else {
      setSidebarOpen(true);
    }
  }, [isMobile]);

  return (
    <MainContainer>
      {/* Requirement: Web Dashboard Layout
          Location: 6.1 User Interface Design/6.1.1 Web Dashboard Layout
          Implementation: Fixed header with navigation */}
      <Header 
        onMenuClick={handleSidebarToggle}
      />

      <ContentWrapper>
        {/* Requirement: Web Dashboard Layout
            Location: 6.1 User Interface Design/6.1.1 Web Dashboard Layout
            Implementation: Collapsible sidebar navigation */}
        <Sidebar
          open={sidebarOpen}
          onClose={handleSidebarToggle}
          width={SIDEBAR_WIDTH}
        />

        {/* Requirement: Responsive Design
            Location: 1.1 System Overview/Web Dashboard
            Implementation: Main content area with responsive margins */}
        <MainContent
          sidebarOpen={sidebarOpen}
          maxWidth={false}
          component="main"
          role="main"
          aria-label="Main content"
        >
          {children}
        </MainContent>
      </ContentWrapper>

      {/* Requirement: Web Dashboard Layout
          Location: 6.1 User Interface Design/6.1.1 Web Dashboard Layout
          Implementation: Application footer */}
      <Footer
        version="1.0.0"
        companyName="Fleet Tracker"
      />
    </MainContainer>
  );
};

export { MainLayout };
export type { MainLayoutProps };