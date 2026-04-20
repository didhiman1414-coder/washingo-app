"""
Washingo Payment Flow Tests - Rapido-style Payment AFTER Service
Tests the complete flow: Book → Complete → OTP → Payment → Rating
"""
import pytest
import requests
import os
from pathlib import Path
from dotenv import load_dotenv

# Load frontend .env to get EXPO_PUBLIC_BACKEND_URL
frontend_env = Path(__file__).parent.parent.parent / 'frontend' / '.env'
load_dotenv(frontend_env)

BASE_URL = os.environ.get('EXPO_PUBLIC_BACKEND_URL', '').rstrip('/')
if not BASE_URL:
    raise ValueError("EXPO_PUBLIC_BACKEND_URL not found in environment")


class TestPaymentFlowCashPayment:
    """Test complete payment flow with CASH payment"""
    
    def test_complete_flow_cash_payment(self, api_client, test_customer, test_cleaner):
        """
        Complete flow: Book (no payment) → Accept → Start → Complete (OTP) → 
        Verify OTP → Pay Cash → Rating unlocked
        """
        # Step 1: Create booking WITHOUT payment_method
        booking_payload = {
            "customer_id": test_customer['user_id'],
            "customer_name": test_customer['name'],
            "customer_phone": test_customer['phone'],
            "service_id": "2",  # Wet Cloth Clean - ₹149
            "booking_type": "home_service",
            "latitude": 12.9716,
            "longitude": 77.5946,
            "address": "TEST_Payment_Flow_Address"
            # NO payment_method field
        }
        booking_response = api_client.post(f"{BASE_URL}/api/bookings", json=booking_payload)
        assert booking_response.status_code == 200
        booking = booking_response.json()
        assert booking['status'] == 'pending'
        assert booking['payment_method'] is None  # No payment at booking time
        booking_id = booking['booking_id']
        print(f"✓ Step 1: Booking created WITHOUT payment_method - booking_id: {booking_id}")
        
        # Step 2: Cleaner accepts booking
        accept_response = api_client.patch(
            f"{BASE_URL}/api/bookings/{booking_id}/accept",
            params={"cleaner_id": test_cleaner['cleaner_id']}
        )
        assert accept_response.status_code == 200
        assert accept_response.json()['status'] == 'accepted'
        print("✓ Step 2: Booking accepted by cleaner")
        
        # Step 3: Cleaner starts job
        start_response = api_client.patch(f"{BASE_URL}/api/bookings/{booking_id}/start")
        assert start_response.status_code == 200
        assert start_response.json()['status'] == 'in_progress'
        print("✓ Step 3: Job started")
        
        # Step 4: Cleaner taps "Job Complete" → OTP generated
        complete_response = api_client.patch(f"{BASE_URL}/api/bookings/{booking_id}/complete")
        assert complete_response.status_code == 200
        completed_booking = complete_response.json()
        assert completed_booking['status'] == 'awaiting_otp'
        assert 'completion_otp' in completed_booking
        assert len(completed_booking['completion_otp']) == 4
        otp = completed_booking['completion_otp']
        print(f"✓ Step 4: Job complete - OTP generated: {otp}")
        
        # Step 5: Verify WRONG OTP is rejected
        wrong_otp_response = api_client.patch(
            f"{BASE_URL}/api/bookings/{booking_id}/verify-otp",
            json={"booking_id": booking_id, "otp": "9999"}
        )
        assert wrong_otp_response.status_code == 400
        assert 'Invalid OTP' in wrong_otp_response.json()['detail']
        print("✓ Step 5a: Wrong OTP rejected")
        
        # Step 6: Verify CORRECT OTP is accepted
        correct_otp_response = api_client.patch(
            f"{BASE_URL}/api/bookings/{booking_id}/verify-otp",
            json={"booking_id": booking_id, "otp": otp}
        )
        assert correct_otp_response.status_code == 200
        verified_booking = correct_otp_response.json()
        assert verified_booking['status'] == 'awaiting_payment'
        assert 'completed_at' in verified_booking
        print("✓ Step 5b: Correct OTP accepted - status: awaiting_payment")
        
        # Step 7: Rating should be BLOCKED (payment not done yet)
        rating_blocked_response = api_client.post(
            f"{BASE_URL}/api/ratings",
            json={
                "booking_id": booking_id,
                "customer_id": test_customer['user_id'],
                "cleaner_id": test_cleaner['cleaner_id'],
                "stars": 5,
                "comment": "TEST_Rating_Before_Payment"
            }
        )
        assert rating_blocked_response.status_code == 400
        assert 'payment' in rating_blocked_response.json()['detail'].lower()
        print("✓ Step 6: Rating blocked before payment (as expected)")
        
        # Step 8: Worker taps "Cash Received"
        cash_response = api_client.patch(f"{BASE_URL}/api/bookings/{booking_id}/pay-cash")
        assert cash_response.status_code == 200
        paid_booking = cash_response.json()
        assert paid_booking['status'] == 'completed'
        assert paid_booking['payment_method'] == 'cash'
        assert paid_booking['payment_status'] == 'cash_received'
        assert 'cash_received_at' in paid_booking
        assert 'invoice_due_date' in paid_booking
        print(f"✓ Step 7: Cash payment recorded - status: completed")
        
        # Step 9: Rating should now be ALLOWED
        rating_allowed_response = api_client.post(
            f"{BASE_URL}/api/ratings",
            json={
                "booking_id": booking_id,
                "customer_id": test_customer['user_id'],
                "cleaner_id": test_cleaner['cleaner_id'],
                "stars": 5,
                "comment": "TEST_Rating_After_Payment"
            }
        )
        assert rating_allowed_response.status_code == 200
        rating = rating_allowed_response.json()
        assert rating['stars'] == 5
        assert rating['booking_id'] == booking_id
        print("✓ Step 8: Rating allowed after payment - COMPLETE FLOW PASSED")


class TestPaymentFlowOnlinePayment:
    """Test complete payment flow with ONLINE payment (Razorpay)"""
    
    def test_complete_flow_online_payment(self, api_client, test_customer, test_cleaner):
        """
        Complete flow: Book → Accept → Start → Complete (OTP) → 
        Verify OTP → Create Razorpay Order → Pay Online → Rating unlocked
        """
        # Step 1: Create booking WITHOUT payment_method
        booking_payload = {
            "customer_id": test_customer['user_id'],
            "customer_name": test_customer['name'],
            "customer_phone": test_customer['phone'],
            "service_id": "3",  # Full Wash - ₹299
            "booking_type": "home_service",
            "latitude": 12.9716,
            "longitude": 77.5946,
            "address": "TEST_Online_Payment_Address"
        }
        booking_response = api_client.post(f"{BASE_URL}/api/bookings", json=booking_payload)
        assert booking_response.status_code == 200
        booking = booking_response.json()
        booking_id = booking['booking_id']
        print(f"✓ Step 1: Booking created - booking_id: {booking_id}")
        
        # Step 2-4: Accept → Start → Complete (same as cash flow)
        api_client.patch(f"{BASE_URL}/api/bookings/{booking_id}/accept", params={"cleaner_id": test_cleaner['cleaner_id']})
        api_client.patch(f"{BASE_URL}/api/bookings/{booking_id}/start")
        complete_response = api_client.patch(f"{BASE_URL}/api/bookings/{booking_id}/complete")
        otp = complete_response.json()['completion_otp']
        print(f"✓ Steps 2-4: Accept → Start → Complete - OTP: {otp}")
        
        # Step 5: Verify OTP
        api_client.patch(
            f"{BASE_URL}/api/bookings/{booking_id}/verify-otp",
            json={"booking_id": booking_id, "otp": otp}
        )
        print("✓ Step 5: OTP verified - status: awaiting_payment")
        
        # Step 6: Create Razorpay order (REAL integration)
        order_response = api_client.post(
            f"{BASE_URL}/api/payments/create-order",
            json={"booking_id": booking_id, "amount": 299}
        )
        assert order_response.status_code == 200
        order = order_response.json()
        assert 'order_id' in order
        assert order['order_id'].startswith('order_')  # Real Razorpay order ID format
        assert order['amount'] == 299 * 100  # Paise
        assert order['currency'] == 'INR'
        assert order['key_id'] == 'rzp_test_SfKoJqNedjuSNb'
        print(f"✓ Step 6: Razorpay order created - order_id: {order['order_id']}")
        
        # Step 7: Complete online payment (simulated Razorpay success)
        online_complete_response = api_client.patch(
            f"{BASE_URL}/api/bookings/{booking_id}/pay-online-complete"
        )
        assert online_complete_response.status_code == 200
        paid_booking = online_complete_response.json()
        assert paid_booking['status'] == 'completed'
        assert paid_booking['payment_method'] == 'razorpay'
        print("✓ Step 7: Online payment completed - status: completed")
        
        # Step 8: Rating should now be allowed
        rating_response = api_client.post(
            f"{BASE_URL}/api/ratings",
            json={
                "booking_id": booking_id,
                "customer_id": test_customer['user_id'],
                "cleaner_id": test_cleaner['cleaner_id'],
                "stars": 4,
                "comment": "TEST_Rating_After_Online_Payment"
            }
        )
        assert rating_response.status_code == 200
        print("✓ Step 8: Rating allowed after online payment - COMPLETE FLOW PASSED")


class TestPaymentFlowEdgeCases:
    """Test edge cases and error handling"""
    
    def test_complete_without_start(self, api_client, test_customer, test_cleaner):
        """Test completing booking without starting it first"""
        # Create and accept booking
        booking_payload = {
            "customer_id": test_customer['user_id'],
            "customer_name": test_customer['name'],
            "customer_phone": test_customer['phone'],
            "service_id": "1",
            "booking_type": "home_service",
            "latitude": 12.9716,
            "longitude": 77.5946,
            "address": "TEST_Edge_Case"
        }
        booking_response = api_client.post(f"{BASE_URL}/api/bookings", json=booking_payload)
        booking_id = booking_response.json()['booking_id']
        api_client.patch(f"{BASE_URL}/api/bookings/{booking_id}/accept", params={"cleaner_id": test_cleaner['cleaner_id']})
        
        # Try to complete without starting
        complete_response = api_client.patch(f"{BASE_URL}/api/bookings/{booking_id}/complete")
        # Should still work (backend allows complete from 'accepted' or 'in_progress')
        assert complete_response.status_code == 200
        print("✓ Complete without start: Allowed (backend accepts from 'accepted' status)")
    
    def test_verify_otp_wrong_status(self, api_client, test_customer):
        """Test verifying OTP when booking is not in awaiting_otp status"""
        # Create booking
        booking_payload = {
            "customer_id": test_customer['user_id'],
            "customer_name": test_customer['name'],
            "customer_phone": test_customer['phone'],
            "service_id": "1",
            "booking_type": "home_service",
            "latitude": 12.9716,
            "longitude": 77.5946,
            "address": "TEST_Wrong_Status"
        }
        booking_response = api_client.post(f"{BASE_URL}/api/bookings", json=booking_payload)
        booking_id = booking_response.json()['booking_id']
        
        # Try to verify OTP without completing first
        otp_response = api_client.patch(
            f"{BASE_URL}/api/bookings/{booking_id}/verify-otp",
            json={"booking_id": booking_id, "otp": "1234"}
        )
        assert otp_response.status_code == 400
        assert 'not awaiting OTP' in otp_response.json()['detail']
        print("✓ Verify OTP wrong status: Rejected (as expected)")
    
    def test_pay_cash_wrong_status(self, api_client, test_customer):
        """Test paying cash when booking is not in awaiting_payment status"""
        # Create booking
        booking_payload = {
            "customer_id": test_customer['user_id'],
            "customer_name": test_customer['name'],
            "customer_phone": test_customer['phone'],
            "service_id": "1",
            "booking_type": "home_service",
            "latitude": 12.9716,
            "longitude": 77.5946,
            "address": "TEST_Cash_Wrong_Status"
        }
        booking_response = api_client.post(f"{BASE_URL}/api/bookings", json=booking_payload)
        booking_id = booking_response.json()['booking_id']
        
        # Try to pay cash without completing OTP verification
        cash_response = api_client.patch(f"{BASE_URL}/api/bookings/{booking_id}/pay-cash")
        assert cash_response.status_code == 400
        assert 'not awaiting payment' in cash_response.json()['detail']
        print("✓ Pay cash wrong status: Rejected (as expected)")


# Fixtures
@pytest.fixture(scope="function")
def test_customer(api_client):
    """Create a test customer for payment flow tests"""
    payload = {
        "phone": f"TEST_PAY_{os.urandom(4).hex()}",
        "name": "TEST_Payment_Customer",
        "role": "customer",
        "firebase_uid": f"fb_test_pay_cust_{os.urandom(4).hex()}"
    }
    response = api_client.post(f"{BASE_URL}/api/auth/register", json=payload)
    user = response.json()
    # Ensure user_id is present
    if 'user_id' not in user:
        # Try login-or-register
        response = api_client.post(f"{BASE_URL}/api/auth/login-or-register", json=payload)
        user = response.json()
    return user


@pytest.fixture(scope="function")
def test_cleaner(api_client):
    """Create a test cleaner for payment flow tests"""
    # Create user
    user_payload = {
        "phone": f"TEST_CLEAN_{os.urandom(4).hex()}",
        "name": "TEST_Payment_Cleaner",
        "role": "cleaner",
        "firebase_uid": f"fb_test_pay_clean_{os.urandom(4).hex()}"
    }
    user_response = api_client.post(f"{BASE_URL}/api/auth/register", json=user_payload)
    user = user_response.json()
    
    # Ensure user_id is present
    if 'user_id' not in user:
        user_response = api_client.post(f"{BASE_URL}/api/auth/login-or-register", json=user_payload)
        user = user_response.json()
    
    # Create cleaner profile
    cleaner_payload = {
        "user_id": user['user_id'],
        "name": user['name'],
        "phone": user['phone'],
        "area": "TEST_Area",
        "latitude": 12.9716,
        "longitude": 77.5946
    }
    cleaner_response = api_client.post(f"{BASE_URL}/api/cleaners", json=cleaner_payload)
    return cleaner_response.json()


@pytest.fixture
def api_client():
    """Shared requests session"""
    session = requests.Session()
    session.headers.update({"Content-Type": "application/json"})
    return session
