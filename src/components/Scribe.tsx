import { useState } from 'react';
import { useSpeechRecognition } from '../hooks/useSpeechRecognition';
import { ThemeToggle } from './ThemeToggle';

const uid = 'scribe-dictation';

export const Scribe: React.FC = () => {
  const {
    isListening,
    transcript,
    interimTranscript,
    error,
    isSupported,
    micGranted,
    micDeviceCount,
    startListening,
    stopListening,
    clearTranscript,
  } = useSpeechRecognition();
  const [copied, setCopied] = useState(false);

  const hasText = transcript.length > 0;

  const handleCopy = async () => {
    if (!transcript) return;
    try {
      await navigator.clipboard.writeText(transcript);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy text: ', err);
    }
  };

  // Stop mid-sentence loses a few words — a single tap on the big mic is
  // deliberate, while the small header stop is a quick gesture.
  const handleMic = () => {
    if (isListening) stopListening();
    else startListening();
  };

  return (
    <div className="app-backdrop flex min-h-dvh flex-col sm:items-center sm:justify-center sm:p-8">
      <div className="mx-auto flex w-full max-w-3xl flex-1 flex-col sm:flex-none sm:flex-col sm:rounded-2xl sm:border sm:border-slate-200/70 sm:bg-white sm:shadow-xl sm:shadow-slate-200/50 sm:overflow-hidden dark:sm:border-ink-800 dark:sm:bg-ink-900 dark:sm:shadow-black/30">
        {/* Header */}
        <div className="flex items-center justify-between gap-3 border-b border-slate-100 px-4 pb-3 pt-[max(1rem,env(safe-area-inset-top))] sm:px-6 sm:py-5 dark:border-ink-800">
          <div className="flex items-center gap-3">
            <img
              src="/logo.png"
              alt="CloudST — AI Automation & Agents for Real Estate"
              className="h-8 w-auto select-none sm:h-9 dark:rounded-lg dark:bg-white dark:px-2.5 dark:py-1.5"
              draggable={false}
            />
          </div>

          <div className="flex items-center gap-2">
            <div className="hidden items-center gap-2 rounded-full border border-slate-200 bg-slate-50 px-3 py-1.5 sm:flex dark:border-ink-800 dark:bg-ink-950/60">
              <span
                aria-hidden
                className={`h-2 w-2 rounded-full ${
                  isListening ? 'animate-pulse bg-red-500' : 'bg-slate-300 dark:bg-ink-700'
                }`}
              />
              <span className="text-xs font-medium text-slate-600 dark:text-slate-400">
                {error ? 'Error' : isListening ? 'Listening…' : 'Idle'}
              </span>
            </div>
            <ThemeToggle />
          </div>
        </div>

        {/* Live status strip (mobile) + interim preview */}
        {isListening && (
          <div className="flex items-center gap-2.5 border-b border-slate-100 bg-red-50/60 px-4 py-2 sm:px-6 dark:border-ink-800 dark:bg-red-500/5">
            <span aria-hidden className="h-2 w-2 shrink-0 animate-pulse rounded-full bg-red-500" />
            <span className="text-xs font-medium text-red-600 dark:text-red-400">
              Listening — speak naturally
            </span>
            {interimTranscript && (
              <span className="ml-auto hidden max-w-[60%] truncate text-xs italic text-slate-400 sm:block dark:text-slate-500">
                {interimTranscript}
              </span>
            )}
          </div>
        )}

        {/* Text area */}
        <div className="flex-1 px-4 py-4 sm:px-6 sm:py-6">
          <textarea
            id={uid}
            value={hasText || interimTranscript ? `${transcript}${interimTranscript ? (hasText ? ' ' : '') + interimTranscript : ''}` : ''}
            readOnly
            placeholder={
              isSupported
                ? 'Tap “Start Dictating” and speak. Your words appear here — like Levies, FICA, OTP and suspensive conditions, understood.'
                : 'Speech recognition is not available in this browser.'
            }
            aria-label="Dictated text"
            className="h-[52vh] w-full resize-none rounded-xl border border-slate-200 bg-slate-50 p-4 text-lg leading-relaxed text-black transition-all placeholder:text-slate-400 sm:h-80 dark:border-ink-800 dark:bg-ink-950/70 dark:text-white dark:placeholder:text-slate-500"
          />

          {error && (
            <p className="mt-3 rounded-lg border border-red-100 bg-red-50 p-3 text-sm leading-relaxed text-red-600 dark:border-red-500/20 dark:bg-red-500/10 dark:text-red-400">
              ⚠️ {error}
            </p>
          )}

          {error && micDeviceCount !== null && (
            <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">
              <span className="font-mono">browser diagnostics — mics visible: {micDeviceCount}</span>
              {micDeviceCount === 0 &&
                ' (0 = the OS is hiding the mic from the browser entirely, not a site-permission issue)'}
            </p>
          )}

          {!error && isSupported && (
            <p className="mt-3 flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-slate-500 dark:text-slate-400">
              <span
                aria-hidden
                className={`h-1.5 w-1.5 shrink-0 rounded-full ${
                  micGranted
                    ? 'bg-emerald-500'
                    : 'animate-pulse bg-amber-400'
                }`}
              />
              <span className="font-medium text-slate-700 dark:text-slate-300">
                Tuned for en-ZA
              </span>
              — local phrasing and property terminology come through cleanly.
              {micGranted && (
                <span className="text-emerald-600 dark:text-emerald-400">
                  Microphone granted and ready.
                </span>
              )}
            </p>
          )}
        </div>

        {/* Controls — sticky bottom bar on mobile for thumb reach */}
        <div className="sticky bottom-0 z-10 flex items-center gap-3 border-t border-slate-100 bg-white/90 px-4 pb-[max(1rem,env(safe-area-inset-bottom))] pt-3 backdrop-blur sm:static sm:items-center sm:justify-between sm:gap-3 sm:bg-slate-50/80 sm:px-6 sm:py-5 dark:border-ink-800 dark:bg-ink-900/90 sm:dark:bg-ink-950/60">
          <button
            type="button"
            onClick={handleMic}
            disabled={!isSupported}
            className={`flex min-h-12 flex-1 items-center justify-center gap-2.5 rounded-xl px-5 py-3 text-base font-semibold text-white shadow-md transition-all active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50 sm:flex-initial sm:text-sm ${
              isListening
                ? 'bg-red-500 shadow-red-200 hover:bg-red-600 dark:shadow-none'
                : 'bg-brand-500 shadow-brand-200/70 hover:bg-brand-600 dark:shadow-none'
            }`}
          >
            {isListening ? (
              <>
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="18"
                  height="18"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  aria-hidden
                >
                  <rect x="6" y="6" width="12" height="12" rx="1" />
                </svg>
                Stop Listening
              </>
            ) : (
              <>
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="18"
                  height="18"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  aria-hidden
                >
                  <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z" />
                  <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
                  <line x1="12" y1="19" x2="12" y2="23" />
                  <line x1="8" y1="23" x2="16" y2="23" />
                </svg>
                Start Dictating
              </>
            )}
          </button>

          <button
            type="button"
            onClick={handleCopy}
            disabled={!transcript}
            className="flex min-h-12 flex-1 items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-5 py-3 text-base font-semibold text-ink-800 transition-all active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50 sm:flex-initial sm:text-sm dark:border-ink-700 dark:bg-ink-800 dark:text-slate-100"
          >
            {copied ? (
              <>
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="18"
                  height="18"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="text-emerald-600 dark:text-emerald-400"
                  aria-hidden
                >
                  <polyline points="20 6 9 17 4 12" />
                </svg>
                <span className="text-emerald-600 dark:text-emerald-400">Copied!</span>
              </>
            ) : (
              <>
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="18"
                  height="18"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  aria-hidden
                >
                  <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
                  <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
                </svg>
                Copy Text
              </>
            )}
          </button>

          <button
            type="button"
            onClick={clearTranscript}
            disabled={!transcript}
            className="min-h-12 min-w-12 rounded-xl px-3 text-sm font-medium text-slate-500 transition-colors hover:text-red-600 disabled:cursor-not-allowed disabled:opacity-40 dark:text-slate-400 dark:hover:text-red-400 sm:min-w-0 sm:px-4"
          >
            Clear
          </button>
        </div>
      </div>

      {/* Privacy footnote */}
      <p className="mx-auto mt-5 max-w-md px-6 pb-[max(1.25rem,env(safe-area-inset-bottom))] text-center text-xs leading-relaxed text-slate-400 sm:mt-6 sm:px-0 sm:pb-0 dark:text-slate-500">
        Powered by your browser's native Web Speech API. Audio is processed in your browser and never
        stored on any server — close the tab and it's gone.
      </p>
    </div>
  );
};
