import { StatusLimits } from "../pages/UserManagement";
import {
  createContext,
  Dispatch,
  useContext,
  useState,
  ReactNode,
  useCallback,
  useEffect,
  useRef,
} from "react";
import api from "../services/api";

export interface User {
  id: number;
  username: string;
  email: string;
  role:
    | "administrador"
    | "gestor"
    | "diretoria"
    | "compras"
    | "obra"
    | "financeiro"
    | "dev";
  is_superuser: boolean;
  is_active: boolean;
  permissions: {
    page_dashboard: boolean;
    page_compras: boolean;
    view_status_history: boolean;
    gerenciar: {
      usuarios: boolean;
      empresas: boolean;
      crdiis: boolean;
    };
    relatorios: {
      geral: boolean;
      financeiro: boolean;
    };
    can_create_processo: boolean;
    can_edit_processo: boolean;
    can_delete_processo: boolean;
    can_change_status: boolean;
    can_upload_file: boolean;
    can_download_file: boolean;
    can_delete_file: boolean;
    can_upload_processo: boolean;
    can_upload_nota_fiscal: boolean;
    can_upload_boletos: boolean;
    can_download_processo: boolean;
    can_download_nota_fiscal: boolean;
    can_download_boletos: boolean;
    can_edit_user: boolean;
    can_delete_user: boolean;
    can_create_tenant: boolean;
    status_limits: StatusLimits;
    allowed_crdii: number[];
  };
}

interface Tenant {
  schema_name: string;
  nome: string;
}

interface AuthContextType {
  login: (tenantInfo: Tenant) => Promise<void>;
  logout: () => Promise<void>;
  loading: boolean;
  user: User | null;
  tenant: Tenant | null;
  setUser: Dispatch<React.SetStateAction<User | null>>;
  isWarningModalOpen: boolean;
  countdown: number;
  resetInactivityTimer: () => void;
  continueSession: () => void;
}

export const AuthContext = createContext<AuthContextType | null>(null);

// Helper functions for session management
const setSessionCookie = () => {
  document.cookie = "session_active=true; path=/";
};

const removeSessionCookie = () => {
  document.cookie = "session_active=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;";
};

const hasSessionCookie = () => {
  return document.cookie.split(';').some((item) => item.trim().startsWith('session_active='));
};

const useAuthLogic = () => {
  const [user, setUser] = useState<User | null>(null);
  const [tenant, setTenant] = useState<Tenant | null>(null);
  const [loading, setLoading] = useState(true);
  const [isWarningModalOpen, setWarningModalOpen] = useState(false);
  const [countdown, setCountdown] = useState(60);

  const inactivityTimer = useRef<NodeJS.Timeout>();
  const countdownTimer = useRef<NodeJS.Timeout>();
  const isRefreshing = useRef(false);
  const failedQueue = useRef<any[]>([]);

  const logout = useCallback(async () => {
    clearTimeout(inactivityTimer.current);
    clearInterval(countdownTimer.current);

    try {
      await api.post("/auth/logout/");
    } catch (e) {
      console.error("Logout failed on backend", e);
    }

    setUser(null);
    setTenant(null);
    setWarningModalOpen(false);
    setCountdown(60);

    localStorage.removeItem("tenant_info");
    removeSessionCookie();

    delete api.defaults.headers.common["X-Tenant-ID"];

    window.location.href = "/login";
  }, []);

  const fetchAndSetUser = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await api.get<User>("/auth/me/");
      setUser(data);
    } catch (error) {
      console.error("Falha ao buscar dados do usuário, deslogando:", error);
      // Don't call logout here to avoid infinite loops if logout fails,
      // but if /auth/me/ fails with 401, the interceptor should catch it.
      // If it falls through here, it might be another error.
      setUser(null);
      setTenant(null);
    } finally {
      setLoading(false);
    }
  }, []);

  const login = async (tenantInfo: Tenant) => {
    // 1. Set tenant info in localStorage
    localStorage.setItem("tenant_info", JSON.stringify(tenantInfo));
    setSessionCookie();

    api.defaults.headers.common["X-Tenant-ID"] = tenantInfo.schema_name;

    // 2. Fetch user data (cookies are sent automatically)
    await fetchAndSetUser();

    // 3. Set tenant in state
    setTenant(tenantInfo);
  };

  const resetInactivityTimer = useCallback(() => {
    clearTimeout(inactivityTimer.current);
    inactivityTimer.current = setTimeout(
      () => {
        setWarningModalOpen(true);
      },
      10 * 60 * 1000 // 10 minutes
    );
  }, []);

  const continueSession = useCallback(() => {
    setWarningModalOpen(false);
    clearInterval(countdownTimer.current);
    setCountdown(60);
    resetInactivityTimer();
  }, [resetInactivityTimer]);

  useEffect(() => {
    const activityEvents = [
      "mousemove",
      "keydown",
      "click",
      "scroll",
      "touchstart",
    ];
    if (user) {
      resetInactivityTimer();
      activityEvents.forEach((event) =>
        window.addEventListener(event, resetInactivityTimer)
      );
    }
    return () => {
      activityEvents.forEach((event) =>
        window.removeEventListener(event, resetInactivityTimer)
      );
      clearTimeout(inactivityTimer.current);
    };
  }, [user, resetInactivityTimer]);

  useEffect(() => {
    const interceptor = api.interceptors.response.use(
      (response) => response,
      async (error) => {
        const originalRequest = error.config;
        if (
          error.response?.status === 401 &&
          !originalRequest._retry &&
          !originalRequest.url.includes("/token/") &&
          !originalRequest.url.includes("/auth/logout/")
        ) {
          if (isRefreshing.current) {
            return new Promise((resolve) => {
              failedQueue.current.push(() => resolve(api(originalRequest)));
            });
          }
          originalRequest._retry = true;
          isRefreshing.current = true;
          
          try {
            await api.post("/token/refresh/");
            failedQueue.current.forEach((promise) => promise());
            failedQueue.current = [];
            return api(originalRequest);
          } catch (refreshError) {
            await logout();
            return Promise.reject(refreshError);
          } finally {
            isRefreshing.current = false;
          }
        }
        return Promise.reject(error);
      }
    );
    return () => api.interceptors.response.eject(interceptor);
  }, [logout]);

  useEffect(() => {
    if (isWarningModalOpen) {
      countdownTimer.current = setInterval(() => {
        setCountdown((prev) => {
          if (prev <= 1) {
            clearInterval(countdownTimer.current);
            logout();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => clearInterval(countdownTimer.current);
  }, [isWarningModalOpen, logout]);

  useEffect(() => {
    const initializeAuth = async () => {
      // If we don't have the session cookie, the browser was closed. Force logout.
      if (!hasSessionCookie()) {
         await logout();
         setLoading(false);
         return;
      }

      const tenantInfoRaw = localStorage.getItem("tenant_info");

      if (tenantInfoRaw) {
        try {
          const tenantInfo = JSON.parse(tenantInfoRaw);
          api.defaults.headers.common["X-Tenant-ID"] = tenantInfo.schema_name;
          setTenant(tenantInfo);
          
          // Try to fetch user to validate session
          await fetchAndSetUser();
        } catch (e) {
          console.error("Failed to parse tenant info, clearing it.", e);
          localStorage.removeItem("tenant_info");
          setLoading(false);
        }
      } else {
        setLoading(false);
      }
    };
    initializeAuth();
  }, [fetchAndSetUser, logout]);

  return {
    user,
    setUser,
    tenant,
    login,
    logout,
    loading,
    isWarningModalOpen,
    countdown,
    resetInactivityTimer,
    continueSession,
  };
};

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const authLogic = useAuthLogic();
  return (
    <AuthContext.Provider value={authLogic}>{children}</AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth deve ser usado dentro de um AuthProvider");
  }
  return context;
};
