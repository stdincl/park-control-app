import React, {useContext} from 'react';
import {StatusBar, ActivityIndicator, View, StyleSheet} from 'react-native';
import {SafeAreaProvider} from 'react-native-safe-area-context';
import {ContextProvider} from './park-control/ctx/Contexto';
import Context from './park-control/ctx/Contexto';
import Login from './park-control/app/Login';
import Home from './park-control/app/Home';

function AppContent() {
  const app = useContext(Context);

  if (app.loading) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator size="large" color="#2563EB" />
      </View>
    );
  }

  return app.user ? <Home navigation={{navigate: () => {}}} /> : <Login />;
}

export default function App() {
  return (
    <SafeAreaProvider>
      <StatusBar barStyle="dark-content" backgroundColor="#F8FAFC" />
      <ContextProvider>
        <AppContent />
      </ContextProvider>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  loading: {flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#F8FAFC'},
});
