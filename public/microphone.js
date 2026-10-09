// Measures microphone energy locally. No recording or network request is made here.
export class MicrophoneMonitor {
  constructor({ media = navigator.mediaDevices, Audio = window.AudioContext || window.webkitAudioContext, onLevel, onEnded }) {
    Object.assign(this, { media, Audio, onLevel, onEnded });
    this.generation = 0;
  }
  async start() {
    this.stop();
    const generation = this.generation;
    if (!this.media?.getUserMedia || !this.Audio) throw new Error('Microphone testing requires a supported browser on HTTPS.');
    const stream = await this.media.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true }, video: false });
    if (generation !== this.generation) { stream.getTracks().forEach(track => track.stop()); return false; }
    this.stream = stream;
    try {
      this.context = new this.Audio();
      await this.context.resume();
      if (generation !== this.generation) return false;
      this.source = this.context.createMediaStreamSource(stream);
      this.analyser = this.context.createAnalyser();
      this.analyser.fftSize = 512;
      this.source.connect(this.analyser);
      // Do not connect to the speakers: testing should not produce feedback.
      const samples = new Float32Array(this.analyser.fftSize);
      stream.getAudioTracks().forEach(track => { track.onended = () => { if (generation === this.generation) { this.stop(); this.onEnded(); } }; });
      this.timer = setInterval(() => {
        this.analyser.getFloatTimeDomainData(samples);
        const rms = Math.sqrt(samples.reduce((sum, value) => sum + value * value, 0) / samples.length);
        this.onLevel(Math.min(100, Math.round(rms * 500)), rms > 0.012);
      }, 100);
      return true;
    } catch (error) {
      if (generation === this.generation) this.stop();
      throw error;
    }
  }
  stop() {
    this.generation++;
    clearInterval(this.timer);
    this.stream?.getTracks().forEach(track => { track.onended = null; track.stop(); });
    this.source?.disconnect();
    void this.context?.close().catch(() => {});
    this.stream = this.source = this.context = this.analyser = null;
    this.onLevel(0, false);
  }
}
