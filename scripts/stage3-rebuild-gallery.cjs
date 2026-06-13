'use strict';
const fs = require('fs');
const path = require('path');

const OUT = path.join(__dirname, '..', 'reports', 'screenshots', 'binance', 'manual-library', 'stage-3-library', 'contact-sheet', 'index.html');
const IMG_REL = '../../stage-2-live-review/images/';

// ─── ALL 55 FILES ──────────────────────────────────────────────────────────────
// status: 'done' = 26 already in library | 'clean' = 6 pending decision | 'mask' = 23 need blur
// blurType: 'email' | 'uid' | 'qr' | 'balance' | 'wallet' | 'check'
const FILES = [
  // ── DONE — 26 clean, already in library ──
  { id:'BN-001', file:'bn-001-registration-form-empty.webp',            sec:'registration', status:'done',  title:'Форма регистрации — пустая',            uses:['📋 Reg','🎁 Bonus','🥇 Gold'] },
  { id:'BN-007', file:'bn-007-registration-password-empty.webp',        sec:'registration', status:'done',  title:'Создание пароля',                       uses:['📋 Reg'] },
  { id:'BN-008', file:'bn-008-registration-password-filled.webp',       sec:'registration', status:'done',  title:'Пароль вводится',                       uses:['📋 Reg'] },
  { id:'BN-009', file:'bn-009-registration-welcome-referral-confirmed.webp', sec:'registration', status:'done', title:'Welcome — реферал подтверждён',     uses:['📋 Reg','🎁 Bonus'] },
  { id:'BN-013', file:'bn-013-kyc-ukraine-diia-doc-select.webp',        sec:'kyc',          status:'done',  title:'KYC — выбор документа (Украина)',        uses:['🪪 KYC'] },
  { id:'BN-014', file:'bn-014-kyc-id-upload-empty.webp',                sec:'kyc',          status:'done',  title:'KYC — загрузка ID (пустая)',             uses:['🪪 KYC'] },
  { id:'BN-018', file:'bn-018-dashboard-kyc-cta.webp',                  sec:'dashboard',    status:'done',  title:'Дашборд — CTA верификации',             uses:['🥇 Gold','🪪 KYC','📰 Review'] },
  { id:'BN-020', file:'bn-020-wallet-assets-zero.webp',                 sec:'wallet',       status:'done',  title:'Кошелёк — нулевой баланс',              uses:['💰 Wallet'] },
  { id:'BN-023', file:'bn-023-security-2fa-app-intro.webp',             sec:'security',     status:'done',  title:'2FA — введение (GA)',                   uses:['🔐 Security'] },
  { id:'BN-024', file:'bn-024-security-email-verify-empty.webp',        sec:'security',     status:'done',  title:'Email верификация — пустая',            uses:['🔐 Security'] },
  { id:'BN-029', file:'bn-029-spot-demo-mode.webp',                     sec:'trading',      status:'done',  title:'Спот — демо-режим',                     uses:['📈 Trading'] },
  { id:'BN-030', file:'bn-030-futures-demo-mode.webp',                  sec:'trading',      status:'done',  title:'Фьючерсы — демо-режим',                 uses:['📈 Trading'] },
  { id:'BN-031', file:'bn-031-futures-section-landing.webp',            sec:'trading',      status:'done',  title:'Фьючерсы — лендинг раздела',            uses:['📈 Trading'] },
  { id:'BN-032', file:'bn-032-p2p-express-buy-usdt.webp',               sec:'p2p',          status:'done',  title:'P2P Express — покупка USDT',            uses:['🤝 P2P','🥇 Gold'] },
  { id:'BN-034', file:'bn-034-p2p-kyc-required.webp',                   sec:'p2p',          status:'done',  title:'P2P — требование KYC',                  uses:['🤝 P2P','🪪 KYC'] },
  { id:'BN-038', file:'bn-038-fees-spot-margin.webp',                   sec:'fees',         status:'done',  title:'Комиссии — Спот / Маржа ⭐',             uses:['💸 Fees','📰 Review'] },
  { id:'BN-039', file:'bn-039-fees-usdm-futures.webp',                  sec:'fees',         status:'done',  title:'Комиссии — USD-M Фьючерсы ⭐',           uses:['💸 Fees'] },
  { id:'BN-040', file:'bn-040-fees-coinm-futures.webp',                 sec:'fees',         status:'done',  title:'Комиссии — COIN-M Фьючерсы',            uses:['💸 Fees'] },
  { id:'BN-041', file:'bn-041-options-contracts.webp',                  sec:'products',     status:'done',  title:'Опционы — контракты',                   uses:['🎯 Products'] },
  { id:'BN-042', file:'bn-042-trading-bots-active.webp',                sec:'bots',         status:'done',  title:'Торговые боты — активные',              uses:['🤖 Bots'] },
  { id:'BN-043', file:'bn-043-copytrading-selection.webp',              sec:'bots',         status:'done',  title:'Copy Trading — выбор трейдера',         uses:['🤖 Bots'] },
  { id:'BN-044', file:'bn-044-bots-type-selection.webp',                sec:'bots',         status:'done',  title:'Боты — выбор типа',                     uses:['🤖 Bots'] },
  { id:'BN-052', file:'bn-052-kyc-poland-geo.webp',                     sec:'kyc',          status:'done',  title:'KYC — Польша (гео-вариант)',             uses:['🪪 KYC'] },
  { id:'BN-053', file:'bn-053-kyc-uae-geo.webp',                        sec:'kyc',          status:'done',  title:'KYC — ОАЭ (гео-вариант)',               uses:['🪪 KYC'] },
  { id:'BN-054', file:'bn-054-kyc-georgia-geo.webp',                    sec:'kyc',          status:'done',  title:'KYC — Грузия (гео-вариант)',            uses:['🪪 KYC'] },
  { id:'BN-R03', file:'bn-r03-duplicate-email-verify.webp',             sec:'registration', status:'done',  title:'Email верификация — вариант 2',         uses:['📋 Reg'] },

  // ── CLEAN PENDING — 6 files awaiting decision ──
  { id:'BN-025', file:'bn-025-security-device-verify-selection.webp',   sec:'security',     status:'clean', title:'Выбор устройства верификации',          uses:['🔐 Security'] },
  { id:'BN-033', file:'bn-033-p2p-payment-methods.webp',                sec:'p2p',          status:'clean', title:'P2P — способы оплаты',                  uses:['🤝 P2P'] },
  { id:'BN-035', file:'bn-035-p2p-marketplace-listings.webp',           sec:'p2p',          status:'clean', title:'P2P — маркетплейс листингов',           uses:['🤝 P2P'] },
  { id:'BN-036', file:'bn-036-p2p-seller-rules.webp',                   sec:'p2p',          status:'clean', title:'P2P — правила продавца',                uses:['🤝 P2P'] },
  { id:'BN-037', file:'bn-037-p2p-seller-profile.webp',                 sec:'p2p',          status:'clean', title:'P2P — профиль продавца',                uses:['🤝 P2P'] },
  { id:'BN-051', file:'bn-051-blockchain-waiting.webp',                 sec:'deposit',      status:'clean', title:'Ожидание подтверждения блокчейна',       uses:['⬇️ Deposit'] },

  // ── MASK — 23 files, grouped by blur type ──
  // 📧 EMAIL (6)
  { id:'BN-002', file:'bn-002-registration-form-email-entered.webp',    sec:'registration', status:'mask', blurType:'email',   maskNote:'Размыть email-адрес в поле ввода',                         title:'Регистрация — email введён',            uses:['📋 Reg'] },
  { id:'BN-003', file:'bn-003-registration-form-tos-checked.webp',      sec:'registration', status:'mask', blurType:'email',   maskNote:'Размыть email-адрес, галочка ToS видна',                   title:'Регистрация — ToS принят',              uses:['📋 Reg'] },
  { id:'BN-004', file:'bn-004-registration-captcha-shown.webp',         sec:'registration', status:'mask', blurType:'email',   maskNote:'Проверить: виден ли email на фоне капчи → размыть',        title:'Регистрация — капча (показана)',         uses:['📋 Reg'] },
  { id:'BN-005', file:'bn-005-registration-captcha-completed.webp',     sec:'registration', status:'mask', blurType:'email',   maskNote:'Проверить: виден ли email после капчи → размыть',          title:'Регистрация — капча (пройдена)',         uses:['📋 Reg'] },
  { id:'BN-006', file:'bn-006-registration-email-verify.webp',          sec:'registration', status:'mask', blurType:'email',   maskNote:'Размыть email-адрес в тексте подтверждения',               title:'Регистрация — подтверждение email',      uses:['📋 Reg'] },
  { id:'BN-012', file:'bn-012-email-activation-code-gmail-dup.webp',    sec:'registration', status:'mask', blurType:'email',   maskNote:'Размыть 6-значный код + email-адрес; рамка/стрелка на код', title:'Gmail — письмо с кодом активации',      uses:['📋 Reg'] },

  // 👤 UID / ИМЯ (3)
  { id:'BN-019', file:'bn-019-account-overview-uid-visible.webp',       sec:'account',      status:'mask', blurType:'uid',     maskNote:'Размыть UID и имя в шапке аккаунта',                       title:'Аккаунт — обзор (UID виден)',           uses:['👤 Account'] },
  { id:'BN-021', file:'bn-021-account-limits-post-kyc.webp',            sec:'account',      status:'mask', blurType:'uid',     maskNote:'Размыть UID и имя в шапке лимитов',                        title:'Аккаунт — лимиты (после KYC)',          uses:['👤 Account','🪪 KYC'] },
  { id:'BN-022', file:'bn-022-security-2fa-checkup.webp',               sec:'security',     status:'mask', blurType:'uid',     maskNote:'Размыть UID и подсказку email в шапке',                    title:'Безопасность — чекап 2FA',              uses:['🔐 Security'] },

  // 🔐 QR-КОДЫ (4)
  { id:'BN-016', file:'bn-016-kyc-diia-qr-session.webp',                sec:'kyc',          status:'mask', blurType:'qr',      maskNote:'Размыть QR-код Diia (сессия может быть активна)',          title:'KYC — QR-сессия Diia',                  uses:['🪪 KYC'] },
  { id:'BN-017', file:'bn-017-kyc-phone-qr-upload.webp',                sec:'kyc',          status:'mask', blurType:'qr',      maskNote:'Размыть QR-код для загрузки с телефона',                   title:'KYC — QR загрузки с телефона',          uses:['🪪 KYC'] },
  { id:'BN-026', file:'bn-026-2fa-qr-code-raw.webp',                    sec:'security',     status:'mask', blurType:'qr',      maskNote:'⚠️ ОБЯЗАТЕЛЬНО: полностью размыть QR 2FA (реальный ключ!)', title:'Безопасность — QR-код 2FA',             uses:['🔐 Security'] },
  { id:'BN-R01', file:'bn-r01-biometric-face-id.webp',                  sec:'security',     status:'mask', blurType:'qr',      maskNote:'Решить: красивая рамка с аннотацией или обрезать чисто',    title:'Face ID — запрос биометрии',            uses:['🔐 Security'] },

  // 💰 БАЛАНС (2)
  { id:'BN-027', file:'bn-027-futures-terminal-live.webp',              sec:'trading',      status:'mask', blurType:'balance', maskNote:'Размыть баланс и маржу в панели ордеров',                  title:'Фьючерсы — живой терминал',             uses:['📈 Trading'] },
  { id:'BN-028', file:'bn-028-spot-terminal-live.webp',                 sec:'trading',      status:'mask', blurType:'balance', maskNote:'Размыть баланс в панели покупки/продажи',                  title:'Спот — живой терминал',                 uses:['📈 Trading'] },

  // 🔑 АДРЕС / TX (6)
  { id:'BN-045', file:'bn-045-deposit-network-selector.webp',           sec:'deposit',      status:'mask', blurType:'wallet',  maskNote:'Проверить: виден ли адрес кошелька → размыть',             title:'Депозит — выбор сети',                  uses:['⬇️ Deposit'] },
  { id:'BN-046', file:'bn-046-deposit-address-usdt-trc20.webp',         sec:'deposit',      status:'mask', blurType:'wallet',  maskNote:'Размыть адрес кошелька + QR депозита',                     title:'Депозит — адрес USDT TRC-20',           uses:['⬇️ Deposit'] },
  { id:'BN-047', file:'bn-047-withdrawal-form.webp',                    sec:'withdrawal',   status:'mask', blurType:'wallet',  maskNote:'Размыть адрес получателя в форме вывода',                  title:'Вывод — форма',                         uses:['⬆️ Withdrawal'] },
  { id:'BN-048', file:'bn-048-withdrawal-confirm.webp',                 sec:'withdrawal',   status:'mask', blurType:'wallet',  maskNote:'Размыть адрес в итоговом подтверждении',                   title:'Вывод — подтверждение',                 uses:['⬆️ Withdrawal'] },
  { id:'BN-049', file:'bn-049-withdrawal-submitted.webp',               sec:'withdrawal',   status:'mask', blurType:'wallet',  maskNote:'Размыть адрес + TX-хэш на экране отправки',                title:'Вывод — отправлено',                    uses:['⬆️ Withdrawal'] },
  { id:'BN-050', file:'bn-050-deposit-details.webp',                    sec:'deposit',      status:'mask', blurType:'wallet',  maskNote:'Проверить содержимое: размыть адрес/TX если виден',        title:'Депозит — детали транзакции',           uses:['⬇️ Deposit'] },

  // 🔍 ПРОВЕРИТЬ / РЕШИТЬ (1 осталась)
  { id:'BN-015', file:'bn-015-kyc-indonesia-nik-form.webp',             sec:'kyc',          status:'mask', blurType:'check',   maskNote:'Проверить: заполнены ли поля NIK → если да, размыть',      title:'KYC — форма NIK (Индонезия)',           uses:['🪪 KYC'] },
  { id:'BN-R04', file:'bn-r04-bybit-wrong-platform.webp',               sec:'withdrawal',   status:'mask', blurType:'check',   maskNote:'Bybit: проверить данные аккаунта — размыть если видны',    title:'Bybit — экран получения (для гайда)',   uses:['⬆️ Withdrawal'] },
];

// ─── BLUR TYPE META ────────────────────────────────────────────────────────────
const BLUR_TYPES = {
  email:   { icon:'📧', label:'Email / Код',    color:'#f97316', bg:'#2a1200' },
  uid:     { icon:'👤', label:'UID / Имя',      color:'#a78bfa', bg:'#1a1230' },
  qr:      { icon:'🔐', label:'QR-коды',        color:'#f87171', bg:'#250a0a' },
  balance: { icon:'💰', label:'Баланс',         color:'#fbbf24', bg:'#1c1500' },
  wallet:  { icon:'🔑', label:'Адрес / TX',     color:'#34d399', bg:'#021a10' },
  check:   { icon:'🔍', label:'Проверить',      color:'#94a3b8', bg:'#151820' },
};

const SEC_ICONS = { registration:'📝', kyc:'🪪', dashboard:'🏠', account:'👤', wallet:'💰', security:'🔐', trading:'📈', p2p:'🤝', fees:'💸', products:'🎯', bots:'🤖', deposit:'⬇️', withdrawal:'⬆️' };

// ─── COUNTS ────────────────────────────────────────────────────────────────────
const done  = FILES.filter(f=>f.status==='done');
const clean = FILES.filter(f=>f.status==='clean');
const mask  = FILES.filter(f=>f.status==='mask');

const maskByType = {};
Object.keys(BLUR_TYPES).forEach(t => maskByType[t] = mask.filter(f=>f.blurType===t));

// ─── CARD BUILDER ─────────────────────────────────────────────────────────────
function card(f) {
  const bt = f.blurType ? BLUR_TYPES[f.blurType] : null;
  const secIcon = SEC_ICONS[f.sec] || '📄';
  const statusBadge = f.status==='done'
    ? `<div class="badge bdone">✅ В БИБЛИОТЕКЕ</div>`
    : f.status==='clean'
    ? `<div class="badge bclean">✅ ЧИСТЫЙ</div>`
    : `<div class="badge bmask">${bt.icon} БЛЮР</div>`;

  const buttons = f.status==='done' ? `
      <div class="done-label">✅ Уже в библиотеке</div>` :
    f.status==='clean' ? `
      <div class="cbt">
        <button class="btn ba" onclick="dec('${f.id}','approve')">✅ В библиотеку</button>
        <button class="btn bx" onclick="dec('${f.id}','reject')">❌ Удалить</button>
      </div>` :
    `<div class="cbt">
        <button class="btn ba" onclick="dec('${f.id}','approve')">✅ Готово → библиотека</button>
        <button class="btn bm" onclick="dec('${f.id}','later')">⏳ Позже</button>
        <button class="btn bx" onclick="dec('${f.id}','reject')">❌ Удалить</button>
      </div>`;

  const maskRow = bt ? `<div class="mask-note" style="border-color:${bt.color}44;color:${bt.color}">
      <span class="blur-tag" style="background:${bt.bg};color:${bt.color};border-color:${bt.color}44">${bt.icon} ${bt.label}</span>
      ${f.maskNote}
    </div>` : '';

  return `<div class="cw" id="${f.id}" data-st="${f.status}" data-sec="${f.sec}" data-bt="${f.blurType||''}">
<div class="card ${f.status==='done'?'cdone':f.status==='clean'?'cclean':'cmask'}">
  <div class="ci">
    <a href="${IMG_REL}${f.file}" target="_blank">
      <img src="${IMG_REL}${f.file}" loading="lazy"
        onerror="this.closest('.ci').innerHTML='<div class=ime>not found</div>'"
        alt="${f.id}"/>
    </a>
    ${statusBadge}
  </div>
  <div class="cb">
    <div class="ct">
      <span class="cid">${f.id}</span>
      <span class="cs">${secIcon} ${f.sec}</span>
    </div>
    <div class="ctit">${f.title}</div>
    ${maskRow}
    <div class="cu">${f.uses.map(u=>`<span class="ub">${u}</span>`).join('')}</div>
    ${buttons}
    <div class="cvd" id="v-${f.id}"></div>
  </div>
</div></div>`;
}

// ─── ZONE: DONE (collapsible) ─────────────────────────────────────────────────
function zoneDone() {
  return `<div class="zone">
  <div class="zh zd" onclick="toggleDone()">
    <span>✅ Уже в библиотеке</span>
    <span class="zcount">${done.length}</span>
    <span id="done-toggle" style="margin-left:auto;font-size:11px;color:#555">▶ показать</span>
  </div>
  <div id="done-grid" style="display:none">
    <div class="grid">${done.map(card).join('')}</div>
  </div>
</div>`;
}

// ─── ZONE: CLEAN PENDING ───────────────────────────────────────────────────────
function zoneClean() {
  if (!clean.length) return '';
  return `<div class="zone">
  <div class="zh zc">🟡 Чистые — ждут решения <span class="zcount">${clean.length}</span></div>
  <div class="grid">${clean.map(card).join('')}</div>
</div>`;
}

// ─── ZONE: MASK (by blur type) ────────────────────────────────────────────────
function zoneMask() {
  const groups = Object.entries(maskByType).filter(([,arr])=>arr.length>0);
  let html = `<div class="zone">
  <div class="zh zm">✂️ Нужен блюр <span class="zcount">${mask.length}</span></div>`;
  for (const [type, arr] of groups) {
    const bt = BLUR_TYPES[type];
    html += `
  <div class="ghead" style="border-left-color:${bt.color}" data-gtype="${type}">
    <span style="color:${bt.color}">${bt.icon} ${bt.label}</span>
    <span class="zcount">${arr.length}</span>
  </div>
  <div class="grid" data-gtype="${type}">${arr.map(card).join('')}</div>`;
  }
  html += `</div>`;
  return html;
}

// ─── TOOLBAR BLUR TYPE PILLS ──────────────────────────────────────────────────
const typePills = Object.entries(BLUR_TYPES).map(([key,bt])=>{
  const cnt = maskByType[key]?.length || 0;
  if (!cnt) return '';
  return `<button class="tpill" data-bt="${key}" style="--pc:${bt.color}" onclick="filterBT(this,'${key}')">${bt.icon} ${bt.label} <span class="pcnt">${cnt}</span></button>`;
}).join('');

// ─── STATS ────────────────────────────────────────────────────────────────────
const total = FILES.length;
const pctDone = Math.round(done.length/total*100);

// ─── HTML ─────────────────────────────────────────────────────────────────────
const HTML = `<!DOCTYPE html>
<html lang="ru"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Binance Stage 3 — Masking Review</title>
<style>
*,*::before,*::after{box-sizing:border-box;margin:0;padding:0}
body{font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;background:#0d0f13;color:#cdd5e0;font-size:13px}

/* ── header ── */
header{background:#13161e;border-bottom:3px solid #F0B90B;padding:14px 22px;display:flex;align-items:center;gap:16px;flex-wrap:wrap}
header h1{font-size:17px;color:#F0B90B;white-space:nowrap}
.hstats{display:flex;gap:20px;font-size:11px;color:#666}
.hstat b{color:#cdd5e0}
.hbar{height:6px;border-radius:3px;background:#1e2535;overflow:hidden;width:160px;margin-top:6px}
.hbar-fill{height:100%;background:linear-gradient(90deg,#4ade80,#22c55e);border-radius:3px;transition:width .4s}

/* ── toolbar ── */
.tb{background:#151820;border-bottom:1px solid #1e2535;padding:8px 22px;display:flex;gap:6px;align-items:center;flex-wrap:wrap}
.tb select,.tb input{background:#1e2535;border:1px solid #2a3040;color:#cdd5e0;padding:4px 8px;border-radius:4px;font-size:11px}
.tbtn{padding:4px 12px;border-radius:4px;font-size:11px;font-weight:700;border:none;cursor:pointer;background:#1e2535;color:#8090a8}
.tbtn.y{background:#F0B90B;color:#000}
.tbtn.r{background:#3a1010;color:#f87171}
.ml{margin-left:auto}

/* ── blur type pills ── */
.tpills{background:#0f1118;border-bottom:1px solid #1a1f2a;padding:7px 22px;display:flex;gap:6px;flex-wrap:wrap;align-items:center}
.tpills-label{font-size:10px;color:#444;text-transform:uppercase;letter-spacing:.06em;margin-right:4px}
.tpill{padding:3px 10px;border-radius:12px;font-size:10px;font-weight:700;border:1px solid color-mix(in srgb,var(--pc) 40%,transparent);background:color-mix(in srgb,var(--pc) 8%,#0d0f13);color:var(--pc);cursor:pointer;transition:all .15s}
.tpill:hover,.tpill.active{background:color-mix(in srgb,var(--pc) 20%,#0d0f13);border-color:var(--pc)}
.tpill .pcnt{opacity:.6;margin-left:3px}
.tpill-all{padding:3px 10px;border-radius:12px;font-size:10px;font-weight:700;border:1px solid #2a3040;background:#1a1f2a;color:#8090a8;cursor:pointer}
.tpill-all.active{border-color:#F0B90B;color:#F0B90B;background:#1a1800}

/* ── zones ── */
.zone{padding:0 22px 6px}
.zh{font-size:14px;font-weight:700;padding:14px 0 6px;display:flex;align-items:center;gap:8px;cursor:pointer}
.zd{color:#3a5040}
.zc{color:#c9a200}
.zm{color:#fbbf24}
.zcount{font-size:10px;background:#1e2535;color:#666;padding:1px 7px;border-radius:9px}
.ghead{font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:.07em;padding:8px 0 5px 10px;border-left:3px solid;margin:6px 0 4px;display:flex;align-items:center;gap:8px}

/* ── grid ── */
.grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(275px,1fr));gap:8px;margin-bottom:8px}
.card{background:#14171e;border-radius:7px;overflow:hidden;border:1px solid #1e2535;transition:border-color .15s,opacity .15s}
.card:hover{border-color:#F0B90B44}
.cdone{opacity:.45;border-color:#111518!important}
.cdone:hover{opacity:.7;border-color:#1e5030!important}
.cclean{border-color:#1e3828}
.cmask{border-color:#2a2010}

/* ── card image ── */
.ci{position:relative;overflow:hidden}
.ci img{width:100%;height:165px;object-fit:cover;object-position:top;display:block;cursor:pointer;transition:height .2s}
.ci:hover img{height:260px}
.ime{height:60px;display:flex;align-items:center;justify-content:center;color:#444;font-size:10px}
.badge{position:absolute;top:6px;right:6px;font-size:8px;font-weight:800;padding:2px 6px;border-radius:8px;letter-spacing:.04em}
.bdone{background:#0a1a10;color:#2a6040;border:1px solid #1a3020}
.bclean{background:#0a2010;color:#4ade80;border:1px solid #1a5030}
.bmask{background:#1c1200;color:#fbbf24;border:1px solid #3a2800}

/* ── card body ── */
.cb{padding:8px 10px}
.ct{display:flex;align-items:center;gap:5px;margin-bottom:3px;flex-wrap:wrap}
.cid{font-family:monospace;font-size:11px;font-weight:700;color:#F0B90B}
.cs{font-size:9px;padding:1px 5px;border-radius:4px;background:#1e2535;color:#5070a0}
.ctit{font-size:11px;font-weight:600;color:#d0d8e8;margin-bottom:5px;line-height:1.3}
.mask-note{font-size:10px;line-height:1.4;border:1px solid;border-radius:4px;padding:4px 7px;margin-bottom:5px}
.blur-tag{font-size:9px;font-weight:700;padding:1px 5px;border-radius:4px;border:1px solid;display:inline-block;margin-bottom:3px;margin-right:4px}
.cu{display:flex;flex-wrap:wrap;gap:3px;margin-bottom:6px}
.ub{font-size:9px;padding:1px 5px;border-radius:4px;background:#1a2030;color:#607090}
.cbt{display:flex;gap:3px;flex-wrap:wrap}
.btn{font-size:9px;font-weight:700;padding:3px 8px;border-radius:4px;border:1px solid;cursor:pointer;transition:opacity .1s}
.btn:hover{opacity:.75}
.ba{background:#051505;border-color:#1a6030;color:#4ade80}
.bm{background:#120f00;border-color:#3a2800;color:#fbbf24}
.bx{background:#150505;border-color:#5a1010;color:#f87171}
.done-label{font-size:9px;color:#2a4030;font-style:italic;padding:2px 0}
.cvd{font-size:9px;font-weight:700;min-height:12px;margin-top:3px}
.va{color:#4ade80}.vm{color:#fbbf24}.vx{color:#f87171}.vl{color:#6080a8}

/* ── export ── */
#exp{display:none;background:#13161e;border:1px solid #2a3040;padding:12px;margin:0 22px 12px;border-radius:6px}
#exp h3{color:#F0B90B;margin-bottom:6px;font-size:13px}
#exp pre{font-size:10px;white-space:pre-wrap;color:#8090a8;background:#0d0f13;padding:8px;border-radius:4px;max-height:240px;overflow-y:auto}

/* ── filter hidden ── */
.cw.hidden{display:none}
footer{text-align:center;padding:12px;color:#1e2535;font-size:10px}
</style></head>
<body>
<header>
  <div>
    <h1>📚 Binance — Stage 3 Masking Review</h1>
    <div class="hbar"><div class="hbar-fill" id="prog-bar" style="width:${pctDone}%"></div></div>
  </div>
  <div class="hstats">
    <div><b>${done.length}</b><br>в библиотеке</div>
    <div><b>${clean.length}</b><br>ждут решения</div>
    <div><b>${mask.length}</b><br>нужен блюр</div>
    <div><b id="decided-cnt">0</b><br>решено сейчас</div>
  </div>
</header>

<div class="tb">
  <span id="ds" style="font-size:10px;color:#444">Решений: <span id="dec-num">0</span></span>
  <select onchange="fSec(this.value)">
    <option value="">Все разделы</option>
    ${[...new Set(FILES.map(f=>f.sec))].map(s=>`<option value="${s}">${SEC_ICONS[s]||''} ${s}</option>`).join('')}
  </select>
  <select onchange="fSt(this.value)">
    <option value="">Все статусы</option>
    <option value="done">✅ В библиотеке</option>
    <option value="clean">🟡 Чистые</option>
    <option value="mask">✂️ Блюр</option>
  </select>
  <input type="text" placeholder="поиск по ID или тексту…" oninput="fQ(this.value)" style="width:180px">
  <button class="tbtn y ml" onclick="exportAll()">📋 Export</button>
  <button class="tbtn" onclick="copyExp()" style="background:#1a2535;color:#60a0c0">Copy</button>
  <button class="tbtn r" onclick="resetAll()">Reset</button>
</div>

<div class="tpills">
  <span class="tpills-label">Направление блюра:</span>
  <button class="tpill-all active" onclick="filterBT(this,'')">Все</button>
  ${typePills}
</div>

${zoneDone()}
${zoneClean()}
${zoneMask()}

<div id="exp"><h3>📋 Export решений</h3><pre id="exp-pre"></pre>
  <button class="tbtn" onclick="document.getElementById('exp').style.display='none'" style="margin-top:8px;background:#1e2535;color:#8090a8">Закрыть</button>
</div>
<footer>Binance Stage 3 · ${total} файлов · ${done.length} в библиотеке · ${clean.length + mask.length} остаток · CryptoBonusWorld Pipeline</footer>

<script>
const LS = 'cbw-s3-v2';
let decs = JSON.parse(localStorage.getItem(LS)||'{}');

const labels = {approve:'✅ → Библиотека', later:'⏳ Позже', reject:'❌ Удалить'};
const lclass  = {approve:'va', later:'vl', reject:'vx'};

function render() {
  let n = 0;
  for (const [id,d] of Object.entries(decs)) {
    const el = document.getElementById('v-'+id);
    if (el) { el.textContent = labels[d]||''; el.className = 'cvd '+(lclass[d]||''); }
    const card = document.getElementById(id)?.querySelector('.card');
    if (card) {
      card.classList.remove('da','dm','dx','dl');
      if (d==='approve') card.classList.add('da');
      else if (d==='later') card.classList.add('dl');
      else if (d==='reject') card.classList.add('dx');
    }
    n++;
  }
  document.getElementById('dec-num').textContent = n;
  document.getElementById('decided-cnt').textContent = n;
}

function dec(id, val) {
  if (decs[id]===val) delete decs[id];
  else decs[id] = val;
  localStorage.setItem(LS, JSON.stringify(decs));
  render();
}

// filters
let fSt='', fSec='', fQ='', fBT='';
function applyFilters() {
  document.querySelectorAll('.cw').forEach(el => {
    const st  = el.dataset.st  || '';
    const sec = el.dataset.sec || '';
    const bt  = el.dataset.bt  || '';
    const txt = el.textContent.toLowerCase();
    const vis = (!fSt || st===fSt) && (!fSec || sec===fSec) && (!fBT || bt===fBT) && (!fQ || txt.includes(fQ));
    el.classList.toggle('hidden', !vis);
  });
}
function fSec(v){ fSec=v; applyFilters(); }
function fSt(v){  fSt=v;  applyFilters(); }
function fQ(v){   fQ=v.toLowerCase(); applyFilters(); }
function filterBT(btn, v) {
  fBT = v;
  document.querySelectorAll('.tpill,.tpill-all').forEach(b=>b.classList.remove('active'));
  btn.classList.add('active');
  applyFilters();
}

function toggleDone() {
  const g = document.getElementById('done-grid');
  const t = document.getElementById('done-toggle');
  const open = g.style.display !== 'none';
  g.style.display = open ? 'none' : 'block';
  t.textContent = open ? '▶ показать' : '▼ скрыть';
}

function exportAll() {
  const rows = Object.entries(decs).map(function(e){return e[0]+': '+e[1];}).join('\n');
  document.getElementById('exp-pre').textContent = rows || '(нет решений)';
  document.getElementById('exp').style.display = 'block';
}
function copyExp() {
  const txt = Object.entries(decs).map(function(e){return e[0]+': '+e[1];}).join('\n');
  navigator.clipboard.writeText(txt).catch(function(){});
}
function resetAll() {
  if (confirm('Сбросить все решения?')) {
    decs = {}; localStorage.removeItem(LS); render();
  }
}

// card click to expand — already handled by CSS hover
// init
document.addEventListener('DOMContentLoaded', render);
</script>
</body></html>`;

fs.mkdirSync(path.dirname(OUT), { recursive: true });
fs.writeFileSync(OUT, HTML, 'utf8');
const kb = Math.round(HTML.length / 1024);
console.log(`✅ Stage 3 gallery rebuilt → ${path.relative(path.join(__dirname,'..'), OUT)} (${kb}KB)`);
console.log(`   Done: ${done.length} | Clean pending: ${clean.length} | Needs mask: ${mask.length} | Total: ${total}`);
