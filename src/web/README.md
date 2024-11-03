# Live Fleet Tracking System - Web Dashboard

A React 18-based responsive web application for real-time fleet tracking and management, featuring Material-UI components, interactive mapping, and comprehensive analytics.

## Human Tasks
<!-- Tasks requiring human attention -->
1. Set up Google Maps API key in `.env` file
2. Configure Socket.io server endpoints and authentication
3. Set up Redis cache configuration for real-time data
4. Configure JWT secret and token expiration settings
5. Review and adjust real-time update intervals (default: 30s)
6. Set up monitoring for WebSocket connections
7. Configure CORS policies for API endpoints
8. Review Material-UI theme customization
9. Set up analytics event tracking
10. Configure error tracking and logging services

## Technology Stack

### Core Technologies
- React 18.2.0 with TypeScript 5.1.0
- Material-UI 5.14.0 for component framework
- Redux Toolkit 1.9.5 for state management
- Socket.io Client 4.7.0 for real-time updates
- @react-google-maps/api 2.19.0 for Google Maps Platform integration
- Jest 29.0.0 with React Testing Library for testing

### Prerequisites
- Node.js 16.0.0 or higher
- npm 8.0.0 or higher
- Google Maps API key
- Modern web browser with WebSocket support

## Getting Started

### Installation

1. Clone the repository:
```bash
git clone <repository-url>
cd src/web
```

2. Install dependencies:
```bash
npm install
```

3. Create `.env` file in the project root:
```env
REACT_APP_API_URL=http://localhost:3000/api
REACT_APP_SOCKET_URL=ws://localhost:3000
REACT_APP_MAPS_API_KEY=your_google_maps_api_key
REACT_APP_UPDATE_INTERVAL=30000
```

### Development

Start the development server:
```bash
npm start
```

The application will be available at `http://localhost:3000`

### Testing

Run the test suite:
```bash
# Run all tests
npm test

# Run tests with coverage
npm run test:coverage

# Run tests in watch mode
npm run test:watch
```

### Code Quality

Lint the codebase:
```bash
npm run lint
```

Format code:
```bash
npm run format
```

### Production Build

Create an optimized production build:
```bash
npm run build
```

## Project Structure

```
src/
├── components/         # Reusable UI components
│   ├── common/        # Shared components
│   ├── fleet/         # Fleet management components
│   ├── map/          # Mapping components
│   ├── analytics/    # Analytics and reporting components
│   └── layout/       # Layout components
├── config/           # Application configuration
├── hooks/            # Custom React hooks
├── pages/            # Page components
├── services/         # API and external service integrations
├── store/            # Redux store configuration and slices
├── styles/           # Global styles and themes
├── types/            # TypeScript type definitions
└── utils/            # Utility functions
```

## Key Features

### Real-time Tracking
- Live vehicle location updates every 30 seconds
- Interactive Google Maps integration
- Geofencing and zone management
- Route visualization and optimization

### Fleet Management
- Comprehensive vehicle and driver management
- Route planning and optimization
- Digital proof of delivery
- Real-time status updates

### Analytics and Reporting
- Real-time fleet performance metrics
- Custom report generation
- Data visualization
- Historical data analysis

### Security
- JWT-based authentication
- Role-based access control
- Secure WebSocket connections
- API rate limiting

## Performance Optimization

### Caching Strategy
- Redis-based real-time data caching
- Browser local storage for offline capabilities
- Optimized asset loading and caching
- Efficient state management with Redux

### Code Splitting
- Route-based code splitting
- Lazy loading of components
- Optimized bundle sizes
- Tree shaking for production builds

## Development Guidelines

### Code Style
- Follow TypeScript best practices
- Use functional components with hooks
- Implement proper error boundaries
- Write comprehensive unit tests

### Component Development
- Create reusable, atomic components
- Implement proper prop validation
- Use Material-UI theming system
- Follow accessibility guidelines

### State Management
- Use Redux for global state
- Implement proper action creators
- Optimize selector usage
- Handle side effects with Redux Toolkit

## Available Scripts

| Command | Description |
|---------|-------------|
| `npm start` | Starts development server on port 3000 |
| `npm run build` | Creates optimized production build |
| `npm test` | Runs test suite with Jest |
| `npm run lint` | Lints TypeScript and React components |
| `npm run format` | Formats source code using Prettier |

## Environment Variables

| Variable | Description | Required |
|----------|-------------|----------|
| REACT_APP_API_URL | Backend API URL | Yes |
| REACT_APP_SOCKET_URL | WebSocket server URL | Yes |
| REACT_APP_MAPS_API_KEY | Google Maps API key | Yes |
| REACT_APP_UPDATE_INTERVAL | Real-time update interval (ms) | No |

## Browser Support

- Chrome (latest 2 versions)
- Firefox (latest 2 versions)
- Safari (latest 2 versions)
- Edge (latest 2 versions)

## Contributing

1. Follow the established code style
2. Write comprehensive tests
3. Update documentation as needed
4. Create detailed pull requests

## License

This project is proprietary and confidential.