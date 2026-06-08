/* ============================================================
   app.js — 共享逻辑 + 仪表盘渲染
   ============================================================ */

// ====== 侧边栏 ======
function toggleSidebar() {
  const sidebar = document.getElementById('sidebar');
  const overlay = document.getElementById('sidebarOverlay');
  const isOpen = sidebar.classList.toggle('open');
  overlay.classList.toggle('open', isOpen);
}

// Close sidebar when clicking a link (mobile)
document.addEventListener('click', function(e) {
  if (e.target.closest('.nav-item') || e.target.closest('.nav-stock-item')) {
    document.getElementById('sidebar').classList.remove('open');
    document.getElementById('sidebarOverlay').classList.remove('open');
  }
});

// ====== 面板折叠 ======
function togglePanel(bodyId) {
  document.getElementById(bodyId).classList.toggle('collapsed');
}

// ====== 自选关注系统 (LocalStorage) ======
function getWatchlist() {
  try {
    return JSON.parse(localStorage.getItem('wuming_watchlist') || '[]');
  } catch(e) {
    return [];
  }
}

function saveWatchlistLocal(list) {
  localStorage.setItem('wuming_watchlist', JSON.stringify(list));
}

function addToWatchlist(code, priority) {
  const wl = getWatchlist();
  const existing = wl.find(w => w.code === code);
  if (existing) {
    existing.priority = priority;
  } else {
    wl.push({ code, priority });
  }
  saveWatchlistLocal(wl);
  refreshWatchlistUI();
  showToast('已添加到重点关注');
}

function removeFromWatchlist(code) {
  const wl = getWatchlist().filter(w => w.code !== code);
  saveWatchlistLocal(wl);
  refreshWatchlistUI();
  showToast('已移除关注');
}

function toggleWatchlist(code) {
  const wl = getWatchlist();
  const idx = wl.findIndex(w => w.code === code);
  if (idx >= 0) {
    wl.splice(idx, 1);
    saveWatchlistLocal(wl);
    refreshWatchlistUI();
  } else {
    showAddStockModal();
  }
}

function cyclePriority(code, delta) {
  const wl = getWatchlist();
  const item = wl.find(w => w.code === code);
  if (item) {
    item.priority = Math.max(1, Math.min(3, (item.priority || 1) + delta));
    saveWatchlistLocal(wl);
    refreshWatchlistUI();
  }
}

// ====== 弹窗 ======
function showAddStockModal() {
  document.getElementById('addStockModal').classList.remove('hidden');
  renderModalStocks();
}

function closeModal() {
  document.getElementById('addStockModal').classList.add('hidden');
}

function renderModalStocks() {
  const container = document.getElementById('modalStockList');
  const wl = getWatchlist();
  const wlMap = {};
  wl.forEach(w => { wlMap[w.code] = w.priority; });

  container.innerHTML = STOCKS.map(s => {
    const checked = wlMap[s.code] ? 'checked' : '';
    const prio = wlMap[s.code] || 1;
    return `<label class="stock-checkbox">
      <input type="checkbox" value="${s.code}" ${checked} onchange="updateModalPrio()">
      <span>${s.name}</span>
      <span class="text-muted" style="font-size:0.7rem;font-family:var(--font-mono)">${s.code}</span>
      <select class="modal-prio" data-code="${s.code}" style="margin-left:auto;background:var(--bg-input);border:1px solid var(--border);color:var(--text-primary);border-radius:4px;padding:2px 6px;font-size:0.75rem;">
        <option value="1" ${prio === 1 ? 'selected' : ''}>⭐ 关注</option>
        <option value="2" ${prio === 2 ? 'selected' : ''}>⭐⭐ 重点</option>
        <option value="3" ${prio === 3 ? 'selected' : ''}>⭐⭐⭐ 核心</option>
      </select>
    </label>`;
  }).join('');
}

function saveWatchlist() {
  const checkboxes = document.querySelectorAll('#modalStockList input[type="checkbox"]');
  const prios = document.querySelectorAll('#modalStockList .modal-prio');
  const wl = [];

  checkboxes.forEach(cb => {
    if (cb.checked) {
      const prioEl = document.querySelector(`.modal-prio[data-code="${cb.value}"]`);
      wl.push({ code: cb.value, priority: parseInt(prioEl?.value || '1') });
    }
  });

  saveWatchlistLocal(wl);
  closeModal();
  refreshWatchlistUI();
  renderDashboard();
  showToast('重点关注已更新');
}

function updateModalPrio() { /* placeholder for live updates */ }

// ====== Toast 提醒 ======
function showToast(msg) {
  const existing = document.querySelector('.toast');
  if (existing) existing.remove();

  const toast = document.createElement('div');
  toast.className = 'toast';
  toast.textContent = msg;
  document.body.appendChild(toast);
  setTimeout(() => toast.remove(), 2000);
}

// ====== 刷新数据 ======
function refreshData() {
  showToast('数据已刷新');
  renderDashboard();
  document.getElementById('updateTime').textContent = '更新于 ' + new Date().toLocaleTimeString('zh-CN');
}

// ====== 格式化 ======
function fmtPrice(p) { return p.toFixed(2); }
function fmtPct(p) {
  const sign = p > 0 ? '+' : '';
  return sign + p.toFixed(2) + '%';
}
function fmtVolume(v) {
  if (v >= 1e8) return (v / 1e8).toFixed(2) + '亿';
  if (v >= 1e4) return (v / 1e4).toFixed(1) + '万';
  return v.toString();
}

// ====== 仪表盘渲染 ======
function renderDashboard() {
  renderStatsBar();
  renderStockGrid();
  renderSidebarStocks();
  refreshWatchlistUI();
  document.getElementById('footerUpdate').textContent = '最后更新: ' + LAST_UPDATE;
  document.getElementById('updateTime').textContent = '更新于 ' + LAST_UPDATE;
}

function renderStatsBar() {
  const container = document.getElementById('statsBar');
  if (!container) return;

  const watchlist = getWatchlist();
  const allCodes = STOCKS.map(s => s.code);

  // Count up/down stocks
  let upCount = 0, downCount = 0, flatCount = 0;
  allCodes.forEach(code => {
    const lp = LATEST_PRICES[code];
    if (lp) {
      if (lp.change_pct > 0.1) upCount++;
      else if (lp.change_pct < -0.1) downCount++;
      else flatCount++;
    }
  });

  // Total accuracy
  let totalPreds = 0, correctPreds = 0;
  Object.values(PRED_COUNTS).forEach(c => {
    totalPreds += c.total;
    correctPreds += c.right;
  });
  const overallAcc = totalPreds > 0 ? Math.round(correctPreds / totalPreds * 100) : 0;

  container.innerHTML = `
    <div class="stat-card">
      <div class="stat-label">自选股</div>
      <div class="stat-value">${STOCKS.length}</div>
      <div class="stat-change">
        <span class="up">↑${upCount}</span>
        <span class="text-muted"> / </span>
        <span class="down">↓${downCount}</span>
        <span class="text-muted"> / </span>
        <span class="neutral">→${flatCount}</span>
      </div>
    </div>
    <div class="stat-card">
      <div class="stat-label">重点关注</div>
      <div class="stat-value">${watchlist.length}</div>
      <div class="stat-change neutral">点击 ☆ 添加</div>
    </div>
    <div class="stat-card">
      <div class="stat-label">历史预测准确率</div>
      <div class="stat-value" style="color:${overallAcc >= 70 ? 'var(--green)' : overallAcc >= 50 ? 'var(--orange)' : 'var(--red)'}">${overallAcc}%</div>
      <div class="stat-change neutral">${correctPreds}/${totalPreds} 正确</div>
    </div>
    <div class="stat-card">
      <div class="stat-label">K线数据</div>
      <div class="stat-value">10只</div>
      <div class="stat-change neutral">日线实时更新</div>
    </div>
  `;
}

function renderStockGrid() {
  const container = document.getElementById('stockGrid');
  if (!container) return;

  const watchlist = getWatchlist();
  const wlMap = {};
  watchlist.forEach(w => { wlMap[w.code] = w.priority; });

  const cards = STOCKS.map(s => {
    const lp = LATEST_PRICES[s.code];
    if (!lp) return '';

    const isUp = lp.change_pct > 0;
    const changeClass = lp.change_pct > 0.1 ? 'up' : lp.change_pct < -0.1 ? 'down' : '';
    const isFav = wlMap[s.code] ? 'active' : '';

    // Score from prediction accuracy
    const pc = PRED_COUNTS[s.code];
    const acc = pc && pc.total > 0 ? Math.round(pc.right / pc.total * 100) : 0;
    const scoreClass = acc >= 70 ? 'bullish' : acc >= 45 ? 'neutral' : 'bearish';

    return `
    <div class="stock-card" onclick="window.location='stock.html?code=${s.code}'">
      <button class="card-fav-btn ${isFav}" onclick="event.stopPropagation(); toggleWatchlist('${s.code}')" title="${isFav ? '取消关注' : '添加关注'}">
        ${isFav ? '⭐' : '☆'}
      </button>
      <div class="card-header">
        <div>
          <div class="stock-name">${s.name}</div>
          <div class="stock-code">${s.code}</div>
        </div>
        <div style="text-align:right">
          <div class="stock-price ${changeClass}">${fmtPrice(lp.price)}</div>
          <div class="stock-change-pct ${changeClass}">${fmtPct(lp.change_pct)}</div>
        </div>
      </div>
      <div class="card-sparkline">
        <canvas id="spark_${s.code}" width="300" height="48"></canvas>
      </div>
      <div class="card-footer">
        <span>预测准确率 ${acc}%</span>
        <span class="score-badge ${scoreClass}">${acc >= 70 ? '🔥 高准确' : acc >= 45 ? '📊 中等' : '📉 待观察'}</span>
      </div>
    </div>`;
  }).join('');

  container.innerHTML = cards;

  // Draw sparklines after DOM update
  requestAnimationFrame(() => drawSparklines());
  
  // Also store which are fav for filter
  container.dataset.favFilter = 'off';
}

function drawSparklines() {
  STOCKS.forEach(s => {
    const canvas = document.getElementById('spark_' + s.code);
    if (!canvas) return;
    
    const data = KLINE_DATA[s.code];
    if (!data || data.length === 0) return;

    const ctx = canvas.getContext('2d');
    const w = canvas.width;
    const h = canvas.height;
    ctx.clearRect(0, 0, w, h);

    const recent = data.slice(-30);
    const closes = recent.map(d => d.close);
    const min = Math.min(...closes);
    const max = Math.max(...closes);
    const range = max - min || 1;

    const isUp = closes[closes.length - 1] >= closes[0];
    ctx.strokeStyle = isUp ? '#f85149' : '#3fb950';
    ctx.lineWidth = 1.5;
    ctx.beginPath();

    recent.forEach((d, i) => {
      const x = (i / (recent.length - 1)) * w;
      const y = h - ((d.close - min) / range) * (h - 8) - 4;
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    });

    ctx.stroke();

    // Fill area
    const lastY = h - ((closes[closes.length - 1] - min) / range) * (h - 8) - 4;
    ctx.lineTo(w, h);
    ctx.lineTo(0, h);
    ctx.closePath();
    ctx.fillStyle = isUp ? 'rgba(248,81,73,0.08)' : 'rgba(63,185,80,0.08)';
    ctx.fill();
  });
}

// ====== 筛选与排序 ======
let favFilterOn = false;

function toggleFavFilter() {
  favFilterOn = !favFilterOn;
  document.getElementById('btnShowFav').classList.toggle('primary', favFilterOn);
  document.getElementById('btnShowFav').textContent = favFilterOn ? '✓ 仅看关注' : '仅看关注';
  filterStocks();
}

function filterStocks() {
  const search = (document.getElementById('stockSearch')?.value || '').toLowerCase();
  const sortBy = document.getElementById('sortBy')?.value || 'default';
  const cards = document.querySelectorAll('.stock-card');
  const watchlist = getWatchlist();
  const wlSet = new Set(watchlist.map(w => w.code));

  // Collect visible cards for sorting
  const visibleCards = [];

  STOCKS.forEach(s => {
    const cardEl = document.querySelector(`#stockGrid .stock-card[onclick*="${s.code}"]`);
    if (!cardEl) return;

    const matchSearch = !search || s.name.includes(search) || s.code.includes(search);
    const matchFav = !favFilterOn || wlSet.has(s.code);
    const visible = matchSearch && matchFav;

    cardEl.style.display = visible ? '' : 'none';
    if (visible) visibleCards.push({ el: cardEl, code: s.code });
  });

  // Sort if needed
  if (sortBy !== 'default') {
    const grid = document.getElementById('stockGrid');
    visibleCards.sort((a, b) => {
      const pa = LATEST_PRICES[a.code];
      const pb = LATEST_PRICES[b.code];
      switch (sortBy) {
        case 'change_desc': return (pb?.change_pct || 0) - (pa?.change_pct || 0);
        case 'change_asc': return (pa?.change_pct || 0) - (pb?.change_pct || 0);
        case 'score_desc': {
          const ca = PRED_COUNTS[a.code];
          const cb = PRED_COUNTS[b.code];
          const sa = ca && ca.total > 0 ? ca.right / ca.total : 0;
          const sb = cb && cb.total > 0 ? cb.right / cb.total : 0;
          return sb - sa;
        }
        case 'price_desc': return (pb?.price || 0) - (pa?.price || 0);
        default: return 0;
      }
    });
    visibleCards.forEach(c => grid.appendChild(c.el));
  }

  document.getElementById('stockCount').textContent = visibleCards.length + '只';
}

// ====== 侧边栏股票列表 ======
function renderSidebarStocks() {
  const container = document.getElementById('sidebarStockList');
  if (!container) return;

  container.innerHTML = STOCKS.map(s => {
    const lp = LATEST_PRICES[s.code];
    if (!lp) return '';
    const changeClass = lp.change_pct > 0.1 ? 'up' : lp.change_pct < -0.1 ? 'down' : '';
    const sign = lp.change_pct > 0 ? '+' : '';

    return `<a href="stock.html?code=${s.code}" class="nav-stock-item">
      <span>${s.name}</span>
      <span class="stock-change ${changeClass}">${sign}${lp.change_pct.toFixed(1)}%</span>
    </a>`;
  }).join('');
}

// ====== 重点关注面板 ======
function refreshWatchlistUI() {
  const wl = getWatchlist();

  // Update dashboard watchlist panel
  const panel = document.getElementById('watchlistContent');
  const empty = document.getElementById('watchlistEmpty');
  const count = document.getElementById('watchlistCount');

  if (count) count.textContent = wl.length + '只';

  if (!panel) return;

  if (wl.length === 0) {
    if (empty) empty.style.display = '';
    panel.innerHTML = '';
    return;
  }

  if (empty) empty.style.display = 'none';

  panel.innerHTML = wl.map(w => {
    const stock = STOCKS.find(s => s.code === w.code);
    if (!stock) return '';
    const lp = LATEST_PRICES[w.code];
    const stars = '⭐'.repeat(w.priority || 1);
    const changeClass = lp && lp.change_pct > 0.1 ? 'up' : lp && lp.change_pct < -0.1 ? 'down' : '';

    return `<div class="watchlist-row">
      <span class="wl-priority" onclick="cyclePriority('${w.code}', 1)" title="提升优先级">${stars}</span>
      <span class="wl-name clickable" onclick="window.location='stock.html?code=${w.code}'">${stock.name}</span>
      <span class="wl-code">${w.code}</span>
      <span class="wl-price ${changeClass}">${lp ? fmtPrice(lp.price) : '--'}</span>
      <button class="wl-remove" onclick="removeFromWatchlist('${w.code}')" title="移除">✕</button>
    </div>`;
  }).join('');

  // Update sidebar stock list too
  renderSidebarStocks();
}

// ====== 初始化 ======
if (document.getElementById('stockGrid')) {
  renderDashboard();
  document.getElementById('updateTime').textContent = '更新于 ' + LAST_UPDATE;
}

// Always render sidebar
renderSidebarStocks();
refreshWatchlistUI();
