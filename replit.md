# SHOPNET - React Native/Expo E-Commerce Application

## Overview
SHOPNET is a React Native mobile application built with Expo that functions as an e-commerce platform. The application is configured to run on the web in the Replit environment using Expo's web support.

## Project Structure
- **Language**: TypeScript/JavaScript
- **Framework**: React Native with Expo SDK 52
- **Routing**: Expo Router (file-based routing)
- **Package Manager**: npm
- **Dependencies**: See package.json for full list

## Architecture
This is a **frontend-only** application. The backend API is external and configured at:
- Backend API: `http://100.64.134.89:5000/api` (as specified in `app/api.ts`)

### Key Components
- `app/` - Application routes and screens using Expo Router
  - `(tabs)/Auth/` - Authentication-related screens
  - `ProductDetail/` - Product detail views
  - `api.ts` - Axios HTTP client configuration with JWT token interceptor
  - `auth.ts` - Authentication token management using AsyncStorage
- `assets/` - Images, fonts, and other static assets
- `components/` - Reusable React components
- `constants/` - App-wide constants and theme colors
- `uploads/` - Product image uploads directory

## Development Setup

### Running the Application
The application runs on **port 5000** using a proxy server setup:
1. Expo Metro bundler runs on port 8081 (internal)
2. A Node.js proxy server (`proxy-server.js`) runs on port 5000 and forwards requests to the Metro bundler
3. The workflow "Web App" starts both servers concurrently

**Start Command**: `npm run web`

This command runs: `concurrently "node proxy-server.js" "sleep 2 && expo start --web"`

### Port Configuration
- **Frontend (User Access)**: Port 5000 (proxied)
- **Metro Bundler**: Port 8081 (internal)

### Environment Configuration
- The API base URL is currently hardcoded in `app/api.ts`
- For production or different environments, modify the `getBaseURL()` function in that file

## Known Warnings (Non-Breaking)
The application displays several warnings that don't affect functionality:
1. **Route Warnings**: Some .ts/.tsx files are being detected as routes but don't export React components
2. **Style Deprecations**: Legacy shadow/textShadow props (React Native Web compatibility)
3. **Animation Warnings**: Native driver not supported on web (falls back to JS animation)
4. **CORS Errors**: Expo's dev server shows "Unauthorized request" errors but the proxy handles requests correctly

These warnings are from the existing codebase and don't prevent the application from running.

## Recent Changes (October 18, 2025)
1. **Replit Environment Setup**: Configured the project to run in Replit
2. **TypeScript Configuration**: Fixed TypeScript compiler options to include ES2015 and DOM libraries
3. **Proxy Server**: Created `proxy-server.js` to forward port 5000 to Expo's Metro bundler on 8081
4. **Workflow Configuration**: Set up "Web App" workflow to run both the proxy and Expo dev server
5. **Gitignore**: Added comprehensive .gitignore for Node.js/Expo projects
6. **Package Updates**: Installed @types/axios for TypeScript type definitions

## Dependencies

### Key Production Dependencies
- `expo` (^52.0.47) - Expo SDK
- `expo-router` (~4.0.21) - File-based routing
- `react` (18.3.1) & `react-native` (0.76.9)
- `axios` (1.10.0) - HTTP client
- `react-native-paper` (5.14.5) - UI components
- `@react-navigation/native` & `@react-navigation/stack` - Navigation
- `express` (5.1.0) - Used by backend (note: this app is frontend-only)
- `mysql2` (3.14.2) - Database driver (note: this app is frontend-only)

### Development Dependencies
- `typescript` (^5.3.3)
- `@types/react` (~18.3.12)
- `@babel/core` (^7.25.2)

## Deployment
For production deployment, the application should be built as a static web app using:
```
npx expo export:web
```

The static files can then be served from the `dist/` directory.

## User Preferences
None recorded yet.

## Notes
- This project was imported from GitHub
- No backend server is included in this repository
- The application connects to an external backend API for data
- Hot reload is supported through the Metro bundler and proxy setup
