# Quick Setup Guide for Nanu's Hot Chicken Mobile App

## Step 1: Download Project
1. In Replit, click the file explorer (folder icon)
2. Right-click on the "mobile" folder
3. Select "Download as zip"
4. Extract the zip file on your computer

## Step 2: Install Prerequisites
Open terminal/command prompt and install Expo CLI:
```bash
npm install -g @expo/cli
```

## Step 3: Install Dependencies
Navigate to the extracted mobile folder:
```bash
cd path/to/mobile
npm install
```

## Step 4: Configure API URL
Edit `src/services/api.ts` and update line 6:
```typescript
const API_BASE_URL = 'YOUR_REPLIT_SERVER_URL';
```

Replace with your actual Replit server URL (e.g., `https://your-repl-name.username.repl.co`)

## Step 5: Start Development
```bash
npx expo start
```

## Step 6: Run on Device
- Install "Expo Go" app on your phone
- Scan the QR code that appears in terminal
- Or press 'i' for iOS simulator, 'a' for Android emulator

## Build for Production
```bash
# Install EAS CLI
npm install -g eas-cli

# Login to Expo
eas login

# Configure build
eas build:configure

# Build for iOS
eas build --platform ios

# Build for Android
eas build --platform android
```

## Features Ready to Use
- Dashboard with sales metrics
- Monthly reports
- Location management
- User authentication
- Secure API communication

The mobile app connects to your existing backend and displays the same financial data as your web platform.