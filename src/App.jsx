import { useEffect, useMemo, useRef, useReducer, useState } from "react";
import "./App.css";

import IntroScreen from "./screens/IntroScreen";
import HIITSetupScreen from "./screens/HIITSetupScreen";
import WorkoutScreen from "./screens/WorkoutScreen";

import { clamp, formatMMSS } from "./lib/helpers";
import { speak, speakableCombo } from "./lib/speech";
import {
  KEYS,
  loadJSON,
  saveJSON,
} from "./lib/storage";

import DEFAULT_COMBOS from "./data/defaultCombos.js";
import HIIT_CATEGORIES from "./data/hiitExercises";

const COMBO_INTERVAL_SECONDS = 3;      // ✅ every 3 seconds, always
const START_COUNTDOWN_SECONDS = 5;     // ✅ glove-up time

// Timer state reducer
function timerReducer(state, action) {
  switch (action.type) {
    case 'TICK':
      return { ...state, timeLeft: state.timeLeft - 1 };
    case 'START_COUNTDOWN':
      return { ...state, isCountingDown: true, countdownLeft: START_COUNTDOWN_SECONDS };
    case 'COUNTDOWN_TICK':
      return { ...state, countdownLeft: state.countdownLeft - 1 };
    case 'START_WORKOUT':
      return { ...state, isCountingDown: false, isRunning: true };
    case 'PAUSE':
      return { ...state, isRunning: false };
    case 'RESUME':
      return { ...state, isRunning: true };
    case 'PHASE_TRANSITION':
      if (state.phase === "ROUND") {
        if (state.roundIndex >= action.totalRounds) {
          return {
            ...state,
            isRunning: false,
            phase: "ROUND",
            timeLeft: action.roundSeconds,
            activeCallout: null
          };
        }
        return {
          ...state,
          phase: "REST",
          timeLeft: action.restSeconds,
          activeCallout: null
        };
      } else {
        return {
          ...state,
          roundIndex: clamp(state.roundIndex + 1, 1, action.totalRounds),
          phase: "ROUND",
          timeLeft: action.roundSeconds,
          activeCallout: null
        };
      }
    case 'SET_ACTIVE_CALLOUT':
      return { ...state, activeCallout: action.callout };
    case 'RESET':
      return {
        isRunning: false,
        isCountingDown: false,
        countdownLeft: START_COUNTDOWN_SECONDS,
        phase: "ROUND",
        roundIndex: 1,
        timeLeft: action.timeLeft,
        activeCallout: null
      };
    case 'NEXT_PHASE':
      if (state.phase === "ROUND") {
        if (state.roundIndex >= action.totalRounds) {
          return {
            ...state,
            isRunning: false,
            isCountingDown: false,
            countdownLeft: START_COUNTDOWN_SECONDS,
            phase: "ROUND",
            roundIndex: 1,
            timeLeft: action.roundSeconds,
            activeCallout: null
          };
        }
        return {
          ...state,
          isRunning: false,
          isCountingDown: false,
          countdownLeft: START_COUNTDOWN_SECONDS,
          phase: "REST",
          timeLeft: action.restSeconds,
          activeCallout: null
        };
      } else {
        return {
          ...state,
          isRunning: false,
          isCountingDown: false,
          countdownLeft: START_COUNTDOWN_SECONDS,
          phase: "ROUND",
          roundIndex: clamp(state.roundIndex + 1, 1, action.totalRounds),
          timeLeft: action.roundSeconds,
          activeCallout: null
        };
      }
    case 'SET_TIME_LEFT':
      return { ...state, timeLeft: action.timeLeft };
    default:
      return state;
  }
}

export default function App() {
  // ----------- navigation -----------
  const [currentScreen, setCurrentScreen] = useState("intro"); // intro | hiit-setup | workout
  const [workoutMode, setWorkoutMode] = useState(null);        // bag | shadow | hiit

  // ----------- read-only combos -----------
  const combos = useMemo(() => {
    const saved = loadJSON(KEYS.combos);
    return Array.isArray(saved) && saved.length ? saved : DEFAULT_COMBOS;
  }, []);

  // ----------- persisted: hiit exercises -----------
  const [selectedExercises, setSelectedExercises] = useState(() => {
    const saved = loadJSON(KEYS.hiitExercises);
    return Array.isArray(saved) && saved.length ? saved : ["Burpees", "Push-ups", "Jump Squats"];
  });

  // ----------- persisted: hiit timing -----------
  const hiitDefaults = useMemo(() => ({ workSeconds: 30, restSeconds: 15 }), []);
  const savedHiit = useMemo(() => loadJSON(KEYS.hiitSettings), []);
  const [hiitWorkSeconds, setHiitWorkSeconds] = useState(
    Number(savedHiit?.workSeconds) || hiitDefaults.workSeconds
  );
  const [hiitRestSeconds, setHiitRestSeconds] = useState(
    Number(savedHiit?.restSeconds) || hiitDefaults.restSeconds
  );

  // ----------- timer settings (bag/shadow defaults) -----------
  const defaults = useMemo(
    () => ({
      rounds: 6,
      roundSeconds: 180,
      restSeconds: 60,
    }),
    []
  );

  const saved = useMemo(() => loadJSON(KEYS.settings), []);
  const [rounds, setRounds] = useState(Number(saved?.rounds) || defaults.rounds);
  const [roundSeconds, setRoundSeconds] = useState(Number(saved?.roundSeconds) || defaults.roundSeconds);
  const [restSeconds, setRestSeconds] = useState(Number(saved?.restSeconds) || defaults.restSeconds);

  // ----------- timer state with reducer -----------
  const [timerState, dispatch] = useReducer(timerReducer, {
    isRunning: false,
    isCountingDown: false,
    countdownLeft: START_COUNTDOWN_SECONDS,
    phase: "ROUND",
    roundIndex: 1,
    timeLeft: roundSeconds,
    activeCallout: null
  });

  // ----------- refs for timers/intervals -----------
  const tickRef = useRef(null);
  const coachIntervalRef = useRef(null);
  const countdownRef = useRef(null);

  const prevRunningRef = useRef(false);
  const hiitLastSpokenRoundRef = useRef(null);

  // ----------- persist settings -----------
  useEffect(() => {
    saveJSON(KEYS.settings, { rounds, roundSeconds, restSeconds });
  }, [rounds, roundSeconds, restSeconds]);

  useEffect(() => {
    saveJSON(KEYS.hiitExercises, selectedExercises);
  }, [selectedExercises]);

  useEffect(() => {
    saveJSON(KEYS.hiitSettings, { workSeconds: hiitWorkSeconds, restSeconds: hiitRestSeconds });
  }, [hiitWorkSeconds, hiitRestSeconds]);

  // ----------- keep timeLeft in sync when paused -----------
  useEffect(() => {
    if (!timerState.isRunning && timerState.phase === "ROUND") {
      dispatch({ type: 'SET_TIME_LEFT', timeLeft: roundSeconds });
    }
  }, [roundSeconds, timerState.isRunning, timerState.phase]);

  useEffect(() => {
    if (!timerState.isRunning && timerState.phase === "REST") {
      dispatch({ type: 'SET_TIME_LEFT', timeLeft: restSeconds });
    }
  }, [restSeconds, timerState.isRunning, timerState.phase]);

  // ----------- main 1-second ticking interval -----------
  useEffect(() => {
    if (!timerState.isRunning) return;
    tickRef.current = window.setInterval(() => dispatch({ type: 'TICK' }), 1000);
    return () => {
      if (tickRef.current) window.clearInterval(tickRef.current);
      tickRef.current = null;
    };
  }, [timerState.isRunning]);

  // ----------- phase switching when time hits 0 -----------
  useEffect(() => {
    if (!timerState.isRunning || timerState.timeLeft > 0) return;
    dispatch({ 
      type: 'PHASE_TRANSITION', 
      totalRounds: rounds, 
      roundSeconds, 
      restSeconds 
    });
  }, [timerState.timeLeft, timerState.isRunning, timerState.phase, timerState.roundIndex, rounds, restSeconds, roundSeconds]);

  // ----------- countdown effect -----------
  useEffect(() => {
    if (!timerState.isCountingDown) return;

    // optional: speak countdown numbers
    speak(String(timerState.countdownLeft));

    countdownRef.current = window.setTimeout(() => {
      dispatch({ type: 'COUNTDOWN_TICK' });
    }, 1000);

    if (timerState.countdownLeft <= 1) {
      if (countdownRef.current) window.clearTimeout(countdownRef.current);
      countdownRef.current = null;

      dispatch({ type: 'START_WORKOUT' });
      speak("Go");
    }

    return () => {
      if (countdownRef.current) window.clearTimeout(countdownRef.current);
      countdownRef.current = null;
    };
  }, [timerState.isCountingDown, timerState.countdownLeft]);

  // ----------- COACH LOGIC (this fixes your combo issues) -----------
  useEffect(() => {
    // stop old coach interval on any state change
    if (coachIntervalRef.current) {
      clearInterval(coachIntervalRef.current);
      coachIntervalRef.current = null;
    }

    // only coach during WORK
    if (!timerState.isRunning || timerState.phase !== "ROUND") return;

    // HIIT: speak once per work interval start
    if (workoutMode === "hiit") {
      if (!selectedExercises.length) return;

      // speak only once per roundIndex
      if (hiitLastSpokenRoundRef.current === timerState.roundIndex) return;
      hiitLastSpokenRoundRef.current = timerState.roundIndex;

      const exercise = selectedExercises[(timerState.roundIndex - 1) % selectedExercises.length];
      dispatch({ type: 'SET_ACTIVE_CALLOUT', callout: exercise });
      speak(exercise);
      return;
    }

    // Bag/Shadow: speak immediately on start/resume AND then every 3 seconds
    if (!combos.length) return;

    const fireCombo = () => {
      const pick = combos[Math.floor(Math.random() * combos.length)];
      dispatch({ type: 'SET_ACTIVE_CALLOUT', callout: pick });
      speak(speakableCombo(pick));
    };

    // immediate callout when transitioning into running state
    const wasRunning = prevRunningRef.current;
    const nowRunning = timerState.isRunning;
    if (!wasRunning && nowRunning) {
      fireCombo();
    } else {
      // also fire immediately when a new ROUND starts (e.g., after rest)
      // that's naturally when phase becomes ROUND and effect runs again
      fireCombo();
    }

    coachIntervalRef.current = setInterval(() => {
      fireCombo();
    }, COMBO_INTERVAL_SECONDS * 1000);

    return () => {
      if (coachIntervalRef.current) {
        clearInterval(coachIntervalRef.current);
        coachIntervalRef.current = null;
      }
    };
  }, [timerState.isRunning, timerState.phase, workoutMode, combos, selectedExercises, timerState.roundIndex]);

  // track running transitions
  useEffect(() => {
    prevRunningRef.current = timerState.isRunning;
  }, [timerState.isRunning]);

  // ----------- helpers -----------
  const resetWorkout = (explicitSeconds) => {
    hiitLastSpokenRoundRef.current = null;
    dispatch({ 
      type: 'RESET', 
      timeLeft: Number(explicitSeconds) || roundSeconds 
    });
  };

  const handleStartPause = () => {
    // pause if running
    if (timerState.isRunning) {
      dispatch({ type: 'PAUSE' });
      return;
    }

    // don't double-start countdown
    if (timerState.isCountingDown) return;

    // if resting, start immediately
    if (timerState.phase !== "ROUND") {
      dispatch({ type: 'RESUME' });
      return;
    }

    // countdown before starting WORK
    dispatch({ type: 'START_COUNTDOWN' });
  };

  const handleNext = () => {
    dispatch({ 
      type: 'NEXT_PHASE', 
      totalRounds: rounds, 
      roundSeconds, 
      restSeconds 
    });
  };

  const handleBack = () => {
    setCurrentScreen("intro");
    resetWorkout(roundSeconds);
  };

  // ----------- mode selection -----------
  const handleSelectMode = (mode) => {
    setWorkoutMode(mode);

    if (mode === "bag") {
      setRounds(8);
      setRoundSeconds(180);
      setRestSeconds(60);
      resetWorkout(180);
      setCurrentScreen("workout");
      return;
    }

    if (mode === "shadow") {
      setRounds(6);
      setRoundSeconds(180);
      setRestSeconds(30);
      resetWorkout(180);
      setCurrentScreen("workout");
      return;
    }

    if (mode === "hiit") {
      // these apply when you actually start HIIT
      setRounds(10);
      setRoundSeconds(hiitWorkSeconds);
      setRestSeconds(hiitRestSeconds);
      setCurrentScreen("hiit-setup");
      return;
    }
  };

  const handleStartHiit = () => {
    // apply chosen HIIT timing
    setRoundSeconds(hiitWorkSeconds);
    setRestSeconds(hiitRestSeconds);
    resetWorkout(hiitWorkSeconds);
    setCurrentScreen("workout");
  };

  // ----------- render with debug fallback -----------
  try {
    if (currentScreen === "intro") {
      return <IntroScreen onSelectMode={handleSelectMode} />;
    }

    if (currentScreen === "hiit-setup") {
      return (
        <HIITSetupScreen
          onBack={() => setCurrentScreen("intro")}
          onStart={handleStartHiit}
          categories={HIIT_CATEGORIES}
          selectedExercises={selectedExercises}
          setSelectedExercises={setSelectedExercises}
          hiitWorkSeconds={hiitWorkSeconds}
          setHiitWorkSeconds={setHiitWorkSeconds}
          hiitRestSeconds={hiitRestSeconds}
          setHiitRestSeconds={setHiitRestSeconds}
        />
      );
    }

    return (
      <WorkoutScreen
        mode={workoutMode}
        phase={timerState.phase}
        roundIndex={timerState.roundIndex}
        rounds={rounds}
        timeLeft={timerState.timeLeft}
        formatMMSS={formatMMSS}
        isRunning={timerState.isRunning}
        isCountingDown={timerState.isCountingDown}
        countdownLeft={timerState.countdownLeft}
        activeCallout={timerState.activeCallout}
        onStartPause={handleStartPause}
        onNext={handleNext}
        onReset={() => resetWorkout(workoutMode === "hiit" ? hiitWorkSeconds : roundSeconds)}
        onBack={handleBack}
        selectedExercises={selectedExercises}
        hiitMode={workoutMode === "hiit"}
        comboIntervalSeconds={COMBO_INTERVAL_SECONDS}
      />
    );
  } catch (error) {
    console.error('App render error:', error);
    return (
      <div style={{ padding: '20px', color: 'white', background: '#1e293b', minHeight: '100vh' }}>
        <h1>Debug Info</h1>
        <p>Current Screen: {currentScreen}</p>
        <p>Workout Mode: {workoutMode}</p>
        <p>Error: {error.message}</p>
        <button onClick={() => setCurrentScreen('intro')}>Reset to Intro</button>
      </div>
    );
  }
}
