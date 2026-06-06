import React, {useContext, useEffect, useRef} from 'react';
import {StatusBar, Animated, View, StyleSheet, Text} from 'react-native';
import {SafeAreaProvider} from 'react-native-safe-area-context';
import {NavigationContainer} from '@react-navigation/native';
import {createNativeStackNavigator} from '@react-navigation/native-stack';
import {ContextProvider} from './park-control/ctx/Contexto';
import Context from './park-control/ctx/Contexto';
import {GoogleSignin} from '@react-native-google-signin/google-signin';
import Login from '@app/Login';
import Home from '@app/Home';
import JoinCommunity from '@app/JoinCommunity';
import Profile from '@app/Profile';
import ForgotPassword from '@app/ForgotPassword';
import Reservations from '@app/Reservations';

// Configure Google Sign-In once at app startup
// Replace GOOGLE_WEB_CLIENT_ID with the real Web Client ID from Google Cloud Console
// See AUTH.md for instructions on how to obtain this value
const GOOGLE_WEB_CLIENT_ID = 'PLACEHOLDER_WEB_CLIENT_ID.apps.googleusercontent.com';
const GOOGLE_IOS_CLIENT_ID = 'PLACEHOLDER_IOS_CLIENT_ID.apps.googleusercontent.com';
GoogleSignin.configure({webClientId: GOOGLE_WEB_CLIENT_ID, iosClientId: GOOGLE_IOS_CLIENT_ID, offlineAccess: true});

export type RootStackParamList = {
  Home: undefined;
  JoinCommunity: {fromSelector?: boolean};
  Profile: undefined;
  Reservations: {communityId: number; communityName: string};
};

export type AuthStackParamList = {
  Login: undefined;
  ForgotPassword: undefined;
};

const RootStack = createNativeStackNavigator<RootStackParamList>();
const AuthStack = createNativeStackNavigator<AuthStackParamList>();

function SplashScreen() {
  const opacity = useRef(new Animated.Value(0)).current;
  const scale = useRef(new Animated.Value(0.8)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(opacity, {toValue: 1, duration: 600, useNativeDriver: true}),
      Animated.spring(scale, {toValue: 1, tension: 50, friction: 7, useNativeDriver: true}),
    ]).start();
  }, []);

  return (
    <View style={ss.splash}>
      <StatusBar barStyle="light-content" backgroundColor="#1E40AF" />
      <Animated.View style={[ss.splashContent, {opacity, transform: [{scale}]}]}>
        <View style={ss.splashIcon}>
          <Text style={ss.splashP}>P</Text>
        </View>
        <Text style={ss.splashTitle}>ParkControl</Text>
        <Text style={ss.splashSub}>Control de estacionamientos</Text>
      </Animated.View>
    </View>
  );
}

function AppNavigator() {
  const app = useContext(Context);

  if (app.loading) {
    return <SplashScreen />;
  }

  if (!app.user) {
    return (
      <AuthStack.Navigator screenOptions={{headerShown: false}}>
        <AuthStack.Screen name="Login" component={Login} />
        <AuthStack.Screen
          name="ForgotPassword"
          component={ForgotPassword}
          options={{presentation: 'modal'}}
        />
      </AuthStack.Navigator>
    );
  }

  return (
    <RootStack.Navigator screenOptions={{headerShown: false}}>
      <RootStack.Screen name="Home" component={Home} />
      <RootStack.Screen
        name="JoinCommunity"
        component={JoinCommunity}
        options={{presentation: 'modal'}}
      />
      <RootStack.Screen
        name="Profile"
        component={Profile}
        options={{presentation: 'modal'}}
      />
      <RootStack.Screen
        name="Reservations"
        component={Reservations}
        options={{presentation: 'modal'}}
      />
    </RootStack.Navigator>
  );
}

export default function App() {
  return (
    <SafeAreaProvider>
      <StatusBar barStyle="dark-content" backgroundColor="#F8FAFC" />
      <ContextProvider>
        <NavigationContainer>
          <AppNavigator />
        </NavigationContainer>
      </ContextProvider>
    </SafeAreaProvider>
  );
}

const ss = StyleSheet.create({
  splash: {flex: 1, backgroundColor: '#1E40AF', alignItems: 'center', justifyContent: 'center'},
  splashContent: {alignItems: 'center'},
  splashIcon: {
    width: 80, height: 80, borderRadius: 24,
    backgroundColor: 'rgba(255,255,255,0.15)',
    alignItems: 'center', justifyContent: 'center', marginBottom: 16,
  },
  splashP: {fontSize: 42, fontWeight: '800', color: '#fff', fontFamily: 'Inter-ExtraBold'},
  splashTitle: {fontFamily: 'Inter-ExtraBold', fontSize: 32, fontWeight: '800', color: '#fff'},
  splashSub: {fontFamily: 'Inter-Regular', fontSize: 15, color: 'rgba(255,255,255,0.7)', marginTop: 6},
});
