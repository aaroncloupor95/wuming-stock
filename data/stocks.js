const STOCKS = [
  {
    "code": "688981",
    "name": "中芯国际",
    "base_price": 68.5
  },
  {
    "code": "688256",
    "name": "寒武纪",
    "base_price": 245.0
  },
  {
    "code": "002371",
    "name": "北方华创",
    "base_price": 312.0
  },
  {
    "code": "688012",
    "name": "中微公司",
    "base_price": 158.0
  },
  {
    "code": "603501",
    "name": "韦尔股份",
    "base_price": 98.5
  },
  {
    "code": "603986",
    "name": "兆易创新",
    "base_price": 88.0
  },
  {
    "code": "688041",
    "name": "海光信息",
    "base_price": 112.0
  },
  {
    "code": "600584",
    "name": "长电科技",
    "base_price": 38.0
  },
  {
    "code": "002049",
    "name": "紫光国微",
    "base_price": 76.0
  },
  {
    "code": "000063",
    "name": "中兴通讯",
    "base_price": 32.5
  }
];
const LATEST_PRICES = {"688981": {"price": 61.35, "change_pct": -3.46}, "688256": {"price": 196.38, "change_pct": -2.17}, "002371": {"price": 293.66, "change_pct": -0.29}, "688012": {"price": 174.89, "change_pct": 1.05}, "603501": {"price": 107.17, "change_pct": 2.32}, "603986": {"price": 105.59, "change_pct": -0.09}, "688041": {"price": 97.04, "change_pct": 5.26}, "600584": {"price": 31.65, "change_pct": -4.24}, "002049": {"price": 58.63, "change_pct": -1.06}, "000063": {"price": 27.77, "change_pct": -2.73}};
const PRED_COUNTS = {"688981": {"total": 20, "right": 6, "partial": 10, "wrong": 4}, "688256": {"total": 20, "right": 15, "partial": 2, "wrong": 3}, "002371": {"total": 20, "right": 13, "partial": 4, "wrong": 3}, "688012": {"total": 20, "right": 9, "partial": 4, "wrong": 7}, "603501": {"total": 20, "right": 14, "partial": 6, "wrong": 0}, "603986": {"total": 20, "right": 12, "partial": 3, "wrong": 5}, "688041": {"total": 20, "right": 13, "partial": 5, "wrong": 2}, "600584": {"total": 20, "right": 11, "partial": 5, "wrong": 4}, "002049": {"total": 20, "right": 10, "partial": 6, "wrong": 4}, "000063": {"total": 20, "right": 8, "partial": 7, "wrong": 5}};
const LAST_UPDATE = '2026-06-08';