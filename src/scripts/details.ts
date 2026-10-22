/** Small detail entrances and interruptible counter updates. */
export function createDetailMotion(root: HTMLElement): {
  reveal(): void;
  setCounter(value: number, total: number, animate?: boolean): void;
  hide(): void;
  destroy(): void;
} {
  const page = root.querySelector<HTMLElement>('#detail-page');
  const counter = root.querySelector<HTMLElement>('#detail-counter');
  const originalLive = counter?.getAttribute('aria-live') ?? null;
  const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
  const entrances = new Set<Animation>();
  const textGroups = new Map<HTMLElement, { text: string; visual: HTMLElement; readable: HTMLElement }>();
  let visible = false;
  let destroyed = false;
  let counterGeneration = 0;
  let rolling: Animation[] = [];
  let pending: { value: number; total: number } | null = null;
  let latest: { value: number; total: number } | null = null;
  let current: number | null = null;
  let currentTotal = 1;
  let rows: number[] = [];
  let tracks: HTMLElement[] = [];
  let visualCounter: HTMLElement | null = null;
  let readableCounter: HTMLElement | null = null;
  let totalLabel: HTMLElement | null = null;

  const pad = (value: number, total: number) => String(value).padStart(Math.max(2, String(total).length), '0');
  const power1Out = (progress: number) => 1 - (1 - progress) ** 2;
  const power2Out = (progress: number) => 1 - (1 - progress) ** 3;
  const power3InOut = (progress: number) => progress < .5 ? 8 * progress ** 4 : 1 - (-2 * progress + 2) ** 4 / 2;
  const trackPosition = (row: number) => `translateY(${-100 * row / 30}%)`;

  function sampledFrames(make: (progress: number) => Keyframe, ease: (progress: number) => number): Keyframe[] {
    return Array.from({ length: 61 }, (_, index) => ({ ...make(ease(index / 60)), offset: index / 60 }));
  }

  function entrance(element: HTMLElement, keyframes: Keyframe[], delay: number) {
    if (typeof element.animate !== 'function') return;
    const animation = element.animate(keyframes, { duration: 320, delay, easing: 'linear', fill: 'both' });
    entrances.add(animation);
    void animation.finished.then(() => {
      entrances.delete(animation);
      animation.cancel();
    }, () => entrances.delete(animation));
  }

  function clearEntrances() {
    for (const animation of entrances) animation.cancel();
    entrances.clear();
    for (const [element, group] of textGroups) {
      // Parent navigation may already have replaced the title with the next item's text.
      if (group.visual.parentElement === element && group.readable.parentElement === element) element.replaceChildren(document.createTextNode(group.text));
    }
    textGroups.clear();
  }

  function characters(element: HTMLElement): HTMLElement[] {
    const text = element.textContent || '';
    const readable = document.createElement('span');
    readable.className = 'sr-only';
    readable.textContent = text;
    const visual = document.createElement('span');
    visual.className = 'detail-text-visual';
    visual.setAttribute('aria-hidden', 'true');
    const chars: HTMLElement[] = [];
    for (const part of text.match(/\s+|\S+/gu) ?? []) {
      if (/^\s+$/u.test(part)) { visual.append(document.createTextNode(part)); continue; }
      const word = document.createElement('span');
      word.className = 'detail-word';
      for (const character of part) {
        const mask = document.createElement('span');
        mask.className = 'detail-char-wrap';
        const char = document.createElement('span');
        char.className = 'detail-char';
        char.textContent = character;
        mask.append(char);
        word.append(mask);
        chars.push(char);
      }
      visual.append(word);
    }
    element.replaceChildren(readable, visual);
    textGroups.set(element, { text, visual, readable });
    return chars;
  }

  function announce(target: { value: number; total: number }) {
    if (!readableCounter) return;
    const text = `Showing ${pad(target.value, target.total)} of ${pad(target.total, target.total)}`;
    if (readableCounter.textContent !== text) readableCounter.textContent = text;
  }

  function buildCounter(target: { value: number; total: number }) {
    if (!counter) return;
    const width = Math.max(2, String(target.total).length);
    if (visualCounter?.parentElement === counter && tracks.length === width) {
      if (totalLabel) totalLabel.textContent = pad(target.total, target.total);
      return;
    }
    visualCounter = document.createElement('span');
    visualCounter.className = 'detail-counter-visual';
    visualCounter.setAttribute('aria-hidden', 'true');
    tracks = [];
    for (let digit = 0; digit < width; digit++) {
      const column = document.createElement('span');
      column.className = 'detail-counter-column detail-counter-digit';
      const track = document.createElement('span');
      track.className = 'detail-counter-track';
      for (let row = 0; row < 30; row++) {
        const value = document.createElement('span');
        value.className = 'detail-counter-value';
        value.textContent = String(row % 10);
        track.append(value);
      }
      column.append(track);
      visualCounter.append(column);
      tracks.push(track);
    }
    const divider = document.createElement('span');
    divider.className = 'detail-counter-column detail-counter-divider';
    divider.textContent = '/';
    totalLabel = document.createElement('span');
    totalLabel.className = 'detail-counter-column detail-counter-total';
    totalLabel.textContent = pad(target.total, target.total);
    visualCounter.append(divider, totalLabel);
    readableCounter = document.createElement('span');
    readableCounter.className = 'sr-only';
    readableCounter.setAttribute('aria-live', 'polite');
    readableCounter.setAttribute('aria-atomic', 'true');
    // Only this concise status is live; the thirty-row visual tracks are aria-hidden.
    counter.removeAttribute('aria-live');
    counter.replaceChildren(visualCounter, readableCounter);
  }

  function jump(target: { value: number; total: number }) {
    buildCounter(target);
    rows = pad(target.value, target.total).split('').map(digit => 10 + Number(digit));
    rows.forEach((row, index) => { if (tracks[index]) tracks[index].style.transform = trackPosition(row); });
    current = target.value;
    currentTotal = target.total;
    announce(latest ?? target);
  }

  function settleCounter() {
    counterGeneration++;
    for (const animation of rolling) animation.cancel();
    rolling = [];
    pending = null;
    if (latest) jump(latest);
  }

  function roll(target: { value: number; total: number }) {
    if (current === null || !tracks.length || typeof tracks[0].animate !== 'function') { jump(target); return; }
    const from = current;
    const direction = (target.value - from + target.total) % target.total <= (from - target.value + target.total) % target.total ? 1 : -1;
    const oldDigits = pad(from, target.total).split('').map(Number);
    const newDigits = pad(target.value, target.total).split('').map(Number);
    const deltas = oldDigits.map((digit, index) => direction >= 0 ? (newDigits[index] - digit + 10) % 10 : -((digit - newDigits[index] + 10) % 10));
    const maxDelta = Math.max(...deltas.map(Math.abs));
    if (!maxDelta) { jump(target); return; }
    const duration = Math.max(.24, Math.min(.45, .07 * maxDelta)) * 1000;
    const token = ++counterGeneration;
    rolling = deltas.flatMap((delta, index) => {
      if (!delta) return [];
      const start = rows[index];
      const frames = sampledFrames(progress => ({ transform: trackPosition(start + delta * progress) }), power3InOut);
      return [tracks[index].animate(frames, { duration, easing: 'linear', fill: 'both' })];
    });
    void Promise.all(rolling.map(animation => animation.finished)).then(() => {
      if (destroyed || counterGeneration !== token) return;
      const completed = rolling;
      rolling = [];
      // Keep every resting digit in the middle copy of 0–9 (rows 10 through 19).
      jump(target);
      for (const animation of completed) animation.cancel();
      const queued = pending;
      pending = null;
      // The reference settles to the newest pending number instead of replaying a backlog.
      if (queued && (queued.value !== target.value || queued.total !== target.total)) jump(queued);
      else if (latest) announce(latest);
    }, () => {});
  }

  function setCounter(value: number, total: number, animate = true) {
    if (destroyed || !counter) return;
    const count = Number.isFinite(total) ? Math.max(1, Math.floor(total)) : 1;
    const number = Number.isFinite(value) ? Math.floor(value) : 1;
    const target = { value: ((number - 1) % count + count) % count + 1, total: count };
    latest = target;
    if (!animate || reducedMotion.matches || !visible || page?.hidden || current === null || currentTotal !== count || visualCounter?.parentElement !== counter) {
      settleCounter();
      return;
    }
    announce(target);
    if (rolling.length) { pending = target; return; }
    if (current !== target.value) roll(target);
  }

  function reveal() {
    if (destroyed || !page || page.hidden) return;
    clearEntrances();
    visible = true;
    if (reducedMotion.matches) { settleCounter(); return; }
    const enterFrames = sampledFrames(progress => ({ opacity: .9 + .1 * progress, transform: `translateX(${(1 - progress) * 4}px)` }), power1Out);
    ['#detail-heading', '#detail-number', '#detail-hint'].forEach((selector, groupIndex) => {
      const element = page.querySelector<HTMLElement>(selector);
      if (!element || element.hidden) return;
      const chars = characters(element);
      chars.forEach((char, index) => entrance(char, enterFrames, groupIndex * 35 + 80 * power2Out(chars.length > 1 ? index / (chars.length - 1) : 0)));
    });
    const columns = [...page.querySelectorAll<HTMLElement>('.detail-counter-column')];
    columns.forEach((column, index) => entrance(column, enterFrames, 90 + 80 * power2Out(columns.length > 1 ? index / (columns.length - 1) : 0)));
    const fadeFrames = sampledFrames(progress => ({ opacity: .9 + .1 * progress }), power1Out);
    for (const button of page.querySelectorAll<HTMLElement>('.detail-prev, .detail-next')) {
      if (!button.hidden) entrance(button, fadeFrames, 120);
    }
  }

  function hide() {
    if (destroyed) return;
    visible = false;
    clearEntrances();
    settleCounter();
  }

  const onMotionPreference = () => {
    if (reducedMotion.matches) { clearEntrances(); settleCounter(); }
    else if (visible) reveal();
  };
  reducedMotion.addEventListener('change', onMotionPreference);

  return {
    reveal,
    setCounter,
    hide,
    destroy() {
      if (destroyed) return;
      hide();
      destroyed = true;
      reducedMotion.removeEventListener('change', onMotionPreference);
      if (counter) {
        if (latest) counter.textContent = `${pad(latest.value, latest.total)} / ${pad(latest.total, latest.total)}`;
        if (originalLive === null) counter.removeAttribute('aria-live');
        else counter.setAttribute('aria-live', originalLive);
      }
    },
  };
}
