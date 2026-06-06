import React, {useContext, useState, useEffect, useCallback} from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet,
  SafeAreaView, RefreshControl, ActivityIndicator,
} from 'react-native';
import Context from '@ctx/Contexto';
import Card from '@ui/Card';

interface Community {
  id: number;
  name: string;
  comune: string;
  identifier: number;
  is_home: boolean;
  subscription_active: boolean;
  availability: {
    visitor_total: number;
    visitor_used: number;
    visitor_available: number;
    disabled_total: number;
    disabled_used: number;
    disabled_available: number;
  };
}

interface Vehicle {
  id: number;
  plate: string;
  visitor_name: string;
  destination: string;
  disabled_spot: boolean;
  minutes: number;
  overtime_minutes: number;
  entered_at: string;
}

export default function Home({navigation}: any) {
  const app = useContext(Context);
  const [communities, setCommunities] = useState<Community[]>([]);
  const [selectedCommunity, setSelectedCommunity] = useState<Community | null>(null);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showSelector, setShowSelector] = useState(false);

  const loadCommunities = useCallback(async () => {
    try {
      const data = await app.api.getMyCommunities();
      setCommunities(data.communities);
      const home = data.communities.find(c => c.is_home) || data.communities[0] || null;
      setSelectedCommunity(home);
      if (home) await loadVehicles(home.id);
    } catch {}
  }, []);

  const loadVehicles = useCallback(async (id: number) => {
    try {
      const data = await app.api.getCommunityVehicles(id);
      setVehicles(data.vehicles);
      setCommunities(prev => prev.map(c =>
        c.id === id ? {...c, availability: data.availability} : c,
      ));
      setSelectedCommunity(prev => prev?.id === id ? {...prev, availability: data.availability} : prev);
    } catch {}
  }, []);

  useEffect(() => {
    (async () => {
      await loadCommunities();
      setLoading(false);
    })();
  }, []);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadCommunities();
    setRefreshing(false);
  }, [loadCommunities]);

  const selectCommunity = useCallback(async (community: Community) => {
    setSelectedCommunity(community);
    setShowSelector(false);
    await loadVehicles(community.id);
  }, [loadVehicles]);

  if (loading) {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.loading}>
          <ActivityIndicator color="#2563EB" size="large" />
        </View>
      </SafeAreaView>
    );
  }

  if (communities.length === 0) {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.empty}>
          <View style={styles.emptyIcon}><Text style={styles.emptyP}>P</Text></View>
          <Text style={styles.emptyTitle}>No estás en ninguna comunidad</Text>
          <Text style={styles.emptyText}>Únete a tu condominio para ver la disponibilidad de estacionamientos</Text>
          <TouchableOpacity style={styles.joinBtn} onPress={() => navigation.navigate('JoinCommunity')}>
            <Text style={styles.joinBtnText}>Unirse a una comunidad</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  const avail = selectedCommunity?.availability;

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#2563EB" />}>

        {/* Header */}
        <View style={styles.header}>
          <View>
            <Text style={styles.greeting}>Hola, {app.user?.name?.split(' ')[0]}</Text>
            <TouchableOpacity style={styles.communitySelector} onPress={() => setShowSelector(true)}>
              <Text style={styles.communityName} numberOfLines={1}>{selectedCommunity?.name}</Text>
              <Text style={styles.chevron}>▾</Text>
            </TouchableOpacity>
          </View>
          <TouchableOpacity onPress={app.logout} style={styles.logoutBtn}>
            <Text style={styles.logoutText}>Salir</Text>
          </TouchableOpacity>
        </View>

        {/* Subscription warning */}
        {selectedCommunity && !selectedCommunity.subscription_active && (
          <View style={styles.subWarning}>
            <Text style={styles.subWarningText}>La suscripción de esta comunidad está vencida</Text>
          </View>
        )}

        {/* Availability cards */}
        {avail && (
          <View style={styles.availSection}>
            <Text style={styles.sectionTitle}>Disponibilidad ahora</Text>
            <View style={styles.availRow}>
              <Card style={styles.availCard}>
                <Text style={styles.availIcon}>🚗</Text>
                <Text style={styles.availNumber}>{avail.visitor_available}</Text>
                <Text style={styles.availLabel}>Libres</Text>
                <Text style={styles.availSub}>de {avail.visitor_total} totales</Text>
                <View style={styles.progressBar}>
                  <View style={[styles.progressFill, {
                    width: `${avail.visitor_total > 0 ? (avail.visitor_used / avail.visitor_total) * 100 : 0}%`,
                    backgroundColor: avail.visitor_available === 0 ? '#EF4444' : '#2563EB',
                  }]} />
                </View>
              </Card>
              <Card style={styles.availCard}>
                <Text style={styles.availIcon}>♿</Text>
                <Text style={styles.availNumber}>{avail.disabled_available}</Text>
                <Text style={styles.availLabel}>Libres</Text>
                <Text style={styles.availSub}>de {avail.disabled_total} totales</Text>
                <View style={styles.progressBar}>
                  <View style={[styles.progressFill, {
                    width: `${avail.disabled_total > 0 ? (avail.disabled_used / avail.disabled_total) * 100 : 0}%`,
                    backgroundColor: '#7C3AED',
                  }]} />
                </View>
              </Card>
            </View>
          </View>
        )}

        {/* Active vehicles */}
        <View style={styles.vehiclesSection}>
          <Text style={styles.sectionTitle}>Vehículos estacionados ({vehicles.length})</Text>
          {vehicles.length === 0 ? (
            <Card padding={24}>
              <Text style={styles.noVehicles}>No hay vehículos estacionados actualmente</Text>
            </Card>
          ) : (
            vehicles.map(v => (
              <Card key={v.id} style={styles.vehicleCard}>
                <View style={styles.vehicleRow}>
                  <View style={[styles.vehicleBadge, v.overtime_minutes > 0 && styles.vehicleBadgeOver]}>
                    <Text style={styles.vehiclePlate}>{v.plate}</Text>
                  </View>
                  <View style={styles.vehicleInfo}>
                    <Text style={styles.vehicleVisitor} numberOfLines={1}>{v.visitor_name}</Text>
                    <Text style={styles.vehicleDest} numberOfLines={1}>{v.destination}</Text>
                  </View>
                  <View style={styles.vehicleTime}>
                    <Text style={[styles.vehicleMinutes, v.overtime_minutes > 0 && styles.vehicleOver]}>
                      {v.minutes}m
                    </Text>
                    {v.overtime_minutes > 0 && (
                      <Text style={styles.vehicleOvertimeLabel}>+{v.overtime_minutes}m extra</Text>
                    )}
                  </View>
                </View>
              </Card>
            ))
          )}
        </View>

        <View style={{height: 40}} />
      </ScrollView>

      {/* Community selector modal */}
      {showSelector && (
        <View style={styles.modalOverlay}>
          <View style={styles.modal}>
            <Text style={styles.modalTitle}>Cambiar comunidad</Text>
            {communities.map(c => (
              <TouchableOpacity
                key={c.id}
                style={[styles.communityOption, c.id === selectedCommunity?.id && styles.communityOptionActive]}
                onPress={() => selectCommunity(c)}>
                <View>
                  <Text style={styles.communityOptionName}>{c.name}</Text>
                  <Text style={styles.communityOptionComune}>{c.comune}</Text>
                </View>
                {c.is_home && <Text style={styles.homeBadge}>Principal</Text>}
              </TouchableOpacity>
            ))}
            <TouchableOpacity style={styles.joinOtherBtn} onPress={() => { setShowSelector(false); navigation.navigate('JoinCommunity'); }}>
              <Text style={styles.joinOtherText}>+ Unirme a otra comunidad</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.closeModal} onPress={() => setShowSelector(false)}>
              <Text style={styles.closeModalText}>Cerrar</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {flex: 1, backgroundColor: '#F8FAFC'},
  loading: {flex: 1, alignItems: 'center', justifyContent: 'center'},
  empty: {flex: 1, alignItems: 'center', justifyContent: 'center', padding: 40},
  emptyIcon: {width: 80, height: 80, borderRadius: 22, backgroundColor: '#EFF6FF', alignItems: 'center', justifyContent: 'center', marginBottom: 20},
  emptyP: {fontSize: 36, fontWeight: '800', color: '#2563EB'},
  emptyTitle: {fontFamily: 'Inter', fontSize: 20, fontWeight: '700', color: '#1E293B', textAlign: 'center', marginBottom: 8},
  emptyText: {fontFamily: 'Inter', fontSize: 15, color: '#64748B', textAlign: 'center', lineHeight: 22, marginBottom: 32},
  joinBtn: {backgroundColor: '#2563EB', paddingVertical: 14, paddingHorizontal: 32, borderRadius: 14},
  joinBtnText: {fontFamily: 'Inter', fontWeight: '700', fontSize: 16, color: '#fff'},
  header: {flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', padding: 20, paddingTop: 12},
  greeting: {fontFamily: 'Inter', fontSize: 14, color: '#64748B'},
  communitySelector: {flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 2},
  communityName: {fontFamily: 'Inter', fontSize: 20, fontWeight: '700', color: '#1E293B', maxWidth: 240},
  chevron: {fontSize: 16, color: '#2563EB'},
  logoutBtn: {paddingTop: 6},
  logoutText: {fontFamily: 'Inter', fontSize: 13, color: '#94A3B8'},
  subWarning: {marginHorizontal: 20, padding: 12, backgroundColor: '#FEF9C3', borderRadius: 10, marginBottom: 8},
  subWarningText: {fontFamily: 'Inter', fontSize: 13, color: '#854D0E', textAlign: 'center'},
  availSection: {paddingHorizontal: 20, marginBottom: 24},
  sectionTitle: {fontFamily: 'Inter', fontSize: 15, fontWeight: '600', color: '#475569', marginBottom: 12},
  availRow: {flexDirection: 'row', gap: 12},
  availCard: {flex: 1},
  availIcon: {fontSize: 24, marginBottom: 8},
  availNumber: {fontFamily: 'Inter', fontSize: 36, fontWeight: '800', color: '#1E293B'},
  availLabel: {fontFamily: 'Inter', fontSize: 13, color: '#64748B'},
  availSub: {fontFamily: 'Inter', fontSize: 11, color: '#94A3B8', marginTop: 2},
  progressBar: {height: 4, backgroundColor: '#F1F5F9', borderRadius: 2, marginTop: 12, overflow: 'hidden'},
  progressFill: {height: '100%', borderRadius: 2},
  vehiclesSection: {paddingHorizontal: 20, gap: 8},
  vehicleCard: {marginBottom: 0},
  vehicleRow: {flexDirection: 'row', alignItems: 'center', gap: 12},
  vehicleBadge: {backgroundColor: '#EFF6FF', paddingVertical: 6, paddingHorizontal: 10, borderRadius: 8},
  vehicleBadgeOver: {backgroundColor: '#FEF2F2'},
  vehiclePlate: {fontFamily: 'Inter', fontWeight: '700', fontSize: 14, color: '#1E293B'},
  vehicleInfo: {flex: 1},
  vehicleVisitor: {fontFamily: 'Inter', fontSize: 14, fontWeight: '500', color: '#1E293B'},
  vehicleDest: {fontFamily: 'Inter', fontSize: 12, color: '#94A3B8', marginTop: 2},
  vehicleTime: {alignItems: 'flex-end'},
  vehicleMinutes: {fontFamily: 'Inter', fontSize: 14, fontWeight: '600', color: '#1E293B'},
  vehicleOver: {color: '#EF4444'},
  vehicleOvertimeLabel: {fontFamily: 'Inter', fontSize: 11, color: '#EF4444', marginTop: 2},
  noVehicles: {fontFamily: 'Inter', fontSize: 14, color: '#94A3B8', textAlign: 'center'},
  modalOverlay: {position: 'absolute', inset: 0, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end'},
  modal: {backgroundColor: '#fff', borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24, paddingBottom: 40},
  modalTitle: {fontFamily: 'Inter', fontSize: 18, fontWeight: '700', color: '#1E293B', marginBottom: 16},
  communityOption: {padding: 16, borderRadius: 12, marginBottom: 8, backgroundColor: '#F8FAFC', flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center'},
  communityOptionActive: {backgroundColor: '#EFF6FF', borderWidth: 1.5, borderColor: '#2563EB'},
  communityOptionName: {fontFamily: 'Inter', fontSize: 15, fontWeight: '600', color: '#1E293B'},
  communityOptionComune: {fontFamily: 'Inter', fontSize: 13, color: '#64748B', marginTop: 2},
  homeBadge: {fontFamily: 'Inter', fontSize: 11, color: '#2563EB', fontWeight: '600', backgroundColor: '#DBEAFE', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6},
  joinOtherBtn: {alignItems: 'center', padding: 16},
  joinOtherText: {fontFamily: 'Inter', fontSize: 14, fontWeight: '600', color: '#2563EB'},
  closeModal: {alignItems: 'center', padding: 12},
  closeModalText: {fontFamily: 'Inter', fontSize: 14, color: '#94A3B8'},
});
