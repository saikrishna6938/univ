type Listener = (activeCount: number) => void;

const listeners = new Set<Listener>();
const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:6942';
let activeCount = 0;
let installed = false;

function notify() {
  listeners.forEach((listener) => listener(activeCount));
}

function beginRequest() {
  activeCount += 1;
  notify();
}

function endRequest() {
  activeCount = Math.max(0, activeCount - 1);
  notify();
}

function toRequestUrl(input: RequestInfo | URL): string {
  if (typeof input === 'string') return input;
  if (input instanceof URL) return input.toString();
  return input.url;
}

function shouldTrackRequest(input: RequestInfo | URL): boolean {
  const url = toRequestUrl(input);
  return url.startsWith(API_URL) || url.includes('/api/');
}

export function subscribeToApiProgress(listener: Listener) {
  listeners.add(listener);
  listener(activeCount);
  return () => {
    listeners.delete(listener);
  };
}

export function installApiProgressTracking() {
  if (installed || typeof window === 'undefined') return;

  const originalFetch = window.fetch.bind(window);

  window.fetch = async (input: RequestInfo | URL, init?: RequestInit) => {
    const trackRequest = shouldTrackRequest(input);
    if (trackRequest) beginRequest();

    try {
      return await originalFetch(input, init);
    } finally {
      if (trackRequest) endRequest();
    }
  };

  installed = true;
}
