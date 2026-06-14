import React, {useContext, useState, useCallback, useRef, useEffect} from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet, Alert,
  StatusBar, RefreshControl, ActivityIndicator,
  Animated, Easing, TouchableWithoutFeedback, ImageBackground,
} from 'react-native';
import {SafeAreaView, useSafeAreaInsets} from 'react-native-safe-area-context';
import type {NativeStackScreenProps} from '@react-navigation/native-stack';
import type {RootStackParamList} from '../../App';
import {useFocusEffect} from '@react-navigation/native';
import Context from '@ctx/Contexto';
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

function AnimatedCard({delay = 0, children}: {delay?: number; children: React.ReactNode}) {
  const anim = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.timing(anim, {
      toValue: 1, duration: 320, delay,
      useNativeDriver: true, easing: Easing.out(Easing.cubic),
    }).start();
  }, []);
  return (
    <Animated.View style={{
      opacity: anim,
      transform: [{translateY: anim.interpolate({inputRange: [0, 1], outputRange: [10, 0]})}],
    }}>
      {children}
    </Animated.View>
  );
}

function PulseView({style, children}: {style?: any; children: React.ReactNode}) {
  const pulse = useRef(new Animated.Value(1)).current;
  useEffect(() => {
    const anim = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, {toValue: 0.3, duration: 900, useNativeDriver: true}),
        Animated.timing(pulse, {toValue: 1, duration: 900, useNativeDriver: true}),
      ]),
    );
    anim.start();
    return () => anim.stop();
  }, []);
  return <Animated.View style={[style, {opacity: pulse}]}>{children}</Animated.View>;
}

export default function Home({navigation}: Props) {
  const app = useContext(Context);
  const insets = useSafeAreaInsets();
  const [communities, setCommunities] = useState<Community[]>([]);
  const [selectedCommunity, setSelectedCommunity] = useState<Community | null>(null);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showSelector, setShowSelector] = useState(false);

  const selectedIdRef = useRef<number | null>(null);

  const avail = selectedCommunity?.availability;
  const totalAvailable = avail ? avail.visitor_available + avail.disabled_available : 0;
  const totalSpots = avail ? avail.visitor_total + avail.disabled_total : 0;

  const modalAnim = useRef(new Animated.Value(0)).current;
  const heroAnim = useRef(new Animated.Value(0)).current;
  const countAnim = useRef(new Animated.Value(0)).current;
  const [countDisplay, setCountDisplay] = useState(0);

  useEffect(() => {
    const id = countAnim.addListener(({value}) => setCountDisplay(Math.round(value)));
    return () => countAnim.removeListener(id);
  }, []);

  useEffect(() => {
    Animated.timing(countAnim, {
      toValue: totalAvailable,
      duration: 650,
      useNativeDriver: false,
      easing: Easing.out(Easing.cubic),
    }).start();
  }, [totalAvailable]);

  useEffect(() => {
    Animated.timing(modalAnim, {
      toValue: showSelector ? 1 : 0,
      duration: 260,
      useNativeDriver: true,
      easing: showSelector ? Easing.out(Easing.cubic) : Easing.in(Easing.quad),
    }).start();
  }, [showSelector]);

  useEffect(() => {
    if (!selectedCommunity) return;
    heroAnim.setValue(0);
    Animated.timing(heroAnim, {
      toValue: 1,
      duration: 420,
      delay: 60,
      useNativeDriver: true,
      easing: Easing.out(Easing.cubic),
    }).start();
  }, [selectedCommunity?.id]);

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

      const currentId = selectedIdRef.current;
      const stillPresent = currentId != null && data.communities.find((c: Community) => c.id === currentId);
      const target = stillPresent
        ? data.communities.find((c: Community) => c.id === currentId)!
        : (data.communities.find((c: Community) => c.is_home) || data.communities[0] || null);

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

  const formatMinutes = (m: number) => {
    if (m < 60) return `${m} min`;
    const h = Math.floor(m / 60);
    const rem = m % 60;
    return rem > 0 ? `${h}h ${rem}m` : `${h}h`;
  };

  const formatDateTime = (iso: string) => {
    try {
      const d = new Date(iso);
      const date = d.toLocaleDateString('es-CL', {day: '2-digit', month: '2-digit'});
      const time = d.toLocaleTimeString('es-CL', {hour: '2-digit', minute: '2-digit'});
      return `${date} · ${time}`;
    } catch { return ''; }
  };

  const timeGreeting = (() => {
    const h = new Date().getHours();
    if (h < 12) return 'Buenos días';
    if (h < 19) return 'Buenas tardes';
    return 'Buenas noches';
  })();

  if (loading) {
    return (
      <View style={[styles.root, {paddingTop: insets.top}]}>
        <StatusBar translucent backgroundColor="transparent" barStyle="dark-content" />
        <View style={styles.loading}>
          <ActivityIndicator color="#2563EB" size="large" />
        </View>
      </View>
    );
  }

  if (communities.length === 0) {
    return (
      <SafeAreaView style={styles.root} edges={['top']}>
        <StatusBar barStyle="dark-content" backgroundColor="#F8FAFC" />
        <View style={styles.emptyHeader}>
          <TouchableOpacity onPress={() => navigation.navigate('Profile')} style={styles.emptyProfileBtn}>
            <View style={styles.emptyAvatar}>
              <Text style={styles.emptyAvatarText}>{(app.user?.name || 'U').charAt(0).toUpperCase()}</Text>
            </View>
          </TouchableOpacity>
        </View>
        <View style={styles.empty}>
          <View style={styles.emptyIcon}>
            <Feather name="shield" size={36} color="#2563EB" />
          </View>
          <Text style={styles.emptyTitle}>Sin comunidades aún</Text>
          <Text style={styles.emptyText}>Busca tu condominio para ver los estacionamientos de visita disponibles</Text>
          <TouchableOpacity style={styles.joinBtn} onPress={() => navigation.navigate('JoinCommunity', {})}>
            <Text style={styles.joinBtnText}>Buscar mi condominio</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  const bigLabel = totalAvailable === 0
    ? 'sin disponibilidad'
    : totalAvailable === 1
    ? 'lugar disponible'
    : 'lugares disponibles';

  const fillPct = totalSpots > 0 ? (totalSpots - totalAvailable) / totalSpots : 0;
  const fillColor = fillPct > 0.85 ? '#DC2626' : fillPct > 0.6 ? '#D97706' : '#2563EB';

  const bannerUri = selectedCommunity?.banner;

  return (
    <View style={styles.root}>
      <StatusBar translucent backgroundColor="transparent" barStyle="dark-content" />

      {/* Top bar */}
      <ImageBackground
        source={bannerUri ? {uri: bannerUri} : undefined}
        style={styles.topBar}
        imageStyle={styles.topBarImage}>
        {bannerUri ? <View style={styles.topBarScrim} /> : null}

        <View style={[styles.topBarInner, {paddingTop: insets.top + 16}]}>
          <View style={styles.topBarLeft}>
            <Text style={styles.greeting}>{timeGreeting}</Text>
            <TouchableOpacity style={styles.communitySelector} onPress={() => setShowSelector(true)}>
              <Text style={styles.communityName} numberOfLines={1}>{selectedCommunity?.name}</Text>
              <Feather name="chevron-down" size={15} color="#64748B" style={{marginTop: 1}} />
            </TouchableOpacity>
          </View>
          <View style={styles.topBarRight}>
            <TouchableOpacity style={styles.iconBtn} onPress={onRefresh} disabled={refreshing}>
              <Feather name="refresh-cw" size={15} color="#64748B" />
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.iconBtn}
              onPress={() => {
                if ((selectedCommunity as any)?.reservations_enabled) {
                  navigation.navigate('Reservations', {
                    communityId: selectedCommunity!.id,
                    communityName: selectedCommunity!.name,
                  });
                } else {
                  Alert.alert('Reservas no disponibles', 'El sistema de reservas no está habilitado en esta comunidad.');
                }
              }}>
              <Feather name="calendar" size={15} color="#64748B" />
            </TouchableOpacity>
            <TouchableOpacity onPress={() => navigation.navigate('Profile')} style={styles.avatarBtn}>
              <Text style={styles.avatarInitial}>{(app.user?.name || 'U').charAt(0).toUpperCase()}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </ImageBackground>

      {/* Availability card */}
      {avail && (
        <Animated.View style={[
          styles.availPanel,
          {
            opacity: heroAnim,
            transform: [{translateY: heroAnim.interpolate({inputRange: [0, 1], outputRange: [10, 0]})}],
          },
        ]}>
          <View style={styles.availCard}>
            <View style={styles.availMain}>
              <Text style={[styles.availNumber, totalAvailable === 0 && styles.availNumberEmpty]}>
                {countDisplay}
              </Text>
              <View style={styles.availRight}>
                <Text style={[styles.availLabel, totalAvailable === 0 && styles.availLabelEmpty]}>
                  {bigLabel}
                </Text>
                <View style={styles.availPills}>
                  {avail.visitor_total > 0 && (
                    <View style={styles.pill}>
                      <Text style={styles.pillText}>{avail.visitor_available}/{avail.visitor_total} visita</Text>
                    </View>
                  )}
                  {avail.disabled_total > 0 && (
                    <View style={styles.pill}>
                      <Text style={styles.pillText}>{avail.disabled_available}/{avail.disabled_total} accesib.</Text>
                    </View>
                  )}
                </View>
              </View>
            </View>
            {totalSpots > 0 && (
              <View style={styles.fillBg}>
                <View style={[styles.fillBar, {width: `${Math.round(fillPct * 100)}%`, backgroundColor: fillColor}]} />
              </View>
            )}
            <View style={styles.availMeta}>
              <Feather name="map-pin" size={11} color="#CBD5E1" />
              <Text style={styles.availMetaText}>{selectedCommunity?.comune}</Text>
              <View style={styles.metaDot} />
              <Feather name="hash" size={11} color="#CBD5E1" />
              <Text style={styles.availMetaText}>{selectedCommunity?.identifier}</Text>
            </View>
          </View>
        </Animated.View>
      )}

      {/* Vehicle list */}
      <ScrollView
        style={styles.body}
        contentContainerStyle={styles.bodyContent}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor="#2563EB"
            colors={['#2563EB']}
          />
        }>

        {selectedCommunity && !selectedCommunity.subscription_active && (
          <View style={styles.subWarning}>
            <Feather name="alert-circle" size={14} color="#DC2626" />
            <Text style={styles.subWarningText}>Suscripción vencida en esta comunidad</Text>
          </View>
        )}

        <View style={styles.listHeader}>
          <Text style={styles.listTitle}>Estacionados</Text>
          <View style={styles.countBadge}>
            <Text style={styles.countBadgeText}>{vehicles.length}</Text>
          </View>
        </View>

        {vehicles.length === 0 ? (
          <View style={styles.emptyList}>
            <Feather name="check-circle" size={22} color="#CBD5E1" />
            <Text style={styles.emptyListText}>Ningún vehículo estacionado</Text>
          </View>
        ) : (
          vehicles.map((v, index) => (
            <AnimatedCard key={v.id} delay={index * 50}>
              <View style={styles.vehicleCard}>
                <View style={[styles.plateBadge, v.overtime_minutes > 0 && styles.plateBadgeOver]}>
                  <Text style={[styles.plateText, v.overtime_minutes > 0 && styles.plateTextOver]}>{v.plate}</Text>
                </View>
                <View style={styles.vehicleInfo}>
                  <Text style={styles.vehicleDestination} numberOfLines={1}>{v.destination}</Text>
                  <Text style={styles.vehicleMeta} numberOfLines={1}>
                    {v.visitor_name} · {formatDateTime(v.entered_at)}
                  </Text>
                </View>
                <View style={styles.vehicleTime}>
                  <Text style={[styles.vehicleMinutes, v.overtime_minutes > 0 && styles.vehicleOver]}>
                    {formatMinutes(v.minutes)}
                  </Text>
                  {v.overtime_minutes > 0 && (
                    <PulseView style={styles.overtimeBadge}>
                      <Feather name="alert-triangle" size={9} color="#DC2626" />
                      <Text style={styles.overtimeText}>+{formatMinutes(v.overtime_minutes)}</Text>
                    </PulseView>
                  )}
                </View>
              </View>
            </AnimatedCard>
          ))
        )}

        <View style={{height: insets.bottom + 24}} />
      </ScrollView>

      {/* Community selector sheet */}
      <View
        style={styles.modalOverlay}
        pointerEvents={showSelector ? 'auto' : 'none'}>
        <TouchableWithoutFeedback onPress={() => setShowSelector(false)}>
          <Animated.View style={[StyleSheet.absoluteFill, {backgroundColor: 'rgba(15,23,42,0.4)', opacity: modalAnim}]} />
        </TouchableWithoutFeedback>
        <Animated.View style={[
          styles.sheet,
          {paddingBottom: insets.bottom + 20},
          {transform: [{translateY: modalAnim.interpolate({inputRange: [0, 1], outputRange: [360, 0]})}]},
        ]}>
          <View style={styles.sheetHandle} />
          <Text style={styles.sheetTitle}>Cambiar comunidad</Text>
          {communities.map(c => (
            <TouchableOpacity
              key={c.id}
              style={[styles.sheetOption, c.id === selectedCommunity?.id && styles.sheetOptionActive]}
              onPress={() => selectCommunity(c)}>
              <View style={styles.sheetOptionLeft}>
                <View style={[styles.sheetOptionDot, c.id === selectedCommunity?.id && styles.sheetOptionDotActive]} />
                <View>
                  <Text style={styles.sheetOptionName}>{c.name}</Text>
                  <Text style={styles.sheetOptionComune}>{c.comune}</Text>
                </View>
              </View>
              {c.is_home && (
                <View style={styles.homePill}>
                  <Text style={styles.homePillText}>Principal</Text>
                </View>
              )}
            </TouchableOpacity>
          ))}
          <TouchableOpacity
            style={styles.joinOtherBtn}
            onPress={() => { setShowSelector(false); navigation.navigate('JoinCommunity', {}); }}>
            <Feather name="plus" size={15} color="#2563EB" />
            <Text style={styles.joinOtherText}>Unirme a otra comunidad</Text>
          </TouchableOpacity>
        </Animated.View>
      </View>
    </View>
  );
}

const cardShadow = {
  shadowColor: '#64748B',
  shadowOffset: {width: 0, height: 1},
  shadowOpacity: 0.08,
  shadowRadius: 8,
  elevation: 2,
} as const;

const styles = StyleSheet.create({
  root: {flex: 1, backgroundColor: '#F8FAFC'},
  loading: {flex: 1, alignItems: 'center', justifyContent: 'center'},

  emptyHeader: {flexDirection: 'row', justifyContent: 'flex-end', paddingHorizontal: 20, paddingTop: 12},
  emptyProfileBtn: {},
  emptyAvatar: {
    width: 38, height: 38, borderRadius: 19,
    backgroundColor: 'rgba(37,99,235,0.1)',
    alignItems: 'center', justifyContent: 'center',
  },
  emptyAvatarText: {fontFamily: 'Inter', fontSize: 15, fontWeight: '700', color: '#2563EB'},
  empty: {flex: 1, alignItems: 'center', justifyContent: 'center', padding: 40},
  emptyIcon: {
    width: 80, height: 80, borderRadius: 22,
    backgroundColor: 'rgba(37,99,235,0.06)',
    borderWidth: 1, borderColor: 'rgba(37,99,235,0.12)',
    alignItems: 'center', justifyContent: 'center', marginBottom: 20,
  },
  emptyTitle: {fontFamily: 'Inter', fontSize: 20, fontWeight: '700', color: '#0F172A', textAlign: 'center', marginBottom: 8},
  emptyText: {fontFamily: 'Inter', fontSize: 14, color: '#64748B', textAlign: 'center', lineHeight: 21, marginBottom: 32},
  joinBtn: {backgroundColor: '#2563EB', paddingVertical: 14, paddingHorizontal: 28, borderRadius: 14},
  joinBtnText: {fontFamily: 'Inter', fontWeight: '700', fontSize: 15, color: '#fff'},

  topBar: {backgroundColor: '#FFFFFF', borderBottomWidth: 1, borderBottomColor: '#F1F5F9'},
  topBarImage: {},
  topBarScrim: {...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(255,255,255,0.92)'},
  topBarInner: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start',
    paddingHorizontal: 20, paddingBottom: 16,
  },
  topBarLeft: {flex: 1},
  topBarRight: {flexDirection: 'row', alignItems: 'center', gap: 8, paddingTop: 2},
  greeting: {fontFamily: 'Inter', fontSize: 12, color: '#94A3B8', marginBottom: 3},
  communitySelector: {flexDirection: 'row', alignItems: 'center', gap: 5},
  communityName: {fontFamily: 'Inter', fontSize: 18, fontWeight: '700', color: '#0F172A', maxWidth: 200},
  iconBtn: {
    width: 34, height: 34, borderRadius: 17,
    backgroundColor: '#F1F5F9',
    alignItems: 'center', justifyContent: 'center',
  },
  avatarBtn: {
    width: 34, height: 34, borderRadius: 17,
    backgroundColor: '#2563EB',
    alignItems: 'center', justifyContent: 'center',
  },
  avatarInitial: {fontFamily: 'Inter', fontSize: 14, fontWeight: '700', color: '#fff'},

  availPanel: {paddingHorizontal: 20, paddingTop: 16, paddingBottom: 4},
  availCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    borderWidth: 1, borderColor: '#F1F5F9',
    padding: 18,
    ...cardShadow,
  },
  availMain: {flexDirection: 'row', alignItems: 'center', gap: 14, marginBottom: 12},
  availNumber: {fontFamily: 'Inter', fontSize: 56, fontWeight: '800', color: '#0F172A', lineHeight: 60},
  availNumberEmpty: {color: '#DC2626'},
  availRight: {flex: 1, gap: 8},
  availLabel: {fontFamily: 'Inter', fontSize: 15, fontWeight: '500', color: '#64748B'},
  availLabelEmpty: {color: '#DC2626'},
  availPills: {flexDirection: 'row', gap: 6, flexWrap: 'wrap'},
  pill: {
    paddingHorizontal: 9, paddingVertical: 3,
    backgroundColor: 'rgba(37,99,235,0.07)',
    borderRadius: 20, borderWidth: 1, borderColor: 'rgba(37,99,235,0.15)',
  },
  pillText: {fontFamily: 'Inter', fontSize: 11, color: '#2563EB', fontWeight: '500'},
  fillBg: {height: 3, backgroundColor: '#F1F5F9', borderRadius: 2, marginBottom: 12, overflow: 'hidden'},
  fillBar: {height: 3, borderRadius: 2},
  availMeta: {flexDirection: 'row', alignItems: 'center', gap: 5},
  availMetaText: {fontFamily: 'Inter', fontSize: 12, color: '#CBD5E1'},
  metaDot: {width: 2, height: 2, borderRadius: 1, backgroundColor: '#CBD5E1'},

  body: {flex: 1},
  bodyContent: {paddingHorizontal: 20, paddingTop: 20},

  subWarning: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: 'rgba(220,38,38,0.05)',
    borderWidth: 1, borderColor: 'rgba(220,38,38,0.15)',
    borderRadius: 12, padding: 12, marginBottom: 20,
  },
  subWarningText: {fontFamily: 'Inter', fontSize: 13, color: '#DC2626'},

  listHeader: {flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12},
  listTitle: {fontFamily: 'Inter', fontSize: 15, fontWeight: '600', color: '#64748B'},
  countBadge: {
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 8, paddingVertical: 2,
    borderRadius: 10,
  },
  countBadgeText: {fontFamily: 'Inter', fontSize: 12, fontWeight: '600', color: '#94A3B8'},

  emptyList: {alignItems: 'center', paddingVertical: 40, gap: 10},
  emptyListText: {fontFamily: 'Inter', fontSize: 14, color: '#CBD5E1'},

  vehicleCard: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    backgroundColor: '#FFFFFF',
    borderRadius: 16, borderWidth: 1, borderColor: '#F1F5F9',
    padding: 14, marginBottom: 8,
    ...cardShadow,
  },
  plateBadge: {
    backgroundColor: 'rgba(37,99,235,0.07)',
    borderWidth: 1, borderColor: 'rgba(37,99,235,0.15)',
    paddingVertical: 7, paddingHorizontal: 11,
    borderRadius: 10, alignItems: 'center', minWidth: 72,
  },
  plateBadgeOver: {
    backgroundColor: 'rgba(220,38,38,0.06)',
    borderColor: 'rgba(220,38,38,0.15)',
  },
  plateText: {fontFamily: 'Inter', fontWeight: '800', fontSize: 13, color: '#2563EB', letterSpacing: 0.5},
  plateTextOver: {color: '#DC2626'},
  vehicleInfo: {flex: 1},
  vehicleDestination: {fontFamily: 'Inter', fontSize: 14, fontWeight: '500', color: '#0F172A'},
  vehicleMeta: {fontFamily: 'Inter', fontSize: 12, color: '#94A3B8', marginTop: 2},
  vehicleTime: {alignItems: 'flex-end', gap: 4},
  vehicleMinutes: {fontFamily: 'Inter', fontSize: 14, fontWeight: '700', color: '#0F172A'},
  vehicleOver: {color: '#DC2626'},
  overtimeBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 3,
    backgroundColor: 'rgba(220,38,38,0.08)',
    paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6,
  },
  overtimeText: {fontFamily: 'Inter', fontSize: 10, fontWeight: '600', color: '#DC2626'},

  modalOverlay: {position: 'absolute', inset: 0, justifyContent: 'flex-end'},
  sheet: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 24, borderTopRightRadius: 24,
    padding: 20,
    borderTopWidth: 1, borderColor: '#E2E8F0',
    shadowColor: '#000', shadowOffset: {width: 0, height: -2},
    shadowOpacity: 0.06, shadowRadius: 12, elevation: 8,
  },
  sheetHandle: {
    width: 36, height: 4, borderRadius: 2,
    backgroundColor: '#E2E8F0',
    alignSelf: 'center', marginBottom: 16,
  },
  sheetTitle: {fontFamily: 'Inter', fontSize: 16, fontWeight: '700', color: '#0F172A', marginBottom: 14},
  sheetOption: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    padding: 14, borderRadius: 12, marginBottom: 6,
    backgroundColor: '#F8FAFC',
  },
  sheetOptionActive: {
    backgroundColor: 'rgba(37,99,235,0.05)',
    borderWidth: 1, borderColor: 'rgba(37,99,235,0.2)',
  },
  sheetOptionLeft: {flexDirection: 'row', alignItems: 'center', gap: 12},
  sheetOptionDot: {width: 8, height: 8, borderRadius: 4, backgroundColor: '#E2E8F0'},
  sheetOptionDotActive: {backgroundColor: '#2563EB'},
  sheetOptionName: {fontFamily: 'Inter', fontSize: 15, fontWeight: '600', color: '#0F172A'},
  sheetOptionComune: {fontFamily: 'Inter', fontSize: 13, color: '#64748B', marginTop: 1},
  homePill: {backgroundColor: 'rgba(37,99,235,0.08)', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6},
  homePillText: {fontFamily: 'Inter', fontSize: 11, color: '#2563EB', fontWeight: '600'},
  joinOtherBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 8, paddingVertical: 14, marginTop: 6,
  },
  joinOtherText: {fontFamily: 'Inter', fontSize: 14, fontWeight: '600', color: '#2563EB'},
});
