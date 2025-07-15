// File: packages/web/src/components/VoiceRecorder.js
// FIXED: VoiceRecorder with Robust Voice Fingerprinting

import React, { useState, useEffect, useRef } from 'react';
import { VoiceFingerprinting } from '../../../voice-engine/src/VoiceFingerprinting.js';

// Remove duplicate VoiceFingerprinting class and use the imported one
/*
class VoiceFingerprinting {
  constructor() {
    this.sampleRate = 48000;
    this.frameSize = 1024;
    this.hopLength = 512;
    this.minPitch = 50;
    this.maxPitch = 800;
  }

  async extractFingerprint(audioBuffer) {
    try {
      const samples = Array.from(audioBuffer);
      console.log(`Processing ${samples.length} samples at ${this.sampleRate}Hz`);

      const processedSamples = this.preprocessAudio(samples);
      const pitchEstimates = this.extractMultiplePitchEstimates(processedSamples);
      const avgPitch = this.getMedianPitch(pitchEstimates);
      const spectralFeatures = this.extractSpectralFeatures(processedSamples);
      const temporalFeatures = this.extractTemporalFeatures(processedSamples);
      const energy = this.calculateRMSEnergy(processedSamples);
      const voiceType = this.classifyVoiceType(avgPitch, energy, spectralFeatures);

      const fingerprint = this.createFingerprint({
        pitch: avgPitch,
        spectralCentroid: spectralFeatures.centroid,
        spectralRolloff: spectralFeatures.rolloff,
        zeroCrossingRate: temporalFeatures.zcr,
        energy: energy
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
        pitchRange: `${Math.round(Math.min(...pitchEstimates))}-${Math.round(Math.max(...pitchEstimates))}Hz`,
        quality: this.assessQuality(energy, confidence),
        pitchConsistency: pitchEstimates.length > 1 ? Math.round(this.calculateVariance(pitchEstimates)) : 0
      };

    } catch (error) {
      console.error('Voice fingerprinting error:', error);
      throw new Error(`Fingerprinting failed: ${error.message}`);
    }
  }

  preprocessAudio(samples) {
    const mean = samples.reduce((sum, val) => sum + val, 0) / samples.length;
    let dcRemoved = samples.map(val => val - mean);
    dcRemoved = this.highPassFilter(dcRemoved, 80);
    const maxAbs = Math.max(...dcRemoved.map(Math.abs));
    if (maxAbs > 0) {
      dcRemoved = dcRemoved.map(val => val / maxAbs);
    }
    return dcRemoved;
  }

  highPassFilter(samples, cutoffHz) {
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
    const frameSize = 2048;
    const hopSize = 1024;

    for (let i = 0; i < samples.length - frameSize; i += hopSize) {
      const frame = samples.slice(i, i + frameSize);
      const autocorrPitch = this.autocorrelationPitch(frame);
      if (autocorrPitch > this.minPitch && autocorrPitch < this.maxPitch) {
        estimates.push(autocorrPitch);
      }
      const zcrPitch = this.zeroCrossingPitch(frame);
      if (zcrPitch > this.minPitch && zcrPitch < this.maxPitch) {
        estimates.push(zcrPitch);
      }
    }
    return estimates.filter(p => p > 0);
  }

  autocorrelationPitch(frame) {
    const minPeriod = Math.floor(this.sampleRate / this.maxPitch);
    const maxPeriod = Math.floor(this.sampleRate / this.minPitch);
    let bestPeriod = 0;
    let maxCorrelation = 0;

    for (let period = minPeriod; period <= maxPeriod && period < frame.length / 2; period++) {
      let correlation = 0;
      let normalizer = 0;

      for (let i = 0; i < frame.length - period; i++) {
        correlation += frame[i] * frame[i + period];
        normalizer += frame[i] * frame[i];
      }

      if (normalizer > 0) {
        correlation /= normalizer;
        if (correlation > maxCorrelation) {
          maxCorrelation = correlation;
          bestPeriod = period;
        }
      }
    }
    return bestPeriod > 0 ? this.sampleRate / bestPeriod : 0;
  }

  zeroCrossingPitch(frame) {
    let crossings = 0;
    for (let i = 1; i < frame.length; i++) {
      if ((frame[i] >= 0) !== (frame[i-1] >= 0)) {
        crossings++;
      }
    }
    const zcr = crossings / (2 * frame.length / this.sampleRate);
    return zcr > this.minPitch && zcr < this.maxPitch ? zcr : 0;
  }

  getMedianPitch(pitches) {
    if (pitches.length === 0) return 150;
    const sorted = [...pitches].sort((a, b) => a - b);
    const mid = Math.floor(sorted.length / 2);
    return sorted.length % 2 === 0
      ? (sorted[mid - 1] + sorted[mid]) / 2
      : sorted[mid];
  }

  extractSpectralFeatures(samples) {
    const fft = this.simpleFFT(samples.slice(0, 1024));
    const magnitudes = fft.map(c => Math.sqrt(c.real * c.real + c.imag * c.imag));

    let weightedSum = 0;
    let magnitudeSum = 0;

    for (let i = 0; i < magnitudes.length / 2; i++) {
      const freq = (i * this.sampleRate) / magnitudes.length;
      weightedSum += freq * magnitudes[i];
      magnitudeSum += magnitudes[i];
    }

    const centroid = magnitudeSum > 0 ? weightedSum / magnitudeSum : 0;
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

    if (pitchEstimates.length > 3) {
      const variance = this.calculateVariance(pitchEstimates);
      const avgPitch = pitchEstimates.reduce((sum, p) => sum + p, 0) / pitchEstimates.length;
      const cv = Math.sqrt(variance) / avgPitch;

      if (cv < 0.1) confidence += 30;
      else if (cv < 0.2) confidence += 20;
      else if (cv < 0.3) confidence += 10;
    }

    if (energy > 0.01) confidence += 15;
    else if (energy > 0.005) confidence += 10;
    else if (energy > 0.001) confidence += 5;

    if (spectralFeatures.centroid > 100 && spectralFeatures.centroid < 4000) {
      confidence += 5;
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

  simpleHash(str) {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash;
    }
    return Math.abs(hash).toString(16);
  }
*/

export default function VoiceRecorder() {
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
        } catch (analysisError) {
          console.error('Analysis error:', analysisError);
          setError('Failed to analyze voice: ' + analysisError.message);
          setRecordingState('error');
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
    <div className="bg-white rounded-lg shadow-lg p-6">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-semibold text-gray-800">🎤 Voice Recorder</h2>
        {recordingState !== 'idle' && (
          <button
            onClick={resetRecording}
            className="px-4 py-2 text-sm bg-gray-500 hover:bg-gray-600 text-white rounded-lg transition-colors"
          >
            Reset
          </button>
        )}
      </div>

      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
          <p className="text-red-700 text-sm">⚠️ {error}</p>
        </div>
      )}

      <div className="text-center mb-6">
        {recordingState === 'idle' && (
          <button
            onClick={startRecording}
            className="px-8 py-4 bg-green-600 hover:bg-green-700 text-white rounded-lg font-medium transition-all transform hover:scale-105"
          >
            🎤 Start Recording
          </button>
        )}

        {recordingState === 'initializing' && (
          <div className="px-8 py-4 bg-blue-500 text-white rounded-lg font-medium">
            🔄 Initializing microphone...
          </div>
        )}

        {recordingState === 'recording' && (
          <div className="space-y-4">
            <button
              onClick={stopRecording}
              className="px-8 py-4 bg-red-500 hover:bg-red-600 text-white rounded-lg font-medium animate-pulse"
            >
              🔴 Stop Recording ({duration.toFixed(1)}s)
            </button>

            <div className="flex items-center justify-center space-x-2">
              <span className="text-sm text-gray-600">Volume:</span>
              <div className="w-32 h-2 bg-gray-200 rounded-full overflow-hidden">
                <div
                  className="h-full bg-green-500 transition-all duration-100"
                  style={{ width: `${Math.min(100, (volumeLevel / 128) * 100)}%` }}
                />
              </div>
              <span className="text-sm text-gray-600">{Math.round(volumeLevel)}</span>
            </div>
          </div>
        )}

        {recordingState === 'processing' && (
          <div className="px-8 py-4 bg-yellow-500 text-white rounded-lg font-medium">
            🔍 Analyzing voice patterns...
          </div>
        )}
      </div>

      {audioData && (
        <div className="grid md:grid-cols-2 gap-6">
          {/* Recording Info */}
          <div className="bg-gray-50 rounded-lg p-4">
            <h3 className="font-semibold text-gray-800 mb-3">📊 Recording Analysis</h3>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span>Duration:</span>
                <span className="font-mono">{audioData.duration.toFixed(1)}s</span>
              </div>
              <div className="flex justify-between">
                <span>File Size:</span>
                <span className="font-mono">{(audioData.size / 1024).toFixed(1)}KB</span>
              </div>
              <div className="flex justify-between">
                <span>Sample Rate:</span>
                <span className="font-mono">{audioData.sampleRate}Hz</span>
              </div>
              <div className="flex justify-between">
                <span>Audio Samples:</span>
                <span className="font-mono">{(audioData.duration * audioData.sampleRate).toLocaleString()}</span>
              </div>
            </div>
          </div>

          {/* Voice Fingerprint */}
          {voiceAnalysis && (
            <div className="bg-gray-50 rounded-lg p-4">
              <h3 className="font-semibold text-gray-800 mb-3">🎯 Voice Fingerprint</h3>
              <div className="space-y-3">
                <div className="text-center">
                  <div className="text-2xl font-mono font-bold text-blue-600 mb-1">
                    {voiceAnalysis.fingerprint}
                  </div>
                  <div className="text-sm text-gray-600">Unique Voice ID</div>
                </div>

                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div>
                    <span className="text-gray-600">Voice Type:</span>
                    <div className={`font-semibold ${getVoiceTypeColor(voiceAnalysis.voiceType)}`}>
                      {voiceAnalysis.voiceType}
                    </div>
                  </div>
                  <div>
                    <span className="text-gray-600">Quality:</span>
                    <div className="font-semibold text-gray-800">{voiceAnalysis.quality}</div>
                  </div>
                  <div>
                    <span className="text-gray-600">Pitch:</span>
                    <div className="font-mono text-gray-800">{voiceAnalysis.pitch}Hz</div>
                  </div>
                  <div>
                    <span className="text-gray-600">Confidence:</span>
                    <div className={`font-bold ${getConfidenceColor(voiceAnalysis.confidence)}`}>
                      {voiceAnalysis.confidence}%
                    </div>
                  </div>
                  <div>
                    <span className="text-gray-600">Energy:</span>
                    <div className="font-mono text-gray-800">{voiceAnalysis.energy}</div>
                  </div>
                  <div>
                    <span className="text-gray-600">Pitch Range:</span>
                    <div className="font-mono text-gray-800 text-xs">{voiceAnalysis.pitchRange}</div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {recordingState === 'completed' && voiceAnalysis && (
        <div className="mt-4 p-3 bg-green-50 border border-green-200 rounded-lg">
          <p className="text-green-700 text-sm">
            ✅ Voice captured and analyzed successfully!
            {voiceAnalysis.confidence >= 70 ? ' High-quality fingerprint generated.' : ' Consider recording in a quieter environment for better results.'}
          </p>
        </div>
      )}
    </div>
  );
}
