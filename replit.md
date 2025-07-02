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
```

## User Preferences

```
Preferred communication style: Simple, everyday language.
```