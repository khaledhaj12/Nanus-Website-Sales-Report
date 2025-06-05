import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  RefreshControl,
  TouchableOpacity,
} from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { Picker } from '@react-native-picker/picker';
import { dashboardService, locationService } from '../../src/services/api';

export default function ReportsScreen() {
  const [selectedLocationId, setSelectedLocationId] = useState<number | undefined>();
  const [refreshing, setRefreshing] = useState(false);

  const { data: locations = [] } = useQuery({
    queryKey: ['locations'],
    queryFn: locationService.getAll,
  });

  const { data: monthlyData = [], refetch } = useQuery({
    queryKey: ['reports-monthly', selectedLocationId],
    queryFn: () => dashboardService.getMonthlyBreakdown(2025, selectedLocationId),
  });

  const onRefresh = async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount);
  };

  return (
    <ScrollView
      style={styles.container}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
    >
      <View style={styles.content}>
        {/* Location Filter */}
        <View style={styles.filterContainer}>
          <Text style={styles.filterLabel}>Select Location</Text>
          <View style={styles.pickerContainer}>
            <Picker
              selectedValue={selectedLocationId}
              onValueChange={setSelectedLocationId}
              style={styles.picker}
            >
              <Picker.Item label="All Locations" value={undefined} />
              {locations.map((location: any) => (
                <Picker.Item
                  key={location.id}
                  label={location.name}
                  value={location.id}
                />
              ))}
            </Picker>
          </View>
        </View>

        {/* Monthly Reports */}
        <View style={styles.reportsContainer}>
          <Text style={styles.sectionTitle}>Monthly Sales Reports</Text>
          {monthlyData.map((month: any, index: number) => (
            <View key={index} style={styles.reportCard}>
              <View style={styles.reportHeader}>
                <Text style={styles.monthText}>{month.month}</Text>
                <View style={styles.salesBadge}>
                  <Text style={styles.salesText}>{formatCurrency(month.totalSales)}</Text>
                </View>
              </View>
              
              <View style={styles.reportMetrics}>
                <View style={styles.metric}>
                  <Text style={styles.metricLabel}>Orders</Text>
                  <Text style={styles.metricValue}>{month.totalOrders}</Text>
                </View>
                <View style={styles.metric}>
                  <Text style={styles.metricLabel}>Refunds</Text>
                  <Text style={styles.metricValue}>{formatCurrency(month.totalRefunds)}</Text>
                </View>
                <View style={styles.metric}>
                  <Text style={styles.metricLabel}>Net Amount</Text>
                  <Text style={[styles.metricValue, styles.netAmount]}>
                    {formatCurrency(month.netAmount)}
                  </Text>
                </View>
              </View>
            </View>
          ))}
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
  filterContainer: {
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
  reportsContainer: {
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
  reportCard: {
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
    paddingVertical: 16,
  },
  reportHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  monthText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
  },
  salesBadge: {
    backgroundColor: '#dc2626',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  salesText: {
    color: '#ffffff',
    fontWeight: 'bold',
    fontSize: 14,
  },
  reportMetrics: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  metric: {
    alignItems: 'center',
  },
  metricLabel: {
    fontSize: 12,
    color: '#6b7280',
    marginBottom: 4,
  },
  metricValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#111827',
  },
  netAmount: {
    color: '#059669',
  },
});