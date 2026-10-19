import { useEffect, useRef } from 'react';
import type { VoiceError } from './useSpeechRecognition';

const BARS = [14, 26, 40, 22, 34, 46, 30, 18, 38, 44, 24, 32, 16, 28];

const ERROR_TEXT: Record<VoiceError, string> = {
  blocked: 'The microphone is blocked. You can type instead.',
  'nothing-heard': "Didn't catch that. Try again.",
  failed: "Voice didn't work this time. You can type instead.",
};

interface Props {
  transcript: string;
  error: VoiceError | null;
  onCancel: () => void;
  onSave: () => void;
}

export function VoiceSheet({ transcript, error, onCancel, onSave }: Props) {
  const cancelRef = useRef<HTMLButtonElement>(null);
  const heard = transcript.length > 0;

  // The handler changes every render; a ref keeps the effect from re-running (and re-focusing)
  // each time a new word is heard.
  const onCancelRef = useRef(onCancel);
  onCancelRef.current = onCancel;

  useEffect(() => {
    cancelRef.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onCancelRef.current();
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, []);

  const status = error
    ? ERROR_TEXT[error]
    : heard
      ? 'Got it. Save, or cancel and try again.'
      : 'Listening';

  return (
    <div className="scrim">
      <div role="dialog" aria-modal="true" aria-label="Voice capture" className="voice-sheet">
        <p className="voice-status" role="status">
          <span className="voice-dot" aria-hidden="true" />
          <span>{status}</span>
        </p>
        <div className="waveform" aria-hidden="true">
          {BARS.map((h, i) => (
            <span
              key={i}
              className="wave-bar"
              style={{ height: h, animationDelay: `${i * 70}ms` }}
            />
          ))}
        </div>
        <p className={heard ? 'voice-heard' : 'voice-heard voice-heard-empty'}>
          {heard ? transcript : 'Speak now…'}
        </p>
        <div className="voice-actions">
          <button ref={cancelRef} type="button" className="btn-on-dark" onClick={onCancel}>
            Cancel
          </button>
          <button
            type="button"
            className="btn-primary voice-save"
            disabled={!heard}
            onClick={onSave}
          >
            Save to inbox
          </button>
        </div>
      </div>
    </div>
  );
}
