# Farmer Crop Management System - Calendar Integration

This document provides instructions for implementing the enhanced crop management system with integrated calendar functionality.

## Overview

The system allows farmers to:
- Manage their crops with an intuitive UI
- Track crop growth progress and time to harvest
- Generate schedules for common crop activities (watering, fertilizing, etc.)
- View all farming activities in a unified calendar
- Sync crop planting and harvesting dates to the calendar

## Implementation Steps

### 1. Database Setup

First, run these SQL scripts in your Supabase SQL Editor:

#### a. Fix Crops Table Permissions

Run `fix_crops_permissions_complete.sql` to ensure the crops table exists and has proper permissions.

#### b. Create Farmer Events Table

Run `create_farmer_events_table.sql` to create the table that stores calendar events.

### 2. Service Integration

The `eventService.ts` file provides the integration between crops and calendar events, with:
- Functions to sync crop dates to the calendar
- Activity generation based on crop type
- Event management (create, update, delete)

### 3. UI Implementation

The system features an enhanced UI with:
- Intuitive crop cards showing growth progress
- Visual calendar with highlighted event dates
- Activity scheduling based on crop type
- Simplified activity management

## Key Features

### Crop Growth Tracking
- Visual progress bars show crop growth percentage
- Countdown to harvest date
- Status indicators (planted, growing, harvested)

### Smart Activity Generation
The system can generate suggested activities based on crop type:
- **Cereals**: Initial fertilizing, pest control, second fertilizing, irrigation check
- **Vegetables**: Initial watering, fertilizing, pest control, weeding
- **Fruits**: Watering, fertilizing, pruning, pest control

### Calendar Integration
- Automatic syncing of planting and harvest dates
- Color-coded activity types for easy recognition
- Events connected to specific crops

## Usage Instructions

### Adding a New Crop
1. Click "Add New Crop"
2. Enter crop details including name, type, variety, planting date
3. Optionally set expected harvest date
4. Save the crop

### Generating Activity Schedule
1. Add a crop
2. Open the crop dropdown menu
3. Select "Generate Schedule"
4. The system will create appropriate activities based on crop type

### Viewing Calendar
1. Navigate to the Calendar page
2. Click "Sync Crop Events" to ensure crop dates are on calendar
3. Dates with events are highlighted
4. Select a date to view or add activities

## Technical Notes

- The system uses Supabase for data storage
- Row-Level Security (RLS) is disabled for simplified permissions
- date-fns is used for date manipulation
- The UI is responsive and works on mobile devices

When adding new crops, consider generating activities immediately to help farmers track their work schedules effectively. 