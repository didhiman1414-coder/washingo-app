"""
Test suite for Washingo Production Fixes
Tests: Service prices, 15% commission, payment flow, rating restrictions, config files
"""
import pytest
import requests
import os
from pathlib import Path
from dotenv import load_dotenv
import time

# Load frontend .env to get EXPO_PUBLIC_BACKEND_URL
frontend_env = Path(__file__).parent.parent.parent / 'frontend' / '.env'
if frontend_env.exists():
    load_dotenv(frontend_env)

BASE_URL = os.environ.get('EXPO_PUBLIC_BACKEND_URL', 'https://car-wash-book-2.preview.emergentagent.com').rstrip('/')

# Generate unique phone suffix for this test run
TEST_RUN_ID = str(int(time.time() * 1000))[-8:]

class TestServicePrices:
    """Test service prices are correct: ₹99, ₹149, ₹299, ₹499"""
    
    def test_get_services_returns_4_services(self):
        """GET /api/services should return 4 services"""
        response = requests.get(f"{BASE_URL}/api/services")
        assert response.status_code == 200
        services = response.json()
        assert len(services) == 4, f"Expected 4 services, got {len(services)}"
        print(f"✓ GET /api/services returned {len(services)} services")
    
    def test_service_prices_correct(self):
        """Verify service prices are ₹99, ₹149, ₹299, ₹499"""
        response = requests.get(f"{BASE_URL}/api/services")
        assert response.status_code == 200
        services = response.json()
        
        expected_prices = [99, 149, 299, 499]
        actual_prices = sorted([s['price'] for s in services])
        
        assert actual_prices == expected_prices, f"Expected prices {expected_prices}, got {actual_prices}"
        print(f"✓ Service prices correct: {actual_prices}")
    
    def test_service_names_correct(self):
        """Verify service names match production spec"""
        response = requests.get(f"{BASE_URL}/api/services")
        services = response.json()
        
        expected_names = [
            'Dusting Only',
            'Wet Cloth Clean',
            'Full Wash',
            'Interior & Exterior Full Clean'
        ]
        actual_names = sorted([s['name'] for s in services])
        
        assert actual_names == sorted(expected_names), f"Service names mismatch"
        print(f"✓ Service names correct: {actual_names}")


class TestCommissionCalculation:
    """Test 15% commission calculation on bookings"""
    
    def test_commission_15_percent_on_booking(self):
        """Create booking and verify 15% commission, 85% worker amount"""
        # Register test customer using login-or-register
        customer_response = requests.post(f"{BASE_URL}/api/auth/login-or-register", json={
            "phone": f"TEST_COMM_{TEST_RUN_ID}01",
            "name": "Test Commission Customer",
            "role": "customer",
            "firebase_uid": f"test_comm_cust_{TEST_RUN_ID}"
        })
        assert customer_response.status_code == 200
        customer = customer_response.json()
        
        # Register test cleaner
        cleaner_user_response = requests.post(f"{BASE_URL}/api/auth/login-or-register", json={
            "phone": f"TEST_COMM_{TEST_RUN_ID}02",
            "name": "Test Commission Cleaner",
            "role": "cleaner",
            "firebase_uid": f"test_comm_clean_{TEST_RUN_ID}"
        })
        assert cleaner_user_response.status_code == 200
        cleaner_user = cleaner_user_response.json()
        
        # Create cleaner profile
        cleaner_response = requests.post(f"{BASE_URL}/api/cleaners", json={
            "user_id": cleaner_user['user_id'],
            "name": cleaner_user['name'],
            "phone": cleaner_user['phone'],
            "photo_base64": "",
            "area": "Test Area",
            "latitude": 12.9716,
            "longitude": 77.5946
        })
        assert cleaner_response.status_code == 200
        cleaner = cleaner_response.json()
        
        # Create booking with ₹299 service (Full Wash)
        booking_response = requests.post(f"{BASE_URL}/api/bookings", json={
            "customer_id": customer['user_id'],
            "customer_name": customer['name'],
            "customer_phone": customer['phone'],
            "service_id": "3",  # Full Wash - ₹299
            "booking_type": "home_service",
            "latitude": 12.9716,
            "longitude": 77.5946,
            "address": "Test Address",
            "payment_method": "cash"
        })
        assert booking_response.status_code == 200
        booking = booking_response.json()
        
        # Verify commission calculation
        service_price = booking['service_price']
        commission = booking['commission_amount']
        worker_amount = booking['worker_amount']
        
        expected_commission = round(service_price * 0.15)  # 15%
        expected_worker = service_price - expected_commission  # 85%
        
        assert commission == expected_commission, f"Expected commission {expected_commission}, got {commission}"
        assert worker_amount == expected_worker, f"Expected worker amount {expected_worker}, got {worker_amount}"
        assert commission + worker_amount == service_price, "Commission + Worker amount should equal service price"
        
        print(f"✓ Commission calculation correct:")
        print(f"  Service Price: ₹{service_price}")
        print(f"  Commission (15%): ₹{commission}")
        print(f"  Worker Amount (85%): ₹{worker_amount}")


class TestPaymentFlow:
    """Test full Rapido-style payment flow: book → accept → start → complete → OTP → pay"""
    
    def test_full_payment_flow_cash(self):
        """Test complete payment flow with cash payment"""
        # Register customer
        customer_response = requests.post(f"{BASE_URL}/api/auth/register", json={
            "phone": "TEST_PROD_9999999993",
            "name": "Test Payment Customer",
            "role": "customer",
            "firebase_uid": "test_pay_cust_001"
        })
        customer = customer_response.json()
        
        # Register cleaner
        cleaner_user_response = requests.post(f"{BASE_URL}/api/auth/register", json={
            "phone": "TEST_PROD_9999999994",
            "name": "Test Payment Cleaner",
            "role": "cleaner",
            "firebase_uid": "test_pay_clean_001"
        })
        cleaner_user = cleaner_user_response.json()
        
        cleaner_response = requests.post(f"{BASE_URL}/api/cleaners", json={
            "user_id": cleaner_user['user_id'],
            "name": cleaner_user['name'],
            "phone": cleaner_user['phone'],
            "photo_base64": "",
            "area": "Test Area",
            "latitude": 12.9716,
            "longitude": 77.5946
        })
        cleaner = cleaner_response.json()
        
        # 1. Create booking
        booking_response = requests.post(f"{BASE_URL}/api/bookings", json={
            "customer_id": customer['user_id'],
            "customer_name": customer['name'],
            "customer_phone": customer['phone'],
            "service_id": "1",  # Dusting Only - ₹99
            "booking_type": "home_service",
            "latitude": 12.9716,
            "longitude": 77.5946,
            "address": "Test Address",
            "payment_method": "cash"
        })
        assert booking_response.status_code == 200
        booking = booking_response.json()
        booking_id = booking['booking_id']
        assert booking['status'] == 'pending'
        print(f"✓ Step 1: Booking created (status: pending)")
        
        # 2. Accept booking
        accept_response = requests.patch(
            f"{BASE_URL}/api/bookings/{booking_id}/accept?cleaner_id={cleaner['cleaner_id']}"
        )
        assert accept_response.status_code == 200
        booking = accept_response.json()
        assert booking['status'] == 'accepted'
        print(f"✓ Step 2: Booking accepted by cleaner")
        
        # 3. Start job
        start_response = requests.patch(f"{BASE_URL}/api/bookings/{booking_id}/start")
        assert start_response.status_code == 200
        booking = start_response.json()
        assert booking['status'] == 'in_progress'
        print(f"✓ Step 3: Job started (status: in_progress)")
        
        # 4. Complete job (generates OTP)
        complete_response = requests.patch(f"{BASE_URL}/api/bookings/{booking_id}/complete")
        assert complete_response.status_code == 200
        booking = complete_response.json()
        assert booking['status'] == 'awaiting_otp'
        assert 'completion_otp' in booking
        otp = booking['completion_otp']
        print(f"✓ Step 4: Job completed, OTP generated: {otp}")
        
        # 5. Verify OTP
        verify_response = requests.patch(f"{BASE_URL}/api/bookings/{booking_id}/verify-otp", json={
            "booking_id": booking_id,
            "otp": otp
        })
        assert verify_response.status_code == 200
        booking = verify_response.json()
        assert booking['status'] == 'awaiting_payment'
        print(f"✓ Step 5: OTP verified (status: awaiting_payment)")
        
        # 6. Pay cash
        pay_response = requests.patch(f"{BASE_URL}/api/bookings/{booking_id}/pay-cash")
        assert pay_response.status_code == 200
        booking = pay_response.json()
        assert booking['status'] == 'completed'
        assert booking['payment_status'] == 'cash_received'
        print(f"✓ Step 6: Cash payment recorded (status: completed)")
        
        print(f"✓ Full payment flow completed successfully!")


class TestRatingRestrictions:
    """Test rating is blocked before payment, allowed after payment"""
    
    def test_rating_blocked_before_payment(self):
        """Rating should be blocked if booking not completed or payment not done"""
        # Create a booking in 'in_progress' state
        customer_response = requests.post(f"{BASE_URL}/api/auth/register", json={
            "phone": "TEST_PROD_9999999995",
            "name": "Test Rating Customer",
            "role": "customer",
            "firebase_uid": "test_rating_cust_001"
        })
        customer = customer_response.json()
        
        cleaner_user_response = requests.post(f"{BASE_URL}/api/auth/register", json={
            "phone": "TEST_PROD_9999999996",
            "name": "Test Rating Cleaner",
            "role": "cleaner",
            "firebase_uid": "test_rating_clean_001"
        })
        cleaner_user = cleaner_user_response.json()
        
        cleaner_response = requests.post(f"{BASE_URL}/api/cleaners", json={
            "user_id": cleaner_user['user_id'],
            "name": cleaner_user['name'],
            "phone": cleaner_user['phone'],
            "photo_base64": "",
            "area": "Test Area",
            "latitude": 12.9716,
            "longitude": 77.5946
        })
        cleaner = cleaner_response.json()
        
        booking_response = requests.post(f"{BASE_URL}/api/bookings", json={
            "customer_id": customer['user_id'],
            "customer_name": customer['name'],
            "customer_phone": customer['phone'],
            "service_id": "2",
            "booking_type": "home_service",
            "latitude": 12.9716,
            "longitude": 77.5946,
            "address": "Test Address",
            "payment_method": "cash"
        })
        booking = booking_response.json()
        booking_id = booking['booking_id']
        
        # Accept and start
        requests.patch(f"{BASE_URL}/api/bookings/{booking_id}/accept?cleaner_id={cleaner['cleaner_id']}")
        requests.patch(f"{BASE_URL}/api/bookings/{booking_id}/start")
        
        # Try to rate before completion
        rating_response = requests.post(f"{BASE_URL}/api/ratings", json={
            "booking_id": booking_id,
            "customer_id": customer['user_id'],
            "cleaner_id": cleaner['cleaner_id'],
            "stars": 5,
            "comment": "Great service"
        })
        
        assert rating_response.status_code == 400
        assert "payment" in rating_response.json()['detail'].lower() or "completed" in rating_response.json()['detail'].lower()
        print(f"✓ Rating correctly blocked before payment (status: {rating_response.status_code})")
    
    def test_rating_allowed_after_payment(self):
        """Rating should be allowed after payment is completed"""
        # Create and complete full flow
        customer_response = requests.post(f"{BASE_URL}/api/auth/register", json={
            "phone": "TEST_PROD_9999999997",
            "name": "Test Rating After Pay Customer",
            "role": "customer",
            "firebase_uid": "test_rating_after_cust_001"
        })
        customer = customer_response.json()
        
        cleaner_user_response = requests.post(f"{BASE_URL}/api/auth/register", json={
            "phone": "TEST_PROD_9999999998",
            "name": "Test Rating After Pay Cleaner",
            "role": "cleaner",
            "firebase_uid": "test_rating_after_clean_001"
        })
        cleaner_user = cleaner_user_response.json()
        
        cleaner_response = requests.post(f"{BASE_URL}/api/cleaners", json={
            "user_id": cleaner_user['user_id'],
            "name": cleaner_user['name'],
            "phone": cleaner_user['phone'],
            "photo_base64": "",
            "area": "Test Area",
            "latitude": 12.9716,
            "longitude": 77.5946
        })
        cleaner = cleaner_response.json()
        
        booking_response = requests.post(f"{BASE_URL}/api/bookings", json={
            "customer_id": customer['user_id'],
            "customer_name": customer['name'],
            "customer_phone": customer['phone'],
            "service_id": "1",
            "booking_type": "home_service",
            "latitude": 12.9716,
            "longitude": 77.5946,
            "address": "Test Address",
            "payment_method": "cash"
        })
        booking = booking_response.json()
        booking_id = booking['booking_id']
        
        # Complete full flow
        requests.patch(f"{BASE_URL}/api/bookings/{booking_id}/accept?cleaner_id={cleaner['cleaner_id']}")
        requests.patch(f"{BASE_URL}/api/bookings/{booking_id}/start")
        complete_resp = requests.patch(f"{BASE_URL}/api/bookings/{booking_id}/complete")
        otp = complete_resp.json()['completion_otp']
        requests.patch(f"{BASE_URL}/api/bookings/{booking_id}/verify-otp", json={"booking_id": booking_id, "otp": otp})
        requests.patch(f"{BASE_URL}/api/bookings/{booking_id}/pay-cash")
        
        # Now try to rate
        rating_response = requests.post(f"{BASE_URL}/api/ratings", json={
            "booking_id": booking_id,
            "customer_id": customer['user_id'],
            "cleaner_id": cleaner['cleaner_id'],
            "stars": 5,
            "comment": "Excellent service!"
        })
        
        assert rating_response.status_code == 200
        rating = rating_response.json()
        assert rating['stars'] == 5
        print(f"✓ Rating allowed after payment completed (rating_id: {rating['rating_id']})")


if __name__ == "__main__":
    print("Running Washingo Production Fixes Test Suite...")
    pytest.main([__file__, "-v", "--tb=short"])
