<div align="center">

# NileGuide

<img src="https://readme-typing-svg.demolab.com?font=Fira+Code&weight=700&size=24&pause=1200&color=D4AF37&center=true&vCenter=true&width=720&lines=AI-powered+Egypt+travel+guide;Plan+activities%2C+maps%2C+wishlists%2C+and+admin+dashboards;Built+with+Angular+SSR" alt="NileGuide animated intro" />

<br />

![Angular](https://img.shields.io/badge/Angular-21-DD0031?style=for-the-badge&logo=angular&logoColor=white)
![TypeScript](https://img.shields.io/badge/TypeScript-5.9-3178C6?style=for-the-badge&logo=typescript&logoColor=white)
![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-4-06B6D4?style=for-the-badge&logo=tailwindcss&logoColor=white)
![SSR](https://img.shields.io/badge/Angular_SSR-Enabled-111827?style=for-the-badge&logo=angular&logoColor=white)
![Status](https://img.shields.io/badge/Status-Production_ready-22C55E?style=for-the-badge)

**NileGuide** is a modern Angular travel platform for exploring Egypt, planning tourist activities, managing schedules, using an AI chatbot, and operating admin workflows from one clean interface.

</div>

---

## Table of Contents

- [Overview](#overview)
- [Core Features](#core-features)
- [Tech Stack](#tech-stack)
- [Project Structure](#project-structure)
- [Environment Configuration](#environment-configuration)
- [Getting Started](#getting-started)
- [Available Scripts](#available-scripts)
- [Application Routes](#application-routes)
- [Security Notes](#security-notes)
- [Build and Deployment](#build-and-deployment)
- [Code Quality](#code-quality)
- [Team Handoff](#team-handoff)

---

## Overview

NileGuide helps tourists discover Egyptian experiences, save favorite activities, build a schedule, view planned activities on an interactive map, and contact the platform team. It also includes an admin dashboard for managing activities, users, reports, and AI chatbot files.

The project is implemented as an Angular standalone-component application with server-side rendering support.

---

## Core Features

| Area | Details |
| --- | --- |
| Tourist Authentication | Register, login, logout, role detection, forgot password, reset password |
| Activities | Search, filter by city/category, sort, pagination, details page, reviews |
| Wishlist | Save and remove favorite activities for authenticated tourists |
| Schedule | Add activities to a personal trip plan, remove plan items, export-related UI support |
| Interactive Map | Displays scheduled activities by coordinates using Google Maps when configured |
| AI Chatbot | Tourist chatbot interface and admin chatbot file-management workflow |
| Contact | Contact form integration through EmailJS when configured |
| Static Pages | Privacy, terms, help center, contact, and home sections |
| Admin Dashboard | Users, activities, reports, and chatbot management routes |
| SSR | Angular SSR server entry and server route configuration |

---

## Tech Stack

| Layer | Tools |
| --- | --- |
| Framework | Angular 21, Angular Router, Angular SSR |
| Language | TypeScript 5.9 |
| UI | Tailwind CSS 4, Flowbite, Font Awesome, ng-icons |
| Forms | Angular Reactive Forms |
| HTTP | Angular HttpClient with auth interceptor |
| Charts | ApexCharts |
| PDF | jsPDF, jsPDF AutoTable |
| Notifications | ngx-toastr, ngx-spinner |
| Runtime | Node.js, Express SSR server |
| Testing | Angular test runner with Vitest configuration |

---

## Project Structure

```text
src/
  app/
    core/
      components/       Shared navbar, footer, chatbot
      constants/        Storage keys and API base URL
      guards/           Tourist/admin route guards
      interceptors/     Auth and cache HTTP interceptors
      layouts/          Guest and authenticated layouts
      services/         Shared infrastructure services
    features/
      activities/       Activity listing, filters, details models, API service
      admin/            Dashboard, users, activities, reports, chatbot admin
      auth/             Login, register, forgot/reset password
      contact/          Contact form and EmailJS integration
      details/          Activity details page
      help-center/      Help center page
      home/             Home page sections
      map/              Schedule map view
      privacy/          Privacy page
      profile/          Tourist profile page
      schedule/         Trip schedule feature
      terms-of-service/ Terms page
      wishlist/         Tourist wishlist
  environments/         Public runtime placeholders for frontend integrations
  styles/               Global style layers
public/
  Photo/                Application images
  ico/                  Favicon and app icon assets
```

---

## Environment Configuration

Frontend environment values live in:

```text
src/environments/environment.ts
src/environments/environment.development.ts
```

Current public placeholders:

```ts
export const environment = {
  production: false,
  googleMapsApiKey: '',
  emailJs: {
    serviceId: '',
    templateId: '',
    publicKey: '',
  },
};
```

Important:

- Do not commit private passwords, admin credentials, personal demo accounts, `.env` files, generated reports, or videos.
- Google Maps and EmailJS browser keys are client-visible by design. Restrict them from the provider dashboards by domain and allowed API usage.
- Backend API base URL is currently defined in `src/app/core/constants/Stored_keys.ts`.
- Real production secrets should stay on the backend, not inside Angular source files.

---

## Getting Started

### Prerequisites

- Node.js compatible with Angular 21
- npm 10+
- A running NileGuide backend API
- Optional: Google Maps API key for the map page
- Optional: EmailJS service/template/public key for the contact page

### Install

```bash
npm install
```

### Run Locally

```bash
npm start
```

Open:

```text
http://localhost:4200
```

### Build

```bash
npm run build
```

Build output:

```text
dist/G.Project
```

### Run SSR Build

```bash
npm run build
npm run serve:ssr:G.Project
```

Default SSR port:

```text
http://localhost:4000
```

---

## Available Scripts

| Command | Purpose |
| --- | --- |
| `npm start` | Start Angular development server |
| `npm run build` | Build production browser and SSR bundles |
| `npm run watch` | Build in watch mode for development |
| `npm test` | Run Angular tests |
| `npm run serve:ssr:G.Project` | Serve the SSR production bundle |

---

## Application Routes

| Route | Access | Description |
| --- | --- | --- |
| `/home` | Public | Landing/home experience |
| `/auth/login` | Guest | Tourist/admin login |
| `/auth/register` | Guest | Tourist registration |
| `/auth/forget-password` | Guest | Password reset request |
| `/activities` | Tourist | Browse activities |
| `/activities/:id` | Tourist | Activity details and reviews |
| `/wishlist` | Tourist | Saved activities |
| `/schedule` | Tourist | Personal trip plan |
| `/map` | Tourist | Scheduled activities on map |
| `/profile` | Tourist | Profile page |
| `/dashboard` | Admin | Admin dashboard shell |
| `/dashboard/users-management` | Admin | User management |
| `/dashboard/activities-management` | Admin | Activity management |
| `/dashboard/reports` | Admin | Reports management |
| `/contact` | Public | Contact form |
| `/privacy` | Public | Privacy policy |
| `/terms` | Public | Terms of service |
| `/help` | Public | Help center |

---

## Security Notes

This repository has been cleaned to avoid committing non-code artifacts and sensitive local material.

Removed from source control:

- Local demo scripts and demo credential templates
- Generated screenshots, recordings, PDF/DOCX/PPTX deliverables, and archives
- Local editor/Cursor workspace files
- Generated logs and Playwright reports
- Hardcoded Google Maps API key
- Hardcoded EmailJS service/template/public key

Recommended rules:

- Keep `.env` and local credential files out of Git.
- Use provider-side restrictions for browser-exposed public keys.
- Rotate any key that was previously committed to a public repository.
- Do not store JWTs outside the browser storage flow already handled by the app.
- Keep admin credentials only in the backend identity system or a secure password manager.

---

## Build and Deployment

The app supports a standard Angular production build and an SSR server bundle.

Deployment checklist:

1. Configure backend API URL.
2. Configure public Google Maps and EmailJS values if the related features are enabled.
3. Run `npm install`.
4. Run `npm run build`.
5. Deploy `dist/G.Project` according to the selected hosting target.
6. For SSR hosting, start `dist/G.Project/server/server.mjs`.

---

## Code Quality

The codebase follows these conventions:

- Standalone Angular components
- Feature-first folder organization
- Route guards for protected tourist/admin pages
- Central auth state service
- HTTP interceptors for auth/cache behavior
- Shared layout components for guest and authenticated experiences
- Environment placeholders instead of committed keys

Before pushing:

```bash
npm run build
npm test
```

---

## Team Handoff

Key files to review first:

| File | Why it matters |
| --- | --- |
| `src/app/app.routes.ts` | Main client routing |
| `src/app/app.routes.server.ts` | SSR rendering strategy |
| `src/app/core/constants/Stored_keys.ts` | API base URL and storage keys |
| `src/app/core/guards/auth.guards.ts` | Role-based route protection |
| `src/app/core/interceptors/auth.interceptor.ts` | Auth header injection |
| `src/app/features/auth/services/auth.service.ts` | Login/register/reset auth flow |
| `src/app/features/activities/activities.service.ts` | Activities API integration |
| `src/app/features/schedule/schedule.service.ts` | Trip plan API integration |
| `src/environments/environment.ts` | Production public integration placeholders |

---

<div align="center">

**NileGuide** - Built for a richer, cleaner, and more practical Egypt travel experience.

</div>
