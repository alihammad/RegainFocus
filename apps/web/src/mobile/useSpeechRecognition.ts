import { useCallback, useEffect, useRef, useState } from 'react';

// Minimal typings for the Web Speech API, which isn't in every TypeScript lib.
interface SpeechResultList {
  length: number;
  [index: number]: { 0: { transcript: string } };
}
interface SpeechRecognitionLike {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  onresult: ((event: { results: SpeechResultList }) => void) | null;
  onerror: ((event: { error: string }) => void) | null;
  onend: (() => void) | null;
  start(): void;
  stop(): void;
  abort(): void;
}
type Ctor = new () => SpeechRecognitionLike;

function getCtor(): Ctor | null {
  const w = window as unknown as { SpeechRecognition?: Ctor; webkitSpeechRecognition?: Ctor };
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null;
}

export type VoiceError = 'blocked' | 'nothing-heard' | 'failed';

export interface Speech {
  supported: boolean;
  listening: boolean;
  transcript: string;
  error: VoiceError | null;
  start: () => void;
  /** Stop listening and throw the transcript away. */
  cancel: () => void;
}

export function useSpeechRecognition(): Speech {
  const [listening, setListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [error, setError] = useState<VoiceError | null>(null);
  const recognition = useRef<SpeechRecognitionLike | null>(null);

  const teardown = useCallback(() => {
    const r = recognition.current;
    recognition.current = null;
    if (r) {
      r.onresult = r.onerror = r.onend = null;
      try {
        r.abort();
      } catch {
        // Already stopped.
      }
    }
  }, []);

  useEffect(() => teardown, [teardown]);

  const start = useCallback(() => {
    const SR = getCtor();
    if (!SR) return;
    teardown();
    setTranscript('');
    setError(null);
    let r: SpeechRecognitionLike;
    try {
      r = new SR();
    } catch {
      setError('failed');
      return;
    }
    r.lang = navigator.language || 'en-AU';
    r.continuous = true;
    r.interimResults = true;
    r.onresult = (event) => {
      let text = '';
      for (let i = 0; i < event.results.length; i++) text += event.results[i]![0].transcript;
      setTranscript(text.trim());
    };
    r.onerror = (event) => {
      if (event.error === 'not-allowed' || event.error === 'service-not-allowed') {
        setError('blocked');
      } else if (event.error === 'no-speech') setError('nothing-heard');
      else if (event.error !== 'aborted') setError('failed');
    };
    r.onend = () => setListening(false);
    recognition.current = r;
    setListening(true);
    try {
      r.start();
    } catch {
      setListening(false);
      setError('failed');
    }
  }, [teardown]);

  const cancel = useCallback(() => {
    teardown();
    setListening(false);
    setTranscript('');
    setError(null);
  }, [teardown]);

  return { supported: getCtor() !== null, listening, transcript, error, start, cancel };
}
