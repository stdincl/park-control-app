import React, {useContext, useState, useCallback, useEffect, useRef} from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet,
  ActivityIndicator, Modal, Alert, StatusBar,
} from 'react-native';
import {Calendar} from 'react-native-calendars';
import {SafeAreaView, useSafeAreaInsets} from 'react-native-safe-area-context';
import type {NativeStackScreenProps} from '@react-navigation/native-stack';
import type {RootStackParamList} from '../../App';
import Context from '@ctx/Contexto';
import Feather from 'react-native-vector-icons/Feather';

type Props = NativeStackScreenProps<RootStackParamList, 'Reservations'>;

const STATUS_LABELS: Record<string, string> = {
  pending: 'Pendiente',
  approved: 'Aprobada',
  rejected: 'Rechazada',
};

const STATUS_COLORS: Record<string, {bg: string; text: string}> = {
  pending: {bg: '#FEF3C7', text: '#92400E'},
  approved: {bg: '#D1FAE5', text: '#065F46'},
  rejected: {bg: '#FEE2E2', text: '#991B1B'},
};

// ── Time picker wheel ─────────────────────────────────────────────────────────
const HOURS   = Array.from({length: 24}, (_, i) => i);
const MINUTES = [0, 15, 30, 45];
const ITEM_H  = 44;

function TimeWheel({value, items, onChange}: {
  value: number; items: number[]; onChange: (v: number) => void;
}) {
  const ref = useRef<ScrollView>(null);
  const idx = items.indexOf(value);

  useEffect(() => {
    ref.current?.scrollTo({y: idx * ITEM_H, animated: false});
  }, []);

  return (
    <ScrollView
      ref={ref}
      style={styles.wheel}
      snapToInterval={ITEM_H}
      decelerationRate="fast"
      showsVerticalScrollIndicator={false}
      onMomentumScrollEnd={e => {
        const i = Math.round(e.nativeEvent.contentOffset.y / ITEM_H);
        onChange(items[Math.max(0, Math.min(i, items.length - 1))]);
      }}
      contentContainerStyle={{paddingVertical: ITEM_H * 2}}>
      {items.map(v => (
        <View key={v} style={styles.wheelItem}>
          <Text style={[styles.wheelText, v === value && styles.wheelTextActive]}>
            {String(v).padStart(2, '0')}
          </Text>
        </View>
      ))}
    </ScrollView>
  );
}

// ── Main component ────────────────────────────────────────────────────────────
export default function Reservations({navigation, route}: Props) {
  const app = useContext(Context);
  const insets = useSafeAreaInsets();
  const communityId: number = (route.params as any)?.communityId;
  const communityName: string = (route.params as any)?.communityName ?? 'Comunidad';

  const [reservationsEnabled, setReservationsEnabled] = useState(false);
  const [reservations, setReservations] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const pad = (n: number) => String(n).padStart(2, '0');

  // Default: tomorrow
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const tomorrowStr = `${tomorrow.getFullYear()}-${pad(tomorrow.getMonth() + 1)}-${pad(tomorrow.getDate())}`;

  const [vehicles, setVehicles]       = useState(1);
  const [dateStr, setDateStr]         = useState(tomorrowStr);
  const [fromHour, setFromHour]       = useState(9);
  const [fromMinute, setFromMinute]   = useState(0);
  const [duration, setDuration]       = useState(2);   // horas enteras

  // Which picker panel is open inside the sheet
  const [panel, setPanel] = useState<null | 'date' | 'time'>(null);

  const timeFromStr = `${pad(fromHour)}:${pad(fromMinute)}`;

  const load = useCallback(async () => {
    try {
      const data = await app.api.getCommunityReservations(communityId);
      setReservationsEnabled(data.reservations_enabled);
      setReservations(data.reservations || []);
    } catch {}
    setLoading(false);
  }, [communityId]);

  useEffect(() => { load(); }, [load]);

  const handleCreate = async () => {
    setSubmitting(true);
    try {
      await app.api.createReservation(communityId, vehicles, dateStr, timeFromStr, duration);
      setShowForm(false);
      setPanel(null);
      await load();
    } catch (e: any) {
      Alert.alert('Error', e.message || 'No se pudo crear la reserva');
    } finally {
      setSubmitting(false);
    }
  };

  const calcDuration = (from: string, to: string) => {
    const [fh, fm] = from.split(':').map(Number);
    const [th, tm] = to.split(':').map(Number);
    const mins = (th * 60 + tm) - (fh * 60 + fm);
    if (mins <= 0) return '';
    const h = Math.floor(mins / 60);
    const m = mins % 60;
    return m > 0 ? `${h}h ${m}m` : `${h}h`;
  };

  const formatDateLabel = (s: string) => {
    if (!s) return '';
    const [y, m, d] = s.split('-');
    const date = new Date(Number(y), Number(m) - 1, Number(d));
    return date.toLocaleDateString('es-CL', {weekday: 'short', day: 'numeric', month: 'long', year: 'numeric'});
  };

  const formatDate = (d: string) => {
    if (!d) return '';
    const [y, m, day] = d.split('-');
    return `${day}/${m}/${y}`;
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.safe} edges={['top']}>
        <View style={styles.loadingBox}><ActivityIndicator color="#2563EB" size="large" /></View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Feather name="arrow-left" size={20} color="#1E293B" />
        </TouchableOpacity>
        <View style={styles.headerTitle}>
          <Text style={styles.headerTitleText}>Reservas</Text>
          <Text style={styles.headerSubtitle} numberOfLines={1}>{communityName}</Text>
        </View>
        {reservationsEnabled && (
          <TouchableOpacity style={styles.newBtn} onPress={() => { setPanel(null); setShowForm(true); }}>
            <Feather name="plus" size={18} color="#fff" />
          </TouchableOpacity>
        )}
      </View>

      {!reservationsEnabled ? (
        <View style={styles.disabled}>
          <View style={styles.disabledIcon}><Feather name="calendar-x" size={32} color="#94A3B8" /></View>
          <Text style={styles.disabledTitle}>Reservas no disponibles</Text>
          <Text style={styles.disabledText}>El sistema de reservas no está habilitado en esta comunidad.</Text>
        </View>
      ) : (
        <ScrollView style={styles.scroll}>
          {reservations.length === 0 ? (
            <View style={styles.empty}>
              <Feather name="calendar" size={40} color="#CBD5E1" />
              <Text style={styles.emptyTitle}>Sin reservas</Text>
              <Text style={styles.emptyText}>Aún no has hecho ninguna reserva en esta comunidad</Text>
              <TouchableOpacity style={styles.emptyBtn} onPress={() => { setPanel(null); setShowForm(true); }}>
                <Text style={styles.emptyBtnText}>Crear reserva</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <View style={styles.list}>
              {reservations.map(r => {
                const sc = STATUS_COLORS[r.status] || STATUS_COLORS.pending;
                return (
                  <View key={r.id} style={styles.card}>
                    <View style={styles.cardTop}>
                      <View style={styles.cardLeft}>
                        <Text style={styles.cardDate}>{formatDate(r.date)}</Text>
                        <Text style={styles.cardTime}>{r.time_from} · {calcDuration(r.time_from, r.time_to)}</Text>
                        <Text style={styles.cardVehicles}>{r.vehicles} vehículo{r.vehicles !== 1 ? 's' : ''}</Text>
                      </View>
                      <View style={[styles.statusBadge, {backgroundColor: sc.bg}]}>
                        <Text style={[styles.statusText, {color: sc.text}]}>{STATUS_LABELS[r.status] || r.status}</Text>
                      </View>
                    </View>
                    {r.status === 'rejected' && r.rejection_reason && (
                      <View style={styles.rejectionNote}>
                        <Feather name="alert-circle" size={13} color="#EF4444" />
                        <Text style={styles.rejectionText}>{r.rejection_reason}</Text>
                      </View>
                    )}
                    {r.status === 'approved' && r.responded_by && (
                      <Text style={styles.respondedBy}>Aprobado por {r.responded_by}</Text>
                    )}
                  </View>
                );
              })}
            </View>
          )}
          <View style={{height: 40}} />
        </ScrollView>
      )}

      {/* Modal: Nueva reserva */}
      <Modal
        visible={showForm}
        animationType="slide"
        transparent
        statusBarTranslucent
        onRequestClose={() => { setPanel(null); setShowForm(false); }}>
        <StatusBar translucent backgroundColor="rgba(0,0,0,0.5)" barStyle="light-content" />
        <View style={[styles.modalOverlay, {paddingTop: insets.top}]}>
          <View style={[styles.modalSheet, {paddingBottom: insets.bottom + 24}]}>
            <View style={styles.modalHandle} />

            {/* ── Panel: Fecha ── */}
            {panel === 'date' && (
              <>
                <View style={styles.panelHeader}>
                  <TouchableOpacity onPress={() => setPanel(null)}>
                    <Text style={styles.panelBack}>← Volver</Text>
                  </TouchableOpacity>
                  <Text style={styles.panelTitle}>Selecciona una fecha</Text>
                  <View style={{width: 64}} />
                </View>
                <Calendar
                  current={dateStr}
                  minDate={tomorrowStr}
                  markedDates={{[dateStr]: {selected: true, selectedColor: '#2563EB'}}}
                  onDayPress={day => { setDateStr(day.dateString); setPanel(null); }}
                  theme={{
                    todayTextColor: '#2563EB',
                    selectedDayBackgroundColor: '#2563EB',
                    arrowColor: '#2563EB',
                    textDayFontFamily: 'Inter',
                    textMonthFontFamily: 'Inter',
                    textDayHeaderFontFamily: 'Inter',
                    textDayFontSize: 14,
                    textMonthFontSize: 15,
                    textDayHeaderFontSize: 12,
                  }}
                />
              </>
            )}

            {/* ── Panel: Hora de inicio + duración ── */}
            {panel === 'time' && (
              <>
                <View style={styles.panelHeader}>
                  <TouchableOpacity onPress={() => setPanel(null)}>
                    <Text style={styles.panelBack}>← Volver</Text>
                  </TouchableOpacity>
                  <Text style={styles.panelTitle}>Hora y duración</Text>
                  <View style={{width: 64}} />
                </View>
                <View style={styles.timePickerRow}>
                  {/* Hora de inicio */}
                  <View style={styles.timePickerCol}>
                    <Text style={styles.timePickerLabel}>Hora de inicio</Text>
                    <View style={styles.wheelRow}>
                      <TimeWheel value={fromHour}   items={HOURS}   onChange={setFromHour} />
                      <Text style={styles.wheelSep}>:</Text>
                      <TimeWheel value={fromMinute} items={MINUTES} onChange={setFromMinute} />
                    </View>
                  </View>
                  <View style={styles.timePickerDivider} />
                  {/* Duración */}
                  <View style={styles.timePickerCol}>
                    <Text style={styles.timePickerLabel}>Duración</Text>
                    <View style={styles.durationPicker}>
                      <TouchableOpacity
                        style={styles.counterBtn}
                        onPress={() => setDuration(d => Math.max(1, d - 1))}>
                        <Feather name="minus" size={18} color="#475569" />
                      </TouchableOpacity>
                      <View style={styles.durationVal}>
                        <Text style={styles.durationNum}>{duration}</Text>
                        <Text style={styles.durationUnit}>hora{duration !== 1 ? 's' : ''}</Text>
                      </View>
                      <TouchableOpacity
                        style={styles.counterBtn}
                        onPress={() => setDuration(d => Math.min(12, d + 1))}>
                        <Feather name="plus" size={18} color="#475569" />
                      </TouchableOpacity>
                    </View>
                  </View>
                </View>
                <TouchableOpacity style={styles.submitBtn} onPress={() => setPanel(null)}>
                  <Text style={styles.submitText}>Confirmar</Text>
                </TouchableOpacity>
              </>
            )}

            {/* ── Panel: Formulario principal ── */}
            {panel === null && (
              <>
                <Text style={styles.modalTitle}>Nueva reserva</Text>

                {/* Vehículos */}
                <View style={styles.field}>
                  <Text style={styles.fieldLabel}>Número de vehículos</Text>
                  <View style={styles.vehicleCounter}>
                    <TouchableOpacity style={styles.counterBtn} onPress={() => setVehicles(v => Math.max(1, v - 1))}>
                      <Feather name="minus" size={18} color="#475569" />
                    </TouchableOpacity>
                    <Text style={styles.counterVal}>{vehicles}</Text>
                    <TouchableOpacity style={styles.counterBtn} onPress={() => setVehicles(v => Math.min(10, v + 1))}>
                      <Feather name="plus" size={18} color="#475569" />
                    </TouchableOpacity>
                  </View>
                </View>

                {/* Fecha */}
                <View style={styles.field}>
                  <Text style={styles.fieldLabel}>Fecha</Text>
                  <TouchableOpacity style={styles.pickerBtn} onPress={() => setPanel('date')}>
                    <Feather name="calendar" size={16} color="#2563EB" />
                    <Text style={styles.pickerBtnText}>{formatDateLabel(dateStr)}</Text>
                    <Feather name="chevron-right" size={14} color="#94A3B8" />
                  </TouchableOpacity>
                </View>

                {/* Hora de inicio y duración */}
                <View style={styles.field}>
                  <Text style={styles.fieldLabel}>Hora de inicio y duración</Text>
                  <TouchableOpacity style={styles.pickerBtn} onPress={() => setPanel('time')}>
                    <Feather name="clock" size={16} color="#2563EB" />
                    <Text style={styles.pickerBtnText}>{timeFromStr} · {duration} hora{duration !== 1 ? 's' : ''}</Text>
                    <Feather name="chevron-right" size={14} color="#94A3B8" />
                  </TouchableOpacity>
                </View>

                <TouchableOpacity
                  style={[styles.submitBtn, submitting && {opacity: 0.6}]}
                  onPress={handleCreate}
                  disabled={submitting}>
                  {submitting
                    ? <ActivityIndicator color="#fff" />
                    : <Text style={styles.submitText}>Enviar solicitud</Text>}
                </TouchableOpacity>

                <TouchableOpacity style={styles.cancelBtn} onPress={() => setShowForm(false)}>
                  <Text style={styles.cancelText}>Cancelar</Text>
                </TouchableOpacity>
              </>
            )}
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {flex: 1, backgroundColor: '#F8FAFC'},
  loadingBox: {flex: 1, alignItems: 'center', justifyContent: 'center'},
  header: {flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: '#E2E8F0', backgroundColor: '#fff'},
  backBtn: {width: 36, height: 36, borderRadius: 18, backgroundColor: '#F1F5F9', alignItems: 'center', justifyContent: 'center', marginRight: 12},
  headerTitle: {flex: 1},
  headerTitleText: {fontFamily: 'Inter', fontSize: 17, fontWeight: '700', color: '#1E293B'},
  headerSubtitle: {fontFamily: 'Inter', fontSize: 12, color: '#94A3B8', marginTop: 1},
  newBtn: {width: 36, height: 36, borderRadius: 18, backgroundColor: '#2563EB', alignItems: 'center', justifyContent: 'center'},
  disabled: {flex: 1, alignItems: 'center', justifyContent: 'center', padding: 40},
  disabledIcon: {width: 72, height: 72, borderRadius: 20, backgroundColor: '#F1F5F9', alignItems: 'center', justifyContent: 'center', marginBottom: 16},
  disabledTitle: {fontFamily: 'Inter', fontSize: 18, fontWeight: '700', color: '#1E293B', textAlign: 'center', marginBottom: 8},
  disabledText: {fontFamily: 'Inter', fontSize: 14, color: '#64748B', textAlign: 'center', lineHeight: 21},
  scroll: {flex: 1},
  list: {padding: 20, gap: 12},
  empty: {flex: 1, alignItems: 'center', justifyContent: 'center', padding: 48},
  emptyTitle: {fontFamily: 'Inter', fontSize: 18, fontWeight: '700', color: '#1E293B', marginTop: 16, marginBottom: 8},
  emptyText: {fontFamily: 'Inter', fontSize: 14, color: '#64748B', textAlign: 'center', lineHeight: 21, marginBottom: 24},
  emptyBtn: {backgroundColor: '#2563EB', paddingHorizontal: 28, paddingVertical: 12, borderRadius: 12},
  emptyBtnText: {fontFamily: 'Inter', fontWeight: '700', fontSize: 14, color: '#fff'},
  card: {backgroundColor: '#fff', borderRadius: 16, padding: 16, shadowColor: '#000', shadowOffset: {width: 0, height: 1}, shadowOpacity: 0.06, shadowRadius: 3, elevation: 2},
  cardTop: {flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start'},
  cardLeft: {flex: 1},
  cardDate: {fontFamily: 'Inter', fontSize: 15, fontWeight: '700', color: '#1E293B'},
  cardTime: {fontFamily: 'Inter', fontSize: 13, color: '#475569', marginTop: 2},
  cardVehicles: {fontFamily: 'Inter', fontSize: 12, color: '#94A3B8', marginTop: 4},
  statusBadge: {paddingHorizontal: 10, paddingVertical: 5, borderRadius: 20},
  statusText: {fontFamily: 'Inter', fontSize: 12, fontWeight: '600'},
  rejectionNote: {flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 10, padding: 10, backgroundColor: '#FEF2F2', borderRadius: 8},
  rejectionText: {fontFamily: 'Inter', fontSize: 12, color: '#EF4444', flex: 1},
  respondedBy: {fontFamily: 'Inter', fontSize: 12, color: '#64748B', marginTop: 8},
  // Modal
  modalOverlay: {flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end'},
  modalSheet: {backgroundColor: '#fff', borderTopLeftRadius: 24, borderTopRightRadius: 24, paddingHorizontal: 24, paddingTop: 12},
  modalHandle: {width: 36, height: 4, borderRadius: 2, backgroundColor: '#E2E8F0', alignSelf: 'center', marginBottom: 20},
  modalTitle: {fontFamily: 'Inter', fontSize: 18, fontWeight: '700', color: '#1E293B', marginBottom: 20},
  // Panels
  panelHeader: {flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16},
  panelBack: {fontFamily: 'Inter', fontSize: 14, color: '#2563EB', width: 64},
  panelTitle: {fontFamily: 'Inter', fontSize: 15, fontWeight: '600', color: '#1E293B'},
  // Form fields
  field: {marginBottom: 16},
  fieldLabel: {fontFamily: 'Inter', fontSize: 13, fontWeight: '500', color: '#475569', marginBottom: 8},
  pickerBtn: {flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: '#F8FAFC', borderWidth: 1, borderColor: '#E2E8F0', borderRadius: 12, paddingHorizontal: 16, paddingVertical: 13},
  pickerBtnText: {fontFamily: 'Inter', fontSize: 15, color: '#1E293B', flex: 1},
  vehicleCounter: {flexDirection: 'row', alignItems: 'center', gap: 20},
  counterBtn: {width: 40, height: 40, borderRadius: 12, backgroundColor: '#F1F5F9', alignItems: 'center', justifyContent: 'center'},
  counterVal: {fontFamily: 'Inter', fontSize: 22, fontWeight: '700', color: '#1E293B', minWidth: 32, textAlign: 'center'},
  submitBtn: {backgroundColor: '#2563EB', borderRadius: 14, paddingVertical: 14, alignItems: 'center', marginTop: 4, marginBottom: 8},
  submitText: {fontFamily: 'Inter', fontWeight: '700', fontSize: 15, color: '#fff'},
  cancelBtn: {alignItems: 'center', paddingVertical: 10},
  cancelText: {fontFamily: 'Inter', fontSize: 14, color: '#94A3B8'},
  // Time wheels
  timePickerRow: {flexDirection: 'row', alignItems: 'stretch', marginBottom: 20},
  timePickerCol: {flex: 1, alignItems: 'center'},
  timePickerLabel: {fontFamily: 'Inter', fontSize: 13, fontWeight: '600', color: '#475569', marginBottom: 8},
  timePickerDivider: {width: 1, backgroundColor: '#E2E8F0', marginHorizontal: 8},
  wheelRow: {flexDirection: 'row', alignItems: 'center', height: ITEM_H * 5, overflow: 'hidden'},
  wheel: {width: 52, height: ITEM_H * 5},
  wheelItem: {height: ITEM_H, alignItems: 'center', justifyContent: 'center'},
  wheelText: {fontFamily: 'Inter', fontSize: 22, color: '#CBD5E1'},
  wheelTextActive: {fontSize: 28, fontWeight: '700', color: '#1E293B'},
  wheelSep: {fontFamily: 'Inter', fontSize: 28, fontWeight: '700', color: '#1E293B', marginHorizontal: 4},
  durationPicker: {flexDirection: 'row', alignItems: 'center', gap: 12, marginTop: 8},
  durationVal: {alignItems: 'center', minWidth: 56},
  durationNum: {fontFamily: 'Inter', fontSize: 32, fontWeight: '700', color: '#1E293B'},
  durationUnit: {fontFamily: 'Inter', fontSize: 12, color: '#94A3B8', marginTop: 2},
});
