import React, {useContext, useState, useCallback, useRef} from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet, Alert,
  StatusBar, Platform, ImageBackground, RefreshControl, ActivityIndicator,
} from 'react-native';
import {SafeAreaView, useSafeAreaInsets} from 'react-native-safe-area-context';
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
  banner: string | null;
  is_home: boolean;
  subscription_active: boolean;
  reservations_enabled: boolean;
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
  const insets = useSafeAreaInsets();
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
      <View style={[styles.safe, {paddingTop: insets.top}]}>
        <StatusBar translucent backgroundColor="transparent" barStyle="dark-content" />
        <View style={styles.loading}>
          <ActivityIndicator color="#2563EB" size="large" />
        </View>
      </View>
    );
  }

  if (communities.length === 0) {
    return (
      <View style={[styles.safe, {paddingTop: insets.top}]}>
        <StatusBar translucent backgroundColor="transparent" barStyle="dark-content" />
        {/* Profile button top-right */}
        <View style={styles.emptyHeader}>
          <TouchableOpacity style={styles.emptyProfileBtn} onPress={() => navigation.navigate('Profile')}>
            <View style={styles.emptyAvatar}>
              <Text style={styles.emptyAvatarText}>{(app.user?.name || 'U').charAt(0).toUpperCase()}</Text>
            </View>
          </TouchableOpacity>
        </View>
        <View style={styles.empty}>
          <View style={styles.emptyIcon}><Text style={styles.emptyP}>P</Text></View>
          <Text style={styles.emptyTitle}>No estás en ninguna comunidad</Text>
          <Text style={styles.emptyText}>Únete a tu condominio para ver la disponibilidad de estacionamientos</Text>
          <TouchableOpacity style={styles.joinBtn} onPress={() => navigation.navigate('JoinCommunity', {})}>
            <Text style={styles.joinBtnText}>Unirse a una comunidad</Text>
          </TouchableOpacity>
        </View>
      </View>
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

  const formatDateTime = (iso: string) => {
    try {
      const d = new Date(iso);
      const date = d.toLocaleDateString('es-CL', {day: '2-digit', month: '2-digit'});
      const time = d.toLocaleTimeString('es-CL', {hour: '2-digit', minute: '2-digit'});
      return `${date} · ${time}`;
    } catch { return ''; }
  };

  const bannerUri = selectedCommunity?.banner;

  return (
    <View style={styles.safe}>
      <StatusBar translucent backgroundColor="transparent" barStyle="light-content" />

      {/* Hero / Community banner — fixed, not scrollable */}
      <ImageBackground
        source={bannerUri ? {uri: bannerUri} : undefined}
        style={styles.hero}
        imageStyle={styles.heroBgImage}>
        <View style={styles.heroOverlay} />

        <View style={[styles.heroTop, {paddingTop: insets.top + 16}]}>
          <View style={{flex: 1}}>
            <Text style={styles.greeting}>Hola, {app.user?.name?.split(' ')[0]}</Text>
            <TouchableOpacity style={styles.communitySelector} onPress={() => setShowSelector(true)}>
              <Text style={styles.communityName} numberOfLines={1}>{selectedCommunity?.name}</Text>
              <Feather name="chevron-down" size={16} color="rgba(255,255,255,0.7)" style={{marginTop: 2}} />
            </TouchableOpacity>
          </View>
          <View style={styles.heroActions}>
            <TouchableOpacity onPress={onRefresh} style={styles.heroIconBtn} disabled={refreshing}>
              <Feather name="refresh-cw" size={16} color="rgba(255,255,255,0.85)" />
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.heroIconBtn}
              onPress={() => {
                if ((selectedCommunity as any).reservations_enabled) {
                  navigation.navigate('Reservations', {
                    communityId: selectedCommunity!.id,
                    communityName: selectedCommunity!.name,
                  });
                } else {
                  Alert.alert('Reservas no disponibles', 'El sistema de reservas no está habilitado en esta comunidad.');
                }
              }}>
              <Feather name="calendar" size={16} color="rgba(255,255,255,0.85)" />
            </TouchableOpacity>
            <TouchableOpacity onPress={() => navigation.navigate('Profile')} style={styles.profileBtn}>
              <View style={styles.profileAvatar}>
                <Text style={styles.profileInitial}>{(app.user?.name || 'U').charAt(0).toUpperCase()}</Text>
              </View>
            </TouchableOpacity>
          </View>
        </View>

        {avail && (
          <View style={styles.heroBig}>
            <Text style={styles.heroBigNumber}>{totalAvailable}</Text>
            <Text style={styles.heroBigLabel}>estacionamientos disponibles</Text>
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

      </ImageBackground>

      {/* Scrollable body — only vehicles list scrolls, header stays fixed */}
      <ScrollView
        style={styles.body}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#2563EB" />}>

        {selectedCommunity && !selectedCommunity.subscription_active && (
          <View style={styles.subWarning}>
            <Text style={styles.subWarningText}>La suscripción de esta comunidad está vencida</Text>
          </View>
        )}

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
                    <Text style={styles.vehicleReceptor} numberOfLines={1}>por {v.receptor_name}</Text>
                    <Text style={styles.vehicleEnteredAt} numberOfLines={1}>{formatDateTime(v.entered_at)}</Text>
                  </View>
                  <View style={styles.vehicleTime}>
                    <Text style={[styles.vehicleMinutes, v.overtime_minutes > 0 && styles.vehicleOver]}>
                      {formatMinutes(v.minutes)}
                    </Text>
                    {v.overtime_minutes > 0 && (
                      <View style={styles.vehicleOverBadge}>
                        <Feather name="alert-triangle" size={10} color="#EF4444" />
                        <Text style={styles.vehicleOvertimeLabel}>+{formatMinutes(v.overtime_minutes)}</Text>
                      </View>
                    )}
                  </View>
                </View>
              </Card>
            ))
          )}
        </View>

        <View style={{height: 24}} />
      </ScrollView>

      {/* Community selector modal */}
      {showSelector && (
        <View style={[styles.modalOverlay, {paddingTop: insets.top}]}>
          <View style={[styles.modal, {paddingBottom: insets.bottom + 24}]}>
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
    </View>
  );
}

const styles = StyleSheet.create({
  safe: {flex: 1, backgroundColor: '#F8FAFC'},
  body: {flex: 1, backgroundColor: '#F8FAFC'},
  loading: {flex: 1, alignItems: 'center', justifyContent: 'center'},
  emptyHeader: {flexDirection: 'row', justifyContent: 'flex-end', paddingHorizontal: 20, paddingTop: 12},
  emptyProfileBtn: {},
  emptyAvatar: {width: 38, height: 38, borderRadius: 19, backgroundColor: '#E0E7FF', alignItems: 'center', justifyContent: 'center'},
  emptyAvatarText: {fontFamily: 'Inter-Bold', fontSize: 16, color: '#4F46E5'},
  empty: {flex: 1, alignItems: 'center', justifyContent: 'center', padding: 40},
  emptyIcon: {width: 80, height: 80, borderRadius: 22, backgroundColor: '#EFF6FF', alignItems: 'center', justifyContent: 'center', marginBottom: 20},
  emptyP: {fontSize: 36, fontWeight: '800', color: '#2563EB'},
  emptyTitle: {fontFamily: 'Inter', fontSize: 20, fontWeight: '700', color: '#1E293B', textAlign: 'center', marginBottom: 8},
  emptyText: {fontFamily: 'Inter', fontSize: 15, color: '#64748B', textAlign: 'center', lineHeight: 22, marginBottom: 32},
  joinBtn: {backgroundColor: '#2563EB', paddingVertical: 14, paddingHorizontal: 32, borderRadius: 14},
  joinBtnText: {fontFamily: 'Inter', fontWeight: '700', fontSize: 16, color: '#fff'},

  // Hero banner
  hero: {
    paddingBottom: 28,
    borderBottomLeftRadius: 28,
    borderBottomRightRadius: 28,
    overflow: 'hidden',
    backgroundColor: '#1E40AF',
  },
  heroBgImage: {borderBottomLeftRadius: 28, borderBottomRightRadius: 28},
  heroOverlay: {
    ...StyleSheet.absoluteFill,
    backgroundColor: '#1E40AF',
    opacity: 0.82,
    borderBottomLeftRadius: 28,
    borderBottomRightRadius: 28,
  },
  heroTop: {flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', paddingHorizontal: 20, paddingBottom: 8},
  heroActions: {flexDirection: 'row', alignItems: 'center', gap: 10, paddingTop: 2},
  heroIconBtn: {width: 36, height: 36, borderRadius: 18, backgroundColor: 'rgba(255,255,255,0.15)', alignItems: 'center', justifyContent: 'center'},
  greeting: {fontFamily: 'Inter', fontSize: 13, color: 'rgba(255,255,255,0.6)'},
  communitySelector: {flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 2},
  communityName: {fontFamily: 'Inter', fontSize: 18, fontWeight: '700', color: '#fff', maxWidth: 200},
  profileBtn: {},
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
  vehicleRow: {flexDirection: 'row', alignItems: 'center', gap: 12},
  vehicleBadge: {backgroundColor: '#EFF6FF', paddingVertical: 8, paddingHorizontal: 12, borderRadius: 10, alignItems: 'center', minWidth: 72},
  vehicleBadgeOver: {backgroundColor: '#FEF2F2'},
  vehiclePlate: {fontFamily: 'Inter', fontWeight: '800', fontSize: 14, color: '#1E293B', letterSpacing: 0.5},
  vehicleInfo: {flex: 1},
  vehicleReceptor: {fontFamily: 'Inter', fontSize: 12, fontWeight: '500', color: '#475569'},
  vehicleEnteredAt: {fontFamily: 'Inter', fontSize: 11, color: '#94A3B8', marginTop: 2},
  vehicleTime: {alignItems: 'flex-end', gap: 4},
  vehicleMinutes: {fontFamily: 'Inter', fontSize: 14, fontWeight: '700', color: '#1E293B'},
  vehicleOver: {color: '#EF4444'},
  vehicleOverBadge: {flexDirection: 'row', alignItems: 'center', gap: 3, backgroundColor: '#FEF2F2', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6},
  vehicleOvertimeLabel: {fontFamily: 'Inter', fontSize: 11, fontWeight: '600', color: '#EF4444'},
  noVehicles: {fontFamily: 'Inter', fontSize: 14, color: '#94A3B8', textAlign: 'center'},
  bottomBar: {paddingHorizontal: 20, paddingTop: 12, backgroundColor: '#F8FAFC', borderTopWidth: 1, borderTopColor: '#E2E8F0'},
  actionBtn: {flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, paddingVertical: 16, borderRadius: 14, borderWidth: 2, borderColor: '#2563EB', backgroundColor: 'transparent'},
  actionBtnDisabled: {borderColor: '#CBD5E1', backgroundColor: 'transparent'},
  actionBtnText: {fontFamily: 'Inter', fontSize: 16, fontWeight: '700', color: '#2563EB'},
  actionBtnTextDisabled: {color: '#94A3B8'},
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
