import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  RefreshControl,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { Picker } from '@react-native-picker/picker';
import { dashboardService, locationService } from '../../src/services/api';
import { DashboardSummary, Location } from '../../src/types';

export default function DashboardScreen() {
  const [selectedLocationId, setSelectedLocationId] = useState<number | undefined>();
  const [selectedMonth, setSelectedMonth] = useState<string>('');
  const [refreshing, setRefreshing] = useState(false);

  const { data: locations = [] } = useQuery({
    queryKey: ['locations'],
    queryFn: locationService.getAll,
  });

  const { data: summary, isLoading: summaryLoading, refetch: refetchSummary } = useQuery({
    queryKey: ['dashboard-summary', selectedLocationId, selectedMonth],
    queryFn: () => dashboardService.getSummary(selectedLocationId, selectedMonth),
  });

  const { data: monthlyData = [], isLoading: monthlyLoading, refetch: refetchMonthly } = useQuery({
    queryKey: ['monthly-breakdown', selectedLocationId],
    queryFn: () => dashboardService.getMonthlyBreakdown(2025, selectedLocationId),
  });

  const onRefresh = async () => {
    setRefreshing(true);
    await Promise.all([refetchSummary(), refetchMonthly()]);
    setRefreshing(false);
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount);
  };

  const StatCard = ({ title, value, subtitle, color = '#dc2626' }: any) => (
    <View style={[styles.statCard, { borderLeftColor: color }]}>
      <Text style={styles.statTitle}>{title}</Text>
      <Text style={[styles.statValue, { color }]}>{value}</Text>
      {subtitle && <Text style={styles.statSubtitle}>{subtitle}</Text>}
    </View>
  );

  if (summaryLoading && !summary) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#dc2626" />
        <Text style={styles.loadingText}>Loading dashboard...</Text>
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.container}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
    >
      <View style={styles.content}>
        {/* Filters */}
        <View style={styles.filtersContainer}>
          <View style={styles.filterItem}>
            <Text style={styles.filterLabel}>Location</Text>
            <View style={styles.pickerContainer}>
              <Picker
                selectedValue={selectedLocationId}
                onValueChange={setSelectedLocationId}
                style={styles.picker}
              >
                <Picker.Item label="All Locations" value={undefined} />
                {locations.map((location: Location) => (
                  <Picker.Item
                    key={location.id}
                    label={location.name}
                    value={location.id}
                  />
                ))}
              </Picker>
            </View>
          </View>
        </View>

        {/* Summary Stats */}
        <View style={styles.statsContainer}>
          <StatCard
            title="Total Sales"
            value={formatCurrency(summary?.totalSales || 0)}
            subtitle={`${summary?.totalOrders || 0} orders`}
            color="#059669"
          />
          <StatCard
            title="Total Refunds"
            value={formatCurrency(summary?.totalRefunds || 0)}
            color="#dc2626"
          />
          <StatCard
            title="Platform Fees (7%)"
            value={formatCurrency(summary?.platformFees || 0)}
            color="#d97706"
          />
          <StatCard
            title="Stripe Fees"
            value={formatCurrency(summary?.stripeFees || 0)}
            color="#7c3aed"
          />
          <StatCard
            title="Net Deposit"
            value={formatCurrency(summary?.netDeposit || 0)}
            subtitle="After all fees"
            color="#059669"
          />
        </View>

        {/* Monthly Breakdown */}
        <View style={styles.monthlyContainer}>
          <Text style={styles.sectionTitle}>Monthly Breakdown</Text>
          {monthlyLoading ? (
            <ActivityIndicator color="#dc2626" style={styles.monthlyLoading} />
          ) : monthlyData.length > 0 ? (
            monthlyData.map((month: any, index: number) => (
              <View key={index} style={styles.monthCard}>
                <View style={styles.monthHeader}>
                  <Text style={styles.monthTitle}>{month.month}</Text>
                  <Text style={styles.monthSales}>{formatCurrency(month.totalSales)}</Text>
                </View>
                <View style={styles.monthDetails}>
                  <Text style={styles.monthDetail}>Orders: {month.totalOrders}</Text>
                  <Text style={styles.monthDetail}>Refunds: {formatCurrency(month.totalRefunds)}</Text>
                  <Text style={styles.monthDetail}>Net: {formatCurrency(month.netAmount)}</Text>
                </View>
              </View>
            ))
          ) : (
            <View style={styles.emptyState}>
              <Text style={styles.emptyText}>No data available</Text>
            </View>
          )}
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  content: {
    padding: 16,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#6b7280',
  },
  filtersContainer: {
    backgroundColor: '#ffffff',
    borderRadius: 8,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  filterItem: {
    marginBottom: 12,
  },
  filterLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 8,
  },
  pickerContainer: {
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 8,
    backgroundColor: '#ffffff',
  },
  picker: {
    height: 50,
  },
  statsContainer: {
    marginBottom: 24,
  },
  statCard: {
    backgroundColor: '#ffffff',
    borderRadius: 8,
    padding: 16,
    marginBottom: 12,
    borderLeftWidth: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  statTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6b7280',
    marginBottom: 4,
  },
  statValue: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  statSubtitle: {
    fontSize: 12,
    color: '#9ca3af',
  },
  monthlyContainer: {
    backgroundColor: '#ffffff',
    borderRadius: 8,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#111827',
    marginBottom: 16,
  },
  monthlyLoading: {
    marginVertical: 20,
  },
  monthCard: {
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
    paddingVertical: 12,
  },
  monthHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  monthTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
  },
  monthSales: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#059669',
  },
  monthDetails: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  monthDetail: {
    fontSize: 12,
    color: '#6b7280',
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  emptyText: {
    fontSize: 16,
    color: '#9ca3af',
  },
});