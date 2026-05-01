import { useState, useMemo, useEffect, useRef } from 'react';
import { adminService } from '../services/api';
import {
  BRACKET_STRUCTURE,
  TERCERO_SLOTS,
  GRUPOS_ORDEN,
  buildBracketData,
  getDbIndexFromMatchId,
  getFaseFromMatchId,
} from '../utils/bracketUtils';
import './Bracket.css';

// ── Componente ───────────────────────────────────────────────────────────────


const Bracket = ({

  grupos,
  prediccionesPartidos,
  prediccionesGrupo,
  partidosEliminatoria,
  onSave,
  scores = {},
  tieBreakers = {},
  onScoreChange,
  onTieBreakerChange,
  onReset,
  tercerosManual = [],
  isAdminMode = false,
  onRegisterSaveFn,
}) => {
  const [source, setSource] = useState('manual'); // 'manual' | 'automatic'
  const [saving, setSaving] = useState(false);
  const [mensaje, setMensaje] = useState({ text: '', type: '' });

  const bracketData = useMemo(() => {
    return buildBracketData(grupos, prediccionesPartidos, prediccionesGrupo, tercerosManual, source);
  }, [grupos, prediccionesPartidos, prediccionesGrupo, tercerosManual, source]);

  const hasData = bracketData.matches && Object.keys(bracketData.matches).length > 0;
  
  const getWinner = (matchId) => {
    const matchScores = scores[matchId];
    const teams = getMatchTeams(matchId);

    if (matchScores && teams.equipo1 && teams.equipo2) {
      const g1 = matchScores.g1 ?? 0;
      const g2 = matchScores.g2 ?? 0;

      if (g1 > g2) return teams.equipo1;
      if (g2 > g1) return teams.equipo2;
      
      // Empate: usar tie-breaker
      const tbWinnerId = tieBreakers[matchId];
      if (tbWinnerId === teams.equipo1.id) return teams.equipo1;
      if (tbWinnerId === teams.equipo2.id) return teams.equipo2;
    }
    
    return null;
  };

  const getMatchTeams = (matchId) => {
    // Si es dieciseisavos, ya vienen en bracketData
    if (bracketData.matches[matchId]) {
      return { 
        equipo1: bracketData.matches[matchId].equipo1, 
        equipo2: bracketData.matches[matchId].equipo2 
      };
    }

    // Buscar en estructura para ver de qué matches viene
    let structureMatch = null;
    for (const round of Object.values(BRACKET_STRUCTURE)) {
      structureMatch = round.find(rm => rm.id === matchId);
      if (structureMatch) break;
    }

    if (!structureMatch || !structureMatch.tipo) return { equipo1: null, equipo2: null };

    return {
      equipo1: getWinner(structureMatch.tipo[0]),
      equipo2: getWinner(structureMatch.tipo[1]),
    };
  };

  // Registrar la función de guardado en el Dashboard padre (sin usar window)
  useEffect(() => {
    if (onRegisterSaveFn) {
      onRegisterSaveFn(handleSave);
    }
  }, [scores, tieBreakers, partidosEliminatoria]);

  const handleScoreChange = (matchId, team, value) => {
    if (onScoreChange) onScoreChange(matchId, team, value);
  };

  const handleTieBreaker = (matchId, winnerId) => {
    if (onTieBreakerChange) onTieBreakerChange(matchId, winnerId);
  };

  const clearDescendants = (matchId) => {
    // La lógica de descendientes ahora es reactiva gracias a useMemo / getWinner
    // No necesitamos limpiar un mapa manual de winners ya que se calcula al vuelo
  };

  const handleSave = async (asAdmin = false) => {
    setSaving(true);
    setMensaje({ text: '', type: '' });
    try {
      const bracketPredictions = [];
      const adminPromises = [];

      for (const round of Object.values(BRACKET_STRUCTURE)) {
        for (const m of round) {
          const winner = getWinner(m.id);
          const teams = getMatchTeams(m.id);
          const matchScores = scores[m.id] || { g1: 0, g2: 0 };

          if (winner && teams.equipo1 && teams.equipo2) {
            const fase = getFaseFromMatchId(m.id);
            const partidosFase = partidosEliminatoria.filter(p => p.fase === fase);
            const index = getDbIndexFromMatchId(m.id, fase);

            if (index >= 0 && index < partidosFase.length) {
              const dbMatchId = partidosFase[index].id;
              const g1 = matchScores.g1 === '' ? 0 : matchScores.g1;
              const g2 = matchScores.g2 === '' ? 0 : matchScores.g2;

              if (asAdmin) {
                adminPromises.push(adminService.actualizarClasificadosLlave(dbMatchId, teams.equipo1.id, teams.equipo2.id));
                adminPromises.push(adminService.actualizarMarcadorPartido(dbMatchId, g1, g2));
              } else {
                bracketPredictions.push({
                  id_partido: dbMatchId,
                  id_equipo1: teams.equipo1.id,
                  id_equipo2: teams.equipo2.id,
                  goles_equipo1: g1,
                  goles_equipo2: g2,
                  ganador: winner.id,
                });
              }
            }
          }
        }
      }

      if (asAdmin) {
        await Promise.all(adminPromises);
      } else if (onSave) {
        await onSave(bracketPredictions);
      }

      setMensaje({ text: asAdmin ? 'Bracket guardado (Admin)!' : '¡Bracket guardado!', type: 'success' });
      setTimeout(() => setMensaje({ text: '', type: '' }), 3000);
    } catch (error) {
      setMensaje({ text: error.message || 'Error al guardar', type: 'error' });
      throw error;
    } finally {
      setSaving(false);
    }
  };

  if (!hasData) {
    return (
      <div className="bracket-container">
        <div className="bracket-empty-state">
          <h3>📋 Primero completa tus predicciones</h3>
          <p>Para generar el bracket, ingresa los marcadores en <strong>Marcadores</strong> para que se calculen las tablas y se definan los clasificados.</p>
        </div>
      </div>
    );
  }

  const renderRound = (roundName, label) => {
    const matches = BRACKET_STRUCTURE[roundName];
    return (
      <div className={`bracket-column bracket-column--${roundName}`} key={roundName}>
        <div className="bracket-column-header">{label}</div>
        <div className="bracket-column-body">
          {matches.map((m, idx) => {
            const teams = getMatchTeams(m.id);
            const winner = getWinner(m.id);
            const matchScores = scores[m.id] || { g1: '', g2: '' };
            const isTie = matchScores.g1 !== '' && matchScores.g2 !== '' && matchScores.g1 === matchScores.g2;
            
            return (
              <div key={m.id} className="bracket-match-wrapper">
                <div className={`bracket-match-card ${m.zona ? `zona-${m.zona.toLowerCase()}` : ''}`}>
                  <div className="match-info">{m.slot || `${label} ${idx + 1}`}</div>
                  
                  <div className={`match-team ${teams.equipo1 ? '' : 'is-empty'} ${winner?.id === teams.equipo1?.id ? 'is-winner' : ''}`}>
                    <span className="team-flag">{teams.equipo1?.bandera || '❓'}</span>
                    <span className="team-name">{teams.equipo1?.nombre || 'Por definir'}</span>
                    {teams.equipo1 && (
                      <input 
                        type="number" 
                        min="0"
                        className="bracket-score-input"
                        value={matchScores.g1}
                        onChange={(e) => handleScoreChange(m.id, 1, e.target.value)}
                      />
                    )}
                  </div>

                  <div className={`match-team ${teams.equipo2 ? '' : 'is-empty'} ${winner?.id === teams.equipo2?.id ? 'is-winner' : ''}`}>
                    <span className="team-flag">{teams.equipo2?.bandera || '❓'}</span>
                    <span className="team-name">{teams.equipo2?.nombre || 'Por definir'}</span>
                    {teams.equipo2 && (
                      <input 
                        type="number" 
                        min="0"
                        className="bracket-score-input"
                        value={matchScores.g2}
                        onChange={(e) => handleScoreChange(m.id, 2, e.target.value)}
                      />
                    )}
                  </div>

                  {isTie && (
                    <div className="tie-breaker-ui">
                      <div className="tie-label">Empate: ¿quién avanza?</div>
                      <div className="tie-buttons">
                        <button 
                          className={`tie-btn ${tieBreakers[m.id] === teams.equipo1?.id ? 'active' : ''}`}
                          onClick={() => handleTieBreaker(m.id, teams.equipo1.id)}
                        >
                          {teams.equipo1?.nombre}
                        </button>
                        <button 
                          className={`tie-btn ${tieBreakers[m.id] === teams.equipo2?.id ? 'active' : ''}`}
                          onClick={() => handleTieBreaker(m.id, teams.equipo2.id)}
                        >
                          {teams.equipo2?.nombre}
                        </button>
                      </div>
                    </div>
                  )}
                </div>
                {roundName !== 'final' && <div className="bracket-connector-out"></div>}
                {roundName !== 'dieciseisavos' && <div className="bracket-connector-in"></div>}
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  return (
    <div className="bracket-view">
      <div className="bracket-header-nav">
        <div>
          <h2 className="bracket-title">🏟️ Árbol de Eliminatorias</h2>
          <p className="bracket-subtitle">Haz clic en un equipo para avanzarlo. Todo se conecta automáticamente.</p>
        </div>
        <div className="bracket-controls">
          <div className="source-toggle-group">
            <span className="toggle-label-outer">Fuente:</span>
            <div className="toggle-buttons-box">
              <button
                className={`toggle-btn ${source === 'manual' ? 'active' : ''}`}
                onClick={() => setSource('manual')}
              >
                Manual
              </button>
              <button
                className={`toggle-btn ${source === 'automatic' ? 'active' : ''}`}
                onClick={() => setSource('automatic')}
              >
                Automática
              </button>
            </div>
          </div>
          <button
            className="btn-secondary bracket-reset-btn"
            onClick={onReset}
          >
            Reiniciar
          </button>
        </div>
      </div>

      {mensaje.text && (
        <div className={`alert alert-${mensaje.type} animate-fade-in-up`}>
          {mensaje.text}
        </div>
      )}

      <div className="bracket-canvas">
        <div className="bracket-tree-container">
          {renderRound('dieciseisavos', '16avos')}
          {renderRound('octavos', 'Octavos')}
          {renderRound('cuartos', 'Cuartos')}
          {renderRound('semis', 'Semis')}
          {renderRound('final', 'Final')}

          {/* ── CAMPEÓN ────────────────────────────────────── */}
          <div className="bracket-column bracket-column--champion">
            <div className="bracket-column-header">Campeón</div>
            <div className="bracket-column-body">
              <div className="champion-card-wrapper">
                {getWinner('fn1') ? (
                  <div className="champion-card animate-crown">
                    <div className="trophy-icon">🏆</div>
                    <div className="champion-flag">{getWinner('fn1').bandera}</div>
                    <div className="champion-name">{getWinner('fn1').nombre}</div>
                    <div className="champion-label">¡CAMPEÓN!</div>
                  </div>
                ) : (
                  <div className="champion-card is-empty">
                    <div className="trophy-icon" style={{ opacity: 0.2 }}>🏆</div>
                    <div className="champion-name">Por definir</div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Bracket;
