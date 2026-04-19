from fastapi import FastAPI, APIRouter, HTTPException, Request
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
import hmac
import hashlib
from pathlib import Path
from typing import List, Optional
import uuid
from datetime import datetime
import socketio
import razorpay

from models import (
    User, UserCreate, UserRole,
    Cleaner, CleanerCreate, CleanerUpdate,
    WashingCentre, WashingCentreCreate, WashingCentreUpdate,
    Service,
    Booking, BookingCreate, BookingStatus, BookingType, PaymentMethod, PaymentStatus,
    Rating, RatingCreate,
    RazorpayOrderCreate, RazorpayPaymentVerify,
    AdminLogin, LocationUpdate
)

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

# Razorpay client
razorpay_key_id = os.environ.get('RAZORPAY_KEY_ID', '')
razorpay_key_secret = os.environ.get('RAZORPAY_KEY_SECRET', '')
razorpay_client = razorpay.Client(auth=(razorpay_key_id, razorpay_key_secret))

# Commission percentage
COMMISSION_PERCENT = int(os.environ.get('COMMISSION_PERCENT', '15'))

# Socket.IO setup
sio = socketio.AsyncServer(async_mode='asgi', cors_allowed_origins='*')

# Create FastAPI app
app = FastAPI(title="Washingo API")

# Create Socket.IO ASGI app
socket_app = socketio.ASGIApp(sio, app)

# Create API router with /api prefix
api_router = APIRouter(prefix="/api")

# Configure logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

# ==================== Socket.IO Events ====================

# Track connected users
connected_cleaners = {}  # cleaner_id -> sid
connected_customers = {}  # customer_id -> sid
connected_centres = {}  # centre_id -> sid

@sio.event
async def connect(sid, environ):
    logger.info(f"Client connected: {sid}")
    await sio.emit('connection_established', {'message': 'Connected to Washingo'}, to=sid)

@sio.event
async def disconnect(sid):
    logger.info(f"Client disconnected: {sid}")
    # Remove from tracking
    for cid, s in list(connected_cleaners.items()):
        if s == sid:
            del connected_cleaners[cid]
    for cid, s in list(connected_customers.items()):
        if s == sid:
            del connected_customers[cid]
    for cid, s in list(connected_centres.items()):
        if s == sid:
            del connected_centres[cid]

@sio.event
async def register_user(sid, data):
    """Register user socket connection"""
    user_type = data.get('type')
    user_id = data.get('user_id')
    if user_type == 'cleaner':
        connected_cleaners[user_id] = sid
    elif user_type == 'customer':
        connected_customers[user_id] = sid
    elif user_type == 'centre':
        connected_centres[user_id] = sid
    logger.info(f"{user_type} {user_id} registered with sid {sid}")

@sio.event
async def update_location(sid, data):
    """Cleaner updates location - broadcast to tracking customers"""
    cleaner_id = data.get('cleaner_id')
    lat = data.get('latitude')
    lon = data.get('longitude')
    booking_id = data.get('booking_id')
    
    await db.cleaners.update_one(
        {'cleaner_id': cleaner_id},
        {'$set': {'latitude': lat, 'longitude': lon}}
    )
    
    # Emit to all connected customers
    for cid, csid in connected_customers.items():
        await sio.emit('cleaner_location_update', {
            'cleaner_id': cleaner_id,
            'latitude': lat,
            'longitude': lon,
            'booking_id': booking_id
        }, to=csid)

@sio.event
async def update_centre_bays(sid, data):
    """Centre updates bay status"""
    centre_id = data.get('centre_id')
    occupied = data.get('occupied_bays')
    
    await db.washing_centres.update_one(
        {'centre_id': centre_id},
        {'$set': {'occupied_bays': occupied}}
    )
    
    # Broadcast to all customers
    for cid, csid in connected_customers.items():
        await sio.emit('centre_status_update', {
            'centre_id': centre_id,
            'occupied_bays': occupied
        }, to=csid)

# ==================== Helper Functions ====================

async def notify_nearby_cleaners(booking: dict):
    """Notify available cleaners about new booking"""
    for cleaner_id, sid in connected_cleaners.items():
        await sio.emit('new_booking_request', {
            'booking_id': booking['booking_id'],
            'service_name': booking['service_name'],
            'service_price': booking['service_price'],
            'address': booking['address'],
            'customer_name': booking['customer_name'],
            'latitude': booking['latitude'],
            'longitude': booking['longitude'],
            'booking_type': booking.get('booking_type', 'home_service')
        }, to=sid)

async def notify_customer(customer_id: str, event: str, data: dict):
    """Send notification to specific customer"""
    sid = connected_customers.get(customer_id)
    if sid:
        await sio.emit(event, data, to=sid)

async def notify_centre(centre_id: str, event: str, data: dict):
    """Send notification to specific centre"""
    sid = connected_centres.get(centre_id)
    if sid:
        await sio.emit(event, data, to=sid)

def calculate_commission(amount: int) -> dict:
    """Calculate commission split"""
    commission = round(amount * COMMISSION_PERCENT / 100)
    worker_amount = amount - commission
    return {'commission': commission, 'worker_amount': worker_amount}

# ==================== Auth Routes ====================

@api_router.post("/auth/register")
async def register_user_endpoint(user_data: UserCreate):
    existing = await db.users.find_one({'phone': user_data.phone})
    if existing:
        raise HTTPException(status_code=400, detail="User with this phone already exists")
    
    user_id = str(uuid.uuid4())
    user = User(
        user_id=user_id, phone=user_data.phone, name=user_data.name,
        role=user_data.role, firebase_uid=user_data.firebase_uid
    )
    await db.users.insert_one(user.dict())
    return user.dict()

@api_router.get("/auth/user/{phone}")
async def get_user_by_phone(phone: str):
    user = await db.users.find_one({'phone': phone}, {'_id': 0})
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    return user

@api_router.get("/auth/user/firebase/{firebase_uid}")
async def get_user_by_firebase_uid(firebase_uid: str):
    user = await db.users.find_one({'firebase_uid': firebase_uid}, {'_id': 0})
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    return user

@api_router.post("/auth/login-or-register")
async def login_or_register(user_data: UserCreate):
    """Login existing user or register new one"""
    existing = await db.users.find_one({'phone': user_data.phone}, {'_id': 0})
    if existing:
        # Update firebase_uid if changed
        if user_data.firebase_uid and existing.get('firebase_uid') != user_data.firebase_uid:
            await db.users.update_one(
                {'phone': user_data.phone},
                {'$set': {'firebase_uid': user_data.firebase_uid}}
            )
            existing['firebase_uid'] = user_data.firebase_uid
        return existing
    
    # Register new user
    user_id = str(uuid.uuid4())
    user = User(
        user_id=user_id, phone=user_data.phone, name=user_data.name,
        role=user_data.role, firebase_uid=user_data.firebase_uid
    )
    await db.users.insert_one(user.dict())
    return user.dict()

# ==================== Admin Auth ====================

@api_router.post("/admin/login")
async def admin_login(creds: AdminLogin):
    admin_email = os.environ.get('ADMIN_EMAIL', 'admin@washingo.com')
    admin_password = os.environ.get('ADMIN_PASSWORD', 'washingo_admin_2026')
    
    if creds.email != admin_email or creds.password != admin_password:
        raise HTTPException(status_code=401, detail="Invalid admin credentials")
    
    return {"token": "admin_token_" + str(uuid.uuid4()), "role": "admin", "email": creds.email}

@api_router.get("/admin/dashboard")
async def admin_dashboard():
    total_customers = await db.users.count_documents({'role': 'customer'})
    total_cleaners = await db.users.count_documents({'role': 'cleaner'})
    total_centres = await db.users.count_documents({'role': 'centre'})
    total_bookings = await db.bookings.count_documents({})
    completed_bookings = await db.bookings.count_documents({'status': 'completed'})
    pending_bookings = await db.bookings.count_documents({'status': 'pending'})
    
    # Calculate total revenue
    pipeline = [
        {'$match': {'status': 'completed'}},
        {'$group': {'_id': None, 'total': {'$sum': '$service_price'}, 'commission': {'$sum': '$commission_amount'}}}
    ]
    revenue = await db.bookings.aggregate(pipeline).to_list(1)
    total_revenue = revenue[0]['total'] if revenue else 0
    total_commission = revenue[0]['commission'] if revenue else 0
    
    return {
        'total_customers': total_customers,
        'total_cleaners': total_cleaners,
        'total_centres': total_centres,
        'total_bookings': total_bookings,
        'completed_bookings': completed_bookings,
        'pending_bookings': pending_bookings,
        'total_revenue': total_revenue,
        'total_commission': total_commission,
        'worker_payouts': total_revenue - total_commission
    }

@api_router.get("/admin/users")
async def admin_get_users(role: Optional[str] = None):
    query = {}
    if role:
        query['role'] = role
    users = await db.users.find(query, {'_id': 0}).to_list(500)
    return users

@api_router.get("/admin/bookings")
async def admin_get_bookings(status: Optional[str] = None):
    query = {}
    if status:
        query['status'] = status
    bookings = await db.bookings.find(query, {'_id': 0}).sort('created_at', -1).to_list(500)
    return bookings

@api_router.patch("/admin/centres/{centre_id}/approve")
async def admin_approve_centre(centre_id: str):
    result = await db.washing_centres.update_one(
        {'centre_id': centre_id},
        {'$set': {'approved': True}}
    )
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Centre not found")
    return {"message": "Centre approved"}

@api_router.delete("/admin/users/{user_id}")
async def admin_block_user(user_id: str):
    await db.users.delete_one({'user_id': user_id})
    return {"message": "User blocked/removed"}

# ==================== Service Routes ====================

@api_router.get("/services")
async def get_services():
    services = await db.services.find({}, {'_id': 0}).to_list(100)
    if not services:
        return [
            {'service_id': '1', 'name': 'Dusting Only', 'description': 'Quick dust removal with microfiber cloth', 'price': 99, 'duration_minutes': 15, 'icon': 'brush', 'booking_type': 'home_service'},
            {'service_id': '2', 'name': 'Wet Cloth Clean', 'description': 'Thorough wet cleaning with premium cloth', 'price': 149, 'duration_minutes': 25, 'icon': 'water', 'booking_type': 'home_service'},
            {'service_id': '3', 'name': 'Full Wash', 'description': 'Complete car wash with water and shampoo', 'price': 299, 'duration_minutes': 45, 'icon': 'car-wash', 'booking_type': 'both'},
            {'service_id': '4', 'name': 'Visit Washing Centre', 'description': 'Premium wash at a nearby centre with foam and wax', 'price': 399, 'duration_minutes': 60, 'icon': 'store', 'booking_type': 'visit_centre'}
        ]
    return services

@api_router.post("/services/seed")
async def seed_services():
    services = [
        {'service_id': '1', 'name': 'Dusting Only', 'description': 'Quick dust removal with microfiber cloth', 'price': 99, 'duration_minutes': 15, 'icon': 'brush', 'booking_type': 'home_service'},
        {'service_id': '2', 'name': 'Wet Cloth Clean', 'description': 'Thorough wet cleaning with premium cloth', 'price': 149, 'duration_minutes': 25, 'icon': 'water', 'booking_type': 'home_service'},
        {'service_id': '3', 'name': 'Full Wash', 'description': 'Complete car wash with water and shampoo', 'price': 299, 'duration_minutes': 45, 'icon': 'car-wash', 'booking_type': 'both'},
        {'service_id': '4', 'name': 'Visit Washing Centre', 'description': 'Premium wash at a nearby centre with foam and wax', 'price': 399, 'duration_minutes': 60, 'icon': 'store', 'booking_type': 'visit_centre'}
    ]
    await db.services.delete_many({})
    await db.services.insert_many(services)
    return {"message": "Services seeded successfully"}

# ==================== Cleaner Routes ====================

@api_router.post("/cleaners")
async def create_cleaner(cleaner_data: CleanerCreate):
    cleaner_id = str(uuid.uuid4())
    cleaner = Cleaner(
        cleaner_id=cleaner_id, user_id=cleaner_data.user_id,
        name=cleaner_data.name, phone=cleaner_data.phone,
        photo_base64=cleaner_data.photo_base64, area=cleaner_data.area,
        latitude=cleaner_data.latitude, longitude=cleaner_data.longitude
    )
    await db.cleaners.insert_one(cleaner.dict())
    return cleaner.dict()

@api_router.get("/cleaners/nearby")
async def get_nearby_cleaners(latitude: float, longitude: float, radius: float = 10.0):
    cleaners = await db.cleaners.find({'available': True}, {'_id': 0}).to_list(100)
    return cleaners

@api_router.get("/cleaners/{cleaner_id}")
async def get_cleaner(cleaner_id: str):
    cleaner = await db.cleaners.find_one({'cleaner_id': cleaner_id}, {'_id': 0})
    if not cleaner:
        raise HTTPException(status_code=404, detail="Cleaner not found")
    return cleaner

@api_router.get("/cleaners/user/{user_id}")
async def get_cleaner_by_user_id(user_id: str):
    cleaner = await db.cleaners.find_one({'user_id': user_id}, {'_id': 0})
    if not cleaner:
        raise HTTPException(status_code=404, detail="Cleaner not found")
    return cleaner

@api_router.patch("/cleaners/{cleaner_id}")
async def update_cleaner(cleaner_id: str, update_data: CleanerUpdate):
    update_dict = {k: v for k, v in update_data.dict().items() if v is not None}
    if not update_dict:
        raise HTTPException(status_code=400, detail="No fields to update")
    await db.cleaners.update_one({'cleaner_id': cleaner_id}, {'$set': update_dict})
    cleaner = await db.cleaners.find_one({'cleaner_id': cleaner_id}, {'_id': 0})
    return cleaner

@api_router.get("/cleaners/{cleaner_id}/earnings")
async def get_cleaner_earnings(cleaner_id: str):
    cleaner = await db.cleaners.find_one({'cleaner_id': cleaner_id}, {'_id': 0})
    if not cleaner:
        raise HTTPException(status_code=404, detail="Cleaner not found")
    
    completed = await db.bookings.find(
        {'cleaner_id': cleaner_id, 'status': 'completed'}, {'_id': 0}
    ).to_list(1000)
    
    total_earnings = sum(b.get('worker_amount', b['service_price']) for b in completed)
    
    return {
        'cleaner_id': cleaner_id,
        'total_jobs': cleaner['total_jobs'],
        'total_earnings': total_earnings,
        'rating': cleaner['rating'],
        'total_ratings': cleaner['total_ratings'],
        'recent_bookings': completed[-10:]
    }

# ==================== Washing Centre Routes ====================

@api_router.post("/centres")
async def create_centre(data: WashingCentreCreate):
    centre_id = str(uuid.uuid4())
    centre = WashingCentre(
        centre_id=centre_id, user_id=data.user_id,
        name=data.name, phone=data.phone, address=data.address,
        latitude=data.latitude, longitude=data.longitude,
        photos_base64=data.photos_base64, total_bays=data.total_bays,
        services_offered=data.services_offered
    )
    await db.washing_centres.insert_one(centre.dict())
    return centre.dict()

@api_router.get("/centres/nearby")
async def get_nearby_centres(latitude: float, longitude: float):
    centres = await db.washing_centres.find(
        {'available': True, 'approved': True}, {'_id': 0}
    ).to_list(100)
    return centres

@api_router.get("/centres/{centre_id}")
async def get_centre(centre_id: str):
    centre = await db.washing_centres.find_one({'centre_id': centre_id}, {'_id': 0})
    if not centre:
        raise HTTPException(status_code=404, detail="Centre not found")
    return centre

@api_router.get("/centres/user/{user_id}")
async def get_centre_by_user_id(user_id: str):
    centre = await db.washing_centres.find_one({'user_id': user_id}, {'_id': 0})
    if not centre:
        raise HTTPException(status_code=404, detail="Centre not found")
    return centre

@api_router.patch("/centres/{centre_id}")
async def update_centre(centre_id: str, data: WashingCentreUpdate):
    update_dict = {k: v for k, v in data.dict().items() if v is not None}
    if not update_dict:
        raise HTTPException(status_code=400, detail="No fields to update")
    await db.washing_centres.update_one({'centre_id': centre_id}, {'$set': update_dict})
    centre = await db.washing_centres.find_one({'centre_id': centre_id}, {'_id': 0})
    return centre

@api_router.get("/centres/{centre_id}/earnings")
async def get_centre_earnings(centre_id: str):
    centre = await db.washing_centres.find_one({'centre_id': centre_id}, {'_id': 0})
    if not centre:
        raise HTTPException(status_code=404, detail="Centre not found")
    
    completed = await db.bookings.find(
        {'centre_id': centre_id, 'status': 'completed'}, {'_id': 0}
    ).to_list(1000)
    
    total_earnings = sum(b.get('worker_amount', b['service_price']) for b in completed)
    return {
        'centre_id': centre_id,
        'total_jobs': centre['total_jobs'],
        'total_earnings': total_earnings,
        'rating': centre['rating'],
        'recent_bookings': completed[-10:]
    }

# ==================== Booking Routes ====================

@api_router.post("/bookings")
async def create_booking(booking_data: BookingCreate):
    booking_id = str(uuid.uuid4())
    
    service = await db.services.find_one({'service_id': booking_data.service_id})
    if not service:
        raise HTTPException(status_code=404, detail="Service not found")
    
    # Calculate commission
    split = calculate_commission(service['price'])
    
    booking = Booking(
        booking_id=booking_id,
        customer_id=booking_data.customer_id,
        customer_name=booking_data.customer_name,
        customer_phone=booking_data.customer_phone,
        service_id=booking_data.service_id,
        service_name=service['name'],
        service_price=service['price'],
        booking_type=booking_data.booking_type,
        latitude=booking_data.latitude,
        longitude=booking_data.longitude,
        address=booking_data.address,
        payment_method=booking_data.payment_method,
        centre_id=booking_data.centre_id,
        time_slot=booking_data.time_slot,
        commission_amount=split['commission'],
        worker_amount=split['worker_amount'],
        status=BookingStatus.PENDING
    )
    
    await db.bookings.insert_one(booking.dict())
    
    # Notify based on booking type
    if booking_data.booking_type == BookingType.VISIT_CENTRE and booking_data.centre_id:
        await notify_centre(booking_data.centre_id, 'new_booking_request', booking.dict())
    else:
        await notify_nearby_cleaners(booking.dict())
    
    return booking.dict()

@api_router.get("/bookings/{booking_id}")
async def get_booking(booking_id: str):
    booking = await db.bookings.find_one({'booking_id': booking_id}, {'_id': 0})
    if not booking:
        raise HTTPException(status_code=404, detail="Booking not found")
    return booking

@api_router.get("/bookings/customer/{customer_id}")
async def get_customer_bookings(customer_id: str):
    bookings = await db.bookings.find(
        {'customer_id': customer_id}, {'_id': 0}
    ).sort('created_at', -1).to_list(100)
    return bookings

@api_router.get("/bookings/cleaner/{cleaner_id}")
async def get_cleaner_bookings(cleaner_id: str):
    bookings = await db.bookings.find(
        {'cleaner_id': cleaner_id}, {'_id': 0}
    ).sort('created_at', -1).to_list(100)
    return bookings

@api_router.get("/bookings/cleaner/{cleaner_id}/pending")
async def get_pending_bookings_for_cleaner(cleaner_id: str):
    bookings = await db.bookings.find(
        {'status': 'pending', 'booking_type': 'home_service'}, {'_id': 0}
    ).sort('created_at', -1).to_list(100)
    return bookings

@api_router.get("/bookings/centre/{centre_id}/pending")
async def get_pending_bookings_for_centre(centre_id: str):
    bookings = await db.bookings.find(
        {'centre_id': centre_id, 'status': 'pending'}, {'_id': 0}
    ).sort('created_at', -1).to_list(100)
    return bookings

@api_router.patch("/bookings/{booking_id}/accept")
async def accept_booking(booking_id: str, cleaner_id: Optional[str] = None, centre_id: Optional[str] = None):
    booking = await db.bookings.find_one({'booking_id': booking_id})
    if not booking:
        raise HTTPException(status_code=404, detail="Booking not found")
    if booking['status'] != 'pending':
        raise HTTPException(status_code=400, detail="Booking is not pending")
    
    update = {'status': 'accepted', 'accepted_at': datetime.utcnow()}
    
    if cleaner_id:
        cleaner = await db.cleaners.find_one({'cleaner_id': cleaner_id})
        if cleaner:
            update['cleaner_id'] = cleaner_id
            update['cleaner_name'] = cleaner['name']
            update['cleaner_phone'] = cleaner['phone']
    
    if centre_id:
        centre = await db.washing_centres.find_one({'centre_id': centre_id})
        if centre:
            update['centre_id'] = centre_id
            update['centre_name'] = centre['name']
    
    await db.bookings.update_one({'booking_id': booking_id}, {'$set': update})
    
    # Notify customer
    await notify_customer(booking['customer_id'], 'booking_accepted', {
        'booking_id': booking_id,
        'cleaner_name': update.get('cleaner_name', ''),
        'cleaner_phone': update.get('cleaner_phone', '')
    })
    
    updated = await db.bookings.find_one({'booking_id': booking_id}, {'_id': 0})
    return updated

@api_router.patch("/bookings/{booking_id}/reject")
async def reject_booking(booking_id: str, cleaner_id: Optional[str] = None):
    logger.info(f"Booking {booking_id} rejected by {cleaner_id}")
    return {"message": "Booking rejected"}

@api_router.patch("/bookings/{booking_id}/start")
async def start_booking(booking_id: str):
    await db.bookings.update_one(
        {'booking_id': booking_id},
        {'$set': {'status': 'in_progress'}}
    )
    booking = await db.bookings.find_one({'booking_id': booking_id}, {'_id': 0})
    await notify_customer(booking['customer_id'], 'booking_started', {'booking_id': booking_id})
    return booking

@api_router.patch("/bookings/{booking_id}/complete")
async def complete_booking(booking_id: str):
    booking = await db.bookings.find_one({'booking_id': booking_id})
    if not booking:
        raise HTTPException(status_code=404, detail="Booking not found")
    
    await db.bookings.update_one(
        {'booking_id': booking_id},
        {'$set': {'status': 'completed', 'completed_at': datetime.utcnow(), 'payment_status': 'completed'}}
    )
    
    # Update cleaner/centre stats
    if booking.get('cleaner_id'):
        await db.cleaners.update_one(
            {'cleaner_id': booking['cleaner_id']},
            {'$inc': {'total_jobs': 1, 'earnings': booking.get('worker_amount', booking['service_price'])}}
        )
    if booking.get('centre_id'):
        await db.washing_centres.update_one(
            {'centre_id': booking['centre_id']},
            {'$inc': {'total_jobs': 1, 'earnings': booking.get('worker_amount', booking['service_price'])}}
        )
    
    await notify_customer(booking['customer_id'], 'booking_completed', {'booking_id': booking_id})
    updated = await db.bookings.find_one({'booking_id': booking_id}, {'_id': 0})
    return updated

# ==================== Razorpay Payment Routes ====================

@api_router.post("/payments/create-order")
async def create_razorpay_order(data: RazorpayOrderCreate):
    """Create Razorpay order for a booking"""
    booking = await db.bookings.find_one({'booking_id': data.booking_id})
    if not booking:
        raise HTTPException(status_code=404, detail="Booking not found")
    
    amount_paise = booking['service_price'] * 100  # Convert to paise
    
    try:
        order = razorpay_client.order.create({
            'amount': amount_paise,
            'currency': 'INR',
            'receipt': f'wash_{data.booking_id[:20]}',
            'payment_capture': 1,
            'notes': {
                'booking_id': data.booking_id,
                'service': booking['service_name'],
                'commission': str(booking.get('commission_amount', 0))
            }
        })
        
        # Update booking with order_id
        await db.bookings.update_one(
            {'booking_id': data.booking_id},
            {'$set': {'razorpay_order_id': order['id'], 'payment_status': 'created'}}
        )
        
        return {
            'order_id': order['id'],
            'amount': amount_paise,
            'currency': 'INR',
            'key_id': razorpay_key_id,
            'booking_id': data.booking_id,
            'service_name': booking['service_name']
        }
    except Exception as e:
        logger.error(f"Razorpay order creation failed: {e}")
        raise HTTPException(status_code=500, detail=f"Payment order creation failed: {str(e)}")

@api_router.post("/payments/verify")
async def verify_razorpay_payment(data: RazorpayPaymentVerify):
    """Verify Razorpay payment signature"""
    try:
        # Verify signature
        msg = f"{data.razorpay_order_id}|{data.razorpay_payment_id}"
        generated_signature = hmac.new(
            razorpay_key_secret.encode('utf-8'),
            msg.encode('utf-8'),
            hashlib.sha256
        ).hexdigest()
        
        if generated_signature != data.razorpay_signature:
            raise HTTPException(status_code=400, detail="Payment verification failed")
        
        # Update booking
        await db.bookings.update_one(
            {'booking_id': data.booking_id},
            {'$set': {
                'razorpay_payment_id': data.razorpay_payment_id,
                'payment_status': 'paid'
            }}
        )
        
        return {"status": "success", "message": "Payment verified successfully"}
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Payment verification failed: {e}")
        raise HTTPException(status_code=500, detail="Payment verification error")

@api_router.post("/payments/webhook")
async def razorpay_webhook(request: Request):
    """Handle Razorpay webhook events"""
    try:
        payload = await request.json()
        event = payload.get('event', '')
        
        if event == 'payment.captured':
            payment = payload['payload']['payment']['entity']
            order_id = payment.get('order_id')
            payment_id = payment.get('id')
            
            booking = await db.bookings.find_one({'razorpay_order_id': order_id})
            if booking:
                await db.bookings.update_one(
                    {'razorpay_order_id': order_id},
                    {'$set': {'razorpay_payment_id': payment_id, 'payment_status': 'paid'}}
                )
                logger.info(f"Payment captured for booking: {booking['booking_id']}")
        
        return {"status": "ok"}
    except Exception as e:
        logger.error(f"Webhook error: {e}")
        return {"status": "error"}

# ==================== Rating Routes ====================

@api_router.post("/ratings")
async def create_rating(rating_data: RatingCreate):
    booking = await db.bookings.find_one({'booking_id': rating_data.booking_id})
    if not booking or booking['status'] != 'completed':
        raise HTTPException(status_code=400, detail="Can only rate completed bookings")
    
    existing = await db.ratings.find_one({'booking_id': rating_data.booking_id})
    if existing:
        raise HTTPException(status_code=400, detail="Already rated")
    
    rating_id = str(uuid.uuid4())
    rating = Rating(
        rating_id=rating_id, booking_id=rating_data.booking_id,
        customer_id=rating_data.customer_id,
        cleaner_id=rating_data.cleaner_id, centre_id=rating_data.centre_id,
        stars=rating_data.stars, comment=rating_data.comment
    )
    await db.ratings.insert_one(rating.dict())
    
    # Update cleaner/centre rating
    target_collection = None
    target_id_field = None
    target_id = None
    
    if rating_data.cleaner_id:
        target_collection = db.cleaners
        target_id_field = 'cleaner_id'
        target_id = rating_data.cleaner_id
    elif rating_data.centre_id:
        target_collection = db.washing_centres
        target_id_field = 'centre_id'
        target_id = rating_data.centre_id
    
    if target_collection and target_id:
        target = await target_collection.find_one({target_id_field: target_id})
        if target:
            total_ratings = target['total_ratings'] + 1
            new_rating = ((target['rating'] * target['total_ratings']) + rating_data.stars) / total_ratings
            await target_collection.update_one(
                {target_id_field: target_id},
                {'$set': {'rating': round(new_rating, 2), 'total_ratings': total_ratings}}
            )
    
    return rating.dict()

@api_router.get("/ratings/cleaner/{cleaner_id}")
async def get_cleaner_ratings(cleaner_id: str):
    ratings = await db.ratings.find({'cleaner_id': cleaner_id}, {'_id': 0}).sort('created_at', -1).to_list(100)
    return ratings

# ==================== Google Maps Proxy ====================

@api_router.get("/maps/config")
async def get_maps_config():
    """Return Google Maps API key for frontend"""
    return {"api_key": os.environ.get('GOOGLE_MAPS_API_KEY', '')}

# ==================== Health Check ====================

@api_router.get("/")
async def root():
    return {"message": "Washingo API", "status": "running", "version": "2.0"}

@api_router.get("/health")
async def health_check():
    return {"status": "healthy", "timestamp": datetime.utcnow().isoformat()}

# Include router
app.include_router(api_router)

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
