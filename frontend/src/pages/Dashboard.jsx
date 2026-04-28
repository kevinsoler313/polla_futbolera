import { useState, useEffect } from 'react';
import { mundialService, prediccionService } from '../services/api';
import './Dashboard.css';



const Dashboard = () => {
  const [grupos, setGrupos] = useState([]);
  const [misPredicciones, setMisPredicciones] = useState([]);
  const [misPrediccionesPartidos, setMisPrediccionesPartidos] = useState([]);
  const [allEquipos, setAllEquipos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [mensaje, setMensaje] = useState({ text: '', type: '' });
  const [view, setView] = useState('clasificados'); // 'clasificados', 'partidos', 'tablas'

  // Cargar datos
  useEffect(() => {
    const fetchData = async () => {
      try {
        const [dataGrupos, dataPredicciones, dataPredPartidos, dataEquipos] = await Promise.all([
          mundialService.grupos(),
          prediccionService.misGrupos(),
          prediccionService.misPartidos(),
          mundialService.equipos()
        ]);
        setGrupos(dataGrupos);
        setMisPredicciones(dataPredicciones);
        setMisPrediccionesPartidos(dataPredPartidos);
        setAllEquipos(dataEquipos);
      } catch (error) {
        console.error("Error cargando datos:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  const [draggedItem, setDraggedItem] = useState(null);
  const [dragOverItem, setDragOverItem] = useState(null);

  const getEquiposOrdenados = (grupoId, equipos) => {
    const preds = misPredicciones.filter(p => equipos.some(e => e.id === p.id_equipo));
    if (preds.length === 0) return equipos;

    return [...equipos].sort((a, b) => {
      const posA = preds.find(p => p.id_equipo === a.id)?.posicion || 99;
      const posB = preds.find(p => p.id_equipo === b.id)?.posicion || 99;
      return posA - posB;
    });
  };

  const calculateGroupTable = (grupoId, equipos) => {
    const stats = equipos.reduce((acc, eq) => {
      acc[eq.id] = { ...eq, pj: 0, pg: 0, pe: 0, pp: 0, gf: 0, gc: 0, dg: 0, pts: 0 };
      return acc;
    }, {});

    const grupoMatches = grupos.find(g => g.id === grupoId)?.partidos || [];
    
    grupoMatches.forEach(match => {
      const pred = misPrediccionesPartidos.find(p => p.id_partido === match.id);
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

  const getMejoresTerceros = () => {
    const terceros = grupos.map(g => {
      const table = calculateGroupTable(g.id, g.equipos);
      return { ...table[2], grupo: g.nombre }; // Index 2 is 3rd place
    }).filter(t => t !== undefined);

    return terceros.sort((a, b) => {
      if (b.pts !== a.pts) return b.pts - a.pts;
      if (b.dg !== a.dg) return b.dg - a.dg;
      return b.gf - a.gf;
    });
  };

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
    const ordenActual = getEquiposOrdenados(grupoId, equiposDelGrupo);
    
    const draggedIndex = ordenActual.findIndex(e => e.id === draggedItem.equipoId);
    const targetIndex = ordenActual.findIndex(e => e.id === targetEquipoId);

    const nuevoOrden = [...ordenActual];
    const [removed] = nuevoOrden.splice(draggedIndex, 1);
    nuevoOrden.splice(targetIndex, 0, removed);

    const nuevasPredsDelGrupo = nuevoOrden.map((equipo, index) => ({
      id_equipo: equipo.id,
      posicion: index + 1
    }));

    setMisPredicciones(prev => {
      const otrasPreds = prev.filter(p => !equiposDelGrupo.some(e => e.id === p.id_equipo));
      return [...otrasPreds, ...nuevasPredsDelGrupo];
    });
    
    setDraggedItem(null);
  };

  const handleScoreChange = (partidoId, equipo, valor) => {
    setMisPrediccionesPartidos(prev => {
      const existe = prev.find(p => p.id_partido === partidoId);
      
      if (existe) {
        return prev.map(p => 
          p.id_partido === partidoId 
            ? { ...p, [equipo === 1 ? 'goles_equipo1' : 'goles_equipo2']: parseInt(valor) || 0 } 
            : p
        );
      } else {
        return [...prev, { 
          id_partido: partidoId, 
          goles_equipo1: equipo === 1 ? (parseInt(valor) || 0) : 0, 
          goles_equipo2: equipo === 2 ? (parseInt(valor) || 0) : 0,
          fase: 'grupos'
        }];
      }
    });
  };

  const guardarApuestas = async () => {
    setSaving(true);
    setMensaje({ text: '', type: '' });
    
    try {
      if (view === 'clasificados') {
        await prediccionService.guardarGrupos(misPredicciones);
      } else {
        // Filtrar solo las predicciones del grupo actual para no enviar todo si se desea, 
        // pero el servicio espera una lista. Enviamos todas las actuales.
        await prediccionService.guardarPartidos(misPrediccionesPartidos);
      }
      setMensaje({ text: '¡Predicciones guardadas con éxito!', type: 'success' });
      setTimeout(() => setMensaje({ text: '', type: '' }), 3000);
    } catch (error) {
      setMensaje({ text: error.message || 'Error al guardar las predicciones', type: 'error' });
    } finally {
      setSaving(false);
    }
  };



  const [grupoActivo, setGrupoActivo] = useState(0);

  const getEquipoById = (id) => {
    if (!id) return { nombre: 'TBD', bandera: '❓' };
    const targetId = String(id);
    const eq = allEquipos.find(e => String(e.id) === targetId);
    if (eq) return eq;
    
    // Fallback si no está en allEquipos por alguna razón
    for (const g of grupos) {
      const found = g.equipos?.find(e => String(e.id) === targetId);
      if (found) return found;
    }
    return { nombre: 'TBD', bandera: '❓' };
  };

  if (loading) return <div className="loading-screen"><div className="spinner"></div></div>;


  


  return (
    <div className="dashboard-container">
      <div className="dashboard-header">
        <div>
          <h2>🏆 Dashboard de Predicciones</h2>
          <p>Completa tus pronósticos para el Mundial 2026.</p>
        </div>
        <div className="header-actions">
          <div className="view-selector">
            <button 
              className={`view-btn ${view === 'clasificados' ? 'active' : ''}`}
              onClick={() => setView('clasificados')}
            >
              🥈 Clasificados
            </button>
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

          </div>
          <div className="action-buttons" style={{ display: 'flex', gap: '0.5rem' }}>

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
        {view === 'clasificados' && (
          <div className="grupos-grid animate-fade-in">
            {grupos.map((grupo) => (
              <div key={grupo.id} className="grupo-card glass-panel">
                <div className="grupo-title">
                  <h3>Grupo {grupo.nombre}</h3>
                  <span className="selecciones-badge">
                    {misPredicciones.filter(p => 
                      grupo.equipos.some(e => e.id === p.id_equipo)
                    ).length}/4
                  </span>
                </div>
                
                <ul className="equipos-list">
                  {getEquiposOrdenados(grupo.id, grupo.equipos).map((equipo, index) => {
                    const posicion = index + 1;
                    const isDragOver = dragOverItem?.equipoId === equipo.id;
                    
                    return (
                      <li 
                        key={equipo.id} 
                        className={`equipo-item pos-${posicion} ${isDragOver ? 'drag-over' : ''}`}
                        draggable
                        onDragStart={(e) => handleDragStart(e, grupo.id, equipo.id)}
                        onDragOver={(e) => handleDragOver(e, grupo.id, equipo.id)}
                        onDragLeave={handleDragLeave}
                        onDrop={(e) => handleDrop(e, grupo.id, equipo.id)}
                      >
                        <div className="posicion-numero">{posicion}°</div>
                        <div className="equipo-info" style={{ flex: 1, marginLeft: '1rem' }}>
                          <span className="equipo-bandera">{equipo.bandera}</span>
                          <span className="equipo-nombre">{equipo.nombre}</span>
                        </div>
                        
                        <div className="drag-handle">≡</div>
                      </li>
                    );
                  })}
                </ul>
              </div>
            ))}
          </div>
        )}

        {grupos[grupoActivo] && view === 'partidos' && (
          <div className="partidos-list animate-fade-in">
            <h3 className="section-title">Marcadores Grupo {grupos[grupoActivo].nombre}</h3>
            {grupos[grupoActivo].partidos.map(partido => {
              const pred = misPrediccionesPartidos.find(p => p.id_partido === partido.id) || { goles_equipo1: 0, goles_equipo2: 0 };
              
              return (
                <div key={partido.id} className="partido-card glass-panel">
                  <div className="partido-equipo home">
                    <span className="equipo-nombre-mini">{partido.equipo1.nombre}</span>
                    <span className="equipo-bandera-mini">{partido.equipo1.bandera}</span>
                    <input 
                      type="number" 
                      min="0"
                      value={pred.goles_equipo1}
                      onChange={(e) => handleScoreChange(partido.id, 1, e.target.value)}
                      className="score-input"
                    />
                  </div>
                  <div className="partido-vs">VS</div>
                  <div className="partido-equipo away">
                    <input 
                      type="number" 
                      min="0"
                      value={pred.goles_equipo2}
                      onChange={(e) => handleScoreChange(partido.id, 2, e.target.value)}
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

        {view === 'tablas' && (
          <div className="tablas-simuladas-container animate-fade-in">
            <h2 className="section-title" style={{ textAlign: 'center', marginBottom: '2rem' }}>
              📊 Pronóstico de Tablas y Mejores Terceros
            </h2>
            
            <div className="tablas-main-layout">
              <div className="tablas-grupos-grid">
                {grupos.map((grupo) => {
                  const tableData = calculateGroupTable(grupo.id, grupo.equipos);
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
                  <div className="tablas-grupo-header">🏆 Mejores Terceros</div>
                  <div className="tablas-col-header">
                    <span>Pos</span>
                    <span>Equipo (G)</span>
                    <span>Pts</span>
                    <span>DG</span>
                  </div>
                  {getMejoresTerceros().map((eq, idx) => {
                    const posicion = idx + 1;
                    const rowClass = posicion <= 8 ? 'clasificado' : 'eliminado';
                    return (
                      <div key={eq.id} className={`tablas-fila tablas-fila--${rowClass}`}>
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
      </div>
    </div>
  );
};

export default Dashboard;
