import {
  CanvasTexture,
  DoubleSide,
  Group,
  MathUtils,
  Mesh,
  MeshBasicMaterial,
  NoToneMapping,
  PerspectiveCamera,
  PlaneGeometry,
  Raycaster,
  Scene,
  SRGBColorSpace,
  Texture,
  TextureLoader,
  Vector2,
  Vector3,
  VideoTexture,
  WebGLRenderer,
} from "three";

export type GalleryView = "home" | "photo" | "video" | "detail";

export interface GalleryItem {
  id: string;
  type: "image" | "video";
  src: string;
  poster?: string;
  width: number;
  height: number;
  category: string;
  alt: string;
}

export interface GalleryController {
  setView(
    view: GalleryView,
    options?: { category?: string; selectedId?: string },
  ): void;
  nudge(direction: number): void;
  setEnabled(enabled: boolean): void;
  destroy(): void;
}

interface Resource {
  item: GalleryItem;
  poster?: Texture;
  video?: HTMLVideoElement;
  motion?: VideoTexture;
}

type Picture = Mesh<PlaneGeometry, MeshBasicMaterial>;

interface Plane {
  mesh: Picture;
  caption?: Picture;
  item: GalleryItem;
  base: number;
  height: number;
}

const wrap = (value: number, size: number) => ((value % size) + size) % size;
const isPhoto = (item: GalleryItem) => item.type === "image";

/** Render Monti's media; layout measurements come from the inspected reference. */
export function createGallery(
  host: HTMLElement,
  items: GalleryItem[],
  callbacks: {
    onSelect: (id: string) => void;
    onActiveChange?: (id: string) => void;
  },
): GalleryController {
  if (!items.length) throw new Error("The gallery needs at least one image.");

  const renderer = new WebGLRenderer({
    alpha: true,
    antialias: true,
    powerPreference: "low-power",
  });
  renderer.outputColorSpace = SRGBColorSpace;
  renderer.toneMapping = NoToneMapping;
  renderer.setClearColor(0x000000, 0);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));

  const canvas = renderer.domElement;
  canvas.setAttribute("aria-hidden", "true");
  canvas.style.cssText =
    "display:block;width:100%;height:100%;touch-action:none;cursor:grab";
  host.appendChild(canvas);

  const scene = new Scene();
  const group = new Group();
  scene.add(group);
  const camera = new PerspectiveCamera(60, 1, 0.1, 1000);
  const raycaster = new Raycaster();
  const pointer = new Vector2();
  const projected = new Vector3();
  const textureLoader = new TextureLoader();
  const resources = new Map(
    items.map((item) => [item.id, { item } as Resource]),
  );
  const captionTextures = new Map<string, CanvasTexture>();
  const displayFont =
    getComputedStyle(host).getPropertyValue("--font-display").trim() ||
    '"Poiret One", sans-serif';
  const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
  const abort = new AbortController();
  const eventOptions = { signal: abort.signal };

  let view: GalleryView = "home";
  let category = "all";
  let selectedId: string | undefined;
  let planes: Plane[] = [];
  let width = 0;
  let height = 0;
  let yaw = 0;
  let offset = 0;
  let cycle = 1;
  let velocity = 0;
  let enabled = true;
  let destroyed = false;
  let contextLost = false;
  let raf = 0;
  let lastTime = 0;
  let lastActiveId = "";
  let pointerInside = false;
  let motionPlaying = false;
  let ready = false;
  let activeItems: GalleryItem[] = items;
  const drag = { id: -1, startX: 0, startY: 0, x: 0, y: 0, moved: false };

  function available() {
    return enabled && !destroyed && !contextLost && !document.hidden;
  }

  function queueFrame() {
    if (!raf && available()) {
      lastTime = performance.now();
      raf = requestAnimationFrame(frame);
    }
  }

  function signalUnavailable() {
    ready = false;
    delete host.dataset.ready;
    host.dispatchEvent(new Event("gallery-unavailable"));
  }

  function stopMotion() {
    motionPlaying = false;
    for (const resource of resources.values()) resource.video?.pause();
  }

  function stop() {
    cancelAnimationFrame(raf);
    raf = 0;
    velocity = 0;
    stopMotion();
  }

  function disposePlanes() {
    for (const { mesh, caption } of planes) {
      if (caption) {
        caption.geometry.dispose();
        caption.material.dispose();
        mesh.remove(caption);
      }
      mesh.geometry.dispose();
      mesh.material.dispose();
      group.remove(mesh);
    }
    planes = [];
  }

  function drawCaption(item: GalleryItem, texture?: CanvasTexture) {
    const surface = texture
      ? (texture.image as HTMLCanvasElement)
      : document.createElement("canvas");
    if (!texture) surface.width = surface.height = 512;
    const context = surface.getContext("2d");
    if (!context) return;
    context.clearRect(0, 0, surface.width, surface.height);
    context.fillStyle = "#ffffff";
    context.textAlign = "center";
    context.textBaseline = "middle";
    context.font = `400 92px ${displayFont}`;
    context.fillText(item.category, 256, 207, 460);
    context.font = `400 82px ${displayFont}`;
    const number = item.id.match(/\d+/)?.[0] ?? "";
    context.fillText(item.type === "video" ? "Film" : number.padStart(2, "0"), 256, 322);
    if (texture) {
      texture.needsUpdate = true;
      return texture;
    }
    const created = new CanvasTexture(surface);
    created.colorSpace = SRGBColorSpace;
    captionTextures.set(item.id, created);
    return created;
  }

  function makeCaption(
    item: GalleryItem,
    planeWidth: number,
    planeHeight: number,
  ) {
    const texture = captionTextures.get(item.id) ?? drawCaption(item);
    if (!texture) return;
    const size = Math.min(planeWidth * 0.9, planeHeight * 1.1, 0.65);
    const caption = new Mesh(
      new PlaneGeometry(size, size),
      new MeshBasicMaterial({
        map: texture,
        transparent: true,
        depthWrite: false,
        side: DoubleSide,
        toneMapped: false,
      }),
    );
    caption.position.z = 0.02;
    caption.rotation.z = 0.55;
    caption.renderOrder = 1;
    return caption;
  }

  function makePlane(
    item: GalleryItem,
    planeWidth: number,
    planeHeight: number,
    cover = false,
  ) {
    const geometry = new PlaneGeometry(planeWidth, planeHeight, 16, 16);
    const positions = geometry.attributes.position;
    const uv = geometry.attributes.uv;
    const imageAspect = item.width / item.height;
    const planeAspect = planeWidth / planeHeight;
    const cropX = cover ? Math.min(1, planeAspect / imageAspect) : 1;
    const cropY = cover ? Math.min(1, imageAspect / planeAspect) : 1;
    for (let index = 0; index < positions.count; index++) {
      const x = positions.getX(index);
      const bend =
        (1 - Math.cos((x / (planeWidth / 2)) * 1.1)) * planeWidth * 0.006;
      positions.setZ(index, bend);
      uv.setXY(
        index,
        0.5 + (uv.getX(index) - 0.5) * cropX,
        0.5 + (uv.getY(index) - 0.5) * cropY,
      );
    }
    geometry.computeBoundingSphere();
    const resource = resources.get(item.id);
    const map =
      resource?.motion &&
      !reducedMotion.matches &&
      resource.video!.readyState >= 2
        ? resource.motion
        : resource?.poster;
    const material = new MeshBasicMaterial({
      map: map ?? null,
      side: DoubleSide,
      transparent: true,
      opacity: map ? 1 : 0,
    });
    const mesh = new Mesh(geometry, material);
    group.add(mesh);
    const plane: Plane = { mesh, item, base: 0, height: planeHeight };
    if (view === "photo" || view === "video") {
      plane.caption = makeCaption(item, planeWidth, planeHeight);
      if (plane.caption) {
        plane.caption.visible = !!map;
        mesh.add(plane.caption);
      }
    }
    planes.push(plane);
    return plane;
  }

  function rebuild() {
    disposePlanes();
    velocity = 0;
    offset = 0;
    group.position.set(0, 0, 0);
    group.rotation.set(0, 0, 0);

    if (view === "home") {
      activeItems = items;
      camera.fov = 60;
      camera.near = 0.1;
      camera.far = 1000;
      camera.position.set(0, 0, 0);
      for (let slot = 0; slot < 12; slot++) {
        const item = items[wrap(wrap(slot - 2, 12), items.length)];
        const angle = (slot / 12) * Math.PI * 2;
        const rawY =
          15.2 * Math.cos(0.52 * Math.PI + 0.24 * ((slot % 3) - 1)) * 0.88;
        const y = rawY - Math.max(0, rawY) * 0.8 - 0.9;
        const x = 14.44 * Math.cos(angle);
        const z = 14.44 * Math.sin(angle);
        const plane = makePlane(
          item,
          MathUtils.clamp((8.1 * item.width) / item.height, 5.6, 9.9) * 0.94,
          8.1 * 0.94,
          true,
        );
        plane.mesh.position.set(x, y - 1.25, z - 0.45);
        plane.mesh.lookAt(0, 0, 0);
        plane.mesh.position.set(x, y, z);
      }
    } else if (view === "detail") {
      activeItems = items.filter(isPhoto);
      camera.fov = 34;
      camera.near = 0.01;
      camera.far = 200;
      camera.position.set(0, 0, 3.3);
      camera.lookAt(0, 0, 0);
      const planeWidth =
        width > 767
          ? 1.1
          : 1.1 *
            (0.68 + ((MathUtils.clamp(width, 320, 767) - 320) / 447) * 0.32);
      const groupX =
        width <= 767
          ? 0
          : width <= 1400
            ? 0.6 + ((1400 - width) / 632) * (0.15 - 0.6)
            : 0.72;
      group.position.set(groupX, 0, 0.35);
      group.rotation.set(0.28, -0.02, -0.14);
      let previousHeight = 0;
      let y = 0;
      for (const [index, item] of activeItems.entries()) {
        const planeHeight = planeWidth / (item.width / item.height);
        if (index > 0) y -= previousHeight / 2 + 0.08 + planeHeight / 2;
        const plane = makePlane(item, planeWidth, planeHeight);
        plane.base = y;
        previousHeight = planeHeight;
      }
      cycle = activeItems.reduce(
        (sum, item) => sum + planeWidth / (item.width / item.height) + 0.08,
        0,
      );
      const selected = planes.find((plane) => plane.item.id === selectedId);
      offset = selected ? -selected.base : 0;
    } else {
      activeItems = items.filter((item) =>
        view === "video"
          ? item.type === "video"
          : isPhoto(item) &&
            (category === "all" || item.category.toLowerCase() === category),
      );
      camera.fov = 28;
      camera.near = 0.01;
      camera.far = 200;
      camera.position.set(0, 0, 3.3);
      camera.lookAt(0, 0, 0);
      group.position.set(
        view === "video" || activeItems.length === 1 ? 0 : -0.9,
        0.1,
        0.32,
      );
      group.rotation.set(-0.02, 0.28, -0.03);
      cycle = Math.max(activeItems.length, 1) * 0.88;
      for (const [index, item] of activeItems.entries()) {
        const ratio = item.width / item.height;
        const planeWidth = Math.min(0.72, 1.28 * ratio);
        const planeHeight = Math.min(1.28, 0.72 / ratio);
        const plane = makePlane(item, planeWidth, planeHeight);
        plane.base = index * 0.88;
      }
    }
    camera.aspect = width / height;
    camera.updateProjectionMatrix();
    updatePositions();
    queueFrame();
  }

  function updatePositions() {
    if (view === "home") {
      camera.lookAt(13.68 * Math.sin(yaw), -4, 13.68 * Math.cos(yaw));
    } else if (view === "detail") {
      for (const plane of planes)
        plane.mesh.position.y =
          wrap(plane.base + offset + cycle / 2, cycle) - cycle / 2;
    } else {
      for (const plane of planes) {
        plane.mesh.position.x =
          activeItems.length === 1
            ? 0
            : wrap(plane.base + offset + cycle / 2, cycle) - cycle / 2;
      }
    }
    camera.updateMatrixWorld();
    group.updateMatrixWorld(true);
  }

  function isNearViewport(plane: Plane, margin = 1.35) {
    plane.mesh.getWorldPosition(projected).project(camera);
    return (
      Math.abs(projected.x) < margin &&
      Math.abs(projected.y) < margin &&
      projected.z > -1 &&
      projected.z < 1
    );
  }

  function updateMaps() {
    for (const plane of planes) {
      const resource = resources.get(plane.item.id)!;
      const map =
        resource.motion &&
        !reducedMotion.matches &&
        resource.video!.readyState >= 2
          ? resource.motion
          : resource.poster;
      if (map && plane.mesh.material.map !== map) {
        plane.mesh.material.map = map;
        plane.mesh.material.opacity = 1;
        plane.mesh.material.needsUpdate = true;
      }
      if (plane.caption)
        plane.caption.visible = !!map && plane.mesh.material.opacity > 0;
    }
  }

  function updateMotion() {
    const visible = new Set(
      planes
        .filter((plane) => plane.mesh.material.map && isNearViewport(plane))
        .map((plane) => plane.item.id),
    );
    motionPlaying = false;
    for (const resource of resources.values()) {
      const video = resource.video;
      if (!video) continue;
      if (
        !available() ||
        reducedMotion.matches ||
        !visible.has(resource.item.id)
      ) {
        video.pause();
      } else {
        if (video.paused && !video.dataset.playBlocked) {
          video
            .play()
            .then(queueFrame)
            .catch(() => {
              video.dataset.playBlocked = "true";
            });
        }
        motionPlaying ||= !video.paused;
      }
    }
  }

  function pick(clientX: number, clientY: number) {
    const bounds = canvas.getBoundingClientRect();
    if (!bounds.width || !bounds.height) return;
    pointer.set(
      ((clientX - bounds.left) / bounds.width) * 2 - 1,
      (-(clientY - bounds.top) / bounds.height) * 2 + 1,
    );
    raycaster.setFromCamera(pointer, camera);
    const hit = raycaster.intersectObjects(
      planes
        .filter((plane) => plane.mesh.material.opacity > 0)
        .map((plane) => plane.mesh),
      false,
    )[0];
    return hit ? planes.find((plane) => plane.mesh === hit.object) : undefined;
  }

  function frame(time: number) {
    raf = 0;
    if (!available()) return;
    const elapsed = Math.min(Math.max((time - lastTime) / 1000, 0), 0.05);
    lastTime = time;
    const decay = Math.pow(0.92, elapsed * 60);
    const displacement = (0.92 * velocity * (1 - decay)) / 0.08;
    velocity *= decay;
    if (Math.abs(velocity) < 0.02) velocity = 0;
    if (view === "home") yaw -= displacement * 0.005 * 0.5 * 0.253;
    else if (view === "detail") offset += displacement * 0.005 * 0.5;
    else if (activeItems.length > 1) offset -= displacement * 0.005 * 0.52;
    updatePositions();
    updateMaps();
    updateMotion();
    renderer.render(scene, camera);

    if (
      !ready &&
      planes.some((plane) => plane.mesh.material.map && isNearViewport(plane))
    ) {
      ready = true;
      host.dataset.ready = "true";
      host.dispatchEvent(new Event("gallery-ready"));
    }
    if (view === "detail" && callbacks.onActiveChange) {
      let nearest: Plane | undefined;
      let distance = Infinity;
      for (const plane of planes) {
        plane.mesh.getWorldPosition(projected).project(camera);
        const score = Math.abs(projected.y) + Math.abs(projected.x) * 0.25;
        if (score < distance) {
          nearest = plane;
          distance = score;
        }
      }
      if (nearest && nearest.item.id !== lastActiveId) {
        lastActiveId = nearest.item.id;
        callbacks.onActiveChange(nearest.item.id);
      }
    }
    if (pointerInside && drag.id < 0)
      canvas.style.cursor = pick(drag.x, drag.y) ? "pointer" : "grab";
    if (velocity || drag.id >= 0 || motionPlaying)
      raf = requestAnimationFrame(frame);
  }

  function addVelocity(amount: number) {
    if (!available()) return;
    velocity = MathUtils.clamp(velocity + amount, -180, 180);
    queueFrame();
  }

  function resize() {
    if (destroyed) return;
    const nextWidth = Math.max(1, host.clientWidth || window.innerWidth);
    const nextHeight = Math.max(1, host.clientHeight || window.innerHeight);
    if (nextWidth === width && nextHeight === height) return;
    if (view === "detail" && lastActiveId) selectedId = lastActiveId;
    width = nextWidth;
    height = nextHeight;
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.setSize(width, height, false);
    rebuild();
  }

  canvas.addEventListener(
    "wheel",
    (event) => {
      if (!available() || event.ctrlKey || event.metaKey) return;
      event.preventDefault();
      const unit =
        event.deltaMode === 1 ? 16 : event.deltaMode === 2 ? height : 1;
      const delta =
        Math.abs(event.deltaX) > Math.abs(event.deltaY)
          ? event.deltaX
          : event.deltaY;
      addVelocity(delta * unit * 0.18);
    },
    { ...eventOptions, passive: false },
  );

  canvas.addEventListener(
    "pointerdown",
    (event) => {
      if (!available() || event.button !== 0 || drag.id >= 0) return;
      Object.assign(drag, {
        id: event.pointerId,
        startX: event.clientX,
        startY: event.clientY,
        x: event.clientX,
        y: event.clientY,
        moved: false,
      });
      canvas.setPointerCapture(event.pointerId);
      canvas.style.cursor = "grabbing";
      queueFrame();
    },
    eventOptions,
  );

  canvas.addEventListener(
    "pointermove",
    (event) => {
      pointerInside = true;
      const deltaX = event.clientX - drag.x;
      const deltaY = event.clientY - drag.y;
      if (drag.id === event.pointerId) {
        if (
          Math.hypot(
            event.clientX - drag.startX,
            event.clientY - drag.startY,
          ) >= 6
        )
          drag.moved = true;
        if (drag.moved) {
          const horizontal =
            view === "photo" ||
            view === "video" ||
            (view === "home" && Math.abs(deltaX) > Math.abs(deltaY));
          const amount = horizontal
            ? view === "home"
              ? deltaX
              : -deltaX
            : -deltaY;
          addVelocity(amount * 0.315);
        }
      }
      drag.x = event.clientX;
      drag.y = event.clientY;
      if (drag.id < 0)
        canvas.style.cursor = pick(event.clientX, event.clientY)
          ? "pointer"
          : "grab";
    },
    eventOptions,
  );

  const releasePointer = (event: PointerEvent) => {
    if (drag.id !== event.pointerId) return;
    const selected =
      !drag.moved && available() && event.type === "pointerup"
        ? pick(event.clientX, event.clientY)
        : undefined;
    if (canvas.hasPointerCapture(event.pointerId))
      canvas.releasePointerCapture(event.pointerId);
    drag.id = -1;
    canvas.style.cursor = selected ? "pointer" : "grab";
    if (selected) callbacks.onSelect(selected.item.id);
  };
  canvas.addEventListener("pointerup", releasePointer, eventOptions);
  canvas.addEventListener("pointercancel", releasePointer, eventOptions);
  canvas.addEventListener(
    "pointerleave",
    () => {
      pointerInside = false;
    },
    eventOptions,
  );
  canvas.addEventListener(
    "lostpointercapture",
    () => {
      drag.id = -1;
    },
    eventOptions,
  );

  canvas.addEventListener(
    "webglcontextlost",
    (event) => {
      event.preventDefault();
      contextLost = true;
      stop();
      signalUnavailable();
    },
    eventOptions,
  );
  canvas.addEventListener(
    "webglcontextrestored",
    () => {
      contextLost = false;
      queueFrame();
    },
    eventOptions,
  );

  document.addEventListener(
    "visibilitychange",
    () => {
      if (document.hidden) stop();
      else queueFrame();
    },
    eventOptions,
  );
  window.addEventListener("resize", resize, eventOptions);
  reducedMotion.addEventListener(
    "change",
    () => {
      stopMotion();
      for (const resource of resources.values()) {
        if (resource.video) delete resource.video.dataset.playBlocked;
      }
      updateMaps();
      queueFrame();
    },
    eventOptions,
  );
  const observer = new ResizeObserver(resize);
  observer.observe(host);
  resize();

  void document.fonts
    .load(`400 92px ${displayFont}`)
    .then(() => {
      if (destroyed) return;
      for (const [id, texture] of captionTextures) {
        const item = resources.get(id)?.item;
        if (item) drawCaption(item, texture);
      }
      queueFrame();
    })
    .catch(() => {
      // The caption remains readable with the configured fallback font.
    });

  async function loadResources() {
    let completed = 0;
    let successful = 0;
    for (let start = 0; start < items.length; start += 3) {
      if (destroyed) return;
      await Promise.all(
        items.slice(start, start + 3).map(async (item) => {
          const resource = resources.get(item.id)!;
          try {
            const texture = await textureLoader.loadAsync(
              item.type === "video" ? item.poster || "" : item.src,
            );
            if (destroyed) {
              texture.dispose();
              return;
            }
            texture.colorSpace = SRGBColorSpace;
            texture.anisotropy = Math.min(
              renderer.capabilities.getMaxAnisotropy(),
              4,
            );
            resource.poster = texture;
            successful++;
            updateMaps();
            queueFrame();
          } catch {
            // An individual missing image does not remove the remaining gallery.
          } finally {
            completed++;
          }
          if (item.type === "video" && !destroyed) {
            const video = document.createElement("video");
            video.muted = true;
            video.loop = true;
            video.playsInline = true;
            video.preload = "none";
            video.src = item.src;
            resource.video = video;
            video.addEventListener(
              "loadeddata",
              () => {
                if (destroyed) return;
                resource.motion = new VideoTexture(video);
                resource.motion.colorSpace = SRGBColorSpace;
                updateMaps();
                queueFrame();
              },
              { ...eventOptions, once: true },
            );
            queueFrame();
          }
        }),
      );
    }
    if (!destroyed && completed === items.length && !successful)
      signalUnavailable();
  }
  void loadResources();

  return {
    setView(nextView, options = {}) {
      if (destroyed) return;
      stopMotion();
      view = nextView;
      category = (options.category ?? "all").toLowerCase();
      selectedId = options.selectedId;
      lastActiveId = "";
      rebuild();
    },
    nudge(direction) {
      if (!available() || !direction) return;
      if (view === "home") addVelocity(Math.sign(direction) * 72);
      else if (view === "detail") {
        const current = Math.max(
          0,
          activeItems.findIndex((item) => item.id === lastActiveId),
        );
        const next = wrap(current + Math.sign(direction), planes.length);
        const distance =
          (planes[current].height + planes[next].height) / 2 + 0.08;
        addVelocity((Math.sign(direction) * distance) / 0.02875);
      } else if (activeItems.length > 1)
        addVelocity(Math.sign(direction) * 29.43);
    },
    setEnabled(nextEnabled) {
      enabled = nextEnabled;
      if (!enabled) {
        stop();
        drag.id = -1;
      } else queueFrame();
    },
    destroy() {
      if (destroyed) return;
      destroyed = true;
      stop();
      abort.abort();
      observer.disconnect();
      disposePlanes();
      for (const texture of captionTextures.values()) texture.dispose();
      captionTextures.clear();
      for (const resource of resources.values()) {
        resource.poster?.dispose();
        resource.motion?.dispose();
        if (resource.video) {
          resource.video.removeAttribute("src");
          resource.video.load();
        }
      }
      renderer.dispose();
      canvas.remove();
      delete host.dataset.ready;
    },
  };
}
