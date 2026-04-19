import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, ActivityIndicator, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAuthStore } from '../../store/authStore';
import { serviceAPI } from '../../services/api';
import AsyncStorage from '@react-native-async-storage/async-storage';

interface Service {
  service_id: string;
  name: string;
  description: string;
  price: number;
  duration_minutes: number;
  icon: string;
  booking_type: string;
}

const SERVICE_ICONS: Record<string, { icon: string; color: string; bg: string }> = {
  'brush': { icon: 'brush', color: '#F9A825', bg: '#FFF8E1' },
  'water': { icon: 'water', color: '#1565C0', bg: '#E3F2FD' },
  'car-wash': { icon: 'car-sport', color: '#2E7D32', bg: '#E8F5E9' },
  'store': { icon: 'business', color: '#6A1B9A', bg: '#F3E5F5' },
};

export default function CustomerHome() {
  const router = useRouter();
  const { user, logout } = useAuthStore();
  const [services, setServices] = useState<Service[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => { loadServices(); }, []);

  const loadServices = async () => {
    try {
      const response = await serviceAPI.getServices();
      setServices(response.data);
    } catch (error) {
      Alert.alert('Error', 'Failed to load services');
    } finally {
      setLoading(false);
    }
  };

  const handleServiceSelect = (service: Service) => {
    if (service.booking_type === 'visit_centre') {
      router.push({ pathname: '/customer/centres', params: { service_id: service.service_id } });
    } else {
      router.push({ pathname: '/customer/map', params: { service_id: service.service_id } });
    }
  };

  const handleLogout = async () => {
    await AsyncStorage.removeItem('user');
    logout();
    router.replace('/');
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#1565C0" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View>
          <Text style={styles.greeting}>Hello, {user?.name || 'Customer'}!</Text>
          <Text style={styles.subgreeting}>What service do you need today?</Text>
        </View>
        <TouchableOpacity testID="logout-btn" onPress={handleLogout}>
          <Ionicons name="log-out-outline" size={28} color="#FFFFFF" />
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        <Text style={styles.sectionTitle}>Our Services</Text>
        
        {services.map((service) => {
          const iconConfig = SERVICE_ICONS[service.icon] || SERVICE_ICONS['brush'];
          return (
            <TouchableOpacity
              key={service.service_id}
              testID={`service-card-${service.service_id}`}
              style={styles.serviceCard}
              onPress={() => handleServiceSelect(service)}
            >
              <View style={[styles.serviceIconWrap, { backgroundColor: iconConfig.bg }]}>
                <Ionicons name={iconConfig.icon as any} size={28} color={iconConfig.color} />
              </View>
              <View style={styles.serviceInfo}>
                <Text style={styles.serviceName}>{service.name}</Text>
                <Text style={styles.serviceDesc}>{service.description}</Text>
                <View style={styles.serviceMeta}>
                  <Ionicons name="time-outline" size={14} color="#888" />
                  <Text style={styles.metaText}>{service.duration_minutes} min</Text>
                  {service.booking_type === 'visit_centre' && (
                    <View style={styles.centreTag}>
                      <Text style={styles.centreTagText}>Visit Centre</Text>
                    </View>
                  )}
                </View>
              </View>
              <View style={styles.priceWrap}>
                <Text style={styles.price}>₹{service.price}</Text>
                <Ionicons name="chevron-forward" size={20} color="#1565C0" />
              </View>
            </TouchableOpacity>
          );
        })}

        <View style={styles.quickActions}>
          <TouchableOpacity
            testID="my-bookings-btn"
            style={styles.actionButton}
            onPress={() => router.push('/customer/bookings')}
          >
            <Ionicons name="list" size={22} color="#1565C0" />
            <Text style={styles.actionText}>My Bookings</Text>
            <Ionicons name="chevron-forward" size={20} color="#CCC" />
          </TouchableOpacity>
        </View>

        <View style={styles.infoCard}>
          <Ionicons name="shield-checkmark" size={20} color="#2E7D32" />
          <Text style={styles.infoText}>All workers are verified CleanPros with background checks</Text>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F5F7FA' },
  loadingContainer: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#F5F7FA' },
  header: {
    backgroundColor: '#1565C0', paddingTop: 56, paddingBottom: 24,
    paddingHorizontal: 24, borderBottomLeftRadius: 28, borderBottomRightRadius: 28,
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
  },
  greeting: { fontSize: 22, fontWeight: 'bold', color: '#FFFFFF', marginBottom: 4 },
  subgreeting: { fontSize: 15, color: '#BBDEFB' },
  content: { flex: 1, paddingHorizontal: 20, paddingTop: 20 },
  sectionTitle: { fontSize: 20, fontWeight: 'bold', color: '#1a1a1a', marginBottom: 14 },
  serviceCard: {
    backgroundColor: '#FFFFFF', borderRadius: 16, padding: 16,
    marginBottom: 12, flexDirection: 'row', alignItems: 'center',
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05, shadowRadius: 4, elevation: 2,
  },
  serviceIconWrap: {
    width: 52, height: 52, borderRadius: 14,
    alignItems: 'center', justifyContent: 'center', marginRight: 14,
  },
  serviceInfo: { flex: 1 },
  serviceName: { fontSize: 16, fontWeight: 'bold', color: '#1a1a1a', marginBottom: 3 },
  serviceDesc: { fontSize: 13, color: '#777', marginBottom: 4 },
  serviceMeta: { flexDirection: 'row', alignItems: 'center' },
  metaText: { fontSize: 12, color: '#888', marginLeft: 4 },
  centreTag: {
    backgroundColor: '#F3E5F5', paddingHorizontal: 8, paddingVertical: 2,
    borderRadius: 8, marginLeft: 8,
  },
  centreTagText: { fontSize: 11, color: '#6A1B9A', fontWeight: '600' },
  priceWrap: { alignItems: 'flex-end' },
  price: { fontSize: 18, fontWeight: 'bold', color: '#1565C0', marginBottom: 4 },
  quickActions: { marginTop: 8, marginBottom: 12 },
  actionButton: {
    backgroundColor: '#FFFFFF', borderRadius: 12, padding: 16,
    flexDirection: 'row', alignItems: 'center',
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05, shadowRadius: 4, elevation: 2,
  },
  actionText: { fontSize: 16, fontWeight: '600', color: '#1a1a1a', marginLeft: 12, flex: 1 },
  infoCard: {
    flexDirection: 'row', backgroundColor: '#E8F5E9', borderRadius: 12,
    padding: 14, marginBottom: 32, alignItems: 'center',
  },
  infoText: { flex: 1, fontSize: 13, color: '#2E7D32', marginLeft: 10, lineHeight: 18 },
});
