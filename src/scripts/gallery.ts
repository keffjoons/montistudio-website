import {
  CanvasTexture,
  DoubleSide,
  Frustum,
  Group,
  MathUtils,
  Matrix4,
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
  previewSrc?: string;
  featured?: number;
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
  onLoadedData?: () => void;
  loading?: boolean;
  failed?: boolean;
  lastUsed: number;
}

type Picture = Mesh<PlaneGeometry, MeshBasicMaterial>;

interface Plane {
  mesh: Picture;
  caption?: Picture;
  item: GalleryItem;
  base: number;
  height: number;
  width: number;
  homePosition?: Vector3;
  entryAlpha?: number;
}

const wrap = (value: number, size: number) => ((value % size) + size) % size;
const isPhoto = (item: GalleryItem) => item.type === "image";
const progress = (time: number, start: number, duration: number) =>
  MathUtils.clamp((time - start) / duration, 0, 1);
const easeIn = (value: number) => value ** 3;
const easeOut = (value: number) => 1 - (1 - value) ** 4;

interface CategoryMotion {
  phase: "out" | "in";
  started: number;
  target: string;
  ordered: Plane[];
  duration: number;
}

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
  const viewport = new Frustum();
  const viewProjection = new Matrix4();
  const resources = new Map(
    items.map((item) => [item.id, { item, lastUsed: 0 } as Resource]),
  );
  const featuredItems = items
    .filter(
      (item) =>
        typeof item.featured === "number" && Number.isFinite(item.featured),
    )
    .sort((a, b) => a.featured! - b.featured!)
    .slice(0, 12);
  const homeItems = featuredItems.length ? featuredItems : items;
  const featuredIds = new Set(featuredItems.map((item) => item.id));
  const homePool = featuredItems.length
    ? [...featuredItems, ...items.filter((item) => !featuredIds.has(item.id))]
    : items;
  let homeNextIndex = 0;
  let homeFrontSlots = new Set<number>();
  const deformation = {
    speed: { value: 0 },
    vertical: { value: 1 },
    strength: { value: 0.011 },
    depth: { value: 0.005 },
  };
  const posterLimit = 18;
  let requestsInFlight = 0;
  let accessClock = 0;
  let desiredResources: Resource[] = [];
  let visibleIds = new Set<string>();
  let unavailableSignalled = false;
  const captionTextures = new Map<string, CanvasTexture>();
  const displayFont =
    getComputedStyle(host).getPropertyValue("--font-cormorant").trim() ||
    '"Cormorant Garamond", Georgia, serif';
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
  let shaderFailed = false;
  let pausedAt: number | undefined;
  let raf = 0;
  let lastTime = 0;
  let lastActiveId = "";
  let pointerInside = false;
  let motionPlaying = false;
  let ready = false;
  let activeItems: GalleryItem[] = items;
  let labelOpacity = 1;
  let categoryMotion: CategoryMotion | undefined;
  let homeEntry: { ordered: Plane[]; started?: number } | undefined;
  let clickBlockedUntil = 0;
  const drag = {
    id: -1,
    startX: 0,
    startY: 0,
    x: 0,
    y: 0,
    moved: false,
    pickedId: "",
  };

  renderer.debug.onShaderError = (
    gl,
    program,
    vertexShader,
    fragmentShader,
  ) => {
    console.error(
      "Monti gallery shader failed:",
      gl.getProgramInfoLog(program),
      gl.getShaderInfoLog(vertexShader),
      gl.getShaderInfoLog(fragmentShader),
    );
    shaderFailed = true;
    stop();
    signalUnavailable();
  };

  function available() {
    return (
      enabled && !destroyed && !contextLost && !shaderFailed && !document.hidden
    );
  }

  function queueFrame() {
    if (!raf && available()) {
      const now = performance.now();
      if (pausedAt !== undefined) {
        if (categoryMotion) categoryMotion.started += now - pausedAt;
        if (homeEntry?.started !== undefined)
          homeEntry.started += now - pausedAt;
        pausedAt = undefined;
      }
      lastTime = now;
      raf = requestAnimationFrame(frame);
    }
  }

  function signalUnavailable() {
    if (unavailableSignalled) return;
    unavailableSignalled = true;
    ready = false;
    delete host.dataset.ready;
    host.dispatchEvent(new Event("gallery-unavailable"));
  }

  function stopMotion() {
    motionPlaying = false;
    for (const resource of resources.values()) resource.video?.pause();
  }

  function stop() {
    pausedAt ??= performance.now();
    cancelAnimationFrame(raf);
    raf = 0;
    velocity = 0;
    stopMotion();
  }

  function disposePlanes() {
    homeEntry = undefined;
    for (const plane of planes) {
      const { mesh } = plane;
      releaseCaption(plane);
      mesh.geometry.dispose();
      mesh.material.dispose();
      group.remove(mesh);
    }
    planes = [];
  }

  function releaseCaption(plane: Plane) {
    if (!plane.caption) return;
    plane.caption.geometry.dispose();
    plane.caption.material.dispose();
    plane.mesh.remove(plane.caption);
    plane.caption = undefined;
    captionTextures.get(plane.item.id)?.dispose();
    captionTextures.delete(plane.item.id);
  }

  function updateCaptions() {
    const nearbyIds = new Set(
      desiredResources.map((resource) => resource.item.id),
    );
    for (const plane of planes) {
      if (
        (view !== "photo" && view !== "video") ||
        !nearbyIds.has(plane.item.id) ||
        !plane.mesh.material.map
      ) {
        releaseCaption(plane);
        continue;
      }
      if (!plane.caption) {
        plane.caption = makeCaption(plane.item, plane.width, plane.height);
        if (plane.caption) plane.mesh.add(plane.caption);
      }
      if (plane.caption)
        plane.caption.material.opacity =
          labelOpacity * (categoryMotion ? plane.mesh.material.opacity : 1);
    }
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
    context.fillText(
      item.type === "video" ? "Film" : number.padStart(2, "0"),
      256,
      322,
    );
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

  function makeGeometry(
    item: GalleryItem,
    planeWidth: number,
    planeHeight: number,
    cover: boolean,
  ) {
    const geometry = new PlaneGeometry(planeWidth, planeHeight, 16, 16);
    const uv = geometry.attributes.uv;
    geometry.setAttribute("montiUv", uv.clone());
    const imageAspect = item.width / item.height;
    const planeAspect = planeWidth / planeHeight;
    const cropX = cover ? Math.min(1, planeAspect / imageAspect) : 1;
    const cropY = cover ? Math.min(1, imageAspect / planeAspect) : 1;
    for (let index = 0; index < uv.count; index++) {
      uv.setXY(
        index,
        0.5 + (uv.getX(index) - 0.5) * cropX,
        0.5 + (uv.getY(index) - 0.5) * cropY,
      );
    }
    geometry.computeBoundingSphere();
    return geometry;
  }

  function makePlane(
    item: GalleryItem,
    planeWidth: number,
    planeHeight: number,
    cover = false,
  ) {
    const geometry = makeGeometry(item, planeWidth, planeHeight, cover);
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
    // The reference deforms unit planes in strip views, but uses full-size
    // geometry on Home. Scale local offsets accordingly without CPU remeshing.
    const deformationScale = {
      value: new Vector2(
        view === "home" ? 1 : planeWidth,
        view === "home" ? 1 : planeHeight,
      ),
    };
    material.onBeforeCompile = (shader) => {
      shader.uniforms.montiSpeed = deformation.speed;
      shader.uniforms.montiVertical = deformation.vertical;
      shader.uniforms.montiStrength = deformation.strength;
      shader.uniforms.montiDepth = deformation.depth;
      shader.uniforms.montiScale = deformationScale;
      shader.vertexShader = shader.vertexShader
        .replace(
          "#include <common>",
          `
        #include <common>
        uniform float montiSpeed;
        uniform float montiVertical;
        uniform float montiStrength;
        uniform float montiDepth;
        uniform vec2 montiScale;
        attribute vec2 montiUv;
      `,
        )
        .replace(
          "#include <begin_vertex>",
          `
        #include <begin_vertex>
        vec3 montiWorld = (modelMatrix * vec4(transformed, 1.0)).xyz;
        if (montiVertical > 0.5) {
          transformed.x += montiStrength * (cos(montiWorld.y * 0.18) - 1.0) * montiScale.x;
          transformed.y -= sin(montiUv.x * PI) * montiSpeed * montiScale.y;
          transformed.z -= pow(abs(montiWorld.y), 1.25) * montiDepth;
        } else {
          transformed.x -= sin(montiUv.y * PI) * montiSpeed * montiScale.x;
          transformed.y += montiStrength * (cos(montiWorld.x * 0.18) - 1.0) * montiScale.y;
          transformed.z -= pow(abs(montiWorld.x), 1.25) * montiDepth;
        }
      `,
        );
    };
    material.customProgramCacheKey = () => "monti-gallery-scroll-v1";
    const mesh = new Mesh(geometry, material);
    group.add(mesh);
    const plane: Plane = {
      mesh,
      item,
      base: 0,
      height: planeHeight,
      width: planeWidth,
    };
    planes.push(plane);
    return plane;
  }

  function rebuild(animateHome = true) {
    disposePlanes();
    desiredResources = [];
    visibleIds = new Set();
    velocity = 0;
    offset = 0;
    group.position.set(0, 0, 0);
    group.rotation.set(0, 0, 0);

    if (view === "home") {
      activeItems = homePool;
      homeNextIndex = Math.min(12, homeItems.length);
      homeFrontSlots = new Set();
      camera.fov = 60;
      camera.near = 0.1;
      camera.far = 1000;
      camera.position.set(0, 0, 0);
      for (let slot = 0; slot < 12; slot++) {
        const item = homeItems[wrap(wrap(slot - 2, 12), homeItems.length)];
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
        plane.homePosition = new Vector3(x, y, z);
      }
      if (animateHome && !reducedMotion.matches) {
        homeEntry = {
          ordered: [...planes].sort(
            (a, b) =>
              b.homePosition!.y - a.homePosition!.y ||
              a.homePosition!.x - b.homePosition!.x,
          ),
        };
        for (const plane of homeEntry.ordered) {
          plane.mesh.position.y -= 0.08;
          plane.mesh.position.z -= 0.035;
          plane.mesh.scale.setScalar(0.99);
          plane.entryAlpha = plane.mesh.material.opacity = 0;
        }
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
      const compact = width <= 720;
      const unitsPerPixel =
        (2 *
          Math.tan(MathUtils.degToRad(camera.fov / 2)) *
          (camera.position.z - 0.35)) /
        height;
      const shortLandscape = compact && height <= 540 && width > height;
      const top = shortLandscape ? 72 : 228;
      const bottom = shortLandscape ? 24 : 140;
      const left = shortLandscape ? Math.min(250, width * 0.4) : 0;
      const right = shortLandscape ? 16 : 0;
      const bodyCenterX = (left + width - right) / 2;
      const bodyCenterY = (top + height - bottom) / 2;
      group.position.set(
        compact ? (bodyCenterX - width / 2) * unitsPerPixel : groupX,
        compact ? (height / 2 - bodyCenterY) * unitsPerPixel : 0,
        0.35,
      );
      group.rotation.set(
        compact ? 0.04 : 0.28,
        compact ? -0.01 : -0.02,
        compact ? -0.035 : -0.14,
      );
      const maxWidth = (width - left - right) * 0.74 * unitsPerPixel;
      const maxHeight =
        Math.max(100, height - top - bottom - 20) * unitsPerPixel;
      let previousHeight = 0;
      let y = 0;
      for (const [index, item] of activeItems.entries()) {
        const aspect = item.width / item.height;
        const itemWidth = compact
          ? Math.min(maxWidth, maxHeight * aspect)
          : planeWidth;
        const planeHeight = itemWidth / aspect;
        if (index > 0) y -= previousHeight / 2 + 0.08 + planeHeight / 2;
        const plane = makePlane(item, itemWidth, planeHeight);
        plane.base = y;
        previousHeight = planeHeight;
      }
      cycle = planes.reduce((sum, plane) => sum + plane.height + 0.08, 0);
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
      if (plane.mesh.material.map !== (map ?? null)) {
        plane.mesh.material.map = map ?? null;
        plane.mesh.material.opacity = map ? (plane.entryAlpha ?? 1) : 0;
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
          const isCurrent = () =>
            resources.get(resource.item.id) === resource &&
            resource.video === video &&
            available() &&
            !reducedMotion.matches &&
            planes.some(
              (plane) =>
                plane.item.id === resource.item.id &&
                plane.mesh.material.map &&
                isNearViewport(plane),
            );
          video
            .play()
            .then(() => {
              if (isCurrent()) queueFrame();
            })
            .catch((error: unknown) => {
              if (!isCurrent() || !video.paused) return;
              const name =
                typeof error === "object" && error !== null && "name" in error
                  ? error.name
                  : undefined;
              // Route changes, backgrounding and eviction intentionally cancel play().
              if (name === "AbortError" || video.error?.code === 1) return;
              if (
                name === "NotAllowedError" ||
                name === "NotSupportedError" ||
                video.error
              )
                video.dataset.playBlocked = "true";
            });
        }
        motionPlaying ||= !video.paused;
      }
    }
  }

  function finishHomeEntry() {
    if (!homeEntry) return;
    for (const plane of homeEntry.ordered) {
      plane.mesh.position.copy(plane.homePosition!);
      plane.mesh.scale.setScalar(1);
      plane.entryAlpha = 1;
      plane.mesh.material.opacity = plane.mesh.material.map ? 1 : 0;
    }
    homeEntry = undefined;
  }

  function animateHomeEntry(time: number) {
    if (!homeEntry) return;
    // Start on the first loaded viewport image, without waiting for the portfolio.
    if (homeEntry.started === undefined) {
      if (
        !planes.some(
          (plane) => plane.mesh.material.map && visibleIds.has(plane.item.id),
        )
      )
        return;
      homeEntry.started = time;
    }
    const elapsed = (time - homeEntry.started) / 1000;
    const stagger = 0.012;
    for (const [index, plane] of homeEntry.ordered.entries()) {
      const destination = plane.homePosition!;
      const move = easeOut(progress(elapsed, index * stagger, 0.4));
      const alpha =
        1 - (1 - progress(elapsed, index * stagger + 0.02, 0.32)) ** 3;
      plane.mesh.position.y = destination.y - 0.08 * (1 - move);
      plane.mesh.position.z = destination.z - 0.035 * (1 - move);
      plane.mesh.scale.setScalar(0.99 + 0.01 * move);
      plane.entryAlpha = alpha;
      plane.mesh.material.opacity = plane.mesh.material.map ? alpha : 0;
    }
    if (elapsed >= (homeEntry.ordered.length - 1) * stagger + 0.4)
      finishHomeEntry();
  }

  function recycleHomeSlots() {
    if (view !== "home") return;
    const lookX = 13.68 * Math.sin(yaw);
    const lookZ = 13.68 * Math.cos(yaw);
    const ranked = planes
      .map((plane, slot) => {
        const position = plane.homePosition ?? plane.mesh.position;
        return {
          slot,
          dot: position.x * lookX - 4 * position.y + position.z * lookZ,
        };
      })
      .sort((a, b) => b.dot - a.dot);
    const front = new Set(ranked.slice(0, 8).map((entry) => entry.slot));
    let replaced = 0;
    for (let order = 0; order < 12 && replaced < 4; order++) {
      const slot = (order + 9) % 12;
      if (!homeFrontSlots.has(slot) || front.has(slot)) continue;
      const plane = planes[slot];
      const item = homePool[wrap(homeNextIndex++, homePool.length)];
      plane.item = item;
      plane.width =
        MathUtils.clamp((8.1 * item.width) / item.height, 5.6, 9.9) * 0.94;
      plane.mesh.geometry.dispose();
      plane.mesh.geometry = makeGeometry(item, plane.width, plane.height, true);
      replaced++;
    }
    homeFrontSlots = front;
  }

  function resetCategoryMotion() {
    categoryMotion = undefined;
    canvas.style.filter = "";
    canvas.style.opacity = "";
    for (const plane of planes) {
      plane.mesh.scale.set(1, 1, 1);
      if (view === "photo") plane.mesh.position.y = 0;
      plane.mesh.material.opacity = plane.mesh.material.map ? 1 : 0;
    }
  }

  function beginCategoryMotion(target: string) {
    if (categoryMotion?.phase === "out") {
      categoryMotion.target = target;
      return;
    }
    resetCategoryMotion();
    stopMotion();
    velocity = 0;
    drag.id = -1;
    const ordered = planes.filter((plane) => isNearViewport(plane, 1.38));
    const end = Math.max(
      ordered.length ? (ordered.length - 1) * 0.015 + 0.16 : 0,
      0.16,
    );
    categoryMotion = {
      phase: "out",
      target,
      ordered,
      started: performance.now(),
      duration: end + 0.01,
    };
    queueFrame();
  }

  /** Returns true when the category swap rebuilt the current resource demand. */
  function animateCategory(time: number): boolean {
    const motion = categoryMotion;
    if (!motion) return false;
    const elapsed = (time - motion.started) / 1000;
    if (motion.phase === "out" && elapsed >= motion.duration) {
      category = motion.target;
      rebuild();
      const ordered = planes.filter((plane) => isNearViewport(plane, 1.38));
      const end = ordered.length ? (ordered.length - 1) * 0.015 + 0.22 : 0;
      categoryMotion = {
        phase: "in",
        target: category,
        ordered,
        started: time,
        duration: end + 0.02,
      };
      animateCategory(time);
      return true;
    }
    if (motion.phase === "in" && elapsed >= motion.duration) {
      resetCategoryMotion();
      return false;
    }
    for (const plane of planes) {
      const index = motion.ordered.indexOf(plane);
      let alpha = 1;
      if (motion.phase === "out") {
        alpha =
          index < 0 ? 0 : 1 - easeIn(progress(elapsed, index * 0.015, 0.16));
        plane.mesh.scale.setScalar(0.995 + 0.005 * alpha);
        plane.mesh.scale.z = 1;
        plane.mesh.position.y = 0.004 * (1 - alpha);
      } else if (index >= 0) {
        alpha = easeOut(progress(elapsed, index * 0.015, 0.22));
        plane.mesh.scale.set(0.98 + 0.02 * alpha, 0.98 + 0.02 * alpha, 1);
        plane.mesh.position.y = -0.004 * (1 - alpha);
      }
      plane.mesh.material.opacity = plane.mesh.material.map ? alpha : 0;
    }
    return false;
  }

  function pick(clientX: number, clientY: number) {
    if (categoryMotion) return;
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
    if (categoryMotion) velocity = 0;
    const decay = Math.pow(0.92, elapsed * 60);
    const displacement = (0.92 * velocity * (1 - decay)) / 0.08;
    velocity *= decay;
    if (Math.abs(velocity) < 0.02) velocity = 0;
    if (view === "home") yaw -= displacement * 0.005 * 0.5 * 0.253;
    else if (view === "detail") offset += displacement * 0.005 * 0.5;
    else if (activeItems.length > 1) offset -= displacement * 0.005 * 0.52;
    updatePositions();
    recycleHomeSlots();
    deformation.vertical.value = view === "home" || view === "detail" ? 1 : 0;
    deformation.strength.value =
      view === "home" ? 0.011 : view === "detail" ? 0.032 : 0.012;
    deformation.depth.value =
      view === "home" ? 0.005 : view === "detail" ? 0 : 0.02;
    deformation.speed.value = reducedMotion.matches
      ? 0
      : MathUtils.clamp(
          velocity *
            (view === "home"
              ? -0.000125
              : view === "detail"
                ? -0.00025
                : 0.00026),
          -0.012,
          0.012,
        );
    refreshResourceDemand();
    updateMaps();
    animateHomeEntry(time);
    if (animateCategory(time)) {
      refreshResourceDemand();
      updateMaps();
      animateCategory(time);
    }
    const speed = Math.abs(velocity);
    const labelTarget =
      reducedMotion.matches || speed <= 0.06
        ? 1
        : Math.max(0.85, 1 - speed / 120);
    labelOpacity +=
      (labelTarget - labelOpacity) * (1 - Math.pow(0.72, elapsed * 60));
    if (Math.abs(labelTarget - labelOpacity) < 0.001)
      labelOpacity = labelTarget;
    updateCaptions();
    updateMotion();
    renderer.render(scene, camera);

    if (
      !ready &&
      available() &&
      planes.some(
        (plane) =>
          plane.mesh.material.map &&
          plane.mesh.material.opacity > 0.1 &&
          visibleIds.has(plane.item.id),
      )
    ) {
      ready = true;
      host.dataset.ready = "true";
      host.dispatchEvent(new Event("gallery-ready"));
    }
    if (view === "detail" && callbacks.onActiveChange) {
      let nearest: Plane | undefined;
      let distance = Infinity;
      let focusX = 0;
      let focusY = 0;
      if (width <= 720) {
        group.getWorldPosition(projected).project(camera);
        focusX = projected.x;
        focusY = projected.y;
      }
      for (const plane of planes) {
        plane.mesh.getWorldPosition(projected).project(camera);
        const score =
          Math.abs(projected.y - focusY) +
          Math.abs(projected.x - focusX) * 0.25;
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
    if (
      !raf &&
      available() &&
      (velocity ||
        drag.id >= 0 ||
        motionPlaying ||
        categoryMotion ||
        homeEntry?.started !== undefined ||
        Math.abs(labelTarget - labelOpacity) > 0.001)
    )
      raf = requestAnimationFrame(frame);
  }

  function addVelocity(amount: number) {
    if (!available() || categoryMotion) return;
    velocity = MathUtils.clamp(velocity + amount, -90, 90);
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
    if (categoryMotion) category = categoryMotion.target;
    resetCategoryMotion();
    rebuild(!planes.length);
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
      addVelocity(delta * unit * 0.09);
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
        pickedId: pick(event.clientX, event.clientY)?.item.id ?? "",
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
          addVelocity(amount * 0.1575);
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
    if (drag.moved) clickBlockedUntil = performance.now() + 250;
    const selected =
      !drag.moved &&
      available() &&
      performance.now() >= clickBlockedUntil &&
      event.type === "pointerup"
        ? pick(event.clientX, event.clientY)
        : undefined;
    if (canvas.hasPointerCapture(event.pointerId))
      canvas.releasePointerCapture(event.pointerId);
    drag.id = -1;
    canvas.style.cursor = selected ? "pointer" : "grab";
    if (selected && selected.item.id === drag.pickedId)
      callbacks.onSelect(selected.item.id);
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
      unavailableSignalled = false;
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
      if (reducedMotion.matches) {
        finishHomeEntry();
        labelOpacity = 1;
        if (categoryMotion) {
          category = categoryMotion.target;
          resetCategoryMotion();
          rebuild();
        }
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

  function disposeVideo(resource: Resource) {
    if (resource.video) {
      resource.video.pause();
      if (resource.onLoadedData)
        resource.video.removeEventListener("loadeddata", resource.onLoadedData);
      resource.video.removeAttribute("src");
      resource.video.load();
    }
    resource.motion?.dispose();
    resource.video = undefined;
    resource.motion = undefined;
    resource.onLoadedData = undefined;
  }

  function prepareVideo(resource: Resource) {
    if (resource.item.type !== "video" || resource.video) return;
    const video = document.createElement("video");
    video.muted = true;
    video.loop = true;
    video.playsInline = true;
    video.preload = "none";
    video.src = resource.item.src;
    resource.video = video;
    resource.onLoadedData = () => {
      if (destroyed || resource.video !== video) return;
      resource.onLoadedData = undefined;
      resource.motion = new VideoTexture(video);
      resource.motion.colorSpace = SRGBColorSpace;
      updateMaps();
      queueFrame();
    };
    video.addEventListener("loadeddata", resource.onLoadedData, { once: true });
  }

  function trimPosterCache() {
    const loaded = [...resources.values()].filter(
      (resource) => resource.poster,
    );
    const evictable = loaded
      .filter((resource) => !visibleIds.has(resource.item.id))
      .sort((a, b) => a.lastUsed - b.lastUsed);
    let count = loaded.length;
    for (const resource of evictable) {
      if (count <= posterLimit) break;
      resource.poster!.dispose();
      resource.poster = undefined;
      disposeVideo(resource);
      count--;
    }
    // If a very wide viewport shows over 18 images, keep those visible images.
    updateMaps();
  }

  function checkVisibleFailure() {
    if (!visibleIds.size || unavailableSignalled) return;
    if ([...visibleIds].every((id) => resources.get(id)?.failed))
      signalUnavailable();
  }

  function refreshResourceDemand() {
    viewport.setFromProjectionMatrix(
      viewProjection.multiplyMatrices(
        camera.projectionMatrix,
        camera.matrixWorldInverse,
      ),
    );
    const ranked = planes
      .map((plane) => {
        const nearby = isNearViewport(plane, 2.5);
        return {
          id: plane.item.id,
          visible: viewport.intersectsObject(plane.mesh),
          nearby,
          distance: Math.abs(projected.x) + Math.abs(projected.y),
        };
      })
      .filter((entry) => entry.visible || entry.nearby)
      .sort(
        (a, b) =>
          Number(b.visible) - Number(a.visible) || a.distance - b.distance,
      );
    visibleIds = new Set(
      ranked.filter((entry) => entry.visible).map((entry) => entry.id),
    );
    const seen = new Set<string>();
    desiredResources = [];
    for (const entry of ranked) {
      if (seen.has(entry.id)) continue;
      seen.add(entry.id);
      desiredResources.push(resources.get(entry.id)!);
      if (desiredResources.length >= Math.max(posterLimit, visibleIds.size))
        break;
    }
    for (let index = desiredResources.length - 1; index >= 0; index--)
      desiredResources[index].lastUsed = ++accessClock;
    trimPosterCache();
    pumpLoads();
    checkVisibleFailure();
  }

  function pumpLoads() {
    if (!available()) return;
    while (requestsInFlight < 3) {
      const resource = desiredResources.find(
        (entry) => !entry.poster && !entry.loading && !entry.failed,
      );
      if (!resource) break;
      resource.loading = true;
      requestsInFlight++;
      void loadResource(resource);
    }
  }

  async function loadResource(resource: Resource) {
    try {
      const source =
        resource.item.type === "video"
          ? (resource.item.poster ?? resource.item.previewSrc)
          : (resource.item.previewSrc ?? resource.item.src);
      if (!source) throw new Error("Missing gallery preview.");
      const texture = await textureLoader.loadAsync(source);
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
      prepareVideo(resource);
      trimPosterCache();
      queueFrame();
    } catch {
      resource.failed = true;
    } finally {
      resource.loading = false;
      requestsInFlight--;
      if (!destroyed) {
        pumpLoads();
        checkVisibleFailure();
      }
    }
  }

  return {
    setView(nextView, options = {}) {
      if (destroyed) return;
      if (nextView === "home" && view === "home" && enabled) {
        queueFrame();
        return;
      }
      const nextCategory = (options.category ?? "all").toLowerCase();
      if (
        nextView === "photo" &&
        view === "photo" &&
        nextCategory !== category &&
        ready &&
        available() &&
        !reducedMotion.matches
      ) {
        beginCategoryMotion(nextCategory);
        return;
      }
      resetCategoryMotion();
      stopMotion();
      drag.id = -1;
      view = nextView;
      category = nextCategory;
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
        finishHomeEntry();
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
        disposeVideo(resource);
      }
      renderer.dispose();
      canvas.remove();
      delete host.dataset.ready;
    },
  };
}
