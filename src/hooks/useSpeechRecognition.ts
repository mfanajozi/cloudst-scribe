import { useCallback, useEffect, useRef, useState } from 'react';

/**
 * useSpeechRecognition
 *
 * Thin, robust wrapper around the browser's native Web Speech API.
 * - No backend: recognition runs entirely in the browser.
 * - Tuned for South African English (en-ZA).
 * - Continuous listening with auto-restart (Chrome drops the session
 *   after ~60s of silence — we transparently resume).
 * - Interim results are surfaced so text appears live while speaking.
 */

interface ISpeechRecognitionAlternativeLike {
  transcript: string;
}
interface ISpeechRecognitionResultLike {
  isFinal: boolean;
  length: number;
  [index: number]: ISpeechRecognitionAlternativeLike;
}
interface ISpeechRecognitionEventLike {
  resultIndex: number;
  results: {
    length: number;
    [index: number]: ISpeechRecognitionResultLike;
  };
}
interface ISpeechRecognitionErrorEventLike {
  error: string;
}
interface ISpeechRecognitionLike {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  start: () => void;
  stop: () => void;
  abort: () => void;
  onresult: ((event: ISpeechRecognitionEventLike) => void) | null;
  onerror: ((event: ISpeechRecognitionErrorEventLike) => void) | null;
  onend: (() => void) | null;
}

interface IWindow extends Window {
  SpeechRecognition?: new () => ISpeechRecognitionLike;
  webkitSpeechRecognition?: new () => ISpeechRecognitionLike;
}

interface UseSpeechRecognitionResult {
  isListening: boolean;
  transcript: string;
  interimTranscript: string;
  error: string | null;
  isSupported: boolean;
  /** True once the user has granted mic access (requested proactively on load). */
  micGranted: boolean;
  /** How many mic devices the browser can currently see (null = unknown). */
  micDeviceCount: number | null;
  startListening: () => void;
  stopListening: () => void;
  clearTranscript: () => void;
}

/** Error codes we translate into friendly, actionable copy. */
const FRIENDLY_ERRORS: Record<string, string> = {
  'not-allowed':
    'Microphone access is blocked for this site. To allow it: click the 🔒 (or ⓘ) icon in the address bar → Site settings → Microphone → Allow, then reload this page. Prefer the address-bar method over chrome://settings — it updates the exact permission this page holds.',
  'service-not-allowed':
    'Microphone access is blocked at the browser level. Open your browser settings (e.g. chrome://settings/content/microphone), make sure this site is not on the “Not allowed” list, set Microphone to “Ask before accessing” or “Allow”, then reload this page.',
  'audio-capture':
    'Your browser can’t see any microphone on this device — this block sits at the OS/driver level, below the browser’s own site permissions. Fix it on the system side: ① confirm a mic or headset is connected and not muted at the system level; ② Windows: Settings → Privacy & security → Microphone → allow access for apps and for your browser; ③ macOS: System Settings → Privacy & Security → Microphone → enable Chrome/Edge; ④ Linux: if your browser is a Flatpak/Snap install, grant it microphone access via Flatseal (or Snap permissions), or install the official .deb/.rpm build; ⑤ test at mictests.com in this same browser — if it also finds no mic, the block is OS-level; ⑥ then fully close and reopen the browser and reload Scribe.',
  network: 'Network hiccup — the speech engine needs an internet connection. Retrying…',
};

export const useSpeechRecognition = (): UseSpeechRecognitionResult => {
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [interimTranscript, setInterimTranscript] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isSupported, setIsSupported] = useState(true);
  const [micGranted, setMicGranted] = useState(false);
  const [micDeviceCount, setMicDeviceCount] = useState<number | null>(null);

  const recognitionRef = useRef<ISpeechRecognitionLike | null>(null);
  // Ref mirrors `isListening` so the `onend` handler never reads stale state.
  const listeningRef = useRef(false);
  const shouldListenRef = useRef(false);
  // Highest final-result index consumed in the current session. Chrome is
  // known to re-fire `onresult` with an already-delivered final (a quirk that
  // makes single words print twice) — anything at or below this watermark is
  // a repeat and is ignored. Reset whenever a fresh session starts.
  const finalWatermarkRef = useRef(-1);
  // Last final chunk appended + when — second line of defence for echoes that
  // arrive at a shifted index.
  const lastFinalRef = useRef<{ text: string; at: number }>({ text: '', at: 0 });

  /** How many mic devices does the browser actually see right now? */
  const refreshMicDevices = useCallback(() => {
    try {
      navigator.mediaDevices
        ?.enumerateDevices()
        .then((devices) =>
          setMicDeviceCount(devices.filter((d) => d.kind === 'audioinput').length)
        )
        .catch(() => setMicDeviceCount(null));
    } catch {
      setMicDeviceCount(null);
    }
  }, []);

  useEffect(() => {
    const win = window as unknown as IWindow;
    const SpeechRecognition = win.SpeechRecognition || win.webkitSpeechRecognition;

    if (!window.isSecureContext) {
      setIsSupported(false);
      setError(
        'Microphones only work on secure connections. Open Scribe via https:// or http://localhost — addresses like http://192.168.x.x or http://…local are blocked by the browser.'
      );
      return;
    }

    if (!SpeechRecognition) {
      setIsSupported(false);
      const ua = navigator.userAgent;
      const isFirefox = /firefox|seamonkey\//i.test(ua);
      const isIOS =
        /iPad|iPhone|iPod/.test(ua) || (/Macintosh/.test(ua) && navigator.maxTouchPoints > 1);
      if (isFirefox) {
        setError(
          'Firefox doesn’t implement the Web Speech API, so dictation can’t run here (mic recording tests will pass — that’s a different, older API). Open Scribe in Chrome, Edge or Brave instead. On Android: copy this link into Chrome’s address bar.'
        );
      } else if (isIOS) {
        setError(
          'iOS devices (iPhone/iPad) don’t support the Web Speech API in any mobile browser. Use an Android phone with Chrome, or a desktop Chrome, Edge or Brave.'
        );
      } else {
        setError(
          'Your browser doesn’t support the Web Speech API. Please use Google Chrome, Microsoft Edge or Brave.'
        );
      }
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = 'en-ZA'; // South African English

    recognition.onresult = (event: ISpeechRecognitionEventLike) => {
      let finalChunk = '';
      let interimChunk = '';

      for (let i = event.resultIndex; i < event.results.length; ++i) {
        const result = event.results[i];
        const text = result[0]?.transcript ?? '';
        if (result.isFinal) {
          if (i > finalWatermarkRef.current) {
            finalWatermarkRef.current = i;
            finalChunk += text;
          }
        } else {
          interimChunk += text;
        }
      }

      // Two-line echo defence:
      // ① Superseded finals — Chrome sometimes finalizes a fragment early
      //   ("let's"), keeps the same result alive, then re-fires it extended
      //   ("let's do this") at a new index. Appending both prints the prefix
      //   twice, so when the new final starts with the previous one, only the
      //   delta is appended.
      // ② Straight echoes — an identical final re-delivered within 400ms is
      //   dropped outright.
      if (finalChunk) {
        const fullText = finalChunk.trim();
        const normPrev = lastFinalRef.current.text.toLowerCase();
        const normFull = fullText.toLowerCase();

        let chunkToAppend = fullText;
        if (normPrev && normFull.startsWith(normPrev) && normFull.length > normPrev.length) {
          chunkToAppend = fullText.slice(lastFinalRef.current.text.length).trim();
        }

        const now = Date.now();
        if (normFull === normPrev && now - lastFinalRef.current.at < 400) {
          chunkToAppend = '';
        }
        lastFinalRef.current = {
          text: normFull === normPrev ? lastFinalRef.current.text : fullText,
          at: now,
        };

        if (chunkToAppend) {
          setTranscript((prev) => {
            // Smart spacing between flushed phrases
            const needsSpace = prev.length > 0 && !/\s$/.test(prev);
            return prev + (needsSpace ? ' ' : '') + chunkToAppend;
          });
        }
      }
      setInterimTranscript(interimChunk);
    };

    recognition.onerror = (event: ISpeechRecognitionErrorEventLike) => {
      // 'no-speech' and 'aborted' are routine while continuously listening —
      // the restart handled by `onend` covers them. 'network' gets an
      // automatic restart too, so we only surface it in the console.
      if (event.error === 'no-speech' || event.error === 'aborted' || event.error === 'network') {
        return;
      }
      setError(FRIENDLY_ERRORS[event.error] ?? `Speech recognition error: ${event.error}`);
      if (event.error === 'not-allowed' || event.error === 'service-not-allowed') {
        shouldListenRef.current = false;
        listeningRef.current = false;
        setIsListening(false);
      }
    };

    // Auto-restart if the browser drops the connection (~60s of silence in Chrome)
    recognition.onend = () => {
      setInterimTranscript('');
      if (shouldListenRef.current && recognitionRef.current) {
        try {
          // New session → Chrome resets its result indices, so our watermark
          // must reset with them.
          finalWatermarkRef.current = -1;
          recognitionRef.current.start();
          return;
        } catch {
          // start() can throw if called too quickly — fall through
        }
      }
      listeningRef.current = false;
      setIsListening(false);
    };

    recognitionRef.current = recognition;

    // Live diagnostics: track the mic devices the browser can see — count and
    // refresh whenever the user plugs/unplugs hardware.
    refreshMicDevices();
    const mediaDevices = navigator.mediaDevices;
    mediaDevices?.addEventListener?.('devicechange', refreshMicDevices);

    // Proactively request mic access on page load. Plain `recognition.start()`
    // would only trigger the permission prompt after the user taps Start —
    // asking up-front means the session is ready the moment they do.
    if (navigator.mediaDevices?.getUserMedia) {
      navigator.mediaDevices
        .getUserMedia({ audio: true })
        .then((stream) => {
          // Release immediately — Scribe never records or stores anything;
          // the track is only opened to surface the permission prompt.
          stream.getTracks().forEach((track) => track.stop());
          setMicGranted(true);
          // Labels only become readable after permission — recount now.
          refreshMicDevices();
        })
        .catch((e) => {
          // A remembered "Block" denies instantly without prompting — surface
          // the unblock steps so the user isn't left guessing.
          if (e instanceof DOMException) {
            if (e.name === 'NotAllowedError' || e.name === 'SecurityError') {
              setError(FRIENDLY_ERRORS['not-allowed']);
              return;
            }
            if (e.name === 'NotFoundError' || e.name === 'DevicesNotFoundError') {
              setError(FRIENDLY_ERRORS['audio-capture']);
              return;
            }
          }
          console.error('Mic permission request failed', e);
        });
    }

    return () => {
      mediaDevices?.removeEventListener?.('devicechange', refreshMicDevices);
      shouldListenRef.current = false;
      try {
        recognition.abort();
      } catch {
        /* no-op */
      }
    };
  }, [refreshMicDevices]);

  const startListening = useCallback(async () => {
    setError(null);
    setInterimTranscript('');
    if (!recognitionRef.current) return;

    // Preflight: explicitly acquire a mic track first. This triggers the
    // browser's real permission prompt (the Web Speech API can fail with
    // `not-allowed` without ever showing one) and gives clearer errors.
    if (navigator.mediaDevices?.getUserMedia) {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        stream.getTracks().forEach((track) => track.stop());
      } catch (e) {
        if (e instanceof DOMException) {
          if (e.name === 'NotAllowedError' || e.name === 'SecurityError') {
            setError(FRIENDLY_ERRORS['not-allowed']);
            return;
          }
          if (e.name === 'NotFoundError' || e.name === 'DevicesNotFoundError') {
            setError(FRIENDLY_ERRORS['audio-capture']);
            return;
          }
        }
        // Non-fatal — let the recognition session make the final call
        console.error('Mic preflight failed', e);
      }
    }

    try {
      finalWatermarkRef.current = -1; // fresh session, fresh result indices
      recognitionRef.current.start();
      shouldListenRef.current = true;
      listeningRef.current = true;
      setIsListening(true);
    } catch (e) {
      // start() throws if the session is already active — treat as listening
      console.error(e);
      shouldListenRef.current = true;
      setIsListening(true);
    }
  }, []);

  const stopListening = useCallback(() => {
    shouldListenRef.current = false;
    listeningRef.current = false;
    setIsListening(false);
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch {
        /* no-op */
      }
    }
  }, []);

  const clearTranscript = useCallback(() => {
    setTranscript('');
    setInterimTranscript('');
  }, []);

  return {
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
  };
};
