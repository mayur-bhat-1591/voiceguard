// Voice Capture Engine - Real microphone recording
export class VoiceCapture {
  constructor() {
    this.mediaRecorder = null;
    this.audioContext = null;
    this.analyser = null;
    this.isRecording = false;
    this.audioChunks = [];
    this.stream = null;
    this.sampleRate = 16000;
  }

  async initialize() {
    try {
      this.stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          sampleRate: this.sampleRate,
          channelCount: 1,
          echoCancellation: false,
          noiseSuppression: false
        }
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
          success: true,
          audioBlob,
          audioBuffer,
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
    if (this.stream) {
      this.stream.getTracks().forEach(track => track.stop());
    }
    if (this.audioContext) this.audioContext.close();
  }
}
