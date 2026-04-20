# Washingo PRD - On-Demand Car Cleaning Service

## Overview
Washingo is an on-demand car cleaning service app (like Rapido for car washing) with three user roles and real payment integration.

## Payment Flow (Rapido-Style — Pay AFTER Service)
1. Customer books service → **no payment asked**
2. Worker completes the job → taps "Job Complete"
3. System generates **4-digit OTP** → sent to customer's phone via Socket.io
4. Customer checks car → tells OTP to worker
5. Worker enters OTP → **job confirmed**
6. Customer sees payment screen with two options:
   - **Pay via UPI/GPay** → Razorpay (real integration)
   - **Pay by Cash** → Worker taps "Cash Received"
7. **Razorpay Route splits**: 85% → Worker, 15% → Washingo
8. Rating/review unlocks **only after payment is done**
9. Both customer and worker get payment confirmation notification

## Architecture
- **Frontend:** React Native (Expo SDK 54) with expo-router
- **Backend:** FastAPI with Socket.io for real-time
- **Database:** MongoDB
- **Payments:** Razorpay (REAL integration, test keys)
- **Real-time:** Socket.io for live notifications, OTP delivery, location tracking

## Three User Roles
### Customer: Book services, pay after work, rate
### CleanPro (Worker): Accept jobs, complete via OTP, collect payment
### Washing Centre: Register centre, manage bookings

### Admin Panel
- Login: admin@washingo.com / washingo_admin_2026

## Services
- Dusting Only: ₹99
- Wet Cloth Clean: ₹149
- Full Wash: ₹299
- Visit Washing Centre: ₹399

## Commission: 15% Washingo, 85% Worker/Centre

## Key API Endpoints (Payment Flow)
- POST /api/bookings → Create booking (no payment)
- PATCH /api/bookings/{id}/accept → Cleaner accepts
- PATCH /api/bookings/{id}/start → Job started
- PATCH /api/bookings/{id}/complete → Job complete, 4-digit OTP generated
- PATCH /api/bookings/{id}/verify-otp → Worker enters OTP, payment unlocked
- PATCH /api/bookings/{id}/pay-cash → Cash received
- POST /api/payments/create-order → Real Razorpay order
- PATCH /api/bookings/{id}/pay-online-complete → After Razorpay payment
- POST /api/ratings → Only works after payment done
