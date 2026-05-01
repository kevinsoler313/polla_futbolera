/**
 * useBracket.js
 * Hook que encapsula el estado del bracket eliminatorio y su sincronización
 * inicial con la base de datos.
 *
 * Responsabilidad ÚNICA: estado de scores y tiebreakers del bracket.
 */
import { useState, useEffect } from 'react';
import { BRACKET_STRUCTURE } from '../utils/bracketUtils';

export const useBracket = (partidosEliminatoria, prediccionesPartidos) => {
  const [bracketScores, setBracketScores] = useState({});
  const [bracketTieBreakers, setBracketTieBreakers] = useState({});

  // ── Restaurar estado del bracket desde la base de datos al cargar ───────────
  useEffect(() => {
    if (partidosEliminatoria.length === 0 || prediccionesPartidos.length === 0) return;
    if (Object.keys(bracketScores).length > 0) return; // Ya inicializado

    // Construir mapa: dbId -> bracketId
    const dbIdToBracketId = {};
    const mapPhase = (faseStr, count) => {
      const pFase = partidosEliminatoria.filter(p => p.fase === faseStr);
      for (let i = 0; i < count; i++) {
        if (!pFase[i]) continue;
        let mId = '';
        if (faseStr === '1/16') mId = i < 8 ? `r16a${i + 1}` : `r16b${i - 7}`;
        else if (faseStr === 'octavos') mId = i < 4 ? `r8a${i + 1}` : `r8b${i - 3}`;
        else if (faseStr === 'cuartos') mId = `qf${i + 1}`;
        else if (faseStr === 'semis') mId = `sf${i + 1}`;
        else if (faseStr === 'final') mId = 'fn1';
        dbIdToBracketId[pFase[i].id] = mId;
      }
    };

    mapPhase('1/16', 16);
    mapPhase('octavos', 8);
    mapPhase('cuartos', 4);
    mapPhase('semis', 2);
    mapPhase('final', 1);

    const initialScores = {};
    for (const pred of prediccionesPartidos) {
      if (pred.fase === 'grupos') continue;
      const mId = dbIdToBracketId[pred.id_partido];
      if (mId && (pred.goles_equipo1 > 0 || pred.goles_equipo2 > 0)) {
        initialScores[mId] = { g1: pred.goles_equipo1, g2: pred.goles_equipo2 };
      }
    }

    if (Object.keys(initialScores).length > 0) {
      setBracketScores(initialScores);
    }
  }, [partidosEliminatoria, prediccionesPartidos]);

  // ── Handlers ────────────────────────────────────────────────────────────────
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
    if (window.confirm('¿Estás seguro de que quieres reiniciar todo el bracket?')) {
      setBracketScores({});
      setBracketTieBreakers({});
    }
  };

  return {
    bracketScores,
    bracketTieBreakers,
    handleBracketScoreChange,
    handleBracketTieBreaker,
    handleResetBracket,
  };
};
