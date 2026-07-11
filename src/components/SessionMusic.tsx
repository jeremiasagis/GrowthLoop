"use client";

/* ============================================================
   Música chill de fondo para la sala — SOLO la ve el facilitador
   (es quien conduce y proyecta). NO usa ningún archivo de audio:
   genera un pad ambient por Web Audio (acordes suaves que respiran
   y progresan, volumen bajo). Cubre el silencio en los momentos de
   pensar / escribir / votar. Prende/apaga con un botón, entra con
   fade, y tiene control de volumen. Sin copyright, offline.
   ============================================================ */

import { useEffect, useRef, useState } from "react";
import { Icon } from "@/components/icon";
import { useAuth } from "@/lib/auth/AuthContext";

// Progresión calma (acordes con séptima). Cada acorde = 4 notas en Hz.
const CHORDS = [
  [110.0, 261.63, 329.63, 392.0], // Am7
  [87.31, 261.63, 349.23, 440.0], // Fmaj7
  [130.81, 329.63, 392.0, 493.88], // Cmaj7
  [98.0, 246.94, 392.0, 587.33], // G
];

// Volumen máximo del master (música de fondo, nunca protagonista).
const VOL_MAX = 0.2;

type Engine = { ctx: AudioContext; master: GainNode; oscs: OscillatorNode[]; nodes: OscillatorNode[]; timer: number };

export function SessionMusic() {
  const { user } = useAuth();
  const canPlay = user?.role === "facilitator";
  const [on, setOn] = useState(false);
  const [vol, setVol] = useState(0.5); // 0..1
  const volRef = useRef(0.5);
  const ref = useRef<Engine | null>(null);

  const stop = () => {
    const a = ref.current;
    if (!a) return;
    ref.current = null;
    clearInterval(a.timer);
    const t = a.ctx.currentTime;
    a.master.gain.cancelScheduledValues(t);
    a.master.gain.setTargetAtTime(0.0001, t, 0.4);
    window.setTimeout(() => {
      a.nodes.forEach((o) => { try { o.stop(); } catch { /* ya parado */ } });
      a.ctx.close().catch(() => {});
    }, 1000);
  };

  const start = () => {
    const Ctor = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    const ctx = new Ctor();
    const master = ctx.createGain();
    master.gain.value = 0.0001;
    const filter = ctx.createBiquadFilter();
    filter.type = "lowpass";
    filter.frequency.value = 850;
    filter.Q.value = 0.6;
    filter.connect(master);
    master.connect(ctx.destination);

    // Respiración: un LFO lento que suma/resta un poco de volumen.
    const lfo = ctx.createOscillator();
    lfo.frequency.value = 0.08;
    const lfoGain = ctx.createGain();
    lfoGain.gain.value = 0.035;
    lfo.connect(lfoGain);
    lfoGain.connect(master.gain);
    lfo.start();

    const chord = CHORDS[0];
    const oscs = chord.map((f, i) => {
      const o = ctx.createOscillator();
      o.type = i === 0 ? "sine" : "triangle";
      o.frequency.value = f;
      const g = ctx.createGain();
      g.gain.value = i === 0 ? 0.5 : 0.26;
      o.connect(g);
      g.connect(filter);
      o.start();
      return o;
    });

    // Entrada suave hasta el volumen elegido.
    master.gain.setTargetAtTime(volRef.current * VOL_MAX, ctx.currentTime + 0.05, 0.9);

    let idx = 0;
    const timer = window.setInterval(() => {
      idx = (idx + 1) % CHORDS.length;
      const c = CHORDS[idx];
      const t = ctx.currentTime;
      oscs.forEach((o, i) => o.frequency.exponentialRampToValueAtTime(c[i], t + 3));
    }, 7000);

    ref.current = { ctx, master, oscs, nodes: [...oscs, lfo], timer };
  };

  const toggle = () => {
    if (on) { stop(); setOn(false); }
    else { try { start(); setOn(true); } catch { /* navegador sin Web Audio */ } }
  };

  const changeVol = (v: number) => {
    setVol(v); volRef.current = v;
    const a = ref.current;
    if (a) a.master.gain.setTargetAtTime(v * VOL_MAX, a.ctx.currentTime, 0.15);
  };

  useEffect(() => () => stop(), []);

  if (!canPlay) return null;

  return (
    <div style={{ display: "inline-flex", alignItems: "center", gap: 8 }}>
      <button
        onClick={toggle}
        title={on ? "Apagar música de fondo" : "Poner música chill de fondo (solo vos la controlás)"}
        style={{ display: "inline-flex", alignItems: "center", gap: 6, color: on ? "var(--green)" : "var(--ink-2)", fontSize: "var(--t-sm)", fontWeight: 600 }}
      >
        <Icon name={on ? "Volume2" : "Music"} size={17} />
        <span className="hide-sm">Música</span>
      </button>
      {on && (
        <input
          type="range" min={0} max={1} step={0.05} value={vol}
          onChange={(e) => changeVol(Number(e.target.value))}
          title="Volumen"
          style={{ width: 72, accentColor: "var(--green)", cursor: "pointer" }}
          className="hide-sm"
        />
      )}
    </div>
  );
}
