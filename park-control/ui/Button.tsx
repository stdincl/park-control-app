import React from 'react';
import {
  TouchableOpacity, Text, ActivityIndicator,
  StyleSheet, ViewStyle, TextStyle,
} from 'react-native';

interface Props {
  label: string;
  onPress: () => void;
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost';
  loading?: boolean;
  disabled?: boolean;
  style?: ViewStyle;
  textStyle?: TextStyle;
}

export default function Button({
  label, onPress, variant = 'primary', loading = false, disabled = false, style, textStyle,
}: Props) {
  return (
    <TouchableOpacity
      style={[styles.base, styles[variant], disabled && styles.disabled, style]}
      onPress={onPress}
      disabled={disabled || loading}
      activeOpacity={0.8}>
      {loading ? (
        <ActivityIndicator color={variant === 'primary' ? '#fff' : '#2563EB'} size="small" />
      ) : (
        <Text style={[styles.label, styles[`${variant}Label` as keyof typeof styles], textStyle]}>
          {label}
        </Text>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  base: {
    paddingVertical: 15,
    paddingHorizontal: 24,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 8,
    minHeight: 50,
  },
  primary: {backgroundColor: '#2563EB'},
  secondary: {backgroundColor: '#FFFFFF', borderWidth: 1.5, borderColor: '#E2E8F0'},
  outline: {backgroundColor: 'transparent', borderWidth: 1.5, borderColor: '#2563EB'},
  ghost: {backgroundColor: 'transparent'},
  disabled: {opacity: 0.45},
  label: {fontFamily: 'Inter', fontSize: 16, fontWeight: '600'},
  primaryLabel: {color: '#fff'},
  secondaryLabel: {color: '#0F172A'},
  outlineLabel: {color: '#2563EB'},
  ghostLabel: {color: '#64748B'},
});
