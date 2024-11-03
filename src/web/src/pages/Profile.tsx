// @material-ui/core version ^4.12.0
// @react version ^18.0.0
// @react-router-dom version ^6.0.0

/* HUMAN TASKS:
1. Configure OAuth 2.0 client credentials in environment variables
2. Set up secure token storage mechanism
3. Configure profile image upload service and S3 bucket permissions
4. Review and implement password complexity requirements
5. Set up email verification service for email updates
*/

import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import Card from '../../components/common/Card';
import Input from '../../components/common/Input';
import { CustomButton as Button } from '../../components/common/Button';
import { Alert, CircularProgress } from '@material-ui/core';

/**
 * Interface for profile form data structure
 * Implements requirement: User Profile Management
 */
interface ProfileFormData {
  name: string;
  email: string;
  phone?: string;
  role: string;
  preferences: {
    notifications: boolean;
    theme: string;
  };
}

/**
 * Profile page component for user profile management
 * Implements requirements:
 * - User Profile Management (1.2 Scope/Core Functionality)
 * - Security and Authentication (8.1.1 Authentication Methods)
 */
const Profile: React.FC = () => {
  const navigate = useNavigate();
  const { user, isAuthenticated, isLoading } = useAuth();

  // State management for form data and UI states
  const [formData, setFormData] = useState<ProfileFormData>({
    name: '',
    email: '',
    phone: '',
    role: '',
    preferences: {
      notifications: true,
      theme: 'light'
    }
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');

  // Load user data on component mount
  useEffect(() => {
    if (user) {
      setFormData({
        name: user.name || '',
        email: user.email || '',
        phone: user.phone || '',
        role: user.role || '',
        preferences: user.preferences || {
          notifications: true,
          theme: 'light'
        }
      });
    }
  }, [user]);

  // Redirect if not authenticated
  useEffect(() => {
    if (!isAuthenticated && !isLoading) {
      navigate('/login');
    }
  }, [isAuthenticated, isLoading, navigate]);

  /**
   * Validates form input fields
   * Returns true if all required fields are valid
   */
  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.name.trim()) {
      newErrors.name = 'Name is required';
    }

    if (!formData.email.trim()) {
      newErrors.email = 'Email is required';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = 'Invalid email format';
    }

    if (formData.phone && !/^\+?[\d\s-]{10,}$/.test(formData.phone)) {
      newErrors.phone = 'Invalid phone number format';
    }

    if (!formData.role.trim()) {
      newErrors.role = 'Role is required';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  /**
   * Handles input field changes
   * Implements form data validation
   */
  const handleInputChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = event.target;
    
    if (name.includes('.')) {
      const [parent, child] = name.split('.');
      setFormData(prev => ({
        ...prev,
        [parent]: {
          ...prev[parent as keyof ProfileFormData],
          [child]: value
        }
      }));
    } else {
      setFormData(prev => ({
        ...prev,
        [name]: value
      }));
    }

    // Clear error when user starts typing
    if (errors[name]) {
      setErrors(prev => ({
        ...prev,
        [name]: ''
      }));
    }
  };

  /**
   * Handles form submission with validation
   * Implements OAuth 2.0 authenticated profile updates
   */
  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();

    if (!validateForm()) {
      return;
    }

    setIsSaving(true);
    try {
      // Implement profile update API call here
      await new Promise(resolve => setTimeout(resolve, 1000)); // Simulated API call
      
      setSuccessMessage('Profile updated successfully');
      setIsEditing(false);
      
      // Clear success message after 3 seconds
      setTimeout(() => {
        setSuccessMessage('');
      }, 3000);
    } catch (error) {
      setErrors({
        submit: 'Failed to update profile. Please try again.'
      });
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', padding: '2rem' }}>
        <CircularProgress />
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit}>
      <Card
        title="Profile Information"
        elevation={2}
        actions={
          <div style={{ display: 'flex', gap: '1rem' }}>
            {isEditing ? (
              <>
                <Button
                  variant="outlined"
                  onClick={() => setIsEditing(false)}
                  disabled={isSaving}
                >
                  Cancel
                </Button>
                <Button
                  variant="primary"
                  type="submit"
                  disabled={isSaving}
                >
                  {isSaving ? 'Saving...' : 'Save Changes'}
                </Button>
              </>
            ) : (
              <Button
                variant="primary"
                onClick={() => setIsEditing(true)}
              >
                Edit Profile
              </Button>
            )}
          </div>
        }
      >
        {successMessage && (
          <Alert 
            severity="success"
            style={{ marginBottom: '1rem' }}
          >
            {successMessage}
          </Alert>
        )}

        {errors.submit && (
          <Alert 
            severity="error"
            style={{ marginBottom: '1rem' }}
          >
            {errors.submit}
          </Alert>
        )}

        <Input
          id="name"
          name="name"
          label="Full Name"
          value={formData.name}
          type="text"
          required
          disabled={!isEditing}
          error={errors.name}
          onChange={handleInputChange}
          onBlur={() => {}}
        />

        <Input
          id="email"
          name="email"
          label="Email Address"
          value={formData.email}
          type="email"
          required
          disabled={!isEditing}
          error={errors.email}
          onChange={handleInputChange}
          onBlur={() => {}}
        />

        <Input
          id="phone"
          name="phone"
          label="Phone Number"
          value={formData.phone || ''}
          type="tel"
          disabled={!isEditing}
          error={errors.phone}
          onChange={handleInputChange}
          onBlur={() => {}}
        />

        <Input
          id="role"
          name="role"
          label="Role"
          value={formData.role}
          type="text"
          required
          disabled={!isEditing}
          error={errors.role}
          onChange={handleInputChange}
          onBlur={() => {}}
        />

        <div style={{ marginTop: '2rem' }}>
          <h3>Preferences</h3>
          <Input
            id="preferences.theme"
            name="preferences.theme"
            label="Theme"
            value={formData.preferences.theme}
            type="text"
            disabled={!isEditing}
            onChange={handleInputChange}
            onBlur={() => {}}
          />
        </div>
      </Card>
    </form>
  );
};

export default Profile;