/**
 * GroupStandingsRow.jsx
 * Fila individual de la tabla de posiciones de un grupo.
 * Responsabilidad única: renderizar una fila con datos de un equipo.
 */

const GroupStandingsRow = ({ equipo, posicion, showStats = false }) => {
  const rowClass = posicion <= 2 ? 'clasificado' : posicion === 3 ? 'tercero' : 'eliminado';

  return (
    <div className={`standings-row standings-row--${rowClass}`}>
      <span className="standings-pos">{posicion}</span>
      <span className="standings-team">
        <span className="standings-flag">{equipo.bandera}</span>
        <span className="standings-name">{equipo.nombre}</span>
      </span>
      {showStats ? (
        <>
          <span className="standings-stat">{equipo.pts ?? 0}</span>
          <span className={`standings-dg ${(equipo.dg ?? 0) > 0 ? 'pos' : (equipo.dg ?? 0) < 0 ? 'neg' : ''}`}>
            {(equipo.dg ?? 0) > 0 ? `+${equipo.dg}` : equipo.dg ?? 0}
          </span>
        </>
      ) : (
        <span className="standings-stat">{posicion}°</span>
      )}
    </div>
  );
};

export default GroupStandingsRow;
