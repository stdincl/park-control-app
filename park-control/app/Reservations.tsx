import React, {useContext, useState, useCallback, useEffect} from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet,
  ActivityIndicator, Modal, TextInput, Alert, StatusBar,
} from 'react-native';
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

  const [form, setForm] = useState({
    vehicles: '1',
    date: '',
    timeFrom: '',
    timeTo: '',
  });

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
    if (!form.date || !form.timeFrom || !form.timeTo) {
      Alert.alert('Datos incompletos', 'Por favor completa todos los campos');
      return;
    }
    setSubmitting(true);
    try {
      await app.api.createReservation(
        communityId,
        parseInt(form.vehicles, 10) || 1,
        form.date,
        form.timeFrom,
        form.timeTo,
      );
      setShowForm(false);
      setForm({vehicles: '1', date: '', timeFrom: '', timeTo: ''});
      await load();
    } catch (e: any) {
      Alert.alert('Error', e.message || 'No se pudo crear la reserva');
    } finally {
      setSubmitting(false);
    }
  };

  const formatDate = (d: string) => {
    if (!d) return '';
    const [y, m, day] = d.split('-');
    return `${day}/${m}/${y}`;
  };

  if (loading) {
    return (
      <View style={[styles.safe, {paddingTop: insets.top}]}>
        <View style={styles.loadingBox}>
          <ActivityIndicator color="#2563EB" size="large" />
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.safe, {paddingTop: insets.top}]}>
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
          <TouchableOpacity style={styles.newBtn} onPress={() => setShowForm(true)}>
            <Feather name="plus" size={18} color="#fff" />
          </TouchableOpacity>
        )}
      </View>

      {!reservationsEnabled ? (
        <View style={styles.disabled}>
          <View style={styles.disabledIcon}>
            <Feather name="calendar-x" size={32} color="#94A3B8" />
          </View>
          <Text style={styles.disabledTitle}>Reservas no disponibles</Text>
          <Text style={styles.disabledText}>
            El sistema de reservas no está habilitado en esta comunidad. Contacta al administrador.
          </Text>
        </View>
      ) : (
        <ScrollView style={styles.scroll}>
          {reservations.length === 0 ? (
            <View style={styles.empty}>
              <Feather name="calendar" size={40} color="#CBD5E1" />
              <Text style={styles.emptyTitle}>Sin reservas</Text>
              <Text style={styles.emptyText}>Aún no has hecho ninguna reserva en esta comunidad</Text>
              <TouchableOpacity style={styles.emptyBtn} onPress={() => setShowForm(true)}>
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
                        <Text style={styles.cardTime}>{r.time_from} – {r.time_to}</Text>
                        <Text style={styles.cardVehicles}>
                          {r.vehicles} vehículo{r.vehicles !== 1 ? 's' : ''}
                        </Text>
                      </View>
                      <View style={[styles.statusBadge, {backgroundColor: sc.bg}]}>
                        <Text style={[styles.statusText, {color: sc.text}]}>
                          {STATUS_LABELS[r.status] || r.status}
                        </Text>
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
      <Modal visible={showForm} animationType="slide" transparent statusBarTranslucent onRequestClose={() => setShowForm(false)}>
        <StatusBar translucent backgroundColor="rgba(0,0,0,0.5)" barStyle="light-content" />
        <View style={[styles.modalOverlay, {paddingTop: insets.top}]}>
          <View style={[styles.modalSheet, {paddingBottom: insets.bottom + 24}]}>
            <View style={styles.modalHandle} />
            <Text style={styles.modalTitle}>Nueva reserva</Text>

            <View style={styles.field}>
              <Text style={styles.fieldLabel}>Número de vehículos</Text>
              <View style={styles.vehicleCounter}>
                <TouchableOpacity
                  style={styles.counterBtn}
                  onPress={() => setForm(f => ({...f, vehicles: String(Math.max(1, parseInt(f.vehicles) - 1))}))}>
                  <Feather name="minus" size={18} color="#475569" />
                </TouchableOpacity>
                <Text style={styles.counterVal}>{form.vehicles}</Text>
                <TouchableOpacity
                  style={styles.counterBtn}
                  onPress={() => setForm(f => ({...f, vehicles: String(Math.min(10, parseInt(f.vehicles) + 1))}))}>
                  <Feather name="plus" size={18} color="#475569" />
                </TouchableOpacity>
              </View>
            </View>

            <View style={styles.field}>
              <Text style={styles.fieldLabel}>Fecha (YYYY-MM-DD)</Text>
              <TextInput
                style={styles.input}
                placeholder="2026-07-15"
                value={form.date}
                onChangeText={t => setForm(f => ({...f, date: t}))}
                keyboardType="numeric"
              />
            </View>

            <View style={styles.row}>
              <View style={[styles.field, {flex: 1}]}>
                <Text style={styles.fieldLabel}>Hora inicio</Text>
                <TextInput
                  style={styles.input}
                  placeholder="09:00"
                  value={form.timeFrom}
                  onChangeText={t => setForm(f => ({...f, timeFrom: t}))}
                />
              </View>
              <View style={{width: 12}} />
              <View style={[styles.field, {flex: 1}]}>
                <Text style={styles.fieldLabel}>Hora fin</Text>
                <TextInput
                  style={styles.input}
                  placeholder="11:00"
                  value={form.timeTo}
                  onChangeText={t => setForm(f => ({...f, timeTo: t}))}
                />
              </View>
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
          </View>
        </View>
      </Modal>
    </View>
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
  modalOverlay: {flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end'},
  modalSheet: {backgroundColor: '#fff', borderTopLeftRadius: 24, borderTopRightRadius: 24, paddingHorizontal: 24, paddingTop: 12},
  modalHandle: {width: 36, height: 4, borderRadius: 2, backgroundColor: '#E2E8F0', alignSelf: 'center', marginBottom: 20},
  modalTitle: {fontFamily: 'Inter', fontSize: 18, fontWeight: '700', color: '#1E293B', marginBottom: 20},
  field: {marginBottom: 16},
  fieldLabel: {fontFamily: 'Inter', fontSize: 13, fontWeight: '500', color: '#475569', marginBottom: 8},
  input: {fontFamily: 'Inter', fontSize: 15, color: '#1E293B', backgroundColor: '#F8FAFC', borderWidth: 1, borderColor: '#E2E8F0', borderRadius: 12, paddingHorizontal: 16, paddingVertical: 12},
  row: {flexDirection: 'row'},
  vehicleCounter: {flexDirection: 'row', alignItems: 'center', gap: 20},
  counterBtn: {width: 40, height: 40, borderRadius: 12, backgroundColor: '#F1F5F9', alignItems: 'center', justifyContent: 'center'},
  counterVal: {fontFamily: 'Inter', fontSize: 22, fontWeight: '700', color: '#1E293B', minWidth: 32, textAlign: 'center'},
  submitBtn: {backgroundColor: '#2563EB', borderRadius: 14, paddingVertical: 14, alignItems: 'center', marginTop: 4, marginBottom: 8},
  submitText: {fontFamily: 'Inter', fontWeight: '700', fontSize: 15, color: '#fff'},
  cancelBtn: {alignItems: 'center', paddingVertical: 10},
  cancelText: {fontFamily: 'Inter', fontSize: 14, color: '#94A3B8'},
});
