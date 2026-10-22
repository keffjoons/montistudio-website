/** Restrained content reveals with visible, accessible resting states. */
export function createPageMotion(root: HTMLElement): { enter(section: string): void; destroy(): void } {
  const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
  const animations = new Set<Animation>();
  const cleanups: Array<() => void> = [];
  let generation = 0;
  let activeSection = '';
  let destroyed = false;

  const expoOut = (progress: number) => progress === 1 ? 1 : 1 - 2 ** (-10 * progress);
  const power2Out = (progress: number) => 1 - (1 - progress) ** 3;
  const clamp = (value: number) => Math.max(0, Math.min(1, value));

  function frames(make: (progress: number) => Keyframe, ease = expoOut): Keyframe[] {
    return Array.from({ length: 61 }, (_, index) => ({ ...make(ease(index / 60)), offset: index / 60 }));
  }

  function animate(element: HTMLElement, keyframes: Keyframe[], duration: number, delay = 0) {
    // With unsupported animation APIs, the ordinary, visible document remains usable.
    if (typeof element.animate !== 'function') return;
    const animation = element.animate(keyframes, { duration, delay, easing: 'linear', fill: 'both' });
    animations.add(animation);
    void animation.finished.then(() => {
      animations.delete(animation);
      animation.cancel();
    }, () => animations.delete(animation));
  }

  function words(element: HTMLElement): HTMLElement[] {
    const existing = [...element.querySelectorAll<HTMLElement>('.motion-word')];
    if (existing.length) return existing;
    const walker = document.createTreeWalker(element, NodeFilter.SHOW_TEXT);
    const nodes: Text[] = [];
    while (walker.nextNode()) nodes.push(walker.currentNode as Text);
    const result: HTMLElement[] = [];
    for (const node of nodes) {
      if (!node.textContent?.trim()) continue;
      const fragment = document.createDocumentFragment();
      for (const part of node.textContent.match(/\s+|\S+/gu) ?? []) {
        if (/^\s+$/u.test(part)) { fragment.append(document.createTextNode(part)); continue; }
        const mask = document.createElement('span');
        const word = document.createElement('span');
        mask.className = 'motion-word-mask';
        word.className = 'motion-word';
        word.textContent = part;
        mask.append(word);
        fragment.append(mask);
        result.push(word);
      }
      node.replaceWith(fragment);
    }
    // Plain spans keep the original text, whitespace and semantic parent accessible.
    return result;
  }

  function rise(elements: HTMLElement[], duration: number, opacity = false) {
    const keyframes = frames(progress => ({
      transform: `translateY(${(1 - progress) * 8}px)`,
      ...(opacity ? { opacity: .9 + .1 * progress } : {}),
    }));
    for (const element of elements) animate(element, keyframes, duration);
  }

  function revealAbout(page: HTMLElement) {
    const images = [...page.querySelectorAll<HTMLImageElement>('.motion-image-frame > img')];
    const imageFrames = frames(progress => ({
      transform: `scale(${1.015 - progress * .015})`,
      opacity: .9 + .1 * progress,
    }));
    for (const image of images) animate(image, imageFrames, 600);
    const heading = page.querySelector<HTMLElement>('#about-heading');
    if (heading) rise(words(heading), 600);

    const copy = [...page.querySelectorAll<HTMLElement>('.founder-names, .about-services h3, .about-services li, .about-services a')]
      .flatMap(words);
    let frame = 0;
    let startedAt = 0;
    let values = copy.map(element => ({ element, from: 1, current: 1, target: 1 }));

    const paint = (now: number) => {
      frame = 0;
      const progress = clamp((now - startedAt) / 300);
      for (const value of values) {
        value.current = value.from + (value.target - value.from) * progress;
        value.element.style.opacity = String(value.current);
      }
      if (progress < 1) frame = requestAnimationFrame(paint);
    };
    const measure = (immediate = false) => {
      const viewport = page.getBoundingClientRect();
      const canScroll = page.scrollHeight > page.clientHeight + 1;
      for (const value of values) {
        const top = value.element.getBoundingClientRect().top - viewport.top;
        const progress = canScroll ? clamp((page.clientHeight * .85 - top) / (page.clientHeight * .1)) : 1;
        value.from = value.current;
        // Scroll emphasis stays subtle enough to keep every word readable.
        value.target = .82 + .18 * (1 - (1 - progress) ** 2);
        if (immediate || !canScroll) {
          value.current = value.target;
          value.from = value.target;
          value.element.style.opacity = String(value.target);
        }
      }
      startedAt = performance.now();
      if (!frame && !immediate) frame = requestAnimationFrame(paint);
    };
    const onScroll = () => measure();
    const onResize = () => measure(true);
    page.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onResize);
    const observer = typeof ResizeObserver === 'undefined' ? undefined : new ResizeObserver(onResize);
    observer?.observe(page);
    const content = page.querySelector('.about-copy');
    if (content) observer?.observe(content);
    measure(true);
    cleanups.push(() => {
      cancelAnimationFrame(frame);
      observer?.disconnect();
      page.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', onResize);
      for (const value of values) value.element.style.removeProperty('opacity');
      values = [];
    });
  }

  function revealOrbit(page: HTMLElement) {
    const elements = [...page.querySelectorAll<HTMLElement>('.service-orbit > span')];
    const points = elements.filter(element => element.getClientRects().length).map(element => {
      const bounds = element.getBoundingClientRect();
      return { element, x: bounds.left + bounds.width / 2, y: bounds.top + bounds.height / 2 };
    });
    if (!points.length) return;
    const centerX = points.reduce((total, point) => total + point.x, 0) / points.length;
    const centerY = points.reduce((total, point) => total + point.y, 0) / points.length;
    points.sort((a, b) => Math.atan2(a.y - centerY, a.x - centerX) - Math.atan2(b.y - centerY, b.x - centerX));
    points.forEach(({ element, x, y }, index) => {
      const radius = Math.hypot(x - centerX, y - centerY);
      const angle = Math.atan2(y - centerY, x - centerX);
      const rotation = getComputedStyle(element).transform;
      const base = rotation === 'none' ? '' : ` ${rotation}`;
      const orbitFrames = frames(progress => {
        const theta = angle - Math.PI / 90 + progress * Math.PI / 90;
        const deltaX = radius < 4 ? 0 : centerX + radius * Math.cos(theta) - x;
        const deltaY = radius < 4 ? 0 : centerY + radius * Math.sin(theta) - y;
        return { opacity: .9 + .1 * progress, transform: `translate(${deltaX}px, ${deltaY}px)${base}` };
      }, power2Out);
      animate(element, orbitFrames, 500, index * 20);
    });
  }

  function revealBook(page: HTMLElement, token: number) {
    const text = [...page.querySelectorAll<HTMLElement>('#book-heading, .book-intro, .contact-address')].flatMap(words);
    rise(text, 700);
    const form = page.querySelector<HTMLFormElement>('#enquiry-form');
    if (form) rise([form], 700, true);
    const orbit = () => {
      if (!destroyed && generation === token && !reducedMotion.matches && !page.hidden) revealOrbit(page);
    };
    // The arc's center depends on final font metrics, as in the reference.
    if (document.fonts) void document.fonts.ready.then(orbit);
    else orbit();
  }

  function stop() {
    generation++;
    for (const animation of animations) animation.cancel();
    animations.clear();
    for (const cleanup of cleanups.splice(0)) cleanup();
  }

  function enter(section: string) {
    if (destroyed) return;
    stop();
    activeSection = section;
    if (reducedMotion.matches) return;
    if (section !== 'about' && section !== 'book') return;
    const page = root.querySelector<HTMLElement>(`#${section}-page`);
    if (!page || page.hidden) return;
    if (section === 'about') revealAbout(page);
    if (section === 'book') revealBook(page, generation);
  }

  const onMotionPreference = () => {
    if (reducedMotion.matches) stop();
    else enter(activeSection);
  };
  reducedMotion.addEventListener('change', onMotionPreference);

  return {
    enter,
    destroy() {
      if (destroyed) return;
      stop();
      destroyed = true;
      reducedMotion.removeEventListener('change', onMotionPreference);
      for (const mask of root.querySelectorAll<HTMLElement>('.motion-word-mask')) mask.replaceWith(document.createTextNode(mask.textContent || ''));
    },
  };
}
