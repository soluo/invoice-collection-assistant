# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a French invoice collection management application built with Convex as the backend and React/TypeScript as the frontend. The application allows users to upload invoices, track payment status, and manage automated reminder settings for overdue payments.

## Development Commands

**Start development servers (frontend + backend):**
```bash
npm run dev
```

**Start frontend only:**
```bash
npm run dev:frontend
```

**Start Convex backend only:**
```bash
npm run dev:backend
```

**Build for production:**
```bash
npm run build
```

**Lint and typecheck (comprehensive):**
```bash
npm run lint
```

This command runs TypeScript compilation check for both convex and frontend code, runs convex dev once, and builds with vite.

## Architecture

### Backend Structure
- **Convex Backend**: Real-time database with automatic APIs located in `/convex/`
- **Authentication**: Uses `@convex-dev/auth` with anonymous auth
- **Key Backend Files**:
  - `convex/schema.ts`: Database schema defining invoices and reminder settings
  - `convex/invoices.ts`: Invoice CRUD operations and business logic
  - `convex/reminderSettings.ts`: User reminder configuration management
  - `convex/pdfExtraction.ts`: AI-powered PDF invoice data extraction using OpenAI
  - `convex/auth.ts`: Authentication configuration
  - `convex/router.ts`: HTTP API route definitions

### Frontend Structure
- **React 19 + TypeScript + Vite** frontend in `/src/`
- **Styling**: TailwindCSS with custom components
- **Key Components**:
  - `src/App.tsx`: Main app layout with authentication handling
  - `src/components/InvoiceManager.tsx`: Tabbed interface for invoices/upload/settings
  - `src/components/InvoiceList.tsx`: Invoice listing with status management
  - `src/components/InvoiceUpload.tsx`: PDF upload with AI extraction
  - `src/components/ReminderSettings.tsx`: User reminder configuration

### Database Schema
- **invoices**: User invoices with status tracking, client info, amounts, and dates
- **reminderSettings**: Per-user configuration for automated reminder delays and templates
- **Built-in auth tables**: User management via Convex Auth

### Invoice Status Flow
Invoices progress through: `sent` → `overdue` → `first_reminder` → `second_reminder` → `third_reminder` → `litigation` or `paid`

## Key Features

1. **PDF Upload & AI Extraction**: Upload PDF invoices and automatically extract client info, amounts, and dates using OpenAI
2. **Status Management**: Track invoice payment status with automated reminder system
3. **Real-time Updates**: Convex provides real-time data synchronization
4. **Authentication**: Secure user sessions with Convex Auth
5. **Reminder Templates**: Customizable email templates and delay settings per user

## Important Convex Guidelines

This project follows the Convex function syntax defined in `convex_rules.txt` at the project root. Key points:
- Use new function syntax with explicit `args`, `returns`, and `handler` properties
- All functions must have validators for arguments and return values
- Use `v.null()` for functions that don't return values
- HTTP endpoints are defined in `convex/router.ts` using `httpAction`
- Internal functions use `internal*` variants and are called via function references

## Development Notes

- The app is connected to Convex deployment `fabulous-dachshund-120`
- Frontend uses React 19 with modern hooks and TypeScript strict mode
- Styling follows TailwindCSS patterns with component-based architecture
- PDF processing requires OpenAI API integration for text extraction