/**
 * AWS Service Status Component
 * Displays health status of AWS services
 */

import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert } from 'react-native';
import { useAWS } from '../contexts/AWSContext';

export interface AWSServiceStatusProps {
  showDetails?: boolean;
  onRefresh?: () => void;
}

const AWSServiceStatus: React.FC<AWSServiceStatusProps> = ({ 
  showDetails = false, 
  onRefresh 
}) => {
  const { serviceStatus, checkServicesHealth, isLoading } = useAWS();

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'healthy':
        return '#4CAF50';
      case 'degraded':
        return '#FF9800';
      case 'unavailable':
        return '#F44336';
      default:
        return '#9E9E9E';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'healthy':
        return '✓';
      case 'degraded':
        return '⚠';
      case 'unavailable':
        return '✗';
      default:
        return '?';
    }
  };

  const handleRefresh = async () => {
    try {
      await checkServicesHealth();
      if (onRefresh) onRefresh();
    } catch (error) {
      Alert.alert('Error', 'Failed to check service status');
    }
  };

  const handleServicePress = (service: any) => {
    if (showDetails) {
      Alert.alert(
        `${service.service} Status`,
        `Status: ${service.status}\nLast Check: ${new Date(service.lastCheck).toLocaleString()}\nResponse Time: ${service.responseTime || 'N/A'}ms`,
        [{ text: 'OK' }]
      );
    }
  };

  if (!showDetails) {
    // Compact status indicator
    const overallStatus = serviceStatus.length > 0 
      ? serviceStatus.every(s => s.status === 'healthy') ? 'healthy'
      : serviceStatus.some(s => s.status === 'unavailable') ? 'unavailable'
      : 'degraded'
      : 'unknown';

    return (
      <TouchableOpacity 
        style={[styles.compactContainer, { borderColor: getStatusColor(overallStatus) }]}
        onPress={handleRefresh}
        disabled={isLoading}
      >
        <View style={[styles.statusDot, { backgroundColor: getStatusColor(overallStatus) }]} />
        <Text style={styles.compactText}>
          AWS {overallStatus === 'healthy' ? 'Ready' : overallStatus}
        </Text>
      </TouchableOpacity>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>AWS Services Status</Text>
        <TouchableOpacity 
          style={styles.refreshButton}
          onPress={handleRefresh}
          disabled={isLoading}
        >
          <Text style={styles.refreshText}>
            {isLoading ? 'Checking...' : 'Refresh'}
          </Text>
        </TouchableOpacity>
      </View>

      {serviceStatus.length === 0 ? (
        <View style={styles.emptyState}>
          <Text style={styles.emptyText}>No service status available</Text>
        </View>
      ) : (
        serviceStatus.map((service, index) => (
          <TouchableOpacity
            key={index}
            style={styles.serviceItem}
            onPress={() => handleServicePress(service)}
          >
            <View style={styles.serviceInfo}>
              <Text style={styles.serviceIcon}>
                {getStatusIcon(service.status)}
              </Text>
              <View style={styles.serviceDetails}>
                <Text style={styles.serviceName}>{service.service}</Text>
                <Text style={[styles.serviceStatus, { color: getStatusColor(service.status) }]}>
                  {service.status.toUpperCase()}
                </Text>
              </View>
            </View>
            
            {service.responseTime && (
              <Text style={styles.responseTime}>
                {service.responseTime}ms
              </Text>
            )}
          </TouchableOpacity>
        ))
      )}

      <View style={styles.footer}>
        <Text style={styles.footerText}>
          Last updated: {serviceStatus.length > 0 
            ? new Date(serviceStatus[0].lastCheck).toLocaleTimeString()
            : 'Never'
          }
        </Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#1a1a1a',
    borderRadius: 8,
    padding: 16,
    margin: 8,
  },
  compactContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    borderWidth: 1,
    backgroundColor: '#1a1a1a',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#ffffff',
  },
  refreshButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: '#2196F3',
    borderRadius: 4,
  },
  refreshText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '600',
  },
  serviceItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#333333',
  },
  serviceInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  serviceIcon: {
    fontSize: 20,
    marginRight: 12,
    width: 24,
    textAlign: 'center',
  },
  serviceDetails: {
    flex: 1,
  },
  serviceName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#ffffff',
    marginBottom: 2,
  },
  serviceStatus: {
    fontSize: 12,
    fontWeight: '500',
  },
  responseTime: {
    fontSize: 12,
    color: '#888888',
    fontFamily: 'monospace',
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 6,
  },
  compactText: {
    fontSize: 12,
    color: '#ffffff',
    fontWeight: '500',
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 20,
  },
  emptyText: {
    color: '#888888',
    fontSize: 14,
  },
  footer: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#333333',
  },
  footerText: {
    fontSize: 12,
    color: '#888888',
    textAlign: 'center',
  },
});

export default AWSServiceStatus;
