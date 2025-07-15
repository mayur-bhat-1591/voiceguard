import { useState } from 'react';
import { VoiceRecorder } from '../components/VoiceRecorder';

export default function Home() {
  const [lastRecording, setLastRecording] = useState(null);
  const [apiStatus, setApiStatus] = useState('Checking...');

  const testAPI = async () => {
    try {
      const response = await fetch('http://localhost:8000/');
      const data = await response.json();
      setApiStatus(data.message);
    } catch (error) {
      setApiStatus('API Disconnected');
    }
  };

  const handleRecordingComplete = (recording) => {
    console.log('Recording completed:', recording);
    setLastRecording({
      duration: recording.duration.toFixed(1),
      size: (recording.audioBlob.size / 1024).toFixed(1),
      sampleRate: recording.audioBuffer.sampleRate,
      samples: recording.channelData.length
    });
  };

  const handleRecordingError = (error) => {
    console.error('Recording error:', error);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-8">
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-8">
          <h1 className="text-5xl font-bold text-gray-900 mb-4">
            🎤 VoiceGuard
          </h1>
          <p className="text-xl text-gray-600 mb-2">
            Voice ownership infrastructure for the AI age
          </p>
          <p className="text-sm text-gray-500">
            Step 1: Real voice capture with Web Audio API
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-8 mb-8">
          {/* Voice Recorder */}
          <VoiceRecorder
            onRecordingComplete={handleRecordingComplete}
            onError={handleRecordingError}
          />

          {/* Recording Info */}
          <div className="bg-white rounded-lg shadow-lg p-6">
            <h2 className="text-2xl font-semibold mb-4">Recording Analysis</h2>
            {lastRecording ? (
              <div className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-gray-600">Duration:</span>
                  <span className="font-medium">{lastRecording.duration}s</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">File Size:</span>
                  <span className="font-medium">{lastRecording.size}KB</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Sample Rate:</span>
                  <span className="font-medium">{lastRecording.sampleRate}Hz</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Audio Samples:</span>
                  <span className="font-medium">{lastRecording.samples.toLocaleString()}</span>
                </div>
                <div className="mt-4 p-3 bg-green-100 rounded">
                  <p className="text-green-800 text-sm">✅ Voice captured successfully!</p>
                </div>
              </div>
            ) : (
              <p className="text-gray-500 text-center py-8">
                Record your voice to see analysis
              </p>
            )}
          </div>
        </div>

        {/* API Status */}
        <div className="bg-white rounded-lg shadow-lg p-6">
          <h2 className="text-2xl font-semibold mb-4">System Status</h2>
          <div className="grid md:grid-cols-3 gap-4">
            <div className="text-center">
              <div className="text-3xl mb-2">✅</div>
              <h3 className="font-medium">Frontend</h3>
              <p className="text-green-600 text-sm">Running</p>
            </div>
            <div className="text-center">
              <div className="text-3xl mb-2">🎤</div>
              <h3 className="font-medium">Voice Capture</h3>
              <p className="text-green-600 text-sm">Ready</p>
            </div>
            <div className="text-center">
              <div className="text-3xl mb-2">🔗</div>
              <h3 className="font-medium">Backend API</h3>
              <p className="text-blue-600 text-sm">{apiStatus}</p>
              <button onClick={testAPI} className="mt-2 px-3 py-1 bg-blue-100 text-blue-700 rounded text-xs">
                Test
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
