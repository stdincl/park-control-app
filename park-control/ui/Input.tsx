import React, {useState} from 'react';
import {View, Text, TextInput, TouchableOpacity, StyleSheet, TextInputProps} from 'react-native';

interface Props extends TextInputProps {
  label?: string;
  error?: string;
  secureToggle?: boolean;
}

export default function Input({label, error, secureToggle, secureTextEntry, style, ...props}: Props) {
  const [secure, setSecure] = useState(secureTextEntry ?? false);

  return (
    <View style={styles.container}>
      {label ? <Text style={styles.label}>{label}</Text> : null}
      <View style={[styles.inputWrapper, error ? styles.inputError : null]}>
        <TextInput
          style={[styles.input, style]}
          placeholderTextColor="#94A3B8"
          secureTextEntry={secureToggle ? secure : secureTextEntry}
          {...props}
        />
        {secureToggle ? (
          <TouchableOpacity onPress={() => setSecure(s => !s)} style={styles.toggleBtn}>
            <Text style={styles.toggleText}>{secure ? 'Ver' : 'Ocultar'}</Text>
          </TouchableOpacity>
        ) : null}
      </View>
      {error ? <Text style={styles.error}>{error}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { marginBottom: 16 },
  label: { fontFamily: 'Inter', fontSize: 14, fontWeight: '500', color: '#475569', marginBottom: 6 },
  inputWrapper: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#F8FAFC', borderRadius: 12,
    borderWidth: 1.5, borderColor: '#E2E8F0',
  },
  inputError: { borderColor: '#EF4444' },
  input: {
    flex: 1, paddingVertical: 14, paddingHorizontal: 16,
    fontFamily: 'Inter', fontSize: 16, color: '#1E293B',
  },
  toggleBtn: { paddingRight: 16 },
  toggleText: { fontFamily: 'Inter', fontSize: 13, color: '#2563EB', fontWeight: '600' },
  error: { fontFamily: 'Inter', fontSize: 12, color: '#EF4444', marginTop: 4 },
});
