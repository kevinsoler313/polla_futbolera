/**
 * usePredictions.js
 * Hook personalizado que encapsula toda la lógica de estado y fetching
 * de predicciones del usuario y del administrador.
 *
 * Responsabilidad: Estado de datos, carga desde API, drag & drop de grupos y terceros.
 * NO es responsable de renderizar nada.
 */
import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { mundialService, prediccionService, adminService } from '../services/api';
import { buildGroupTable, buildThirdPlacesFromPositions, sortEquiposByPrediction } from '../utils/groupUtils';

export const usePredictions = () => {
  const { usuario } = useAuth();
  const isAdminMode = usuario?.es_admin || false;

  // ── Estado Principal ────────────────────────────────────────────────────────
  const [grupos, setGrupos] = useState([]);
  const [prediccionesGrupo, setPrediccionesGrupo] = useState([]);
  const [prediccionesPartidos, setPrediccionesPartidos] = useState([]);
  const [partidosEliminatoria, setPartidosEliminatoria] = useState([]);
  const [tercerosManual, setTercerosManual] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [mensaje, setMensaje] = useState({ text: '', type: '' });

  // ── Drag & Drop: Grupos ─────────────────────────────────────────────────────
  const [draggedItem, setDraggedItem] = useState(null);
  const [dragOverItem, setDragOverItem] = useState(null);

  // ── Drag & Drop: Terceros ───────────────────────────────────────────────────
  const [draggedTercero, setDraggedTercero] = useState(null);
  const [dragOverTercero, setDragOverTercero] = useState(null);

  // ── Carga Inicial de Datos ──────────────────────────────────────────────────
  useEffect(() => {
    const fetchAll = async () => {
      try {
        const [dataGrupos, dataPredGrupos, dataPredPartidos, dataTerceros] = await Promise.all([
          mundialService.grupos(),
          prediccionService.misGrupos(),
          prediccionService.misPartidos(),
          prediccionService.misTerceros(),
        ]);

        setGrupos(dataGrupos);
        setPrediccionesGrupo(dataPredGrupos);

        if (isAdminMode) {
          // Admin carga los resultados REALES de la DB para editarlos
          const realScores = [];
          dataGrupos.forEach(g => {
            g.partidos.forEach(p => {
              if (p.goles_equipo1 !== null || p.goles_equipo2 !== null) {
                realScores.push({
                  id_partido: p.id,
                  goles_equipo1: p.goles_equipo1 || 0,
                  goles_equipo2: p.goles_equipo2 || 0,
                  fase: 'grupos',
                });
              }
            });
          });
          setPrediccionesPartidos(realScores);
        } else {
          setPrediccionesPartidos(dataPredPartidos);
        }

        // Guardar terceros temporalmente para aplicar después de que grupos esté listo
        window.__savedTerceros = dataTerceros || [];
      } catch (error) {
        console.error('Error cargando datos:', error);
        setMensaje({ text: 'Error al cargar datos del servidor', type: 'error' });
      } finally {
        setLoading(false);
      }
    };

    const fetchEliminatoria = async () => {
      try {
        const data = await mundialService.partidosEliminatoria();
        setPartidosEliminatoria(data);

        if (isAdminMode) {
          setPrediccionesPartidos(prev => {
            const extra = data
              .filter(p => p.goles_equipo1 !== null || p.goles_equipo2 !== null)
              .map(p => ({
                id_partido: p.id,
                goles_equipo1: p.goles_equipo1 || 0,
                goles_equipo2: p.goles_equipo2 || 0,
                fase: p.fase,
              }));
            const filteredPrev = prev.filter(p => !extra.some(e => e.id_partido === p.id_partido));
            return [...filteredPrev, ...extra];
          });
        }
      } catch (error) {
        console.error('Error cargando eliminatoria:', error);
      }
    };

    fetchAll();
    fetchEliminatoria();
  }, []);

  // ── Sincronizar Terceros Manuales ───────────────────────────────────────────
  useEffect(() => {
    if (grupos.length === 0 || prediccionesGrupo.length === 0) return;

    let desdePosiciones = buildThirdPlacesFromPositions(grupos, prediccionesGrupo);

    if (window.__savedTerceros && window.__savedTerceros.length > 0) {
      desdePosiciones = desdePosiciones
        .map(nt => {
          const guardado = window.__savedTerceros.find(st => st.id_equipo === nt.id);
          return guardado ? { ...nt, __orderIndex: guardado.posicion } : { ...nt, __orderIndex: 999 };
        })
        .sort((a, b) => a.__orderIndex - b.__orderIndex)
        .map(({ __orderIndex, ...t }) => t);

      window.__savedTerceros = null;
    }

    setTercerosManual(prev => {
      if (prev.length === 0) return desdePosiciones;
      return desdePosiciones
        .map(nt => {
          const existente = prev.find(p => p.grupo === nt.grupo);
          return existente
            ? { ...nt, __orderIndex: prev.indexOf(existente) }
            : { ...nt, __orderIndex: prev.length };
        })
        .sort((a, b) => a.__orderIndex - b.__orderIndex)
        .map(({ __orderIndex, ...t }) => t);
    });
  }, [grupos, prediccionesGrupo]);

  // ── Handlers de Marcadores ──────────────────────────────────────────────────
  const handleScoreChange = (partidoId, equipo, valor) => {
    setPrediccionesPartidos(prev => {
      const existe = prev.find(p => p.id_partido === partidoId);
      if (existe) {
        return prev.map(p =>
          p.id_partido === partidoId
            ? { ...p, [equipo === 1 ? 'goles_equipo1' : 'goles_equipo2']: parseInt(valor) || 0 }
            : p
        );
      }
      return [...prev, {
        id_partido: partidoId,
        goles_equipo1: equipo === 1 ? (parseInt(valor) || 0) : 0,
        goles_equipo2: equipo === 2 ? (parseInt(valor) || 0) : 0,
        fase: 'grupos',
      }];
    });
  };

  const handleResetPartidos = () => {
    if (window.confirm('¿Estás seguro de que quieres reiniciar todos los marcadores de la fase de grupos?')) {
      setPrediccionesPartidos(prev => prev.map(p => ({ ...p, goles_equipo1: 0, goles_equipo2: 0 })));
    }
  };

  // ── Handlers Drag & Drop: Grupos ────────────────────────────────────────────
  const handleDragStart = (e, grupoId, equipoId) => {
    setDraggedItem({ grupoId, equipoId });
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e, grupoId, equipoId) => {
    e.preventDefault();
    if (!dragOverItem || dragOverItem.equipoId !== equipoId) {
      setDragOverItem({ grupoId, equipoId });
    }
  };

  const handleDragLeave = () => setDragOverItem(null);

  const handleDrop = (e, grupoId, targetEquipoId) => {
    e.preventDefault();
    setDragOverItem(null);

    if (!draggedItem || draggedItem.grupoId !== grupoId || draggedItem.equipoId === targetEquipoId) return;

    const equiposDelGrupo = grupos.find(g => g.id === grupoId).equipos;
    const ordenActual = sortEquiposByPrediction(equiposDelGrupo, prediccionesGrupo);

    const draggedIndex = ordenActual.findIndex(e => e.id === draggedItem.equipoId);
    const targetIndex = ordenActual.findIndex(e => e.id === targetEquipoId);

    const nuevoOrden = [...ordenActual];
    const [removed] = nuevoOrden.splice(draggedIndex, 1);
    nuevoOrden.splice(targetIndex, 0, removed);

    const nuevasPreds = nuevoOrden.map((equipo, index) => ({ id_equipo: equipo.id, posicion: index + 1 }));

    setPrediccionesGrupo(prev => {
      const otras = prev.filter(p => !equiposDelGrupo.some(e => e.id === p.id_equipo));
      return [...otras, ...nuevasPreds];
    });

    setDraggedItem(null);
  };

  // ── Handlers Drag & Drop: Terceros ──────────────────────────────────────────
  const handleTerceroDragStart = (e, index) => {
    setDraggedTercero(index);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleTerceroDragOver = (e, index) => {
    e.preventDefault();
    if (dragOverTercero !== index) setDragOverTercero(index);
  };

  const handleTerceroDragLeave = () => setDragOverTercero(null);

  const handleTerceroDrop = (e, targetIndex) => {
    e.preventDefault();
    setDragOverTercero(null);
    if (draggedTercero === null || draggedTercero === targetIndex) return;

    setTercerosManual(prev => {
      const nuevoOrden = [...prev];
      const [removed] = nuevoOrden.splice(draggedTercero, 1);
      nuevoOrden.splice(targetIndex, 0, removed);
      return nuevoOrden;
    });

    setDraggedTercero(null);
  };

  // ── Guardar ─────────────────────────────────────────────────────────────────
  const showMensaje = (text, type) => {
    setMensaje({ text, type });
    setTimeout(() => setMensaje({ text: '', type: '' }), 3000);
  };

  const guardarApuestas = async (bracketSaveFn) => {
    setSaving(true);
    setMensaje({ text: '', type: '' });

    try {
      const promesas = [];

      if (isAdminMode) {
        const partidosGrupos = prediccionesPartidos.filter(p => p.fase === 'grupos');
        for (const p of partidosGrupos) {
          promesas.push(adminService.actualizarMarcadorPartido(p.id_partido, p.goles_equipo1, p.goles_equipo2));
        }
        for (const g of grupos) {
          const table = buildGroupTable(g.equipos, g.partidos, prediccionesPartidos);
          if (table[0] && table[1]) {
            promesas.push(adminService.establecerPosicionesGrupo(g.id, table[0].id, table[1].id));
          }
        }
        if (bracketSaveFn) promesas.push(bracketSaveFn(true));
      } else {
        if (prediccionesGrupo.length > 0) promesas.push(prediccionService.guardarGrupos(prediccionesGrupo));
        if (prediccionesPartidos.length > 0) promesas.push(prediccionService.guardarPartidos(prediccionesPartidos));
        if (tercerosManual.length > 0) {
          const payload = tercerosManual.map((t, idx) => ({
            id_equipo: t.id,
            posicion: idx + 1,
            clasificado_tercero: idx < 8,
          }));
          promesas.push(prediccionService.guardarTerceros(payload));
        }
        if (bracketSaveFn) promesas.push(bracketSaveFn(false));
      }

      await Promise.all(promesas);
      showMensaje(
        isAdminMode ? '¡Resultados reales guardados y puntos calculados!' : '¡Todas tus predicciones han sido guardadas!',
        'success'
      );
    } catch (error) {
      showMensaje(error.message || 'Error al guardar', 'error');
    } finally {
      setSaving(false);
    }
  };

  return {
    // Estado de datos
    grupos,
    prediccionesGrupo,
    prediccionesPartidos,
    partidosEliminatoria,
    tercerosManual,
    // Estado de UI
    loading,
    saving,
    mensaje,
    isAdminMode,
    // Drag & Drop estado
    dragOverItem,
    dragOverTercero,
    // Handlers
    handleScoreChange,
    handleResetPartidos,
    handleDragStart,
    handleDragOver,
    handleDragLeave,
    handleDrop,
    handleTerceroDragStart,
    handleTerceroDragOver,
    handleTerceroDragLeave,
    handleTerceroDrop,
    guardarApuestas,
  };
};
