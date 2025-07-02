# Import Website Sales - Dashboard

## Overview

A comprehensive sales reporting dashboard application for multi-location restaurant website services. The platform processes CSV/Excel sales data from WooCommerce integrations, calculates fees, and provides detailed analytics across multiple restaurant locations. Built with React, TypeScript, Express.js, and Drizzle ORM.

## System Architecture

### Frontend Architecture
- **Framework**: React 18 with TypeScript
- **Routing**: Wouter for client-side routing
- **State Management**: TanStack React Query for server state
- **UI Framework**: Radix UI components with Tailwind CSS
- **Build Tool**: Vite with hot module replacement

### Backend Architecture
- **Framework**: Express.js with TypeScript
- **Database ORM**: Drizzle ORM with PostgreSQL
- **Authentication**: Session-based with express-session
- **File Processing**: Multer for uploads, XLSX/CSV parsing
- **API Integration**: REST API clients for WooCommerce platforms

### Mobile Application
- **Framework**: React Native with Expo
- **Navigation**: Expo Router with tab-based navigation
- **State Management**: TanStack React Query
- **Authentication**: Secure token storage with expo-secure-store

## Key Components

### Data Processing System
- **File Upload**: CSV/Excel file processing with validation
- **Location Mapping**: Automatic location detection and creation
- **Order Processing**: Status-based order categorization (Processing, Refunded)
- **Fee Calculations**: Platform fees (7%) and Stripe fees (2.9% + $0.30)

### User Management System
- **Role-Based Access**: Admin and user roles with granular permissions
- **Location Access Control**: Users can be assigned to specific locations
- **Page Permissions**: Configurable access to dashboard sections
- **Password Management**: Forced password changes and validation

### Sync Management
- **WooCommerce Integration**: Multiple store connection support
- **Auto-Sync**: Configurable interval-based data synchronization
- **Manual Import**: Date-range based historical data import
- **Real-time Status**: Sync progress tracking and error handling

### Reporting Engine
- **Dashboard Analytics**: Real-time metrics and summary cards
- **Monthly Breakdown**: Expandable order details with search
- **Location Filtering**: Multi-location data segregation
- **Financial Calculations**: Net deposits after fee deductions

## Data Flow

1. **Data Ingestion**: CSV/Excel files uploaded or synced from WooCommerce APIs
2. **Processing Pipeline**: Order validation, location mapping, status categorization
3. **Storage Layer**: Normalized data storage with location and user relationships
4. **Analytics Engine**: Real-time calculation of sales, fees, and net amounts
5. **Presentation Layer**: Filtered data display based on user permissions

## External Dependencies

### Database
- **PostgreSQL**: Primary data store via Neon serverless
- **Connection Pooling**: @neondatabase/serverless for scalable connections

### Authentication & Security
- **Session Management**: Express-session with PostgreSQL store
- **Password Hashing**: bcrypt for secure password storage
- **CAPTCHA**: Optional reCAPTCHA integration for login protection

### File Processing
- **Upload Handling**: Multer with memory storage
- **Excel Processing**: XLSX library for spreadsheet parsing
- **CSV Processing**: csv-parser for CSV file handling

### External APIs
- **WooCommerce REST API**: Order data synchronization
- **Stripe Integration**: Payment processing (referenced in calculations)

### UI/UX Libraries
- **Radix UI**: Accessible component primitives
- **Tailwind CSS**: Utility-first styling framework
- **Lucide Icons**: Consistent iconography

## Deployment Strategy

### Development Environment
- **Build System**: Vite for fast development builds
- **Hot Reload**: Development server with HMR support
- **TypeScript**: Strict type checking across frontend and backend

### Production Build
- **Frontend**: Static asset generation via Vite
- **Backend**: ESM bundle generation with esbuild
- **Database**: Automatic schema migrations with Drizzle Kit

### Environment Configuration
- **Database**: DATABASE_URL for PostgreSQL connection
- **Session**: SESSION_SECRET for authentication security
- **API Keys**: WooCommerce consumer keys and secrets

## Changelog

```
Changelog:
- July 02, 2025. Initial setup
- July 02, 2025. Completed location duplicate consolidation - eliminated 4 duplicate locations affecting 580+ orders, consolidated into 3 standardized locations with proper naming conventions
- July 02, 2025. Fixed monthly breakdown date filtering bug in both dashboard and reports pages - orders now correctly display under their proper month sections with month-first filtering logic
- July 02, 2025. Fixed timezone double-conversion issue - removed incorrect UTC to Eastern timezone conversion since WooCommerce orders are already stored in local timezone, ensuring orders appear in correct date groups (order 16196 now correctly shows as July 2nd instead of July 1st)
- July 02, 2025. Fixed auto-sync query parameters - changed from modified_after/modified_before to after/before to catch newly created orders instead of only modified orders, and added checkout-draft status to filter. Missing orders 30682, 30683, 30685 now successfully imported and visible on dashboard
- July 02, 2025. Fixed Reports page monthly grouping inconsistency - added user permission logic and status filtering to Reports endpoint to exactly match Dashboard behavior, ensuring both pages show identical monthly breakdown filtering
- July 02, 2025. Synchronized default status filtering between Dashboard and Reports pages - both now default to ["completed", "processing", "refunded"] for consistent filtering experience across the platform
- July 02, 2025. Final timezone fix - removed UTC timezone overrides from both Dashboard and Reports date displays to ensure consistent local timezone display matching actual order receipt times (order 30635 now correctly appears under July in both pages)
- July 02, 2025. Fixed root cause of timezone date grouping issue - replaced toISOString() with local date formatting in backend monthly breakdown logic to prevent UTC conversion that was shifting July 1st orders to June 30th. This fix applies to all historical and future orders
- July 02, 2025. Critical schema fix - corrected schema mapping from 'orders' table to actual 'woo_orders' database table with proper field mappings (order_date → orderDate), resolving fundamental data access issues that were causing timezone display problems
- July 02, 2025. Timezone fix implementation - discovered WooCommerce stores UTC time but frontend needs Eastern display, modified backend date serialization to treat stored times as Eastern timezone, added cache control headers to force fresh data delivery
- July 02, 2025. Completed timezone fix for both Dashboard and Reports pages - Order 30685 now correctly displays 1:04 PM instead of 9:04 AM, implemented identical timezone processing and cache invalidation for consistent display across platform
- July 02, 2025. Critical auto-sync bug fix - discovered sync was missing orders created within minute of sync window, added 10-minute buffer to catch orders created during sync intervals, manually imported missing order 30691 and reset sync timestamps to ensure future orders are captured
```

## User Preferences

```
Preferred communication style: Simple, everyday language.
```