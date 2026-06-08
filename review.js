/* ============================================================
   review.js — 预测复盘页渲染
   ============================================================ */

function initReviewPage() {
  renderReviewStats();
  renderAccuracyGrid();
  renderPredictionHistory();
  populateFilters();
  document.getElementById('footerUpdate').textContent = '最后更新: ' + LAST_UPDATE;
}

// ====== 概览统计 ======
function renderReviewStats() {
  const container = document.getElementById('reviewStats');
  if (!container) return;

  let total = 0, right = 0, partial = 0, wrong = 0;
  PREDICTION_HISTORY.forEach(p => {
    total++;
    if (p.result === 'right') right++;
    else if (p.result === 'partial') partial++;
    else wrong++;
  });

  const overallAcc = total > 0 ? Math.round(right / total * 100) : 0;
  const partialAcc = total > 0 ? Math.round((right + partial * 0.5) / total * 100) : 0;

  container.innerHTML = `
    <div class="stat-card">
      <div class="stat-label">总预测次数</div>
      <div class="stat-value">${total}</div>
      <div class="stat-change neutral">覆盖10只股票</div>
    </div>
    <div class="stat-card">
      <div class="stat-label">方向准确率</div>
      <div class="stat-value" style="color:${overallAcc >= 70 ? 'var(--green)' : overallAcc >= 50 ? 'var(--orange)' : 'var(--red)'}">${overallAcc}%</div>
      <div class="stat-change">
        <span style="color:var(--green)">✓ ${right}</span>
        <span class="text-muted"> / </span>
        <span style="color:var(--orange)">△ ${partial}</span>
        <span class="text-muted"> / </span>
        <span style="color:var(--red)">✗ ${wrong}</span>
      </div>
    </div>
    <div class="stat-card">
      <div class="stat-label">综合准确率</div>
      <div class="stat-value" style="color:${partialAcc >= 70 ? 'var(--green)' : partialAcc >= 50 ? 'var(--orange)' : 'var(--red)'}">${partialAcc}%</div>
      <div class="stat-change neutral">方向正确 + 部分正确×0.5</div>
    </div>
    <div class="stat-card">
      <div class="stat-label">跟踪天数</div>
      <div class="stat-value">${new Set(PREDICTION_HISTORY.map(p => p.date)).size}</div>
      <div class="stat-change neutral">交易日</div>
    </div>
  `;

  document.getElementById('totalPreds').textContent = `共 ${total} 次预测`;
}

// ====== 逐只准确率 ======
function renderAccuracyGrid() {
  const container = document.getElementById('accuracyGrid');
  if (!container) return;

  container.innerHTML = STOCKS.map(s => {
    const pc = PRED_COUNTS[s.code];
    if (!pc || pc.total === 0) {
      return `<div class="accuracy-card">
        <div class="stock-name-sm">${s.name}</div>
        <div class="pct" style="color:var(--text-muted)">--</div>
        <div class="text-muted" style="font-size:0.7rem;">暂无预测</div>
      </div>`;
    }

    const acc = Math.round(pc.right / pc.total * 100);
    const barColor = acc >= 70 ? 'var(--green)' : acc >= 45 ? 'var(--orange)' : 'var(--red)';

    return `<div class="accuracy-card">
      <div class="stock-name-sm">${s.name}</div>
      <div class="pct" style="color:${barColor}">${acc}%</div>
      <div style="font-size:0.7rem;">
        <span style="color:var(--green)">${pc.right}✓</span>
        <span class="text-muted">/</span>
        <span style="color:var(--orange)">${pc.partial}△</span>
        <span class="text-muted">/</span>
        <span style="color:var(--red)">${pc.wrong}✗</span>
      </div>
      <div class="accuracy-bar">
        <div class="accuracy-bar-fill" style="width:${acc}%;background:${barColor}"></div>
      </div>
    </div>`;
  }).join('');
}

// ====== 全部预测记录表 ======
function renderPredictionHistory(filterCode, filterResult, searchText) {
  const tbody = document.getElementById('predictionHistoryBody');
  if (!tbody) return;

  let data = [...PREDICTION_HISTORY];

  // Filter
  if (filterCode && filterCode !== 'all') {
    data = data.filter(p => p.code === filterCode);
  }
  if (filterResult && filterResult !== 'all') {
    data = data.filter(p => p.result === filterResult);
  }
  if (searchText) {
    const s = searchText.toLowerCase();
    data = data.filter(p => p.name.includes(s) || p.code.includes(s) || p.date.includes(s));
  }

  // Sort by date descending
  data.sort((a, b) => b.date.localeCompare(a.date));

  tbody.innerHTML = data.map(p => {
    const resultClass = p.result === 'right' ? 'pred-correct' :
                        p.result === 'partial' ? 'pred-partial' : 'pred-wrong';
    const resultBadge = p.result === 'right' ? '<span class="pred-badge right">✓ 正确</span>' :
                        p.result === 'partial' ? '<span class="pred-badge partial">△ 部分</span>' :
                        '<span class="pred-badge wrong">✗ 错误</span>';
    const predSign = p.pred_direction === 'up' ? '📈 看涨' : '📉 看跌';
    const actualClass = p.actual_change_pct > 0 ? 'up' : 'down';
    const deviation = p.result === 'right' ? '预测区间完全覆盖' :
                      p.result === 'partial' ? '方向正确，价格偏差' : '方向判断错误';

    return `<tr>
      <td>${p.date}</td>
      <td>${p.name} <span class="text-muted">${p.code}</span></td>
      <td>${predSign}</td>
      <td>${fmtPrice(p.pred_low)} ~ ${fmtPrice(p.pred_high)}</td>
      <td class="${actualClass}">${fmtPrice(p.actual_close)}</td>
      <td class="${actualClass}">${fmtPct(p.actual_change_pct)}</td>
      <td class="${resultClass}">${resultBadge}</td>
      <td class="text-muted" style="font-size:0.75rem;">${deviation}</td>
    </tr>`;
  }).join('');

  if (data.length === 0) {
    tbody.innerHTML = '<tr><td colspan="8" style="text-align:center;padding:20px;color:var(--text-muted)">无匹配记录</td></tr>';
  }

  document.getElementById('totalPreds').textContent = `显示 ${data.length} / ${PREDICTION_HISTORY.length} 条`;
}

// ====== 筛选器 ======
function populateFilters() {
  // Stock filter dropdown
  const stockFilter = document.getElementById('predStockFilter');
  if (stockFilter) {
    STOCKS.forEach(s => {
      const opt = document.createElement('option');
      opt.value = s.code;
      opt.textContent = s.name;
      stockFilter.appendChild(opt);
    });
  }

  // Initial render
  filterPredictions();
}

function filterPredictions() {
  const stockFilter = document.getElementById('predStockFilter');
  const resultFilter = document.getElementById('predResultFilter');
  const searchInput = document.getElementById('predSearch');

  renderPredictionHistory(
    stockFilter?.value || 'all',
    resultFilter?.value || 'all',
    searchInput?.value || ''
  );
}

// ====== 初始化 ======
if (document.getElementById('reviewStats')) {
  renderSidebarStocks();
  refreshWatchlistUI();
  initReviewPage();
}
