import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert, ActivityIndicator } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { bookingAPI, paymentAPI } from '../../services/api';
import { useAuthStore } from '../../store/authStore';
import socketService from '../../services/socket';

export default function PaymentScreen() {
  const router = useRouter();
  const { booking_id } = useLocalSearchParams();
  const { user } = useAuthStore();
  const [booking, setBooking] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [payLoading, setPayLoading] = useState(false);

  useEffect(() => {
    loadBooking();
    // Listen for payment required event
    socketService.connect();
    socketService.on('payment_required', (data: any) => {
      if (data.booking_id === booking_id) loadBooking();
    });
    socketService.on('payment_confirmed', (data: any) => {
      if (data.booking_id === booking_id) {
        Alert.alert('Payment Confirmed!', `₹${data.amount} paid via ${data.method === 'cash' ? 'Cash' : 'UPI/GPay'}`, [
          { text: 'Rate Service', onPress: () => router.replace({ pathname: '/customer/rate', params: { booking_id: booking_id as string } }) }
        ]);
      }
    });
    return () => {
      socketService.off('payment_required');
      socketService.off('payment_confirmed');
    };
  }, []);

  const loadBooking = async () => {
    try {
      const res = await bookingAPI.getBooking(booking_id as string);
      setBooking(res.data);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  };

  const handlePayOnline = async () => {
    setPayLoading(true);
    try {
      // Create Razorpay order
      const orderRes = await paymentAPI.createOrder(booking_id as string);
      const order = orderRes.data;

      // In a real app, this would open Razorpay checkout
      // For now, simulate successful payment
      Alert.alert(
        'Razorpay Payment',
        `Order: ${order.order_id}\nAmount: ₹${order.amount / 100}\n\nIn production, Razorpay checkout opens here. Simulating success...`,
        [
          {
            text: 'Simulate Success',
            onPress: async () => {
              try {
                await bookingAPI.payOnlineComplete(booking_id as string);
                Alert.alert('Payment Successful!', '₹' + booking.service_price + ' paid via UPI/GPay', [
                  { text: 'Rate Service', onPress: () => router.replace({ pathname: '/customer/rate', params: { booking_id: booking_id as string } }) }
                ]);
              } catch (e: any) {
                Alert.alert('Error', e.response?.data?.detail || 'Payment failed');
              }
            }
          },
          { text: 'Cancel', style: 'cancel' }
        ]
      );
    } catch (e: any) {
      Alert.alert('Error', e.response?.data?.detail || 'Failed to create payment');
    } finally {
      setPayLoading(false);
    }
  };

  const handlePayCash = () => {
    Alert.alert(
      'Cash Payment',
      `Please pay ₹${booking?.service_price} cash to the worker. They will confirm receipt in their app.`,
      [{ text: 'OK' }]
    );
  };

  if (loading) return <View style={styles.center}><ActivityIndicator size="large" color="#1565C0" /></View>;
  if (!booking) return <View style={styles.center}><Text style={{ color: '#888' }}>Booking not found</Text></View>;

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Complete Payment</Text>
      </View>

      <View style={styles.content}>
        {/* Bill Summary */}
        <View style={styles.billCard}>
          <Text style={styles.billTitle}>Bill Summary</Text>
          <View style={styles.billRow}>
            <Text style={styles.billLabel}>{booking.service_name}</Text>
            <Text style={styles.billValue}>₹{booking.service_price}</Text>
          </View>
          <View style={styles.billDivider} />
          <View style={styles.billRow}>
            <Text style={styles.billTotalLabel}>Total</Text>
            <Text style={styles.billTotal}>₹{booking.service_price}</Text>
          </View>
        </View>

        {booking.status === 'awaiting_payment' ? (
          <>
            <Text style={styles.chooseTitle}>Choose Payment Method</Text>

            {/* UPI / GPay */}
            <TouchableOpacity testID="pay-online-btn" style={styles.payOption} onPress={handlePayOnline} disabled={payLoading}>
              <View style={[styles.payIcon, { backgroundColor: '#E3F2FD' }]}>
                <Text style={styles.payIconText}>G</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.payTitle}>UPI / Google Pay</Text>
                <Text style={styles.payDesc}>Pay instantly via UPI</Text>
              </View>
              <Ionicons name="chevron-forward" size={24} color="#1565C0" />
            </TouchableOpacity>

            {/* Cash */}
            <TouchableOpacity testID="pay-cash-btn" style={styles.payOption} onPress={handlePayCash}>
              <View style={[styles.payIcon, { backgroundColor: '#E8F5E9' }]}>
                <Ionicons name="cash" size={24} color="#2E7D32" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.payTitle}>Pay by Cash</Text>
                <Text style={styles.payDesc}>Pay cash directly to worker</Text>
              </View>
              <Ionicons name="chevron-forward" size={24} color="#2E7D32" />
            </TouchableOpacity>

            <View style={styles.secureInfo}>
              <Ionicons name="lock-closed" size={16} color="#1565C0" />
              <Text style={styles.secureText}>Payments secured by Razorpay. 85% goes directly to the worker.</Text>
            </View>
          </>
        ) : booking.status === 'completed' ? (
          <View style={styles.completedCard}>
            <Ionicons name="checkmark-circle" size={48} color="#2E7D32" />
            <Text style={styles.completedTitle}>Payment Done!</Text>
            <Text style={styles.completedDesc}>₹{booking.service_price} paid via {booking.payment_method === 'cash' ? 'Cash' : 'UPI/GPay'}</Text>
            <TouchableOpacity
              style={styles.rateBtn}
              onPress={() => router.replace({ pathname: '/customer/rate', params: { booking_id: booking_id as string } })}
            >
              <Ionicons name="star" size={20} color="#FFFFFF" />
              <Text style={styles.rateBtnText}>Rate Service</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View style={styles.waitingCard}>
            <Ionicons name="time" size={32} color="#F9A825" />
            <Text style={styles.waitingTitle}>Service in progress</Text>
            <Text style={styles.waitingDesc}>Payment will be unlocked after the service is complete</Text>
          </View>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F5F7FA' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  header: { backgroundColor: '#1565C0', paddingTop: 56, paddingBottom: 20, paddingHorizontal: 24, alignItems: 'center' },
  headerTitle: { fontSize: 22, fontWeight: 'bold', color: '#FFFFFF' },
  content: { flex: 1, paddingHorizontal: 20, paddingTop: 20 },
  billCard: { backgroundColor: '#FFFFFF', borderRadius: 16, padding: 20, marginBottom: 24, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 4, elevation: 2 },
  billTitle: { fontSize: 16, fontWeight: 'bold', color: '#1a1a1a', marginBottom: 12 },
  billRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 8 },
  billLabel: { fontSize: 15, color: '#666' },
  billValue: { fontSize: 15, fontWeight: '600', color: '#1a1a1a' },
  billDivider: { height: 1, backgroundColor: '#E0E0E0', marginVertical: 8 },
  billTotalLabel: { fontSize: 17, fontWeight: 'bold', color: '#1a1a1a' },
  billTotal: { fontSize: 22, fontWeight: 'bold', color: '#1565C0' },
  chooseTitle: { fontSize: 18, fontWeight: 'bold', color: '#1a1a1a', marginBottom: 14 },
  payOption: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFFFFF', borderRadius: 14, padding: 16, marginBottom: 12, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 4, elevation: 2 },
  payIcon: { width: 48, height: 48, borderRadius: 14, alignItems: 'center', justifyContent: 'center', marginRight: 14 },
  payIconText: { fontSize: 22, fontWeight: 'bold', color: '#4285F4' },
  payTitle: { fontSize: 16, fontWeight: 'bold', color: '#1a1a1a' },
  payDesc: { fontSize: 13, color: '#888', marginTop: 2 },
  secureInfo: { flexDirection: 'row', alignItems: 'center', marginTop: 16, paddingHorizontal: 4 },
  secureText: { fontSize: 12, color: '#888', marginLeft: 8, flex: 1 },
  completedCard: { alignItems: 'center', backgroundColor: '#E8F5E9', borderRadius: 16, padding: 32 },
  completedTitle: { fontSize: 22, fontWeight: 'bold', color: '#2E7D32', marginTop: 8 },
  completedDesc: { fontSize: 15, color: '#666', marginTop: 4 },
  rateBtn: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#F9A825', borderRadius: 12, paddingHorizontal: 24, paddingVertical: 14, marginTop: 20, gap: 8 },
  rateBtnText: { fontSize: 16, fontWeight: 'bold', color: '#FFFFFF' },
  waitingCard: { alignItems: 'center', backgroundColor: '#FFF8E1', borderRadius: 16, padding: 32 },
  waitingTitle: { fontSize: 18, fontWeight: 'bold', color: '#1a1a1a', marginTop: 8 },
  waitingDesc: { fontSize: 14, color: '#666', marginTop: 4, textAlign: 'center' },
});
