import { useState } from "react";

function normalizeAndValidateCombo(raw) {
  const v = raw.trim();

  // allow only digits 1-6, spaces, and hyphens
  if (!/^[1-6\s-]+$/.test(v)) return { ok: false, value: "" };

  // normalize: spaces -> hyphens, collapse multiple hyphens
  const normalized = v
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, ""); // trim hyphens at ends

  // must contain at least one digit 1-6
  if (!/[1-6]/.test(normalized)) return { ok: false, value: "" };

  return { ok: true, value: normalized };
}

export default function ComboLibrary({ combos, setCombos, onPick }) {
  const [input, setInput] = useState("");
  const [error, setError] = useState("");

  function addCombo() {
    const result = normalizeAndValidateCombo(input);

    if (!result.ok) {
      setError("Only numbers 1–6 allowed (use - or spaces). Example: 1-2-3");
      return;
    }

    const v = result.value;

    // prevent duplicates
    if (combos.includes(v)) {
      setError("That combo already exists.");
      return;
    }

    setCombos([...combos, v]);
    setInput("");
    setError("");
  }

  function removeCombo(i) {
    setCombos(combos.filter((_, idx) => idx !== i));
  }

  return (
    <div>
      <h2 style={{ marginBottom: 8 }}>Combo Library</h2>

      <div style={{ display: "flex", gap: 8 }}>
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="ex: 1-2-3 or 1 2 3"
          style={{
            flex: 1,
            padding: "10px",
            borderRadius: 10,
            background: "rgba(0,0,0,0.3)",
            color: "white",
            border: "1px solid rgba(255,255,255,0.15)",
          }}
        />
        <button onClick={addCombo}>Add</button>
      </div>

      {error && (
        <div style={{ marginTop: 8, fontSize: 12, opacity: 0.75 }}>
          {error}
        </div>
      )}

      <ul style={{ marginTop: 12, paddingLeft: 16 }}>
        {combos.map((c, i) => (
          <li
            key={`${c}-${i}`}
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              marginBottom: 6,
              gap: 8,
            }}
          >
            <span>{c}</span>
            <div style={{ display: "flex", gap: 6 }}>
              <button onClick={() => onPick?.(c)}>Use</button>
              <button onClick={() => removeCombo(i)}>✕</button>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
