import { useState, useEffect } from 'react';
import { mundialService, prediccionService } from '../services/api';
import './Dashboard.css';

const Dashboard = () => {
  const [grupos, setGrupos] = useState([]);
  const [misPredicciones, setMisPredicciones] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [mensaje, setMensaje] = useState({ text: '', type: '' });

  // Cargar datos
  useEffect(() => {
    const fetchData = async () => {
      try {
        const [dataGrupos, dataPredicciones] = await Promise.all([
          mundialService.grupos(),
          prediccionService.misGrupos()
        ]);
        setGrupos(dataGrupos);
        setMisPredicciones(dataPredicciones);
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

  const guardarApuestas = async () => {
    setSaving(true);
    setMensaje({ text: '', type: '' });
    
    // Verificar si seleccionó 2 equipos por grupo
    const totalSeleccionados = misPredicciones.length;
    if (totalSeleccionados < grupos.length * 2) {
      setMensaje({ 
        text: `Atención: Has seleccionado ${totalSeleccionados} equipos. Se recomiendan ${grupos.length * 2} (2 por grupo).`, 
        type: 'warning' 
      });
    }

    try {
      await prediccionService.guardarGrupos(misPredicciones);
      setMensaje({ text: '¡Apuestas guardadas con éxito!', type: 'success' });
      setTimeout(() => setMensaje({ text: '', type: '' }), 3000);
    } catch (error) {
      setMensaje({ text: 'Error al guardar las apuestas', type: 'error' });
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className="loading-screen"><div className="spinner"></div></div>;

  return (
    <div className="dashboard-container">
      <div className="dashboard-header">
        <div>
          <h2>Fase de Grupos</h2>
          <p>Selecciona los 2 equipos que crees que clasificarán en cada grupo. El primero que selecciones será el 1ro.</p>
        </div>
        <button 
          className="btn-primary" 
          onClick={guardarApuestas}
          disabled={saving}
        >
          {saving ? 'Guardando...' : '💾 Guardar Predicciones'}
        </button>
      </div>

      {mensaje.text && (
        <div className={`alert alert-${mensaje.type} animate-fade-in-up`}>
          {mensaje.text}
        </div>
      )}

      <div className="grupos-grid">
        {grupos.map((grupo) => {
          // Equipos seleccionados en este grupo
          const selecciones = misPredicciones.filter(p => 
            grupo.equipos.some(e => e.id === p.id_equipo)
          );

          return (
            <div key={grupo.id} className="grupo-card glass-panel">
              <div className="grupo-title">
                <h3>Grupo {grupo.nombre}</h3>
                <span className="selecciones-badge">
                  {selecciones.length}/2
                </span>
              </div>
              
              <ul className="equipos-list">
                {grupo.equipos.map((equipo) => {
                  const seleccion = selecciones.find(s => s.id_equipo === equipo.id);
                  const isSelected = !!seleccion;
                  
                  return (
                    <li 
                      key={equipo.id} 
                      className={`equipo-item ${isSelected ? 'selected' : ''}`}
                      onClick={() => toggleClasificado(grupo.id, equipo.id)}
                    >
                      <span className="equipo-bandera">{equipo.bandera}</span>
                      <span className="equipo-nombre">{equipo.nombre}</span>
                      
                      {isSelected && (
                        <span className={`posicion-badge pos-${seleccion.posicion}`}>
                          {seleccion.posicion}°
                        </span>
                      )}
                    </li>
                  );
                })}
              </ul>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default Dashboard;
