import axios from 'axios';

const API_URL = `${process.env.EXPO_PUBLIC_BACKEND_URL}/api`;

export const api = axios.create({
  baseURL: API_URL,
  headers: { 'Content-Type': 'application/json' },
});

// Auth APIs
export const authAPI = {
  register: (data: { phone: string; name: string; role: string; firebase_uid: string }) =>
    api.post('/auth/register', data),
  loginOrRegister: (data: { phone: string; name: string; role: string; firebase_uid: string }) =>
    api.post('/auth/login-or-register', data),
  getUserByPhone: (phone: string) => api.get(`/auth/user/${phone}`),
  getUserByFirebaseUid: (uid: string) => api.get(`/auth/user/firebase/${uid}`),
};

// Service APIs
export const serviceAPI = {
  getServices: () => api.get('/services'),
  seedServices: () => api.post('/services/seed'),
};

// Cleaner APIs
export const cleanerAPI = {
  createCleaner: (data: any) => api.post('/cleaners', data),
  getNearbyCleaners: (lat: number, lon: number) =>
    api.get('/cleaners/nearby', { params: { latitude: lat, longitude: lon } }),
  getCleaner: (id: string) => api.get(`/cleaners/${id}`),
  getCleanerByUserId: (uid: string) => api.get(`/cleaners/user/${uid}`),
  updateCleaner: (id: string, data: any) => api.patch(`/cleaners/${id}`, data),
  getCleanerEarnings: (id: string) => api.get(`/cleaners/${id}/earnings`),
};

// Washing Centre APIs
export const centreAPI = {
  createCentre: (data: any) => api.post('/centres', data),
  getNearbyCentres: (lat: number, lon: number) =>
    api.get('/centres/nearby', { params: { latitude: lat, longitude: lon } }),
  getCentre: (id: string) => api.get(`/centres/${id}`),
  getCentreByUserId: (uid: string) => api.get(`/centres/user/${uid}`),
  updateCentre: (id: string, data: any) => api.patch(`/centres/${id}`, data),
  getCentreEarnings: (id: string) => api.get(`/centres/${id}/earnings`),
};

// Booking APIs
export const bookingAPI = {
  createBooking: (data: any) => api.post('/bookings', data),
  getBooking: (id: string) => api.get(`/bookings/${id}`),
  getCustomerBookings: (cid: string) => api.get(`/bookings/customer/${cid}`),
  getCleanerBookings: (cid: string) => api.get(`/bookings/cleaner/${cid}`),
  getPendingBookings: (cid: string) => api.get(`/bookings/cleaner/${cid}/pending`),
  getPendingCentreBookings: (cid: string) => api.get(`/bookings/centre/${cid}/pending`),
  acceptBooking: (bid: string, cleanerId?: string, centreId?: string) =>
    api.patch(`/bookings/${bid}/accept`, null, { params: { cleaner_id: cleanerId, centre_id: centreId } }),
  rejectBooking: (bid: string, cleanerId?: string) =>
    api.patch(`/bookings/${bid}/reject`, null, { params: { cleaner_id: cleanerId } }),
  startBooking: (bid: string) => api.patch(`/bookings/${bid}/start`),
  completeBooking: (bid: string) => api.patch(`/bookings/${bid}/complete`),
  verifyOtp: (bid: string, otp: string) =>
    api.patch(`/bookings/${bid}/verify-otp`, { booking_id: bid, otp }),
  payCash: (bid: string) => api.patch(`/bookings/${bid}/pay-cash`),
  payOnlineComplete: (bid: string) => api.patch(`/bookings/${bid}/pay-online-complete`),
};

// Payment APIs
export const paymentAPI = {
  createOrder: (bookingId: string) =>
    api.post('/payments/create-order', { booking_id: bookingId, amount: 0 }),
  verifyPayment: (data: any) => api.post('/payments/verify', data),
};

// Rating APIs
export const ratingAPI = {
  createRating: (data: any) => api.post('/ratings', data),
  getCleanerRatings: (id: string) => api.get(`/ratings/cleaner/${id}`),
};

// Admin APIs
export const adminAPI = {
  login: (email: string, password: string) =>
    api.post('/admin/login', { email, password }),
  getDashboard: () => api.get('/admin/dashboard'),
  getUsers: (role?: string) => api.get('/admin/users', { params: { role } }),
  getBookings: (status?: string) => api.get('/admin/bookings', { params: { status } }),
  approveCentre: (id: string) => api.patch(`/admin/centres/${id}/approve`),
  blockUser: (id: string) => api.delete(`/admin/users/${id}`),
};

// Maps config
export const mapsAPI = {
  getConfig: () => api.get('/maps/config'),
};
