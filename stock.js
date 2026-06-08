/* ============================================================
   stock.js — 个股K线图 + 技术指标 + 预测对比
   依赖: lightweight-charts (CDN)
   ============================================================ */

// ====== URL 参数解析 ======
const urlParams = new URLSearchParams(window.location.search);
const stockCode = urlParams.get('code') || '688981';
let currentPeriod = '1m';

// 图表实例
let klineChart = null;
let volumeChart = null;
let indicatorChart = null;
let predictionChart = null;

// ====== 页面初始化 ======
function init() {
  if (!window.LightweightCharts) {
    document.getElementById('klineChart').innerHTML =
      '<div class="loading"><div class="spinner"></div>加载图表库中…</div>';
    setTimeout(init, 500);
    return;
  }

  const stock = STOCKS.find(s => s.code === stockCode);
  if (!stock) {
    document.getElementById('stockName').textContent = '未找到股票';
    return;
  }

  // 头部信息
  document.getElementById('stockName').textContent = stock.name;
  document.getElementById('stockCode').textContent = stock.code;
  document.title = stock.name + ' · 无名';

  const lp = LATEST_PRICES[stockCode];
  if (lp) {
    document.getElementById('currentPrice').textContent = fmtPrice(lp.price);
    const changeEl = document.getElementById('priceChange');
    changeEl.textContent = fmtPct(lp.change_pct);
    changeEl.className = 'price-change ' + (lp.change_pct > 0.1 ? 'up' : lp.change_pct < -0.1 ? 'down' : '');
  }

  // 渲染图表
  renderKlineChart();
  renderVolumeChart();
  renderIndicators();
  renderPredictions();
  renderSidebarStocks();
  refreshWatchlistUI();
  document.getElementById('footerUpdate').textContent = '最后更新: ' + LAST_UPDATE;
}

// ====== K线图 ======
function renderKlineChart() {
  const container = document.getElementById('klineChart');
  container.innerHTML = '';

  const allData = KLINE_DATA[stockCode] || [];
  if (allData.length === 0) {
    container.innerHTML = '<div class="loading">暂无K线数据</div>';
    return;
  }

  // 根据周期筛选数据
  const filteredData = filterByPeriod(allData, currentPeriod);

  // 创建图表
  klineChart = LightweightCharts.createChart(container, {
    layout: {
      background: { color: '#1c2129' },
      textColor: '#8b949e',
    },
    grid: {
      vertLines: { color: '#21262d' },
      horzLines: { color: '#21262d' },
    },
    crosshair: {
      mode: LightweightCharts.CrosshairMode.Normal,
      vertLine: { color: '#58a6ff', style: 2, width: 1, labelBackgroundColor: '#58a6ff' },
      horzLine: { color: '#58a6ff', style: 2, width: 1, labelBackgroundColor: '#58a6ff' },
    },
    timeScale: {
      borderColor: '#30363d',
      timeVisible: true,
      secondsVisible: false,
    },
    rightPriceScale: {
      borderColor: '#30363d',
      autoScale: true,
    },
  });

  // 响应式
  const resizeObserver = new ResizeObserver(entries => {
    for (const entry of entries) {
      klineChart.applyOptions({
        width: entry.contentRect.width,
        height: entry.contentRect.height,
      });
    }
  });
  resizeObserver.observe(container);

  // Candlestick 系列
  const candleSeries = klineChart.addCandlestickSeries({
    upColor: '#f85149',
    downColor: '#3fb950',
    borderUpColor: '#f85149',
    borderDownColor: '#3fb950',
    wickUpColor: '#f85149',
    wickDownColor: '#3fb950',
  });

  candleSeries.setData(filteredData.map(d => ({
    time: d.time,
    open: d.open,
    high: d.high,
    low: d.low,
    close: d.close,
  })));

  // MA均线
  addMA(candleSeries, filteredData, 5, '#f0c040');
  addMA(candleSeries, filteredData, 10, '#58a6ff');
  addMA(candleSeries, filteredData, 20, '#a371f7');
  addMA(candleSeries, filteredData, 60, '#3fb950');

  klineChart.timeScale().fitContent();
}

function addMA(candleSeries, data, period, color) {
  if (data.length < period) return;

  const maData = [];
  for (let i = period - 1; i < data.length; i++) {
    let sum = 0;
    for (let j = i - period + 1; j <= i; j++) {
      sum += data[j].close;
    }
    maData.push({
      time: data[i].time,
      value: sum / period,
    });
  }

  const maSeries = klineChart.addLineSeries({
    color: color,
    lineWidth: 1,
    priceLineVisible: false,
    lastValueVisible: true,
    crosshairMarkerVisible: true,
  });
  maSeries.setData(maData);
}

// ====== 成交量图 ======
function renderVolumeChart() {
  const container = document.getElementById('volumeChart');
  container.innerHTML = '';

  const allData = KLINE_DATA[stockCode] || [];
  if (allData.length === 0) return;

  const filteredData = filterByPeriod(allData, currentPeriod);

  volumeChart = LightweightCharts.createChart(container, {
    layout: {
      background: { color: '#1c2129' },
      textColor: '#8b949e',
    },
    grid: {
      vertLines: { color: '#21262d' },
      horzLines: { color: '#21262d' },
    },
    timeScale: {
      borderColor: '#30363d',
      timeVisible: false,
    },
    rightPriceScale: {
      borderColor: '#30363d',
      scaleMargins: { top: 0.1, bottom: 0 },
    },
    crosshair: { mode: LightweightCharts.CrosshairMode.Normal },
  });

  const resizeObserver = new ResizeObserver(entries => {
    for (const entry of entries) {
      volumeChart.applyOptions({
        width: entry.contentRect.width,
        height: entry.contentRect.height,
      });
    }
  });
  resizeObserver.observe(container);

  const volSeries = volumeChart.addHistogramSeries({
    priceFormat: { type: 'volume' },
    priceLineVisible: false,
  });

  volSeries.setData(filteredData.map((d, i) => {
    const isUp = i > 0 ? d.close >= filteredData[i - 1].close : true;
    return {
      time: d.time,
      value: d.volume,
      color: isUp ? 'rgba(248,81,73,0.4)' : 'rgba(63,185,80,0.4)',
    };
  }));

  volumeChart.timeScale().fitContent();

  // 同步K线图的时间轴
  klineChart.timeScale().subscribeVisibleTimeRangeChange(timeRange => {
    if (timeRange) {
      volumeChart.timeScale().setVisibleRange(timeRange);
    }
  });
  volumeChart.timeScale().subscribeVisibleTimeRangeChange(timeRange => {
    if (timeRange) {
      klineChart.timeScale().setVisibleRange(timeRange);
    }
  });
}

// ====== 技术指标面板 ======
function renderIndicators() {
  const allData = KLINE_DATA[stockCode] || [];
  if (allData.length === 0) return;

  const filteredData = filterByPeriod(allData, currentPeriod);
  const last = filteredData[filteredData.length - 1];
  const closes = filteredData.map(d => d.close);

  // 计算指标
  const ma5 = calcMA(closes, 5);
  const ma10 = calcMA(closes, 10);
  const ma20 = calcMA(closes, 20);
  const ma60 = calcMA(closes, 60);
  const rsi = calcRSI(closes, 14);
  const macd = calcMACD(closes);
  const boll = calcBollinger(closes, 20);
  const kdj = calcKDJ(filteredData, 9);

  // 渲染指标卡片
  const indicatorRow = document.getElementById('indicatorRow');
  const priceUp = last.close > (filteredData.length > 1 ? filteredData[filteredData.length - 2].close : last.close);
  const trendClass = priceUp ? 'bullish' : 'bearish';

  indicatorRow.innerHTML = `
    <div class="indicator-item">
      <div class="ind-label">MA5</div>
      <div class="ind-value ${last.close > ma5 ? 'bullish' : 'bearish'}">${ma5.toFixed(2)}</div>
    </div>
    <div class="indicator-item">
      <div class="ind-label">MA10</div>
      <div class="ind-value ${last.close > ma10 ? 'bullish' : 'bearish'}">${ma10.toFixed(2)}</div>
    </div>
    <div class="indicator-item">
      <div class="ind-label">MA20</div>
      <div class="ind-value ${last.close > ma20 ? 'bullish' : 'bearish'}">${ma20.toFixed(2)}</div>
    </div>
    <div class="indicator-item">
      <div class="ind-label">MA60</div>
      <div class="ind-value ${last.close > ma60 ? 'bullish' : (ma60 > 0 ? 'bearish' : 'neutral')}">${ma60 > 0 ? ma60.toFixed(2) : '--'}</div>
    </div>
    <div class="indicator-item">
      <div class="ind-label">RSI(14)</div>
      <div class="ind-value ${rsi > 70 ? 'overbought-ind' : rsi < 30 ? 'bearish' : 'neutral'}">${rsi.toFixed(1)}</div>
    </div>
    <div class="indicator-item">
      <div class="ind-label">MACD</div>
      <div class="ind-value ${macd.dif > macd.dea ? 'bullish' : 'bearish'}">${macd.dif.toFixed(3)}</div>
    </div>
    <div class="indicator-item">
      <div class="ind-label">KDJ-K</div>
      <div class="ind-value ${kdj.k > kdj.d ? 'bullish' : 'bearish'}">${kdj.k.toFixed(1)}</div>
    </div>
    <div class="indicator-item">
      <div class="ind-label">BOLL中轨</div>
      <div class="ind-value neutral">${boll.mid.toFixed(2)}</div>
    </div>
  `;

  // RSI/MACD/KDJ 组合图
  renderIndicatorChart(filteredData);
}

function renderIndicatorChart(data) {
  const container = document.getElementById('indicatorChart');
  if (!container) return;
  container.innerHTML = '';

  indicatorChart = LightweightCharts.createChart(container, {
    layout: { background: { color: '#1c2129' }, textColor: '#8b949e' },
    grid: { vertLines: { color: '#21262d' }, horzLines: { color: '#21262d' } },
    timeScale: { borderColor: '#30363d', timeVisible: false },
    rightPriceScale: { borderColor: '#30363d', autoScale: true },
    crosshair: { mode: LightweightCharts.CrosshairMode.Normal },
  });

  const resizeObserver = new ResizeObserver(entries => {
    for (const entry of entries) {
      indicatorChart.applyOptions({
        width: entry.contentRect.width,
        height: entry.contentRect.height,
      });
    }
  });
  resizeObserver.observe(container);

  // MACD
  const closes = data.map(d => d.close);
  const macdData = [];
  let ema12 = closes[0], ema26 = closes[0], dea = 0;
  for (let i = 0; i < closes.length; i++) {
    ema12 = ema12 * (1 - 2/13) + closes[i] * (2/13);
    ema26 = ema26 * (1 - 2/27) + closes[i] * (2/27);
    const dif = ema12 - ema26;
    dea = dea * (1 - 2/10) + dif * (2/10);
    const bar = (dif - dea) * 2;
    macdData.push({ time: data[i].time, dif, dea, bar });
  }

  const difSeries = indicatorChart.addLineSeries({ color: '#58a6ff', lineWidth: 1.5, priceLineVisible: false });
  difSeries.setData(macdData.map(d => ({ time: d.time, value: d.dif })));

  const deaSeries = indicatorChart.addLineSeries({ color: '#d2991d', lineWidth: 1.5, priceLineVisible: false });
  deaSeries.setData(macdData.map(d => ({ time: d.time, value: d.dea })));

  const macdBar = indicatorChart.addHistogramSeries({ priceLineVisible: false });
  macdBar.setData(macdData.map(d => ({
    time: d.time,
    value: d.bar,
    color: d.bar >= 0 ? 'rgba(248,81,73,0.5)' : 'rgba(63,185,80,0.5)',
  })));

  indicatorChart.timeScale().fitContent();
}

// ====== 预测 vs 实际 ======
function renderPredictions() {
  const stockPreds = PREDICTION_HISTORY.filter(p => p.code === stockCode);
  if (stockPreds.length === 0) {
    document.getElementById('predictionBody').innerHTML =
      '<div class="loading">暂无预测记录</div>';
    return;
  }

  // 准确率
  const total = stockPreds.length;
  const right = stockPreds.filter(p => p.result === 'right').length;
  const partial = stockPreds.filter(p => p.result === 'partial').length;
  const accuracy = Math.round(right / total * 100);
  document.getElementById('predAccuracy').textContent =
    `准确率 ${accuracy}% (${right}正确 / ${partial}部分 / ${total}总计)`;

  // 对比图表
  renderPredictionChart(stockPreds);

  // 详细表格
  const tbody = document.getElementById('predictionTableBody');
  tbody.innerHTML = stockPreds.map(p => {
    const resultClass = p.result === 'right' ? 'pred-correct' :
                        p.result === 'partial' ? 'pred-partial' : 'pred-wrong';
    const resultText = p.result === 'right' ? '✓ 正确' :
                       p.result === 'partial' ? '△ 部分' : '✗ 错误';
    const predSign = p.pred_direction === 'up' ? '📈 看涨' : '📉 看跌';

    return `<tr>
      <td>${p.date}</td>
      <td>${predSign}</td>
      <td>${fmtPrice(p.pred_low)} ~ ${fmtPrice(p.pred_high)}</td>
      <td>${fmtPrice(p.actual_close)}</td>
      <td class="${p.actual_change_pct > 0 ? 'up' : 'down'}">${fmtPct(p.actual_change_pct)}</td>
      <td class="${resultClass}">${resultText}</td>
    </tr>`;
  }).join('');
}

function renderPredictionChart(predictions) {
  const container = document.getElementById('predictionChart');
  if (!container || predictions.length === 0) return;
  container.innerHTML = '';

  predictionChart = LightweightCharts.createChart(container, {
    layout: { background: { color: '#1c2129' }, textColor: '#8b949e' },
    grid: { vertLines: { color: '#21262d' }, horzLines: { color: '#21262d' } },
    timeScale: { borderColor: '#30363d', timeVisible: true },
    rightPriceScale: { borderColor: '#30363d', autoScale: true },
    crosshair: { mode: LightweightCharts.CrosshairMode.Normal },
  });

  const resizeObserver = new ResizeObserver(entries => {
    for (const entry of entries) {
      predictionChart.applyOptions({
        width: entry.contentRect.width,
        height: entry.contentRect.height,
      });
    }
  });
  resizeObserver.observe(container);

  // 实际收盘价线
  const actualSeries = predictionChart.addLineSeries({
    color: '#58a6ff',
    lineWidth: 2,
    priceLineVisible: false,
    lastValueVisible: true,
  });
  actualSeries.setData(predictions.map(p => ({
    time: p.date,
    value: p.actual_close,
  })));

  // 预测上限
  const upperSeries = predictionChart.addLineSeries({
    color: 'rgba(248,81,73,0.3)',
    lineWidth: 1,
    lineStyle: 2,
    priceLineVisible: false,
    lastValueVisible: false,
  });
  upperSeries.setData(predictions.map(p => ({ time: p.date, value: p.pred_high })));

  // 预测下限
  const lowerSeries = predictionChart.addLineSeries({
    color: 'rgba(248,81,73,0.3)',
    lineWidth: 1,
    lineStyle: 2,
    priceLineVisible: false,
    lastValueVisible: false,
  });
  lowerSeries.setData(predictions.map(p => ({ time: p.date, value: p.pred_low })));

  predictionChart.timeScale().fitContent();
}

// ====== 周期切换 ======
function switchPeriod(period) {
  currentPeriod = period;

  // 更新按钮状态
  document.querySelectorAll('#periodBtns .btn').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.period === period);
  });

  // 重新渲染
  renderKlineChart();
  renderVolumeChart();
  renderIndicators();
}

function filterByPeriod(data, period) {
  const now = new Date(data[data.length - 1].time);
  let cutoff;

  switch (period) {
    case '1m': cutoff = new Date(now); cutoff.setMonth(cutoff.getMonth() - 1); break;
    case '3m': cutoff = new Date(now); cutoff.setMonth(cutoff.getMonth() - 3); break;
    case '6m': cutoff = new Date(now); cutoff.setMonth(cutoff.getMonth() - 6); break;
    case '1y': cutoff = new Date(now); cutoff.setFullYear(cutoff.getFullYear() - 1); break;
    default: return data;
  }

  const cutoffStr = cutoff.toISOString().split('T')[0];
  return data.filter(d => d.time >= cutoffStr);
}

// ====== 技术指标计算 ======
function calcMA(values, period) {
  if (values.length < period) return 0;
  return values.slice(-period).reduce((a, b) => a + b, 0) / period;
}

function calcRSI(closes, period) {
  if (closes.length < period + 1) return 50;
  let gains = 0, losses = 0;
  for (let i = closes.length - period; i < closes.length; i++) {
    const diff = closes[i] - closes[i - 1];
    if (diff > 0) gains += diff;
    else losses -= diff;
  }
  if (losses === 0) return 100;
  const rs = (gains / period) / (losses / period);
  return 100 - (100 / (1 + rs));
}

function calcMACD(closes) {
  let ema12 = closes[0], ema26 = closes[0], dea = 0;
  for (let i = 0; i < closes.length; i++) {
    ema12 = ema12 * (11/13) + closes[i] * (2/13);
    ema26 = ema26 * (25/27) + closes[i] * (2/27);
  }
  const dif = ema12 - ema26;
  dea = dif * 0.2 + dea * 0.8;
  return { dif, dea, bar: (dif - dea) * 2 };
}

function calcBollinger(closes, period) {
  if (closes.length < period) return { upper: 0, mid: 0, lower: 0 };
  const slice = closes.slice(-period);
  const mid = slice.reduce((a, b) => a + b, 0) / period;
  const variance = slice.reduce((sum, v) => sum + (v - mid) ** 2, 0) / period;
  const std = Math.sqrt(variance);
  return { upper: mid + 2 * std, mid, lower: mid - 2 * std };
}

function calcKDJ(data, period) {
  if (data.length < period) return { k: 50, d: 50, j: 50 };
  const slice = data.slice(-period);
  const high = Math.max(...slice.map(d => d.high));
  const low = Math.min(...slice.map(d => d.low));
  const close = slice[slice.length - 1].close;
  const rsv = high === low ? 50 : ((close - low) / (high - low)) * 100;
  const k = rsv * (1/3) + 50 * (2/3);
  const d = k * (1/3) + 50 * (2/3);
  return { k, d, j: 3 * k - 2 * d };
}

// ====== 启动 ======
if (document.getElementById('klineChart')) {
  renderSidebarStocks();
  refreshWatchlistUI();
  init();
}
