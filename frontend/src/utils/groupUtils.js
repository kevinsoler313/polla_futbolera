/**
 * groupUtils.js
 * Funciones puras para cálculo de tablas de grupos y terceros.
 * No tienen estado, no tienen side-effects. Son 100% testeables.
 */

/**
 * Construye la tabla de posiciones de un grupo basada en predicciones de marcadores.
 * @param {Array} equipos - Lista de equipos del grupo
 * @param {Array} partidos - Lista de partidos del grupo
 * @param {Array} predicciones - Predicciones de marcadores del usuario
 * @returns {Array} Tabla ordenada por pts, dg, gf
 */
export const buildGroupTable = (equipos, partidos, predicciones) => {
  const stats = equipos.reduce((acc, eq) => {
    acc[eq.id] = { ...eq, pj: 0, pg: 0, pe: 0, pp: 0, gf: 0, gc: 0, dg: 0, pts: 0 };
    return acc;
  }, {});

  partidos.forEach(match => {
    const pred = predicciones.find(p => p.id_partido === match.id);
    if (!pred) return;

    const g1 = pred.goles_equipo1;
    const g2 = pred.goles_equipo2;
    const e1 = match.id_equipo1;
    const e2 = match.id_equipo2;

    if (!stats[e1] || !stats[e2]) return;

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
  });

  return Object.values(stats).sort((a, b) => {
    if (b.pts !== a.pts) return b.pts - a.pts;
    if (b.dg !== a.dg) return b.dg - a.dg;
    return b.gf - a.gf;
  });
};

/**
 * Ordena los equipos de un grupo según las predicciones manuales de posición.
 * @param {Array} equipos - Lista de equipos del grupo
 * @param {Array} predicciones - Predicciones de posición en grupo
 * @returns {Array} Equipos ordenados por posición predicha
 */
export const sortEquiposByPrediction = (equipos, predicciones) => {
  const preds = predicciones.filter(p => equipos.some(e => e.id === p.id_equipo));
  if (preds.length === 0) return equipos;

  return [...equipos].sort((a, b) => {
    const posA = preds.find(p => p.id_equipo === a.id)?.posicion ?? 99;
    const posB = preds.find(p => p.id_equipo === b.id)?.posicion ?? 99;
    return posA - posB;
  });
};

/**
 * Calcula los mejores terceros a partir de las tablas simuladas (por marcadores).
 * @param {Array} grupos - Lista completa de grupos con equipos y partidos
 * @param {Array} predicciones - Predicciones de marcadores
 * @returns {Array} Lista de terceros ordenados por puntos
 */
export const buildThirdPlacesFromTable = (grupos, predicciones) => {
  const terceros = grupos.map(g => {
    const table = buildGroupTable(g.equipos, g.partidos, predicciones);
    return table[2] ? { ...table[2], grupo: g.nombre } : null;
  }).filter(Boolean);

  return terceros.sort((a, b) => {
    if (b.pts !== a.pts) return b.pts - a.pts;
    if (b.dg !== a.dg) return b.dg - a.dg;
    return b.gf - a.gf;
  });
};

/**
 * Calcula los terceros de cada grupo a partir de las predicciones manuales de posición.
 * @param {Array} grupos - Lista completa de grupos con equipos
 * @param {Array} predicciones - Predicciones de posición en grupo
 * @returns {Array} Lista de terceros (uno por grupo)
 */
export const buildThirdPlacesFromPositions = (grupos, predicciones) => {
  return grupos.map(g => {
    const equiposOrdenados = sortEquiposByPrediction(g.equipos, predicciones);
    const equipoTercero = equiposOrdenados[2];
    return equipoTercero ? { ...equipoTercero, grupo: g.nombre, pts: 0, dg: 0, gf: 0 } : null;
  }).filter(Boolean);
};
