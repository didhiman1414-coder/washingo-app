import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Image, Alert } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAuthStore } from '../../store/authStore';
import { cleanerAPI, bookingAPI } from '../../services/api';

interface Cleaner {
  cleaner_id: string;
  name: string;
  photo_base64: string;
  rating: number;
  total_jobs: number;
  latitude: number;
  longitude: number;
}

export default function MapScreen() {
  const router = useRouter();
  const { service_id } = useLocalSearchParams();
  const { user } = useAuthStore();
  const [cleaners, setCleaners] = useState<Cleaner[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCleaner, setSelectedCleaner] = useState<Cleaner | null>(null);

  // Mock current location
  const mockLat = 12.9716;
  const mockLon = 77.5946;

  useEffect(() => {
    loadNearbyCleaners();
  }, []);

  const loadNearbyCleaners = async () => {
    try {
      const response = await cleanerAPI.getNearbyCleaners(mockLat, mockLon);
      setCleaners(response.data);
    } catch (error) {
      console.error('Error loading cleaners:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleBooking = async () => {
    if (!selectedCleaner) {
      Alert.alert('Error', 'Please select a cleaner');
      return;
    }

    router.push({
      pathname: '/customer/booking',
      params: {
        service_id: service_id as string,
        cleaner_id: selectedCleaner.cleaner_id,
      }
    });
  };

  return (
    <View style={styles.container}>
      {/* Mock Map Header */}
      <View style={styles.mapContainer}>
        <TouchableOpacity 
          style={styles.backButton}
          onPress={() => router.back()}
        >
          <Ionicons name="arrow-back" size={24} color="#1a1a1a" />
        </TouchableOpacity>
        <View style={styles.mockMap}>
          <Ionicons name="map" size={64} color="#1565C0" />
          <Text style={styles.mapText}>Google Maps</Text>
          <Text style={styles.mapSubtext}>Nearby cleaners shown below</Text>
        </View>
      </View>

      {/* Cleaners List */}
      <View style={styles.cleanersContainer}>
        <Text style={styles.title}>Available Cleaners</Text>
        <ScrollView showsVerticalScrollIndicator={false}>
          {cleaners.length === 0 ? (
            <View style={styles.emptyState}>
              <Ionicons name="people-outline" size={64} color="#CCC" />
              <Text style={styles.emptyText}>No cleaners available</Text>
              <Text style={styles.emptySubtext}>Please try again later</Text>
            </View>
          ) : (
            cleaners.map((cleaner) => (
              <TouchableOpacity
                key={cleaner.cleaner_id}
                style={[
                  styles.cleanerCard,
                  selectedCleaner?.cleaner_id === cleaner.cleaner_id && styles.selectedCard
                ]}
                onPress={() => setSelectedCleaner(cleaner)}
              >
                <View style={styles.cleanerAvatar}>
                  {cleaner.photo_base64 ? (
                    <Image 
                      source={{ uri: cleaner.photo_base64 }}
                      style={styles.avatar}
                    />
                  ) : (
                    <Ionicons name="person" size={32} color="#FFFFFF" />
                  )}
                </View>
                <View style={styles.cleanerInfo}>
                  <View style={styles.nameRow}>
                    <Text style={styles.cleanerName}>{cleaner.name}</Text>
                    <View style={styles.badge}>
                      <Ionicons name="checkmark-circle" size={16} color="#FF6B35" />
                      <Text style={styles.badgeText}>Verified</Text>
                    </View>
                  </View>
                  <View style={styles.stats}>
                    <View style={styles.statItem}>
                      <Ionicons name="star" size={16} color="#FFD700" />
                      <Text style={styles.statText}>{cleaner.rating.toFixed(1)}</Text>
                    </View>
                    <View style={styles.statItem}>
                      <Ionicons name="briefcase" size={16} color="#666" />
                      <Text style={styles.statText}>{cleaner.total_jobs} jobs</Text>
                    </View>
                    <View style={styles.statItem}>
                      <Ionicons name="location" size={16} color="#666" />
                      <Text style={styles.statText}>1.2 km</Text>
                    </View>
                  </View>
                </View>
                {selectedCleaner?.cleaner_id === cleaner.cleaner_id && (
                  <Ionicons name="checkmark-circle" size={32} color="#FF6B35" />
                )}
              </TouchableOpacity>
            ))
          )}
        </ScrollView>

        {selectedCleaner && (
          <TouchableOpacity 
            style={styles.bookButton}
            onPress={handleBooking}
          >
            <Text style={styles.bookButtonText}>Continue with {selectedCleaner.name}</Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F9FA',
  },
  mapContainer: {
    height: 250,
    backgroundColor: '#E3F2FD',
    position: 'relative',
  },
  backButton: {
    position: 'absolute',
    top: 50,
    left: 16,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  mockMap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  mapText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1a1a1a',
    marginTop: 8,
  },
  mapSubtext: {
    fontSize: 14,
    color: '#666',
    marginTop: 4,
  },
  cleanersContainer: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    marginTop: -24,
    paddingTop: 24,
    paddingHorizontal: 16,
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1a1a1a',
    marginBottom: 16,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 48,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#666',
    marginTop: 16,
  },
  emptySubtext: {
    fontSize: 14,
    color: '#999',
    marginTop: 8,
  },
  cleanerCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8F9FA',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  selectedCard: {
    borderColor: '#FF6B35',
    backgroundColor: '#E3F2FD',
  },
  cleanerAvatar: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#1565C0',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
  },
  avatar: {
    width: 60,
    height: 60,
    borderRadius: 30,
  },
  cleanerInfo: {
    flex: 1,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  cleanerName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1a1a1a',
    marginRight: 8,
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#E3F2FD',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  badgeText: {
    fontSize: 12,
    color: '#1565C0',
    marginLeft: 4,
    fontWeight: '600',
  },
  stats: {
    flexDirection: 'row',
  },
  statItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 16,
  },
  statText: {
    fontSize: 14,
    color: '#666',
    marginLeft: 4,
  },
  bookButton: {
    backgroundColor: '#1565C0',
    borderRadius: 12,
    height: 56,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 16,
    marginBottom: 16,
  },
  bookButtonText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: 'bold',
  },
});
