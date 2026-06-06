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
    borderColor: '#E2E8F0',
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 2},
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },
});
