/**
 * AudioWorklet processor – converts Float32 PCM from the mic to Int16 PCM
 * chunks and posts them to the main thread for transmission to the server.
 * The AudioContext is created at 24 kHz so the browser resamples mic input
 * automatically; OpenAI Realtime expects 24 kHz 16-bit mono PCM.
 */
class PCMProcessor extends AudioWorkletProcessor {
  process(inputs) {
    const channel = inputs[0]?.[0];
    if (channel && channel.length > 0) {
      const int16 = new Int16Array(channel.length);
      for (let i = 0; i < channel.length; i++) {
        const s = Math.max(-1, Math.min(1, channel[i]));
        int16[i] = s < 0 ? s * 0x8000 : s * 0x7fff;
      }
      // Transfer the underlying ArrayBuffer (zero-copy)
      this.port.postMessage(int16.buffer, [int16.buffer]);
    }
    return true;
  }
}

registerProcessor("pcm-processor", PCMProcessor);
