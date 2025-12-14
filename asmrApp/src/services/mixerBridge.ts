let stopAllFn: null | (() => Promise<void>) = null;

export function registerStopAll(fn: null | (() => Promise<void>)) {
  stopAllFn = fn;
}

export async function stopMixerSounds() {
  if (!stopAllFn) return;
  await stopAllFn();
}
