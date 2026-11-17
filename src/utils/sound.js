// Small synthesised sound effects. One AudioContext is shared for the whole
// session: browsers only allow a handful, so creating one per sound (as the
// first version did) eventually makes audio stop working.

let sharedContext = null;

const getContext = () => {
    const Ctor = globalThis.AudioContext || globalThis.webkitAudioContext;
    if (!Ctor) return null;
    if (!sharedContext) sharedContext = new Ctor();
    if (sharedContext.state === 'suspended') sharedContext.resume().catch(() => {});
    return sharedContext;
};

const tone = (ctx, { type, from, to, ramp = 'exponential', volume, fadeTo = 0.01, fade = 'exponential', length, delay = 0 }) => {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);

    const start = ctx.currentTime + delay;
    osc.type = type;
    osc.frequency.setValueAtTime(from, start);
    if (to) {
        if (ramp === 'linear') osc.frequency.linearRampToValueAtTime(to, start + length);
        else osc.frequency.exponentialRampToValueAtTime(to, start + length);
    }
    gain.gain.setValueAtTime(volume, start);
    if (fade === 'linear') gain.gain.linearRampToValueAtTime(fadeTo, start + length);
    else gain.gain.exponentialRampToValueAtTime(Math.max(fadeTo, 0.001), start + length);

    osc.start(start);
    osc.stop(start + length);
};

const SOUNDS = {
    click: (ctx) => tone(ctx, { type: 'sine', from: 800, to: 300, volume: 0.1, length: 0.1 }),
    hover: (ctx) => tone(ctx, { type: 'sine', from: 1200, volume: 0.02, fadeTo: 0, fade: 'linear', length: 0.05 }),
    delete: (ctx) => tone(ctx, { type: 'sawtooth', from: 200, to: 50, volume: 0.1, length: 0.2 }),
    success: (ctx) => tone(ctx, { type: 'triangle', from: 600, to: 1200, ramp: 'linear', volume: 0.1, fadeTo: 0, fade: 'linear', length: 0.3 }),
    win: (ctx) => [523, 659, 784, 1047].forEach((freq, i) =>
        tone(ctx, { type: 'triangle', from: freq, volume: 0.08, fadeTo: 0.001, length: 0.35, delay: i * 0.09 })),
    predict: (ctx) => [440, 554, 659].forEach((freq, i) =>
        tone(ctx, { type: 'sine', from: freq, volume: 0.05, fadeTo: 0.001, length: 0.3, delay: i * 0.05 })),
    error: (ctx) => tone(ctx, { type: 'square', from: 100, volume: 0.1, fadeTo: 0, fade: 'linear', length: 0.15 }),
    coin: (ctx) => tone(ctx, { type: 'triangle', from: 2200, to: 2000, volume: 0.05, fadeTo: 0.001, length: 0.3 }),
};

export const playTone = (name) => {
    const play = SOUNDS[name];
    if (!play) return;
    try {
        const ctx = getContext();
        if (ctx) play(ctx);
    } catch {
        // Audio is a nicety; never let it break an interaction.
    }
};
