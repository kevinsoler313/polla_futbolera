/**
 * useRanking.js
 * Hook que encapsula toda la lógica de estado del sistema de Ligas y Rankings.
 * Responsabilidad: carga de datos, crear liga, unirse a liga, cambiar de liga activa.
 */
import { useState, useEffect, useCallback } from 'react';
import { ligaService } from '../services/api';

export const useRanking = () => {
  const [ligaActiva, setLigaActiva] = useState(null); // null = Global
  const [misLigas, setMisLigas] = useState([]);
  const [ranking, setRanking] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadingRanking, setLoadingRanking] = useState(false);
  const [error, setError] = useState(null);

  // ── Cargar ligas del usuario al montar ──────────────────────────────────────
  useEffect(() => {
    const cargarLigas = async () => {
      try {
        const [ligas, rankingGlobal] = await Promise.all([
          ligaService.misLigas(),
          ligaService.rankingGlobal(),
        ]);
        setMisLigas(ligas);
        setRanking(rankingGlobal);
      } catch (e) {
        setError('Error al cargar el ranking');
      } finally {
        setLoading(false);
      }
    };
    cargarLigas();
  }, []);

  // ── Cambiar de liga activa ──────────────────────────────────────────────────
  const cambiarLiga = useCallback(async (liga) => {
    setLigaActiva(liga);
    setLoadingRanking(true);
    setError(null);
    try {
      const data = liga === null
        ? await ligaService.rankingGlobal()
        : await ligaService.rankingLiga(liga.id);
      setRanking(data);
    } catch (e) {
      setError('Error al cargar el ranking de la liga');
    } finally {
      setLoadingRanking(false);
    }
  }, []);

  // ── Crear una nueva liga ────────────────────────────────────────────────────
  const crearLiga = useCallback(async (nombre) => {
    const nuevaLiga = await ligaService.crearLiga(nombre);
    setMisLigas(prev => [...prev, nuevaLiga]);
    // Cambiar automáticamente a la nueva liga
    await cambiarLiga(nuevaLiga);
    return nuevaLiga;
  }, [cambiarLiga]);

  // ── Unirse a una liga con código ────────────────────────────────────────────
  const unirseALiga = useCallback(async (codigo) => {
    const liga = await ligaService.unirseALiga(codigo);
    setMisLigas(prev => {
      // Evitar duplicado si ya la tenía
      if (prev.some(l => l.id === liga.id)) return prev;
      return [...prev, liga];
    });
    await cambiarLiga(liga);
    return liga;
  }, [cambiarLiga]);

  return {
    ligaActiva,
    misLigas,
    ranking,
    loading,
    loadingRanking,
    error,
    cambiarLiga,
    crearLiga,
    unirseALiga,
  };
};
