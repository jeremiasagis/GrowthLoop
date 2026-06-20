"use client";

/* ============================================================
   Música chill de fondo para la sala. NO usa ningún archivo de
   audio: genera un pad ambient por Web Audio (acordes suaves que
   respiran y van progresando, volumen bajo). Sirve para cubrir el
   silencio incómodo en los momentos de pensar y escribir.
   Se prende/apaga con un botón; arranca en silencio y entra con
   un fade suave. Sin copyright, sin descargas, funciona offline.
   ============================================================ */

import { useEffect, useRef, useState } from "react";
import { Icon } from "@/components/icon";

// Progresión calma (acordes con séptima). Cada acorde = 4 notas en Hz.
const CHORDS = [
  [110.0, 261.63, 329.63, 392.0], // Am7
  [87.31, 261.63, 349.23, 440.0], // Fmaj7
  [130.81, 329.63, 392.0, 493.88], // Cmaj7
  [98.0, 246.94, 392.0, 587.33], // G
];

type Engine = { ctx: AudioContext; master: GainNode; nodes: OscillatorNode[]; oscs: OscillatorNode[]; timer: number };

export function SessionMusic() {
  const [on, setOn] = useState(false);
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

    // Entrada suave hasta un volumen bajo (música de fondo, no protagonista).
    master.gain.setTargetAtTime(0.1, ctx.currentTime + 0.05, 0.9);

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

  useEffect(() => () => stop(), []);

  return (
    <button
      onClick={toggle}
      title={on ? "Apagar música de fondo" : "Música chill de fondo"}
      style={{ display: "inline-flex", alignItems: "center", gap: 6, color: on ? "var(--green)" : "var(--ink-2)", fontSize: "var(--t-sm)", fontWeight: 600 }}
    >
      <Icon name={on ? "Volume2" : "Music"} size={17} />
      <span className="hide-sm">{on ? "Música" : "Música"}</span>
    </button>
  );
}
