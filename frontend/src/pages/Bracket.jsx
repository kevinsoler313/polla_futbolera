import { useState, useMemo, useEffect } from 'react';
import './Bracket.css';

// ── Constantes: definición fija de los cruces ────────────────────────────────

const BRACKET_STRUCTURE = {
  dieciseisavos: [
    // Zona A
    { id: 'r16a1', zona: 'A', slot: '2A vs 2B', tipo: ['2A', '2B'] },
    { id: 'r16a2', zona: 'A', slot: '1E vs 3°', tipo: ['1E', '3:A:B:C:D:F'] },
    { id: 'r16a3', zona: 'A', slot: '1F vs 2C', tipo: ['1F', '2C'] },
    { id: 'r16a4', zona: 'A', slot: '1C vs 2F', tipo: ['1C', '2F'] },
    { id: 'r16a5', zona: 'A', slot: '1I vs 3°', tipo: ['1I', '3:C:D:F:G:H'] },
    { id: 'r16a6', zona: 'A', slot: '2E vs 2I', tipo: ['2E', '2I'] },
    { id: 'r16a7', zona: 'A', slot: '1A vs 3°', tipo: ['1A', '3:C:E:F:H:I'] },
    { id: 'r16a8', zona: 'A', slot: '1L vs 3°', tipo: ['1L', '3:E:H:I:J:K'] },
    // Zona B
    { id: 'r16b1', zona: 'B', slot: '1D vs 3°', tipo: ['1D', '3:B:E:F:I:J'] },
    { id: 'r16b2', zona: 'B', slot: '1G vs 3°', tipo: ['1G', '3:A:E:H:I:J'] },
    { id: 'r16b3', zona: 'B', slot: '2K vs 2L', tipo: ['2K', '2L'] },
    { id: 'r16b4', zona: 'B', slot: '1H vs 2J', tipo: ['1H', '2J'] },
    { id: 'r16b5', zona: 'B', slot: '1B vs 3°', tipo: ['1B', '3:E:F:G:I:J'] },
    { id: 'r16b6', zona: 'B', slot: '1J vs 2H', tipo: ['1J', '2H'] },
    { id: 'r16b7', zona: 'B', slot: '1K vs 3°', tipo: ['1K', '3:D:E:I:J:L'] },
    { id: 'r16b8', zona: 'B', slot: '2D vs 2G', tipo: ['2D', '2G'] },
  ],
  octavos: [
    { id: 'r8a1', zona: 'A', tipo: ['r16a1', 'r16a2'] },
    { id: 'r8a2', zona: 'A', tipo: ['r16a3', 'r16a4'] },
    { id: 'r8a3', zona: 'A', tipo: ['r16a5', 'r16a6'] },
    { id: 'r8a4', zona: 'A', tipo: ['r16a7', 'r16a8'] },
    { id: 'r8b1', zona: 'B', tipo: ['r16b1', 'r16b2'] },
    { id: 'r8b3', zona: 'B', tipo: ['r16b3', 'r16b4'] },
    { id: 'r8b2', zona: 'B', tipo: ['r16b5', 'r16b6'] },
    { id: 'r8b4', zona: 'B', tipo: ['r16b7', 'r16b8'] },
  ],
  cuartos: [
    { id: 'qf1', zona: 'A', tipo: ['r8a1', 'r8a2'] },
    { id: 'qf2', zona: 'A', tipo: ['r8a3', 'r8a4'] },
    { id: 'qf3', zona: 'B', tipo: ['r8b1', 'r8b3'] },
    { id: 'qf4', zona: 'B', tipo: ['r8b2', 'r8b4'] },
  ],
  semis: [
    { id: 'sf1', zona: 'A', tipo: ['qf1', 'qf2'] },
    { id: 'sf2', zona: 'B', tipo: ['qf3', 'qf4'] },
  ],
  final: [
    { id: 'fn1', zona: 'F', tipo: ['sf1', 'sf2'] },
  ],
};

const TERCERO_SLOTS = [
  { lider: 'E', validos: ['A', 'B', 'C', 'D', 'F'] },
  { lider: 'I', validos: ['C', 'D', 'F', 'G', 'H'] },
  { lider: 'D', validos: ['B', 'E', 'F', 'I', 'J'] },
  { lider: 'G', validos: ['A', 'E', 'H', 'I', 'J'] },
  { lider: 'A', validos: ['C', 'E', 'F', 'H', 'I'] },
  { lider: 'L', validos: ['E', 'H', 'I', 'J', 'K'] },
  { lider: 'B', validos: ['E', 'F', 'G', 'I', 'J'] },
  { lider: 'K', validos: ['D', 'E', 'I', 'J', 'L'] },
];

const GRUPOS_ORDEN = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L'];

// ── Helpers ──────────────────────────────────────────────────────────────────

const resolveThirdPlaces = (mejoresTerceros) => {
  const disponibles = [...mejoresTerceros];
  const asignacion = {};
  let resto = disponibles.map(t => t.grupo);

  for (const { lider, validos } of TERCERO_SLOTS) {
    const encontrado = resto.find(g => validos.includes(g));
    if (encontrado) {
      asignacion[lider] = encontrado;
      resto = resto.filter(g => g !== encontrado);
    } else {
      asignacion[lider] = null;
    }
  }

  return asignacion;
};

const buildTableFromPartidos = (grupos, prediccionesPartidos) => {
  const tables = {};
  for (const g of grupos) {
    const stats = g.equipos.reduce((acc, eq) => {
      acc[eq.id] = { ...eq, pts: 0, dg: 0, gf: 0 };
      return acc;
    }, {});

    for (const match of g.partidos) {
      const pred = prediccionesPartidos.find(p => p.id_partido === match.id);
      if (!pred) continue;

      const g1 = pred.goles_equipo1;
      const g2 = pred.goles_equipo2;
      const e1 = match.id_equipo1;
      const e2 = match.id_equipo2;

      if (stats[e1] && stats[e2]) {
        stats[e1].gf += g1;
        stats[e1].dg += (g1 - g2);
        stats[e2].gf += g2;
        stats[e2].dg += (g2 - g1);

        if (g1 > g2) {
          stats[e1].pts += 3;
        } else if (g2 > g1) {
          stats[e2].pts += 3;
        } else {
          stats[e1].pts += 1;
          stats[e2].pts += 1;
        }
      }
    }

    const ordenados = Object.values(stats).sort((a, b) => {
      if (b.pts !== a.pts) return b.pts - a.pts;
      if (b.dg !== a.dg) return b.dg - a.dg;
      return b.gf - a.gf;
    });

    tables[g.nombre] = ordenados;
  }
  return tables;
};

const buildBracketData = (grupos, prediccionesPartidos, prediccionesGrupo = [], tercerosManual = [], source = 'manual') => {
  let primeros = {};
  let segundos = {};
  let tercerosLista = [];

  if (source === 'manual') {
    // ── FUENTE MANUAL: Usar prediccionesGrupo para 1° y 2°, y tercerosManual para 3° ──
    for (const g of grupos) {
      // Filtrar predicciones de este grupo y ordenar por posición
      const preds = prediccionesGrupo.filter(p => g.equipos.some(e => e.id === p.id_equipo));
      const ordenados = [...g.equipos].sort((a, b) => {
        const posA = preds.find(p => p.id_equipo === a.id)?.posicion || 99;
        const posB = preds.find(p => p.id_equipo === b.id)?.posicion || 99;
        return posA - posB;
      });

      if (ordenados[0]) primeros[g.nombre] = { ...ordenados[0] };
      if (ordenados[1]) segundos[g.nombre] = { ...ordenados[1] };
    }
    tercerosLista = [...tercerosManual];
  } else {
    // ── FUENTE AUTOMÁTICA: Basado en marcadores (prediccionesPartidos) ──
    const tables = buildTableFromPartidos(grupos, prediccionesPartidos);
    for (const nom of GRUPOS_ORDEN) {
      const table = tables[nom];
      if (!table || table.length === 0) continue;
      if (table[0]) primeros[nom] = { ...table[0] };
      if (table[1]) segundos[nom] = { ...table[1] };
      if (table[2]) tercerosLista.push({ ...table[2], grupo: nom });
    }

    tercerosLista.sort((a, b) => {
      if (b.pts !== a.pts) return b.pts - a.pts;
      if (b.dg !== a.dg) return b.dg - a.dg;
      return b.gf - a.gf;
    });
  }
  
  // En cualquier caso, solo avanzan los 8 mejores
  const mejoresTerceros = tercerosLista.slice(0, 8);
  const asignacionTerceros = resolveThirdPlaces(mejoresTerceros);

  const tercerosMap = {};
  for (const [slotLeader, grupoAsignado] of Object.entries(asignacionTerceros)) {
    if (grupoAsignado) {
      const equipo = tercerosLista.find(t => t.grupo === grupoAsignado);
      if (equipo) tercerosMap[slotLeader] = equipo;
    }
  }

  const resolverTipo = (tipo, match) => {
    if (tipo.startsWith('1')) {
      const grupo = tipo[1];
      return primeros[grupo] || null;
    }
    if (tipo.startsWith('2')) {
      const grupo = tipo[1];
      return segundos[grupo] || null;
    }
    if (tipo.startsWith('3:')) {
      const partner = match.tipo[0];
      const slotLeader = partner.startsWith('1') ? partner[1] : null;
      if (slotLeader && tercerosMap[slotLeader]) {
        return tercerosMap[slotLeader];
      }
      const validos = tipo.substring(2).split(':');
      for (const g of validos) {
        if (asignacionTerceros[g]) {
          const grupoReal = asignacionTerceros[g];
          const tercero = tercerosLista.find(t => t.grupo === grupoReal);
          if (tercero) return tercero;
        }
      }
      return null;
    }
    return null;
  };

  const matches = {};
  for (const m of BRACKET_STRUCTURE.dieciseisavos) {
    const eq1 = resolverTipo(m.tipo[0], m);
    const eq2 = resolverTipo(m.tipo[1], m);
    matches[m.id] = { ...m, equipo1: eq1, equipo2: eq2 };
  }

  return { matches, primeros, segundos, tercerosLista, tercerosMap };
};

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
  tercerosManual = []
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

  useEffect(() => {
    // Registrar la función de guardado global para que el Dashboard la use
    window.dispatchBracketSave = handleSave;
    return () => {
      delete window.dispatchBracketSave;
    };
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

  const handleSave = async () => {
    setSaving(true);
    setMensaje({ text: '', type: '' });
    try {
      const faseMap = {
        'r16': '1/16',
        'r8': '1/8',
        'qf': '1/4',
        'sf': 'semi',
        'fn': 'final',
      };

      const bracketPredictions = [];
      
      // Recorrer todos los matches de la estructura para ver quién ganó
      for (const round of Object.values(BRACKET_STRUCTURE)) {
        for (const m of round) {
          const winner = getWinner(m.id);
          const teams = getMatchTeams(m.id);
          const matchScores = scores[m.id] || { g1: 0, g2: 0 };
          
          if (winner && teams.equipo1 && teams.equipo2) {
            let fase = '';
            if (m.id.startsWith('r16')) fase = '1/16';
            else if (m.id.startsWith('r8')) fase = 'octavos';
            else if (m.id.startsWith('qf')) fase = 'cuartos';
            else if (m.id.startsWith('sf')) fase = 'semis';
            else if (m.id.startsWith('fn')) fase = 'final';

            const partidosFase = partidosEliminatoria.filter(p => p.fase === fase);
            let index = -1;
            // (Lógica de index igual que antes...)
            if (fase === '1/16') {
              const zona = m.id.includes('a') ? 0 : 8;
              const numMatch = m.id.match(/\d+$/);
              const num = numMatch ? parseInt(numMatch[0]) : 1;
              index = zona + (num - 1);
            } else if (fase === 'octavos') {
              const zona = m.id.includes('a') ? 0 : 4;
              const numMatch = m.id.match(/\d+$/);
              const num = numMatch ? parseInt(numMatch[0]) : 1;
              index = zona + (num - 1);
            } else if (fase === 'cuartos') {
              const numMatch = m.id.match(/\d+$/);
              const num = numMatch ? parseInt(numMatch[0]) : 1;
              index = num - 1;
            } else if (fase === 'semis') {
              const numMatch = m.id.match(/\d+$/);
              const num = numMatch ? parseInt(numMatch[0]) : 1;
              index = num - 1;
            } else if (fase === 'final') {
              index = 0;
            }

            if (index >= 0 && index < partidosFase.length) {
              bracketPredictions.push({
                id_partido: partidosFase[index].id,
                id_equipo1: teams.equipo1.id,
                id_equipo2: teams.equipo2.id,
                goles_equipo1: matchScores.g1 === '' ? 0 : matchScores.g1,
                goles_equipo2: matchScores.g2 === '' ? 0 : matchScores.g2,
                ganador: winner.id
              });
            }
          }
        }
      }

      if (onSave) {
        await onSave(bracketPredictions);
      }
      setMensaje({ text: '¡Bracket guardado con éxito!', type: 'success' });
      setTimeout(() => setMensaje({ text: '', type: '' }), 3000);
    } catch (error) {
      setMensaje({ text: error.message || 'Error al guardar', type: 'error' });
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
          <div className="source-toggle">
            <span className="toggle-label">Fuente:</span>
            <div className="toggle-buttons">
              <button 
                className={`toggle-btn ${source === 'manual' ? 'active' : ''}`}
                onClick={() => setSource('manual')}
              >
                🥈 Manual
              </button>
              <button 
                className={`toggle-btn ${source === 'automatic' ? 'active' : ''}`}
                onClick={() => setSource('automatic')}
              >
                📊 Automática
              </button>
            </div>
          </div>
          <button
            className="btn-secondary bracket-reset-btn"
            onClick={onReset}
          >
            🔄 Reiniciar
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
