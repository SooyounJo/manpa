export function isIOSDevice() {
  if (typeof navigator === 'undefined') return false;
  try {
    const ua = navigator.userAgent || '';
    const platform = navigator.platform || '';
    const maxTP = navigator.maxTouchPoints || 0;
    const iOSUA = /iPad|iPhone|iPod/i.test(ua);
    const iPadOS13Plus = platform === 'MacIntel' && maxTP > 1;
    return iOSUA || iPadOS13Plus;
  } catch {
    return false;
  }
}


