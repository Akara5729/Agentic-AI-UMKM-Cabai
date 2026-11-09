/**
 * Web Audio API Bell Chime Synthesizer
 *
 * Menghasilkan suara lonceng notifikasi ("ding-dong") alami di browser
 * tanpa memerlukan file MP3 eksternal (100% offline & zero network latency).
 */

export function playOrderChime() {
  if (typeof window === "undefined") return;

  try {
    const AudioContextClass =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;

    if (!AudioContextClass) return;

    const ctx = new AudioContextClass();

    // Nada 1 (Ding - 784 Hz / G5)
    const osc1 = ctx.createOscillator();
    const gain1 = ctx.createGain();

    osc1.type = "sine";
    osc1.frequency.setValueAtTime(783.99, ctx.currentTime);

    gain1.gain.setValueAtTime(0.3, ctx.currentTime);
    gain1.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.6);

    osc1.connect(gain1);
    gain1.connect(ctx.destination);

    osc1.start(ctx.currentTime);
    osc1.stop(ctx.currentTime + 0.6);

    // Nada 2 (Dong - 587.33 Hz / D5) - mulai setelah 0.15 detik
    const osc2 = ctx.createOscillator();
    const gain2 = ctx.createGain();

    osc2.type = "sine";
    osc2.frequency.setValueAtTime(587.33, ctx.currentTime + 0.18);

    gain2.gain.setValueAtTime(0, ctx.currentTime);
    gain2.gain.setValueAtTime(0.35, ctx.currentTime + 0.18);
    gain2.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 1.2);

    osc2.connect(gain2);
    gain2.connect(ctx.destination);

    osc2.start(ctx.currentTime + 0.18);
    osc2.stop(ctx.currentTime + 1.2);
  } catch (err) {
    console.warn("[AUDIO] AudioContext playback error:", err);
  }
}
