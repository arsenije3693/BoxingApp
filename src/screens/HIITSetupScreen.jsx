export default function HIITSetupScreen({
  onBack,
  onStart,
  categories,
  selectedExercises,
  setSelectedExercises,
  hiitWorkSeconds,
  setHiitWorkSeconds,
  hiitRestSeconds,
  setHiitRestSeconds,
}) {
  const toggleExercise = (exercise) => {
    setSelectedExercises((prev) =>
      prev.includes(exercise) ? prev.filter((e) => e !== exercise) : [...prev, exercise]
    );
  };

  return (
    <div className="screen hiit-setup-screen">
      <div className="setup-content">
        <div className="setup-header">
          <button className="back-btn" onClick={onBack}>←</button>
          <div>
            <h2>⚡ HIIT Setup</h2>
            <p>Pick timing + exercises</p>
          </div>
        </div>

        <div className="timing-controls">
          <div className="timing-row">
            <label>
              Work
              <select value={hiitWorkSeconds} onChange={(e) => setHiitWorkSeconds(Number(e.target.value))}>
                <option value={30}>30s</option>
                <option value={45}>45s</option>
              </select>
            </label>
            <label>
              Rest
              <select value={hiitRestSeconds} onChange={(e) => setHiitRestSeconds(Number(e.target.value))}>
                <option value={15}>15s</option>
                <option value={30}>30s</option>
              </select>
            </label>
          </div>
        </div>

        {Object.entries(categories).map(([category, exercises]) => (
          <div key={category} className="exercise-category">
            <h3 className="category-header">{category}</h3>
            <div className="exercise-chips">
              {exercises.map((exercise) => (
                <button
                  key={exercise}
                  className={`exercise-chip ${selectedExercises.includes(exercise) ? "selected" : ""}`}
                  onClick={() => toggleExercise(exercise)}
                >
                  {exercise}
                </button>
              ))}
            </div>
          </div>
        ))}

        <div className="setup-actions">
          <button
            className="start-btn"
            onClick={onStart}
            disabled={selectedExercises.length === 0}
          >
            Start HIIT ({selectedExercises.length} exercises)
          </button>
        </div>
      </div>
    </div>
  );
}