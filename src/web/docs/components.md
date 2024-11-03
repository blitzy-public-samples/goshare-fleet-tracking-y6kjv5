# Live Fleet Tracking System Component Documentation

## Human Tasks
- [ ] Verify Google Maps API key configuration in environment variables
- [ ] Review Material-UI theme configuration and color palette
- [ ] Validate WCAG 2.1 AA compliance for all components
- [ ] Configure proper CORS settings for map assets
- [ ] Set up monitoring for Google Maps API usage and quotas
- [ ] Review real-time tracking interval settings
- [ ] Validate geofence radius limits with business requirements

## Common Components

### Button
A customizable button component built on Material-UI that follows the design system.

#### Props Interface (CustomButtonProps)
| Prop | Type | Default | Description |
|------|------|---------|-------------|
| variant | 'primary' \| 'secondary' \| 'outlined' \| 'text' | 'primary' | Button style variant |
| size | 'small' \| 'medium' \| 'large' | 'medium' | Button size variant |
| fullWidth | boolean | false | Whether button takes full container width |
| disabled | boolean | false | Disabled state of button |
| startIcon | ReactNode | undefined | Icon before button text |
| endIcon | ReactNode | undefined | Icon after button text |
| onClick | (event: React.MouseEvent<HTMLButtonElement>) => void | undefined | Click event handler |

#### Examples

##### Basic Usage
```tsx
import { Button } from '../components/common/Button';

<Button variant="contained" onClick={handleClick}>
  Click Me
</Button>
```

##### Variants
```tsx
<>
  <Button variant="primary">Primary</Button>
  <Button variant="secondary">Secondary</Button>
  <Button variant="outlined">Outlined</Button>
  <Button variant="text">Text</Button>
</>
```

##### Sizes
```tsx
<>
  <Button size="small">Small</Button>
  <Button size="medium">Medium</Button>
  <Button size="large">Large</Button>
</>
```

##### Colors
```tsx
<>
  <Button variant="primary">Primary Color</Button>
  <Button variant="secondary">Secondary Color</Button>
</>
```

##### With Icons
```tsx
import { ArrowForward, Save } from '@material-ui/icons';

<>
  <Button startIcon={<Save />}>Save</Button>
  <Button endIcon={<ArrowForward />}>Next</Button>
</>
```

## Map Components

### MapContainer
Main map container component that provides real-time vehicle tracking, route visualization, and geofencing capabilities.

#### Props Interface (MapContainerProps)
| Prop | Type | Description |
|------|------|-------------|
| vehicles | Vehicle[] | Array of vehicles to display on map |
| activeRoute | Route \| null | Currently active route to display |
| geofences | Geofence[] | Array of geofence zones to display |
| onVehicleClick | (vehicleId: string) => void | Callback when vehicle marker is clicked |
| onGeofenceCreate | (geofence: Geofence) => void | Callback when new geofence is created |

#### Examples

##### Basic Map
```tsx
import { MapContainer } from '../components/map/MapContainer';

<MapContainer
  vehicles={[]}
  activeRoute={null}
  geofences={[]}
  onVehicleClick={handleVehicleClick}
  onGeofenceCreate={handleGeofenceCreate}
/>
```

##### With Vehicle Tracking
```tsx
const vehicles = [
  {
    id: 'v1',
    location: { latitude: 40.7128, longitude: -74.0060 },
    status: 'active'
  }
];

<MapContainer
  vehicles={vehicles}
  activeRoute={null}
  geofences={[]}
  onVehicleClick={handleVehicleClick}
  onGeofenceCreate={handleGeofenceCreate}
/>
```

##### With Geofencing
```tsx
const geofences = [
  {
    id: 'g1',
    center: { latitude: 40.7128, longitude: -74.0060 },
    radius: 1000,
    createdAt: '2023-01-01T00:00:00Z'
  }
];

<MapContainer
  vehicles={vehicles}
  activeRoute={null}
  geofences={geofences}
  onVehicleClick={handleVehicleClick}
  onGeofenceCreate={handleGeofenceCreate}
/>
```

##### With Route Display
```tsx
const route = {
  id: 'r1',
  waypoints: [
    { latitude: 40.7128, longitude: -74.0060 },
    { latitude: 40.7589, longitude: -73.9851 }
  ],
  status: 'active'
};

<MapContainer
  vehicles={vehicles}
  activeRoute={route}
  geofences={geofences}
  onVehicleClick={handleVehicleClick}
  onGeofenceCreate={handleGeofenceCreate}
/>
```

## Style Guidelines

### Theme Usage
- Components should use theme configuration from src/web/src/config/theme.ts
- Follow Material-UI theme structure for consistency
- Use theme spacing units for padding and margins
- Apply theme palette colors for visual elements

### Responsive Design
- All components must be responsive using Material-UI breakpoints
- Use fluid layouts and relative units
- Implement mobile-first design approach
- Test across various screen sizes

### Accessibility
- Meet WCAG 2.1 AA standards
- Ensure proper color contrast ratios
- Provide keyboard navigation support
- Include ARIA labels and roles
- Support screen readers