/**
 * PowerUPS - Sistema de Animación de Carga de Procesos
 * Utiliza la animación Lottie personalizada provista por el usuario.
 */

(function () {
  // Asegurar que Lottie esté cargado
  function ensureLottie(callback) {
    if (window.lottie) {
      callback();
      return;
    }
    const script = document.createElement('script');
    script.src = 'assets/js/lottie.min.js';
    script.onload = () => callback();
    script.onerror = () => {
      const cdnScript = document.createElement('script');
      cdnScript.src = 'https://cdnjs.cloudflare.com/ajax/libs/lottie-web/5.12.2/lottie.min.js';
      cdnScript.onload = () => callback();
      cdnScript.onerror = () => {
        console.warn('[ProcessLoader] No se pudo cargar lottie-web ni local ni desde CDN');
      };
      document.head.appendChild(cdnScript);
    };
    document.head.appendChild(script);
  }

  // Datos de la animación Lottie
  let animationData = null;

  async function getAnimationData() {
    if (animationData) return animationData;
    const paths = ['assets/animations/process-loader.json', '/assets/animations/process-loader.json'];
    for (const p of paths) {
      try {
        const res = await fetch(p);
        if (res.ok) {
          animationData = await res.json();
          return animationData;
        }
      } catch (e) {}
    }
    return null;
  }

  // Elementos del Overlay Global
  let overlayEl = null;
  let animContainerEl = null;
  let textEl = null;
  let subtextEl = null;
  let activeLottieAnim = null;
  let showCount = 0;

  function createOverlay() {
    if (overlayEl) return;

    overlayEl = document.createElement('div');
    overlayEl.id = 'powerups-process-loader-overlay';
    overlayEl.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      width: 100vw;
      height: 100vh;
      background: rgba(15, 23, 42, 0.65);
      backdrop-filter: blur(6px);
      -webkit-backdrop-filter: blur(6px);
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 999999;
      opacity: 0;
      pointer-events: none;
      transition: opacity 0.25s ease;
    `;

    const card = document.createElement('div');
    card.style.cssText = `
      background: #ffffff;
      border-radius: 18px;
      padding: 24px 32px 28px 32px;
      width: 90%;
      max-width: 320px;
      box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.35), 0 0 0 1px rgba(255, 255, 255, 0.1);
      display: flex;
      flex-direction: column;
      align-items: center;
      text-align: center;
      transform: scale(0.92);
      transition: transform 0.25s cubic-bezier(0.16, 1, 0.3, 1);
    `;

    animContainerEl = document.createElement('div');
    animContainerEl.id = 'powerups-loader-lottie-box';
    animContainerEl.style.cssText = `
      width: 72px;
      height: 114px;
      margin: 0 auto 12px auto;
      display: flex;
      align-items: center;
      justify-content: center;
    `;

    textEl = document.createElement('div');
    textEl.style.cssText = `
      font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
      font-size: 15px;
      font-weight: 800;
      color: #0f172a;
      letter-spacing: -0.2px;
      margin-bottom: 4px;
    `;
    textEl.textContent = 'Procesando...';

    subtextEl = document.createElement('div');
    subtextEl.style.cssText = `
      font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
      font-size: 12px;
      color: #64748b;
      line-height: 1.4;
    `;
    subtextEl.textContent = 'Por favor espera un momento';

    card.appendChild(animContainerEl);
    card.appendChild(textEl);
    card.appendChild(subtextEl);
    overlayEl.appendChild(card);
    document.body.appendChild(overlayEl);
  }

  const ProcessLoader = {
    /**
     * Muestra el loader de proceso con animación personalizada
     * @param {string} message Mensaje principal (ej: 'Guardando precio...')
     * @param {string} submessage Mensaje secundario descriptivo
     */
    show: function (message = 'Procesando...', submessage = 'Por favor espera un momento') {
      showCount++;
      createOverlay();

      textEl.textContent = message;
      if (submessage) {
        subtextEl.textContent = submessage;
        subtextEl.style.display = 'block';
      } else {
        subtextEl.style.display = 'none';
      }

      overlayEl.style.pointerEvents = 'all';
      overlayEl.style.opacity = '1';
      const card = overlayEl.firstElementChild;
      if (card) card.style.transform = 'scale(1)';

      ensureLottie(async () => {
        if (!activeLottieAnim && animContainerEl && window.lottie) {
          const data = await getAnimationData();
          if (data) {
            animContainerEl.innerHTML = '';
            activeLottieAnim = window.lottie.loadAnimation({
              container: animContainerEl,
              renderer: 'svg',
              loop: true,
              autoplay: true,
              animationData: data
            });
          } else {
            animContainerEl.innerHTML = '';
            activeLottieAnim = window.lottie.loadAnimation({
              container: animContainerEl,
              renderer: 'svg',
              loop: true,
              autoplay: true,
              path: '/assets/animations/process-loader.json'
            });
          }
        } else if (activeLottieAnim) {
          activeLottieAnim.play();
        }
      });
    },

    /**
     * Oculta el loader
     * @param {boolean} force Si es true, fuerza el cierre ignorando contador
     */
    hide: function (force = false) {
      if (force) {
        showCount = 0;
      } else {
        showCount = Math.max(0, showCount - 1);
      }

      if (showCount === 0 && overlayEl) {
        overlayEl.style.opacity = '0';
        overlayEl.style.pointerEvents = 'none';
        const card = overlayEl.firstElementChild;
        if (card) card.style.transform = 'scale(0.92)';
      }
    },

    /**
     * Envuelve una función asíncrona o promesa mostrando el loader automáticamente
     */
    wrap: async function (asyncFn, message = 'Procesando...', submessage = '') {
      ProcessLoader.show(message, submessage);
      const startTime = Date.now();
      try {
        const result = typeof asyncFn === 'function' ? await asyncFn() : await asyncFn;
        const elapsed = Date.now() - startTime;
        if (elapsed < 350) {
          await new Promise(r => setTimeout(r, 350 - elapsed));
        }
        return result;
      } finally {
        ProcessLoader.hide();
      }
    },

    /**
     * Renderiza la animación dentro de un contenedor en línea (ej: tabla o tarjeta)
     * @param {HTMLElement} container 
     * @param {Object} options { width, height, text }
     */
    renderInline: function (container, options = {}) {
      if (!container) return null;
      const w = options.width || 56;
      const h = options.height || 88;
      const text = options.text || 'Cargando datos...';

      container.innerHTML = `
        <div style="display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 28px 16px;">
          <div class="inline-lottie-box" style="width: ${w}px; height: ${h}px; margin-bottom: 10px;"></div>
          <div style="font-size: 13px; font-weight: 700; color: #475569;">${text}</div>
        </div>
      `;

      const box = container.querySelector('.inline-lottie-box');
      ensureLottie(async () => {
        const data = await getAnimationData();
        if (window.lottie && box) {
          if (data) {
            window.lottie.loadAnimation({
              container: box,
              renderer: 'svg',
              loop: true,
              autoplay: true,
              animationData: data
            });
          } else {
            window.lottie.loadAnimation({
              container: box,
              renderer: 'svg',
              loop: true,
              autoplay: true,
              path: '/assets/animations/process-loader.json'
            });
          }
        }
      });
    },

    /**
     * Inicializa automáticamente todos los contenedores con el atributo data-process-loader
     */
    initPlaceholders: function () {
      document.querySelectorAll('[data-process-loader]').forEach(el => {
        const text = el.getAttribute('data-process-loader') || 'Cargando...';
        ProcessLoader.renderInline(el, { text });
      });
    }
  };

  // Exponer globalmente
  window.ProcessLoader = ProcessLoader;

  // Precargar Lottie e inicializar placeholders al cargar la página
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
      ensureLottie(() => {
        getAnimationData().then(() => {
          ProcessLoader.initPlaceholders();
        });
      });
    });
  } else {
    ensureLottie(() => {
      getAnimationData().then(() => {
        ProcessLoader.initPlaceholders();
      });
    });
  }
})();
