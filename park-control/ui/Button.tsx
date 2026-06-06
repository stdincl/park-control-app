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
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 8,
  },
  primary: { backgroundColor: '#2563EB' },
  secondary: { backgroundColor: '#F1F5F9' },
  outline: { backgroundColor: 'transparent', borderWidth: 1.5, borderColor: '#2563EB' },
  ghost: { backgroundColor: 'transparent' },
  disabled: { opacity: 0.5 },
  label: { fontFamily: 'Inter', fontSize: 16, fontWeight: '600' },
  primaryLabel: { color: '#fff' },
  secondaryLabel: { color: '#1E293B' },
  outlineLabel: { color: '#2563EB' },
  ghostLabel: { color: '#64748B' },
});
