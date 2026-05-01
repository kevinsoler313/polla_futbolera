/**
 * Ranking.jsx
 * Página completa de Rankings y Ligas Privadas.
 * Responsabilidad: Orquestar el hook useRanking y los modales de ligas.
 */
import { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useRanking } from '../hooks/useRanking';
import CreateLeagueModal from '../components/leagues/CreateLeagueModal';
import JoinLeagueModal from '../components/leagues/JoinLeagueModal';
import './Ranking.css';

const MEDAL = ['🥇', '🥈', '🥉'];

const Ranking = () => {
  const { usuario } = useAuth();
  const {
    ligaActiva, misLigas, ranking,
    loading, loadingRanking, error,
    cambiarLiga, crearLiga, unirseALiga,
  } = useRanking();

  const [modalCrear, setModalCrear] = useState(false);
  const [modalUnirse, setModalUnirse] = useState(false);

  if (loading) {
    return (
      <div className="ranking-loading">
        <div className="spinner-ring" style={{ width: 40, height: 40 }} />
        <p>Cargando rankings...</p>
      </div>
    );
  }

  const tituloActivo = ligaActiva ? ligaActiva.nombre : 'Ranking Global';

  return (
    <div className="ranking-page animate-fade-in-up">

      {/* ── Cabecera ─────────────────────────────────────────────────────── */}
      <div className="ranking-header glass-panel">
        <div>
          <h1 className="ranking-title">Rankings</h1>
          <p className="ranking-subtitle">Compara tus puntos con tus amigos y el mundo</p>
        </div>
        <div className="ranking-actions">
          <button
            id="btn-unirse-liga-header"
            className="btn-secondary"
            onClick={() => setModalUnirse(true)}
          >
            Unirme con Código
          </button>
          <button
            id="btn-crear-liga-header"
            className="btn-primary"
            onClick={() => setModalCrear(true)}
          >
            + Crear Liga
          </button>
        </div>
      </div>

      <div className="ranking-layout">

        {/* ── Sidebar: Selector de Ligas ──────────────────────────────── */}
        <div className="leagues-sidebar">
          <div className="leagues-sidebar-card glass-panel">
            <div className="leagues-sidebar-title">Mis Ligas</div>

            {/* Global */}
            <button
              id="btn-liga-global"
              className={`league-btn ${ligaActiva === null ? 'active' : ''}`}
              onClick={() => cambiarLiga(null)}
            >
              <span className="league-btn-icon">🌐</span>
              <span className="league-btn-name">Global</span>
            </button>

            {/* Ligas del usuario */}
            {misLigas.map(liga => (
              <button
                key={liga.id}
                id={`btn-liga-${liga.id}`}
                className={`league-btn ${ligaActiva?.id === liga.id ? 'active' : ''}`}
                onClick={() => cambiarLiga(liga)}
              >
                <span className="league-btn-icon">🏆</span>
                <div className="league-btn-info">
                  <span className="league-btn-name">{liga.nombre}</span>
                  <span className="league-btn-meta">{liga.total_miembros} participantes</span>
                </div>
              </button>
            ))}

            {misLigas.length === 0 && (
              <p className="leagues-empty">
                Aún no tienes ligas.<br />
                ¡Crea una o únete a la de un amigo!
              </p>
            )}
          </div>
        </div>

        {/* ── Tabla de Ranking ─────────────────────────────────────────── */}
        <div className="ranking-table-container">
          <div className="ranking-table-header">
            <h2 className="ranking-table-title">{tituloActivo}</h2>
            {ligaActiva && (
              <span className="ranking-code-badge">{ligaActiva.codigo}</span>
            )}
          </div>

          {error && <div className="ranking-error">{error}</div>}

          {loadingRanking ? (
            <div className="ranking-loading-inline">
              <div className="spinner-ring" style={{ width: 32, height: 32 }} />
            </div>
          ) : (
            <div className="ranking-table glass-panel">

              {/* Header de columnas */}
              <div className="ranking-row ranking-row--header">
                <span>#</span>
                <span>Jugador</span>
                <span>Pts</span>
                <span title="Aciertos Exactos">Exactos</span>
              </div>

              {ranking.length === 0 ? (
                <div className="ranking-empty">
                  Esta liga aún no tiene participantes suficientes.
                </div>
              ) : (
                ranking.map((entry) => (
                  <div
                    key={entry.id}
                    className={`ranking-row ${entry.es_yo ? 'ranking-row--me' : ''} ${entry.posicion <= 3 ? `ranking-row--top${entry.posicion}` : ''}`}
                  >
                    <span className="ranking-pos">
                      {entry.posicion <= 3
                        ? MEDAL[entry.posicion - 1]
                        : entry.posicion}
                    </span>

                    <span className="ranking-player">
                      <div className="ranking-avatar">
                        {entry.nombre_usuario.charAt(0).toUpperCase()}
                      </div>
                      <div className="ranking-player-info">
                        <span className="ranking-username">
                          {entry.nombre_usuario}
                          {entry.es_yo && <span className="yo-badge">Tú</span>}
                        </span>
                      </div>
                    </span>

                    <span className="ranking-pts">{entry.puntaje}</span>
                    <span className="ranking-exactos">{entry.aciertos_exactos}</span>
                  </div>
                ))
              )}
            </div>
          )}

          {/* ── Reglas de Puntuación ──────────────────────────────────── */}
          <details className="scoring-rules glass-panel">
            <summary className="scoring-rules-summary">Ver Reglas de Puntuación</summary>
            <div className="scoring-rules-body">
              <div className="scoring-phase">
                <h4>Fase de Grupos</h4>
                <ul>
                  <li>Acertar ganador/empate (PGE): <strong>1 pt</strong></li>
                  <li>Acertar marcador exacto: <strong>+2 pts</strong></li>
                  <li>Acertar clasificado 1° o 2° del grupo: <strong>+3 pts</strong></li>
                  <li>Acertar un mejor tercero: <strong>+3 pts</strong></li>
                </ul>
              </div>
              <div className="scoring-phase">
                <h4>Fases Eliminatorias</h4>
                <table className="scoring-table">
                  <thead>
                    <tr><th>Ronda</th><th>Clasifica</th><th>PGE</th><th>Exacto</th></tr>
                  </thead>
                  <tbody>
                    <tr><td>1/16</td><td>3</td><td>4</td><td>6</td></tr>
                    <tr><td>Octavos</td><td>5</td><td>6</td><td>10</td></tr>
                    <tr><td>Cuartos</td><td>7</td><td>8</td><td>12</td></tr>
                    <tr><td>Semis</td><td>9</td><td>10</td><td>14</td></tr>
                    <tr><td>Final</td><td>11</td><td>12</td><td>16</td></tr>
                  </tbody>
                </table>
              </div>
              <p className="scoring-tiebreak">
                Desempate: Primero por aciertos exactos, luego por registro más temprano.
              </p>
            </div>
          </details>
        </div>
      </div>

      {/* ── Modales ──────────────────────────────────────────────────────── */}
      {modalCrear && (
        <CreateLeagueModal
          onClose={() => setModalCrear(false)}
          onCreate={crearLiga}
        />
      )}
      {modalUnirse && (
        <JoinLeagueModal
          onClose={() => setModalUnirse(false)}
          onJoin={unirseALiga}
        />
      )}
    </div>
  );
};

export default Ranking;
