/**
 * useDeadline.js
 * Hook que gestiona el estado del cierre de apuestas y la confirmación.
 * Responsabilidad única: countdown, estado de bloqueo, y acción de confirmar.
 */
import { useState, useEffect, useCallback } from 'react';
import { prediccionService } from '../services/api';
import { useAuth } from '../context/AuthContext';

export const useDeadline = () => {
  const { usuario, setUsuario } = useAuth();
  const [deadline, setDeadline] = useState(null);
  const [segundosRestantes, setSegundosRestantes] = useState(null);
  const [loading, setLoading] = useState(true);

  // ── Cargar estado del deadline desde el backend ─────────────────────────────
  useEffect(() => {
    prediccionService.getDeadline()
      .then(data => {
        setDeadline(data);
        setSegundosRestantes(data.segundos_restantes);
      })
      .catch(() => {
        // Si falla (sin conexión), calculamos desde la fecha fija
        setDeadline({ abiertas: true, fecha_cierre: '2026-06-11T15:00:00', segundos_restantes: 9999999 });
      })
      .finally(() => setLoading(false));
  }, []);

  // ── Countdown en tiempo real ────────────────────────────────────────────────
  useEffect(() => {
    if (segundosRestantes === null || segundosRestantes <= 0) return;

    const timer = setInterval(() => {
      setSegundosRestantes(prev => {
        if (prev <= 1) {
          clearInterval(timer);
          setDeadline(d => d ? { ...d, abiertas: false } : d);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [segundosRestantes]);

  // ── Formato del countdown ───────────────────────────────────────────────────
  const formatCountdown = (secs) => {
    if (!secs || secs <= 0) return null;
    const d = Math.floor(secs / 86400);
    const h = Math.floor((secs % 86400) / 3600);
    const m = Math.floor((secs % 3600) / 60);
    const s = secs % 60;
    if (d > 0) return `${d}d ${h}h ${m}m`;
    if (h > 0) return `${h}h ${m}m ${s}s`;
    return `${m}m ${s}s`;
  };

  // ── Determinar si el usuario puede editar ─────────────────────────────────
  const puedeEditar = usuario?.es_admin
    ? true // admin siempre puede
    : !usuario?.apuestas_confirmadas && (deadline?.abiertas ?? true);

  // ── Confirmar apuestas ────────────────────────────────────────────────────
  const confirmar = useCallback(async () => {
    const usuarioActualizado = await prediccionService.confirmar();
    // Actualizar el contexto global para que el UI refleje el bloqueo inmediatamente
    if (setUsuario) setUsuario(usuarioActualizado);
    return usuarioActualizado;
  }, [setUsuario]);

  return {
    deadline,
    segundosRestantes,
    countdown: formatCountdown(segundosRestantes),
    puedeEditar,
    loading,
    confirmar,
    apuestasConfirmadas: usuario?.apuestas_confirmadas ?? false,
  };
};
