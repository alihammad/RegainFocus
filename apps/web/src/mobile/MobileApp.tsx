import { useCallback, useEffect, useRef, useState } from 'react';
import { EmptyTitleError, type Source } from '@regain/core';
import { Toast } from '../components/Toast';
import { useData, useInbox } from '../data/DataProvider';
import { CaptureScreen, type Draft } from './CaptureScreen';
import { InboxScreen } from './InboxScreen';
import { TabBar, type Tab } from './TabBar';
import { VoiceSheet } from './VoiceSheet';
import { useSpeechRecognition } from './useSpeechRecognition';

const EMPTY_DRAFT: Draft = { text: '' };
const TOAST_MS = 5000;

export function MobileApp() {
  const { repo } = useData();
  const inbox = useInbox();
  const speech = useSpeechRecognition();
  const [tab, setTab] = useState<Tab>('capture');
  const [draft, setDraft] = useState<Draft>(EMPTY_DRAFT);
  const [savedId, setSavedId] = useState<string | null>(null);
  const [voiceOpen, setVoiceOpen] = useState(false);
  const [voiceNote, setVoiceNote] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const saving = useRef(false);

  useEffect(() => {
    if (!savedId) return;
    const timer = setTimeout(() => setSavedId(null), TOAST_MS);
    return () => clearTimeout(timer);
  }, [savedId]);

  const save = useCallback(
    async (title: string, source: Source) => {
      if (saving.current || !title.trim()) return;
      saving.current = true;
      try {
        const task = await repo.createCapture({
          title,
          source,
          ...(draft.when ? { when: draft.when } : {}),
          ...(draft.energy ? { energy: draft.energy } : {}),
        });
        setDraft(EMPTY_DRAFT);
        setError(null);
        setSavedId(task.id);
      } catch (e) {
        if (!(e instanceof EmptyTitleError)) {
          // The text stays in the box so nothing is lost.
          setError("Couldn't save on this phone. Your text is still here. Try again.");
        }
      } finally {
        saving.current = false;
      }
    },
    [repo, draft.when, draft.energy],
  );

  const undo = useCallback(async () => {
    if (!savedId) return;
    const removed = await repo.undoCapture(savedId);
    setSavedId(null);
    if (!removed) return;
    setDraft({
      text: removed.title,
      ...(removed.when === 'today' || removed.when === 'this_week' ? { when: removed.when } : {}),
      ...(removed.energy === 'quick' || removed.energy === 'deep'
        ? { energy: removed.energy }
        : {}),
    });
    setTab('capture');
  }, [repo, savedId]);

  const openVoice = useCallback(() => {
    if (!speech.supported) {
      setVoiceNote("Voice isn't available here. Tap the microphone on your keyboard to dictate.");
      document.getElementById('capture-text')?.focus();
      return;
    }
    setVoiceNote(null);
    setVoiceOpen(true);
    speech.start();
  }, [speech]);

  const closeVoice = useCallback(() => {
    speech.cancel();
    setVoiceOpen(false);
  }, [speech]);

  const saveVoice = useCallback(async () => {
    const text = speech.transcript;
    if (!text.trim()) return;
    speech.cancel();
    setVoiceOpen(false);
    await save(text, 'mobile_voice');
  }, [speech, save]);

  const count = inbox?.length ?? 0;

  return (
    <div className="m-app">
      <div className="m-body">
        <main className="m-scroll" inert={voiceOpen}>
          {tab === 'capture' ? (
            <CaptureScreen
              draft={draft}
              onDraft={setDraft}
              onSave={() => void save(draft.text, 'mobile_text')}
              onMic={openVoice}
              recent={(inbox ?? []).slice(0, 3)}
              count={count}
              freshId={savedId}
              error={error}
              note={voiceNote}
              onSeeAll={() => setTab('inbox')}
            />
          ) : (
            <InboxScreen tasks={inbox ?? []} freshId={savedId} />
          )}
        </main>
        {savedId && !voiceOpen && <Toast message="Saved to inbox" onUndo={() => void undo()} />}
      </div>
      <TabBar tab={tab} onTab={setTab} count={count} inert={voiceOpen} />
      {voiceOpen && (
        <VoiceSheet
          transcript={speech.transcript}
          error={speech.error}
          onCancel={closeVoice}
          onSave={() => void saveVoice()}
        />
      )}
    </div>
  );
}
