# Washingo PRD - On-Demand Car Cleaning Service

## Overview
Washingo is an on-demand car cleaning service app (like Rapido for car washing) with three user roles and real payment integration.

## Architecture
- **Frontend:** React Native (Expo SDK 54) with expo-router
- **Backend:** FastAPI with Socket.io for real-time
- **Database:** MongoDB
- **Payments:** Razorpay (real integration with test keys)
- **Maps:** Google Maps API key configured
- **Auth:** Phone OTP (Mock OTP for now, Firebase Auth config ready)
- **Real-time:** Socket.io for live booking requests and location tracking

## Three User Roles

### Role 1: Customer
- Login with phone + OTP
- View 4 services: Dusting ₹99, Wet Cloth ₹149, Full Wash ₹299, Visit Centre ₹399
- Book home service or visit washing centre
- Pay via Razorpay (UPI/GPay/Cash)
- Rate workers and centres
- Booking history

### Role 2: CleanPro (Worker)
- Register with name, phone, photo, area
- Online/Offline toggle
- Receive booking requests with accept/reject
- Mark jobs as started/complete
- Earnings dashboard with commission split (85% to worker)
- Verified CleanPro badge

### Role 3: Washing Centre Partner
- Register centre with name, address, bays
- Manage services and availability
- Receive and accept bookings
- Live queue management
- Earnings dashboard

### Admin Panel
- Secure login (admin@washingo.com)
- Dashboard with revenue, commission, stats
- Manage all users, cleaners, centres
- View all bookings

## Commission Structure
- Washingo takes 15% commission
- Worker/Centre receives 85%
- Razorpay Route ready for automatic split

## Theme
- Primary: Blue (#1565C0)
- White background
- Yellow accent (#F9A825)
- Clean, modern, mobile-first design

## Integrations
- **Razorpay:** REAL - Test keys working, order creation verified
- **Google Maps:** API key configured, ready for map views
- **Firebase Auth:** Config ready, OTP mock for now (user needs to enable phone auth in Firebase Console)
- **Socket.io:** Real-time booking notifications and location tracking

## API Endpoints
- POST /api/auth/register
- POST /api/auth/login-or-register
- GET /api/services
- POST /api/bookings
- PATCH /api/bookings/{id}/accept
- PATCH /api/bookings/{id}/complete
- POST /api/payments/create-order
- POST /api/payments/verify
- POST /api/ratings
- POST /api/admin/login
- GET /api/admin/dashboard
- POST /api/centres
- GET /api/centres/nearby
