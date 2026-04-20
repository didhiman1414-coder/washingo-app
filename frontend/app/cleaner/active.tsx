import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, TextInput, Alert, ActivityIndicator } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { bookingAPI } from '../../services/api';
import { useAuthStore } from '../../store/authStore';
import { cleanerAPI } from '../../services/api';

export default function ActiveJob() {
  const router = useRouter();
  const { booking_id } = useLocalSearchParams();
  const { user } = useAuthStore();
  const [booking, setBooking] = useState<any>(null);
  const [cleaner, setCleaner] = useState<any>(null);
  const [otp, setOtp] = useState('');
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);

  useEffect(() => {
    loadData();
    const interval = setInterval(loadBooking, 5000);
    return () => clearInterval(interval);
  }, []);

  const loadData = async () => {
    try {
      const cleanerRes = await cleanerAPI.getCleanerByUserId(user?.user_id || '');
      setCleaner(cleanerRes.data);
      await loadBooking();
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const loadBooking = async () => {
    if (!booking_id) return;
    try {
      const res = await bookingAPI.getBooking(booking_id as string);
      setBooking(res.data);
    } catch (e) { console.error(e); }
  };

  const handleStartJob = async () => {
    setActionLoading(true);
    try {
      await bookingAPI.startBooking(booking_id as string);
      await loadBooking();
    } catch (e: any) {
      Alert.alert('Error', e.response?.data?.detail || 'Failed');
    } finally {
      setActionLoading(false);
    }
  };

  const handleJobComplete = async () => {
    setActionLoading(true);
    try {
      await bookingAPI.completeBooking(booking_id as string);
      Alert.alert('OTP Sent', 'A 4-digit OTP has been sent to the customer. Ask them for the OTP.');
      await loadBooking();
    } catch (e: any) {
      Alert.alert('Error', e.response?.data?.detail || 'Failed');
    } finally {
      setActionLoading(false);
    }
  };

  const handleVerifyOTP = async () => {
    if (otp.length !== 4) {
      Alert.alert('Error', 'Enter 4-digit OTP from customer');
      return;
    }
    setActionLoading(true);
    try {
      const res = await bookingAPI.verifyOtp(booking_id as string, otp);
      if (res.data.status === 'awaiting_payment') {
        Alert.alert('Verified!', 'Job confirmed. Customer will now complete payment.');
      }
      await loadBooking();
    } catch (e: any) {
      Alert.alert('Invalid OTP', e.response?.data?.detail || 'Wrong OTP. Ask customer again.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleCashReceived = async () => {
    setActionLoading(true);
    try {
      await bookingAPI.payCash(booking_id as string);
      Alert.alert('Done!', 'Cash payment recorded. Job complete!', [
        { text: 'OK', onPress: () => router.replace('/cleaner/dashboard') }
      ]);
    } catch (e: any) {
      Alert.alert('Error', e.response?.data?.detail || 'Failed');
    } finally {
      setActionLoading(false);
    }
  };

  if (loading) return <View style={styles.center}><ActivityIndicator size="large" color="#1565C0" /></View>;
  if (!booking) return <View style={styles.center}><Text style={styles.errorText}>Booking not found</Text></View>;

  const status = booking.status;

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color="#FFFFFF" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Active Job</Text>
        <View style={{ width: 24 }} />
      </View>

      <View style={styles.content}>
        {/* Booking Info Card */}
        <View style={styles.card}>
          <View style={styles.cardRow}>
            <Text style={styles.cardLabel}>Service</Text>
            <Text style={styles.cardValue}>{booking.service_name}</Text>
          </View>
          <View style={styles.cardRow}>
            <Text style={styles.cardLabel}>Customer</Text>
            <Text style={styles.cardValue}>{booking.customer_name}</Text>
          </View>
          <View style={styles.cardRow}>
            <Text style={styles.cardLabel}>Address</Text>
            <Text style={styles.cardValue} numberOfLines={2}>{booking.address}</Text>
          </View>
          <View style={styles.cardRow}>
            <Text style={styles.cardLabel}>Amount</Text>
            <Text style={[styles.cardValue, styles.priceText]}>₹{booking.service_price}</Text>
          </View>
          <View style={styles.cardRow}>
            <Text style={styles.cardLabel}>Your Earnings</Text>
            <Text style={[styles.cardValue, { color: '#2E7D32', fontWeight: 'bold' }]}>₹{booking.worker_amount}</Text>
          </View>
        </View>

        {/* Status Badge */}
        <View style={[styles.statusBadge, { backgroundColor: getStatusColor(status) }]}>
          <Ionicons name={getStatusIcon(status)} size={20} color="#FFFFFF" />
          <Text style={styles.statusText}>{getStatusLabel(status)}</Text>
        </View>

        {/* Action Area */}
        {status === 'accepted' && (
          <TouchableOpacity
            testID="start-job-btn"
            style={styles.actionBtn}
            onPress={handleStartJob}
            disabled={actionLoading}
          >
            <Ionicons name="play-circle" size={24} color="#FFFFFF" />
            <Text style={styles.actionBtnText}>{actionLoading ? 'Starting...' : 'Start Job'}</Text>
          </TouchableOpacity>
        )}

        {status === 'in_progress' && (
          <TouchableOpacity
            testID="job-complete-btn"
            style={[styles.actionBtn, { backgroundColor: '#2E7D32' }]}
            onPress={handleJobComplete}
            disabled={actionLoading}
          >
            <Ionicons name="checkmark-circle" size={24} color="#FFFFFF" />
            <Text style={styles.actionBtnText}>{actionLoading ? 'Sending OTP...' : 'Job Complete'}</Text>
          </TouchableOpacity>
        )}

        {status === 'awaiting_otp' && (
          <View style={styles.otpSection}>
            <Text style={styles.otpTitle}>Enter Customer's OTP</Text>
            <Text style={styles.otpDesc}>Ask the customer for the 4-digit OTP sent to their phone</Text>
            <TextInput
              testID="otp-input"
              style={styles.otpInput}
              placeholder="Enter 4-digit OTP"
              value={otp}
              onChangeText={setOtp}
              keyboardType="number-pad"
              maxLength={4}
            />
            <TouchableOpacity
              testID="verify-otp-btn"
              style={styles.actionBtn}
              onPress={handleVerifyOTP}
              disabled={actionLoading}
            >
              <Ionicons name="shield-checkmark" size={24} color="#FFFFFF" />
              <Text style={styles.actionBtnText}>{actionLoading ? 'Verifying...' : 'Verify OTP'}</Text>
            </TouchableOpacity>
          </View>
        )}

        {status === 'awaiting_payment' && (
          <View style={styles.paymentSection}>
            <View style={styles.waitingCard}>
              <Ionicons name="time" size={32} color="#F9A825" />
              <Text style={styles.waitingTitle}>Waiting for Payment</Text>
              <Text style={styles.waitingDesc}>Customer is completing the payment...</Text>
            </View>
            <TouchableOpacity
              testID="cash-received-btn"
              style={[styles.actionBtn, { backgroundColor: '#2E7D32' }]}
              onPress={handleCashReceived}
              disabled={actionLoading}
            >
              <Ionicons name="cash" size={24} color="#FFFFFF" />
              <Text style={styles.actionBtnText}>{actionLoading ? 'Recording...' : 'Cash Received'}</Text>
            </TouchableOpacity>
          </View>
        )}

        {status === 'completed' && (
          <View style={styles.completedCard}>
            <Ionicons name="checkmark-circle" size={48} color="#2E7D32" />
            <Text style={styles.completedTitle}>Job Complete!</Text>
            <Text style={styles.completedDesc}>Payment: {booking.payment_method === 'cash' ? 'Cash' : 'Online'}</Text>
            <TouchableOpacity
              style={[styles.actionBtn, { marginTop: 16 }]}
              onPress={() => router.replace('/cleaner/dashboard')}
            >
              <Text style={styles.actionBtnText}>Back to Dashboard</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>
    </View>
  );
}

const getStatusColor = (s: string) => {
  const map: Record<string, string> = { accepted: '#1565C0', in_progress: '#F9A825', awaiting_otp: '#6A1B9A', awaiting_payment: '#F9A825', completed: '#2E7D32' };
  return map[s] || '#888';
};
const getStatusIcon = (s: string): any => {
  const map: Record<string, string> = { accepted: 'checkmark', in_progress: 'construct', awaiting_otp: 'key', awaiting_payment: 'card', completed: 'checkmark-done' };
  return map[s] || 'help';
};
const getStatusLabel = (s: string) => {
  const map: Record<string, string> = { accepted: 'Accepted — Head to customer', in_progress: 'In Progress', awaiting_otp: 'Awaiting OTP from Customer', awaiting_payment: 'Awaiting Payment', completed: 'Completed' };
  return map[s] || s;
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F5F7FA' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  errorText: { fontSize: 16, color: '#888' },
  header: { backgroundColor: '#1565C0', paddingTop: 50, paddingBottom: 16, paddingHorizontal: 16, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  headerTitle: { fontSize: 20, fontWeight: 'bold', color: '#FFFFFF' },
  content: { flex: 1, paddingHorizontal: 20, paddingTop: 20 },
  card: { backgroundColor: '#FFFFFF', borderRadius: 16, padding: 20, marginBottom: 16, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 4, elevation: 2 },
  cardRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: '#F5F5F5' },
  cardLabel: { fontSize: 14, color: '#888' },
  cardValue: { fontSize: 15, fontWeight: '600', color: '#1a1a1a', flex: 1, textAlign: 'right', marginLeft: 12 },
  priceText: { color: '#1565C0', fontSize: 18, fontWeight: 'bold' },
  statusBadge: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', borderRadius: 12, padding: 14, marginBottom: 20, gap: 8 },
  statusText: { color: '#FFFFFF', fontSize: 15, fontWeight: 'bold' },
  actionBtn: { backgroundColor: '#1565C0', borderRadius: 12, height: 56, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, marginTop: 8 },
  actionBtnText: { color: '#FFFFFF', fontSize: 17, fontWeight: 'bold' },
  otpSection: { marginTop: 8 },
  otpTitle: { fontSize: 18, fontWeight: 'bold', color: '#1a1a1a', marginBottom: 8 },
  otpDesc: { fontSize: 14, color: '#666', marginBottom: 16 },
  otpInput: { borderWidth: 2, borderColor: '#1565C0', borderRadius: 12, paddingHorizontal: 16, height: 64, fontSize: 28, textAlign: 'center', letterSpacing: 12, fontWeight: 'bold', marginBottom: 16, backgroundColor: '#FFFFFF' },
  paymentSection: { marginTop: 8 },
  waitingCard: { alignItems: 'center', backgroundColor: '#FFF8E1', borderRadius: 16, padding: 24, marginBottom: 16 },
  waitingTitle: { fontSize: 18, fontWeight: 'bold', color: '#1a1a1a', marginTop: 8 },
  waitingDesc: { fontSize: 14, color: '#666', marginTop: 4 },
  completedCard: { alignItems: 'center', backgroundColor: '#E8F5E9', borderRadius: 16, padding: 24 },
  completedTitle: { fontSize: 22, fontWeight: 'bold', color: '#2E7D32', marginTop: 8 },
  completedDesc: { fontSize: 14, color: '#666', marginTop: 4 },
});
