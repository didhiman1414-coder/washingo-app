import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, TextInput, Alert, ScrollView, KeyboardAvoidingView, Platform } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAuthStore } from '../../store/authStore';
import { bookingAPI } from '../../services/api';

export default function BookingScreen() {
  const router = useRouter();
  const { service_id, cleaner_id } = useLocalSearchParams();
  const { user } = useAuthStore();
  const [address, setAddress] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<'gpay' | 'cash'>('cash');
  const [loading, setLoading] = useState(false);

  // Mock location
  const mockLat = 12.9716;
  const mockLon = 77.5946;

  const handleConfirmBooking = async () => {
    if (!address || address.length < 10) {
      Alert.alert('Error', 'Please enter a valid address');
      return;
    }

    setLoading(true);
    try {
      const response = await bookingAPI.createBooking({
        customer_id: user?.user_id,
        customer_name: user?.name,
        customer_phone: user?.phone,
        service_id: service_id,
        latitude: mockLat,
        longitude: mockLon,
        address: address,
        payment_method: paymentMethod,
      });

      Alert.alert(
        'Success',
        'Booking created! Waiting for cleaner to accept.',
        [
          {
            text: 'OK',
            onPress: () => router.push('/customer/home')
          }
        ]
      );
    } catch (error: any) {
      Alert.alert('Error', error.response?.data?.detail || 'Failed to create booking');
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView 
      style={styles.container} 
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color="#FFFFFF" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Confirm Booking</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Address Input */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Service Location</Text>
          <View style={styles.inputContainer}>
            <Ionicons name="location" size={20} color="#FF6B35" style={styles.inputIcon} />
            <TextInput
              style={styles.input}
              placeholder="Enter your complete address"
              value={address}
              onChangeText={setAddress}
              multiline
              numberOfLines={3}
            />
          </View>
        </View>

        {/* Payment Method */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Payment Method</Text>
          
          <TouchableOpacity
            style={[
              styles.paymentOption,
              paymentMethod === 'gpay' && styles.selectedPayment
            ]}
            onPress={() => setPaymentMethod('gpay')}
          >
            <View style={styles.paymentInfo}>
              <View style={styles.paymentIcon}>
                <Text style={styles.paymentIconText}>G</Text>
              </View>
              <Text style={styles.paymentText}>Google Pay</Text>
            </View>
            {paymentMethod === 'gpay' && (
              <Ionicons name="checkmark-circle" size={24} color="#FF6B35" />
            )}
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.paymentOption,
              paymentMethod === 'cash' && styles.selectedPayment
            ]}
            onPress={() => setPaymentMethod('cash')}
          >
            <View style={styles.paymentInfo}>
              <View style={styles.paymentIcon}>
                <Ionicons name="cash" size={24} color="#4CAF50" />
              </View>
              <Text style={styles.paymentText}>Cash Payment</Text>
            </View>
            {paymentMethod === 'cash' && (
              <Ionicons name="checkmark-circle" size={24} color="#FF6B35" />
            )}
          </TouchableOpacity>
        </View>

        {/* Important Notes */}
        <View style={styles.notesContainer}>
          <Ionicons name="information-circle" size={20} color="#FF6B35" />
          <Text style={styles.notesText}>
            Cleaner will arrive within 15-30 minutes after accepting your request
          </Text>
        </View>
      </ScrollView>

      <View style={styles.footer}>
        <TouchableOpacity
          style={[styles.confirmButton, loading && styles.buttonDisabled]}
          onPress={handleConfirmBooking}
          disabled={loading}
        >
          <Text style={styles.confirmButtonText}>
            {loading ? 'Creating Booking...' : 'Confirm Booking'}
          </Text>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F9FA',
  },
  header: {
    backgroundColor: '#1565C0',
    paddingTop: 50,
    paddingBottom: 16,
    paddingHorizontal: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  content: {
    flex: 1,
    paddingHorizontal: 16,
    paddingTop: 16,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1a1a1a',
    marginBottom: 12,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    borderWidth: 2,
    borderColor: '#E0E0E0',
  },
  inputIcon: {
    marginRight: 12,
    marginTop: 2,
  },
  input: {
    flex: 1,
    fontSize: 16,
    color: '#1a1a1a',
    minHeight: 60,
    textAlignVertical: 'top',
  },
  paymentOption: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 2,
    borderColor: '#E0E0E0',
  },
  selectedPayment: {
    borderColor: '#FF6B35',
    backgroundColor: '#E3F2FD',
  },
  paymentInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  paymentIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#F0F0F0',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  paymentIconText: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#4285F4',
  },
  paymentText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1a1a1a',
  },
  notesContainer: {
    flexDirection: 'row',
    backgroundColor: '#E3F2FD',
    borderRadius: 12,
    padding: 16,
    marginBottom: 24,
  },
  notesText: {
    flex: 1,
    fontSize: 14,
    color: '#666',
    marginLeft: 12,
    lineHeight: 20,
  },
  footer: {
    paddingHorizontal: 16,
    paddingVertical: 16,
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#E0E0E0',
  },
  confirmButton: {
    backgroundColor: '#1565C0',
    borderRadius: 12,
    height: 56,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  confirmButtonText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: 'bold',
  },
});
