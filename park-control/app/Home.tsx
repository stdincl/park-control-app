import React, {useContext, useState, useCallback, useRef} from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet,
  SafeAreaView, RefreshControl, ActivityIndicator,
} from 'react-native';
import type {NativeStackScreenProps} from '@react-navigation/native-stack';
import type {RootStackParamList} from '../../App';
import {useFocusEffect} from '@react-navigation/native';
import Context from '@ctx/Contexto';
import Card from '@ui/Card';
import Feather from 'react-native-vector-icons/Feather';

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
  receptor_name: string;
}

type Props = NativeStackScreenProps<RootStackParamList, 'Home'>;

export default function Home({navigation}: Props) {
  const app = useContext(Context);
  const [communities, setCommunities] = useState<Community[]>([]);
  const [selectedCommunity, setSelectedCommunity] = useState<Community | null>(null);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showSelector, setShowSelector] = useState(false);

  // ref avoids stale closure in useFocusEffect without adding selectedCommunity to deps
  const selectedIdRef = useRef<number | null>(null);

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

  const loadCommunities = useCallback(async () => {
    try {
      const data = await app.api.getMyCommunities();
      setCommunities(data.communities);

      // Preserve current selection if still valid, otherwise pick home/first
      const currentId = selectedIdRef.current;
      const stillPresent = currentId != null && data.communities.find(c => c.id === currentId);
      const target = stillPresent
        ? data.communities.find(c => c.id === currentId)!
        : (data.communities.find(c => c.is_home) || data.communities[0] || null);

      selectedIdRef.current = target?.id ?? null;
      setSelectedCommunity(target);
      if (target) await loadVehicles(target.id);
    } catch {}
  }, [loadVehicles]);

  useFocusEffect(
    useCallback(() => {
      let active = true;
      (async () => {
        await loadCommunities();
        if (active) setLoading(false);
      })();
      return () => { active = false; };
    }, [loadCommunities]),
  );

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadCommunities();
    setRefreshing(false);
  }, [loadCommunities]);

  const selectCommunity = useCallback(async (community: Community) => {
    selectedIdRef.current = community.id;
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
          <TouchableOpacity style={styles.joinBtn} onPress={() => navigation.navigate('JoinCommunity', {})}>
            <Text style={styles.joinBtnText}>Unirse a una comunidad</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  const avail = selectedCommunity?.availability;
  const totalAvailable = avail ? avail.visitor_available + avail.disabled_available : 0;
  const totalSpots = avail ? avail.visitor_total + avail.disabled_total : 0;

  const formatMinutes = (m: number) => {
    if (m < 60) return `${m} min`;
    const h = Math.floor(m / 60);
    const rem = m % 60;
    return rem > 0 ? `${h}h ${rem} min` : `${h}h`;
  };

  const formatTime = (iso: string) => {
    try {
      return new Date(iso).toLocaleTimeString('es-CL', {hour: '2-digit', minute: '2-digit'});
    } catch { return ''; }
  };

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#2563EB" />}>

        {/* Hero / Community banner */}
        <View style={styles.hero}>
          <View style={styles.heroTop}>
            <View>
              <Text style={styles.greeting}>Hola, {app.user?.name?.split(' ')[0]}</Text>
              <TouchableOpacity style={styles.communitySelector} onPress={() => setShowSelector(true)}>
                <Text style={styles.communityName} numberOfLines={1}>{selectedCommunity?.name}</Text>
                <Feather name="chevron-down" size={16} color="rgba(255,255,255,0.7)" style={{marginTop: 2}} />
              </TouchableOpacity>
            </View>
            <TouchableOpacity onPress={() => navigation.navigate('Profile')} style={styles.profileBtn}>
              <View style={styles.profileAvatar}>
                <Text style={styles.profileInitial}>{(app.user?.name || 'U').charAt(0).toUpperCase()}</Text>
              </View>
            </TouchableOpacity>
          </View>

          {/* Big availability number */}
          {avail && (
            <View style={styles.heroBig}>
              <Text style={styles.heroBigNumber}>{totalAvailable}</Text>
              <Text style={styles.heroBigLabel}>de {totalSpots} espacios libres</Text>
              <View style={styles.heroMeta}>
                <View style={styles.heroMetaItem}>
                  <Feather name="map-pin" size={12} color="rgba(255,255,255,0.6)" />
                  <Text style={styles.heroMetaText}>{selectedCommunity?.comune}</Text>
                </View>
                <View style={styles.heroMetaDot} />
                <View style={styles.heroMetaItem}>
                  <Feather name="hash" size={12} color="rgba(255,255,255,0.6)" />
                  <Text style={styles.heroMetaText}>#{selectedCommunity?.identifier}</Text>
                </View>
              </View>
            </View>
          )}

          {/* Sub-cards: visitor + accessible */}
          {avail && (
            <View style={styles.heroCards}>
              <View style={styles.heroCard}>
                <Feather name="truck" size={14} color="rgba(255,255,255,0.8)" />
                <Text style={styles.heroCardNum}>{avail.visitor_available}</Text>
                <Text style={styles.heroCardLabel}>Visita</Text>
                <View style={styles.heroProgressBg}>
                  <View style={[styles.heroProgressFill, {
                    width: `${avail.visitor_total > 0 ? (avail.visitor_used / avail.visitor_total) * 100 : 0}%`,
                    backgroundColor: avail.visitor_available === 0 ? '#FCA5A5' : '#93C5FD',
                  }]} />
                </View>
              </View>
              <View style={[styles.heroCard, {borderLeftWidth: 1, borderLeftColor: 'rgba(255,255,255,0.15)'}]}>
                <Feather name="heart" size={14} color="rgba(255,255,255,0.8)" />
                <Text style={styles.heroCardNum}>{avail.disabled_available}</Text>
                <Text style={styles.heroCardLabel}>Accesible</Text>
                <View style={styles.heroProgressBg}>
                  <View style={[styles.heroProgressFill, {
                    width: `${avail.disabled_total > 0 ? (avail.disabled_used / avail.disabled_total) * 100 : 0}%`,
                    backgroundColor: '#C4B5FD',
                  }]} />
                </View>
              </View>
            </View>
          )}
        </View>

        {/* Subscription warning */}
        {selectedCommunity && !selectedCommunity.subscription_active && (
          <View style={styles.subWarning}>
            <Text style={styles.subWarningText}>La suscripción de esta comunidad está vencida</Text>
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
                    {v.disabled_spot && <Feather name="heart" size={10} color="#7C3AED" style={{marginTop: 2}} />}
                  </View>
                  <View style={styles.vehicleInfo}>
                    <Text style={styles.vehicleVisitor} numberOfLines={1}>{v.visitor_name}</Text>
                    <Text style={styles.vehicleDest} numberOfLines={1}>{v.destination}</Text>
                    <Text style={styles.vehicleReceptor} numberOfLines={1}>Recibido por {v.receptor_name}</Text>
                  </View>
                  <View style={styles.vehicleTime}>
                    <Text style={styles.vehicleEnteredAt}>{formatTime(v.entered_at)}</Text>
                    <Text style={[styles.vehicleMinutes, v.overtime_minutes > 0 && styles.vehicleOver]}>
                      {formatMinutes(v.minutes)}
                    </Text>
                    {v.overtime_minutes > 0 && (
                      <Text style={styles.vehicleOvertimeLabel}>+{formatMinutes(v.overtime_minutes)}</Text>
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
            <TouchableOpacity style={styles.joinOtherBtn} onPress={() => { setShowSelector(false); navigation.navigate('JoinCommunity', {}); }}>
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

  // Hero banner
  hero: {
    backgroundColor: '#1E40AF',
    paddingBottom: 28,
    borderBottomLeftRadius: 28,
    borderBottomRightRadius: 28,
    overflow: 'hidden',
  },
  heroTop: {flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', padding: 20, paddingTop: 16},
  greeting: {fontFamily: 'Inter', fontSize: 13, color: 'rgba(255,255,255,0.6)'},
  communitySelector: {flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 2},
  communityName: {fontFamily: 'Inter', fontSize: 18, fontWeight: '700', color: '#fff', maxWidth: 230},
  profileBtn: {paddingTop: 2},
  profileAvatar: {width: 38, height: 38, borderRadius: 19, backgroundColor: 'rgba(255,255,255,0.2)', alignItems: 'center', justifyContent: 'center'},
  profileInitial: {fontFamily: 'Inter', fontSize: 16, fontWeight: '700', color: '#fff'},
  heroBig: {alignItems: 'center', paddingVertical: 16},
  heroBigNumber: {fontFamily: 'Inter', fontSize: 72, fontWeight: '800', color: '#fff', lineHeight: 80},
  heroBigLabel: {fontFamily: 'Inter', fontSize: 14, color: 'rgba(255,255,255,0.6)', marginTop: 4},
  heroMeta: {flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 10},
  heroMetaItem: {flexDirection: 'row', alignItems: 'center', gap: 4},
  heroMetaText: {fontFamily: 'Inter', fontSize: 12, color: 'rgba(255,255,255,0.55)'},
  heroMetaDot: {width: 3, height: 3, borderRadius: 2, backgroundColor: 'rgba(255,255,255,0.3)'},
  heroCards: {flexDirection: 'row', marginHorizontal: 20, marginTop: 4},
  heroCard: {flex: 1, alignItems: 'center', paddingVertical: 12, gap: 4},
  heroCardNum: {fontFamily: 'Inter', fontSize: 28, fontWeight: '800', color: '#fff'},
  heroCardLabel: {fontFamily: 'Inter', fontSize: 11, color: 'rgba(255,255,255,0.6)', textTransform: 'uppercase', letterSpacing: 0.5},
  heroProgressBg: {width: '80%', height: 3, backgroundColor: 'rgba(255,255,255,0.15)', borderRadius: 2, marginTop: 6, overflow: 'hidden'},
  heroProgressFill: {height: '100%', borderRadius: 2},

  subWarning: {margin: 20, marginBottom: 0, padding: 12, backgroundColor: '#FEF9C3', borderRadius: 10},
  subWarningText: {fontFamily: 'Inter', fontSize: 13, color: '#854D0E', textAlign: 'center'},
  sectionTitle: {fontFamily: 'Inter', fontSize: 15, fontWeight: '600', color: '#475569', marginBottom: 12},
  vehiclesSection: {padding: 20, gap: 8},
  vehicleCard: {marginBottom: 0},
  vehicleRow: {flexDirection: 'row', alignItems: 'flex-start', gap: 12},
  vehicleBadge: {backgroundColor: '#EFF6FF', paddingVertical: 6, paddingHorizontal: 10, borderRadius: 8, alignItems: 'center', minWidth: 64},
  vehicleBadgeOver: {backgroundColor: '#FEF2F2'},
  vehiclePlate: {fontFamily: 'Inter', fontWeight: '700', fontSize: 13, color: '#1E293B'},
  vehicleInfo: {flex: 1},
  vehicleVisitor: {fontFamily: 'Inter', fontSize: 14, fontWeight: '500', color: '#1E293B'},
  vehicleDest: {fontFamily: 'Inter', fontSize: 12, color: '#64748B', marginTop: 1},
  vehicleReceptor: {fontFamily: 'Inter', fontSize: 11, color: '#94A3B8', marginTop: 3},
  vehicleTime: {alignItems: 'flex-end'},
  vehicleEnteredAt: {fontFamily: 'Inter', fontSize: 12, color: '#64748B', marginBottom: 2},
  vehicleMinutes: {fontFamily: 'Inter', fontSize: 13, fontWeight: '600', color: '#1E293B'},
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
