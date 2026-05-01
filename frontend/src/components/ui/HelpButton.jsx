/**
 * HelpButton.jsx
 * Botón flotante de ayuda (❓ amarillo) siempre visible en la esquina inferior izquierda.
 * Al hacer clic abre un modal tutorial con las reglas del juego.
 */
import { useState } from 'react';
import './HelpButton.css';

const SECCIONES = [
  {
    emoji: '📋',
    titulo: 'Clasificados',
    desc: 'Arrastra los equipos dentro de cada grupo para ordenar quién clasifica en 1.° y 2.° puesto. También puedes ordenar los mejores terceros que pasan a la siguiente ronda.',
  },
  {
    emoji: '⚽',
    titulo: 'Marcadores',
    desc: 'Ingresa el resultado que predices para cada partido. Al lado derecho verás la tabla de posiciones del grupo actualizándose en tiempo real con tus marcadores.',
  },
  {
    emoji: '📊',
    titulo: 'Tablas',
    desc: 'Muestra las tablas de posiciones calculadas a partir de tus marcadores. Si quieres cambiar un resultado, ve a la pestaña Marcadores.',
  },
  {
    emoji: '🏟️',
    titulo: 'Bracket',
    desc: 'El árbol de eliminatorias. Haz clic en un equipo para avanzarlo al siguiente cruce. Los equipos del Bracket se toman de tus predicciones de clasificados y marcadores.',
  },
  {
    emoji: '🏆',
    titulo: 'Rankings',
    desc: 'Ve cuántos puntos llevas vs tus amigos. Crea una liga privada con el botón "Crear Liga" y comparte el código (SKJ26-XXXXX) para que otros se unan.',
  },
  {
    emoji: '🔒',
    titulo: 'Confirmar Apuestas',
    desc: 'Cuando estés seguro de tus predicciones, haz clic en "Confirmar Apuestas". Una vez confirmadas, no podrás editarlas. Las apuestas se cierran automáticamente cuando comienza el Mundial.',
  },
];

const PUNTUACION = [
  { fase: 'Grupos', pts: 1, extra: '' },
  { fase: 'Grupos (resultado exacto)', pts: 3, extra: '' },
  { fase: '16avos / Octavos', pts: 5, extra: '' },
  { fase: 'Cuartos', pts: 8, extra: '' },
  { fase: 'Semifinales', pts: 13, extra: '' },
  { fase: 'Final', pts: 21, extra: '' },
];

const HelpButton = () => {
  const [open, setOpen] = useState(false);
  const [tab, setTab] = useState('tutorial');

  return (
    <>
      {/* Botón flotante */}
      <button
        id="btn-help-floating"
        className="help-fab"
        onClick={() => setOpen(true)}
        title="Ayuda y Tutorial"
      >
        <span className="help-fab-icon">❓</span>
      </button>

      {/* Modal Tutorial */}
      {open && (
        <div className="modal-overlay" onClick={() => setOpen(false)}>
          <div className="help-modal glass-panel" onClick={e => e.stopPropagation()}>

            <div className="help-modal-header">
              <h2 className="help-modal-title">❓ Ayuda y Tutorial</h2>
              <button className="help-close-btn" onClick={() => setOpen(false)}>✕</button>
            </div>

            {/* Tabs del modal */}
            <div className="help-tabs">
              <button
                className={`help-tab-btn ${tab === 'tutorial' ? 'active' : ''}`}
                onClick={() => setTab('tutorial')}
              >
                📖 Cómo jugar
              </button>
              <button
                className={`help-tab-btn ${tab === 'puntos' ? 'active' : ''}`}
                onClick={() => setTab('puntos')}
              >
                🏅 Puntuación
              </button>
              <button
                className={`help-tab-btn ${tab === 'desempate' ? 'active' : ''}`}
                onClick={() => setTab('desempate')}
              >
                ⚖️ Desempate
              </button>
            </div>

            <div className="help-modal-body">

              {/* Tab: Tutorial */}
              {tab === 'tutorial' && (
                <div className="help-sections">
                  {SECCIONES.map(s => (
                    <div key={s.titulo} className="help-section">
                      <div className="help-section-icon">{s.emoji}</div>
                      <div>
                        <div className="help-section-title">{s.titulo}</div>
                        <div className="help-section-desc">{s.desc}</div>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Tab: Puntuación */}
              {tab === 'puntos' && (
                <div>
                  <p className="help-intro">Los puntos se otorgan automáticamente cuando el administrador carga los resultados reales.</p>
                  <table className="help-pts-table">
                    <thead>
                      <tr>
                        <th>Tipo de acierto</th>
                        <th>Puntos</th>
                      </tr>
                    </thead>
                    <tbody>
                      {PUNTUACION.map(p => (
                        <tr key={p.fase}>
                          <td>{p.fase}</td>
                          <td className="pts-cell">{p.pts} pts</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  <p className="help-note">💡 Un "resultado exacto" en grupos (ej. 2-1) da 3 puntos en vez de 1.</p>
                </div>
              )}

              {/* Tab: Desempate */}
              {tab === 'desempate' && (
                <div className="help-tiebreak">
                  <p className="help-intro">Si dos o más jugadores tienen el mismo puntaje, el ranking se decide así:</p>
                  <div className="tiebreak-steps">
                    <div className="tiebreak-step">
                      <div className="tiebreak-num">1</div>
                      <div>
                        <strong>Mayor puntaje total</strong>
                        <p>El jugador con más puntos acumulados gana.</p>
                      </div>
                    </div>
                    <div className="tiebreak-step">
                      <div className="tiebreak-num">2</div>
                      <div>
                        <strong>Más aciertos exactos</strong>
                        <p>Si empatan en puntos, gana quien acertó más resultados exactos (marcador preciso).</p>
                      </div>
                    </div>
                    <div className="tiebreak-step">
                      <div className="tiebreak-num">3</div>
                      <div>
                        <strong>Fecha de confirmación</strong>
                        <p>Si aún empatan, gana quien <strong>confirmó sus apuestas primero</strong>. Por eso confirma cuanto antes.</p>
                      </div>
                    </div>
                  </div>
                </div>
              )}

            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default HelpButton;
