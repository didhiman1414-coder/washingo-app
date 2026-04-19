from pydantic import BaseModel, Field
from typing import Optional, List
from datetime import datetime
from enum import Enum

class UserRole(str, Enum):
    CUSTOMER = "customer"
    CLEANER = "cleaner"
    CENTRE = "centre"
    ADMIN = "admin"

class BookingStatus(str, Enum):
    PENDING = "pending"
    ACCEPTED = "accepted"
    REJECTED = "rejected"
    IN_PROGRESS = "in_progress"
    COMPLETED = "completed"
    CANCELLED = "cancelled"

class BookingType(str, Enum):
    HOME_SERVICE = "home_service"
    VISIT_CENTRE = "visit_centre"

class PaymentMethod(str, Enum):
    CASH = "cash"
    GPAY = "gpay"
    UPI = "upi"
    CARD = "card"
    RAZORPAY = "razorpay"

class PaymentStatus(str, Enum):
    PENDING = "pending"
    CREATED = "created"
    PAID = "paid"
    FAILED = "failed"
    REFUNDED = "refunded"

# User Model
class User(BaseModel):
    user_id: str
    phone: str
    name: str
    role: UserRole
    created_at: datetime = Field(default_factory=datetime.utcnow)
    firebase_uid: Optional[str] = None

class UserCreate(BaseModel):
    phone: str
    name: str
    role: UserRole
    firebase_uid: str

# Cleaner Model
class Cleaner(BaseModel):
    cleaner_id: str
    user_id: str
    name: str
    phone: str
    photo_base64: Optional[str] = None
    area: str
    latitude: float
    longitude: float
    available: bool = True
    total_jobs: int = 0
    rating: float = 0.0
    total_ratings: int = 0
    earnings: float = 0.0
    created_at: datetime = Field(default_factory=datetime.utcnow)

class CleanerCreate(BaseModel):
    user_id: str
    name: str
    phone: str
    photo_base64: Optional[str] = None
    area: str
    latitude: float
    longitude: float

class CleanerUpdate(BaseModel):
    photo_base64: Optional[str] = None
    area: Optional[str] = None
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    available: Optional[bool] = None

# Washing Centre Model
class WashingCentre(BaseModel):
    centre_id: str
    user_id: str
    name: str
    phone: str
    address: str
    latitude: float
    longitude: float
    photos_base64: List[str] = []
    total_bays: int = 1
    occupied_bays: int = 0
    services_offered: List[str] = []
    available: bool = True
    rating: float = 0.0
    total_ratings: int = 0
    total_jobs: int = 0
    earnings: float = 0.0
    approved: bool = False
    created_at: datetime = Field(default_factory=datetime.utcnow)

class WashingCentreCreate(BaseModel):
    user_id: str
    name: str
    phone: str
    address: str
    latitude: float
    longitude: float
    photos_base64: List[str] = []
    total_bays: int = 1
    services_offered: List[str] = []

class WashingCentreUpdate(BaseModel):
    name: Optional[str] = None
    address: Optional[str] = None
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    total_bays: Optional[int] = None
    occupied_bays: Optional[int] = None
    available: Optional[bool] = None
    services_offered: Optional[List[str]] = None

# Service Model
class Service(BaseModel):
    service_id: str
    name: str
    description: str
    price: int
    duration_minutes: int
    icon: str = ""
    booking_type: str = "both"

class ServiceCreate(BaseModel):
    name: str
    description: str
    price: int
    duration_minutes: int

# Booking Model
class Booking(BaseModel):
    booking_id: str
    customer_id: str
    customer_name: str
    customer_phone: str
    cleaner_id: Optional[str] = None
    cleaner_name: Optional[str] = None
    cleaner_phone: Optional[str] = None
    centre_id: Optional[str] = None
    centre_name: Optional[str] = None
    service_id: str
    service_name: str
    service_price: int
    booking_type: BookingType = BookingType.HOME_SERVICE
    status: BookingStatus = BookingStatus.PENDING
    payment_method: Optional[PaymentMethod] = None
    payment_status: str = "pending"
    razorpay_order_id: Optional[str] = None
    razorpay_payment_id: Optional[str] = None
    commission_amount: float = 0.0
    worker_amount: float = 0.0
    latitude: float
    longitude: float
    address: str
    time_slot: Optional[str] = None
    created_at: datetime = Field(default_factory=datetime.utcnow)
    accepted_at: Optional[datetime] = None
    completed_at: Optional[datetime] = None

class BookingCreate(BaseModel):
    customer_id: str
    customer_name: str
    customer_phone: str
    service_id: str
    booking_type: BookingType = BookingType.HOME_SERVICE
    latitude: float
    longitude: float
    address: str
    payment_method: PaymentMethod
    centre_id: Optional[str] = None
    time_slot: Optional[str] = None

# Rating Model
class Rating(BaseModel):
    rating_id: str
    booking_id: str
    customer_id: str
    cleaner_id: Optional[str] = None
    centre_id: Optional[str] = None
    stars: int = Field(ge=1, le=5)
    comment: Optional[str] = None
    created_at: datetime = Field(default_factory=datetime.utcnow)

class RatingCreate(BaseModel):
    booking_id: str
    customer_id: str
    cleaner_id: Optional[str] = None
    centre_id: Optional[str] = None
    stars: int = Field(ge=1, le=5)
    comment: Optional[str] = None

# Location Update Model
class LocationUpdate(BaseModel):
    cleaner_id: str
    latitude: float
    longitude: float

# Razorpay Models
class RazorpayOrderCreate(BaseModel):
    booking_id: str
    amount: int

class RazorpayPaymentVerify(BaseModel):
    razorpay_order_id: str
    razorpay_payment_id: str
    razorpay_signature: str
    booking_id: str

# Admin Models
class AdminLogin(BaseModel):
    email: str
    password: str
