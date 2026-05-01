/**
 * LoadingScreen.jsx
 * Pantalla de carga global. Responsabilidad única: mostrar el spinner.
 */
const LoadingScreen = () => (
  <div className="loading-screen">
    <div className="loading-spinner">
      <div className="spinner-ring" />
      <div className="spinner-ball" />
    </div>
    <p className="loading-text">Cargando el Mundial...</p>
  </div>
);

export default LoadingScreen;
