// Voice Fingerprinting Engine
export class VoiceFingerprinting {
  constructor() {
    this.sampleRate = 16000;
    this.frameSize = 512;
    this.numMFCC = 13;
  }

  async extractVoiceFingerprint(audioBuffer) {
    try {
      console.log('🔍 Extracting voice fingerprint...');

      const audioData = audioBuffer.getChannelData(0);
      const sampleRate = audioBuffer.sampleRate;

      // Extract key voice features
      const features = {
        mfcc: this.extractMFCC(audioData),
        spectralCentroid: this.extractSpectralCentroid(audioData),
        fundamental: this.extractFundamentalFreq(audioData),
        energy: this.extractEnergy(audioData),
        zeroCrossing: this.extractZeroCrossingRate(audioData),
        duration: audioBuffer.duration,
        sampleRate: sampleRate
      };

      // Create deterministic fingerprint
      const fingerprint = this.createFingerprint(features);
      const confidence = this.calculateConfidence(features);

      console.log('✅ Voice fingerprint created:', fingerprint);

      return {
        success: true,
        fingerprint,
        features,
        confidence,
        statistics: this.getStatistics(features)
      };

    } catch (error) {
      console.error('❌ Fingerprinting failed:', error);
      return { success: false, error: error.message };
    }
  }

  extractMFCC(audioData) {
    // Simplified MFCC extraction
    const frames = this.frameAudio(audioData);
    const mfccCoeffs = [];

    for (const frame of frames) {
      const windowed = this.applyWindow(frame);
      const fft = this.simpleFft(windowed);
      const mfcc = this.computeMfcc(fft);
      mfccCoeffs.push(mfcc);
    }

    return this.averageFeatures(mfccCoeffs);
  }

  extractSpectralCentroid(audioData) {
    const frames = this.frameAudio(audioData);
    const centroids = [];

    for (const frame of frames) {
      const fft = this.simpleFft(frame);
      const spectrum = fft.map(c => c.real * c.real + c.imag * c.imag);

      let weightedSum = 0, totalPower = 0;
      for (let i = 0; i < spectrum.length; i++) {
        const freq = (i * this.sampleRate) / (2 * spectrum.length);
        weightedSum += freq * spectrum[i];
        totalPower += spectrum[i];
      }
      centroids.push(totalPower > 0 ? weightedSum / totalPower : 0);
    }

    return centroids.reduce((a, b) => a + b, 0) / centroids.length;
  }

  extractFundamentalFreq(audioData) {
    // Simplified pitch detection using autocorrelation
    const frame = audioData.slice(0, 2048); // Use first 2048 samples
    const autocorr = this.autocorrelation(frame);

    let maxVal = 0, maxIndex = 0;
    for (let i = 50; i < 400; i++) { // Look for pitch in reasonable range
      if (autocorr[i] > maxVal) {
        maxVal = autocorr[i];
        maxIndex = i;
      }
    }

    return maxIndex > 0 ? this.sampleRate / maxIndex : 0;
  }

  extractEnergy(audioData) {
    return audioData.reduce((sum, sample) => sum + sample * sample, 0) / audioData.length;
  }

  extractZeroCrossingRate(audioData) {
    let crossings = 0;
    for (let i = 1; i < audioData.length; i++) {
      if ((audioData[i] >= 0) !== (audioData[i-1] >= 0)) crossings++;
    }
    return crossings / audioData.length;
  }

  createFingerprint(features) {
    // Create deterministic hash from key features
    const keyValues = [
      Math.round(features.mfcc * 1000),
      Math.round(features.spectralCentroid),
      Math.round(features.fundamental),
      Math.round(features.energy * 10000),
      Math.round(features.zeroCrossing * 10000)
    ];

    const hashInput = keyValues.join('-');
    return this.simpleHash(hashInput);
  }

  calculateConfidence(features) {
    let confidence = 0.5;
    if (features.duration > 3) confidence += 0.2;
    if (features.fundamental > 80) confidence += 0.2;
    if (features.energy > 0.01) confidence += 0.1;
    return Math.min(1.0, confidence);
  }

  getStatistics(features) {
    return {
      voiceType: features.fundamental < 165 ? (features.fundamental < 120 ? 'Deep Male' : 'Male') : 'Female/High',
      clarity: features.energy > 0.01 ? 'Clear' : 'Unclear',
      quality: features.duration > 3 ? 'Good' : 'Short'
    };
  }

  // Utility functions
  frameAudio(audioData) {
    const frames = [];
    for (let i = 0; i < audioData.length - this.frameSize; i += 256) {
      frames.push(audioData.slice(i, i + this.frameSize));
    }
    return frames;
  }

  applyWindow(frame) {
    return frame.map((sample, i) => 
      sample * (0.54 - 0.46 * Math.cos(2 * Math.PI * i / (frame.length - 1)))
    );
  }

  simpleFft(signal) {
    const N = signal.length;
    const result = [];
    for (let k = 0; k < N/2; k++) {
      let real = 0, imag = 0;
      for (let n = 0; n < N; n++) {
        const angle = -2 * Math.PI * k * n / N;
        real += signal[n] * Math.cos(angle);
        imag += signal[n] * Math.sin(angle);
      }
      result.push({ real, imag });
    }
    return result;
  }

  computeMfcc(fft) {
    // Simplified MFCC computation
    const spectrum = fft.map(c => c.real * c.real + c.imag * c.imag);
    return spectrum.reduce((a, b) => a + b, 0) / spectrum.length;
  }

  averageFeatures(features) {
    return features.reduce((a, b) => a + b, 0) / features.length;
  }

  autocorrelation(signal) {
    const result = [];
    for (let lag = 0; lag < signal.length / 2; lag++) {
      let sum = 0;
      for (let i = 0; i < signal.length - lag; i++) {
        sum += signal[i] * signal[i + lag];
      }
      result.push(sum);
    }
    return result;
  }

  simpleHash(str) {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash;
    }
    return Math.abs(hash).toString(16).padStart(8, '0');
  }
}
