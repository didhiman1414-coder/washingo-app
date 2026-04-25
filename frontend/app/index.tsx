import React, { useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useAuthStore } from '../store/authStore';
import { Ionicons } from '@expo/vector-icons';

export default function Index() {
  const router = useRouter();
  const { setUser } = useAuthStore();

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    try {
      const userData = await AsyncStorage.getItem('user');
      if (userData) {
        const parsed = JSON.parse(userData);
        setUser(parsed);
        if (parsed.role === 'customer') router.replace('/customer/home');
        else if (parsed.role === 'cleaner') router.replace('/cleaner/dashboard');
        else if (parsed.role === 'centre') router.replace('/centre/dashboard');
      }
    } catch (e) {
      console.error('Auth check error:', e);
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Ionicons name="car-sport" size={56} color="#FFFFFF" />
        <Text style={styles.logo}>Washingo</Text>
        <Text style={styles.tagline}>On-Demand Car Cleaning</Text>
      </View>

      <View style={styles.content}>
        <Text style={styles.title}>Welcome!</Text>
        <Text style={styles.subtitle}>Choose how you want to continue</Text>

        <TouchableOpacity
          testID="customer-role-btn"
          style={styles.roleButton}
          onPress={() => router.push('/auth/phone?role=customer')}
        >
          <View style={[styles.iconWrap, { backgroundColor: '#E3F2FD' }]}>
            <Ionicons name="person" size={32} color="#1565C0" />
          </View>
          <View style={styles.roleInfo}>
            <Text style={styles.roleTitle}>I need car cleaning</Text>
            <Text style={styles.roleDesc}>Book a cleaner or visit a centre</Text>
          </View>
          <Ionicons name="chevron-forward" size={24} color="#1565C0" />
        </TouchableOpacity>

        <TouchableOpacity
          testID="cleaner-role-btn"
          style={styles.roleButton}
          onPress={() => router.push('/auth/phone?role=cleaner')}
        >
          <View style={[styles.iconWrap, { backgroundColor: '#FFF8E1' }]}>
            <Ionicons name="construct" size={32} color="#F9A825" />
          </View>
          <View style={styles.roleInfo}>
            <Text style={styles.roleTitle}>I am a CleanPro</Text>
            <Text style={styles.roleDesc}>Accept jobs and earn money</Text>
          </View>
          <Ionicons name="chevron-forward" size={24} color="#1565C0" />
        </TouchableOpacity>

        <TouchableOpacity
          testID="centre-role-btn"
          style={styles.roleButton}
          onPress={() => router.push('/auth/phone?role=centre')}
        >
          <View style={[styles.iconWrap, { backgroundColor: '#E8F5E9' }]}>
            <Ionicons name="business" size={32} color="#2E7D32" />
          </View>
          <View style={styles.roleInfo}>
            <Text style={styles.roleTitle}>Washing Centre</Text>
            <Text style={styles.roleDesc}>Register your centre & get orders</Text>
          </View>
          <Ionicons name="chevron-forward" size={24} color="#1565C0" />
        </TouchableOpacity>
      </View>

      <Text style={styles.footer}>By continuing, you agree to our Terms & Privacy Policy</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FFFFFF' },
  header: {
    paddingTop: 70, paddingBottom: 30, paddingHorizontal: 24,
    backgroundColor: '#1565C0', alignItems: 'center',
    borderBottomLeftRadius: 32, borderBottomRightRadius: 32,
  },
  logo: { fontSize: 36, fontWeight: 'bold', color: '#FFFFFF', marginTop: 8 },
  tagline: { fontSize: 16, color: '#BBDEFB', marginTop: 4 },
  content: { flex: 1, paddingHorizontal: 24, paddingTop: 32 },
  title: { fontSize: 28, fontWeight: 'bold', color: '#1a1a1a', marginBottom: 4 },
  subtitle: { fontSize: 16, color: '#666', marginBottom: 28 },
  roleButton: {
    backgroundColor: '#FFFFFF', borderRadius: 16, padding: 18,
    marginBottom: 14, flexDirection: 'row', alignItems: 'center',
    borderWidth: 1.5, borderColor: '#E0E0E0',
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06, shadowRadius: 6, elevation: 2,
  },
  iconWrap: {
    width: 56, height: 56, borderRadius: 16,
    alignItems: 'center', justifyContent: 'center', marginRight: 14,
  },
  roleInfo: { flex: 1 },
  roleTitle: { fontSize: 17, fontWeight: 'bold', color: '#1a1a1a', marginBottom: 2 },
  roleDesc: { fontSize: 13, color: '#888' },
  footer: {
    fontSize: 12, color: '#999', textAlign: 'center',
    paddingHorizontal: 24, paddingBottom: 24,
  },
});
