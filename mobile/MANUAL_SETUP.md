# Manual Setup Instructions for Mobile App

Since download isn't available, here's how to manually create the mobile app:

## Step 1: Create New Expo Project
On your local computer, open terminal and run:
```bash
npx create-expo-app@latest NanusHotChickenMobile --template blank-typescript
cd NanusHotChickenMobile
```

## Step 2: Install Dependencies
```bash
npm install @react-navigation/native @react-navigation/stack
npm install react-native-safe-area-context react-native-screens
npm install @tanstack/react-query axios
npm install expo-secure-store expo-router
npm install @react-native-picker/picker
npm install react-native-vector-icons
npm install @expo/vector-icons
```

## Step 3: Copy Configuration Files

### Replace package.json dependencies section:
```json
"dependencies": {
  "expo": "~51.0.0",
  "expo-router": "~3.5.0",
  "react": "18.2.0",
  "react-native": "0.74.0",
  "react-native-safe-area-context": "4.10.0",
  "react-native-screens": "3.31.0",
  "@react-navigation/native": "^6.1.0",
  "@react-navigation/stack": "^6.3.0",
  "@tanstack/react-query": "^5.0.0",
  "axios": "^1.6.0",
  "@react-native-picker/picker": "^2.6.0",
  "@expo/vector-icons": "^14.0.0",
  "expo-status-bar": "~1.12.0",
  "expo-secure-store": "~13.0.0",
  "expo-constants": "~16.0.0"
}
```

### Update app.json:
```json
{
  "expo": {
    "name": "Nanu's Hot Chicken",
    "slug": "nanus-hot-chicken",
    "version": "1.0.0",
    "orientation": "portrait",
    "icon": "./assets/icon.png",
    "userInterfaceStyle": "light",
    "splash": {
      "image": "./assets/splash.png",
      "resizeMode": "contain",
      "backgroundColor": "#ffffff"
    },
    "assetBundlePatterns": ["**/*"],
    "ios": {
      "supportsTablet": true,
      "bundleIdentifier": "com.nanushotchicken.app"
    },
    "android": {
      "adaptiveIcon": {
        "foregroundImage": "./assets/adaptive-icon.png",
        "backgroundColor": "#ffffff"
      },
      "package": "com.nanushotchicken.app"
    },
    "web": {
      "favicon": "./assets/favicon.png",
      "bundler": "metro"
    },
    "plugins": ["expo-router"],
    "scheme": "nanus-hot-chicken"
  }
}
```

## Step 4: File Structure to Create
```
app/
├── _layout.tsx
├── (auth)/
│   └── login.tsx
└── (tabs)/
    ├── _layout.tsx
    ├── dashboard.tsx
    ├── reports.tsx
    ├── locations.tsx
    └── profile.tsx

src/
├── contexts/
│   └── AuthContext.tsx
├── services/
│   └── api.ts
└── types/
    └── index.ts
```

## Step 5: Copy File Contents
Visit the Replit project and copy the contents from these files to your local project:

1. **app/_layout.tsx** - Copy from mobile/app/_layout.tsx
2. **app/(auth)/login.tsx** - Copy from mobile/app/(auth)/login.tsx
3. **app/(tabs)/_layout.tsx** - Copy from mobile/app/(tabs)/_layout.tsx
4. **app/(tabs)/dashboard.tsx** - Copy from mobile/app/(tabs)/dashboard.tsx
5. **app/(tabs)/reports.tsx** - Copy from mobile/app/(tabs)/reports.tsx
6. **app/(tabs)/locations.tsx** - Copy from mobile/app/(tabs)/locations.tsx
7. **app/(tabs)/profile.tsx** - Copy from mobile/app/(tabs)/profile.tsx
8. **src/contexts/AuthContext.tsx** - Copy from mobile/src/contexts/AuthContext.tsx
9. **src/services/api.ts** - Copy from mobile/src/services/api.ts
10. **src/types/index.ts** - Copy from mobile/src/types/index.ts

## Step 6: Update API URL
In src/services/api.ts, replace:
```typescript
const API_BASE_URL = 'https://your-server-domain.com';
```
With your actual Replit server URL.

## Step 7: Start Development
```bash
npx expo start
```

## Step 8: Test on Device
- Install "Expo Go" app on your phone
- Scan QR code from terminal
- Or use iOS/Android simulators

This will give you the complete mobile app with all dashboard features, authentication, and API integration.