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
    console.log('Recording & Fingerprint completed:', recording);
    setLastRecording({
      // Recording data
      duration: recording.duration.toFixed(1),
      size: (recording.audioBlob.size / 1024).toFixed(1),
      sampleRate: recording.audioBuffer.sampleRate,
      samples: recording.channelData.length,
      // Fingerprint data
      fingerprint: recording.fingerprint
    });
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
            Step 2: Voice fingerprinting with MFCC analysis
          </p>
        </div>

        <div className="grid lg:grid-cols-3 gap-8 mb-8">
          {/* Voice Recorder */}
          <div className="lg:col-span-1">
            <VoiceRecorder
              onRecordingComplete={handleRecordingComplete}
              onError={(err) => console.error('Recording error:', err)}
            />
          </div>

          {/* Recording Analysis */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-lg shadow-lg p-6">
              <h2 className="text-2xl font-semibold mb-4">📊 Recording Analysis</h2>
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
                </div>
              ) : (
                <p className="text-gray-500 text-center py-8">
                  Record voice to see analysis
                </p>
              )}
            </div>
          </div>

          {/* Voice Fingerprint */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-lg shadow-lg p-6">
              <h2 className="text-2xl font-semibold mb-4">🔍 Voice Fingerprint</h2>
              {lastRecording?.fingerprint ? (
                <div className="space-y-4">
                  {lastRecording.fingerprint.success ? (
                    <div className="space-y-3">
                      <div className="bg-green-50 p-3 rounded">
                        <p className="text-green-800 font-medium text-center">
                          🎯 {lastRecording.fingerprint.fingerprint}
                        </p>
                        <p className="text-xs text-green-600 text-center mt-1">
                          Unique Voice ID
                        </p>
                      </div>
                      <div className="grid grid-cols-2 gap-2 text-sm">
                        <div>
                          <span className="text-gray-600">Pitch:</span>
                          <br /><span className="font-medium">{Math.round(lastRecording.fingerprint.features?.pitch || 0)}Hz</span>
                        </div>
                        <div>
                          <span className="text-gray-600">Energy:</span>
                          <br /><span className="font-medium">{(lastRecording.fingerprint.features?.energy || 0).toFixed(4)}</span>
                        </div>
                        <div>
                          <span className="text-gray-600">Brightness:</span>
                          <br /><span className="font-medium">{Math.round(lastRecording.fingerprint.features?.spectralCentroid || 0)}</span>
                        </div>
                        <div>
                          <span className="text-gray-600">Texture:</span>
                          <br /><span className="font-medium">{(lastRecording.fingerprint.features?.zeroCrossing || 0).toFixed(4)}</span>
                        </div>
                      </div>
                      <div className="bg-blue-50 p-3 rounded">
                        <p className="text-blue-800 text-sm text-center">
                          Confidence: {Math.round((lastRecording.fingerprint.confidence || 0) * 100)}
                        </p>
                      </div>
                    </div>
                  ) : (
                    <div className="bg-red-50 p-3 rounded text-red-700 text-sm">
                      ❌ Fingerprinting failed: {lastRecording.fingerprint.error}
                    </div>
                  )}
                </div>
              ) : (
                <p className="text-gray-500 text-center py-8">
                  Record voice to generate fingerprint
                </p>
              )}
            </div>
          </div>
        </div>

        {/* System Status */}
        <div className="bg-white rounded-lg shadow-lg p-6">
          <h2 className="text-2xl font-semibold mb-4">System Status</h2>
          <div className="grid md:grid-cols-4 gap-4">
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
              <div className="text-3xl mb-2">🔍</div>
              <h3 className="font-medium">Fingerprinting</h3>
              <p className="text-green-600 text-sm">Active</p>
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
