const MULAW_DECODE_TABLE = new Int16Array(256).map((_, i) => {
  const ulaw = ~i;
  const sign = ulaw & 0x80;
  const exponent = (ulaw >> 4) & 0x07;
  const mantissa = ulaw & 0x0f;
  let sample = ((mantissa << 3) + 0x84) << exponent;
  sample -= 0x84;
  return sign !== 0 ? -sample : sample;
});

/**
 * @param {Buffer} mulawBuffer
 * @returns {Buffer}
 */
export function mulawToPcm16k(mulawBuffer) {
  const pcm8k = Buffer.alloc(mulawBuffer.length * 2);
  for (let i = 0; i < mulawBuffer.length; i++) {
    pcm8k.writeInt16LE(MULAW_DECODE_TABLE[mulawBuffer[i]], i * 2);
  }

  const pcm16k = Buffer.alloc(pcm8k.length * 2);
  for (let i = 0; i < mulawBuffer.length; i++) {
    const sample = pcm8k.readInt16LE(i * 2);
    pcm16k.writeInt16LE(sample, i * 4);
    pcm16k.writeInt16LE(sample, i * 4 + 2);
  }

  return pcm16k;
}

/**
 * @param {number} sample
 */
function linearToMulawSample(sample) {
  const BIAS = 0x84;
  const CLIP = 32635;

  let sign = 0;
  if (sample < 0) {
    sample = -sample;
    sign = 0x80;
  }
  if (sample > CLIP) sample = CLIP;
  sample += BIAS;

  let exponent = 7;
  for (let mask = 0x4000; (sample & mask) === 0 && exponent > 0; mask >>= 1) {
    exponent--;
  }
  const mantissa = (sample >> (exponent + 3)) & 0x0f;
  return ~(sign | (exponent << 4) | mantissa) & 0xff;
}

/**
 * @param {string | undefined} mimeType
 * @param {number} [fallback=24000]
 */
export function parseRateFromMime(mimeType, fallback = 24000) {
  if (!mimeType) return fallback;
  const m = /rate=(\d+)/i.exec(mimeType);
  return m ? parseInt(m[1], 10) : fallback;
}

/** Twilio expects ~20 ms of mulaw audio per media frame (160 bytes at 8 kHz). */
export const TWILIO_MULAW_FRAME_BYTES = 160;

/**
 * Stateful resampler + anti-alias low-pass + μ-law encoder.
 */
export class PcmToMulaw8kStream {
  /**
   * @param {number} inputRate
   */
  constructor(inputRate) {
    this.inputRate = inputRate;
    this.step = 8000 / inputRate;

    const numTaps = 31;
    const cutoffHz = 3400;
    const fc = cutoffHz / inputRate;
    const M = numTaps - 1;

    this.taps = new Float32Array(numTaps);
    this.history = new Float32Array(numTaps);
    this.historyIndex = 0;
    this.phase = 0;

    let coefSum = 0;
    for (let n = 0; n < numTaps; n++) {
      const k = n - M / 2;
      const sinc =
        k === 0 ? 2 * fc : Math.sin(2 * Math.PI * fc * k) / (Math.PI * k);
      const win = 0.54 - 0.46 * Math.cos((2 * Math.PI * n) / M);
      const h = sinc * win;
      this.taps[n] = h;
      coefSum += h;
    }
    for (let n = 0; n < numTaps; n++) this.taps[n] /= coefSum;
  }

  /**
   * @param {Buffer} pcmBuffer
   * @returns {Buffer}
   */
  process(pcmBuffer) {
    const inSamples = Math.floor(pcmBuffer.length / 2);
    if (inSamples === 0) return Buffer.alloc(0);

    const taps = this.taps;
    const history = this.history;
    const numTaps = taps.length;
    const out = [];

    for (let i = 0; i < inSamples; i++) {
      history[this.historyIndex] = pcmBuffer.readInt16LE(i * 2);
      this.historyIndex = (this.historyIndex + 1) % numTaps;

      this.phase += this.step;
      if (this.phase >= 1.0) {
        this.phase -= 1.0;

        let acc = 0;
        let h = this.historyIndex;
        for (let t = 0; t < numTaps; t++) {
          acc += taps[t] * history[h];
          h = (h + 1) % numTaps;
        }

        let s = Math.round(acc);
        if (s > 32767) s = 32767;
        else if (s < -32768) s = -32768;
        out.push(linearToMulawSample(s));
      }
    }
    return Buffer.from(out);
  }
}

