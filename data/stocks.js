const STOCKS = [
  { "code": "603228", "name": "景旺电子", "base_price": 71.33 },
  { "code": "300136", "name": "信维通信", "base_price": 106.33 },
  { "code": "002913", "name": "奥士康", "base_price": 52.0 },
  { "code": "002050", "name": "三花智控", "base_price": 47.51 }
];
const LATEST_PRICES = {"603228": {"price": 71.33, "change_pct": -5.27}, "300136": {"price": 106.33, "change_pct": 8.5}, "002913": {"price": 52.0, "change_pct": -3.79}, "002050": {"price": 47.51, "change_pct": 1.06}};
const PRED_COUNTS = {"603228": {"total": 139, "right": 59, "partial": 4, "wrong": 76}, "300136": {"total": 139, "right": 60, "partial": 8, "wrong": 71}, "002913": {"total": 139, "right": 54, "partial": 15, "wrong": 70}, "002050": {"total": 139, "right": 51, "partial": 11, "wrong": 77}};
const LAST_UPDATE = '2026-06-09';
