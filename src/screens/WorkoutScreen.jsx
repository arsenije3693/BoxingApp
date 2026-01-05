export default function WorkoutScreen({
  mode,
  phase,
  roundIndex,
  rounds,
  timeLeft,
  formatMMSS,
  isRunning,
  isCountingDown,
  countdownLeft,
  activeCallout,
  onStartPause,
  onNext,
  onReset,
  onBack,
  selectedExercises,
  hiitMode,
  comboIntervalSeconds,
}) {
  const phaseLabel = phase === "ROUND" ? "WORK" : "REST";

  const title =
    phase === "ROUND"
      ? `Round ${roundIndex} / ${rounds}`
      : `Rest - Next: ${roundIndex + 1} / ${rounds}`;

  const currentExercise =
    hiitMode && selectedExercises?.length
      ? selectedExercises[(roundIndex - 1) % selectedExercises.length]
      : null;

  return (
    <div className="screen workout-screen">
      <div className="workout-header">
        <button className="back-btn" onClick={onBack}>←</button>
        <div className="workout-mode">{(mode ?? "").toUpperCase()}</div>
      </div>

      <div className="workout-content">
        <div className="phase-indicator">
          <span className={`phase-badge ${phase.toLowerCase()}`}>{phaseLabel}</span>
          <div className="round-title">{title}</div>
        </div>

        {isCountingDown && (
          <div className="countdown-overlay">
            <div className="countdown-number">{countdownLeft}</div>
            <div className="countdown-sub">Get ready...</div>
          </div>
        )}

        <div className={`timer-circle ${phase.toLowerCase()}`}>
          <div className="timer-display">{formatMMSS(timeLeft)}</div>
        </div>

        {hiitMode && currentExercise && phase === "ROUND" && (
          <div className="current-exercise">
            <div className="exercise-label">Current Exercise</div>
            <div className="exercise-name">{currentExercise}</div>
          </div>
        )}

        {!hiitMode && phase === "ROUND" && (
          <div className="tiny-hint">
            Combos every <b>{comboIntervalSeconds}s</b>
          </div>
        )}

        {activeCallout && (
          <div className="combo-callout">
            <div className="combo-text">{activeCallout}</div>
          </div>
        )}

        <div className="workout-controls">
          <button
            className="control-btn primary"
            onClick={onStartPause}
            disabled={isCountingDown}
            title={isCountingDown ? "Countdown..." : ""}
          >
            {isRunning ? "Pause" : isCountingDown ? "Get Ready" : "Start"}
          </button>

          <button className="control-btn secondary" onClick={onNext} disabled={isCountingDown}>
            Next
          </button>

          <button className="control-btn ghost" onClick={onReset}>
            Reset
          </button>
        </div>
      </div>
    </div>
  );
}
