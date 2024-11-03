/**
 * HUMAN TASKS:
 * 1. Configure proper SSL certificate pinning for authentication endpoints
 * 2. Set up proper keychain/keystore access for secure token storage
 * 3. Verify proper encryption keys are set up for token storage
 * 4. Test offline login functionality with various network conditions
 */

// Third-party imports
import React, { useState, useCallback, useEffect } from 'react'; // ^18.0.0
import { 
  View, 
  Text, 
  StyleSheet, 
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView
} from 'react-native'; // ^0.71.0
import { useNavigation } from '@react-navigation/native'; // ^6.0.0

// Internal imports
import { AuthService } from '../../services/auth';
import Button from '../../components/common/Button';
import Input from '../../components/common/Input';

/**
 * Interface for login form state
 */
interface LoginFormState {
  email: string;
  password: string;
}

/**
 * Interface for navigation props
 */
interface LoginScreenProps {
  navigation: any;
}

/**
 * Login screen component that implements secure authentication with offline support
 * Requirements addressed:
 * - Mobile Applications: React Native driver application authentication
 * - Offline-first architecture: Offline authentication handling
 * - Security and encryption: Secure login implementation
 */
const Login: React.FC<LoginScreenProps> = () => {
  // Navigation hook
  const navigation = useNavigation();

  // Form state
  const [formState, setFormState] = useState<LoginFormState>({
    email: '',
    password: ''
  });
  
  // Loading and error states
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<{
    email?: string;
    password?: string;
    general?: string;
  }>({});

  /**
   * Validates form inputs using RFC 5322 email validation
   * Requirement: Security and encryption - Input validation
   */
  const validateForm = useCallback((form: LoginFormState): boolean => {
    const newErrors: typeof errors = {};

    // Email validation
    if (!form.email) {
      newErrors.email = 'Email is required';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) {
      newErrors.email = 'Invalid email format';
    }

    // Password validation
    if (!form.password) {
      newErrors.password = 'Password is required';
    } else if (form.password.length < 8) {
      newErrors.password = 'Password must be at least 8 characters';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }, []);

  /**
   * Handles login form submission with validation and error handling
   * Requirements addressed:
   * - Mobile Applications: Secure authentication
   * - Offline-first architecture: Offline token handling
   */
  const handleLogin = useCallback(async () => {
    try {
      // Validate form
      if (!validateForm(formState)) {
        return;
      }

      setLoading(true);
      setErrors({});

      // Initialize auth service
      const authService = new AuthService(null); // Storage manager should be injected
      
      // Attempt login
      const authState = await authService.login(
        formState.email,
        formState.password
      );

      if (authState.isAuthenticated) {
        // Navigate to dashboard on success
        navigation.replace('Dashboard');
      } else {
        setErrors({
          general: 'Authentication failed'
        });
      }
    } catch (error) {
      // Handle specific error cases
      if (error.message.includes('network')) {
        Alert.alert(
          'Connection Error',
          'Please check your internet connection and try again'
        );
      } else {
        setErrors({
          general: 'Invalid email or password'
        });
      }
    } finally {
      setLoading(false);
    }
  }, [formState, navigation, validateForm]);

  /**
   * Checks for existing authentication session on mount
   * Requirement: Offline-first architecture - Session restoration
   */
  useEffect(() => {
    const checkAuthStatus = async () => {
      try {
        const authService = new AuthService(null); // Storage manager should be injected
        const isAuthenticated = await authService.checkAuthStatus();
        
        if (isAuthenticated) {
          navigation.replace('Dashboard');
        }
      } catch (error) {
        console.error('Auth status check failed:', error);
      }
    };

    checkAuthStatus();
  }, [navigation]);

  return (
    <KeyboardAvoidingView 
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={styles.container}
    >
      <ScrollView 
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.header}>
          <Text style={styles.title}>Fleet Tracker</Text>
          <Text style={styles.subtitle}>Driver Login</Text>
        </View>

        <View style={styles.form}>
          <Input
            label="Email"
            value={formState.email}
            onChangeText={(text) => setFormState(prev => ({ ...prev, email: text }))}
            placeholder="Enter your email"
            type="email"
            keyboardType="email-address"
            error={errors.email}
            disabled={loading}
          />

          <Input
            label="Password"
            value={formState.password}
            onChangeText={(text) => setFormState(prev => ({ ...prev, password: text }))}
            placeholder="Enter your password"
            secureTextEntry
            error={errors.password}
            disabled={loading}
          />

          {errors.general && (
            <Text style={styles.error}>{errors.general}</Text>
          )}

          <Button
            title="Login"
            onPress={handleLogin}
            loading={loading}
            disabled={loading}
            style={styles.loginButton}
          />
        </View>

        <Text style={styles.helpText}>
          Contact your fleet manager if you need assistance logging in
        </Text>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

/**
 * Styles following Material Design principles
 */
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF'
  },
  scrollContent: {
    flexGrow: 1,
    padding: 16
  },
  header: {
    marginVertical: 24,
    alignItems: 'center'
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#000000',
    marginBottom: 8
  },
  subtitle: {
    fontSize: 16,
    color: '#666666'
  },
  form: {
    marginTop: 16,
    gap: 16
  },
  error: {
    color: '#FF0000',
    marginTop: 8,
    fontSize: 14,
    textAlign: 'center'
  },
  loginButton: {
    marginTop: 24
  },
  helpText: {
    marginTop: 16,
    textAlign: 'center',
    color: '#666666',
    fontSize: 14
  }
});

export default Login;