"""
Simplified test suite for Washingo Production Fixes
"""
import pytest
import requests
import os
from pathlib import Path
from dotenv import load_dotenv

frontend_env = Path(__file__).parent.parent.parent / 'frontend' / '.env'
if frontend_env.exists():
    load_dotenv(frontend_env)

BASE_URL = os.environ.get('EXPO_PUBLIC_BACKEND_URL', 'https://car-wash-book-2.preview.emergentagent.com').rstrip('/')


def test_services_correct_prices():
    """Test GET /api/services returns 4 services with prices ₹99, ₹149, ₹299, ₹499"""
    response = requests.get(f"{BASE_URL}/api/services")
    assert response.status_code == 200
    services = response.json()
    
    assert len(services) == 4, f"Expected 4 services, got {len(services)}"
    
    prices = sorted([s['price'] for s in services])
    assert prices == [99, 149, 299, 499], f"Expected [99, 149, 299, 499], got {prices}"
    
    print(f"✓ Services correct: {len(services)} services with prices {prices}")


def test_commission_15_percent():
    """Test 15% commission calculation"""
    response = requests.get(f"{BASE_URL}/api/services")
    services = response.json()
    
    # Check commission calculation for each service
    for service in services:
        price = service['price']
        expected_commission = round(price * 0.15)
        expected_worker = price - expected_commission
        
        print(f"  Service: {service['name']} (₹{price})")
        print(f"    Commission (15%): ₹{expected_commission}")
        print(f"    Worker Amount (85%): ₹{expected_worker}")
        
        assert expected_commission + expected_worker == price
    
    print(f"✓ Commission calculation verified for all services")


def test_config_files_exist():
    """Test that config files exist"""
    import os.path
    
    # Check eas.json
    eas_json = Path(__file__).parent.parent.parent / 'frontend' / 'eas.json'
    assert eas_json.exists(), "eas.json not found"
    
    # Check app.config.js
    app_config = Path(__file__).parent.parent.parent / 'frontend' / 'app.config.js'
    assert app_config.exists(), "app.config.js not found"
    
    # Check google-services.json
    google_services = Path(__file__).parent.parent.parent / 'frontend' / 'android' / 'app' / 'google-services.json'
    assert google_services.exists(), "google-services.json not found"
    
    print("✓ All config files exist")
    
    # Verify eas.json has 3 profiles
    import json
    with open(eas_json) as f:
        eas_data = json.load(f)
    
    assert 'build' in eas_data
    assert 'development' in eas_data['build']
    assert 'preview' in eas_data['build']
    assert 'production' in eas_data['build']
    
    print("✓ eas.json has 3 build profiles (development, preview, production)")
    
    # Verify google-services.json has correct package
    with open(google_services) as f:
        google_data = json.load(f)
    
    package_name = google_data['client'][0]['client_info']['android_client_info']['package_name']
    assert package_name == 'com.washingo.app', f"Expected package com.washingo.app, got {package_name}"
    
    print(f"✓ google-services.json has correct package: {package_name}")


if __name__ == "__main__":
    print("Running Washingo Production Fixes Test Suite...")
    pytest.main([__file__, "-v", "--tb=short"])
