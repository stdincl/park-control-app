import React from 'react';
import {View, StyleSheet, ViewStyle} from 'react-native';

interface Props {
  children: React.ReactNode;
  style?: ViewStyle;
  padding?: number;
}

export default function Card({children, style, padding = 16}: Props) {
  return (
    <View style={[styles.card, {padding}, style]}>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#F1F5F9',
    shadowColor: '#64748B',
    shadowOffset: {width: 0, height: 1},
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 2,
  },
});
