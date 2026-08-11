const header = document.querySelector("[data-header]");

const setHeaderState = () => {
  header?.classList.toggle("is-scrolled", window.scrollY > 8);
};

setHeaderState();
window.addEventListener("scroll", setHeaderState, { passive: true });

// Homepage module reveal: titles fade in first, then cards rise in sequence.
const homeMain = document.querySelector(".hero-showcase")?.closest("main");
const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)");

const loadLazyVideo = (video) => {
  if (!video || video.dataset.videoLoaded === "true") return;

  if (video.dataset.src) {
    video.src = video.dataset.src;
    video.removeAttribute("data-src");
  }

  video.querySelectorAll("source[data-src]").forEach((source) => {
    source.src = source.dataset.src;
    source.removeAttribute("data-src");
  });

  if (!video.getAttribute("src")) {
    const source = video.querySelector("source[src]");
    if (!source) return;
  }

  video.dataset.videoLoaded = "true";
  video.load();

  if (video.autoplay && !reduceMotion.matches) {
    video.play().catch(() => {});
  }
};

const lazyVideos = document.querySelectorAll("[data-lazy-video]");
if (lazyVideos.length) {
  window.addEventListener("load", () => {
    lazyVideos.forEach((video) => {
      const rect = video.getBoundingClientRect();
      const nearViewport = rect.top < window.innerHeight + 160 && rect.bottom > -160;
      if (nearViewport) loadLazyVideo(video);
    });
  }, { once: true });

  if ("IntersectionObserver" in window) {
    const videoObserver = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        loadLazyVideo(entry.target);
        videoObserver.unobserve(entry.target);
      });
    }, { rootMargin: "360px 0px", threshold: 0.01 });

    lazyVideos.forEach((video) => videoObserver.observe(video));
  } else {
    lazyVideos.forEach(loadLazyVideo);
  }
}

const heroVideo = document.querySelector("[data-hero-video]");
if (heroVideo && !reduceMotion.matches) {
  const dissolveSeconds = 1.1;
  const dissolveMs = dissolveSeconds * 1000;
  const heroGhostVideo = heroVideo.cloneNode(true);
  let isHeroVideoDissolving = false;
  let heroLoopTimer;

  heroGhostVideo.removeAttribute("data-hero-video");
  heroGhostVideo.removeAttribute("aria-label");
  heroGhostVideo.setAttribute("aria-hidden", "true");
  heroGhostVideo.autoplay = false;
  heroGhostVideo.loop = false;
  heroGhostVideo.classList.add("is-dissolve-ghost");
  heroVideo.after(heroGhostVideo);

  const setHeroVideoPace = () => {
    heroVideo.playbackRate = 1;
    heroVideo.loop = false;
    heroGhostVideo.loop = false;
    heroGhostVideo.load();
    heroGhostVideo.pause();
    heroVideo.play().catch(() => {});
  };

  if (heroVideo.readyState >= 1) {
    setHeroVideoPace();
  } else {
    heroVideo.addEventListener("loadedmetadata", setHeroVideoPace, { once: true });
  }

  heroLoopTimer = window.setInterval(() => {
    if (!Number.isFinite(heroVideo.duration) || heroVideo.duration <= dissolveSeconds + 0.4 || isHeroVideoDissolving) return;

    if (heroVideo.currentTime >= heroVideo.duration - dissolveSeconds) {
      isHeroVideoDissolving = true;
      heroGhostVideo.currentTime = 0.04;
      heroGhostVideo.play().catch(() => {});
      window.requestAnimationFrame(() => {
        heroGhostVideo.classList.add("is-visible");
      });

      window.setTimeout(() => {
        heroVideo.currentTime = Math.max(0.04, heroGhostVideo.currentTime);
        heroVideo.play().catch(() => {});
        heroGhostVideo.classList.remove("is-visible");

        window.setTimeout(() => {
          heroGhostVideo.pause();
          heroGhostVideo.currentTime = 0;
          isHeroVideoDissolving = false;
        }, dissolveMs);
      }, dissolveMs);
    }
  }, 45);

  window.addEventListener("pagehide", () => window.clearInterval(heroLoopTimer), { once: true });
}

if (homeMain && "IntersectionObserver" in window && !reduceMotion.matches) {
  const revealSequences = [
    { trigger: ".category-section", titles: [".category-topline", ".category-heading"], cards: [".signal-band .category-card", ".category-footer"] },
    { trigger: ".work-section", titles: [".section-heading"], cards: [".featured-case"] },
    { trigger: ".case-grid", cards: [".case-card"] },
    { trigger: ".graphic-section", titles: [".section-heading"], cards: [".graphic-feature"] },
    { trigger: ".graphic-grid", cards: [".graphic-card"] },
    { trigger: ".about-section", titles: [".about-intro"], cards: [".about-portrait", ".about-capabilities section", ".about-quote"] },
    { trigger: ".resume-section", titles: [".resume-copy"], cards: [".resume-visual"] },
    { trigger: ".contact-section", titles: [":scope > div"], cards: [".contact-list a"] },
  ];

  const preparedSequences = revealSequences.map((sequence) => {
    const trigger = homeMain.querySelector(sequence.trigger);
    if (!trigger) return null;

    const titles = (sequence.titles || []).flatMap((selector) => [...trigger.querySelectorAll(selector)]);
    const cards = (sequence.cards || []).flatMap((selector) => [...trigger.querySelectorAll(selector)]);

    titles.forEach((element, index) => {
      element.classList.add("reveal-title");
      element.style.setProperty("--reveal-title-order", index);
    });

    cards.forEach((element, index) => {
      element.classList.add("reveal-card");
      element.style.setProperty("--reveal-order", index);
      element.style.setProperty("--reveal-start", titles.length ? "180ms" : "0ms");
    });

    return { trigger, titles, cards };
  }).filter(Boolean);

  const revealObserver = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (!entry.isIntersecting) return;

      const sequence = preparedSequences.find((item) => item.trigger === entry.target);
      sequence?.titles.forEach((title) => title.classList.add("is-revealed"));
      sequence?.cards.forEach((card) => {
        const finishReveal = (event) => {
          if (event.target !== card || event.propertyName !== "transform") return;
          card.classList.add("is-reveal-complete");
          card.removeEventListener("transitionend", finishReveal);
        };
        card.addEventListener("transitionend", finishReveal);
        card.classList.add("is-revealed");
      });

      revealObserver.unobserve(entry.target);
    });
  }, { rootMargin: "0px 0px -12%", threshold: 0.08 });

  preparedSequences.forEach(({ trigger }) => revealObserver.observe(trigger));
}

document.querySelectorAll('a[href^="#"]').forEach((link) => {
  link.addEventListener("click", (event) => {
    const hash = link.getAttribute("href");
    if (!hash || hash.length <= 1) return;

    const target = document.querySelector(hash);
    if (!target) return;

    event.preventDefault();
    target.scrollIntoView({ behavior: "smooth", block: "start" });
  });
});

const caseDetailPattern = /(?:repair-case|shoumi-case|shoumi-backend|visualization-case|industrial-case|brand-case|visual-communication-case|ppt-info-design-case)\.html/i;

const getCaseReturnUrl = (link) => {
  const source = link.closest("[id]") || document.querySelector("main[id]");
  const url = new URL(window.location.href);

  if (source?.id) url.hash = source.id;
  return url.href;
};

document.querySelectorAll("a[href]").forEach((link) => {
  link.addEventListener("click", (event) => {
    if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;

    const rawHref = link.getAttribute("href");
    if (!rawHref || !caseDetailPattern.test(rawHref)) return;

    const targetUrl = new URL(rawHref, window.location.href);
    const sameFileOrigin = targetUrl.protocol === "file:" && window.location.protocol === "file:";
    if (targetUrl.origin !== window.location.origin && !sameFileOrigin) return;

    const returnUrl = getCaseReturnUrl(link);
    window.sessionStorage.setItem(`case-return-url:${targetUrl.pathname}`, returnUrl);
    targetUrl.searchParams.set("from", returnUrl);
    targetUrl.searchParams.set("fromY", String(Math.round(window.scrollY)));
    link.href = targetUrl.href;
  });
});

const restoreCaseReturnScroll = () => {
  const saved = window.sessionStorage.getItem("case-return-scroll");
  if (!saved) return;

  try {
    const { url, y } = JSON.parse(saved);
    if (url && new URL(url, window.location.href).pathname !== window.location.pathname) return;

    window.sessionStorage.removeItem("case-return-scroll");
    const top = Number(y) || 0;
    const restore = () => window.scrollTo({ top, behavior: "auto" });

    restore();
    window.requestAnimationFrame(restore);
    window.setTimeout(restore, 180);
    window.setTimeout(restore, 600);
  } catch {
    window.sessionStorage.removeItem("case-return-scroll");
  }
};

restoreCaseReturnScroll();

const caseBack = document.querySelector("[data-case-back]");

caseBack?.addEventListener("click", () => {
  const fallback = caseBack.dataset.caseBackFallback || "portfolio.html#ui-work";

  if (caseBack.hasAttribute("data-case-back-static")) {
    window.location.href = fallback;
    return;
  }

  const params = new URLSearchParams(window.location.search);
  const returnTo =
    params.get("from") ||
    window.sessionStorage.getItem(`case-return-url:${window.location.pathname}`);
  const returnY = params.get("fromY");

  if (returnTo) {
    if (returnY !== null) {
      window.sessionStorage.setItem("case-return-scroll", JSON.stringify({ url: returnTo, y: returnY }));
    }
    window.location.replace(returnTo);
    return;
  }

  if (document.referrer) {
    const referrerUrl = new URL(document.referrer);
    const currentUrl = new URL(window.location.href);
    const canUseReferrer =
      referrerUrl.origin === currentUrl.origin &&
      referrerUrl.pathname !== currentUrl.pathname;

    if (canUseReferrer) {
      window.location.href = referrerUrl.href;
      return;
    }
  }

  const hasPreviousPage = window.history.length > 1;

  if (hasPreviousPage) {
    const currentUrl = window.location.href;
    window.history.back();
    window.setTimeout(() => {
      if (window.location.href === currentUrl) window.location.href = fallback;
    }, 450);
    return;
  }

  window.location.href = fallback;
});

const contactModal = document.querySelector("[data-contact-modal]");
const contactOpenButtons = document.querySelectorAll("[data-contact-open]");
const contactClose = document.querySelector("[data-contact-close]");
let lastContactOpen = null;

const openContactModal = (event) => {
  lastContactOpen = event?.currentTarget || null;
  contactModal?.classList.add("is-open");
  contactModal?.setAttribute("aria-hidden", "false");
  document.body.style.overflow = "hidden";
  contactClose?.focus();
};

const closeContactModal = () => {
  contactModal?.classList.remove("is-open");
  contactModal?.setAttribute("aria-hidden", "true");
  document.body.style.overflow = "";
  lastContactOpen?.focus();
};

contactOpenButtons.forEach((button) => button.addEventListener("click", openContactModal));
contactClose?.addEventListener("click", closeContactModal);

contactModal?.addEventListener("click", (event) => {
  if (event.target === contactModal) closeContactModal();
});

document.addEventListener("keydown", (event) => {
  if (event.key === "Escape" && contactModal?.classList.contains("is-open")) {
    closeContactModal();
  }
});

const vizClock = document.querySelector("[data-clock]");
if (vizClock) {
  const updateVizClock = () => {
    vizClock.textContent = new Intl.DateTimeFormat("zh-CN", {
      hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: false,
    }).format(new Date());
  };
  updateVizClock();
  window.setInterval(updateVizClock, 1000);
}

const vizCounters = document.querySelectorAll("[data-counter]");
if (vizCounters.length) {
  const animateCounter = (element) => {
    const target = Number(element.dataset.counter);
    const startedAt = performance.now();
    const duration = 1600;
    const tick = (now) => {
      const progress = Math.min((now - startedAt) / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      element.textContent = Math.round(target * eased).toLocaleString("en-US");
      if (progress < 1) requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  };
  const counterObserver = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (!entry.isIntersecting) return;
      animateCounter(entry.target);
      counterObserver.unobserve(entry.target);
    });
  }, { threshold: 0.45 });
  vizCounters.forEach((counter) => counterObserver.observe(counter));
}

const caseProgress = document.querySelector("[data-case-progress]");
if (caseProgress) {
  const updateCaseProgress = () => {
    const scrollable = document.documentElement.scrollHeight - window.innerHeight;
    const progress = scrollable > 0 ? Math.min(window.scrollY / scrollable, 1) : 0;
    caseProgress.style.transform = `scaleX(${progress})`;
  };
  updateCaseProgress();
  window.addEventListener("scroll", updateCaseProgress, { passive: true });
}

const launchPage = document.querySelector("[data-launch-page]");
if (launchPage) {
  const launchEntries = [
    {
      kicker: "个人设计空间 · 探索开始",
      title: "探索复杂世界的<br>设计语言",
      copy: "进入完整个人网站，浏览界面项目、平面作品、案例复盘、简历与联系方式。",
      action: "进入作品集",
      href: "portfolio.html",
      status: "了解更多",
      startAction: "View Portfolio",
      theme: "",
    },
    {
      kicker: "预留入口 · 视觉实验室",
      title: "动态与形式的<br>视觉实验",
      copy: "这里将用于展示视觉实验、动态设计、智能图像探索和更自由的创意方向。",
      action: "探索实验",
      href: "visual-lab.html",
      status: "已开放入口",
      startAction: "Explore Lab",
      theme: "",
    },
    {
      kicker: "预留入口 · 关于我",
      title: "个人设计经历<br>与创作介绍",
      copy: "这里将作为更完整的个人介绍、合作方式、经历线索和长期个人品牌入口。",
      action: "即将开放",
      href: "#",
      status: "即将开放",
      startAction: "Coming Soon",
      theme: "",
    },
  ];

  const launchChoiceButtons = document.querySelectorAll("[data-launch-choice], [data-launch-nav]");
  const launchMobileChoiceButtons = document.querySelectorAll("[data-launch-mobile-choice]");
  const launchKicker = document.querySelector("[data-launch-kicker]");
  const launchTitle = document.querySelector("[data-launch-title]");
  const launchCopy = document.querySelector("[data-launch-copy]");
  const launchAction = document.querySelector("[data-launch-action]");
  const launchStatus = document.querySelector("[data-launch-status]");
  const launchStartButton = document.querySelector(".launch-start-button");
  const launchMenuButton = document.querySelector("[data-launch-menu]");
  const launchMobileMenu = document.querySelector("[data-launch-mobile-menu]");
  const launchGalaxyCanvas = document.querySelector("[data-galaxy]");
  let launchActiveIndex = 0;
  let launchTransitioning = false;
  const launchGalaxyPresets = [
    { hueShift: 240, density: 1.5, glow: 0.5, saturation: 0.8 },
    { hueShift: 240, density: 1.5, glow: 0.5, saturation: 0.8 },
    { hueShift: 240, density: 1.5, glow: 0.5, saturation: 0.8 },
  ];
  let startGalaxyEffect = () => {};

  const closeLaunchMenu = () => {
    launchMenuButton?.classList.remove("is-open");
    launchMenuButton?.setAttribute("aria-expanded", "false");
    launchMobileMenu?.classList.remove("is-open");
    launchMobileMenu?.setAttribute("aria-hidden", "true");
  };

  const setLaunchEntry = (index) => {
    if (index === launchActiveIndex || launchTransitioning) return;

    const entry = launchEntries[index];
    if (!entry) return;

    launchTransitioning = true;
    launchActiveIndex = index;

    launchChoiceButtons.forEach((button) => {
      const buttonIndex = Number(button.dataset.launchChoice ?? button.dataset.launchNav);
      button.classList.toggle("is-active", buttonIndex === index);
    });

    launchKicker.textContent = entry.kicker;
    launchTitle.innerHTML = entry.title;
    launchCopy.textContent = entry.copy;
    launchAction.textContent = entry.action;
    launchAction.setAttribute("href", entry.href);
    launchAction.toggleAttribute("aria-disabled", entry.href === "#");
    launchStatus.textContent = entry.status;
    if (launchStartButton) {
      launchStartButton.textContent = entry.startAction || entry.action;
      launchStartButton.setAttribute("href", entry.href);
      launchStartButton.toggleAttribute("aria-disabled", entry.href === "#");
    }
    document.body.dataset.launchTheme = entry.theme;
    startGalaxyEffect();
    closeLaunchMenu();

    window.setTimeout(() => {
      launchTransitioning = false;
    }, 260);
  };

  launchChoiceButtons.forEach((button) => {
    button.addEventListener("click", () => {
      const index = Number(button.dataset.launchChoice ?? button.dataset.launchNav);
      setLaunchEntry(index);
    });
  });

  launchMobileChoiceButtons.forEach((button) => {
    button.addEventListener("click", () => {
      setLaunchEntry(Number(button.dataset.launchMobileChoice));
    });
  });

  const launchEntryAliases = {
    "#portfolio": 0,
    "#visual-lab": 1,
    "#visual-experiment": 1,
    "#about": 2,
  };

  const syncLaunchEntryFromHash = () => {
    const index = launchEntryAliases[window.location.hash.toLowerCase()];
    if (Number.isInteger(index)) setLaunchEntry(index);
  };

  syncLaunchEntryFromHash();
  window.addEventListener("hashchange", syncLaunchEntryFromHash);

  launchAction?.addEventListener("click", (event) => {
    if (launchAction.getAttribute("href") === "#") event.preventDefault();
  });

  launchMenuButton?.addEventListener("click", () => {
    const isOpen = !launchMobileMenu?.classList.contains("is-open");
    launchMenuButton.classList.toggle("is-open", isOpen);
    launchMenuButton.setAttribute("aria-expanded", String(isOpen));
    launchMobileMenu?.classList.toggle("is-open", isOpen);
    launchMobileMenu?.setAttribute("aria-hidden", String(!isOpen));
  });

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape") closeLaunchMenu();
  });

  if (launchGalaxyCanvas) {
    const gl = launchGalaxyCanvas.getContext("webgl", {
      alpha: true,
      antialias: false,
      premultipliedAlpha: false,
      powerPreference: "high-performance",
    });

    if (gl) {
      const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      const mouseTarget = { x: 0.5, y: 0.5, active: 0 };
      const mouseSmooth = { x: 0.5, y: 0.5, active: 0 };
      let raf = 0;
      let isGalaxyRunning = false;
      let startedAt = performance.now();

      const vertexShaderSource = `
        attribute vec2 aPosition;
        varying vec2 vUv;
        void main() {
          vUv = aPosition * 0.5 + 0.5;
          gl_Position = vec4(aPosition, 0.0, 1.0);
        }
      `;

      const fragmentShaderSource = `
        precision highp float;

        uniform float uTime;
        uniform vec3 uResolution;
        uniform vec2 uFocal;
        uniform vec2 uRotation;
        uniform float uStarSpeed;
        uniform float uDensity;
        uniform float uHueShift;
        uniform float uSpeed;
        uniform vec2 uMouse;
        uniform float uGlowIntensity;
        uniform float uSaturation;
        uniform bool uMouseRepulsion;
        uniform float uTwinkleIntensity;
        uniform float uRotationSpeed;
        uniform float uRepulsionStrength;
        uniform float uMouseActiveFactor;
        uniform float uAutoCenterRepulsion;
        uniform bool uTransparent;

        varying vec2 vUv;

        #define NUM_LAYER 3.0
        #define STAR_COLOR_CUTOFF 0.2
        #define MAT45 mat2(0.7071, -0.7071, 0.7071, 0.7071)
        #define PERIOD 3.0

        float Hash21(vec2 p) {
          p = fract(p * vec2(123.34, 456.21));
          p += dot(p, p + 45.32);
          return fract(p.x * p.y);
        }

        float tri(float x) {
          return abs(fract(x) * 2.0 - 1.0);
        }

        float tris(float x) {
          float t = fract(x);
          return 1.0 - smoothstep(0.0, 1.0, abs(2.0 * t - 1.0));
        }

        float trisn(float x) {
          float t = fract(x);
          return 2.0 * (1.0 - smoothstep(0.0, 1.0, abs(2.0 * t - 1.0))) - 1.0;
        }

        vec3 hsv2rgb(vec3 c) {
          vec4 K = vec4(1.0, 2.0 / 3.0, 1.0 / 3.0, 3.0);
          vec3 p = abs(fract(c.xxx + K.xyz) * 6.0 - K.www);
          return c.z * mix(K.xxx, clamp(p - K.xxx, 0.0, 1.0), c.y);
        }

        float Star(vec2 uv, float flare) {
          float d = length(uv);
          float m = (0.05 * uGlowIntensity) / d;
          float rays = smoothstep(0.0, 1.0, 1.0 - abs(uv.x * uv.y * 1000.0));
          m += rays * flare * uGlowIntensity;
          uv *= MAT45;
          rays = smoothstep(0.0, 1.0, 1.0 - abs(uv.x * uv.y * 1000.0));
          m += rays * 0.3 * flare * uGlowIntensity;
          m *= smoothstep(1.0, 0.2, d);
          return m;
        }

        vec3 StarLayer(vec2 uv) {
          vec3 col = vec3(0.0);
          vec2 gv = fract(uv) - 0.5;
          vec2 id = floor(uv);

          for (int y = -1; y <= 1; y++) {
            for (int x = -1; x <= 1; x++) {
              vec2 offset = vec2(float(x), float(y));
              vec2 si = id + vec2(float(x), float(y));
              float seed = Hash21(si);
              float size = fract(seed * 345.32);
              float glossLocal = tri(uStarSpeed / (PERIOD * seed + 1.0));
              float flareSize = smoothstep(0.9, 1.0, size) * glossLocal;

              float red = smoothstep(STAR_COLOR_CUTOFF, 1.0, Hash21(si + 1.0)) + STAR_COLOR_CUTOFF;
              float blu = smoothstep(STAR_COLOR_CUTOFF, 1.0, Hash21(si + 3.0)) + STAR_COLOR_CUTOFF;
              float grn = min(red, blu) * seed;
              vec3 base = vec3(red, grn, blu);

              float hue = atan(base.g - base.r, base.b - base.r) / (2.0 * 3.14159) + 0.5;
              hue = fract(hue + uHueShift / 360.0);
              float sat = length(base - vec3(dot(base, vec3(0.299, 0.587, 0.114)))) * uSaturation;
              float val = max(max(base.r, base.g), base.b);
              base = hsv2rgb(vec3(hue, sat, val));

              vec2 pad = vec2(
                tris(seed * 34.0 + uTime * uSpeed / 10.0),
                tris(seed * 38.0 + uTime * uSpeed / 30.0)
              ) - 0.5;

              float star = Star(gv - offset - pad, flareSize);
              float twinkle = trisn(uTime * uSpeed + seed * 6.2831) * 0.5 + 1.0;
              twinkle = mix(1.0, twinkle, uTwinkleIntensity);
              star *= twinkle;
              col += star * size * base;
            }
          }
          return col;
        }

        void main() {
          vec2 focalPx = uFocal * uResolution.xy;
          vec2 uv = (vUv * uResolution.xy - focalPx) / uResolution.y;
          vec2 mouseNorm = uMouse - vec2(0.5);

          if (uAutoCenterRepulsion > 0.0) {
            vec2 centerUV = vec2(0.0, 0.0);
            float centerDist = length(uv - centerUV);
            vec2 repulsion = normalize(uv - centerUV) * (uAutoCenterRepulsion / (centerDist + 0.1));
            uv += repulsion * 0.05;
          } else if (uMouseRepulsion) {
            vec2 mousePosUV = (uMouse * uResolution.xy - focalPx) / uResolution.y;
            float mouseDist = length(uv - mousePosUV);
            vec2 repulsion = normalize(uv - mousePosUV) * (uRepulsionStrength / (mouseDist + 0.1));
            uv += repulsion * 0.05 * uMouseActiveFactor;
          } else {
            vec2 mouseOffset = mouseNorm * 0.1 * uMouseActiveFactor;
            uv += mouseOffset;
          }

          float autoRotAngle = uTime * uRotationSpeed;
          mat2 autoRot = mat2(cos(autoRotAngle), -sin(autoRotAngle), sin(autoRotAngle), cos(autoRotAngle));
          uv = autoRot * uv;
          uv = mat2(uRotation.x, -uRotation.y, uRotation.y, uRotation.x) * uv;

          vec3 col = vec3(0.0);
          for (float i = 0.0; i < 1.0; i += 1.0 / NUM_LAYER) {
            float depth = fract(i + uStarSpeed * uSpeed);
            float scale = mix(20.0 * uDensity, 0.5 * uDensity, depth);
            float fade = depth * smoothstep(1.0, 0.9, depth);
            col += StarLayer(uv * scale + i * 453.32) * fade;
          }

          if (uTransparent) {
            float alpha = length(col);
            alpha = smoothstep(0.0, 0.3, alpha);
            alpha = min(alpha, 1.0);
            gl_FragColor = vec4(col, alpha);
          } else {
            gl_FragColor = vec4(col, 1.0);
          }
        }
      `;

      const makeShader = (type, source) => {
        const shader = gl.createShader(type);
        gl.shaderSource(shader, source);
        gl.compileShader(shader);
        if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
          console.warn(gl.getShaderInfoLog(shader));
          gl.deleteShader(shader);
          return null;
        }
        return shader;
      };

      const vertexShader = makeShader(gl.VERTEX_SHADER, vertexShaderSource);
      const fragmentShader = makeShader(gl.FRAGMENT_SHADER, fragmentShaderSource);
      const program = gl.createProgram();

      if (vertexShader && fragmentShader && program) {
        gl.attachShader(program, vertexShader);
        gl.attachShader(program, fragmentShader);
        gl.linkProgram(program);

        if (gl.getProgramParameter(program, gl.LINK_STATUS)) {
          const positionBuffer = gl.createBuffer();
          gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
          gl.bufferData(
            gl.ARRAY_BUFFER,
            new Float32Array([-1, -1, 1, -1, -1, 1, -1, 1, 1, -1, 1, 1]),
            gl.STATIC_DRAW
          );

          const locations = {
            position: gl.getAttribLocation(program, "aPosition"),
            time: gl.getUniformLocation(program, "uTime"),
            resolution: gl.getUniformLocation(program, "uResolution"),
            focal: gl.getUniformLocation(program, "uFocal"),
            rotation: gl.getUniformLocation(program, "uRotation"),
            starSpeed: gl.getUniformLocation(program, "uStarSpeed"),
            density: gl.getUniformLocation(program, "uDensity"),
            hueShift: gl.getUniformLocation(program, "uHueShift"),
            speed: gl.getUniformLocation(program, "uSpeed"),
            mouse: gl.getUniformLocation(program, "uMouse"),
            glowIntensity: gl.getUniformLocation(program, "uGlowIntensity"),
            saturation: gl.getUniformLocation(program, "uSaturation"),
            mouseRepulsion: gl.getUniformLocation(program, "uMouseRepulsion"),
            twinkleIntensity: gl.getUniformLocation(program, "uTwinkleIntensity"),
            rotationSpeed: gl.getUniformLocation(program, "uRotationSpeed"),
            repulsionStrength: gl.getUniformLocation(program, "uRepulsionStrength"),
            mouseActiveFactor: gl.getUniformLocation(program, "uMouseActiveFactor"),
            autoCenterRepulsion: gl.getUniformLocation(program, "uAutoCenterRepulsion"),
            transparent: gl.getUniformLocation(program, "uTransparent"),
          };

          const resizeGalaxy = () => {
            const rect = launchGalaxyCanvas.getBoundingClientRect();
            const scale = 0.86;
            const width = Math.max(1, Math.round(rect.width * scale));
            const height = Math.max(1, Math.round(rect.height * scale));
            launchGalaxyCanvas.width = width;
            launchGalaxyCanvas.height = height;
            gl.viewport(0, 0, width, height);
            gl.useProgram(program);
            gl.uniform3f(locations.resolution, width, height, width / height);
          };

          const renderGalaxy = (now) => {
            mouseSmooth.x += (mouseTarget.x - mouseSmooth.x) * 0.05;
            mouseSmooth.y += (mouseTarget.y - mouseSmooth.y) * 0.05;
            mouseSmooth.active += (mouseTarget.active - mouseSmooth.active) * 0.05;

            const elapsed = (now - startedAt) / 1000;
            const preset = launchGalaxyPresets[launchActiveIndex] || launchGalaxyPresets[0];

            gl.useProgram(program);
            gl.clearColor(0, 0, 0, 0);
            gl.clear(gl.COLOR_BUFFER_BIT);
            gl.enable(gl.BLEND);
            gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
            gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
            gl.enableVertexAttribArray(locations.position);
            gl.vertexAttribPointer(locations.position, 2, gl.FLOAT, false, 0, 0);

            gl.uniform1f(locations.time, elapsed);
            gl.uniform2f(locations.focal, 0.5, 0.5);
            gl.uniform2f(locations.rotation, 1.0, 0.0);
            gl.uniform1f(locations.starSpeed, elapsed * 0.05);
            gl.uniform1f(locations.density, preset.density);
            gl.uniform1f(locations.hueShift, preset.hueShift);
            gl.uniform1f(locations.speed, 1.0);
            gl.uniform2f(locations.mouse, mouseSmooth.x, mouseSmooth.y);
            gl.uniform1f(locations.glowIntensity, preset.glow);
            gl.uniform1f(locations.saturation, preset.saturation);
            gl.uniform1i(locations.mouseRepulsion, 1);
            gl.uniform1f(locations.twinkleIntensity, 0.3);
            gl.uniform1f(locations.rotationSpeed, 0.1);
            gl.uniform1f(locations.repulsionStrength, 2.0);
            gl.uniform1f(locations.mouseActiveFactor, mouseSmooth.active);
            gl.uniform1f(locations.autoCenterRepulsion, 0.0);
            gl.uniform1i(locations.transparent, 1);

            gl.drawArrays(gl.TRIANGLES, 0, 6);

            if (!prefersReducedMotion) raf = window.requestAnimationFrame(renderGalaxy);
          };

          startGalaxyEffect = () => {
            if (prefersReducedMotion) {
              renderGalaxy(performance.now());
              return;
            }
            if (isGalaxyRunning) return;
            isGalaxyRunning = true;
            raf = window.requestAnimationFrame(renderGalaxy);
          };

          launchPage.addEventListener("pointermove", (event) => {
            const rect = launchPage.getBoundingClientRect();
            mouseTarget.x = (event.clientX - rect.left) / (rect.width || 1);
            mouseTarget.y = 1 - (event.clientY - rect.top) / (rect.height || 1);
            mouseTarget.active = 1;
          });

          launchPage.addEventListener("pointerleave", () => {
            mouseTarget.active = 0;
          });

          window.addEventListener("resize", resizeGalaxy);
          resizeGalaxy();
          startGalaxyEffect();
          window.addEventListener("pagehide", () => {
            if (raf) window.cancelAnimationFrame(raf);
          });
        } else {
          console.warn(gl.getProgramInfoLog(program));
        }
      }
    }
  }

}

const exploreRailLinks = [...document.querySelectorAll("[data-rail-target]")];
if (exploreRailLinks.length) {
  const exploreRail = document.querySelector(".explore-side-rail");
  const exploreBackTop = document.querySelector("[data-explore-back-top]");
  const exploreRailSections = exploreRailLinks
    .map((link) => document.getElementById(link.dataset.railTarget))
    .filter(Boolean);

  const setExploreRailActive = (id) => {
    exploreRailLinks.forEach((link) => {
      const isActive = link.dataset.railTarget === id;
      link.classList.toggle("is-active", isActive);
      if (isActive) {
        link.setAttribute("aria-current", "true");
      } else {
        link.removeAttribute("aria-current");
      }
    });
  };

  const syncExploreRail = () => {
    const checkpoint = window.innerHeight * 0.42;
    const hero = document.getElementById("top");
    const showAfter = hero ? Math.max(120, hero.offsetHeight - window.innerHeight * 0.28) : window.innerHeight * 0.72;
    exploreRail?.classList.toggle("is-visible", window.scrollY >= showAfter);
    exploreBackTop?.classList.toggle("is-visible", window.scrollY >= showAfter);
    const current = exploreRailSections.reduce((active, section) => {
      const rect = section.getBoundingClientRect();
      return rect.top <= checkpoint ? section : active;
    }, exploreRailSections[0]);

    if (current?.id) setExploreRailActive(current.id);
  };

  syncExploreRail();
  window.addEventListener("scroll", syncExploreRail, { passive: true });
  window.addEventListener("resize", syncExploreRail);
}
