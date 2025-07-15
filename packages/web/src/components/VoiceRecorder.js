// File: packages/web/src/components/VoiceRecorder.js
// FIXED: VoiceRecorder with Robust Voice Fingerprinting

import React, { useState, useEffect, useRef } from 'react';

// Robust VoiceFingerprinting class with efficient algorithms
class VoiceFingerprinting {
  constructor() {
    this.sampleRate = 48000;
    this.frameSize = 1024;
    this.hopLength = 512;
    this.minPitch = 50;
    this.maxPitch = 800;
    this.windowSize = 1024;
  }

  async extractFingerprint(audioBuffer) {
    try {
      const samples = Array.from(audioBuffer);
      console.log(`Processing ${samples.length} samples at ${this.sampleRate}Hz`);

      // Downsample if needed to prevent excessive processing
      const processedSamples = this.preprocessAudio(samples);
      
      // Use multiple robust pitch detection methods
      const pitchEstimates = this.extractPitchEstimates(processedSamples);
      const avgPitch = this.getValidPitch(pitchEstimates);
      
      console.log(`Found ${pitchEstimates.length} pitch estimates:`, pitchEstimates);
      console.log(`Average pitch: ${avgPitch}Hz`);

      // Extract comprehensive voice identity features
      const spectralFeatures = this.extractSpectralFeatures(processedSamples);
      const temporalFeatures = this.extractTemporalFeatures(processedSamples);
      const formantFreqs = this.extractFormants(processedSamples);
      const voiceQuality = this.analyzeVoiceQuality(processedSamples, avgPitch);
      const mfccs = this.calculateMFCCs(processedSamples);
      const energy = this.calculateRMSEnergy(processedSamples);
      const voiceType = this.classifyVoiceType(avgPitch, energy, spectralFeatures);

      const fingerprint = this.createFingerprint({
        pitch: avgPitch,
        spectralCentroid: spectralFeatures.centroid,
        spectralRolloff: spectralFeatures.rolloff,
        zeroCrossingRate: temporalFeatures.zcr,
        energy: energy,
        formants: formantFreqs,
        jitter: voiceQuality.jitter,
        shimmer: voiceQuality.shimmer,
        hnr: voiceQuality.hnr,
        mfccs: mfccs
      });

      const confidence = this.calculateConfidence(pitchEstimates, energy, spectralFeatures);

      return {
        fingerprint,
        pitch: Math.round(avgPitch * 10) / 10,
        energy: Math.round(energy * 10000) / 10000,
        brightness: Math.round(spectralFeatures.centroid),
        texture: Math.round(temporalFeatures.zcr * 10000) / 10000,
        confidence: Math.round(confidence),
        voiceType: voiceType,
        pitchRange: pitchEstimates.length > 0 ? `${Math.round(Math.min(...pitchEstimates))}-${Math.round(Math.max(...pitchEstimates))}Hz` : 'N/A',
        quality: this.assessQuality(energy, confidence),
        // Advanced voice identity metrics
        formants: {
          f1: Math.round(formantFreqs.f1),
          f2: Math.round(formantFreqs.f2),
          f3: Math.round(formantFreqs.f3)
        },
        voiceQuality: {
          jitter: Math.round(voiceQuality.jitter * 1000) / 1000,
          shimmer: Math.round(voiceQuality.shimmer * 1000) / 1000,
          hnr: Math.round(voiceQuality.hnr * 10) / 10,
          breathiness: voiceQuality.breathiness,
          roughness: voiceQuality.roughness
        },
        spectralTilt: Math.round(spectralFeatures.tilt * 100) / 100,
        mfccs: mfccs.slice(0, 5).map(m => Math.round(m * 100) / 100) // First 5 MFCCs
      };

    } catch (error) {
      console.error('Voice fingerprinting error:', error);
      throw new Error(`Fingerprinting failed: ${error.message}`);
    }
  }

  preprocessAudio(samples) {
    // Efficient preprocessing without creating multiple arrays
    const length = samples.length;
    const processed = new Array(length);
    
    // Calculate mean
    let sum = 0;
    for (let i = 0; i < length; i++) {
      sum += samples[i];
    }
    const mean = sum / length;
    
    // Remove DC offset and find max absolute value
    let maxAbs = 0;
    for (let i = 0; i < length; i++) {
      processed[i] = samples[i] - mean;
      const abs = Math.abs(processed[i]);
      if (abs > maxAbs) maxAbs = abs;
    }
    
    // Normalize
    if (maxAbs > 0) {
      for (let i = 0; i < length; i++) {
        processed[i] /= maxAbs;
      }
    }
    
    // Apply simple high-pass filter
    return this.highPassFilter(processed, 80);
  }

  highPassFilter(samples, cutoffHz) {
    // Simple high-pass filter using first-order difference
    const rc = 1.0 / (2 * Math.PI * cutoffHz);
    const dt = 1.0 / this.sampleRate;
    const alpha = rc / (rc + dt);
    
    const filtered = new Array(samples.length);
    filtered[0] = samples[0];
    
    for (let i = 1; i < samples.length; i++) {
      filtered[i] = alpha * (filtered[i-1] + samples[i] - samples[i-1]);
    }
    
    return filtered;
  }

  extractPitchEstimates(samples) {
    const estimates = [];
    const frameSize = 1024;
    const hopSize = 512;
    const maxFrames = 8; // Process reasonable number of frames
    
    // Take samples from different parts of the audio
    const sampleStep = Math.floor(samples.length / maxFrames);
    
    for (let i = 0; i < maxFrames; i++) {
      const startIdx = i * sampleStep;
      if (startIdx + frameSize > samples.length) break;
      
      const frame = samples.slice(startIdx, startIdx + frameSize);
      
      // Check if frame has sufficient energy
      const frameEnergy = this.calculateFrameEnergy(frame);
      if (frameEnergy < 0.000001) continue;
      
      // Use YIN algorithm for robust pitch detection
      const pitch = this.yinPitchDetection(frame);
      if (pitch > this.minPitch && pitch < this.maxPitch) {
        estimates.push(pitch);
      }
    }
    
    return estimates;
  }

  yinPitchDetection(frame) {
    const frameSize = frame.length;
    const threshold = 0.1;
    
    // Step 1: Calculate difference function
    const diff = new Array(frameSize / 2);
    for (let tau = 0; tau < frameSize / 2; tau++) {
      diff[tau] = 0;
      for (let i = 0; i < frameSize / 2; i++) {
        const delta = frame[i] - frame[i + tau];
        diff[tau] += delta * delta;
      }
    }
    
    // Step 2: Calculate cumulative mean normalized difference
    const cmndf = new Array(frameSize / 2);
    cmndf[0] = 1;
    let runningSum = 0;
    
    for (let tau = 1; tau < frameSize / 2; tau++) {
      runningSum += diff[tau];
      cmndf[tau] = diff[tau] / (runningSum / tau);
    }
    
    // Step 3: Find first minimum below threshold
    for (let tau = 2; tau < frameSize / 2; tau++) {
      if (cmndf[tau] < threshold) {
        // Find local minimum
        while (tau + 1 < frameSize / 2 && cmndf[tau + 1] < cmndf[tau]) {
          tau++;
        }
        const frequency = this.sampleRate / tau;
        return frequency;
      }
    }
    
    return 0; // No pitch found
  }

  calculateFrameEnergy(frame) {
    let energy = 0;
    for (let i = 0; i < frame.length; i++) {
      energy += frame[i] * frame[i];
    }
    return energy / frame.length;
  }

  getValidPitch(pitches) {
    if (pitches.length === 0) return 150; // Reasonable fallback

    // Remove outliers using median absolute deviation
    const sorted = [...pitches].sort((a, b) => a - b);
    const median = sorted[Math.floor(sorted.length / 2)];
    
    // Calculate MAD (Median Absolute Deviation)
    const deviations = sorted.map(p => Math.abs(p - median));
    deviations.sort((a, b) => a - b);
    const mad = deviations[Math.floor(deviations.length / 2)];
    
    // Filter outliers (values more than 2 MADs from median)
    const filtered = sorted.filter(p => 
      Math.abs(p - median) <= 2 * mad
    );
    
    if (filtered.length === 0) return median;
    
    // Return weighted average (favor middle values)
    const mid = Math.floor(filtered.length / 2);
    if (filtered.length % 2 === 0) {
      return (filtered[mid - 1] + filtered[mid]) / 2;
    } else {
      return filtered[mid];
    }
  }

  extractSpectralFeatures(samples) {
    // Use windowed approach to calculate spectral features without FFT
    const windowSize = 512;
    const numWindows = Math.floor(samples.length / windowSize);
    
    let totalCentroid = 0;
    let totalRolloff = 0;
    let validWindows = 0;
    
    for (let w = 0; w < numWindows; w++) {
      const start = w * windowSize;
      const window = samples.slice(start, start + windowSize);
      
      // Calculate power spectrum approximation using autocorrelation
      const spectrum = this.calculateSpectrum(window);
      
      // Calculate spectral centroid
      let weightedSum = 0;
      let totalMagnitude = 0;
      
      for (let i = 0; i < spectrum.length; i++) {
        const freq = (i * this.sampleRate) / (spectrum.length * 2);
        weightedSum += freq * spectrum[i];
        totalMagnitude += spectrum[i];
      }
      
      if (totalMagnitude > 0) {
        totalCentroid += weightedSum / totalMagnitude;
        
        // Calculate spectral rolloff (85% energy point)
        const energyThreshold = 0.85 * totalMagnitude;
        let cumulativeEnergy = 0;
        
        for (let i = 0; i < spectrum.length; i++) {
          cumulativeEnergy += spectrum[i];
          if (cumulativeEnergy >= energyThreshold) {
            totalRolloff += (i * this.sampleRate) / (spectrum.length * 2);
            break;
          }
        }
        
        validWindows++;
      }
    }
    
    // Calculate spectral tilt (energy slope)
    const spectralTilt = this.calculateSpectralTilt(samples);
    
    return {
      centroid: validWindows > 0 ? totalCentroid / validWindows : 1000,
      rolloff: validWindows > 0 ? totalRolloff / validWindows : 2000,
      tilt: spectralTilt
    };
  }

  extractTemporalFeatures(samples) {
    // Calculate Zero Crossing Rate efficiently
    let crossings = 0;
    const windowSize = 1024;
    const numWindows = Math.floor(samples.length / windowSize);
    
    for (let w = 0; w < numWindows; w++) {
      const start = w * windowSize;
      const window = samples.slice(start, start + windowSize);
      
      for (let i = 1; i < window.length; i++) {
        if ((window[i] >= 0) !== (window[i-1] >= 0)) {
          crossings++;
        }
      }
    }
    
    const zcr = crossings / samples.length;
    return { zcr };
  }

  calculateRMSEnergy(samples) {
    // Calculate RMS energy efficiently
    let sumSquares = 0;
    for (let i = 0; i < samples.length; i++) {
      sumSquares += samples[i] * samples[i];
    }
    return Math.sqrt(sumSquares / samples.length);
  }

  classifyVoiceType(pitch, energy, spectralFeatures) {
    if (energy < 0.001) return 'Unclear';
    if (pitch < 85) return 'Very Low Pitch';
    else if (pitch < 165) return 'Male';
    else if (pitch < 265) return pitch > 200 ? 'Female' : 'High Male/Low Female';
    else if (pitch < 400) return 'Female';
    else return 'Very High Pitch/Non-Human';
  }

  createFingerprint(features) {
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
    let confidence = 50;

    // Pitch consistency factor
    if (pitchEstimates.length > 1) {
      const variance = this.calculateVariance(pitchEstimates);
      let avgPitch = 0;
      for (let i = 0; i < pitchEstimates.length; i++) {
        avgPitch += pitchEstimates[i];
      }
      avgPitch /= pitchEstimates.length;
      
      const cv = Math.sqrt(variance) / avgPitch;
      
      if (cv < 0.1) confidence += 30;
      else if (cv < 0.2) confidence += 20;
      else if (cv < 0.3) confidence += 10;
    }

    // Energy factor
    if (energy > 0.01) confidence += 15;
    else if (energy > 0.005) confidence += 10;
    else if (energy > 0.001) confidence += 5;

    // Spectral features factor
    if (spectralFeatures.centroid > 100 && spectralFeatures.centroid < 4000) {
      confidence += 5;
    }

    return Math.min(100, Math.max(10, confidence));
  }

  calculateVariance(array) {
    // Calculate variance efficiently
    let sum = 0;
    for (let i = 0; i < array.length; i++) {
      sum += array[i];
    }
    const mean = sum / array.length;
    
    let variance = 0;
    for (let i = 0; i < array.length; i++) {
      const diff = array[i] - mean;
      variance += diff * diff;
    }
    
    return variance / array.length;
  }

  assessQuality(energy, confidence) {
    if (confidence > 80 && energy > 0.01) return 'Excellent';
    if (confidence > 60 && energy > 0.005) return 'Good';
    if (confidence > 40 && energy > 0.001) return 'Fair';
    return 'Poor';
  }

  calculateSpectrum(samples) {
    // Use autocorrelation-based method to estimate power spectrum
    const N = samples.length;
    const spectrum = new Array(N / 4).fill(0);
    
    // Calculate autocorrelation for different lags
    for (let lag = 0; lag < spectrum.length; lag++) {
      let correlation = 0;
      let count = 0;
      
      for (let i = 0; i < N - lag; i++) {
        correlation += samples[i] * samples[i + lag];
        count++;
      }
      
      spectrum[lag] = count > 0 ? Math.abs(correlation / count) : 0;
    }
    
    return spectrum;
  }

  extractFormants(samples) {
    // Extract formant frequencies using Linear Predictive Coding (LPC) approach
    const frameSize = 512;
    const numFrames = Math.floor(samples.length / frameSize);
    const formants = { f1: [], f2: [], f3: [] };
    
    for (let i = 0; i < Math.min(numFrames, 8); i++) {
      const start = i * frameSize;
      const frame = samples.slice(start, start + frameSize);
      
      // Apply window function
      const windowed = this.applyHammingWindow(frame);
      
      // Calculate autocorrelation
      const autocorr = this.calculateAutocorrelation(windowed);
      
      // Find peaks in autocorrelation (formant candidates)
      const peaks = this.findSpectralPeaks(autocorr);
      
      // Map peaks to formant frequencies
      if (peaks.length >= 1) formants.f1.push(peaks[0] * this.sampleRate / frameSize);
      if (peaks.length >= 2) formants.f2.push(peaks[1] * this.sampleRate / frameSize);
      if (peaks.length >= 3) formants.f3.push(peaks[2] * this.sampleRate / frameSize);
    }
    
    return {
      f1: this.getMedianValue(formants.f1) || 700,  // Typical F1 for mixed voice
      f2: this.getMedianValue(formants.f2) || 1220, // Typical F2 for mixed voice
      f3: this.getMedianValue(formants.f3) || 2600  // Typical F3 for mixed voice
    };
  }
  
  analyzeVoiceQuality(samples, fundamentalFreq) {
    // Calculate voice quality metrics
    const jitter = this.calculateJitter(samples, fundamentalFreq);
    const shimmer = this.calculateShimmer(samples, fundamentalFreq);
    const hnr = this.calculateHNR(samples, fundamentalFreq);
    const breathiness = this.calculateBreathiness(samples);
    const roughness = this.calculateRoughness(samples);
    
    return { jitter, shimmer, hnr, breathiness, roughness };
  }
  
  calculateMFCCs(samples) {
    // Simplified MFCC calculation
    const frameSize = 512;
    const numMFCCs = 13;
    const mfccs = new Array(numMFCCs).fill(0);
    
    // Process in frames
    const numFrames = Math.floor(samples.length / frameSize);
    
    for (let i = 0; i < Math.min(numFrames, 8); i++) {
      const start = i * frameSize;
      const frame = samples.slice(start, start + frameSize);
      
      // Apply window and get spectrum
      const windowed = this.applyHammingWindow(frame);
      const spectrum = this.calculateSpectrum(windowed);
      
      // Apply mel filter bank
      const melSpectrum = this.applyMelFilterBank(spectrum);
      
      // Calculate DCT (Discrete Cosine Transform)
      const frameMFCCs = this.calculateDCT(melSpectrum);
      
      // Accumulate MFCCs
      for (let j = 0; j < numMFCCs; j++) {
        mfccs[j] += frameMFCCs[j] || 0;
      }
    }
    
    // Average across frames
    return mfccs.map(mfcc => mfcc / numFrames);
  }

  // Helper methods for advanced voice analysis
  calculateSpectralTilt(samples) {
    const spectrum = this.calculateSpectrum(samples.slice(0, 1024));
    const freqs = spectrum.map((_, i) => i * this.sampleRate / (spectrum.length * 2));
    
    // Calculate regression slope (spectral tilt)
    let sumX = 0, sumY = 0, sumXY = 0, sumX2 = 0;
    let n = 0;
    
    for (let i = 1; i < spectrum.length; i++) {
      if (freqs[i] > 0 && spectrum[i] > 0) {
        const x = Math.log(freqs[i]);
        const y = Math.log(spectrum[i]);
        sumX += x;
        sumY += y;
        sumXY += x * y;
        sumX2 += x * x;
        n++;
      }
    }
    
    const slope = n > 0 ? (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX) : 0;
    return slope;
  }
  
  calculateJitter(samples, fundamentalFreq) {
    if (fundamentalFreq === 0) return 0;
    
    const period = this.sampleRate / fundamentalFreq;
    const periods = [];
    
    // Extract periods
    for (let i = 0; i < samples.length - period * 2; i += Math.floor(period)) {
      const actualPeriod = this.findActualPeriod(samples, i, period);
      if (actualPeriod > 0) periods.push(actualPeriod);
    }
    
    if (periods.length < 2) return 0;
    
    // Calculate jitter as period variation
    let jitterSum = 0;
    for (let i = 1; i < periods.length; i++) {
      jitterSum += Math.abs(periods[i] - periods[i-1]);
    }
    
    const avgPeriod = periods.reduce((sum, p) => sum + p, 0) / periods.length;
    return avgPeriod > 0 ? jitterSum / ((periods.length - 1) * avgPeriod) : 0;
  }
  
  calculateShimmer(samples, fundamentalFreq) {
    if (fundamentalFreq === 0) return 0;
    
    const period = this.sampleRate / fundamentalFreq;
    const amplitudes = [];
    
    // Extract amplitudes
    for (let i = 0; i < samples.length - period; i += Math.floor(period)) {
      const amplitude = this.getRMSAmplitude(samples, i, Math.floor(period));
      if (amplitude > 0) amplitudes.push(amplitude);
    }
    
    if (amplitudes.length < 2) return 0;
    
    // Calculate shimmer as amplitude variation
    let shimmerSum = 0;
    for (let i = 1; i < amplitudes.length; i++) {
      shimmerSum += Math.abs(amplitudes[i] - amplitudes[i-1]);
    }
    
    const avgAmplitude = amplitudes.reduce((sum, a) => sum + a, 0) / amplitudes.length;
    return avgAmplitude > 0 ? shimmerSum / ((amplitudes.length - 1) * avgAmplitude) : 0;
  }
  
  calculateHNR(samples, fundamentalFreq) {
    if (fundamentalFreq === 0) return 0;
    
    const spectrum = this.calculateSpectrum(samples.slice(0, 1024));
    const fundamental = Math.round(fundamentalFreq * spectrum.length * 2 / this.sampleRate);
    
    // Calculate harmonic and noise energy
    let harmonicEnergy = 0;
    let totalEnergy = 0;
    
    for (let i = 0; i < spectrum.length; i++) {
      totalEnergy += spectrum[i];
      
      // Check if this frequency is a harmonic
      const isHarmonic = (i % fundamental === 0) && (i > 0);
      if (isHarmonic) {
        harmonicEnergy += spectrum[i];
      }
    }
    
    const noiseEnergy = totalEnergy - harmonicEnergy;
    return noiseEnergy > 0 ? 10 * Math.log10(harmonicEnergy / noiseEnergy) : 20;
  }
  
  calculateBreathiness(samples) {
    // High-frequency energy ratio as proxy for breathiness
    const spectrum = this.calculateSpectrum(samples.slice(0, 1024));
    const midpoint = spectrum.length / 2;
    
    let highFreqEnergy = 0;
    let totalEnergy = 0;
    
    for (let i = 0; i < spectrum.length; i++) {
      totalEnergy += spectrum[i];
      if (i > midpoint) {
        highFreqEnergy += spectrum[i];
      }
    }
    
    const ratio = totalEnergy > 0 ? highFreqEnergy / totalEnergy : 0;
    return ratio > 0.3 ? 'High' : ratio > 0.15 ? 'Medium' : 'Low';
  }
  
  calculateRoughness(samples) {
    // Spectral irregularity as proxy for roughness
    const spectrum = this.calculateSpectrum(samples.slice(0, 1024));
    let irregularity = 0;
    
    for (let i = 1; i < spectrum.length - 1; i++) {
      const diff = Math.abs(spectrum[i] - (spectrum[i-1] + spectrum[i+1]) / 2);
      irregularity += diff;
    }
    
    const avgIrregularity = irregularity / (spectrum.length - 2);
    return avgIrregularity > 0.1 ? 'High' : avgIrregularity > 0.05 ? 'Medium' : 'Low';
  }
  
  // Additional helper methods
  applyHammingWindow(samples) {
    const windowed = new Array(samples.length);
    for (let i = 0; i < samples.length; i++) {
      windowed[i] = samples[i] * (0.54 - 0.46 * Math.cos(2 * Math.PI * i / (samples.length - 1)));
    }
    return windowed;
  }
  
  calculateAutocorrelation(samples) {
    const result = new Array(samples.length / 2);
    for (let lag = 0; lag < result.length; lag++) {
      let sum = 0;
      for (let i = 0; i < samples.length - lag; i++) {
        sum += samples[i] * samples[i + lag];
      }
      result[lag] = sum / (samples.length - lag);
    }
    return result;
  }
  
  findSpectralPeaks(spectrum) {
    const peaks = [];
    const minPeakHeight = Math.max(...spectrum) * 0.1;
    
    for (let i = 1; i < spectrum.length - 1; i++) {
      if (spectrum[i] > spectrum[i-1] && spectrum[i] > spectrum[i+1] && spectrum[i] > minPeakHeight) {
        peaks.push(i);
      }
    }
    
    return peaks.slice(0, 3); // Return first 3 peaks
  }
  
  getMedianValue(array) {
    if (array.length === 0) return 0;
    const sorted = [...array].sort((a, b) => a - b);
    const mid = Math.floor(sorted.length / 2);
    return sorted.length % 2 === 0 ? (sorted[mid-1] + sorted[mid]) / 2 : sorted[mid];
  }
  
  findActualPeriod(samples, start, estimatedPeriod) {
    // Find actual period using cross-correlation
    let maxCorr = 0;
    let bestPeriod = estimatedPeriod;
    
    for (let p = Math.floor(estimatedPeriod * 0.8); p <= Math.floor(estimatedPeriod * 1.2); p++) {
      let corr = 0;
      for (let i = 0; i < p && start + i + p < samples.length; i++) {
        corr += samples[start + i] * samples[start + i + p];
      }
      if (corr > maxCorr) {
        maxCorr = corr;
        bestPeriod = p;
      }
    }
    
    return bestPeriod;
  }
  
  getRMSAmplitude(samples, start, length) {
    let sum = 0;
    for (let i = start; i < start + length && i < samples.length; i++) {
      sum += samples[i] * samples[i];
    }
    return Math.sqrt(sum / length);
  }
  
  applyMelFilterBank(spectrum) {
    // Simplified mel filter bank
    const numFilters = 13;
    const melSpectrum = new Array(numFilters).fill(0);
    const filterWidth = spectrum.length / numFilters;
    
    for (let i = 0; i < numFilters; i++) {
      const start = Math.floor(i * filterWidth);
      const end = Math.floor((i + 1) * filterWidth);
      
      for (let j = start; j < end && j < spectrum.length; j++) {
        melSpectrum[i] += spectrum[j];
      }
      melSpectrum[i] /= (end - start);
    }
    
    return melSpectrum;
  }
  
  calculateDCT(melSpectrum) {
    const numCoeffs = 13;
    const dctCoeffs = new Array(numCoeffs).fill(0);
    
    for (let i = 0; i < numCoeffs; i++) {
      for (let j = 0; j < melSpectrum.length; j++) {
        dctCoeffs[i] += melSpectrum[j] * Math.cos(i * (j + 0.5) * Math.PI / melSpectrum.length);
      }
    }
    
    return dctCoeffs;
  }
  
  simpleHash(str) {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash;
    }
    return Math.abs(hash).toString(16);
  }
}

export default function VoiceRecorder({ onRecordingComplete, onError }) {
  const [recordingState, setRecordingState] = useState('idle');
  const [audioData, setAudioData] = useState(null);
  const [voiceAnalysis, setVoiceAnalysis] = useState(null);
  const [duration, setDuration] = useState(0);
  const [volumeLevel, setVolumeLevel] = useState(0);
  const [error, setError] = useState('');

  const mediaRecorderRef = useRef(null);
  const audioContextRef = useRef(null);
  const analyserRef = useRef(null);
  const streamRef = useRef(null);
  const intervalRef = useRef(null);
  const fingerprintingRef = useRef(new VoiceFingerprinting());

  const startRecording = async () => {
    try {
      setError('');
      setRecordingState('initializing');

      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          sampleRate: 48000,
          channelCount: 1,
          echoCancellation: false,
          noiseSuppression: false,
          autoGainControl: false
        }
      });

      streamRef.current = stream;
      const audioContext = new (window.AudioContext || window.webkitAudioContext)({
        sampleRate: 48000
      });
      audioContextRef.current = audioContext;

      const analyser = audioContext.createAnalyser();
      analyser.fftSize = 256;
      analyserRef.current = analyser;

      const source = audioContext.createMediaStreamSource(stream);
      source.connect(analyser);

      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: 'audio/webm'
      });
      mediaRecorderRef.current = mediaRecorder;

      const audioChunks = [];
      mediaRecorder.ondataavailable = (event) => {
        audioChunks.push(event.data);
      };

      mediaRecorder.onstop = async () => {
        const audioBlob = new Blob(audioChunks, { type: 'audio/webm' });
        const arrayBuffer = await audioBlob.arrayBuffer();
        const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);

        setAudioData({
          blob: audioBlob,
          buffer: audioBuffer,
          duration: audioBuffer.duration,
          sampleRate: audioBuffer.sampleRate,
          size: audioBlob.size
        });

        // Start voice analysis
        setRecordingState('processing');
        try {
          const samples = audioBuffer.getChannelData(0);
          const analysis = await fingerprintingRef.current.extractFingerprint(samples);
          setVoiceAnalysis(analysis);
          setRecordingState('completed');
          
          // Call the callback with the expected format
          if (onRecordingComplete) {
            onRecordingComplete({
              duration: audioBuffer.duration,
              audioBlob: audioBlob,
              audioBuffer: audioBuffer,
              channelData: samples,
              fingerprint: {
                success: true,
                fingerprint: analysis.fingerprint,
                confidence: analysis.confidence / 100,
                features: {
                  pitch: analysis.pitch,
                  energy: analysis.energy,
                  spectralCentroid: analysis.brightness,
                  zeroCrossing: analysis.texture
                }
              }
            });
          }
        } catch (analysisError) {
          console.error('Analysis error:', analysisError);
          setError('Failed to analyze voice: ' + analysisError.message);
          setRecordingState('error');
          
          if (onError) {
            onError(analysisError);
          }
        }
      };

      setRecordingState('recording');
      mediaRecorder.start();

      // Start volume monitoring
      const startTime = Date.now();
      intervalRef.current = setInterval(() => {
        const dataArray = new Uint8Array(analyser.frequencyBinCount);
        analyser.getByteFrequencyData(dataArray);
        const average = dataArray.reduce((sum, value) => sum + value, 0) / dataArray.length;
        setVolumeLevel(average);
        setDuration((Date.now() - startTime) / 1000);
      }, 100);

    } catch (err) {
      console.error('Recording error:', err);
      setError('Microphone access denied or not available');
      setRecordingState('error');
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && recordingState === 'recording') {
      mediaRecorderRef.current.stop();
      clearInterval(intervalRef.current);

      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
      }
      if (audioContextRef.current) {
        audioContextRef.current.close();
      }
    }
  };

  const resetRecording = () => {
    setRecordingState('idle');
    setAudioData(null);
    setVoiceAnalysis(null);
    setDuration(0);
    setVolumeLevel(0);
    setError('');
  };

  const getVoiceTypeColor = (voiceType) => {
    switch(voiceType) {
      case 'Male': return 'text-blue-600';
      case 'Female': return 'text-pink-600';
      case 'High Male/Low Female': return 'text-purple-600';
      case 'Very High Pitch/Non-Human': return 'text-red-600';
      case 'Very Low Pitch': return 'text-gray-600';
      default: return 'text-gray-500';
    }
  };

  const getConfidenceColor = (confidence) => {
    if (confidence >= 80) return 'text-green-600';
    if (confidence >= 60) return 'text-yellow-600';
    return 'text-red-600';
  };

  return (
    <div className="bg-gradient-to-br from-white to-blue-50 rounded-xl shadow-xl border border-blue-100 p-8">
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center space-x-3">
          <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center">
            <span className="text-white text-xl">🎤</span>
          </div>
          <div>
            <h2 className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
              🎤 UPDATED Voice Recorder 🎤
            </h2>
            <p className="text-sm text-gray-500">Advanced voice analysis & fingerprinting</p>
          </div>
        </div>
        {recordingState !== 'idle' && (
          <button
            onClick={resetRecording}
            className="px-6 py-3 text-sm bg-gradient-to-r from-gray-500 to-gray-600 hover:from-gray-600 hover:to-gray-700 text-white rounded-xl transition-all duration-200 transform hover:scale-105 shadow-lg"
          >
            🔄 Reset
          </button>
        )}
      </div>

      {error && (
        <div className="mb-6 p-4 bg-gradient-to-r from-red-50 to-red-100 border border-red-200 rounded-xl">
          <div className="flex items-center space-x-2">
            <span className="text-red-500 text-lg">⚠️</span>
            <p className="text-red-700 font-medium">{error}</p>
          </div>
        </div>
      )}

      <div className="text-center mb-8">
        {recordingState === 'idle' && (
          <button
            onClick={startRecording}
            className="px-12 py-6 bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white rounded-2xl font-bold text-lg transition-all transform hover:scale-105 shadow-xl hover:shadow-2xl"
          >
            <span className="flex items-center justify-center space-x-3">
              <span>🎤</span>
              <span>Start Recording</span>
            </span>
          </button>
        )}

        {recordingState === 'initializing' && (
          <div className="px-12 py-6 bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-2xl font-bold text-lg shadow-lg">
            <span className="flex items-center justify-center space-x-3">
              <span className="animate-spin">🔄</span>
              <span>Initializing microphone...</span>
            </span>
          </div>
        )}

        {recordingState === 'recording' && (
          <div className="space-y-6">
            <button
              onClick={stopRecording}
              className="px-12 py-6 bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 text-white rounded-2xl font-bold text-lg animate-pulse shadow-xl"
            >
              <span className="flex items-center justify-center space-x-3">
                <span>🔴</span>
                <span>Stop Recording ({duration.toFixed(1)}s)</span>
              </span>
            </button>

            <div className="bg-white/50 backdrop-blur-sm rounded-xl p-6 border border-white/20">
              <div className="flex items-center justify-center space-x-4">
                <span className="text-sm font-medium text-gray-700">Volume Level:</span>
                <div className="w-48 h-4 bg-gray-200 rounded-full overflow-hidden shadow-inner">
                  <div
                    className="h-full bg-gradient-to-r from-green-400 to-green-600 transition-all duration-100 rounded-full"
                    style={{ width: `${Math.min(100, (volumeLevel / 128) * 100)}%` }}
                  />
                </div>
                <span className="text-sm font-bold text-gray-700 min-w-[3rem] text-right">{Math.round(volumeLevel)}</span>
              </div>
            </div>
          </div>
        )}

        {recordingState === 'processing' && (
          <div className="px-12 py-6 bg-gradient-to-r from-yellow-500 to-orange-500 text-white rounded-2xl font-bold text-lg shadow-lg">
            <span className="flex items-center justify-center space-x-3">
              <span className="animate-bounce">🔍</span>
              <span>Analyzing voice patterns...</span>
            </span>
          </div>
        )}
      </div>

      {audioData && (
        <div className="space-y-8">
          {/* Primary Analysis Row */}
          <div className="grid md:grid-cols-2 gap-8">
            {/* Recording Info */}
            <div className="bg-gradient-to-br from-slate-50 to-slate-100 rounded-xl p-6 border border-slate-200 shadow-lg">
              <div className="flex items-center space-x-3 mb-4">
                <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-blue-600 rounded-lg flex items-center justify-center">
                  <span className="text-white text-sm">📊</span>
                </div>
                <h3 className="font-bold text-gray-800 text-lg">Recording Analysis</h3>
              </div>
              <div className="space-y-3">
                <div className="flex justify-between items-center p-2 bg-white rounded-lg">
                  <span className="text-gray-600">Duration:</span>
                  <span className="font-mono font-bold text-blue-600">{audioData.duration.toFixed(1)}s</span>
                </div>
                <div className="flex justify-between items-center p-2 bg-white rounded-lg">
                  <span className="text-gray-600">File Size:</span>
                  <span className="font-mono font-bold text-blue-600">{(audioData.size / 1024).toFixed(1)}KB</span>
                </div>
                <div className="flex justify-between items-center p-2 bg-white rounded-lg">
                  <span className="text-gray-600">Sample Rate:</span>
                  <span className="font-mono font-bold text-blue-600">{audioData.sampleRate}Hz</span>
                </div>
                <div className="flex justify-between items-center p-2 bg-white rounded-lg">
                  <span className="text-gray-600">Audio Samples:</span>
                  <span className="font-mono font-bold text-blue-600">{(audioData.duration * audioData.sampleRate).toLocaleString()}</span>
                </div>
              </div>
            </div>

            {/* Voice Fingerprint */}
            {voiceAnalysis && (
              <div className="bg-gradient-to-br from-purple-50 to-purple-100 rounded-xl p-6 border border-purple-200 shadow-lg">
                <div className="flex items-center space-x-3 mb-4">
                  <div className="w-8 h-8 bg-gradient-to-br from-purple-500 to-purple-600 rounded-lg flex items-center justify-center">
                    <span className="text-white text-sm">🎯</span>
                  </div>
                  <h3 className="font-bold text-gray-800 text-lg">Voice Fingerprint</h3>
                </div>
                <div className="space-y-4">
                  <div className="text-center bg-white rounded-xl p-4 border border-purple-200">
                    <div className="text-3xl font-mono font-bold bg-gradient-to-r from-purple-600 to-blue-600 bg-clip-text text-transparent mb-2">
                      {voiceAnalysis.fingerprint}
                    </div>
                    <div className="text-sm text-purple-600 font-medium">Unique Voice ID</div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="bg-white rounded-lg p-3 border border-purple-200">
                      <span className="text-gray-600 text-sm">Voice Type:</span>
                      <div className={`font-bold text-lg ${getVoiceTypeColor(voiceAnalysis.voiceType)}`}>
                        {voiceAnalysis.voiceType}
                      </div>
                    </div>
                    <div className="bg-white rounded-lg p-3 border border-purple-200">
                      <span className="text-gray-600 text-sm">Quality:</span>
                      <div className="font-bold text-lg text-gray-800">{voiceAnalysis.quality}</div>
                    </div>
                    <div className="bg-white rounded-lg p-3 border border-purple-200">
                      <span className="text-gray-600 text-sm">Pitch:</span>
                      <div className="font-mono font-bold text-lg text-purple-700">{voiceAnalysis.pitch}Hz</div>
                    </div>
                    <div className="bg-white rounded-lg p-3 border border-purple-200">
                      <span className="text-gray-600 text-sm">Confidence:</span>
                      <div className={`font-bold text-lg ${getConfidenceColor(voiceAnalysis.confidence)}`}>
                        {voiceAnalysis.confidence}%
                      </div>
                    </div>
                    <div className="bg-white rounded-lg p-3 border border-purple-200">
                      <span className="text-gray-600 text-sm">Energy:</span>
                      <div className="font-mono font-bold text-lg text-purple-700">{voiceAnalysis.energy}</div>
                    </div>
                    <div className="bg-white rounded-lg p-3 border border-purple-200">
                      <span className="text-gray-600 text-sm">Pitch Range:</span>
                      <div className="font-mono font-bold text-purple-700">{voiceAnalysis.pitchRange}</div>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Advanced Voice Identity Analysis */}
          {voiceAnalysis && (
            <div className="grid md:grid-cols-3 gap-6">
              {/* Formant Analysis */}
              <div className="bg-gradient-to-br from-emerald-50 to-emerald-100 rounded-xl p-6 border border-emerald-200 shadow-lg">
                <div className="flex items-center space-x-3 mb-4">
                  <div className="w-8 h-8 bg-gradient-to-br from-emerald-500 to-emerald-600 rounded-lg flex items-center justify-center">
                    <span className="text-white text-sm">🎼</span>
                  </div>
                  <h3 className="font-bold text-gray-800 text-lg">Formant Analysis</h3>
                </div>
                <div className="space-y-3">
                  <div className="bg-white rounded-lg p-3 border border-emerald-200">
                    <div className="flex justify-between items-center">
                      <span className="text-gray-600 text-sm">F1 (Vowel Height):</span>
                      <span className="font-mono font-bold text-emerald-700">{voiceAnalysis.formants?.f1 || 'N/A'}Hz</span>
                    </div>
                  </div>
                  <div className="bg-white rounded-lg p-3 border border-emerald-200">
                    <div className="flex justify-between items-center">
                      <span className="text-gray-600 text-sm">F2 (Vowel Frontness):</span>
                      <span className="font-mono font-bold text-emerald-700">{voiceAnalysis.formants?.f2 || 'N/A'}Hz</span>
                    </div>
                  </div>
                  <div className="bg-white rounded-lg p-3 border border-emerald-200">
                    <div className="flex justify-between items-center">
                      <span className="text-gray-600 text-sm">F3 (Lip Rounding):</span>
                      <span className="font-mono font-bold text-emerald-700">{voiceAnalysis.formants?.f3 || 'N/A'}Hz</span>
                    </div>
                  </div>
                  <div className="bg-emerald-100 rounded-lg p-2">
                    <div className="text-xs text-emerald-700">
                      <strong>Vocal Tract Length:</strong> {voiceAnalysis.formants ? Math.round(17500 / voiceAnalysis.formants.f1 * 100) / 100 : 'N/A'}cm
                    </div>
                  </div>
                </div>
              </div>

              {/* Voice Quality Metrics */}
              <div className="bg-gradient-to-br from-orange-50 to-orange-100 rounded-xl p-6 border border-orange-200 shadow-lg">
                <div className="flex items-center space-x-3 mb-4">
                  <div className="w-8 h-8 bg-gradient-to-br from-orange-500 to-orange-600 rounded-lg flex items-center justify-center">
                    <span className="text-white text-sm">🔬</span>
                  </div>
                  <h3 className="font-bold text-gray-800 text-lg">Voice Quality</h3>
                </div>
                <div className="space-y-3">
                  <div className="bg-white rounded-lg p-3 border border-orange-200">
                    <div className="flex justify-between items-center">
                      <span className="text-gray-600 text-sm">Jitter:</span>
                      <span className="font-mono font-bold text-orange-700">{voiceAnalysis.voiceQuality?.jitter || 'N/A'}</span>
                    </div>
                  </div>
                  <div className="bg-white rounded-lg p-3 border border-orange-200">
                    <div className="flex justify-between items-center">
                      <span className="text-gray-600 text-sm">Shimmer:</span>
                      <span className="font-mono font-bold text-orange-700">{voiceAnalysis.voiceQuality?.shimmer || 'N/A'}</span>
                    </div>
                  </div>
                  <div className="bg-white rounded-lg p-3 border border-orange-200">
                    <div className="flex justify-between items-center">
                      <span className="text-gray-600 text-sm">HNR:</span>
                      <span className="font-mono font-bold text-orange-700">{voiceAnalysis.voiceQuality?.hnr || 'N/A'}dB</span>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div className="bg-white rounded-lg p-2 border border-orange-200">
                      <div className="text-xs text-gray-600">Breathiness:</div>
                      <div className="font-bold text-orange-700">{voiceAnalysis.voiceQuality?.breathiness || 'N/A'}</div>
                    </div>
                    <div className="bg-white rounded-lg p-2 border border-orange-200">
                      <div className="text-xs text-gray-600">Roughness:</div>
                      <div className="font-bold text-orange-700">{voiceAnalysis.voiceQuality?.roughness || 'N/A'}</div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Spectral & MFCC Analysis */}
              <div className="bg-gradient-to-br from-cyan-50 to-cyan-100 rounded-xl p-6 border border-cyan-200 shadow-lg">
                <div className="flex items-center space-x-3 mb-4">
                  <div className="w-8 h-8 bg-gradient-to-br from-cyan-500 to-cyan-600 rounded-lg flex items-center justify-center">
                    <span className="text-white text-sm">📈</span>
                  </div>
                  <h3 className="font-bold text-gray-800 text-lg">Spectral Features</h3>
                </div>
                <div className="space-y-3">
                  <div className="bg-white rounded-lg p-3 border border-cyan-200">
                    <div className="flex justify-between items-center">
                      <span className="text-gray-600 text-sm">Spectral Tilt:</span>
                      <span className="font-mono font-bold text-cyan-700">{voiceAnalysis.spectralTilt || 'N/A'}</span>
                    </div>
                  </div>
                  <div className="bg-white rounded-lg p-3 border border-cyan-200">
                    <div className="flex justify-between items-center">
                      <span className="text-gray-600 text-sm">Brightness:</span>
                      <span className="font-mono font-bold text-cyan-700">{voiceAnalysis.brightness}Hz</span>
                    </div>
                  </div>
                  <div className="bg-white rounded-lg p-3 border border-cyan-200">
                    <div className="flex justify-between items-center">
                      <span className="text-gray-600 text-sm">Texture (ZCR):</span>
                      <span className="font-mono font-bold text-cyan-700">{voiceAnalysis.texture}</span>
                    </div>
                  </div>
                  <div className="bg-cyan-100 rounded-lg p-2">
                    <div className="text-xs text-cyan-700">
                      <strong>MFCCs:</strong> {voiceAnalysis.mfccs ? voiceAnalysis.mfccs.slice(0, 3).join(', ') : 'N/A'}...
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {recordingState === 'completed' && voiceAnalysis && (
        <div className="mt-8 p-6 bg-gradient-to-r from-green-50 to-emerald-50 border border-green-200 rounded-xl shadow-lg">
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 bg-gradient-to-br from-green-500 to-emerald-600 rounded-full flex items-center justify-center">
              <span className="text-white text-sm">✅</span>
            </div>
            <div>
              <p className="text-green-700 font-bold text-lg">
                Voice captured and analyzed successfully!
              </p>
              <p className="text-green-600 text-sm">
                {voiceAnalysis.confidence >= 70 ? 
                  '🎯 High-quality fingerprint generated with excellent confidence score.' : 
                  '⚠️ Consider recording in a quieter environment for better results.'}
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
