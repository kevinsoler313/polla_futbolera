/**
 * bracketUtils.js
 * Constantes y funciones puras para la lógica del bracket eliminatorio.
 * Separadas del componente para que sean reutilizables y testeables.
 */

export const BRACKET_STRUCTURE = {
  dieciseisavos: [
    { id: 'r16a1', zona: 'A', slot: '2A vs 2B', tipo: ['2A', '2B'] },
    { id: 'r16a2', zona: 'A', slot: '1E vs 3°', tipo: ['1E', '3:A:B:C:D:F'] },
    { id: 'r16a3', zona: 'A', slot: '1F vs 2C', tipo: ['1F', '2C'] },
    { id: 'r16a4', zona: 'A', slot: '1C vs 2F', tipo: ['1C', '2F'] },
    { id: 'r16a5', zona: 'A', slot: '1I vs 3°', tipo: ['1I', '3:C:D:F:G:H'] },
    { id: 'r16a6', zona: 'A', slot: '2E vs 2I', tipo: ['2E', '2I'] },
    { id: 'r16a7', zona: 'A', slot: '1A vs 3°', tipo: ['1A', '3:C:E:F:H:I'] },
    { id: 'r16a8', zona: 'A', slot: '1L vs 3°', tipo: ['1L', '3:E:H:I:J:K'] },
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

export const TERCERO_SLOTS = [
  { lider: 'E', validos: ['A', 'B', 'C', 'D', 'F'] },
  { lider: 'I', validos: ['C', 'D', 'F', 'G', 'H'] },
  { lider: 'D', validos: ['B', 'E', 'F', 'I', 'J'] },
  { lider: 'G', validos: ['A', 'E', 'H', 'I', 'J'] },
  { lider: 'A', validos: ['C', 'E', 'F', 'H', 'I'] },
  { lider: 'L', validos: ['E', 'H', 'I', 'J', 'K'] },
  { lider: 'B', validos: ['E', 'F', 'G', 'I', 'J'] },
  { lider: 'K', validos: ['D', 'E', 'I', 'J', 'L'] },
];

export const GRUPOS_ORDEN = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L'];

/**
 * Determina qué tercero corresponde a cada slot del bracket.
 * @param {Array} mejoresTerceros - Los 8 mejores terceros ordenados
 * @returns {Object} Mapa { grupoLider: grupoAsignado }
 */
export const resolveThirdPlaces = (mejoresTerceros) => {
  let resto = mejoresTerceros.map(t => t.grupo);
  const asignacion = {};

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

/**
 * Construye la tabla de posiciones por grupo a partir de marcadores predichos.
 * Usada internamente para la fuente "automática" del bracket.
 */
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

        if (g1 > g2) stats[e1].pts += 3;
        else if (g2 > g1) stats[e2].pts += 3;
        else { stats[e1].pts += 1; stats[e2].pts += 1; }
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

/**
 * Construye los datos completos del bracket (equipos por partido) a partir
 * de predicciones de grupos o de marcadores (modo manual o automático).
 */
export const buildBracketData = (grupos, prediccionesPartidos, prediccionesGrupo = [], tercerosManual = [], source = 'manual') => {
  let primeros = {};
  let segundos = {};
  let tercerosLista = [];

  if (source === 'manual') {
    for (const g of grupos) {
      const preds = prediccionesGrupo.filter(p => g.equipos.some(e => e.id === p.id_equipo));
      const ordenados = [...g.equipos].sort((a, b) => {
        const posA = preds.find(p => p.id_equipo === a.id)?.posicion ?? 99;
        const posB = preds.find(p => p.id_equipo === b.id)?.posicion ?? 99;
        return posA - posB;
      });
      if (ordenados[0]) primeros[g.nombre] = { ...ordenados[0] };
      if (ordenados[1]) segundos[g.nombre] = { ...ordenados[1] };
    }
    tercerosLista = [...tercerosManual];
  } else {
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
    if (tipo.startsWith('1')) return primeros[tipo[1]] || null;
    if (tipo.startsWith('2')) return segundos[tipo[1]] || null;
    if (tipo.startsWith('3:')) {
      const partner = match.tipo[0];
      const slotLeader = partner.startsWith('1') ? partner[1] : null;
      if (slotLeader && tercerosMap[slotLeader]) return tercerosMap[slotLeader];
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
    matches[m.id] = { ...m, equipo1: resolverTipo(m.tipo[0], m), equipo2: resolverTipo(m.tipo[1], m) };
  }

  return { matches, primeros, segundos, tercerosLista, tercerosMap };
};

/**
 * Convierte un matchId del bracket al índice del partido en la base de datos.
 */
export const getDbIndexFromMatchId = (matchId, fase) => {
  if (fase === '1/16') {
    const zona = matchId.includes('a') ? 0 : 8;
    const num = parseInt(matchId.match(/\d+$/)?.[0] ?? '1');
    return zona + (num - 1);
  }
  if (fase === 'octavos') {
    const zona = matchId.includes('a') ? 0 : 4;
    const num = parseInt(matchId.match(/\d+$/)?.[0] ?? '1');
    return zona + (num - 1);
  }
  const num = parseInt(matchId.match(/\d+$/)?.[0] ?? '1');
  return num - 1;
};

/**
 * Determina la fase de una ronda dado el matchId.
 */
export const getFaseFromMatchId = (matchId) => {
  if (matchId.startsWith('r16')) return '1/16';
  if (matchId.startsWith('r8')) return 'octavos';
  if (matchId.startsWith('qf')) return 'cuartos';
  if (matchId.startsWith('sf')) return 'semis';
  if (matchId.startsWith('fn')) return 'final';
  return '';
};
