export const KEYS = {
  settings: "boxingapp.v1.settings",
  combos: "boxingapp.v1.combos",
  hiitExercises: "boxingapp.v1.hiit",
  hiitSettings: "boxingapp.v1.hiit.settings",
};

export function loadJSON(key) {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch (error) {
    console.warn("Failed to load from localStorage:", key, error);
    return null;
  }
}

export function saveJSON(key, data) {
  try {
    localStorage.setItem(key, JSON.stringify(data));
  } catch (error) {
    console.warn("Failed to save to localStorage:", key, error);
  }
}
