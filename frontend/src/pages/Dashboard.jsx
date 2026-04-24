import { useState, useEffect } from 'react';
import { mundialService, prediccionService } from '../services/api';
import './Dashboard.css';

const Dashboard = () => {
  const [grupos, setGrupos] = useState([]);
  const [misPredicciones, setMisPredicciones] = useState([]);
  const [misPrediccionesPartidos, setMisPrediccionesPartidos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [mensaje, setMensaje] = useState({ text: '', type: '' });
  const [view, setView] = useState('clasificados'); // 'clasificados' o 'partidos'

  // Cargar datos
  useEffect(() => {
    const fetchData = async () => {
      try {
        const [dataGrupos, dataPredicciones, dataPredPartidos] = await Promise.all([
          mundialService.grupos(),
          prediccionService.misGrupos(),
          prediccionService.misPartidos()
        ]);
        setGrupos(dataGrupos);
        setMisPredicciones(dataPredicciones);
        setMisPrediccionesPartidos(dataPredPartidos);
      } catch (error) {
        console.error("Error cargando datos:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  // Seleccionar o deseleccionar un equipo como clasificado
  const toggleClasificado = (grupoId, equipoId) => {
    setMisPredicciones(prev => {
      // Filtrar las predicciones actuales para este grupo
      const predsGrupo = prev.filter(p => {
        const equipoInfo = grupos.find(g => g.id === grupoId).equipos.find(e => e.id === p.id_equipo);
        return equipoInfo !== undefined;
      });

      const existe = predsGrupo.find(p => p.id_equipo === equipoId);
      
      if (existe) {
        // Si ya existe, lo quitamos
        return prev.filter(p => p.id_equipo !== equipoId);
      } else {
        // Si no existe, verificamos si ya hay 2 seleccionados
        if (predsGrupo.length >= 2) {
          // Si ya hay 2, reemplazamos el que tenga posición 2
          const prevSinPos2 = prev.filter(p => {
            const eqInfo = grupos.find(g => g.id === grupoId).equipos.find(e => e.id === p.id_equipo);
            if (eqInfo && p.posicion === 2) return false;
            return true;
          });
          return [...prevSinPos2, { id_equipo: equipoId, posicion: 2 }];
        } else {
          // Si hay menos de 2, lo agregamos (1 o 2 dependiendo)
          const nuevaPos = predsGrupo.length === 0 ? 1 : 2;
          return [...prev, { id_equipo: equipoId, posicion: nuevaPos }];
        }
      }
    });
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
      setMensaje({ text: 'Error al guardar las predicciones', type: 'error' });
    } finally {
      setSaving(false);
    }
  };

  const [grupoActivo, setGrupoActivo] = useState(0);

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
          </div>
          <button 
            className="btn-primary" 
            onClick={guardarApuestas}
            disabled={saving}
          >
            {saving ? 'Guardando...' : '💾 Guardar'}
          </button>
        </div>
      </div>

      {mensaje.text && (
        <div className={`alert alert-${mensaje.type} animate-fade-in-up`}>
          {mensaje.text}
        </div>
      )}

      {/* Tabs de Grupos */}
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

      <div className="grupo-detalle-view">
        {grupos[grupoActivo] && view === 'clasificados' && (
          <div key={grupos[grupoActivo].id} className="grupo-card glass-panel animate-fade-in">
            <div className="grupo-title">
              <h3>Clasificados Grupo {grupos[grupoActivo].nombre}</h3>
              <span className="selecciones-badge">
                {misPredicciones.filter(p => 
                  grupos[grupoActivo].equipos.some(e => e.id === p.id_equipo)
                ).length}/2 clasificados
              </span>
            </div>
            
            <ul className="equipos-list">
              {grupos[grupoActivo].equipos.map((equipo) => {
                const seleccion = misPredicciones.find(s => s.id_equipo === equipo.id);
                const isSelected = !!seleccion;
                
                return (
                  <li 
                    key={equipo.id} 
                    className={`equipo-item ${isSelected ? 'selected' : ''}`}
                    onClick={() => toggleClasificado(grupos[grupoActivo].id, equipo.id)}
                  >
                    <div className="equipo-info">
                      <span className="equipo-bandera">{equipo.bandera}</span>
                      <span className="equipo-nombre">{equipo.nombre}</span>
                    </div>
                    
                    {isSelected ? (
                      <span className={`posicion-badge pos-${seleccion.posicion}`}>
                        {seleccion.posicion}°
                      </span>
                    ) : (
                      <div className="select-circle"></div>
                    )}
                  </li>
                );
              })}
            </ul>
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
      </div>
    </div>
  );
};

export default Dashboard;
