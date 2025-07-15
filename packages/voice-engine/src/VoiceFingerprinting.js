// File: packages/voice-engine/src/VoiceFingerprinting.js
// FIXED: Robust Voice Fingerprinting Engine with Accurate Pitch Detection

export class VoiceFingerprinting {
  constructor() {
    this.sampleRate = 48000; // Match the actual recording sample rate
    this.frameSize = 1024;
    this.hopLength = 512;
    this.minPitch = 50;  // Minimum human pitch (Hz)
    this.maxPitch = 800; // Maximum human pitch (Hz)
  }

  async extractFingerprint(audioBuffer) {
    try {
      // Convert Float32Array to regular array if needed
      const samples = Array.from(audioBuffer);

      console.log(`Processing ${samples.length} samples at ${this.sampleRate}Hz`);

      // Preprocess: Remove DC offset and normalize
      const processedSamples = this.preprocessAudio(samples);

      // Extract multiple pitch estimates for robustness
      const pitchEstimates = this.extractMultiplePitchEstimates(processedSamples);
      const avgPitch = this.getMedianPitch(pitchEstimates);
      
      console.log(`Found ${pitchEstimates.length} pitch estimates:`, pitchEstimates);
      console.log(`Average pitch: ${avgPitch}Hz`);

      // If no valid pitch found, try different approach
      let finalPitch = avgPitch;
      if (finalPitch === 0) {
        // Fallback: try simpler pitch detection
        finalPitch = this.simplePitchDetection(processedSamples);
        console.log(`Fallback pitch: ${finalPitch}Hz`);
      }

      // Extract spectral features
      const spectralFeatures = this.extractSpectralFeatures(processedSamples);

      // Extract temporal features
      const temporalFeatures = this.extractTemporalFeatures(processedSamples);

      // Calculate energy properly
      const energy = this.calculateRMSEnergy(processedSamples);

      // Voice type classification
      const voiceType = this.classifyVoiceType(finalPitch, energy, spectralFeatures);

      // Create deterministic fingerprint
      const fingerprint = this.createFingerprint({
        pitch: finalPitch,
        spectralCentroid: spectralFeatures.centroid,
        spectralRolloff: spectralFeatures.rolloff,
        zeroCrossingRate: temporalFeatures.zcr,
        energy: energy
      });

      // Calculate confidence based on pitch consistency and signal quality
      const confidence = this.calculateConfidence(pitchEstimates, energy, spectralFeatures);

      return {
        fingerprint,
        pitch: Math.round(finalPitch * 10) / 10,
        energy: Math.round(energy * 10000) / 10000,
        brightness: Math.round(spectralFeatures.centroid),
        texture: Math.round(temporalFeatures.zcr * 10000) / 10000,
        confidence: Math.round(confidence),
        voiceType: voiceType,
        pitchRange: pitchEstimates.length > 0 ? `${Math.round(Math.min(...pitchEstimates))}-${Math.round(Math.max(...pitchEstimates))}Hz` : 'N/A',
        quality: this.assessQuality(energy, confidence)
      };

    } catch (error) {
      console.error('Voice fingerprinting error:', error);
      throw new Error(`Fingerprinting failed: ${error.message}`);
    }
  }

  preprocessAudio(samples) {
    // Remove DC offset
    const mean = samples.reduce((sum, val) => sum + val, 0) / samples.length;
    let dcRemoved = samples.map(val => val - mean);

    // Apply high-pass filter to remove low-frequency noise
    dcRemoved = this.highPassFilter(dcRemoved, 80); // Remove below 80Hz

    // Normalize to [-1, 1] range
    const maxAbs = Math.max(...dcRemoved.map(Math.abs));
    if (maxAbs > 0) {
      dcRemoved = dcRemoved.map(val => val / maxAbs);
    }

    return dcRemoved;
  }

  highPassFilter(samples, cutoffHz) {
    // Simple high-pass filter
    const rc = 1.0 / (2 * Math.PI * cutoffHz);
    const dt = 1.0 / this.sampleRate;
    const alpha = rc / (rc + dt);

    const filtered = [samples[0]];
    for (let i = 1; i < samples.length; i++) {
      filtered[i] = alpha * (filtered[i-1] + samples[i] - samples[i-1]);
    }

    return filtered;
  }

  extractMultiplePitchEstimates(samples) {
    const estimates = [];
    const frameSize = 4096; // Larger frame for better pitch detection
    const hopSize = 2048;

    // Extract pitch from multiple frames
    for (let i = 0; i < samples.length - frameSize; i += hopSize) {
      const frame = samples.slice(i, i + frameSize);
      
      // Check if frame has sufficient energy
      const frameEnergy = frame.reduce((sum, val) => sum + val * val, 0) / frame.length;
      if (frameEnergy < 0.000001) continue; // Skip silent frames

      // Method 1: Autocorrelation (primary method)
      const autocorrPitch = this.autocorrelationPitch(frame);
      if (autocorrPitch > this.minPitch && autocorrPitch < this.maxPitch) {
        estimates.push(autocorrPitch);
      }

      // Only use zero crossing if we don't have enough autocorrelation estimates
      if (estimates.length < 3) {
        const zcrPitch = this.zeroCrossingPitch(frame);
        if (zcrPitch > this.minPitch && zcrPitch < this.maxPitch) {
          estimates.push(zcrPitch);
        }
      }
    }

    return estimates.filter(p => p > 0);
  }

  autocorrelationPitch(frame) {
    const minPeriod = Math.floor(this.sampleRate / this.maxPitch);
    const maxPeriod = Math.floor(this.sampleRate / this.minPitch);

    let bestPeriod = 0;
    let maxCorrelation = -1;
    
    // Pre-compute frame energy to avoid processing silent frames
    const frameEnergy = frame.reduce((sum, val) => sum + val * val, 0);
    if (frameEnergy < 0.000001) return 0; // Skip silent frames

    for (let period = minPeriod; period <= maxPeriod && period < frame.length / 2; period++) {
      let correlation = 0;
      let energy1 = 0;
      let energy2 = 0;

      // Calculate normalized cross-correlation
      for (let i = 0; i < frame.length - period; i++) {
        correlation += frame[i] * frame[i + period];
        energy1 += frame[i] * frame[i];
        energy2 += frame[i + period] * frame[i + period];
      }

      // Normalize correlation properly
      const normalizer = Math.sqrt(energy1 * energy2);
      if (normalizer > 0) {
        const normalizedCorr = correlation / normalizer;
        
        // Look for strong correlation (> 0.3) with preference for lower periods
        if (normalizedCorr > maxCorrelation && normalizedCorr > 0.3) {
          maxCorrelation = normalizedCorr;
          bestPeriod = period;
        }
      }
    }

    return bestPeriod > 0 && maxCorrelation > 0.3 ? this.sampleRate / bestPeriod : 0;
  }

  zeroCrossingPitch(frame) {
    // Count zero crossings
    let crossings = 0;
    for (let i = 1; i < frame.length; i++) {
      if ((frame[i] >= 0) !== (frame[i-1] >= 0)) {
        crossings++;
      }
    }

    // Estimate fundamental frequency from zero crossing rate
    const zcr = crossings / (2 * frame.length / this.sampleRate);
    return zcr > this.minPitch && zcr < this.maxPitch ? zcr : 0;
  }

  getMedianPitch(pitches) {
    if (pitches.length === 0) return 0; // Return 0 instead of fallback

    // Remove outliers (values outside 1.5 * IQR)
    const sorted = [...pitches].sort((a, b) => a - b);
    const q1 = sorted[Math.floor(sorted.length * 0.25)];
    const q3 = sorted[Math.floor(sorted.length * 0.75)];
    const iqr = q3 - q1;
    
    const filtered = sorted.filter(p => 
      p >= q1 - 1.5 * iqr && p <= q3 + 1.5 * iqr
    );
    
    if (filtered.length === 0) return 0;
    
    const mid = Math.floor(filtered.length / 2);
    return filtered.length % 2 === 0
      ? (filtered[mid - 1] + filtered[mid]) / 2
      : filtered[mid];
  }

  extractSpectralFeatures(samples) {
    // Simple spectral centroid calculation
    const fft = this.simpleFFT(samples.slice(0, 1024));
    const magnitudes = fft.map(c => Math.sqrt(c.real * c.real + c.imag * c.imag));

    // Spectral centroid
    let weightedSum = 0;
    let magnitudeSum = 0;

    for (let i = 0; i < magnitudes.length / 2; i++) {
      const freq = (i * this.sampleRate) / magnitudes.length;
      weightedSum += freq * magnitudes[i];
      magnitudeSum += magnitudes[i];
    }

    const centroid = magnitudeSum > 0 ? weightedSum / magnitudeSum : 0;

    // Spectral rolloff (frequency below which 85% of energy lies)
    const energyThreshold = 0.85 * magnitudeSum;
    let cumulativeEnergy = 0;
    let rolloff = 0;

    for (let i = 0; i < magnitudes.length / 2; i++) {
      cumulativeEnergy += magnitudes[i];
      if (cumulativeEnergy >= energyThreshold) {
        rolloff = (i * this.sampleRate) / magnitudes.length;
        break;
      }
    }

    return { centroid, rolloff };
  }

  extractTemporalFeatures(samples) {
    // Zero crossing rate
    let crossings = 0;
    for (let i = 1; i < samples.length; i++) {
      if ((samples[i] >= 0) !== (samples[i-1] >= 0)) {
        crossings++;
      }
    }

    const zcr = crossings / samples.length;

    return { zcr };
  }

  calculateRMSEnergy(samples) {
    const sumSquares = samples.reduce((sum, val) => sum + val * val, 0);
    return Math.sqrt(sumSquares / samples.length);
  }

  classifyVoiceType(pitch, energy, spectralFeatures) {
    if (energy < 0.001) return 'Unclear'; // Very low energy

    if (pitch < 85) {
      return 'Very Low Pitch';
    } else if (pitch < 165) {
      return 'Male';
    } else if (pitch < 265) {
      return pitch > 200 ? 'Female' : 'High Male/Low Female';
    } else if (pitch < 400) {
      return 'Female';
    } else {
      return 'Very High Pitch/Non-Human';
    }
  }

  createFingerprint(features) {
    // Create deterministic hash from voice features
    const featureString = [
      Math.round(features.pitch),
      Math.round(features.spectralCentroid),
      Math.round(features.spectralRolloff),
      Math.round(features.zeroCrossingRate * 10000),
      Math.round(features.energy * 10000)
    ].join('|');

    return this.simpleHash(featureString).substring(0, 8);
  }

  calculateConfidence(pitchEstimates, energy, spectralFeatures) {
    let confidence = 50; // Base confidence

    // Pitch consistency
    if (pitchEstimates.length > 3) {
      const variance = this.calculateVariance(pitchEstimates);
      const avgPitch = pitchEstimates.reduce((sum, p) => sum + p, 0) / pitchEstimates.length;
      const cv = Math.sqrt(variance) / avgPitch; // Coefficient of variation

      if (cv < 0.1) confidence += 30; // Very consistent
      else if (cv < 0.2) confidence += 20; // Consistent
      else if (cv < 0.3) confidence += 10; // Somewhat consistent
    }

    // Energy level
    if (energy > 0.01) confidence += 15; // Good energy
    else if (energy > 0.005) confidence += 10; // Decent energy
    else if (energy > 0.001) confidence += 5; // Low energy

    // Spectral features
    if (spectralFeatures.centroid > 100 && spectralFeatures.centroid < 4000) {
      confidence += 5; // Reasonable spectral content
    }

    return Math.min(100, Math.max(10, confidence));
  }

  calculateVariance(array) {
    const mean = array.reduce((sum, val) => sum + val, 0) / array.length;
    const squaredDiffs = array.map(val => (val - mean) * (val - mean));
    return squaredDiffs.reduce((sum, val) => sum + val, 0) / array.length;
  }

  assessQuality(energy, confidence) {
    if (confidence > 80 && energy > 0.01) return 'Excellent';
    if (confidence > 60 && energy > 0.005) return 'Good';
    if (confidence > 40 && energy > 0.001) return 'Fair';
    return 'Poor';
  }

  simpleFFT(samples) {
    // Simplified FFT for spectral analysis
    const N = samples.length;
    const result = [];

    for (let k = 0; k < N; k++) {
      let real = 0;
      let imag = 0;

      for (let n = 0; n < N; n++) {
        const angle = -2 * Math.PI * k * n / N;
        real += samples[n] * Math.cos(angle);
        imag += samples[n] * Math.sin(angle);
      }

      result.push({ real, imag });
    }

    return result;
  }

  simplePitchDetection(samples) {
    // Fallback pitch detection using dominant frequency
    const fft = this.simpleFFT(samples.slice(0, 2048));
    const magnitudes = fft.map(c => Math.sqrt(c.real * c.real + c.imag * c.imag));
    
    let maxMagnitude = 0;
    let dominantFreq = 0;
    
    // Look for dominant frequency in human voice range
    for (let i = 1; i < magnitudes.length / 2; i++) {
      const freq = (i * this.sampleRate) / magnitudes.length;
      if (freq >= this.minPitch && freq <= this.maxPitch && magnitudes[i] > maxMagnitude) {
        maxMagnitude = magnitudes[i];
        dominantFreq = freq;
      }
    }
    
    return dominantFreq;
  }

  simpleHash(str) {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return Math.abs(hash).toString(16);
  }
}
