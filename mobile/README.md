# Nanu's Hot Chicken Mobile App

React Native mobile application built with Expo for managing sales data and reports across multiple restaurant locations.

## Features

- **Dashboard**: Real-time sales metrics, order counts, and financial summaries
- **Reports**: Monthly breakdown with detailed analytics
- **Locations**: View and manage restaurant locations
- **Profile**: User account management and logout functionality
- **Authentication**: Secure login with token-based authentication

## Project Structure

```
mobile/
├── app/                    # Expo Router app directory
│   ├── (auth)/
│   │   └── login.tsx      # Login screen
│   ├── (tabs)/
│   │   ├── _layout.tsx    # Tab navigation layout
│   │   ├── dashboard.tsx  # Main dashboard
│   │   ├── reports.tsx    # Reports screen
│   │   ├── locations.tsx  # Locations list
│   │   └── profile.tsx    # User profile
│   └── _layout.tsx        # Root layout
├── src/
│   ├── contexts/
│   │   └── AuthContext.tsx # Authentication context
│   ├── services/
│   │   └── api.ts         # API service layer
│   ├── types/
│   │   └── index.ts       # TypeScript type definitions
│   ├── components/        # Reusable components
│   ├── screens/           # Screen components
│   └── utils/             # Utility functions
├── assets/                # Images, icons, fonts
├── app.json              # Expo configuration
├── package.json          # Dependencies
├── tsconfig.json         # TypeScript configuration
├── babel.config.js       # Babel configuration
└── metro.config.js       # Metro bundler configuration
```

## Setup Instructions

### 1. Install Dependencies

```bash
cd mobile
npm install
```

### 2. Install Expo CLI

```bash
npm install -g @expo/cli
```

### 3. Configure API Endpoint

Update the `API_BASE_URL` in `src/services/api.ts` with your server URL:

```typescript
const API_BASE_URL = 'https://your-server-domain.com';
```

### 4. Start Development Server

```bash
npx expo start
```

### 5. Run on Device/Simulator

- **iOS Simulator**: Press `i` in terminal
- **Android Emulator**: Press `a` in terminal
- **Physical Device**: Scan QR code with Expo Go app

## Building for Production

### EAS Build (Recommended)

1. Install EAS CLI:
```bash
npm install -g eas-cli
```

2. Configure EAS:
```bash
eas build:configure
```

3. Build for iOS:
```bash
eas build --platform ios
```

4. Build for Android:
```bash
eas build --platform android
```

### Local Build

1. iOS:
```bash
npx expo run:ios
```

2. Android:
```bash
npx expo run:android
```

## Key Components

### Authentication
- Secure token storage using Expo SecureStore
- Automatic token refresh and error handling
- Protected routes with authentication context

### API Integration
- Axios-based service layer
- Automatic token injection
- Error handling and retry logic
- Query caching with TanStack Query

### Navigation
- Expo Router with file-based routing
- Tab navigation for main screens
- Authentication flow routing

### State Management
- React Context for authentication
- TanStack Query for server state
- Local state with React hooks

## Environment Configuration

Create appropriate environment files or update the API service configuration:

- Development: Local server URL
- Staging: Staging server URL  
- Production: Production server URL

## Dependencies

### Core
- Expo SDK 51
- React Native 0.74
- TypeScript
- Expo Router

### UI & Navigation
- React Native Vector Icons
- Material Icons
- React Navigation

### Data & State
- TanStack React Query
- Axios
- Expo SecureStore

### Development
- Babel
- Metro bundler
- TypeScript compiler

## API Endpoints Used

- `POST /api/auth/login` - User authentication
- `GET /api/auth/user` - Get current user
- `POST /api/auth/logout` - User logout
- `GET /api/dashboard/summary` - Dashboard metrics
- `GET /api/dashboard/monthly-breakdown` - Monthly reports
- `GET /api/locations` - Location list

## Troubleshooting

### Common Issues

1. **Metro bundler cache issues**:
```bash
npx expo start --clear
```

2. **TypeScript errors**:
```bash
npx tsc --noEmit
```

3. **Dependency conflicts**:
```bash
rm -rf node_modules package-lock.json
npm install
```

### Development Tips

- Use Flipper for debugging network requests
- Enable remote debugging for JavaScript debugging
- Use React DevTools for component inspection
- Monitor performance with Expo dev tools

## Deployment

### App Store (iOS)
1. Build with EAS Build
2. Upload to App Store Connect
3. Configure app metadata
4. Submit for review

### Google Play Store (Android)
1. Build with EAS Build
2. Upload to Google Play Console
3. Configure store listing
4. Release to production

## Contributing

1. Follow TypeScript strict mode
2. Use functional components with hooks
3. Implement proper error handling
4. Add loading states for async operations
5. Test on both iOS and Android devices