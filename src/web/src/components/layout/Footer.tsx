/* HUMAN TASKS:
1. Verify Material-UI version compatibility with React 18
2. Test footer responsiveness across different screen sizes
3. Validate accessibility with screen readers
4. Ensure color contrast meets WCAG guidelines
*/

// @material-ui/core version: ^4.12.0
// @material-ui/icons version: ^4.11.2
// react version: ^18.0.0

import React from 'react';
import { Paper, Typography, Link } from '@material-ui/core';
import { GitHub, LinkedIn, Twitter } from '@material-ui/icons';
import '../../styles/theme.css';

// Requirement: Web Dashboard UI Framework
// Location: 1.1 System Overview/Web Dashboard
// Implementation: Material-UI components for footer layout
interface FooterProps {
  version: string;
  companyName: string;
}

const getCurrentYear = (): number => {
  return new Date().getFullYear();
};

// Requirement: Responsive Design
// Location: 4.2.1 Frontend Components/Web Dashboard
// Implementation: Responsive footer layout with flexbox
const Footer: React.FC<FooterProps> = ({ version, companyName }) => {
  return (
    <Paper
      component="footer"
      elevation={0}
      style={{
        padding: 'var(--spacing-md) var(--spacing-lg)',
        backgroundColor: 'var(--background-paper)',
        borderTop: '1px solid var(--border-color)',
        color: 'var(--text-secondary)',
        fontSize: 'var(--font-size-base)',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        position: 'relative',
        zIndex: 'var(--z-index-header)',
        '@media (max-width: 600px)': {
          flexDirection: 'column',
          gap: 'var(--spacing-md)',
          padding: 'var(--spacing-md)'
        }
      }}
      role="contentinfo"
      aria-label="Footer"
    >
      {/* Requirement: Cross-Platform Compatibility
          Location: 1.2 Scope/Performance Requirements
          Implementation: Semantic HTML and ARIA attributes */}
      <div style={{
        display: 'flex',
        gap: 'var(--spacing-md)',
        alignItems: 'center',
        '@media (max-width: 600px)': {
          flexWrap: 'wrap',
          justifyContent: 'center'
        }
      }}>
        <Typography
          variant="body2"
          style={{
            margin: 0,
            fontWeight: 'var(--font-weight-regular)',
            textAlign: 'center'
          }}
        >
          © {getCurrentYear()} {companyName}. All rights reserved.
        </Typography>
        <Typography
          variant="caption"
          style={{
            color: 'var(--text-disabled)',
            fontSize: '0.875rem',
            marginLeft: 'var(--spacing-md)',
            '@media (max-width: 600px)': {
              marginLeft: 0
            }
          }}
        >
          v{version}
        </Typography>
      </div>

      <nav
        style={{
          display: 'flex',
          gap: 'var(--spacing-md)',
          alignItems: 'center',
          '@media (max-width: 600px)': {
            flexWrap: 'wrap',
            justifyContent: 'center'
          }
        }}
        aria-label="Footer navigation"
      >
        <Link
          href="/privacy"
          color="inherit"
          underline="hover"
          variant="body2"
        >
          Privacy Policy
        </Link>
        <Link
          href="/terms"
          color="inherit"
          underline="hover"
          variant="body2"
        >
          Terms of Service
        </Link>
        <Link
          href="/contact"
          color="inherit"
          underline="hover"
          variant="body2"
        >
          Contact Us
        </Link>
        <div style={{ display: 'flex', gap: 'var(--spacing-sm)' }}>
          <Link
            href="https://github.com/organization"
            color="inherit"
            aria-label="GitHub"
            target="_blank"
            rel="noopener noreferrer"
          >
            <GitHub fontSize="small" />
          </Link>
          <Link
            href="https://linkedin.com/company/organization"
            color="inherit"
            aria-label="LinkedIn"
            target="_blank"
            rel="noopener noreferrer"
          >
            <LinkedIn fontSize="small" />
          </Link>
          <Link
            href="https://twitter.com/organization"
            color="inherit"
            aria-label="Twitter"
            target="_blank"
            rel="noopener noreferrer"
          >
            <Twitter fontSize="small" />
          </Link>
        </div>
      </nav>
    </Paper>
  );
};

export default Footer;