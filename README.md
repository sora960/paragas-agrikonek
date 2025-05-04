# Agrikonek - Agricultural Management System

## Project Overview

Agrikonek is a centralized, web-based platform developed to improve agricultural communication, support, and data management across the Philippines. It connects key stakeholders—farmers, agricultural organizations, regional administrators, and superadministrators—enabling efficient operations, streamlined workflows, and transparent decision-making.

### Core Purpose

Agrikonek aims to empower the agricultural sector by providing a digital infrastructure that enables:
- Farmers to register, connect with organizations, apply for support, and manage their farming information.
- Organizations to manage and assist farmers, post announcements, and monitor activities.
- Regional Administrators to oversee organizations within their designated regions, ensuring coordination and compliance.
- Superadministrators to maintain control over the entire system, handle role assignments, configure system settings, and ensure policy implementation.

## Technical Stack

This project is built with:
- **Frontend**: React 18 with TypeScript
- **Build Tool**: Vite
- **Styling**: TailwindCSS
- **UI Components**: shadcn-ui
- **State Management**: TanStack Query
- **Authentication**: Supabase Auth
- **Database**: PostgreSQL via Supabase
- **Routing**: React Router DOM

## Live Demo

Check out the live demo here: [Agrikonek Demo](https://agrikonek.vercel.app)

## Project Status

### Features Implementation Progress

#### Core Features (MVP) - Status

| Feature | Status | Details |
|---------|--------|---------|
| User Registration & Login | ✅ Complete | Secure authentication using Supabase Auth |
| Role-Based Access Control | ✅ Complete | Four roles implemented with appropriate permissions |
| Farmer Applications | ✅ Complete | Submission and approval process in place |
| Organization Admin Panel | ✅ Complete | Member management and profile maintenance |
| Regional Admin Panel | ✅ Complete | Organization oversight and regional management |
| Superadmin Panel | ✅ Complete | System-wide administration and configuration |

#### Post-MVP Features (Tier 1) - Status

| Feature | Status | Details |
|---------|--------|---------|
| Resource Request System | ✅ Database Ready | Schema and API endpoints implemented |
| Messaging System | ✅ Complete | Direct, group, and announcement conversations working |
| Notification System | ⚠️ Partially Implemented | Basic implementation in progress |
| Profile & Farm Management | ✅ Complete | Comprehensive farm data storage and management |
| Financial Distribution System | ✅ Complete | Budget allocation, tracking, and reporting |

#### Post-MVP Features (Tier 2) - Status

| Feature | Status | Details |
|---------|--------|---------|
| Donation & Assistance System | ⚠️ Partially Implemented | Database schema ready |
| News & Events Module | ⚠️ Partially Implemented | Basic functionality in place |
| Learning Resources | ❌ Not Started | Planned for future phase |

#### Post-MVP Features (Tier 3) - Status

| Feature | Status | Details |
|---------|--------|---------|
| Lite Analytics Dashboard | ⚠️ Partially Implemented | Basic data visualization in place |
| Feedback Box | ❌ Not Started | Planned for future phase |

### Database Schema

The database includes comprehensive schemas for:
- Users and authentication
- Farmers and farm profiles
- Organizations and membership
- Regions and geographic data
- Financial management (budgets, expenses)
- Resource management
- Task tracking

## Getting Started

### Development Setup

1. Clone the repository:
```sh
git clone <repository-url>
cd agrikonek
```

2. Install dependencies:
```sh
npm install
```

3. Configure environment variables:
Create a `.env.local` file with:
```
VITE_SUPABASE_URL=your-supabase-url
VITE_SUPABASE_ANON_KEY=your-supabase-anon-key
```

4. Start the development server:
```sh
npm run dev
```

### Database Setup

The project requires a Supabase instance with the proper schema. SQL files are provided in the root directory:
- `supabase_farmer_tables.sql` - Farmer profile and related tables
- `supabase_organization_tables.sql` - Organization and membership tables
- `supabase_budget_functions.sql` - Functions for budget allocation
- `supabase_regions_setup.sql` - Geographic data for regions
- `supabase_farmer_resources.sql` - Resource management tables

Execute these SQL files in your Supabase SQL editor to set up the database.

## Overall Progress

The Agrikonek project has made significant progress, with all core MVPs features complete and functional. The system has a solid foundation with a comprehensive database schema and well-structured frontend components. 

Current status:
- **MVP Requirements**: 100% Complete
- **Tier 1 Post-MVP Features**: ~90% Complete
- **Tier 2 Post-MVP Features**: ~40% Complete
- **Tier 3 Post-MVP Features**: ~20% Complete
- **Overall Project Completion**: ~80%

### Next Steps

1. Complete remaining Tier 1 features (messaging and notification systems)
2. Enhance UI/UX across all user roles
3. Implement more advanced analytics and reporting
4. Develop the learning resources module
5. Optimize performance and add comprehensive error handling

## Deployment

The application can be built for production using:

```sh
npm run build
```

This will generate static files in the `dist` directory that can be deployed to any static hosting service.
