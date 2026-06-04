"use client";

import {
  createContext,
  ReactNode,
  useContext,
  useEffect,
  useState
} from "react";

export interface ApiSettings {
  openaiApiKey?: string;
  stabilityApiKey?: string;
  customProviderUrl?: string;
  customProviderToken?: string;
  customModel?: string;
}

interface AuthUser {
  email: string;
  name: string;
}

interface AuthContextValue {
  apiSettings: ApiSettings;
  credits: number;
  isAuthenticated: boolean;
  login: (email: string, password: string) => void;
  logout: () => void;
  recharge: (amount: number) => void;
  saveApiSettings: (settings: ApiSettings) => void;
  user: AuthUser | null;
}

const AUTH_KEY = "image-platform.auth";
const CREDITS_KEY = "image-platform.credits";
const SETTINGS_KEY = "image-platform.api-settings";

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [credits, setCredits] = useState(0);
  const [apiSettings, setApiSettings] = useState<ApiSettings>({});

  useEffect(() => {
    const savedUser = window.localStorage.getItem(AUTH_KEY);
    const savedCredits = window.localStorage.getItem(CREDITS_KEY);
    const savedSettings = window.localStorage.getItem(SETTINGS_KEY);

    if (savedUser) {
      setUser(JSON.parse(savedUser) as AuthUser);
    }
    if (savedCredits) {
      setCredits(Number(savedCredits) || 0);
    }
    if (savedSettings) {
      setApiSettings(JSON.parse(savedSettings) as ApiSettings);
    }
  }, []);

  function login(email: string, password: string) {
    if (!email.trim() || !password.trim()) {
      throw new Error("请输入邮箱和密码");
    }

    const nextUser = {
      email: email.trim(),
      name: email.trim().split("@")[0] || "创作者"
    };
    window.localStorage.setItem(AUTH_KEY, JSON.stringify(nextUser));
    setUser(nextUser);
  }

  function logout() {
    window.localStorage.removeItem(AUTH_KEY);
    setUser(null);
  }

  function recharge(amount: number) {
    const nextCredits = credits + amount;
    window.localStorage.setItem(CREDITS_KEY, String(nextCredits));
    setCredits(nextCredits);
  }

  function saveApiSettings(settings: ApiSettings) {
    window.localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
    setApiSettings(settings);
  }

  return (
    <AuthContext.Provider
      value={{
        apiSettings,
        credits,
        isAuthenticated: Boolean(user),
        login,
        logout,
        recharge,
        saveApiSettings,
        user
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used inside AuthProvider");
  }

  return context;
}
