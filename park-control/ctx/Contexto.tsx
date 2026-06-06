import React, {createContext, useContext, useState, useEffect, useCallback} from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import api, {setToken} from '@api/index';

interface User {
  id: number;
  name: string;
  email: string;
  role: string;
  avatar?: string;
}

interface AppContext {
  user: User | null;
  token: string | null;
  loading: boolean;
  api: typeof api;
  login: (email: string, password: string) => Promise<void>;
  loginWithGoogle: (googleToken: string) => Promise<void>;
  loginWithApple: (appleToken: string, name?: string, email?: string) => Promise<void>;
  logout: () => Promise<void>;
}

const Context = createContext<AppContext>({} as AppContext);

export function ContextProvider({children}: {children: React.ReactNode}) {
  const [user, setUser] = useState<User | null>(null);
  const [token, setTokenState] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const stored = await AsyncStorage.getItem('@pc_token');
        const storedUser = await AsyncStorage.getItem('@pc_user');
        if (stored && storedUser) {
          setToken(stored);
          setTokenState(stored);
          setUser(JSON.parse(storedUser));
        }
      } catch {}
      setLoading(false);
    })();
  }, []);

  const saveSession = useCallback(async (t: string, u: User) => {
    setToken(t);
    setTokenState(t);
    setUser(u);
    await AsyncStorage.setItem('@pc_token', t);
    await AsyncStorage.setItem('@pc_user', JSON.stringify(u));
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    const data = await api.login(email, password);
    await saveSession(data.token, data.user);
  }, [saveSession]);

  const loginWithGoogle = useCallback(async (googleToken: string) => {
    const data = await api.loginWithGoogle(googleToken);
    await saveSession(data.token, data.user);
  }, [saveSession]);

  const loginWithApple = useCallback(async (appleToken: string, name?: string, email?: string) => {
    const data = await api.loginWithApple(appleToken, name, email);
    await saveSession(data.token, data.user);
  }, [saveSession]);

  const logout = useCallback(async () => {
    try { await api.logout(); } catch {}
    setToken(null);
    setTokenState(null);
    setUser(null);
    await AsyncStorage.multiRemove(['@pc_token', '@pc_user']);
  }, []);

  return (
    <Context.Provider value={{user, token, loading, api, login, loginWithGoogle, loginWithApple, logout}}>
      {children}
    </Context.Provider>
  );
}

export default Context;
