/**
 * AuthContext - Estado global de autenticación
 */
import { createContext, useContext, useState, useEffect } from "react";
import { authService } from "../services/api";

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [usuario, setUsuario] = useState(null);
  const [cargando, setCargando] = useState(true);

  // Verificar token al cargar la app
  useEffect(() => {
    const token = localStorage.getItem("token");
    if (token) {
      authService
        .me()
        .then((u) => setUsuario(u))
        .catch(() => {
          // Token inválido o expirado: limpiar sesión silenciosamente
          localStorage.removeItem("token");
        })
        .finally(() => setCargando(false));
    } else {
      setCargando(false);
    }
  }, []);

  const login = (tokenData) => {
    localStorage.setItem("token", tokenData.access_token);
    setUsuario(tokenData.usuario);
  };

  const logout = () => {
    localStorage.removeItem("token");
    setUsuario(null);
  };

  /** Actualiza campos específicos del usuario en memoria sin recargar del servidor */
  const updateUsuario = (cambios) => {
    setUsuario(prev => prev ? { ...prev, ...cambios } : prev);
  };

  return (
    <AuthContext.Provider value={{ usuario, setUsuario, cargando, login, logout, updateUsuario }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth debe usarse dentro de AuthProvider");
  return ctx;
};
