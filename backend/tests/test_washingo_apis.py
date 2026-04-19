"""
Washingo Backend API Tests
Tests: Health, Services, Auth, Bookings, Payments, Admin, Washing Centres
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

class TestHealthAndServices:
    """Health check and services API tests"""
    
    def test_health_check(self, api_client):
        """Test /api/health endpoint"""
        response = api_client.get(f"{BASE_URL}/api/health")
        assert response.status_code == 200
        data = response.json()
        assert data['status'] == 'healthy'
        assert 'timestamp' in data
        print("✓ Health check passed")
    
    def test_get_services(self, api_client):
        """Test /api/services returns 4 services with correct prices"""
        response = api_client.get(f"{BASE_URL}/api/services")
        assert response.status_code == 200
        services = response.json()
        assert len(services) == 4
        
        # Verify prices
        prices = [s['price'] for s in services]
        assert 99 in prices
        assert 149 in prices
        assert 299 in prices
        assert 399 in prices
        
        # Verify service names
        names = [s['name'] for s in services]
        assert 'Dusting Only' in names
        assert 'Wet Cloth Clean' in names
        assert 'Full Wash' in names
        assert 'Visit Washing Centre' in names
        
        print(f"✓ Services API passed - 4 services with prices: {prices}")


class TestAuthAPIs:
    """User authentication and registration tests"""
    
    def test_user_registration(self, api_client):
        """Test POST /api/auth/register"""
        payload = {
            "phone": "9999999999",
            "name": "TEST_User_Registration",
            "role": "customer",
            "firebase_uid": f"fb_test_reg_{os.urandom(4).hex()}"
        }
        response = api_client.post(f"{BASE_URL}/api/auth/register", json=payload)
        assert response.status_code == 200
        
        user = response.json()
        assert user['phone'] == payload['phone']
        assert user['name'] == payload['name']
        assert user['role'] == payload['role']
        assert 'user_id' in user
        
        # Verify persistence with GET
        get_response = api_client.get(f"{BASE_URL}/api/auth/user/{payload['phone']}")
        assert get_response.status_code == 200
        assert get_response.json()['phone'] == payload['phone']
        
        print(f"✓ User registration passed - user_id: {user['user_id']}")
    
    def test_login_or_register_new_user(self, api_client):
        """Test POST /api/auth/login-or-register for new user"""
        payload = {
            "phone": "8888888888",
            "name": "TEST_LoginOrRegister",
            "role": "cleaner",
            "firebase_uid": f"fb_test_lor_{os.urandom(4).hex()}"
        }
        response = api_client.post(f"{BASE_URL}/api/auth/login-or-register", json=payload)
        assert response.status_code == 200
        
        user = response.json()
        assert user['phone'] == payload['phone']
        assert user['name'] == payload['name']
        assert 'user_id' in user
        
        print(f"✓ Login-or-register (new user) passed - user_id: {user['user_id']}")
    
    def test_login_or_register_existing_user(self, api_client):
        """Test POST /api/auth/login-or-register for existing user"""
        phone = "7777777777"
        # First create user
        payload1 = {
            "phone": phone,
            "name": "TEST_Existing_User",
            "role": "customer",
            "firebase_uid": f"fb_test_exist_{os.urandom(4).hex()}"
        }
        api_client.post(f"{BASE_URL}/api/auth/login-or-register", json=payload1)
        
        # Try login-or-register again
        payload2 = {
            "phone": phone,
            "name": "Different Name",
            "role": "customer",
            "firebase_uid": f"fb_test_exist_new_{os.urandom(4).hex()}"
        }
        response = api_client.post(f"{BASE_URL}/api/auth/login-or-register", json=payload2)
        assert response.status_code == 200
        
        user = response.json()
        assert user['phone'] == phone
        # Should return existing user
        assert user['name'] == payload1['name']
        
        print("✓ Login-or-register (existing user) passed")


class TestBookingAndCommission:
    """Booking creation and commission calculation tests"""
    
    def test_booking_creation_with_commission(self, api_client):
        """Test POST /api/bookings with 15% commission calculation"""
        # Create test customer
        customer_payload = {
            "phone": "6666666666",
            "name": "TEST_Booking_Customer",
            "role": "customer",
            "firebase_uid": f"fb_test_booking_{os.urandom(4).hex()}"
        }
        customer_response = api_client.post(f"{BASE_URL}/api/auth/register", json=customer_payload)
        customer = customer_response.json()
        
        # Create booking
        booking_payload = {
            "customer_id": customer['user_id'],
            "customer_name": customer['name'],
            "customer_phone": customer['phone'],
            "service_id": "1",  # Dusting Only - ₹99
            "booking_type": "home_service",
            "latitude": 12.9716,
            "longitude": 77.5946,
            "address": "TEST_Address_Bangalore",
            "payment_method": "cash"
        }
        response = api_client.post(f"{BASE_URL}/api/bookings", json=booking_payload)
        assert response.status_code == 200
        
        booking = response.json()
        assert booking['service_price'] == 99
        
        # Verify commission calculation (15% of 99 = 14.85 ≈ 15)
        expected_commission = round(99 * 15 / 100)
        expected_worker_amount = 99 - expected_commission
        
        assert booking['commission_amount'] == expected_commission
        assert booking['worker_amount'] == expected_worker_amount
        assert booking['status'] == 'pending'
        
        # Verify persistence
        get_response = api_client.get(f"{BASE_URL}/api/bookings/{booking['booking_id']}")
        assert get_response.status_code == 200
        
        print(f"✓ Booking creation passed - commission: ₹{expected_commission}, worker: ₹{expected_worker_amount}")


class TestRazorpayPayment:
    """Razorpay payment integration tests"""
    
    def test_razorpay_order_creation(self, api_client):
        """Test POST /api/payments/create-order"""
        # Create customer and booking first
        customer_payload = {
            "phone": "5555555555",
            "name": "TEST_Payment_Customer",
            "role": "customer",
            "firebase_uid": f"fb_test_payment_{os.urandom(4).hex()}"
        }
        customer_response = api_client.post(f"{BASE_URL}/api/auth/register", json=customer_payload)
        customer = customer_response.json()
        
        booking_payload = {
            "customer_id": customer['user_id'],
            "customer_name": customer['name'],
            "customer_phone": customer['phone'],
            "service_id": "3",  # Full Wash - ₹299
            "booking_type": "home_service",
            "latitude": 12.9716,
            "longitude": 77.5946,
            "address": "TEST_Payment_Address",
            "payment_method": "razorpay"
        }
        booking_response = api_client.post(f"{BASE_URL}/api/bookings", json=booking_payload)
        booking = booking_response.json()
        
        # Create Razorpay order
        payment_payload = {
            "booking_id": booking['booking_id'],
            "amount": booking['service_price']
        }
        response = api_client.post(f"{BASE_URL}/api/payments/create-order", json=payment_payload)
        assert response.status_code == 200
        
        order = response.json()
        assert 'order_id' in order
        assert order['amount'] == 299 * 100  # Amount in paise
        assert order['currency'] == 'INR'
        assert order['key_id'] == 'rzp_test_SfKoJqNedjuSNb'
        assert order['booking_id'] == booking['booking_id']
        
        print(f"✓ Razorpay order creation passed - order_id: {order['order_id']}")


class TestAdminAPIs:
    """Admin authentication and dashboard tests"""
    
    def test_admin_login_success(self, api_client):
        """Test POST /api/admin/login with correct credentials"""
        payload = {
            "email": "admin@washingo.com",
            "password": "washingo_admin_2026"
        }
        response = api_client.post(f"{BASE_URL}/api/admin/login", json=payload)
        assert response.status_code == 200
        
        data = response.json()
        assert 'token' in data
        assert data['role'] == 'admin'
        assert data['email'] == payload['email']
        
        print(f"✓ Admin login passed - token: {data['token'][:20]}...")
    
    def test_admin_login_failure(self, api_client):
        """Test POST /api/admin/login with wrong credentials"""
        payload = {
            "email": "admin@washingo.com",
            "password": "wrong_password"
        }
        response = api_client.post(f"{BASE_URL}/api/admin/login", json=payload)
        assert response.status_code == 401
        assert 'detail' in response.json()
        
        print("✓ Admin login failure test passed")
    
    def test_admin_dashboard(self, api_client):
        """Test GET /api/admin/dashboard returns stats"""
        response = api_client.get(f"{BASE_URL}/api/admin/dashboard")
        assert response.status_code == 200
        
        data = response.json()
        assert 'total_customers' in data
        assert 'total_cleaners' in data
        assert 'total_centres' in data
        assert 'total_bookings' in data
        assert 'completed_bookings' in data
        assert 'pending_bookings' in data
        assert 'total_revenue' in data
        assert 'total_commission' in data
        assert 'worker_payouts' in data
        
        # Verify data types
        assert isinstance(data['total_customers'], int)
        assert isinstance(data['total_revenue'], (int, float))
        
        print(f"✓ Admin dashboard passed - customers: {data['total_customers']}, bookings: {data['total_bookings']}")


class TestWashingCentreAPIs:
    """Washing centre CRUD tests"""
    
    def test_create_washing_centre(self, api_client):
        """Test POST /api/centres"""
        # Create centre user first
        user_payload = {
            "phone": "4444444444",
            "name": "TEST_Centre_Owner",
            "role": "centre",
            "firebase_uid": f"fb_test_centre_{os.urandom(4).hex()}"
        }
        user_response = api_client.post(f"{BASE_URL}/api/auth/register", json=user_payload)
        user = user_response.json()
        
        # Create washing centre
        centre_payload = {
            "user_id": user['user_id'],
            "name": "TEST_Washing_Centre",
            "phone": user['phone'],
            "address": "TEST_Centre_Address_Bangalore",
            "latitude": 12.9716,
            "longitude": 77.5946,
            "photos_base64": [],
            "total_bays": 5,
            "services_offered": ["1", "2", "3", "4"]
        }
        response = api_client.post(f"{BASE_URL}/api/centres", json=centre_payload)
        assert response.status_code == 200
        
        centre = response.json()
        assert centre['name'] == centre_payload['name']
        assert centre['total_bays'] == 5
        assert centre['occupied_bays'] == 0
        assert centre['available'] == True
        assert centre['approved'] == False
        assert 'centre_id' in centre
        
        # Verify persistence
        get_response = api_client.get(f"{BASE_URL}/api/centres/{centre['centre_id']}")
        assert get_response.status_code == 200
        
        print(f"✓ Washing centre creation passed - centre_id: {centre['centre_id']}")
    
    def test_get_nearby_centres(self, api_client):
        """Test GET /api/centres/nearby"""
        response = api_client.get(f"{BASE_URL}/api/centres/nearby", params={
            "latitude": 12.9716,
            "longitude": 77.5946
        })
        assert response.status_code == 200
        
        centres = response.json()
        assert isinstance(centres, list)
        
        print(f"✓ Nearby centres API passed - found {len(centres)} centres")


@pytest.fixture
def api_client():
    """Shared requests session"""
    session = requests.Session()
    session.headers.update({"Content-Type": "application/json"})
    return session
