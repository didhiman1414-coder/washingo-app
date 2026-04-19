import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Switch, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAuthStore } from '../../store/authStore';
import { cleanerAPI, bookingAPI } from '../../services/api';
import socketService from '../../services/socket';

export default function CleanerDashboard() {
  const router = useRouter();
  const { user } = useAuthStore();
  const [cleaner, setCleaner] = useState<any>(null);
  const [earnings, setEarnings] = useState<any>(null);
  const [pendingBookings, setPendingBookings] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [available, setAvailable] = useState(false);

  useEffect(() => {
    loadCleanerData();
    setupSocketListeners();
  }, []);

  const setupSocketListeners = () => {
    const socket = socketService.connect();
    
    socketService.on('new_booking_request', (data) => {
      console.log('New booking request:', data);
      loadPendingBookings();
    });

    return () => {
      socketService.off('new_booking_request');
    };
  };

  const loadCleanerData = async () => {
    try {
      // Get cleaner profile
      const cleanerResponse = await cleanerAPI.getCleanerByUserId(user?.user_id || '');
      setCleaner(cleanerResponse.data);
      setAvailable(cleanerResponse.data.available);

      // Get earnings
      const earningsResponse = await cleanerAPI.getCleanerEarnings(cleanerResponse.data.cleaner_id);
      setEarnings(earningsResponse.data);

      // Get pending bookings
      await loadPendingBookings(cleanerResponse.data.cleaner_id);
    } catch (error: any) {
      console.error('Error loading cleaner data:', error);
      if (error.response?.status === 404) {
        // Cleaner profile not found, redirect to setup
        router.replace('/cleaner/setup');
      }
    } finally {
      setLoading(false);
    }
  };

  const loadPendingBookings = async (cleanerId?: string) => {
    try {
      const id = cleanerId || cleaner?.cleaner_id;
      if (!id) return;
      
      const response = await bookingAPI.getPendingBookings(id);
      setPendingBookings(response.data);
    } catch (error) {
      console.error('Error loading pending bookings:', error);
    }
  };

  const handleToggleAvailability = async (value: boolean) => {
    try {
      await cleanerAPI.updateCleaner(cleaner.cleaner_id, { available: value });
      setAvailable(value);
      
      if (value) {
        socketService.emit('cleaner_online', { cleaner_id: cleaner.cleaner_id });
      }
    } catch (error) {
      console.error('Error updating availability:', error);
    }
  };

  const handleAcceptBooking = async (bookingId: string) => {
    try {
      await bookingAPI.acceptBooking(bookingId, cleaner.cleaner_id);
      alert('Booking accepted!');
      loadPendingBookings();
      router.push('/cleaner/active');
    } catch (error: any) {
      alert('Error accepting booking');
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#FF6B35" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.greeting}>Hello, {cleaner?.name}! 👋</Text>
          <View style={styles.badgeContainer}>
            <Ionicons name="checkmark-circle" size={16} color="#FFFFFF" />
            <Text style={styles.badge}>Verified CleanPro</Text>
          </View>
        </View>
      </View>

      {/* Availability Toggle */}
      <View style={styles.availabilityCard}>
        <View>
          <Text style={styles.availabilityTitle}>Availability Status</Text>
          <Text style={styles.availabilitySubtitle}>
            {available ? 'You\'re online and can receive bookings' : 'You\'re offline'}
          </Text>
        </View>
        <Switch
          value={available}
          onValueChange={handleToggleAvailability}
          trackColor={{ false: '#CCC', true: '#90CAF9' }}
          thumbColor={available ? '#1565C0' : '#F0F0F0'}
        />
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Earnings Summary */}
        <View style={styles.earningsCard}>
          <Text style={styles.cardTitle}>Today's Earnings</Text>
          <Text style={styles.earningsAmount}>₹{earnings?.total_earnings || 0}</Text>
          <View style={styles.statsRow}>
            <View style={styles.statBox}>
              <Text style={styles.statValue}>{earnings?.total_jobs || 0}</Text>
              <Text style={styles.statLabel}>Total Jobs</Text>
            </View>
            <View style={styles.divider} />
            <View style={styles.statBox}>
              <Text style={styles.statValue}>{cleaner?.rating.toFixed(1) || 0}</Text>
              <Text style={styles.statLabel}>Rating</Text>
            </View>
          </View>
        </View>

        {/* Pending Requests */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>New Booking Requests</Text>
          {pendingBookings.length === 0 ? (
            <View style={styles.emptyState}>
              <Ionicons name="calendar-outline" size={48} color="#CCC" />
              <Text style={styles.emptyText}>No pending requests</Text>
            </View>
          ) : (
            pendingBookings.map((booking) => (
              <View key={booking.booking_id} style={styles.bookingCard}>
                <View style={styles.bookingHeader}>
                  <Text style={styles.serviceName}>{booking.service_name}</Text>
                  <Text style={styles.bookingPrice}>₹{booking.service_price}</Text>
                </View>
                <View style={styles.bookingInfo}>
                  <Ionicons name="person" size={16} color="#666" />
                  <Text style={styles.infoText}>{booking.customer_name}</Text>
                </View>
                <View style={styles.bookingInfo}>
                  <Ionicons name="location" size={16} color="#666" />
                  <Text style={styles.infoText} numberOfLines={2}>{booking.address}</Text>
                </View>
                <View style={styles.buttonRow}>
                  <TouchableOpacity
                    style={[styles.actionButton, styles.rejectButton]}
                    onPress={() => bookingAPI.rejectBooking(booking.booking_id, cleaner.cleaner_id)}
                  >
                    <Text style={styles.rejectText}>Reject</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.actionButton, styles.acceptButton]}
                    onPress={() => handleAcceptBooking(booking.booking_id)}
                  >
                    <Text style={styles.acceptText}>Accept</Text>
                  </TouchableOpacity>
                </View>
              </View>
            ))
          )}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F9FA',
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F8F9FA',
  },
  header: {
    backgroundColor: '#1565C0',
    paddingTop: 60,
    paddingBottom: 24,
    paddingHorizontal: 24,
  },
  greeting: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 8,
  },
  badgeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  badge: {
    fontSize: 14,
    color: '#FFFFFF',
    marginLeft: 4,
    fontWeight: '600',
  },
  availabilityCard: {
    backgroundColor: '#FFFFFF',
    marginHorizontal: 24,
    marginTop: -12,
    marginBottom: 16,
    borderRadius: 16,
    padding: 20,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  availabilityTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1a1a1a',
    marginBottom: 4,
  },
  availabilitySubtitle: {
    fontSize: 14,
    color: '#666',
  },
  content: {
    flex: 1,
    paddingHorizontal: 24,
  },
  earningsCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 24,
    marginBottom: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  cardTitle: {
    fontSize: 16,
    color: '#666',
    marginBottom: 8,
  },
  earningsAmount: {
    fontSize: 40,
    fontWeight: 'bold',
    color: '#1565C0',
    marginBottom: 16,
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  statBox: {
    alignItems: 'center',
  },
  statValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1a1a1a',
  },
  statLabel: {
    fontSize: 14,
    color: '#666',
    marginTop: 4,
  },
  divider: {
    width: 1,
    backgroundColor: '#E0E0E0',
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1a1a1a',
    marginBottom: 16,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 48,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
  },
  emptyText: {
    fontSize: 16,
    color: '#999',
    marginTop: 12,
  },
  bookingCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 20,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  bookingHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  serviceName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1a1a1a',
  },
  bookingPrice: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1565C0',
  },
  bookingInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  infoText: {
    fontSize: 14,
    color: '#666',
    marginLeft: 8,
    flex: 1,
  },
  buttonRow: {
    flexDirection: 'row',
    marginTop: 16,
    gap: 12,
  },
  actionButton: {
    flex: 1,
    height: 44,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rejectButton: {
    backgroundColor: '#F0F0F0',
  },
  acceptButton: {
    backgroundColor: '#1565C0',
  },
  rejectText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#666',
  },
  acceptText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
});
