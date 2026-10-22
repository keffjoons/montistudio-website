import { createGallery, type GalleryController, type GalleryItem, type GalleryView } from './gallery';

type Section = 'home' | 'photo' | 'video' | 'about' | 'book';
type Item = GalleryItem & { fullSrc?: string };
const root = document.querySelector<HTMLElement>('#studio')!;
const find = <T extends HTMLElement = HTMLElement>(selector: string) => root.querySelector<T>(selector)!;
const items: Item[] = JSON.parse(find('#portfolio-data').textContent || '[]');
const photos = items.filter(item => item.type === 'image');
const host = find('#gallery-stage');
const fallback = find('#portfolio-fallback');
const detail = find('#detail-page');
const video = find<HTMLVideoElement>('#detail-video');
const clock = find('#clock');
const menuItems = [...root.querySelectorAll<HTMLElement>('.clock-item')];
const categories = find('#category-nav');
const views: Section[] = ['about', 'video', 'photo', 'home', 'book'];
const angles = [185, 218, 270, 322, 355, 405, 427.5, 450, 472.5, 495];
const mod = (value: number, total: number) => ((value % total) + total) % total;
const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
let section: Section = 'home';
let activeId = '';
let category = 'All';
let gallery: GalleryController | undefined;
let graphicsFailed = false;
let shift = 0;
let menuFrame = 0;

function angleAt(slot: number) {
  const floor = Math.floor(slot);
  const index = mod(floor, 10);
  const start = angles[index];
  const end = index === 9 ? angles[0] + 360 : angles[index + 1];
  return start + (end - start) * (slot - floor);
}

function paintClock() {
  const mobile = innerWidth <= 720;
  const width = mobile ? Math.min(innerWidth * .96, innerWidth - 24) : Math.min(innerWidth * .8, 800);
  const height = mobile ? innerWidth * .48 : width / 2;
  const centerX = width / 2;
  const centerY = height * (mobile ? .82 : .8);
  const radiusX = width * (mobile ? .28 : .22);
  const radiusY = height * (mobile ? .34 : .29);
  Object.assign(clock.style, { width: `${width}px`, height: `${height}px`, bottom: `${(mobile ? 18 : 34) - height + centerY}px` });
  clock.style.setProperty('--center-y', `${centerY}px`);
  menuItems.forEach((item, i) => {
    const slot = mod(i - shift, 10);
    const angle = angleAt(slot) * Math.PI / 180;
    const x = centerX + radiusX * Math.cos(angle);
    const y = centerY + radiusY * Math.sin(angle) - (mobile ? 2 : 4);
    const link = item.querySelector<HTMLAnchorElement>('a')!;
    const selected = link.dataset.view === section && Math.abs(slot - 3) < .55;
    const opacity = slot <= 4 ? .32 : slot < 5 ? .32 * (5 - slot) : slot > 9 ? .32 * (slot - 9) : 0;
    const visible = opacity > .01;
    Object.assign(item.style, { left: `${x}px`, top: `${y}px`, opacity: String(selected ? 1 : opacity), zIndex: selected ? '3' : '2' });
    item.setAttribute('aria-hidden', String(!visible));
    link.tabIndex = visible ? 0 : -1;
    link.toggleAttribute('data-active', selected);
    if (selected) link.setAttribute('aria-current', 'page'); else link.removeAttribute('aria-current');
    if (link.dataset.view === 'photo' && slot < 5) {
      categories.style.left = `${x + (mobile ? 42 : 61)}px`;
      categories.style.top = `${mobile ? y - 98 : y - 8}px`;
    }
  });
}

function turnClock(animate = true) {
  cancelAnimationFrame(menuFrame);
  clock.dataset.animating = 'true';
  const base = views.indexOf(section) - 3;
  const targets = Array.from({ length: 9 }, (_, i) => base + (i - 4) * 5);
  const target = targets.reduce((best, next) => Math.abs(next - shift) < Math.abs(best - shift) ? next : best);
  if (!animate || reducedMotion.matches) { shift = target; paintClock(); clock.dataset.animating = 'false'; return; }
  const start = shift;
  const startedAt = performance.now();
  const tick = (now: number) => {
    const progress = Math.min(1, (now - startedAt) / 650);
    const eased = 1 - Math.pow(1 - progress, 4);
    shift = start + (target - start) * eased;
    paintClock();
    if (progress < 1) menuFrame = requestAnimationFrame(tick); else clock.dataset.animating = 'false';
  };
  menuFrame = requestAnimationFrame(tick);
}

function syncFallback() {
  for (const row of fallback.querySelectorAll<HTMLElement>('li')) {
    row.hidden = section === 'video' ? row.dataset.type !== 'video' : section === 'photo' && (row.dataset.type !== 'image' || (category !== 'All' && row.dataset.category !== category));
  }
}

function updateDetail(id: string) {
  const item = items.find(item => item.id === id);
  if (!item) return;
  activeId = id;
  find('#detail-heading').textContent = item.category;
  find('#detail-number').textContent = item.type === 'video' ? 'Film' : item.id;
  find('#detail-counter').textContent = item.type === 'video' ? '01 / 01' : `${String(photos.findIndex(photo => photo.id === id) + 1).padStart(2, '0')} / ${String(photos.length).padStart(2, '0')}`;
  const image = find<HTMLImageElement>('#detail-fallback');
  image.src = item.type === 'image' ? item.src : item.poster!;
  image.alt = item.alt;
  image.hidden = item.type === 'video';
  video.hidden = item.type !== 'video';
  find('#detail-hint').hidden = item.type === 'video';
  find('.detail-prev').hidden = item.type === 'video';
  find('.detail-next').hidden = item.type === 'video';
  find<HTMLAnchorElement>('.detail-back').href = item.type === 'video' ? '/video' : '/photo';
}

function renderPath(animate = true) {
  const [requested, id = ''] = location.pathname.split('/').filter(Boolean);
  section = views.includes(requested as Section) ? requested as Section : 'home';
  const selected = items.find(item => item.id === id && (section === 'photo' ? item.type === 'image' : section === 'video' && item.type === 'video'));
  activeId = selected?.id || '';
  root.dataset.view = section;
  root.dataset.detail = String(Boolean(selected));
  find('#about-page').hidden = section !== 'about';
  find('#book-page').hidden = section !== 'book';
  detail.hidden = !selected;
  categories.hidden = section !== 'photo' || Boolean(selected);
  const contentPage = section === 'about' || section === 'book';
  const videoDetail = selected?.type === 'video';
  host.hidden = graphicsFailed || contentPage || videoDetail;
  fallback.hidden = contentPage || Boolean(selected);
  video.pause();
  if (selected) updateDetail(selected.id);
  if (!contentPage && !videoDetail) gallery?.setView(selected ? 'detail' : section as GalleryView, { category, selectedId: selected?.id });
  gallery?.setEnabled(!contentPage && !videoDetail);
  if (contentPage) find(`#${section}-page`).scrollTop = 0;
  syncFallback();
  turnClock(animate);
  const name = section[0].toUpperCase() + section.slice(1);
  document.title = section === 'home' ? 'Monti Studio' : `${name} — Monti Studio`;
  find('#page-heading').textContent = `${name} — Monti Studio`;
  const canonical = document.querySelector<HTMLLinkElement>('link[rel="canonical"]');
  if (canonical) canonical.href = `https://montistudio.co.uk${location.pathname}`;
}

function navigate(path: string) {
  if (location.pathname === path) return;
  history.pushState(null, '', path);
  renderPath();
  find('#main').focus({ preventScroll: true });
}

function selectItem(id: string) { navigate(id === 'film' ? '/video/film' : `/photo/${id}`); }
function stepDetail(direction: number) {
  const index = photos.findIndex(item => item.id === activeId);
  if (index >= 0) selectItem(photos[mod(index + direction, photos.length)].id);
}

root.addEventListener('click', event => {
  const mouse = event as MouseEvent;
  if (mouse.defaultPrevented || mouse.button !== 0 || mouse.metaKey || mouse.ctrlKey || mouse.shiftKey || mouse.altKey) return;
  const link = (event.target as HTMLElement).closest<HTMLAnchorElement>('a.section-link, a.project-link');
  if (link && link.origin === location.origin) { event.preventDefault(); navigate(link.pathname); }
});
for (const button of categories.querySelectorAll<HTMLButtonElement>('button')) button.addEventListener('click', () => {
  category = button.dataset.category!;
  for (const other of categories.querySelectorAll('button')) other.setAttribute('aria-pressed', String(other === button));
  gallery?.setView('photo', { category });
  syncFallback();
});
find('.detail-prev').addEventListener('click', () => stepDetail(-1));
find('.detail-next').addEventListener('click', () => stepDetail(1));
window.addEventListener('popstate', () => renderPath());
window.addEventListener('resize', paintClock);
window.addEventListener('keydown', event => {
  if (event.key === 'Escape' && activeId) { event.preventDefault(); navigate(section === 'video' ? '/video' : '/photo'); return; }
  if ((event.target as HTMLElement).closest('input,textarea,select,button,a')) return;
  if (event.key === 'Escape') { if (activeId) navigate(section === 'video' ? '/video' : '/photo'); else if (section !== 'home') navigate('/'); }
  if (event.key === 'ArrowRight' || event.key === 'ArrowLeft') {
    if (section === 'about' || section === 'book') return;
    event.preventDefault();
    const direction = event.key === 'ArrowRight' ? 1 : -1;
    if (activeId && activeId !== 'film') stepDetail(direction); else gallery?.nudge(direction);
  }
});

find<HTMLFormElement>('#enquiry-form').addEventListener('submit', event => {
  event.preventDefault();
  const data = new FormData(event.currentTarget as HTMLFormElement);
  const body = `Name: ${data.get('firstName')} ${data.get('lastName')}\nEmail: ${data.get('email')}\nCompany: ${data.get('company') || '—'}\n\n${data.get('body')}`;
  const draft = `mailto:hello@montistudio.co.uk?subject=${encodeURIComponent('Monti Studio — project enquiry')}&body=${encodeURIComponent(body)}`;
  find('#enquiry-status').textContent = 'Finish sending in your email app. You can also email hello@montistudio.co.uk directly.';
  location.href = draft;
});

host.addEventListener('gallery-ready', () => root.classList.add('gallery-ready'));
host.addEventListener('gallery-unavailable', () => { graphicsFailed = true; root.classList.remove('gallery-ready'); host.hidden = true; });
try {
  gallery = createGallery(host, items, {
    onSelect: selectItem,
    onActiveChange: id => {
      if (root.dataset.detail === 'true' && section === 'photo' && id !== activeId) {
        updateDetail(id);
        history.replaceState(null, '', `/photo/${id}`);
      }
    },
  });
} catch { graphicsFailed = true; host.hidden = true; }
renderPath(false);
window.addEventListener('pagehide', event => { if (!(event as PageTransitionEvent).persisted) { cancelAnimationFrame(menuFrame); gallery?.destroy(); } });
