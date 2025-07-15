import React, { useState, useEffect, useRef } from 'react';

// Voice Capture Class (embedded for simplicity)
class VoiceCapture {
  constructor() {
    this.mediaRecorder = null;
    this.audioContext = null;
    this.analyser = null;
    this.isRecording = false;
    this.audioChunks = [];
    this.stream = null;
  }

  async initialize() {
    try {
      this.stream = await navigator.mediaDevices.getUserMedia({
        audio: { sampleRate: 16000, channelCount: 1, echoCancellation: false }
      });
      this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
      this.analyser = this.audioContext.createAnalyser();
      this.analyser.fftSize = 2048;
      const microphone = this.audioContext.createMediaStreamSource(this.stream);
      microphone.connect(this.analyser);
      return { success: true, message: 'Microphone ready' };
    } catch (error) {
      return { success: false, message: this.getErrorMessage(error) };
    }
  }

  async startRecording() {
    this.audioChunks = [];
    this.mediaRecorder = new MediaRecorder(this.stream);
    this.mediaRecorder.ondataavailable = (event) => {
      if (event.data.size > 0) this.audioChunks.push(event.data);
    };
    this.mediaRecorder.start(100);
    this.isRecording = true;
    return { success: true };
  }

  async stopRecording() {
    return new Promise((resolve) => {
      this.mediaRecorder.onstop = async () => {
        const audioBlob = new Blob(this.audioChunks, { type: 'audio/webm' });
        const arrayBuffer = await audioBlob.arrayBuffer();
        const audioBuffer = await this.audioContext.decodeAudioData(arrayBuffer);
        resolve({
          success: true, audioBlob, audioBuffer,
          duration: audioBuffer.duration,
          channelData: audioBuffer.getChannelData(0)
        });
      };
      this.mediaRecorder.stop();
      this.isRecording = false;
    });
  }

  getVolume() {
    if (!this.analyser) return 0;
    const dataArray = new Uint8Array(this.analyser.frequencyBinCount);
    this.analyser.getByteFrequencyData(dataArray);
    const sum = dataArray.reduce((acc, val) => acc + val, 0);
    return sum / dataArray.length / 255;
  }

  getErrorMessage(error) {
    switch (error.name) {
      case 'NotAllowedError': return 'Microphone access denied';
      case 'NotFoundError': return 'No microphone found';
      default: return 'Recording error: ' + error.message;
    }
  }

  cleanup() {
    if (this.stream) this.stream.getTracks().forEach(track => track.stop());
    if (this.audioContext) this.audioContext.close();
  }
}

// Voice Fingerprinting Class (embedded)
class VoiceFingerprinting {
  async extractVoiceFingerprint(audioBuffer) {
    try {
      const audioData = audioBuffer.getChannelData(0);
      const features = {
        spectralCentroid: this.getSpectralCentroid(audioData),
        energy: audioData.reduce((s, x) => s + x*x, 0) / audioData.length,
        zeroCrossing: this.getZeroCrossing(audioData),
        pitch: this.getPitch(audioData),
        duration: audioBuffer.duration
      };
      const fingerprint = this.createHash(features);
      return {
        success: true, fingerprint, features,
        confidence: this.getConfidence(features)
      };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  getSpectralCentroid(data) {
    let sum = 0, weightedSum = 0;
    for (let i = 0; i < Math.min(data.length, 1024); i++) {
      const magnitude = Math.abs(data[i]);
      sum += magnitude;
      weightedSum += i * magnitude;
    }
    return sum > 0 ? weightedSum / sum : 0;
  }

  getZeroCrossing(data) {
    let crossings = 0;
    for (let i = 1; i < data.length; i++) {
      if ((data[i] >= 0) !== (data[i-1] >= 0)) crossings++;
    }
    return crossings / data.length;
  }

  getPitch(data) {
    // Simplified pitch detection
    const frame = data.slice(0, 2048);
    let maxCorr = 0, bestPeriod = 0;
    for (let period = 50; period < 400; period++) {
      let corr = 0;
      for (let i = 0; i < frame.length - period; i++) {
        corr += frame[i] * frame[i + period];
      }
      if (corr > maxCorr) { maxCorr = corr; bestPeriod = period; }
    }
    return bestPeriod > 0 ? 16000 / bestPeriod : 0;
  }

  createHash(features) {
    const vals = [
      Math.round(features.spectralCentroid),
      Math.round(features.energy * 10000),
      Math.round(features.zeroCrossing * 10000),
      Math.round(features.pitch)
    ];
    let hash = 0;
    const str = vals.join('-');
    for (let i = 0; i < str.length; i++) {
      hash = ((hash << 5) - hash) + str.charCodeAt(i);
      hash = hash & hash;
    }
    return Math.abs(hash).toString(16).padStart(8, '0');
  }

  getConfidence(features) {
    let conf = 0.5;
    if (features.duration > 3) conf += 0.2;
    if (features.energy > 0.01) conf += 0.2;
    if (features.pitch > 80) conf += 0.1;
    return Math.min(1, conf);
  }
}

export function VoiceRecorder({ onRecordingComplete, onError }) {
  const [state, setState] = useState('idle');
  const [error, setError] = useState(null);
  const [volume, setVolume] = useState(0);
  const [duration, setDuration] = useState(0);
  const [isProcessing, setIsProcessing] = useState(false);
  const voiceCaptureRef = useRef(null);
  const fingerprintingRef = useRef(null);
  const timerRef = useRef(null);
  const volumeRef = useRef(null);

  useEffect(() => {
    const init = async () => {
      setState('initializing');
      voiceCaptureRef.current = new VoiceCapture();
      fingerprintingRef.current = new VoiceFingerprinting();
      const result = await voiceCaptureRef.current.initialize();
      if (result.success) {
        setState('ready');
        setError(null);
      } else {
        setError(result.message);
        setState('error');
      }
    };
    init();
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      if (volumeRef.current) cancelAnimationFrame(volumeRef.current);
      voiceCaptureRef.current?.cleanup();
    };
  }, []);

  const updateVolume = () => {
    if (voiceCaptureRef.current && state === 'recording') {
      setVolume(voiceCaptureRef.current.getVolume());
      volumeRef.current = requestAnimationFrame(updateVolume);
    }
  };

  const startRecording = async () => {
    try {
      setState('recording');
      setDuration(0);
      setError(null);
      await voiceCaptureRef.current.startRecording();
      timerRef.current = setInterval(() => setDuration(d => d + 0.1), 100);
      updateVolume();
    } catch (err) {
      setError(err.message);
      setState('ready');
    }
  };

  const stopRecording = async () => {
    try {
      setState('processing');
      setIsProcessing(true);
      clearInterval(timerRef.current);
      cancelAnimationFrame(volumeRef.current);

      // Get recording result
      const recordingResult = await voiceCaptureRef.current.stopRecording();

      // Extract voice fingerprint
      const fingerprintResult = await fingerprintingRef.current.extractVoiceFingerprint(recordingResult.audioBuffer);

      // Combine results
      const combinedResult = {
        ...recordingResult,
        fingerprint: fingerprintResult
      };

      setState('ready');
      setVolume(0);
      setIsProcessing(false);
      onRecordingComplete?.(combinedResult);
    } catch (err) {
      setError(err.message);
      setState('ready');
      setIsProcessing(false);
    }
  };

  const getButtonConfig = () => {
    switch (state) {
      case 'initializing': return { text: '🔄 Initializing...', disabled: true, className: 'bg-gray-400' };
      case 'ready': return { text: '🎤 Start Recording', disabled: false, className: 'bg-green-600 hover:bg-green-700', onClick: startRecording };
      case 'recording': return { text: '🛑 Stop Recording', disabled: false, className: 'bg-red-600 hover:bg-red-700 animate-pulse', onClick: stopRecording };
      case 'processing': return { text: '🔍 Analyzing Voice...', disabled: true, className: 'bg-blue-400' };
      default: return { text: '❌ Error', disabled: true, className: 'bg-gray-400' };
    }
  };

  const buttonConfig = getButtonConfig();

  return (
    <div className="bg-white rounded-lg shadow-lg p-6">
      <h2 className="text-2xl font-semibold mb-6">🎤 Voice Recorder & Fingerprinting</h2>
      {error && (
        <div className="mb-4 p-3 bg-red-100 border border-red-300 rounded text-red-700">
          ❌ {error}
        </div>
      )}
      <div className="text-center space-y-4">
        <button
          onClick={buttonConfig.onClick}
          disabled={buttonConfig.disabled}
          className={`px-8 py-4 rounded-lg font-medium text-white transition-all ${buttonConfig.className}`}
        >
          {buttonConfig.text}
        </button>
        {state === 'recording' && (
          <div className="space-y-3">
            <p className="text-sm text-gray-600">Duration: {duration.toFixed(1)}s</p>
            <div className="w-full bg-gray-200 rounded-full h-3">
              <div
                className="bg-green-500 h-3 rounded-full transition-all duration-100"
                style={{ width: `${Math.min(volume * 100, 100)}` }}
              />
            </div>
            <p className="text-xs text-gray-500">Volume: {Math.round(volume * 100)}</p>
          </div>
        )}
        {isProcessing && (
          <div className="bg-blue-50 p-4 rounded-lg">
            <div className="text-sm text-blue-800 space-y-1">
              <p>🔍 Extracting voice features...</p>
              <p>📊 Analyzing spectral characteristics...</p>
              <p>🎯 Creating voice fingerprint...</p>
            </div>
          </div>
        )}
        <div className="text-sm text-gray-500">
          {state === 'ready' && 'Click to start recording and create voice fingerprint'}
          {state === 'recording' && 'Speak clearly - capturing voice patterns'}
          {state === 'processing' && 'Extracting unique voice characteristics...'}
        </div>
      </div>
    </div>
  );
}
