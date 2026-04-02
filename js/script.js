
  /* ----------------------------------------------------------------
     CONFIGURATION — Modifiez ces valeurs si nécessaire
  ---------------------------------------------------------------- */
  const CONFIG = {
    START_H: 15, START_M: 29,   // Heure de début du culte
    END_H:   18, END_M: 30,     // Heure de fin du culte
    DAY_OF_WEEK: 0,             // 0 = Dimanche
  };

  /* ----------------------------------------------------------------
     ÉTAT GLOBAL
  ---------------------------------------------------------------- */
  let prevState  = null;  // 'countdown' | 'live'
  let prevValues = { j:'', h:'', m:'', s:'' };

  /* ================================================================
     CANVAS BACKGROUND — Particules flottantes
  ================================================================ */
  (function initCanvas() {
    const canvas = document.getElementById('bg-canvas');
    const ctx    = canvas.getContext('2d');
    let   W, H, particles = [];

    function resize() {
      W = canvas.width  = window.innerWidth;
      H = canvas.height = window.innerHeight;
    }

    function Particle() {
      this.reset();
    }

    Particle.prototype.reset = function() {
      this.x     = Math.random() * W;
      this.y     = Math.random() * H;
      this.r     = Math.random() * 1.8 + 0.4;
      this.alpha = Math.random() * 0.4 + 0.05;
      this.vx    = (Math.random() - 0.5) * 0.25;
      this.vy    = -Math.random() * 0.4 - 0.1;
      this.color = Math.random() > 0.7 ? '#ff8c00' : '#ffffff';
    };

    Particle.prototype.update = function() {
      this.x += this.vx;
      this.y += this.vy;
      this.alpha -= 0.0003;
      if (this.y < -10 || this.alpha <= 0) this.reset();
    };

    function init() {
      particles = Array.from({ length: 90 }, () => new Particle());
    }

    function draw() {
      ctx.clearRect(0, 0, W, H);

      /* Gradient de fond doux */
      const g = ctx.createRadialGradient(W/2, H/2, 0, W/2, H/2, Math.max(W,H)*0.75);
      g.addColorStop(0,   'rgba(30,18,0,1)');
      g.addColorStop(0.5, 'rgba(12,8,0,1)');
      g.addColorStop(1,   'rgba(0,0,0,1)');
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, W, H);

      /* Halo central orange */
      const halo = ctx.createRadialGradient(W/2, H*0.38, 0, W/2, H*0.38, W*0.55);
      halo.addColorStop(0,   'rgba(255,140,0,0.07)');
      halo.addColorStop(1,   'rgba(255,140,0,0)');
      ctx.fillStyle = halo;
      ctx.fillRect(0, 0, W, H);

      /* Particules */
      particles.forEach(p => {
        p.update();
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.globalAlpha = p.alpha;
        ctx.fillStyle   = p.color;
        ctx.fill();
      });
      ctx.globalAlpha = 1;

      requestAnimationFrame(draw);
    }

    resize();
    init();
    draw();
    window.addEventListener('resize', () => { resize(); init(); });
  })();

  /* ================================================================
     CALCUL DU TEMPS
  ================================================================ */
  function getNextCulte() {
    const now = new Date();
    const day = now.getDay(); // 0=dim … 6=sam

    // Trouver le prochain dimanche
    let daysUntilSunday = (CONFIG.DAY_OF_WEEK - day + 7) % 7;
    if (daysUntilSunday === 0) {
      // On est dimanche — vérifier si le culte est passé
      const startMin = CONFIG.START_H * 60 + CONFIG.START_M;
      const nowMin   = now.getHours() * 60 + now.getMinutes();
      if (nowMin >= CONFIG.END_H * 60 + CONFIG.END_M) {
        daysUntilSunday = 7; // Culte terminé → dimanche prochain
      }
    }

    const next = new Date(now);
    next.setDate(now.getDate() + daysUntilSunday);
    next.setHours(CONFIG.START_H, CONFIG.START_M, 0, 0);
    return next;
  }

  function isLive() {
    const now  = new Date();
    const day  = now.getDay();
    if (day !== CONFIG.DAY_OF_WEEK) return false;
    const nowMin   = now.getHours() * 60 + now.getMinutes();
    const startMin = CONFIG.START_H * 60 + CONFIG.START_M;
    const endMin   = CONFIG.END_H   * 60 + CONFIG.END_M;
    return nowMin >= startMin && nowMin < endMin;
  }

  function getLiveProgress() {
    const now      = new Date();
    const nowMin   = now.getHours() * 60 + now.getMinutes() + now.getSeconds() / 60;
    const startMin = CONFIG.START_H * 60 + CONFIG.START_M;
    const endMin   = CONFIG.END_H   * 60 + CONFIG.END_M;
    const pct = ((nowMin - startMin) / (endMin - startMin)) * 100;
    return Math.min(Math.max(pct, 0), 100);
  }

  /* ================================================================
     MISE À JOUR DE L'UI
  ================================================================ */
  function pad(n) { return String(n).padStart(2, '0'); }

  function setVal(id, cardId, val, isLiveMode) {
    const el   = document.getElementById(id);
    const card = document.getElementById(cardId);
    if (el && el.textContent !== val) {
      el.classList.remove('flash');
      void el.offsetWidth; // force reflow
      el.classList.add('flash');
      el.textContent = val;
    }
    if (card) {
      card.classList.toggle('live-card', isLiveMode);
    }
  }

  function updateUI() {
    const live = isLive();
    const state = live ? 'live' : 'countdown';

    /* --- Transition vers LIVE → effet WOW --- */
    if (state !== prevState && state === 'live') {
      triggerWow();
      playSound();
    }
    prevState = state;

    /* --- Mode LIVE --- */
    if (live) {
      // Calculer la durée du culte restante
      const now    = new Date();
      const endTs  = new Date();
      endTs.setHours(CONFIG.END_H, CONFIG.END_M, 0, 0);
      let diff = Math.max(0, Math.floor((endTs - now) / 1000));

      const h = Math.floor(diff / 3600);          diff -= h * 3600;
      const m = Math.floor(diff / 60);            diff -= m * 60;
      const s = diff;

      setVal('val-j', 'card-j', '🔴', true);
      setVal('val-h', 'card-h', pad(h), true);
      setVal('val-m', 'card-m', pad(m), true);
      setVal('val-s', 'card-s', pad(s), true);

      document.getElementById('countdownLabel').textContent = 'Temps restant';
      document.getElementById('nextDate').textContent       = '';

      // Badge
      const badge = document.getElementById('statusBadge');
      badge.classList.add('live');
      document.getElementById('statusText').textContent = '🔴 Culte en cours';

      // Bannière live
      document.getElementById('liveBanner').classList.add('visible');
      document.getElementById('liveProgressBar').style.width = getLiveProgress().toFixed(2) + '%';

      // Cacher grille en mode live (afficher infos simplifiées)
      document.getElementById('countdownGrid').style.opacity = '0.35';

    } else {
      /* --- Mode COUNTDOWN --- */
      const next = getNextCulte();
      const now  = new Date();
      let   diff = Math.max(0, Math.floor((next - now) / 1000));

      const j = Math.floor(diff / 86400);        diff -= j * 86400;
      const h = Math.floor(diff / 3600);         diff -= h * 3600;
      const m = Math.floor(diff / 60);           diff -= m * 60;
      const s = diff;

      setVal('val-j', 'card-j', pad(j), false);
      setVal('val-h', 'card-h', pad(h), false);
      setVal('val-m', 'card-m', pad(m), false);
      setVal('val-s', 'card-s', pad(s), false);

      // Highlight l'unité la plus active
      ['card-j','card-h','card-m','card-s'].forEach(id => {
        document.getElementById(id).classList.remove('active');
      });
      if (j === 0 && h > 0)       document.getElementById('card-h').classList.add('active');
      else if (j === 0 && h === 0) document.getElementById('card-m').classList.add('active');
      else                         document.getElementById('card-j').classList.add('active');

      // document.getElementById('countdownLabel').textContent = 'Prochain culte dans';

      // Date formatée
      const opts = { weekday:'long', day:'numeric', month:'long' };
      const dateStr = next.toLocaleDateString('fr-FR', opts);
      // document.getElementById('nextDate').innerHTML =
      //   `<strong>${dateStr}</strong> à 15h29`;

      // Badge
      const badge = document.getElementById('statusBadge');
      badge.classList.remove('live');
      // document.getElementById('statusText').textContent = 'Prochain Culte';

      // Cacher bannière live
      document.getElementById('liveBanner').classList.remove('visible');
      document.getElementById('countdownGrid').style.opacity = '1';
    }
  }

  /* ================================================================
     EFFET WOW (transition vers LIVE)
  ================================================================ */
  function triggerWow() {
    const ov = document.getElementById('wow-overlay');
    ov.classList.remove('burst');
    void ov.offsetWidth;
    ov.classList.add('burst');
  }

  /* ================================================================
     GESTION DU SON
  ================================================================ */
  let audioCtx      = null;
  let soundUnlocked = false;
  let soundPlayed   = false;

  function createBellSound() {
    if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();

    const dur = 3; // secondes
    const buf = audioCtx.createBuffer(1, audioCtx.sampleRate * dur, audioCtx.sampleRate);
    const ch  = buf.getChannelData(0);

    // Cloche synthétisée : fondamentale + harmoniques
    const freqs    = [440, 880, 1320, 1760];
    const amps     = [1,   0.5,  0.25, 0.12];
    const decays   = [3,   2.5,  2,    1.5];

    for (let i = 0; i < ch.length; i++) {
      let t = i / audioCtx.sampleRate;
      let v = 0;
      freqs.forEach((f, k) => {
        v += amps[k] * Math.sin(2 * Math.PI * f * t) * Math.exp(-decays[k] * t);
      });
      ch[i] = v;
    }

    const src = audioCtx.createBufferSource();
    src.buffer = buf;

    // Compresseur doux
    const comp = audioCtx.createDynamicsCompressor();
    comp.threshold.value = -20;
    comp.ratio.value     = 4;

    src.connect(comp);
    comp.connect(audioCtx.destination);
    src.start();

    // Répéter 3 fois avec délai
    for (let ring = 1; ring < 3; ring++) {
      setTimeout(() => {
        if (!audioCtx) return;
        const src2 = audioCtx.createBufferSource();
        src2.buffer = buf;
        src2.connect(comp);
        comp.connect(audioCtx.destination);
        src2.start();
      }, ring * 1400);
    }
  }

  function playSound() {
    if (soundPlayed) return;
    soundPlayed = true;

    try {
      if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();

      if (audioCtx.state === 'suspended') {
        audioCtx.resume().then(() => {
          createBellSound();
          soundUnlocked = true;
        }).catch(() => showSoundBtn());
      } else {
        createBellSound();
        soundUnlocked = true;
      }
    } catch (e) {
      showSoundBtn();
    }
  }

  function showSoundBtn() {
    document.getElementById('soundBtn').classList.add('visible');
  }

  function unlockSound() {
    document.getElementById('soundBtn').classList.remove('visible');
    if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    audioCtx.resume().then(() => {
      createBellSound();
      soundUnlocked = true;
    });
  }

  /* Déverrouillage au premier clic n'importe où */
  document.addEventListener('click', () => {
    if (!soundUnlocked && audioCtx && audioCtx.state === 'suspended') {
      audioCtx.resume();
    }
  }, { once: true });

  /* Pré-créer le contexte audio dès l'interaction utilisateur */
  document.addEventListener('touchstart', () => {
    if (!audioCtx) {
      audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    }
  }, { once: true });

  /* ================================================================
     DÉMARRAGE
  ================================================================ */
  updateUI(); // Premier rendu immédiat
  setInterval(updateUI, 1000); // Mise à jour toutes les secondes

  /* Réinitialiser soundPlayed au changement d'état (dimanche suivant) */
  setInterval(() => {
    if (!isLive()) soundPlayed = false;
  }, 60000);