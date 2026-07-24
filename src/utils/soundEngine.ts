let audioCtx: AudioContext | null = null;
let isMuted = false;

// Initialize on first interaction
const initAudioContext = () => {
  if (!audioCtx) {
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    if (AudioContextClass) {
      audioCtx = new AudioContextClass();
    }
  }
  if (audioCtx && audioCtx.state === 'suspended') {
    audioCtx.resume();
  }
};

export const initAudio = () => {
  initAudioContext();
};

export const toggleMute = () => {
  isMuted = !isMuted;
  return isMuted;
};

export const getIsMuted = () => isMuted;

export const playMove = () => {
  if (isMuted) return;
  initAudioContext();
  if (!audioCtx) return;

  const t = audioCtx.currentTime;
  const osc = audioCtx!.createOscillator();
  const gain = audioCtx!.createGain();

  osc.type = 'triangle';
  osc.frequency.setValueAtTime(150, t);
  osc.frequency.exponentialRampToValueAtTime(50, t + 0.1);

  gain.gain.setValueAtTime(0, t);
  gain.gain.linearRampToValueAtTime(0.2, t + 0.01);
  gain.gain.exponentialRampToValueAtTime(0.001, t + 0.1);

  osc.connect(gain);
  gain.connect(audioCtx!.destination);

  osc.start(t);
  osc.stop(t + 0.1);
};

export const playMerge = (value: number) => {
  if (isMuted) return;
  initAudioContext();
  if (!audioCtx) return;

  const t = audioCtx.currentTime;
  const osc = audioCtx!.createOscillator();
  const gain = audioCtx!.createGain();

  const power = Math.max(1, Math.log2(value));
  const baseFreq = 200 + power * 50;

  osc.type = 'sine';
  osc.frequency.setValueAtTime(baseFreq, t);
  osc.frequency.linearRampToValueAtTime(baseFreq * 1.5, t + 0.15);

  gain.gain.setValueAtTime(0, t);
  gain.gain.linearRampToValueAtTime(0.3, t + 0.02);
  gain.gain.exponentialRampToValueAtTime(0.001, t + 0.15);

  osc.connect(gain);
  gain.connect(audioCtx!.destination);

  osc.start(t);
  osc.stop(t + 0.15);
};

export const playWin = () => {
  if (isMuted) return;
  initAudioContext();
  if (!audioCtx) return;

  const notes = [440, 554.37, 659.25, 880]; // A4, C#5, E5, A5
  const duration = 0.1;
  const t = audioCtx.currentTime;

  notes.forEach((freq, index) => {
    const osc = audioCtx!.createOscillator();
    const gain = audioCtx!.createGain();

    osc.type = 'square';
    const noteTime = t + index * duration;
    osc.frequency.setValueAtTime(freq, noteTime);

    gain.gain.setValueAtTime(0, noteTime);
    gain.gain.linearRampToValueAtTime(0.1, noteTime + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.001, noteTime + duration);

    osc.connect(gain);
    gain.connect(audioCtx!.destination);

    osc.start(noteTime);
    osc.stop(noteTime + duration);
  });
};
