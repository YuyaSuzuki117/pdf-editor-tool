// DQ風効果音 - Web Audio API で生成（外部ファイル不要）

let audioCtx: AudioContext | null = null;
let muted = false;

function getCtx(): AudioContext {
  if (!audioCtx) {
    audioCtx = new AudioContext();
  }
  return audioCtx;
}

function beep(
  freqs: { hz: number; dur: number; delay: number }[],
  type: OscillatorType = 'square',
  volume = 0.08,
) {
  if (muted) return;
  const ctx = getCtx();
  if (ctx.state === 'suspended') ctx.resume();

  const gain = ctx.createGain();
  gain.gain.value = volume;
  gain.connect(ctx.destination);

  for (const { hz, dur, delay } of freqs) {
    const osc = ctx.createOscillator();
    osc.type = type;
    osc.frequency.value = hz;
    osc.connect(gain);
    const start = ctx.currentTime + delay;
    osc.start(start);
    osc.stop(start + dur);
  }
}

/** カーソル移動音（短いピッ） */
export function playSelect(): void {
  beep([{ hz: 880, dur: 0.05, delay: 0 }]);
}

/** 決定音（ピロリン） */
export function playConfirm(): void {
  beep([
    { hz: 523, dur: 0.08, delay: 0 },
    { hz: 659, dur: 0.08, delay: 0.08 },
    { hz: 784, dur: 0.12, delay: 0.16 },
  ]);
}

/** キャンセル音（ブッ） */
export function playCancel(): void {
  beep([{ hz: 200, dur: 0.12, delay: 0 }], 'sawtooth', 0.06);
}

/** レベルアップ音（タラララッタラー 簡易版） */
export function playLevelUp(): void {
  beep(
    [
      { hz: 523, dur: 0.1, delay: 0 },
      { hz: 587, dur: 0.1, delay: 0.1 },
      { hz: 659, dur: 0.1, delay: 0.2 },
      { hz: 698, dur: 0.1, delay: 0.3 },
      { hz: 784, dur: 0.1, delay: 0.4 },
      { hz: 880, dur: 0.1, delay: 0.5 },
      { hz: 1047, dur: 0.25, delay: 0.6 },
    ],
    'square',
    0.07,
  );
}

/** セーブ音 */
export function playSave(): void {
  beep(
    [
      { hz: 440, dur: 0.12, delay: 0 },
      { hz: 554, dur: 0.12, delay: 0.12 },
      { hz: 659, dur: 0.12, delay: 0.24 },
      { hz: 880, dur: 0.2, delay: 0.36 },
    ],
    'square',
    0.06,
  );
}

/** ミュート設定 */
export function setMuted(value: boolean): void {
  muted = value;
}

/** ミュート状態を取得 */
export function isMuted(): boolean {
  return muted;
}
