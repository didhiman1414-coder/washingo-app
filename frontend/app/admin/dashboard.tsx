import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { adminAPI } from '../../services/api';

export default function AdminDashboard() {
  const router = useRouter();
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => { loadDashboard(); }, []);

  const loadDashboard = async () => {
    try {
      const response = await adminAPI.getDashboard();
      setData(response.data);
    } catch (error) {
      console.error('Error loading dashboard:', error);
    } finally { setLoading(false); }
  };

  if (loading) return <View style={styles.center}><ActivityIndicator size="large" color="#1a1a1a" /></View>;

  const stats = [
    { label: 'Customers', value: data?.total_customers || 0, icon: 'people', color: '#1565C0' },
    { label: 'CleanPros', value: data?.total_cleaners || 0, icon: 'construct', color: '#F9A825' },
    { label: 'Centres', value: data?.total_centres || 0, icon: 'business', color: '#2E7D32' },
    { label: 'Total Bookings', value: data?.total_bookings || 0, icon: 'list', color: '#6A1B9A' },
    { label: 'Completed', value: data?.completed_bookings || 0, icon: 'checkmark-circle', color: '#2E7D32' },
    { label: 'Pending', value: data?.pending_bookings || 0, icon: 'time', color: '#F9A825' },
  ];

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}><Ionicons name="arrow-back" size={24} color="#FFFFFF" /></TouchableOpacity>
        <Text style={styles.title}>Admin Dashboard</Text>
      </View>
      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Revenue Card */}
        <View style={styles.revenueCard}>
          <Text style={styles.revenueLabel}>Total Revenue</Text>
          <Text style={styles.revenueAmount}>₹{data?.total_revenue || 0}</Text>
          <View style={styles.revenueSplit}>
            <View style={styles.splitItem}>
              <Text style={styles.splitLabel}>Commission (15%)</Text>
              <Text style={[styles.splitValue, { color: '#2E7D32' }]}>₹{data?.total_commission || 0}</Text>
            </View>
            <View style={styles.splitItem}>
              <Text style={styles.splitLabel}>Worker Payouts</Text>
              <Text style={[styles.splitValue, { color: '#1565C0' }]}>₹{data?.worker_payouts || 0}</Text>
            </View>
          </View>
        </View>
        {/* Stats Grid */}
        <View style={styles.statsGrid}>
          {stats.map((s, i) => (
            <View key={i} style={styles.statCard}>
              <Ionicons name={s.icon as any} size={24} color={s.color} />
              <Text style={styles.statValue}>{s.value}</Text>
              <Text style={styles.statLabel}>{s.label}</Text>
            </View>
          ))}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F5F7FA' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  header: { backgroundColor: '#1a1a1a', paddingTop: 50, paddingBottom: 20, paddingHorizontal: 24, flexDirection: 'row', alignItems: 'center', gap: 16 },
  title: { fontSize: 22, fontWeight: 'bold', color: '#FFFFFF' },
  content: { flex: 1, paddingHorizontal: 20, paddingTop: 20 },
  revenueCard: { backgroundColor: '#FFFFFF', borderRadius: 16, padding: 24, marginBottom: 20, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 8, elevation: 2 },
  revenueLabel: { fontSize: 14, color: '#888' },
  revenueAmount: { fontSize: 36, fontWeight: 'bold', color: '#1a1a1a', marginVertical: 8 },
  revenueSplit: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 12 },
  splitItem: { flex: 1 },
  splitLabel: { fontSize: 12, color: '#888', marginBottom: 4 },
  splitValue: { fontSize: 18, fontWeight: 'bold' },
  statsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginBottom: 32 },
  statCard: { width: '47%', backgroundColor: '#FFFFFF', borderRadius: 14, padding: 18, alignItems: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 4, elevation: 2 },
  statValue: { fontSize: 28, fontWeight: 'bold', color: '#1a1a1a', marginTop: 8 },
  statLabel: { fontSize: 13, color: '#888', marginTop: 4 },
});
