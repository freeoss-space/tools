(() => {
  const $ = (s, c = document) => c.querySelector(s);
  const $$ = (s, c = document) => [...c.querySelectorAll(s)];

  // Theme toggle
  const toggle = $('.theme-toggle');
  const saved = localStorage.getItem('aquadrive-theme');
  if (saved) document.documentElement.dataset.theme = saved;

  function updateToggleLabel() {
    const isDark = document.documentElement.dataset.theme === 'dark';
    toggle.textContent = isDark ? 'Light mode' : 'Dark mode';
  }
  updateToggleLabel();

  toggle.addEventListener('click', () => {
    const isDark = document.documentElement.dataset.theme === 'dark';
    document.documentElement.dataset.theme = isDark ? 'light' : 'dark';
    localStorage.setItem('aquadrive-theme', document.documentElement.dataset.theme);
    updateToggleLabel();
  });

  // Copy hex on swatch click
  const toast = $('.toast');
  let toastTimer;

  function showToast(msg) {
    toast.textContent = msg;
    toast.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => toast.classList.remove('show'), 1800);
  }

  $$('.swatch-card').forEach(card => {
    card.addEventListener('click', () => {
      const chip = card.querySelector('.hex-chip');
      if (!chip) return;
      const hex = chip.textContent.trim();
      navigator.clipboard.writeText(hex).then(() => {
        showToast(`Copied ${hex}`);
      });
    });
  });

  $$('.tier').forEach(tier => {
    tier.style.cursor = 'pointer';
    tier.addEventListener('click', () => {
      const text = tier.textContent.trim();
      const match = text.match(/#[A-Fa-f0-9]{6}/);
      if (!match) return;
      navigator.clipboard.writeText(match[0]).then(() => {
        showToast(`Copied ${match[0]}`);
      });
    });
  });
})();
