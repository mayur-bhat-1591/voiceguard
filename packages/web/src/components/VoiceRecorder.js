import React, { useState, useEffect, useRef } from 'react';
import { VoiceCapture } from '../../../voice-engine/src/VoiceCapture.js';

export function VoiceRecorder({ onRecordingComplete, onError }) {
  const [state, setState] = useState('idle');
  const [error, setError] = useState(null);
  const [volume, setVolume] = useState(0);
  const [duration, setDuration] = useState(0);
  const voiceCaptureRef = useRef(null);
  const timerRef = useRef(null);

  useEffect(() => {
    const init = async () => {
      setState('initializing');
      voiceCaptureRef.current = new VoiceCapture();
      const result = await voiceCaptureRef.current.initialize();
      if (result.success) {
        setState('ready');
      } else {
        setError(result.message);
        setState('error');
      }
    };
    init();
    return () => voiceCaptureRef.current?.cleanup();
  }, []);

  const startRecording = async () => {
    setState('recording');
    setDuration(0);
    await voiceCaptureRef.current.startRecording();
    timerRef.current = setInterval(() => setDuration(d => d + 0.1), 100);
  };

  const stopRecording = async () => {
    setState('processing');
    clearInterval(timerRef.current);
    const result = await voiceCaptureRef.current.stopRecording();
    setState('ready');
    onRecordingComplete?.(result);
  };

  const getButtonConfig = () => {
    switch (state) {
      case 'initializing': return { text: '🔄 Initializing...', disabled: true, className: 'bg-gray-400' };
      case 'ready': return { text: '🎤 Start Recording', disabled: false, className: 'bg-green-600 hover:bg-green-700', onClick: startRecording };
      case 'recording': return { text: '🛑 Stop Recording', disabled: false, className: 'bg-red-600 hover:bg-red-700 animate-pulse', onClick: stopRecording };
      case 'processing': return { text: '⏳ Processing...', disabled: true, className: 'bg-blue-400' };
      default: return { text: '❌ Error', disabled: true, className: 'bg-gray-400' };
    }
  };

  const buttonConfig = getButtonConfig();

  return (
    <div className="bg-white rounded-lg shadow-lg p-6">
      <h2 className="text-2xl font-semibold mb-6">🎤 Voice Recorder</h2>
      {error && (
        <div className="mb-4 p-3 bg-red-100 border border-red-300 rounded text-red-700">
          ❌ {error}
        </div>
      )}
      <div className="text-center space-y-4">
        <button
          onClick={buttonConfig.onClick}
          disabled={buttonConfig.disabled}
          className={`px-8 py-4 rounded-lg font-medium text-white ${buttonConfig.className}`}
        >
          {buttonConfig.text}
        </button>
        {state === 'recording' && (
          <div className="space-y-2">
            <p className="text-sm text-gray-600">Duration: {duration.toFixed(1)}s</p>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div className="bg-green-500 h-2 rounded-full transition-all" style={{ width: `${Math.min(volume * 100, 100)}` }} />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
