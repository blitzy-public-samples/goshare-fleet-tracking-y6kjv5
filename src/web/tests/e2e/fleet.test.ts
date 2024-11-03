// @playwright/test version ^1.35.0

/* Human Tasks:
1. Ensure test environment has proper Google Maps API key configured
2. Verify test database is seeded with appropriate mock data
3. Configure network conditions simulation for real-time update tests
4. Review test timeouts with QA team
5. Set up monitoring for test execution times
*/

import { test, expect, Page } from '@playwright/test';
import { VEHICLE_STATUS, MAP_SETTINGS } from '../../src/constants';

// Mock data for testing
const mockVehicleData = {
  vehicles: [
    {
      id: 'v1',
      registrationNumber: 'ABC123',
      status: VEHICLE_STATUS.ACTIVE,
      location: { lat: 40.7128, lng: -74.0060 },
      lastUpdate: new Date().toISOString()
    },
    {
      id: 'v2',
      registrationNumber: 'XYZ789',
      status: VEHICLE_STATUS.MAINTENANCE,
      location: { lat: 40.7589, lng: -73.9851 },
      lastUpdate: new Date().toISOString()
    }
  ]
};

const mockDriverData = {
  drivers: [
    { id: 'd1', name: 'John Doe', status: 'AVAILABLE' },
    { id: 'd2', name: 'Jane Smith', status: 'ON_DUTY' }
  ]
};

let page: Page;

test.beforeEach(async ({ browser }) => {
  // Create a new page for each test
  page = await browser.newPage();
  
  // Navigate to fleet management page
  await page.goto('/fleet');
  
  // Wait for initial data load
  await page.waitForSelector('[data-testid="fleet-list"]');
  
  // Ensure map is loaded
  await page.waitForSelector('[data-testid="map-container"]');
  
  // Mock API responses
  await page.route('**/api/v1/fleet/vehicles', async route => {
    await route.fulfill({ json: mockVehicleData });
  });
  
  await page.route('**/api/v1/fleet/drivers', async route => {
    await route.fulfill({ json: mockDriverData });
  });
});

// Test: Display fleet list with vehicle information
test('should display fleet list with vehicle information', async () => {
  // Requirement: Interactive fleet management dashboard
  
  // Wait for fleet list to load
  const fleetList = await page.waitForSelector('[data-testid="fleet-list"]');
  expect(fleetList).toBeTruthy();
  
  // Verify vehicle rows are present
  const vehicleRows = await page.$$('[data-testid="vehicle-row"]');
  expect(vehicleRows.length).toBe(mockVehicleData.vehicles.length);
  
  // Check vehicle registration numbers
  const firstVehicleRow = vehicleRows[0];
  const registrationText = await firstVehicleRow.textContent();
  expect(registrationText).toContain(mockVehicleData.vehicles[0].registrationNumber);
  
  // Verify status indicators
  const statusIndicator = await firstVehicleRow.querySelector('[data-testid="status-indicator"]');
  const statusText = await statusIndicator?.textContent();
  expect(statusText).toBe(VEHICLE_STATUS.ACTIVE);
  
  // Check last update timestamp
  const timestamp = await firstVehicleRow.querySelector('[data-testid="last-update"]');
  expect(await timestamp?.textContent()).toBeTruthy();
});

// Test: Real-time vehicle location updates
test('should update vehicle locations in real-time', async () => {
  // Requirement: Real-time GPS tracking
  
  // Get initial marker positions
  const initialMarkers = await page.$$('[data-testid="vehicle-marker"]');
  const initialCount = initialMarkers.length;
  
  // Wait for update interval
  await page.waitForTimeout(MAP_SETTINGS.UPDATE_INTERVAL);
  
  // Mock updated location data
  const updatedVehicleData = {
    ...mockVehicleData,
    vehicles: mockVehicleData.vehicles.map(v => ({
      ...v,
      location: { lat: v.location.lat + 0.001, lng: v.location.lng + 0.001 },
      lastUpdate: new Date().toISOString()
    }))
  };
  
  // Intercept and fulfill with updated data
  await page.route('**/api/v1/fleet/vehicles', async route => {
    await route.fulfill({ json: updatedVehicleData });
  });
  
  // Verify markers are updated
  const updatedMarkers = await page.$$('[data-testid="vehicle-marker"]');
  expect(updatedMarkers.length).toBe(initialCount);
  
  // Check timestamp updates
  const lastUpdateElement = await page.waitForSelector('[data-testid="last-update"]');
  const updateText = await lastUpdateElement.textContent();
  expect(updateText).toContain('seconds ago');
});

// Test: Vehicle selection and details display
test('should allow vehicle selection and display details', async () => {
  // Requirement: Interactive fleet management dashboard
  
  // Click on a vehicle row
  await page.click('[data-testid="vehicle-row"]');
  
  // Verify details panel opens
  const detailsPanel = await page.waitForSelector('[data-testid="vehicle-details"]');
  expect(detailsPanel).toBeTruthy();
  
  // Check vehicle information is displayed
  const vehicleInfo = await detailsPanel.textContent();
  expect(vehicleInfo).toContain(mockVehicleData.vehicles[0].registrationNumber);
  
  // Verify map centers on selected vehicle
  const mapCenter = await page.evaluate(() => {
    const map = document.querySelector('[data-testid="map-container"]');
    return map?.getAttribute('data-center');
  });
  expect(mapCenter).toBeTruthy();
});

// Test: Driver assignment modal functionality
test('should handle driver assignment modal', async () => {
  // Requirement: Interactive fleet management dashboard
  
  // Select a vehicle
  await page.click('[data-testid="vehicle-row"]');
  
  // Open assignment modal
  await page.click('[data-testid="assign-driver-button"]');
  
  // Verify modal opens
  const modal = await page.waitForSelector('[data-testid="assignment-modal"]');
  expect(modal).toBeTruthy();
  
  // Check driver list
  const driverOptions = await page.$$('[data-testid="driver-option"]');
  expect(driverOptions.length).toBe(mockDriverData.drivers.length);
  
  // Select a driver
  await page.click('[data-testid="driver-option"]');
  await page.click('[data-testid="confirm-assignment"]');
  
  // Verify modal closes
  await expect(page.locator('[data-testid="assignment-modal"]')).toBeHidden();
  
  // Check assignment is updated
  const detailsPanel = await page.waitForSelector('[data-testid="vehicle-details"]');
  const updatedInfo = await detailsPanel.textContent();
  expect(updatedInfo).toContain(mockDriverData.drivers[0].name);
});

// Test: Vehicle list filtering and sorting
test('should filter and sort vehicle list', async () => {
  // Requirement: Interactive fleet management dashboard
  
  // Test status filter
  await page.selectOption('[data-testid="status-filter"]', VEHICLE_STATUS.MAINTENANCE);
  
  // Verify filtered results
  const filteredRows = await page.$$('[data-testid="vehicle-row"]');
  expect(filteredRows.length).toBe(1);
  const statusText = await filteredRows[0].textContent();
  expect(statusText).toContain(VEHICLE_STATUS.MAINTENANCE);
  
  // Test registration number sorting
  await page.click('[data-testid="registration-sort"]');
  
  // Verify sorted order
  const sortedRows = await page.$$('[data-testid="vehicle-row"]');
  const firstRegNumber = await sortedRows[0].textContent();
  expect(firstRegNumber).toContain('ABC');
  
  // Test last update sorting
  await page.click('[data-testid="last-update-sort"]');
  
  // Verify timestamp order
  const timestamps = await page.$$('[data-testid="last-update"]');
  const firstTimestamp = await timestamps[0].textContent();
  expect(firstTimestamp).toContain('seconds ago');
});