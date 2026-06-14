import React, {useState} from 'react';
import {View, Text, TextInput, TouchableOpacity, StyleSheet, TextInputProps} from 'react-native';
import Feather from 'react-native-vector-icons/Feather';

interface Props extends TextInputProps {
  label?: string;
  error?: string;
  secureToggle?: boolean;
}

export default function Input({
  label, error, secureToggle, secureTextEntry, style,
  onFocus, onBlur, ...props
}: Props) {
  const [secure, setSecure] = useState(secureTextEntry ?? false);
  const [focused, setFocused] = useState(false);

  return (
    <View style={styles.container}>
      {label ? <Text style={styles.label}>{label}</Text> : null}
      <View style={[
        styles.inputWrapper,
        focused && styles.inputWrapperFocused,
        error ? styles.inputError : null,
      ]}>
        <TextInput
          style={[styles.input, style]}
          placeholderTextColor="#94A3B8"
          secureTextEntry={secureToggle ? secure : secureTextEntry}
          onFocus={e => { setFocused(true); onFocus?.(e); }}
          onBlur={e => { setFocused(false); onBlur?.(e); }}
          {...props}
        />
        {secureToggle ? (
          <TouchableOpacity onPress={() => setSecure(s => !s)} style={styles.toggleBtn}>
            <Feather name={secure ? 'eye' : 'eye-off'} size={18} color="#94A3B8" />
          </TouchableOpacity>
        ) : null}
      </View>
      {error ? <Text style={styles.error}>{error}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {marginBottom: 16},
  label: {fontFamily: 'Inter', fontSize: 13, fontWeight: '500', color: '#64748B', marginBottom: 8},
  inputWrapper: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#FFFFFF', borderRadius: 14,
    borderWidth: 1.5, borderColor: '#E2E8F0',
  },
  inputWrapperFocused: {borderColor: '#2563EB'},
  inputError: {borderColor: '#DC2626'},
  input: {
    flex: 1, paddingVertical: 14, paddingHorizontal: 16,
    fontFamily: 'Inter', fontSize: 16, color: '#0F172A',
  },
  toggleBtn: {paddingRight: 16, paddingLeft: 8},
  error: {fontFamily: 'Inter', fontSize: 12, color: '#DC2626', marginTop: 6},
});
