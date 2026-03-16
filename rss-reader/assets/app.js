/* ==============================
   RSS Reader – App Logic
   ============================== */

const CORS_PROXIES = [
  url => `https://api.allorigins.win/raw?url=${encodeURIComponent(url)}`,
  url => `https://corsproxy.io/?${encodeURIComponent(url)}`,
];

// ── State ──────────────────────────────────────────────
const Store = {
  _key: 'rss-reader-data',
  _default: {
    feeds: [],        // { id, url, title, folder, siteUrl }
    articles: [],     // { id, feedId, title, link, date, image, snippet, read }
    readLists: [{ id: 'read-later', name: 'Read Later', items: [] }],
    folders: [],
  },
  load() {
    try {
      const raw = localStorage.getItem(this._key);
      const data = raw ? JSON.parse(raw) : null;
      if (!data) return { ...this._default };
      return {
        feeds: data.feeds || [],
        articles: data.articles || [],
        readLists: data.readLists || [{ id: 'read-later', name: 'Read Later', items: [] }],
        folders: data.folders || [],
      };
    } catch { return { ...this._default }; }
  },
  save(state) {
    localStorage.setItem(this._key, JSON.stringify(state));
  }
};

let state = Store.load();
let currentView = { type: 'all' }; // { type: 'all' | 'feed' | 'folder' | 'readlist', id: string }
let sidebarFilter = 'all'; // 'all' | 'unread'
let pendingFeedData = null;

// ── CORS Fetch Helper ──────────────────────────────────
async function corsFetch(url) {
  // Try direct first
  try {
    const r = await fetch(url, { mode: 'cors' });
    if (r.ok) return await r.text();
  } catch {}
  // Try proxies
  for (const proxy of CORS_PROXIES) {
    try {
      const r = await fetch(proxy(url));
      if (r.ok) return await r.text();
    } catch {}
  }
  throw new Error('Failed to fetch URL');
}

// ── Feed Discovery ─────────────────────────────────────
async function discoverFeeds(url) {
  if (!/^https?:\/\//i.test(url)) url = 'https://' + url;
  const text = await corsFetch(url);

  // Check if this is already a feed
  const feedFromXml = parseFeedXml(text, url);
  if (feedFromXml) {
    return [{ url, title: feedFromXml.title || url, type: 'direct' }];
  }

  // Parse as HTML and look for link[rel] feed references
  const parser = new DOMParser();
  const doc = parser.parseFromString(text, 'text/html');
  const links = doc.querySelectorAll(
    'link[type="application/rss+xml"], link[type="application/atom+xml"], link[type="application/feed+json"]'
  );
  const results = [];
  const base = new URL(url);
  links.forEach(link => {
    const href = link.getAttribute('href');
    if (href) {
      const feedUrl = new URL(href, base).href;
      results.push({ url: feedUrl, title: link.getAttribute('title') || feedUrl, type: link.getAttribute('type') });
    }
  });
  // Common paths fallback
  if (results.length === 0) {
    const common = ['/feed', '/feed.xml', '/rss', '/rss.xml', '/atom.xml', '/index.xml'];
    for (const path of common) {
      try {
        const testUrl = new URL(path, base).href;
        const t = await corsFetch(testUrl);
        const f = parseFeedXml(t, testUrl);
        if (f) {
          results.push({ url: testUrl, title: f.title || testUrl, type: 'discovered' });
          break;
        }
      } catch {}
    }
  }
  return results;
}

function parseFeedXml(text, url) {
  try {
    const parser = new DOMParser();
    const doc = parser.parseFromString(text, 'text/xml');
    if (doc.querySelector('parsererror')) return null;

    // RSS 2.0
    const channel = doc.querySelector('channel');
    if (channel) {
      return {
        title: channel.querySelector('title')?.textContent || '',
        siteUrl: channel.querySelector('link')?.textContent || url,
        items: parseRssItems(doc)
      };
    }
    // Atom
    const feed = doc.querySelector('feed');
    if (feed) {
      return {
        title: feed.querySelector('title')?.textContent || '',
        siteUrl: feed.querySelector('link[rel="alternate"]')?.getAttribute('href') ||
                 feed.querySelector('link')?.getAttribute('href') || url,
        items: parseAtomItems(doc)
      };
    }
    return null;
  } catch { return null; }
}

function parseRssItems(doc) {
  const items = [];
  doc.querySelectorAll('item').forEach(item => {
    const enclosure = item.querySelector('enclosure[type^="image"]');
    const mediaContent = item.getElementsByTagNameNS('http://search.yahoo.com/mrss/', 'content');
    const mediaThumbnail = item.getElementsByTagNameNS('http://search.yahoo.com/mrss/', 'thumbnail');
    let image = enclosure?.getAttribute('url') || '';
    if (!image && mediaContent.length) image = mediaContent[0].getAttribute('url') || '';
    if (!image && mediaThumbnail.length) image = mediaThumbnail[0].getAttribute('url') || '';
    // Try to find og:image in description/content
    if (!image) {
      const content = item.querySelector('description')?.textContent || '';
      const match = content.match(/<img[^>]+src=["']([^"']+)["']/i);
      if (match) image = match[1];
    }
    if (!image) {
      const encoded = item.getElementsByTagNameNS('http://purl.org/rss/1.0/modules/content/', 'encoded');
      if (encoded.length) {
        const match = encoded[0].textContent.match(/<img[^>]+src=["']([^"']+)["']/i);
        if (match) image = match[1];
      }
    }
    const desc = item.querySelector('description')?.textContent || '';
    const snippet = desc.replace(/<[^>]*>/g, '').trim().slice(0, 200);

    items.push({
      title: item.querySelector('title')?.textContent || 'Untitled',
      link: item.querySelector('link')?.textContent || '',
      date: item.querySelector('pubDate')?.textContent || '',
      image,
      snippet,
    });
  });
  return items;
}

function parseAtomItems(doc) {
  const items = [];
  doc.querySelectorAll('entry').forEach(entry => {
    const link = entry.querySelector('link[rel="alternate"]')?.getAttribute('href') ||
                 entry.querySelector('link')?.getAttribute('href') || '';
    let image = '';
    const mediaThumbnail = entry.getElementsByTagNameNS('http://search.yahoo.com/mrss/', 'thumbnail');
    const mediaContent = entry.getElementsByTagNameNS('http://search.yahoo.com/mrss/', 'content');
    if (mediaThumbnail.length) image = mediaThumbnail[0].getAttribute('url') || '';
    if (!image && mediaContent.length) image = mediaContent[0].getAttribute('url') || '';
    if (!image) {
      const content = entry.querySelector('content')?.textContent || entry.querySelector('summary')?.textContent || '';
      const match = content.match(/<img[^>]+src=["']([^"']+)["']/i);
      if (match) image = match[1];
    }
    const summary = entry.querySelector('summary')?.textContent || entry.querySelector('content')?.textContent || '';
    const snippet = summary.replace(/<[^>]*>/g, '').trim().slice(0, 200);

    items.push({
      title: entry.querySelector('title')?.textContent || 'Untitled',
      link,
      date: entry.querySelector('published')?.textContent || entry.querySelector('updated')?.textContent || '',
      image,
      snippet,
    });
  });
  return items;
}

// ── Sync ───────────────────────────────────────────────
function parseArticleDate(dateStr) {
  if (!dateStr) return new Date().toISOString();
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return new Date().toISOString();
    return d.toISOString();
  } catch { return new Date().toISOString(); }
}

function addFeedArticles(feed, parsed) {
  let newCount = 0;
  for (const item of parsed.items) {
    const artId = hashId(feed.id + item.link + item.title);
    if (!state.articles.find(a => a.id === artId)) {
      state.articles.push({
        id: artId,
        feedId: feed.id,
        title: item.title,
        link: item.link,
        date: parseArticleDate(item.date),
        image: item.image,
        snippet: item.snippet,
        read: false,
      });
      newCount++;
    }
  }
  return newCount;
}

async function syncAllFeeds() {
  const btn = document.getElementById('btn-sync');
  btn.classList.add('syncing');
  let newCount = 0;

  for (const feed of state.feeds) {
    try {
      const text = await corsFetch(feed.url);
      const parsed = parseFeedXml(text, feed.url);
      if (!parsed) continue;
      newCount += addFeedArticles(feed, parsed);
    } catch (e) {
      console.warn(`Failed to sync ${feed.title}:`, e);
    }
  }

  Store.save(state);
  btn.classList.remove('syncing');
  renderAll();
  showToast(newCount ? `${newCount} new article${newCount > 1 ? 's' : ''}` : 'All up to date');
}

async function syncSingleFeed(feed) {
  const btn = document.getElementById('btn-sync');
  btn.classList.add('syncing');
  let newCount = 0;

  try {
    const text = await corsFetch(feed.url);
    const parsed = parseFeedXml(text, feed.url);
    if (parsed) {
      newCount = addFeedArticles(feed, parsed);
      Store.save(state);
    }
  } catch (e) {
    console.warn(`Failed to sync ${feed.title}:`, e);
  }

  btn.classList.remove('syncing');
  renderAll();
  if (newCount) showToast(`${newCount} new article${newCount > 1 ? 's' : ''}`);
}

function hashId(str) {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = ((hash << 5) - hash) + str.charCodeAt(i);
    hash |= 0;
  }
  return 'art_' + Math.abs(hash).toString(36);
}

// ── OPML ───────────────────────────────────────────────
function exportOpml() {
  const folders = {};
  state.feeds.forEach(f => {
    const folder = f.folder || 'Uncategorized';
    if (!folders[folder]) folders[folder] = [];
    folders[folder].push(f);
  });
  let opml = '<?xml version="1.0" encoding="UTF-8"?>\n<opml version="2.0">\n<head><title>RSS Reader Export</title></head>\n<body>\n';
  for (const [folder, feeds] of Object.entries(folders)) {
    opml += `  <outline text="${escXml(folder)}">\n`;
    feeds.forEach(f => {
      opml += `    <outline type="rss" text="${escXml(f.title)}" xmlUrl="${escXml(f.url)}" htmlUrl="${escXml(f.siteUrl || '')}"/>\n`;
    });
    opml += '  </outline>\n';
  }
  opml += '</body>\n</opml>';

  const blob = new Blob([opml], { type: 'application/xml' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = 'feeds.opml';
  a.click();
  URL.revokeObjectURL(a.href);
}

function importOpml(text) {
  const parser = new DOMParser();
  const doc = parser.parseFromString(text, 'text/xml');
  let count = 0;
  doc.querySelectorAll('outline[xmlUrl]').forEach(outline => {
    const url = outline.getAttribute('xmlUrl');
    if (!url || state.feeds.find(f => f.url === url)) return;
    const folder = outline.parentElement?.getAttribute('text') || 'Uncategorized';
    state.feeds.push({
      id: 'feed_' + Date.now().toString(36) + '_' + Math.random().toString(36).slice(2, 6),
      url,
      title: outline.getAttribute('text') || outline.getAttribute('title') || url,
      folder,
      siteUrl: outline.getAttribute('htmlUrl') || '',
    });
    if (folder && !state.folders.includes(folder)) state.folders.push(folder);
    count++;
  });
  Store.save(state);
  renderAll();
  showToast(`Imported ${count} feed${count !== 1 ? 's' : ''}`);
}

function escXml(s) {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

// ── Read Lists ─────────────────────────────────────────
function addToReadList(articleId, listId) {
  const list = state.readLists.find(l => l.id === listId);
  if (!list) return;
  if (!list.items.includes(articleId)) {
    list.items.push(articleId);
    Store.save(state);
    showToast(`Saved to ${list.name}`);
  }
}

function createReadList(name) {
  if (!name.trim()) return;
  const id = 'rl_' + Date.now().toString(36);
  state.readLists.push({ id, name: name.trim(), items: [] });
  Store.save(state);
  renderSidebar();
}

function openAllInReadList(listId) {
  const list = state.readLists.find(l => l.id === listId);
  if (!list) return;
  list.items.forEach(artId => {
    const art = state.articles.find(a => a.id === artId);
    if (art && art.link) window.open(art.link, '_blank');
  });
}

// ── Rendering ──────────────────────────────────────────
function renderAll() {
  renderSidebar();
  renderSidebarTabs();
  renderArticles();
}

function renderSidebarTabs() {
  document.querySelectorAll('.sidebar-tab').forEach(tab => {
    tab.classList.toggle('active', tab.dataset.filter === sidebarFilter);
  });
}

function renderSidebar() {
  renderFeedTree();
  renderReadListNav();
}

function renderFeedTree() {
  const tree = document.getElementById('feed-tree');
  const folders = {};
  const uncategorized = [];

  state.feeds.forEach(f => {
    const folder = f.folder || 'Uncategorized';
    if (folder === 'Uncategorized') { uncategorized.push(f); return; }
    if (!folders[folder]) folders[folder] = [];
    folders[folder].push(f);
  });

  let html = '';

  // Render folders
  for (const [folder, feeds] of Object.entries(folders)) {
    const unread = countUnread(null, folder);
    html += `<div class="folder-header" data-folder="${escHtml(folder)}">
      <span class="arrow">&#9660;</span>
      <span>${escHtml(folder)}</span>
      <span class="badge">${unread || ''}</span>
    </div>
    <div class="folder-feeds" data-folder="${escHtml(folder)}">`;
    feeds.forEach(f => {
      const u = countUnread(f.id);
      html += `<div class="nav-item${currentView.type === 'feed' && currentView.id === f.id ? ' active' : ''}" data-view="feed" data-id="${f.id}">
        <span>${escHtml(f.title)}</span>
        <span class="badge">${u || ''}</span>
      </div>`;
    });
    html += '</div>';
  }

  // Uncategorized feeds (show at root level)
  uncategorized.forEach(f => {
    const u = countUnread(f.id);
    html += `<div class="nav-item${currentView.type === 'feed' && currentView.id === f.id ? ' active' : ''}" data-view="feed" data-id="${f.id}">
      <span>${escHtml(f.title)}</span>
      <span class="badge">${u || ''}</span>
    </div>`;
  });

  tree.innerHTML = html;

  // Update all badge
  const allBadge = document.getElementById('badge-all');
  const total = state.articles.filter(a => !a.read).length;
  allBadge.textContent = total || '';

  // Mark all-feeds nav active state
  document.getElementById('nav-all').classList.toggle('active', currentView.type === 'all');

  // Folder toggle
  tree.querySelectorAll('.folder-header').forEach(fh => {
    fh.addEventListener('click', () => {
      fh.classList.toggle('collapsed');
      const feeds = tree.querySelector(`.folder-feeds[data-folder="${fh.dataset.folder}"]`);
      feeds?.classList.toggle('collapsed');
    });
  });

  // Nav clicks
  tree.querySelectorAll('.nav-item').forEach(item => {
    item.addEventListener('click', () => {
      currentView = { type: item.dataset.view, id: item.dataset.id };
      renderAll();
      closeSidebarMobile();
    });
  });
}

function renderReadListNav() {
  const nav = document.getElementById('readlist-nav');
  nav.innerHTML = state.readLists.map(rl => {
    const active = currentView.type === 'readlist' && currentView.id === rl.id;
    return `<div class="nav-item${active ? ' active' : ''}" data-view="readlist" data-id="${rl.id}">
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"/></svg>
      <span>${escHtml(rl.name)}</span>
      <span class="badge">${rl.items.length || ''}</span>
    </div>`;
  }).join('');

  nav.querySelectorAll('.nav-item').forEach(item => {
    item.addEventListener('click', () => {
      currentView = { type: 'readlist', id: item.dataset.id };
      renderAll();
      closeSidebarMobile();
    });
  });
}

function renderArticles() {
  const list = document.getElementById('article-list');
  const empty = document.getElementById('empty-state');
  let articles = getFilteredArticles();

  // Sort by date descending
  articles.sort((a, b) => new Date(b.date) - new Date(a.date));

  if (articles.length === 0) {
    list.innerHTML = '';
    empty.style.display = 'flex';
    return;
  }
  empty.style.display = 'none';

  // Readlist header
  let headerHtml = '';
  if (currentView.type === 'readlist') {
    const rl = state.readLists.find(l => l.id === currentView.id);
    if (rl) {
      headerHtml = `<div class="readlist-header">
        <h2>${escHtml(rl.name)}</h2>
        <button class="readlist-open-all" data-list="${rl.id}">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></svg>
          Open All
        </button>
      </div>`;
    }
  }

  list.innerHTML = headerHtml + articles.map(art => {
    const feed = state.feeds.find(f => f.id === art.feedId);
    const dateStr = formatDate(art.date);
    const thumbHtml = art.image
      ? `<img src="${escHtml(art.image)}" alt="" loading="lazy" onerror="this.parentElement.innerHTML='<div class=\\'article-thumb-placeholder\\'><svg width=\\'24\\' height=\\'24\\' viewBox=\\'0 0 24 24\\' fill=\\'none\\' stroke=\\'currentColor\\' stroke-width=\\'1.5\\'><rect x=\\'3\\' y=\\'3\\' width=\\'18\\' height=\\'18\\' rx=\\'2\\'/><circle cx=\\'8.5\\' cy=\\'8.5\\' r=\\'1.5\\'/><path d=\\'M21 15l-5-5L5 21\\'/></svg></div>'">`
      : `<div class="article-thumb-placeholder"><svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><path d="M21 15l-5-5L5 21"/></svg></div>`;

    return `<div class="article-card${art.read ? ' read' : ''}" data-id="${art.id}">
      <div class="swipe-action swipe-action-read">Mark as read</div>
      <div class="swipe-action swipe-action-save">Save to list</div>
      <div class="article-card-inner">
        <div class="article-thumb">${thumbHtml}</div>
        <div class="article-body">
          <div class="article-title">${escHtml(art.title)}</div>
          <div class="article-meta">
            <span class="feed-name">${escHtml(feed?.title || 'Unknown')}</span>
            <span class="sep">&bull;</span>
            <span>${dateStr}</span>
          </div>
          ${art.snippet ? `<div class="article-snippet">${escHtml(art.snippet)}</div>` : ''}
        </div>
      </div>
    </div>`;
  }).join('');

  // Open all button
  list.querySelectorAll('.readlist-open-all').forEach(btn => {
    btn.addEventListener('click', () => openAllInReadList(btn.dataset.list));
  });

  // Click to open article
  list.querySelectorAll('.article-card').forEach(card => {
    card.querySelector('.article-card-inner').addEventListener('click', e => {
      if (Math.abs(parseFloat(card.querySelector('.article-card-inner').style.transform?.replace(/[^0-9.-]/g, '') || 0)) > 10) return;
      const art = state.articles.find(a => a.id === card.dataset.id);
      if (art?.link) {
        art.read = true;
        Store.save(state);
        window.open(art.link, '_blank');
        renderAll();
      }
    });

    // Swipe handling
    setupSwipe(card);
  });
}

function getFilteredArticles() {
  let articles;
  if (currentView.type === 'all') articles = [...state.articles];
  else if (currentView.type === 'feed') articles = state.articles.filter(a => a.feedId === currentView.id);
  else if (currentView.type === 'folder') {
    const feedIds = state.feeds.filter(f => f.folder === currentView.id).map(f => f.id);
    articles = state.articles.filter(a => feedIds.includes(a.feedId));
  } else if (currentView.type === 'readlist') {
    const rl = state.readLists.find(l => l.id === currentView.id);
    if (!rl) return [];
    articles = state.articles.filter(a => rl.items.includes(a.id));
  } else {
    articles = [];
  }
  if (sidebarFilter === 'unread') articles = articles.filter(a => !a.read);
  return articles;
}

function countUnread(feedId, folder) {
  if (feedId) return state.articles.filter(a => a.feedId === feedId && !a.read).length;
  if (folder) {
    const feedIds = state.feeds.filter(f => f.folder === folder).map(f => f.id);
    return state.articles.filter(a => feedIds.includes(a.feedId) && !a.read).length;
  }
  return state.articles.filter(a => !a.read).length;
}

// ── Swipe Handling ─────────────────────────────────────
function setupSwipe(card) {
  let startX = 0, currentX = 0, swiping = false;
  const inner = card.querySelector('.article-card-inner');
  const THRESHOLD = 80;

  card.addEventListener('touchstart', e => {
    startX = e.touches[0].clientX;
    swiping = true;
    card.classList.add('swiping');
  }, { passive: true });

  card.addEventListener('touchmove', e => {
    if (!swiping) return;
    currentX = e.touches[0].clientX - startX;
    // Dampen the movement
    const dampened = currentX * 0.6;
    inner.style.transform = `translateX(${dampened}px)`;
  }, { passive: true });

  card.addEventListener('touchend', () => {
    if (!swiping) return;
    swiping = false;
    card.classList.remove('swiping');
    const dampened = currentX * 0.6;

    if (dampened > THRESHOLD) {
      // Swipe right → mark as read
      const art = state.articles.find(a => a.id === card.dataset.id);
      if (art) {
        art.read = !art.read;
        Store.save(state);
        showToast(art.read ? 'Marked as read' : 'Marked as unread');
        renderAll();
      }
    } else if (dampened < -THRESHOLD) {
      // Swipe left → add to read list
      showReadListPicker(card.dataset.id);
    }

    inner.style.transform = '';
    currentX = 0;
  });
}

// ── Read List Picker ───────────────────────────────────
let pendingReadListArticle = null;

function showReadListPicker(articleId) {
  pendingReadListArticle = articleId;
  const list = document.getElementById('readlist-pick-list');
  list.innerHTML = state.readLists.map(rl =>
    `<div class="nav-item" data-id="${rl.id}">
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"/></svg>
      <span>${escHtml(rl.name)}</span>
    </div>`
  ).join('');

  list.querySelectorAll('.nav-item').forEach(item => {
    item.addEventListener('click', () => {
      addToReadList(pendingReadListArticle, item.dataset.id);
      closeModal('modal-readlist-pick');
      renderAll();
    });
  });
  openModal('modal-readlist-pick');
}

// ── Add Feed Flow ──────────────────────────────────────
async function searchForFeed(url) {
  const status = document.getElementById('feed-search-status');
  const results = document.getElementById('feed-search-results');
  status.textContent = 'Searching for feeds...';
  status.className = 'search-status';
  results.innerHTML = '';

  try {
    const feeds = await discoverFeeds(url);
    if (feeds.length === 0) {
      status.textContent = 'No RSS/Atom feeds found at this URL.';
      status.className = 'search-status error';
      return;
    }
    status.textContent = `Found ${feeds.length} feed${feeds.length > 1 ? 's' : ''}:`;
    results.innerHTML = feeds.map((f, i) => `
      <div class="search-result-item" data-idx="${i}">
        <span class="result-title">${escHtml(f.title)}</span>
        <span class="result-url">${escHtml(f.url)}</span>
      </div>
    `).join('');

    results.querySelectorAll('.search-result-item').forEach(item => {
      item.addEventListener('click', () => {
        const feed = feeds[parseInt(item.dataset.idx)];
        pendingFeedData = { url: feed.url, title: feed.title };
        document.getElementById('input-feed-title').value = feed.title;
        document.getElementById('input-feed-folder').value = '';
        updateFolderDatalist();
        document.getElementById('add-step-url').style.display = 'none';
        document.getElementById('add-step-details').style.display = 'block';
      });
    });

    // Auto-select if only one result
    if (feeds.length === 1) {
      results.querySelector('.search-result-item').click();
    }
  } catch (e) {
    status.textContent = 'Failed to fetch URL. Check the URL and try again.';
    status.className = 'search-status error';
  }
}

function saveFeed() {
  if (!pendingFeedData) return;
  const title = document.getElementById('input-feed-title').value.trim() || pendingFeedData.title;
  const folder = document.getElementById('input-feed-folder').value.trim() || 'Uncategorized';

  if (state.feeds.find(f => f.url === pendingFeedData.url)) {
    showToast('Feed already exists');
    closeModal('modal-add');
    return;
  }

  const feed = {
    id: 'feed_' + Date.now().toString(36) + '_' + Math.random().toString(36).slice(2, 6),
    url: pendingFeedData.url,
    title,
    folder,
    siteUrl: '',
  };
  state.feeds.push(feed);
  if (folder && !state.folders.includes(folder)) state.folders.push(folder);
  Store.save(state);
  closeModal('modal-add');
  resetAddModal();
  renderAll();
  showToast(`Added "${title}"`);

  // Auto-sync the newly added feed to show unread articles immediately
  syncSingleFeed(feed);
}

function resetAddModal() {
  document.getElementById('input-feed-url').value = '';
  document.getElementById('input-feed-title').value = '';
  document.getElementById('input-feed-folder').value = '';
  document.getElementById('feed-search-status').textContent = '';
  document.getElementById('feed-search-results').innerHTML = '';
  document.getElementById('add-step-url').style.display = 'block';
  document.getElementById('add-step-details').style.display = 'none';
  pendingFeedData = null;
}

function updateFolderDatalist() {
  const dl = document.getElementById('folder-list');
  const folders = new Set(state.feeds.map(f => f.folder).filter(Boolean));
  state.folders.forEach(f => folders.add(f));
  dl.innerHTML = [...folders].map(f => `<option value="${escHtml(f)}">`).join('');
}

// ── Manage Feeds ───────────────────────────────────────
function renderManageFeeds() {
  const list = document.getElementById('manage-feed-list');
  if (state.feeds.length === 0) {
    list.innerHTML = '<p style="color:var(--text-muted);font-size:13px;text-align:center;padding:20px">No feeds added yet.</p>';
    return;
  }
  list.innerHTML = state.feeds.map(f => `
    <div class="manage-feed-item" data-id="${f.id}">
      <div class="feed-info">
        <div class="name">${escHtml(f.title)}</div>
        <div class="url">${escHtml(f.url)}</div>
        <span class="folder-tag">${escHtml(f.folder || 'Uncategorized')}</span>
      </div>
      <button class="btn-delete" data-id="${f.id}" title="Remove feed">&times;</button>
    </div>
  `).join('');

  list.querySelectorAll('.btn-delete').forEach(btn => {
    btn.addEventListener('click', () => {
      const id = btn.dataset.id;
      state.feeds = state.feeds.filter(f => f.id !== id);
      state.articles = state.articles.filter(a => a.feedId !== id);
      state.readLists.forEach(rl => {
        rl.items = rl.items.filter(artId => state.articles.find(a => a.id === artId));
      });
      Store.save(state);
      renderManageFeeds();
      renderAll();
    });
  });
}

// ── Mark All Read ──────────────────────────────────────
function markAllRead() {
  const articles = getFilteredArticles();
  articles.forEach(a => {
    const art = state.articles.find(x => x.id === a.id);
    if (art) art.read = true;
  });
  Store.save(state);
  renderAll();
  showToast('All marked as read');
}

// ── Modal Helpers ──────────────────────────────────────
function openModal(id) {
  document.getElementById(id).classList.add('open');
}
function closeModal(id) {
  document.getElementById(id).classList.remove('open');
}

// ── Toast ──────────────────────────────────────────────
let toastTimer;
function showToast(msg) {
  let toast = document.querySelector('.toast');
  if (!toast) {
    toast = document.createElement('div');
    toast.className = 'toast';
    document.body.appendChild(toast);
  }
  toast.textContent = msg;
  toast.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toast.classList.remove('show'), 2500);
}

// ── Utilities ──────────────────────────────────────────
function escHtml(s) {
  const d = document.createElement('div');
  d.textContent = s || '';
  return d.innerHTML;
}

function formatDate(dateStr) {
  if (!dateStr) return '';
  try {
    const d = new Date(dateStr);
    const now = new Date();
    const diff = now - d;
    if (diff < 60000) return 'Just now';
    if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
    if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`;
    if (diff < 604800000) return `${Math.floor(diff / 86400000)}d ago`;
    return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: d.getFullYear() !== now.getFullYear() ? 'numeric' : undefined });
  } catch { return ''; }
}

// ── Mobile Sidebar ─────────────────────────────────────
function closeSidebarMobile() {
  const sidebar = document.getElementById('sidebar');
  const backdrop = document.querySelector('.sidebar-backdrop');
  sidebar.classList.remove('open');
  backdrop?.classList.remove('open');
}

function initMobileSidebar() {
  // Add backdrop
  const backdrop = document.createElement('div');
  backdrop.className = 'sidebar-backdrop';
  document.body.appendChild(backdrop);
  backdrop.addEventListener('click', closeSidebarMobile);

  // Hamburger button toggles sidebar on mobile
  document.getElementById('btn-sidebar-toggle').addEventListener('click', () => {
    const sidebar = document.getElementById('sidebar');
    sidebar.classList.toggle('open');
    backdrop.classList.toggle('open');
  });
}

// ── Event Bindings ─────────────────────────────────────
function init() {
  // Register service worker
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('./sw.js').catch(() => {});
  }

  initMobileSidebar();

  // Sync
  document.getElementById('btn-sync').addEventListener('click', syncAllFeeds);

  // Mark all read
  document.getElementById('btn-mark-all').addEventListener('click', markAllRead);

  // FAB
  document.getElementById('fab-add').addEventListener('click', () => {
    resetAddModal();
    openModal('modal-add');
    document.getElementById('input-feed-url').focus();
  });

  // Search feed
  document.getElementById('btn-search-feed').addEventListener('click', () => {
    const url = document.getElementById('input-feed-url').value.trim();
    if (url) searchForFeed(url);
  });
  document.getElementById('input-feed-url').addEventListener('keydown', e => {
    if (e.key === 'Enter') {
      const url = e.target.value.trim();
      if (url) searchForFeed(url);
    }
  });

  // Save feed
  document.getElementById('btn-save-feed').addEventListener('click', saveFeed);

  // Back to URL step
  document.getElementById('btn-back-url').addEventListener('click', () => {
    document.getElementById('add-step-url').style.display = 'block';
    document.getElementById('add-step-details').style.display = 'none';
  });

  // Modal close buttons
  document.querySelectorAll('.modal-close').forEach(btn => {
    btn.addEventListener('click', () => closeModal(btn.dataset.close));
  });
  document.querySelectorAll('.modal-overlay').forEach(overlay => {
    overlay.addEventListener('click', e => {
      if (e.target === overlay) overlay.classList.remove('open');
    });
  });

  // Sidebar filter tabs
  document.querySelectorAll('.sidebar-tab').forEach(tab => {
    tab.addEventListener('click', () => {
      sidebarFilter = tab.dataset.filter;
      renderAll();
    });
  });

  // All feeds nav
  document.getElementById('nav-all').addEventListener('click', () => {
    currentView = { type: 'all' };
    renderAll();
    closeSidebarMobile();
  });

  // Menu dropdown
  const menuBtn = document.getElementById('btn-menu');
  const dropdown = document.getElementById('dropdown-menu');
  menuBtn.addEventListener('click', e => {
    e.stopPropagation();
    const rect = menuBtn.getBoundingClientRect();
    dropdown.style.top = rect.bottom + 4 + 'px';
    dropdown.style.right = (window.innerWidth - rect.right) + 'px';
    dropdown.style.left = 'auto';
    dropdown.style.display = dropdown.style.display === 'none' ? 'block' : 'none';
  });
  document.addEventListener('click', () => { dropdown.style.display = 'none'; });

  // Menu actions
  dropdown.querySelector('[data-action="import-opml"]').addEventListener('click', () => {
    document.getElementById('file-opml').click();
  });
  dropdown.querySelector('[data-action="export-opml"]').addEventListener('click', exportOpml);
  dropdown.querySelector('[data-action="manage-feeds"]').addEventListener('click', () => {
    renderManageFeeds();
    openModal('modal-manage');
  });

  // OPML file input
  document.getElementById('file-opml').addEventListener('change', e => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => importOpml(reader.result);
    reader.readAsText(file);
    e.target.value = '';
  });

  // Add read list
  document.getElementById('btn-add-readlist').addEventListener('click', () => {
    const name = prompt('Read list name:');
    if (name) createReadList(name);
  });

  // Check URL params for add=
  const params = new URLSearchParams(window.location.search);
  const addUrl = params.get('add') || params.get('url') || params.get('text');
  if (addUrl) {
    // Clean URL from history
    window.history.replaceState({}, '', window.location.pathname);
    setTimeout(() => {
      openModal('modal-add');
      document.getElementById('input-feed-url').value = addUrl;
      searchForFeed(addUrl);
    }, 300);
  }

  renderAll();

  // Auto-sync feeds on startup to fetch new articles
  if (state.feeds.length > 0) {
    syncAllFeeds();
  }
}

document.addEventListener('DOMContentLoaded', init);
