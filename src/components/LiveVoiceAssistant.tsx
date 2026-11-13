import React, { useState, useEffect, useRef } from 'react';
import { Mic, MicOff, Volume2, Sparkles, X, Radio, AlertCircle } from 'lucide-react';

interface LiveVoiceAssistantProps {
  isOpen: boolean;
  onClose: () => void;
}

export const LiveVoiceAssistant: React.FC<LiveVoiceAssistantProps> = ({ isOpen, onClose }) => {
  const [isConnected, setIsConnected] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [transcripts, setTranscripts] = useState<{ sender: 'user' | 'model'; text: string }[]>([]);
  const [statusMessage, setStatusMessage] = useState('Klik "Mulai Bicara" untuk berbicara langsung dengan asisten teknisi.');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const wsRef = useRef<WebSocket | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const scriptProcessorRef = useRef<ScriptProcessorNode | null>(null);
  const playbackContextRef = useRef<AudioContext | null>(null);

  // Convert Float32Array to base64 encoded 16-bit PCM
  const floatTo16BitPCM = (input: Float32Array): string => {
    const buffer = new ArrayBuffer(input.length * 2);
    const view = new DataView(buffer);
    for (let i = 0; i < input.length; i++) {
      const s = Math.max(-1, Math.min(1, input[i]));
      view.setInt16(i * 2, s < 0 ? s * 0x8000 : s * 0x7fff, true);
    }
    const bytes = new Uint8Array(buffer);
    let binary = '';
    for (let i = 0; i < bytes.byteLength; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    return btoa(binary);
  };

  // Playback base64 PCM audio at 24kHz
  const playAudioChunk = (base64Audio: string) => {
    try {
      if (!playbackContextRef.current) {
        playbackContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({
          sampleRate: 24000,
        });
      }
      const ctx = playbackContextRef.current;
      const binaryString = atob(base64Audio);
      const len = binaryString.length;
      const bytes = new Uint8Array(len);
      for (let i = 0; i < len; i++) {
        bytes[i] = binaryString.charCodeAt(i);
      }
      const pcm16 = new Int16Array(bytes.buffer);
      const float32 = new Float32Array(pcm16.length);
      for (let i = 0; i < pcm16.length; i++) {
        float32[i] = pcm16[i] / 32768.0;
      }

      const audioBuffer = ctx.createBuffer(1, float32.length, 24000);
      audioBuffer.getChannelData(0).set(float32);
      const source = ctx.createBufferSource();
      source.buffer = audioBuffer;
      source.connect(ctx.destination);
      source.start();
    } catch (e) {
      console.error('Audio playback error:', e);
    }
  };

  // Start Voice Session
  const startSession = async () => {
    setErrorMsg(null);
    setStatusMessage('Menghubungkan ke Gemini Live API...');

    try {
      // Connect WebSocket
      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const wsUrl = `${protocol}//${window.location.host}/api/live`;
      const ws = new WebSocket(wsUrl);
      wsRef.current = ws;

      ws.onopen = async () => {
        setIsConnected(true);
        setStatusMessage('Terhubung. Menyiapkan mikrofon...');

        try {
          // Setup microphone stream at 16kHz
          const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
          mediaStreamRef.current = stream;

          audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({
            sampleRate: 16000,
          });

          const source = audioContextRef.current.createMediaStreamSource(stream);
          const processor = audioContextRef.current.createScriptProcessor(4096, 1, 1);
          scriptProcessorRef.current = processor;

          processor.onaudioprocess = (e) => {
            if (ws.readyState === WebSocket.OPEN) {
              const inputData = e.inputBuffer.getChannelData(0);
              const pcmBase64 = floatTo16BitPCM(inputData);
              ws.send(JSON.stringify({ audio: pcmBase64 }));
            }
          };

          source.connect(processor);
          processor.connect(audioContextRef.current.destination);

          setIsRecording(true);
          setStatusMessage('Mendengarkan... Silakan tanyakan masalah teknis motor listrik.');
        } catch (micErr: any) {
          setErrorMsg('Izin mikrofon diperlukan: ' + micErr.message);
          stopSession();
        }
      };

      ws.onmessage = (event) => {
        try {
          const msg = JSON.parse(event.data);
          if (msg.type === 'audio' && msg.audio) {
            playAudioChunk(msg.audio);
          }
          if (msg.type === 'text' && msg.text) {
            setTranscripts((prev) => [...prev, { sender: 'model', text: msg.text }]);
          }
          if (msg.type === 'error') {
            setErrorMsg(msg.error);
          }
        } catch (err) {
          console.error('Error handling WebSocket message:', err);
        }
      };

      ws.onerror = (e) => {
        setErrorMsg('Gagal terhubung ke WebSocket Live Voice.');
        setIsConnected(false);
      };

      ws.onclose = () => {
        setIsConnected(false);
        setIsRecording(false);
        setStatusMessage('Sesi suara selesai.');
      };
    } catch (err: any) {
      setErrorMsg(err.message || 'Gagal memulai Live API');
    }
  };

  // Stop Session
  const stopSession = () => {
    if (scriptProcessorRef.current) {
      scriptProcessorRef.current.disconnect();
      scriptProcessorRef.current = null;
    }
    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach((track) => track.stop());
      mediaStreamRef.current = null;
    }
    if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
      audioContextRef.current.close();
      audioContextRef.current = null;
    }
    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }
    setIsConnected(false);
    setIsRecording(false);
    setStatusMessage('Sesi suara dihentikan.');
  };

  useEffect(() => {
    if (!isOpen) {
      stopSession();
    }
    return () => {
      stopSession();
    };
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-lg text-white shadow-2xl overflow-hidden flex flex-col max-h-[85vh]">
        {/* Modal Header */}
        <div className="p-4 bg-slate-850 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-amber-500/20 border border-amber-500/30 flex items-center justify-center text-amber-400">
              <Radio className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold tracking-tight text-white flex items-center gap-2">
                <span>Asisten Suara Live Bengkel</span>
                <span className="text-[10px] bg-amber-500/20 text-amber-300 font-mono font-medium px-2 py-0.5 rounded border border-amber-500/30">
                  gemini-3.8-live
                </span>
              </h3>
              <p className="text-[11px] text-slate-400">Percakapan suara dua arah secara langsung (real-time voice streaming)</p>
            </div>
          </div>
          <button
            onClick={() => {
              stopSession();
              onClose();
            }}
            className="text-slate-400 hover:text-white p-1 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Visualizer & Mic Controls */}
        <div className="p-6 flex flex-col items-center justify-center bg-radial from-slate-800/60 to-slate-900 border-b border-slate-800 text-center space-y-4">
          <div className="relative">
            {isRecording && (
              <div className="absolute inset-0 rounded-full bg-amber-500/20 animate-ping"></div>
            )}
            <button
              onClick={isRecording ? stopSession : startSession}
              className={`w-20 h-20 rounded-full flex items-center justify-center shadow-lg transition-all ${
                isRecording
                  ? 'bg-rose-600 hover:bg-rose-500 text-white ring-4 ring-rose-500/30'
                  : 'bg-amber-500 hover:bg-amber-400 text-slate-950 ring-4 ring-amber-500/20'
              }`}
            >
              {isRecording ? <MicOff className="w-8 h-8" /> : <Mic className="w-8 h-8" />}
            </button>
          </div>

          <div>
            <p className="text-xs font-semibold text-slate-200">
              {isRecording ? 'Sedang Mendengarkan (Mic Aktif)' : 'Mikrofon Nonaktif'}
            </p>
            <p className="text-[11px] text-slate-400 mt-1 max-w-xs">{statusMessage}</p>
          </div>

          {errorMsg && (
            <div className="p-2.5 bg-rose-950/50 border border-rose-800/80 rounded-lg text-rose-300 text-xs flex items-center gap-1.5 max-w-md">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}
        </div>

        {/* Conversation Transcript Logs */}
        <div className="p-4 flex-1 overflow-y-auto space-y-3 min-h-[160px] text-xs">
          <div className="text-[10px] uppercase tracking-wider text-slate-500 font-bold">
            Transkrip Percakapan Suara Real-time:
          </div>

          {transcripts.length === 0 ? (
            <div className="text-slate-500 text-center py-6">
              Belum ada percakapan. Mulai bicara seperti: <br />
              <em className="text-amber-400/90">"Berapa ampere normal motor 30 kW fasa 380V saat start delta?"</em>
            </div>
          ) : (
            transcripts.map((t, idx) => (
              <div
                key={idx}
                className={`p-2.5 rounded-xl max-w-[85%] ${
                  t.sender === 'user'
                    ? 'ml-auto bg-amber-500/20 text-amber-200 border border-amber-500/30'
                    : 'mr-auto bg-slate-800 text-slate-200 border border-slate-700'
                }`}
              >
                <div className="text-[10px] text-slate-400 mb-0.5 font-semibold">
                  {t.sender === 'user' ? 'Anda (Suara)' : 'Asisten Gemini Live:'}
                </div>
                <div>{t.text}</div>
              </div>
            ))
          )}
        </div>

        {/* Modal Footer */}
        <div className="p-3 bg-slate-950 border-t border-slate-800 flex items-center justify-between text-[11px] text-slate-400">
          <span>Audio rate: 16kHz In / 24kHz Out</span>
          <button
            onClick={() => {
              stopSession();
              onClose();
            }}
            className="px-3 py-1 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-md font-medium"
          >
            Tutup
          </button>
        </div>
      </div>
    </div>
  );
};
