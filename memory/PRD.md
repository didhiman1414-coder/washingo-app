# Washingo PRD — Production Ready

## App Configuration
- **Package:** com.washingo.app
- **Firebase Project:** washingo-d9dc2
- **Config:** app.config.js (dynamic — Firebase plugins only in EAS Build)
- **EAS Profiles:** development, preview, production

## Services & Prices
| Service | Price | Commission (15%) | Worker Gets (85%) |
|---------|-------|-------------------|-------------------|
| Dusting Only | ₹99 | ₹15 | ₹84 |
| Wet Cloth Clean | ₹149 | ₹22 | ₹127 |
| Full Wash | ₹299 | ₹45 | ₹254 |
| Interior & Exterior Full Clean | ₹499 | ₹75 | ₹424 |

## Payment Flow (Rapido-Style)
1. Book → No payment asked
2. Worker completes → "Job Complete" → 4-digit OTP generated
3. Customer checks → tells OTP to worker
4. Worker enters OTP → payment screen unlocks
5. Customer pays: UPI/GPay (Razorpay) or Cash
6. Rating unlocks only after payment

## Build Steps
```bash
cd frontend
eas build --platform android --profile development   # Dev build
eas build --platform android --profile production    # Play Store
```
After first build: Add SHA-1 from EAS to Firebase Console.
