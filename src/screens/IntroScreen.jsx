export default function IntroScreen({ onSelectMode }) {
  return (
    <div className="screen intro-screen">
      <div className="intro-content">
        <div className="intro-header">
          <h1 className="intro-title">🥊</h1>
          <h2 className="intro-subtitle">Boxing Trainer</h2>
          <p className="intro-description">Choose your workout mode</p>
        </div>

        <div className="mode-buttons">
          <button className="mode-btn" onClick={() => onSelectMode("bag")}>
            <div className="mode-icon">🥊</div>
            <div className="mode-title">Bag Work</div>
            <div className="mode-desc">8 rounds × 3:00</div>
          </button>

          <button className="mode-btn" onClick={() => onSelectMode("shadow")}>
            <div className="mode-icon">👤</div>
            <div className="mode-title">Shadow Boxing</div>
            <div className="mode-desc">6 rounds × 3:00</div>
          </button>

          <button className="mode-btn" onClick={() => onSelectMode("hiit")}>
            <div className="mode-icon">⚡</div>
            <div className="mode-title">HIIT Training</div>
            <div className="mode-desc">Custom exercises</div>
          </button>
        </div>
      </div>
    </div>
  );
}
