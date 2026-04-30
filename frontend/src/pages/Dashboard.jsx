import { useState, useEffect } from 'react';
import { useAuth } from "../context/AuthContext";
import { mundialService, prediccionService } from '../services/api';
import Bracket from './Bracket';
import './Dashboard.css';

// ── Helpers puros ────────────────────────────────────────────────────────────

const buildGroupTable = (equipos, partidos, predicciones) => {
  const stats = equipos.reduce((acc, eq) => {
    acc[eq.id] = { ...eq, pj: 0, pg: 0, pe: 0, pp: 0, gf: 0, gc: 0, dg: 0, pts: 0 };
    return acc;
  }, {});

  partidos.forEach(match => {
    const pred = predicciones.find(p => p.id_partido === match.id);
    if (pred) {
      const g1 = pred.goles_equipo1;
      const g2 = pred.goles_equipo2;
      const e1 = match.id_equipo1;
      const e2 = match.id_equipo2;

      if (stats[e1] && stats[e2]) {
        stats[e1].pj += 1;
        stats[e2].pj += 1;
        stats[e1].gf += g1;
        stats[e1].gc += g2;
        stats[e2].gf += g2;
        stats[e2].gc += g1;
        stats[e1].dg = stats[e1].gf - stats[e1].gc;
        stats[e2].dg = stats[e2].gf - stats[e2].gc;

        if (g1 > g2) {
          stats[e1].pg += 1;
          stats[e1].pts += 3;
          stats[e2].pp += 1;
        } else if (g1 < g2) {
          stats[e2].pg += 1;
          stats[e2].pts += 3;
          stats[e1].pp += 1;
        } else {
          stats[e1].pe += 1;
          stats[e1].pts += 1;
          stats[e2].pe += 1;
          stats[e2].pts += 1;
        }
      }
    }
  });

  return Object.values(stats).sort((a, b) => {
    if (b.pts !== a.pts) return b.pts - a.pts;
    if (b.dg !== a.dg) return b.dg - a.dg;
    return b.gf - a.gf;
  });
};

const sortEquiposByPrediction = (equipos, predicciones) => {
  const preds = predicciones.filter(p => equipos.some(e => e.id === p.id_equipo));
  if (preds.length === 0) return equipos;

  return [...equipos].sort((a, b) => {
    const posA = preds.find(p => p.id_equipo === a.id)?.posicion || 99;
    const posB = preds.find(p => p.id_equipo === b.id)?.posicion || 99;
    return posA - posB;
  });
};

const buildThirdPlacesFromTable = (grupos, predicciones) => {
  const terceros = grupos.map(g => {
    const table = buildGroupTable(g.equipos, g.partidos, predicciones);
    return table[2] ? { ...table[2], grupo: g.nombre } : null;
  }).filter(t => t !== undefined && t !== null);

  return terceros.sort((a, b) => {
    if (b.pts !== a.pts) return b.pts - a.pts;
    if (b.dg !== a.dg) return b.dg - a.dg;
    return b.gf - a.gf;
  });
};

const buildThirdPlacesFromPositions = (grupos, predicciones) => {
  return grupos.map(g => {
    const equiposOrdenados = sortEquiposByPrediction(g.equipos, predicciones);
    const equipoTercero = equiposOrdenados[2];
    return equipoTercero ? { ...equipoTercero, grupo: g.nombre, pts: 0, dg: 0, gf: 0 } : null;
  }).filter(t => t !== undefined && t !== null);
};

// ── Componente ───────────────────────────────────────────────────────────────

const Dashboard = () => {
  const { usuario } = useAuth();
  // ── Estado ───────────────────────────────────────────────────────────────
  const [isAdminMode, setIsAdminMode] = useState(usuario?.es_admin || false);
  const [grupos, setGrupos] = useState([]);

  const [prediccionesGrupo, setPrediccionesGrupo] = useState([]);
  const [prediccionesPartidos, setPrediccionesPartidos] = useState([]);
  const [partidosEliminatoria, setPartidosEliminatoria] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [mensaje, setMensaje] = useState({ text: '', type: '' });
  const [view, setView] = useState(usuario?.es_admin ? 'partidos' : 'clasificados'); // 'clasificados' | 'partidos' | 'tablas' | 'bracket'
  const [grupoActivo, setGrupoActivo] = useState(0);

  // Drag & Drop
  const [draggedItem, setDraggedItem] = useState(null);
  const [dragOverItem, setDragOverItem] = useState(null);
  const [draggedTercero, setDraggedTercero] = useState(null);
  const [dragOverTercero, setDragOverTercero] = useState(null);
  const [tercerosManual, setTercerosManual] = useState([]);

  // Bracket State (Lifted)
  const [bracketScores, setBracketScores] = useState({});
  const [bracketTieBreakers, setBracketTieBreakers] = useState({});

  // ── Cargar datos ─────────────────────────────────────────────────────────
  useEffect(() => {
    const fetchData = async () => {
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
          // Inicializar con resultados REALES de la DB para que el admin pueda editarlos
          const realScores = [];
          dataGrupos.forEach(g => {
            g.partidos.forEach(p => {
              if (p.goles_equipo1 !== null || p.goles_equipo2 !== null) {
                realScores.push({
                  id_partido: p.id,
                  goles_equipo1: p.goles_equipo1 || 0,
                  goles_equipo2: p.goles_equipo2 || 0,
                  fase: 'grupos'
                });
              }
            });
          });
          setPrediccionesPartidos(realScores);
        } else {
          setPrediccionesPartidos(dataPredPartidos);
        }

        window.__savedTerceros = dataTerceros || [];
      } catch (error) {
        console.error('Error cargando datos:', error);
      } finally {
        setLoading(false);
      }
    };

    const fetchEliminatoria = async () => {
      try {
        const data = await mundialService.partidosEliminatoria();
        setPartidosEliminatoria(data);

        if (isAdminMode) {
          // Agregar resultados reales de eliminatorias a prediccionesPartidos (para que el bracket los vea)
          setPrediccionesPartidos(prev => {
            const extra = data.filter(p => p.goles_equipo1 !== null || p.goles_equipo2 !== null)
              .map(p => ({
                id_partido: p.id,
                goles_equipo1: p.goles_equipo1 || 0,
                goles_equipo2: p.goles_equipo2 || 0,
                fase: p.fase
              }));
            // Evitar duplicados si ya estaban (aunque en el primer load no debería)
            const filteredPrev = prev.filter(p => !extra.some(e => e.id_partido === p.id_partido));
            return [...filteredPrev, ...extra];
          });
        }
      } catch (error) {
        console.error('Error cargando eliminatoria:', error);
      }
    };

    fetchData();
    fetchEliminatoria();
  }, []);

  // ── Sincronizar terceros para vista Clasificados ──────────────────────────
  useEffect(() => {
    if (grupos.length === 0 || prediccionesGrupo.length === 0) return;

    let desdePosiciones = buildThirdPlacesFromPositions(grupos, prediccionesGrupo);

    // Si hay terceros guardados desde el backend, aplicamos ese orden
    if (window.__savedTerceros && window.__savedTerceros.length > 0) {
      desdePosiciones = desdePosiciones.map(nt => {
        const guardado = window.__savedTerceros.find(st => st.id_equipo === nt.id);
        return guardado ? { ...nt, __orderIndex: guardado.posicion } : { ...nt, __orderIndex: 999 };
      }).sort((a, b) => a.__orderIndex - b.__orderIndex)
        .map(({ __orderIndex, ...t }) => t);

      window.__savedTerceros = null; // Ya lo aplicamos, lo limpiamos
    }

    setTercerosManual(prev => {
      if (prev.length === 0) return desdePosiciones;

      // Intentar mantener el orden manual pero actualizar datos si cambiaron los equipos
      return desdePosiciones.map(nt => {
        const existente = prev.find(p => p.grupo === nt.grupo);
        if (existente) {
          return { ...nt, __orderIndex: prev.indexOf(existente) };
        }
        return { ...nt, __orderIndex: prev.length };
      }).sort((a, b) => a.__orderIndex - b.__orderIndex)
        .map(({ __orderIndex, ...t }) => t);
    });
  }, [grupos, prediccionesGrupo]);

  // ── Restaurar Bracket desde DB ──────────────────────────────────────────
  useEffect(() => {
    if (partidosEliminatoria.length === 0 || prediccionesPartidos.length === 0) return;
    if (Object.keys(bracketScores).length > 0) return; // Ya inicializado

    const dbIdToBracketId = {};
    const mapPhase = (faseStr, count) => {
      const pFase = partidosEliminatoria.filter(p => p.fase === faseStr);
      for (let i = 0; i < count; i++) {
        if (pFase[i]) {
          let mId = '';
          if (faseStr === '1/16') {
            mId = i < 8 ? `r16a${i + 1}` : `r16b${i - 7}`;
          } else if (faseStr === 'octavos') {
            mId = i < 4 ? `r8a${i + 1}` : `r8b${i - 3}`;
          } else if (faseStr === 'cuartos') {
            mId = `qf${i + 1}`;
          } else if (faseStr === 'semis') {
            mId = `sf${i + 1}`;
          } else if (faseStr === 'final') {
            mId = 'fn1';
          }
          dbIdToBracketId[pFase[i].id] = mId;
        }
      }
    };

    mapPhase('1/16', 16);
    mapPhase('octavos', 8);
    mapPhase('cuartos', 4);
    mapPhase('semis', 2);
    mapPhase('final', 1);

    const initialScores = {};
    for (const pred of prediccionesPartidos) {
      if (pred.fase !== 'grupos') {
        const mId = dbIdToBracketId[pred.id_partido];
        if (mId) {
          // Si el partido tiene goles guardados (1-0), lo restauramos para que avance
          if (pred.goles_equipo1 > 0 || pred.goles_equipo2 > 0) {
            initialScores[mId] = { g1: pred.goles_equipo1, g2: pred.goles_equipo2 };
          }
        }
      }
    }

    if (Object.keys(initialScores).length > 0) {
      setBracketScores(initialScores);
    }
  }, [partidosEliminatoria, prediccionesPartidos, bracketScores]);

  // ── Drag & Drop: Grupos ──────────────────────────────────────────────────
  const handleDragStart = (e, grupoId, equipoId) => {
    setDraggedItem({ grupoId, equipoId });
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', equipoId);
  };

  const handleDragOver = (e, grupoId, equipoId) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    if (!dragOverItem || dragOverItem.equipoId !== equipoId) {
      setDragOverItem({ grupoId, equipoId });
    }
  };

  const handleDragLeave = () => {
    setDragOverItem(null);
  };

  const handleDrop = (e, grupoId, targetEquipoId) => {
    e.preventDefault();
    setDragOverItem(null);

    if (!draggedItem || draggedItem.grupoId !== grupoId || draggedItem.equipoId === targetEquipoId) {
      return;
    }

    const equiposDelGrupo = grupos.find(g => g.id === grupoId).equipos;
    const ordenActual = sortEquiposByPrediction(equiposDelGrupo, prediccionesGrupo);

    const draggedIndex = ordenActual.findIndex(e => e.id === draggedItem.equipoId);
    const targetIndex = ordenActual.findIndex(e => e.id === targetEquipoId);

    const nuevoOrden = [...ordenActual];
    const [removed] = nuevoOrden.splice(draggedIndex, 1);
    nuevoOrden.splice(targetIndex, 0, removed);

    const nuevasPreds = nuevoOrden.map((equipo, index) => ({
      id_equipo: equipo.id,
      posicion: index + 1,
    }));

    setPrediccionesGrupo(prev => {
      const otras = prev.filter(p => !equiposDelGrupo.some(e => e.id === p.id_equipo));
      return [...otras, ...nuevasPreds];
    });

    setDraggedItem(null);
  };

  // ── Drag & Drop: Terceros ────────────────────────────────────────────────
  const handleTerceroDragStart = (e, index) => {
    setDraggedTercero(index);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', index);
  };

  const handleTerceroDragOver = (e, index) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    if (dragOverTercero !== index) {
      setDragOverTercero(index);
    }
  };

  const handleTerceroDragLeave = () => {
    setDragOverTercero(null);
  };

  const handleTerceroDrop = (e, targetIndex) => {
    e.preventDefault();
    setDragOverTercero(null);

    if (draggedTercero === null || draggedTercero === targetIndex) {
      return;
    }

    setTercerosManual(prev => {
      const nuevoOrden = [...prev];
      const [removed] = nuevoOrden.splice(draggedTercero, 1);
      nuevoOrden.splice(targetIndex, 0, removed);
      return nuevoOrden;
    });

    setDraggedTercero(null);
  };

  // ── Marcadores ───────────────────────────────────────────────────────────
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

  const handleBracketScoreChange = (matchId, team, value) => {
    const numValue = value === '' ? '' : parseInt(value);
    setBracketScores(prev => {
      const newScores = { ...prev };
      if (!newScores[matchId]) newScores[matchId] = { g1: 0, g2: 0 };
      newScores[matchId][team === 1 ? 'g1' : 'g2'] = numValue;

      // Limpiar tie-breaker si deja de ser empate
      if (newScores[matchId].g1 !== newScores[matchId].g2) {
        setBracketTieBreakers(prevTB => {
          const newTB = { ...prevTB };
          delete newTB[matchId];
          return newTB;
        });
      }
      return newScores;
    });
  };

  const handleBracketTieBreaker = (matchId, winnerId) => {
    setBracketTieBreakers(prev => ({ ...prev, [matchId]: winnerId }));
  };

  const handleResetBracket = () => {
    if (window.confirm('¿Estás seguro de que quieres reiniciar todo el bracket? Se borrarán todos los marcadores y desempates.')) {
      setBracketScores({});
      setBracketTieBreakers({});
    }
  };

  const handleResetPartidos = () => {
    if (window.confirm('¿Estás seguro de que quieres reiniciar todos los marcadores de la fase de grupos?')) {
      setPrediccionesPartidos(prev => prev.map(p => ({ ...p, goles_equipo1: 0, goles_equipo2: 0 })));
    }
  };

  // ── Guardar ──────────────────────────────────────────────────────────────
  const guardarApuestas = async () => {
    setSaving(true);
    setMensaje({ text: '', type: '' });

    try {
      const promesas = [];

      if (isAdminMode) {
        // ... (admin logic)
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
        if (typeof window.dispatchBracketSave === 'function') {
          promesas.push(window.dispatchBracketSave(true));
        }
      } else {
        // ── MODO USUARIO: Guardar PREDICCIONES ──
        if (prediccionesGrupo.length > 0) {
          promesas.push(prediccionService.guardarGrupos(prediccionesGrupo));
        }
        if (prediccionesPartidos.length > 0) {
          promesas.push(prediccionService.guardarPartidos(prediccionesPartidos));
        }
        if (tercerosManual.length > 0) {
          const tercerosPayload = tercerosManual.map((t, idx) => ({
            id_equipo: t.id,
            posicion: idx + 1,
            clasificado_tercero: idx < 8
          }));
          promesas.push(prediccionService.guardarTerceros(tercerosPayload));
        }
        if (typeof window.dispatchBracketSave === 'function') {
          promesas.push(window.dispatchBracketSave(false));
        }
      }

      await Promise.all(promesas);

      setMensaje({
        text: isAdminMode ? '¡Resultados reales guardados y puntos calculados!' : '¡Todas tus predicciones han sido guardadas!',
        type: 'success'
      });


      setTimeout(() => setMensaje({ text: '', type: '' }), 3000);
    } catch (error) {
      setMensaje({ text: error.message || 'Error al guardar', type: 'error' });
    } finally {
      setSaving(false);
    }
  };

  // ── Render ───────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="loading-screen">
        <div className="spinner"></div>
      </div>
    );
  }

  return (
    <div className={`dashboard-container ${isAdminMode ? 'admin-mode' : ''}`}>
      <div className="dashboard-header">
        <div>
          <h2>{isAdminMode ? '⚙️ Panel Administrador' : '🏆 Dashboard de Predicciones'}</h2>
          <p>{isAdminMode ? 'Carga los resultados reales del mundial.' : 'Completa tus pronósticos para el Mundial 2026.'}</p>
        </div>
        <div className="header-actions">

          <div className="view-selector">
            {!isAdminMode && (
              <button
                className={`view-btn ${view === 'clasificados' ? 'active' : ''}`}
                onClick={() => setView('clasificados')}
              >
                🥈 Clasificados
              </button>
            )}
            <button
              className={`view-btn ${view === 'partidos' ? 'active' : ''}`}
              onClick={() => setView('partidos')}
            >
              ⚽ Marcadores
            </button>
            <button
              className={`view-btn ${view === 'tablas' ? 'active' : ''}`}
              onClick={() => setView('tablas')}
            >
              📊 Tablas
            </button>

            <button
              className={`view-btn ${view === 'bracket' ? 'active' : ''}`}
              onClick={() => setView('bracket')}
            >
              🏟️ Bracket
            </button>
          </div>

          <div className="action-buttons">
            <button
              className="btn-primary"
              onClick={guardarApuestas}
              disabled={saving}
            >
              {saving ? 'Guardando...' : '💾 Guardar'}
            </button>
          </div>
        </div>
      </div>

      {mensaje.text && (
        <div className={`alert alert-${mensaje.type} animate-fade-in-up`}>
          {mensaje.text}
        </div>
      )}

      {view === 'partidos' && (
        <div className="grupos-tabs-container">
          <div className="grupos-tabs">
            {grupos.map((grupo, index) => (
              <button
                key={grupo.id}
                className={`tab-item ${grupoActivo === index ? 'active' : ''}`}
                onClick={() => setGrupoActivo(index)}
              >
                {grupo.nombre}
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="grupo-detalle-view">
        {/* ── CLASIFICADOS ─────────────────────────────────────────────── */}
        {view === 'clasificados' && (
          <div className="tablas-simuladas-container animate-fade-in">
            <h2 className="section-title" style={{ textAlign: 'center', marginBottom: '2rem' }}>
              🏆 Ordena los Clasificados de Cada Grupo
            </h2>

            <div className="tablas-main-layout">
              <div className="tablas-grupos-grid">
                {grupos.map(grupo => {
                  const equiposOrdenados = sortEquiposByPrediction(grupo.equipos, prediccionesGrupo);
                  return (
                    <div key={grupo.id} className="tablas-grupo-card">
                      <div className="tablas-grupo-header">Grupo {grupo.nombre}</div>
                      <div className="tablas-col-header">
                        <span></span>
                        <span>Equipo</span>
                        <span>Pos</span>
                        <span></span>
                      </div>
                      {equiposOrdenados.map((equipo, idx) => {
                        const posicion = idx + 1;
                        const isDragOver = dragOverItem?.equipoId === equipo.id && dragOverItem?.grupoId === grupo.id;
                        const rowClass = posicion <= 2 ? 'clasificado' : posicion === 3 ? 'tercero' : 'eliminado';
                        return (
                          <div
                            key={equipo.id}
                            className={`tablas-fila tablas-fila--${rowClass} fila-draggable ${isDragOver ? 'drag-over' : ''}`}
                            draggable
                            onDragStart={e => handleDragStart(e, grupo.id, equipo.id)}
                            onDragOver={e => handleDragOver(e, grupo.id, equipo.id)}
                            onDragLeave={handleDragLeave}
                            onDrop={e => handleDrop(e, grupo.id, equipo.id)}
                          >
                            <span className="tablas-pos">{posicion}°</span>
                            <span className="tablas-equipo">
                              <span className="tablas-bandera">{equipo.bandera}</span>
                              <span className="tablas-nombre">{equipo.nombre}</span>
                            </span>
                            <span className="tablas-pts">{posicion}°</span>
                            <span className="drag-handle-small">⠿</span>
                          </div>
                        );
                      })}
                    </div>
                  );
                })}
              </div>

              <div className="tablas-sidebar">
                <div className="tablas-grupo-card mejores-terceros-card">
                  <div className="tablas-grupo-header">🏆 Mejores Terceros (arrastra para reordenar)</div>
                  <div className="tablas-col-header">
                    <span>Pos</span>
                    <span>Equipo (G)</span>
                    <span>Pts</span>
                    <span></span>
                  </div>
                  {tercerosManual.map((eq, idx) => {
                    const posicion = idx + 1;
                    const isDragOver = dragOverTercero === idx;
                    const rowClass = posicion <= 8 ? 'clasificado' : 'eliminado';
                    return (
                      <div
                        key={`${eq.id}-${idx}`}
                        className={`tablas-fila tablas-fila--${rowClass} fila-draggable ${isDragOver ? 'drag-over' : ''}`}
                        draggable
                        onDragStart={e => handleTerceroDragStart(e, idx)}
                        onDragOver={e => handleTerceroDragOver(e, idx)}
                        onDragLeave={handleTerceroDragLeave}
                        onDrop={e => handleTerceroDrop(e, idx)}
                      >
                        <span className="tablas-pos">{posicion}°</span>
                        <span className="tablas-equipo">
                          <span className="tablas-bandera">{eq.bandera}</span>
                          <span className="tablas-nombre">{eq.nombre} <small>({eq.grupo})</small></span>
                        </span>
                        <span className="tablas-pts">{eq.pts}</span>
                        <span className="drag-handle-small">⠿</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ── PARTIDOS / MARCADORES ────────────────────────────────────── */}
        {grupos[grupoActivo] && view === 'partidos' && (
          <div className="partidos-list animate-fade-in">
            <div className="section-header-flex">
              <h3 className="section-title">Marcadores Grupo {grupos[grupoActivo].nombre}</h3>
              <button
                className="btn-secondary btn-sm"
                onClick={handleResetPartidos}
              >
                🔄 Reiniciar Marcadores
              </button>
            </div>
            {grupos[grupoActivo].partidos.map(partido => {
              const pred = prediccionesPartidos.find(p => p.id_partido === partido.id) || { goles_equipo1: 0, goles_equipo2: 0 };
              return (
                <div key={partido.id} className="partido-card">
                  <div className="partido-equipo home">
                    <span className="equipo-nombre-mini">{partido.equipo1.nombre}</span>
                    <span className="equipo-bandera-mini">{partido.equipo1.bandera}</span>
                    <input
                      type="number"
                      min="0"
                      value={pred.goles_equipo1}
                      onChange={e => handleScoreChange(partido.id, 1, e.target.value)}
                      className="score-input"
                    />
                  </div>
                  <div className="partido-vs">VS</div>
                  <div className="partido-equipo away">
                    <input
                      type="number"
                      min="0"
                      value={pred.goles_equipo2}
                      onChange={e => handleScoreChange(partido.id, 2, e.target.value)}
                      className="score-input"
                    />
                    <span className="equipo-bandera-mini">{partido.equipo2.bandera}</span>
                    <span className="equipo-nombre-mini">{partido.equipo2.nombre}</span>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* ── TABLAS ───────────────────────────────────────────────────── */}
        {view === 'tablas' && (
          <div className="tablas-simuladas-container animate-fade-in">
            <h2 className="section-title" style={{ textAlign: 'center', marginBottom: '2rem' }}>
              📊 Pronóstico de Tablas y Mejores Terceros
            </h2>

            <div className="tablas-main-layout">
              <div className="tablas-grupos-grid">
                {grupos.map(grupo => {
                  const tableData = buildGroupTable(grupo.equipos, grupo.partidos, prediccionesPartidos);
                  return (
                    <div key={grupo.id} className="tablas-grupo-card">
                      <div className="tablas-grupo-header">Grupo {grupo.nombre}</div>
                      <div className="tablas-col-header">
                        <span></span>
                        <span>Equipo</span>
                        <span>Pts</span>
                        <span>DG</span>
                      </div>
                      {tableData.map((eq, idx) => {
                        const posicion = idx + 1;
                        const rowClass = posicion <= 2 ? 'clasificado' : posicion === 3 ? 'tercero' : 'eliminado';
                        return (
                          <div key={eq.id} className={`tablas-fila tablas-fila--${rowClass}`}>
                            <span className="tablas-pos">{posicion}°</span>
                            <span className="tablas-equipo">
                              <span className="tablas-bandera">{eq.bandera}</span>
                              <span className="tablas-nombre">{eq.nombre}</span>
                            </span>
                            <span className="tablas-pts">{eq.pts}</span>
                            <span className={`tablas-dg ${eq.dg > 0 ? 'pos' : eq.dg < 0 ? 'neg' : ''}`}>
                              {eq.dg > 0 ? `+${eq.dg}` : eq.dg}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  );
                })}
              </div>

              <div className="tablas-sidebar">
                <div className="tablas-grupo-card mejores-terceros-card">
                  <div className="tablas-grupo-header">🏆 Mejores Terceros (Calculados por Puntos)</div>
                  <div className="tablas-col-header">
                    <span>Pos</span>
                    <span>Equipo (G)</span>
                    <span>Pts</span>
                    <span>DG</span>
                  </div>
                  {buildThirdPlacesFromTable(grupos, prediccionesPartidos).map((eq, idx) => {
                    const posicion = idx + 1;
                    const rowClass = posicion <= 8 ? 'clasificado' : 'eliminado';
                    return (
                      <div
                        key={`tablas-3ro-${eq.id}-${idx}`}
                        className={`tablas-fila tablas-fila--${rowClass}`}
                      >
                        <span className="tablas-pos">{posicion}°</span>
                        <span className="tablas-equipo">
                          <span className="tablas-bandera">{eq.bandera}</span>
                          <span className="tablas-nombre">{eq.nombre} <small>({eq.grupo})</small></span>
                        </span>
                        <span className="tablas-pts">{eq.pts}</span>
                        <span className={`tablas-dg ${eq.dg > 0 ? 'pos' : eq.dg < 0 ? 'neg' : ''}`}>
                          {eq.dg > 0 ? `+${eq.dg}` : eq.dg}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        )}

        {view === 'bracket' && (
          <Bracket
            grupos={grupos}
            prediccionesPartidos={prediccionesPartidos}
            prediccionesGrupo={prediccionesGrupo}
            partidosEliminatoria={partidosEliminatoria}
            scores={bracketScores}
            tieBreakers={bracketTieBreakers}
            onScoreChange={handleBracketScoreChange}
            onTieBreakerChange={handleBracketTieBreaker}
            onReset={handleResetBracket}
            tercerosManual={tercerosManual}
            onSave={async (winners) => {
              await prediccionService.guardarBracket(winners);
            }}
          />
        )}
      </div>
    </div>
  );
};

export default Dashboard;
