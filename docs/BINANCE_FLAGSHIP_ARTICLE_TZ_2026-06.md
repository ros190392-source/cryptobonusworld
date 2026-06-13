# ТЗ: Флагманская статья /exchanges/binance/ — «лучшая SEO-страница мира»

**Документ:** BINANCE_FLAGSHIP_ARTICLE_TZ_2026-06.md
**Автор ТЗ:** Chief SEO Architect (ROLE 1)
**Дата:** 2026-06-11
**Исполнители:** контент-агенты + владелец (скрин-пайплайн и решения ROLE 0)
**Базовые документы (обязательны к прочтению исполнителем):**
`reports/binance-page-audit-2026-06-11.md` · `reports/serp-ai-intel-binance-2026-06-11.md` · `docs/BINANCE_FLAGSHIP_BLUEPRINT.md` · `docs/SEO_INTELLIGENCE_AND_AI_SEARCH_OPS.md` §3–4

**Статус-легенда:** `[DONE]` — уже реализовано в проде/билде 2026-06-11, не дублировать; `[TODO]` — делать по этому ТЗ; `[OWNER]` — требует решения/действия владельца.

**Канон фактов (единственный источник истины, другие числа запрещены):**

| Факт | Значение |
|---|---|
| Максимальный оффер | до **19,800 USDT** = Stage 1 ≤ $100 (sign-up tasks) + Stage 2 ≤ $19,700 (deposit & futures tiers), выплата **ваучерами** |
| Реферальный код | **CRYPTOBONUSW** (применяется только при регистрации, ретроактивно нельзя) |
| Апгрейд оффера | с $600 до 19,800 USDT, live с **7 мая 2026** |
| Типичный реальный заработок | **50–200 USDT** в fee-ваучерах |
| KYC | обязателен |
| ★ Задачи Stage 1 (LIVE-VERIFIED 2026-06-12, собственный аккаунт владельца) | Verify identity → **20 USDC** · Deposit **$10** → **30 USDC** · Trade **$10** → **20 USDC**; ваучеры = Trading Fee Rebate (Spot), валюта **USDC** |
| ★ Окно задач (LIVE) | таймер **26D:09H** на свежем аккаунте → **~30 дней** (прежний канон «14 дней» НЕВЕРЕН) |
| ★ Жизнь ваучера (LIVE, из Task Details) | **7 дней с момента выдачи** (прежний канон «3 дня после редима» НЕВЕРЕН для Stage-1 ваучеров) |
| ★ Гео-нюанс (LIVE) | пользователи из **Турции исключены из fiat-deposit задачи** — отразить на /countries/turkey/ |
| Исключённые страны | US, UK, Canada, Japan |
| Пруфы LIVE-фактов | reports/screenshots/binance/bn-owner-*-2026-06-12.png + _notes-owner-rewardshub-2026-06-12.txt |
| Пользователи | **280M+** |
| Наш рейтинг | 9.7 |
| Affiliate URL | `binance.com/join?ref=CRYPTOBONUSW` — **ИММУТАБЕЛЕН**, не трогать |

---

## 1. ЦЕЛЬ И KPI

### 1.1 Цель

Сделать /exchanges/binance/ канонической страницей мира по кластеру Binance-бонусов: №1 в органике по «binance bonus 19800» (окно 1–2 недели, один конкурент — cryptodealshub), топ-3 по «binance referral code 2026», цитируемость в AI Overviews / Perplexity / ChatGPT Search с показом кода CRYPTOBONUSW.

### 1.2 Целевые запросы с приоритетами

| Приоритет | Запрос | Текущее состояние SERP | Цель |
|---|---|---|---|
| P0 | binance bonus 19800 / binance 19800 usdt | 1 реальный affiliate-конкурент (cryptodealshub, BONUS369), остальное PR и Square-UGC | **№1 за 2 недели** |
| P0 | binance referral code 2026 | SERP замусорен Square-постами; независимые застряли на $100–600 | топ-3 за 4–6 недель; занять слоты после чистки Square |
| P1 | binance sign up bonus / binance welcome bonus | консенсус SERP — $100; никто не связывает с 19,800 | топ-5 + цитата в AIO |
| P1 | binance welcome bonus how to get | топ у binance.com — играть через HowTo schema + сроки + страны | HowTo rich result |
| P2 | binance bonus vs bybit bonus / binance vs bybit | перехват через compare-mini [DONE] + /compare/binance-vs-bybit/ | featured snippet таблицей |
| P2 | binance referral code doesn't work / can I add referral code after registering | дыра у всех конкурентов | PAA-захват через FAQ |
| P2 | binance bonus withdrawable / vouchers | никто честно не разбирает | цитата в AI (caveat-контент) |
| P3 | binance.us referral bonus | только nftevening разбирает | секция + FAQ |

### 1.3 KPI / метрики приёмки

1. **Page Quality Model ≥ 90/100** (Gold) по рубрике §3 SEO_INTELLIGENCE_AND_AI_SEARCH_OPS.md. Базлайн 87. Точки добора: Visual/Screenshot 5→10 (8 кадров первой волны), AI Answer Readiness → 10/10, Evidence & Trust → 15/15 (закрыть outdated bonus_expiry/deposit).
2. **AI Answer Readiness checklist §4 — 100% пунктов** (direct answer [DONE], structured facts с `(as of June 2026)`, comparison table [DONE], FAQ ≥8 real-PAA, entity clarity, citation signals без противоречий schema↔текст).
3. `npm run schema:check` exit 0; Rich Results Test: валидные Product, FAQPage, HowTo (5 шагов + изображения), BreadcrumbList; ноль ошибок/предупреждений «missing field».
4. Ноль внутренних фактических противоречий (страница ↔ bonus-codes ↔ schema ↔ evidence): автогреп чисел «19,800 / 280M / $50 / 14 days / 3 days» по dist.
5. Walkthrough: минимум 8 шагов из 15 со скриншотами (сейчас 1/15).
6. Лейблов «May 2026» в видимом тексте — 0 (сейчас 5); `lastVerified` ≥ 2026-06-11 во всех источниках данных (сейчас в части JSON 2026-05-28).
7. Мониторинг после деплоя: позиции по P0-запросам 2×/неделю; цитирование в AIO по «binance referral code» — еженедельный чек (см. §11).

---

## 2. СЕМАНТИЧЕСКОЕ ЯДРО

### 2.1 Primary keyword

**`binance bonus`** (+ годовой модификатор «2026») — закреплён в Title/H1 [DONE]. Сущность-якорь: «Binance» — первое слово H1 [DONE].

### 2.2 Secondary keywords (8–12)

1. binance referral code 2026
2. binance bonus 19800 / 19,800 USDT
3. binance sign up bonus
4. binance welcome bonus
5. binance referral code CRYPTOBONUSW (брендированный — наша цель в zero-click)
6. how to claim binance bonus
7. binance bonus vouchers
8. binance new user rewards
9. binance vs bybit bonus
10. binance kyc bonus requirements
11. binance minimum deposit bonus
12. binance.us referral

### 2.3 Long-tail / LSI (15–25, из SERP-разведки и PAA)

is the binance 19800 bonus real · binance bonus stage 1 stage 2 · binance $600 bonus upgraded · can I add referral code after registering binance · binance bonus without kyc · binance bonus excluded countries · are binance vouchers withdrawable · how long are binance vouchers valid · binance trading fee voucher · binance rewards hub · binance 20% fee discount referral · binance referral code not working · binance deposit $50 bonus · binance futures bonus tiers · 30-day allocation cap binance · first 1000 users per cycle · binance referral lite vs pro · binance vs mexc bonus · best binance promo code june 2026 · binance bonus reddit (интент «честно ли») · binance task-based rewards · binance sign up bonus $100 · binance welcome voucher 3 days · binance bonus minimum deposit 14 days · crypto exchange bonus wagering trap

### 2.4 Карта «запрос → секция страницы»

| Запрос | Секция (см. §4) |
|---|---|
| binance bonus / referral code 2026 | H1 + Answer Capsule + §4.2 Referral Code |
| binance bonus 19800, stage 1/stage 2, tiers | §4.3 Tier Table (NEW) |
| $600 upgraded / old binance bonus | §4.4 «$600 → 19,800» (NEW) |
| how to get/claim | §4.7 How to Claim + Walkthroughs |
| vouchers withdrawable / valid 3 days | §4.5 Vouchers vs Cash (NEW) |
| 30-day cap / first 1,000 users | §4.6 30-Day Window (NEW) |
| excluded countries | §4.10 Country Availability |
| binance.us | §4.11 Binance.US (NEW) |
| vs bybit / vs mexc | compare-mini [DONE] + §4.12 |
| kyc / minimum deposit | §4.6 Conditions + KYC walkthrough |
| referral code not working / add after registering | FAQ (§5) |

### 2.5 Частотность (анти-переспам)

- «binance bonus» и вариации — естественная плотность ≤ 1.2% (на ~8 500 слов это ≤ ~100 вхождений с учётом «Binance» как entity; не форсировать).
- «19,800 USDT» — 12–18 вхождений на страницу (число — наш дифференциатор, но каждое вхождение в осмысленном контексте: капсула, тир-таблица, тиры, FAQ, schema).
- «CRYPTOBONUSW» — 8–12 видимых вхождений (hero, капсула, promo-box, walkthrough шаг 1, FAQ, tier-таблица сноска). Код должен быть extractable в zero-click.
- Каждый secondary — минимум 1 раз в H2/H3 ИЛИ первом предложении своей секции, дальше синонимами.
- Запрещено: списки ключей, повтор точной фразы 2 раза в одном абзаце, keyword-stuffed alt-тексты.

---

## 3. TITLE / META / OG

### 3.1 Title `[DONE — оставить]`

`Binance Bonus 2026: Up to 19,800 USDT for New Traders` — 53 знака. Интент + год + сумма + аудитория. **Финальных правок не требуется.** Запрещено добавлять «referral code» в title (переспам с H2 §4.2 и риск выглядеть как coupon-спам под site-reputation-чистку).

### 3.2 Meta description `[DONE — оставить]`

`Binance bonus June 2026: up to 19,800 USDT with code CRYPTOBONUSW. Real screenshots, verified terms. Most users earn 50–200 USDT — here's how to qualify.` — 152 знака. Уже в проде. **Единственная регламентная правка:** при смене месяца «June 2026» обновляется в рамках monthly refresh (§11, P-9).

### 3.3 OG `[DONE / TODO-minor]`

- og:image `/og/exchange-binance.png` существует [DONE].
- `[TODO]` Перегенерировать OG-изображение с текстом «19,800 USDT · Code CRYPTOBONUSW · Verified June 2026» — текущий og мог рисоваться до апгрейда оффера; проверить, что на картинке не «$600»/«$100». Размер 1200×630, текст читаем в превью 600px.
- og:updated_time / article:modified_time = дата последней live-проверки (синхронно с dateModified schema).

---

## 4. ПОЛНАЯ СТРУКТУРА СТАТЬИ

Порядок секций сверху вниз. Объёмы — видимый текст без таблиц/alt. Итоговый целевой объём страницы: **8 800–9 500 слов** (сейчас ~8 100; добавляем ~900–1 400, ничего не раздуваем филлером — каждая новая секция несёт уникальные данные).

Скрин-пакет первой волны (8 кадров, одобрены stage-3 2026-06-09): **BN-009, BN-001, BN-023, BN-013, BN-014, BN-018, BN-038, BN-032.** Путь: stage-masked → `scripts/annotate-screenshot.mjs --out stage-5-published` → public/ → evidence-слот `[OWNER]` на каждом шаге публикации.

### 4.1 HERO + Answer Capsule `[DONE]`

- H1, hero с unlock-шагами, промокод-бокс, CTA, trust-chips — **реализовано, не трогать.**
- Answer Capsule `#quick-answer` — **реализована** (datestamped, 19,800, CRYPTOBONUSW, 50–200 USDT, «Last verified: June 11, 2026 · via live referral registration»). Регламент: дата в капсуле обновляется при каждой live-перепроверке, формулировка «Most users… earn 50–200 USDT» — неприкосновенный honesty-якорь.
- `[DONE 2026-06-12, размещение уточнено владельцем]` Скрин **BN-009 «Welcome! Linked to Referral ID CRYPTOBONUSW»** стоит в walkthrough «Create Account» **шаг 3** — хронологически точно: этот экран появляется сразу ПОСЛЕ ввода email и подтверждения почты (первый экран созданного аккаунта). Подпись/tip учат читателя: «welcome-экран — твой пруф, что код применился; нет упоминания Referral ID = код не прикрепился». В EditorSummary НЕ дублировать (анти-дубль правило).

### 4.2 H2: Binance Referral Code 2026 `[DONE — есть, доработать]`

- **Целевой запрос:** binance referral code 2026. **Объём:** 250–350 слов (существующий блок).
- `[TODO]` Добавить 2 предложения: (а) «The code cannot be added after registration — if you signed up without it, the bonus structure is not retroactive» (PAA №4, дыра конкурентов); (б) hedged про 20% fee discount: «Referral fee kickback rates vary by referrer tier; the discount shown at signup is the binding one» (PAA №15, без обещания «lifetime 20%» — это клейм конкурентов, не наш verified-факт).

### 4.3 ★ NEW H2: «Binance Bonus Structure: Stage 1 + Stage 2 Tier Table» `[TODO — главный контент-блок]`

- **Размещение:** в верхних 30% страницы, сразу после секции What's Included (#bonus-breakdown) или объединённо с ней.
- **Целевые запросы:** binance bonus 19800, binance bonus tiers, stage 1 stage 2.
- **Объём:** 300–400 слов + таблица.
- **Содержимое:**
  - Вводный абзац: «The 19,800 USDT figure is the sum of two stages: Stage 1 (sign-up tasks worth up to $100) and Stage 2 (deposit and futures volume tiers worth up to $19,700). Here is the full breakdown as of June 2026.»
  - **Таблица тиров** (extractable, любимый формат AI): колонки `Tier | Requirement (deposit / volume) | Reward | Voucher type | Deadline`. Stage 1 строки: регистрация по коду (20 USDT), KYC, депозит ≥$50, первый трейд — из verified-данных #bonus-breakdown. Stage 2: тиры депозит/futures-объём → награды (брать ТОЛЬКО из verified evidence / Rewards Hub скринов; **не копировать тир-цифры cryptodealshub без собственной проверки** — если live-проверка тиров Stage 2 не даст точных порогов, таблица Stage 2 публикуется с диапазонами и пометкой «exact thresholds shown in your Rewards Hub vary by region/cycle»).
  - Под таблицей честный блок 3 строки: «Rewards are paid as vouchers, not withdrawable USDT» · «Tasks expire 14 days after signup; each voucher expires 3 days after redemption» · «Allocation works in 30-day cycles — see below».
- **Скрин:** **BN-018 «Get 20 USD in Vouchers»** под Stage 1 строками — пруф реального тира. Alt: `Binance dashboard task card offering 20 USD in vouchers for completing identity verification (June 2026)`.
- **Тезис-дифференциатор:** у cryptodealshub таблица есть, но без скрин-пруфа из реального Rewards Hub — мы бьём именно пруфом.

### 4.4 ★ NEW H2: «$600 → 19,800 USDT: What Changed in May 2026» `[TODO — ход против устаревших гайдов]`

- **Размещение:** сразу после тир-таблицы.
- **Целевые запросы:** binance $600 bonus, binance bonus upgraded, old binance referral bonus.
- **Объём:** 200–280 слов.
- **Тезисы:**
  1. С **7 мая 2026** Binance подняла максимальный пакет наград нового пользователя с $600 до 19,800 USDT (двухстадийная структура).
  2. «Most guides you'll find in search still cite $100 or $600 — those numbers reflect the pre-May 2026 program, not the current one.» — формулировка строго по комплаенс-правилу §10: устаревшие данные в чужих гайдах, НЕ «их офферы меньше».
  3. Что не изменилось: KYC обязателен, выплата ваучерами, типичный реальный результат 50–200 USDT.
  4. Дата нашей последней проверки актуальной структуры.
- **Данные внутри:** мини-таблица 2 колонки «Before May 7, 2026 / Since May 7, 2026» (max amount, structure, payout type).
- **Без скрина** (старый оффер нечем пруфить — и не нужно).
- **Зачем:** это запрос-ловушка всего SERP — половина конкурентов будет проигрывать на свежести; секция = магнит для AI-цитат («AI любит change-over-time факты с датами»).

### 4.5 ★ NEW H2: «Vouchers vs Cash: What You Actually Get» `[TODO]`

- **Целевые запросы:** binance bonus withdrawable, are binance vouchers real money, binance voucher how to use.
- **Объём:** 300–400 слов.
- **Тезисы (честный разбор — caveat-контент, который цитируют AI):**
  1. Прямой ответ первым предложением: «No — the Binance welcome bonus is not withdrawable cash. It is paid in vouchers: trading-fee rebates and trial-fund vouchers.»
  2. Как работает fee-rebate ваучер (компенсирует комиссию, экономия реальна при активной торговле).
  3. Жёсткие сроки: ваучер живёт **3 дня после редима**; задачи — 14 дней. «Redeem a voucher only when you're ready to trade.»
  4. Честная математика: «To extract meaningful value from the upper tiers you need sustained futures volume — for most users the realistic outcome is 50–200 USDT in fee savings.»
  5. Анти-wagering-абзац (контент-уголок из разведки): большинство бонусов индустрии имеют скрытые условия; наш разбор — чем Binance-ваучеры отличаются от depositmatch-бонусов Bybit/MEXC.
- **Данные:** таблица «Voucher type | What it offsets | Validity | Can you withdraw it?» (3–4 строки).
- **Скрин:** нет в первой волне; кандидат второй волны — кадр Rewards Hub с активным ваучером (докапча в stage-2 очередь `[OWNER]`).

### 4.6 H2: Key Bonus Conditions `[DONE — есть, доработать]` + ★ NEW подсекция «The 30-Day Window»

- Существующая conditions-grid остаётся.
- `[TODO]` Формулировка «30 days after signup» → «**typically 30 days — confirm the exact deadline in your Rewards Hub**» (evidence bonus_expiry_days = outdated, confidence 0.27; до live-перепроверки утверждать нельзя). Сейчас «30 дней» повторяется 8 раз — все вхождения привести к hedged-варианту или удалить дубли.
- `[TODO]` ★ NEW H3 «The 30-Day Allocation Window» (120–180 слов): кампания работает циклами; разбор «first 1,000 users per cycle» — подавать как «Binance documentation references allocation cycles; availability of upper tiers may depend on the cycle — another reason not to delay KYC and the first deposit». Это перехват уникального контента cryptodealshub с более честной подачей.
- `[TODO]` KYC-лимиты: убрать «$8,000/day» из walkthrough-текстов; единая модель — «KYC is mandatory; unverified accounts are effectively withdraw-only» по официальной KYC-странице (P2-5 аудита).
- Min deposit строка: «$50 within 14 days of signup» — сверить, что число одинаково в conditions-grid, FAQ и schema.

### 4.7 H2: How to Claim This Bonus `[DONE]` + H2: Step-by-Step Walkthroughs `[TODO — скрины]`

HowTo schema 5 шагов + totalTime PT5M — **[DONE]**, не трогать логику.

**Walkthrough 1 «How to Create a Binance Account» (5 шагов, заполнено 1/5):**

| Шаг | Скрин `[TODO]` | Alt-текст |
|---|---|---|
| 1. Visit binance.com | bonus_referral_landing (уже стоит) [DONE] | — |
| 2. Email + password | **BN-001** (в кадре плашка 19,800) | `Binance registration form showing the up to 19,800 USDT new-user offer (June 2026)` |
| 3. Email verification | bn-006 — `[OWNER]` нужен аппрув (не вошёл в stage-3 каталог) | `Binance email verification code screen` |
| 4. 2FA | **BN-023** | `Binance authenticator app 2FA setup screen` |
| 5. Anti-phishing | нет кадра — текст без скрина, докапча в stage-2 очередь | — |

**Walkthrough 2 «Binance Identity Verification (KYC)» (0/5):**

| Шаг | Скрин `[TODO]` | Alt |
|---|---|---|
| 1–2. Doc select | **BN-013** | `Binance KYC document selection screen` |
| 3. Upload | **BN-014** | `Binance KYC ID document upload screen` |

+ `[TODO]` под walkthrough строка-факт: «Verification typically completes in minutes to a few hours; we timed ours» (если есть реальный замер — указать; если нет, hedged «typically under 24 hours per Binance»).

**Walkthrough 3 «How to Buy Crypto on Binance P2P» (0/5):**

| Шаг | Скрин `[TODO]` | Alt |
|---|---|---|
| 2. Фильтры/Express | **BN-032** | `Binance P2P Express interface buying USDT with USD` |

+ `[TODO]` CTA-клейм «Binance P2P is fee-free. Over 700 payment methods» → hedged: «Binance P2P charges no maker fee on most pairs — the effective cost is typically the spread; check current P2P fee terms» (P2-8 аудита, синхрон с FAQ).

**Объём walkthrough-текстов не менять** — структура утверждена; работа только скрины + 2 текстовых фикса.

### 4.8 H2: Binance Review: Is It Worth It in 2026? + Fees `[DONE — есть, доработать]`

- `[TODO]` Fees-секция: добавить скрин **BN-038** (spot/margin fee table) рядом с fee-таблицей. Alt: `Official Binance spot trading fee schedule showing 0.1% maker / 0.1% taker (June 2026)`.
- `[TODO]` Fact-table: добавить 3 строки живых market-данных из `exchange-intelligence/binance.json` с датой среза: «24h spot volume: $8.31B (checked 2026-06-08)», «CoinGecko Trust Score: 10/10 (#2)», «Coins listed: 430». Уникальные данные = +30–40% AI-видимости. Регламент обновления — еженочный/еженедельный refresh-скрипт.
- Verdict-блок (Best for / Avoid if / Key limitation) [DONE].

### 4.9 H2: Pros & Cons `[DONE]` — без изменений.

### 4.10 H2: Country Availability `[DONE — есть, проверить]`

- `[TODO]` Финальная сверка: excluded = **US, UK, Canada, Japan** одинаково в видимом тексте, FAQ и `excludedCountries` exchanges.json (Japan уже упоминается 7 раз — проверить, что и массив данных синхронизирован; P3-4 аудита).
- Тезис: «Bonus eligibility ≠ platform availability» — бонус исключает больше стран, чем сама платформа; 1 абзац различия.

### 4.11 ★ NEW H3 (внутри Country/Review-зоны): «Binance vs Binance.US: Different Platforms, Different Bonuses» `[TODO]`

- **Целевой запрос:** binance.us referral bonus, binance us difference. **Объём:** 150–220 слов.
- **Тезисы:** Binance.US — отдельная платформа для США; оффер 19,800 USDT на ней **не действует**; код CRYPTOBONUSW к Binance.US не относится; реферальная программа Binance.US исторически на порядок меньше (hedged: «historically in the ~$10 range — verify on Binance.US directly», без точного клейма — мы её не верифицировали); US-юзеры исключены из глобального оффера.
- **Зачем:** секция есть у nftevening (красть формат), закрывает PAA №13 и снимает юридический риск «US users misled».

### 4.12 H2: Compare / vs Bybit / vs MEXC `[DONE — оценить: оставить]`

Compare-mini таблица Binance/Bybit/MEXC (max bonus 19,800/30,000/10,000, KYC, min deposit, typical earnings) — **реализована, формат верный** (featured-snippet-ready, ссылки на /exchanges/bybit/, /exchanges/mexc/). Доработки:
- `[TODO]` Убедиться, что под таблицей есть 1 предложение-вывод («Bybit advertises a higher ceiling, but Binance's Stage 1 tasks are the easiest verified path to 50–200 USDT for a typical new user») — прямой ответ для AIO-формата comparison (§4.1 чеклиста: «winner + 1-sentence reason before/after table»).
- `[TODO]` Анкорные ссылки из этого блока: `/compare/binance-vs-bybit/`, `/compare/binance-vs-mexc/` (см. §9).

### 4.13 H2: Binance Bonus — FAQ `[DONE — ротация по §5]`

30 вопросов, FAQPage schema — есть. НЕ расширять сверх 30 (правило аудита). Ротация — §5.

### 4.14 ★ NEW блок (не секция — плашка): «How We Verified This Offer» `[TODO]`

- **Размещение:** между FAQ и Compare Other Top Bonuses, либо сразу под Answer Capsule (компактный вариант) — финальное место по вёрстке.
- **Объём:** 100–150 слов + мини-лог.
- **Содержимое (E-E-A-T, §7):** методология видимым текстом: «We registered a live account through our own referral link, completed KYC, and captured every screenshot on this page ourselves (June 2026). We re-check the bonus terms against the Rewards Hub on a fixed schedule.» + **лог проверок** (таблица 3 колонки: Date | What we checked | Result): 2026-06-04 bonus amount re-verified · 2026-06-09 screenshot library approved · 2026-06-11 tier conditions checked. Лог дополняется при каждой перепроверке.
- **Зачем:** May 2026 core update бьёт thin-affiliate без собственного тестирования; «we tested» видимым текстом — прямая защита + AI-citation-сигнал №1.

### 4.14b ★ NEW H2: «Sign Up via the Binance App (iOS & Android)» `[TODO — добавлено владельцем 2026-06-12]`

- **Размещение:** после walkthrough-блоков, перед Review-секцией.
- **Целевые запросы:** binance app referral code, binance ios bonus, binance app sign up.
- **Объём:** 150–250 слов.
- **Тезисы (КРИТИЧНО — механика кода на mobile, уточнено владельцем 2026-06-12):**
  1. **Главный мобильный путь — официальная download-страница с нашей атрибуцией:** `https://www.binance.com/download?ref=CRYPTOBONUSW` `[CONFIRMED владельцем 2026-06-12; проверена live: редирект /en/download?ref=CRYPTOBONUSW, ref выживает, на странице iOS/Android/Windows/Linux/Desktop; внесена в affiliate-links.ts как purpose: download_with_bonus]`. Установка через неё сохраняет партнёрство. Правило владельца: `?ref=CRYPTOBONUSW` можно дописывать и к другим binance-URL, но КАЖДУЮ такую ссылку обязательно проверять живым переходом до публикации.
  2. **Ручной ввод кода в приложении** — `[CONFIRMED менеджером Binance (Nailya, Affiliate Service Chat) 2026-06-12]`: ссылок с автоподстановкой кода в app-регистрацию НЕ существует (только веб); в приложении пользователь вводит CRYPTOBONUSW вручную в поле Referral ID при регистрации — после этого задания и бонус-ваучеры назначаются как на вебе. Также менеджер подтвердила: (а) обещать строго «up to 19,800» — сумма зависит от региона/аккаунта/риск-системы, максимум не гарантирован; (б) награды = скидки на комиссии + тестовые средства Binance Earn (не токен-ваучеры). Всё внесено в секции app/vouchers/How We Verified 2026-06-12.
  3. **Прямые ссылки на App Store/Google Play — давать (решение владельца 2026-06-12)** как вторичные, `rel="nofollow noopener"`, визуально слабее главного CTA. Порядок блока: (1) наша партнёрская download-страница — primary, с пояснением «one page, every platform — web, iOS, Android, desktop — with the bonus code attached»; (2) под ней прямые стор-ссылки для тех, кто хочет в стор напрямую — рядом с ними обязательная плашка-предупреждение о коде (см. п.4).
  4. Жирное предупреждение в секции: «Register through the referral link or download page — the bonus structure cannot be attached after registration» (синергия с FAQ PAA №10).
  5. Дальше флоу одинаков: KYC с камеры телефона быстрее десктопа; iOS и Android паритетны. Ссылка на полный app-гайд (Волна 3). Честная механика атрибуции — дифференциатор: НИ ОДИН конкурент это не разбирает.
- **Скрины:** 1 store-кадр (страница приложения в App Store с рейтингом — слот mobile_app) + 1–2 мобильных кадра 9:16 из библиотеки raw-mobile (128 шт., нужен owner-апрув после stage-обработки).
- **Кластер:** этот блок — мост к отдельному полному гайду «Binance App 2026» (отдельная страница, весь объём store+mobile библиотеки, запросы binance app *) — гайд в бэклоге Волны 3, перелинковка двусторонняя (правило 161%).

### 4.15 Хвост страницы `[DONE]`

Alternatives, Compare by Bonus Type, use-cases, «Binance is recommended for:» — без изменений, кроме P3-5 гигиены: `[TODO]` H2 «Binance is recommended for:» → без двоеточия («Who Binance Is Recommended For»); h3 «Buy Crypto on Binance» с классом section-title — выровнять семантику.

---

## 5. FAQ-ПЛАН (ротация 30 вопросов)

Принцип: 30 — потолок. Каждая замена = слабый/дублирующий вопрос → реальный PAA из разведки (§5 serp-ai-intel). Ответы 1–3 предложения (факты) / 3–6 (процессы), все числа из канона фактов.

### 5.1 Обнаруженный дефект `[TODO — критично]`

**«Is Binance safe and legitimate?» присутствует ДВАЖДЫ** в текущем FAQ (подтверждено грепом dist 2026-06-11). Дубль удалить — это бесплатный слот.

### 5.2 Список замен (вопрос-кандидат на вылет → чем заменяем)

| # | Убрать (слабый/дубль) | Поставить (PAA из разведки) | Обоснование |
|---|---|---|---|
| 1 | «Is Binance safe and legitimate?» (2-е вхождение, дубль) | **«Is the Binance 19,800 USDT bonus real, and how is it structured?»** (PAA №3) | прямой P0-запрос; ответ: да, real since May 7 2026, Stage 1+Stage 2, vouchers, типично 50–200 |
| 2 | «Does Binance have a mobile app?» (тривиальный, нулевой бонус-интент) | **«Can I add a referral code after registering on Binance?»** (PAA №4) | ответ «No — only at signup» — дыра всех конкурентов, сильный PAA |
| 3 | «What is SAFU on Binance?» (есть в review-тексте, дубль интента) | **«How long are Binance bonus vouchers valid?»** (PAA №9) | ответ: 3 дня после редима; задачи 14 дней — уникальные verified-цифры |
| 4 | «What is BNB and how does it reduce Binance fees?» (закрыто fee-секцией) | **«Why didn't I receive my Binance welcome bonus? / What if the code doesn't work?»** (PAA №10) | troubleshooting-интент, формат «5 причин» — у nftevening целая секция, мы закрываем FAQ-ответом |
| 5 | «Does Binance have proof of reserves?» (есть отдельная PoR-секция со скрином — дубль) | **«Who gets the full 19,800 USDT — what are the tiered tasks?»** (PAA №16) | управление ожиданиями + анти-кликбейт-позиционирование |
| 6 | «What is Binance's withdrawal limit?» (противоречивые лимиты — P2-5; после унификации вопрос малоценен) | **«What's the difference between Binance Referral Lite and Referral Pro?»** (PAA №12) | закрывает сравнительный под-интент referral-кластера |

### 5.3 Оставить без изменений (опорные)

«What is the Binance referral code for 2026?» (ответ начинается с CRYPTOBONUSW), «How does the Binance welcome bonus work?», «Can you withdraw the Binance bonus funds?» (синхрон с §4.5: vouchers, not cash), «What is the minimum deposit…» ($50/14 days), «Does Binance require KYC…», «Which countries…» (US/UK/Canada/Japan), «What are the differences between Binance and Binance.US?», «How long does Binance KYC take?», fee/P2P-вопросы.

### 5.4 Правила ответов

- Каждый ответ с числом — `(as of June 2026)` или дата проверки.
- Ответы не противоречат Answer Capsule и тир-таблице (автосверка чисел перед билдом).
- FAQPage schema обновляется автоматически из того же источника — НЕ вести два списка.

---

## 6. SCHEMA-ПЛАН

### 6.1 Текущее состояние (8 блоков) `[DONE — каркас не трогать]`

Product · WebPage+ReviewPage · FinancialService · FAQPage (30 Q) · BreadcrumbList · Person (Oleksandr Shadurskyi) · ImageGallery · HowTo. Дублей нет; `_bonusPriceSafe`-гейт для Offers.price работает; ratingCount/reviewCount=624 **уже снят** [DONE] — editorial Review остаётся.

### 6.2 Изменения `[TODO]`

| Что | Действие |
|---|---|
| HowTo «Create Account» | 5 шагов + totalTime PT5M **[DONE]**. После публикации скринов: добавить `image` в HowToStep 2 (BN-001) и 4 (BN-023) |
| FAQPage | автоматически отражает ротацию §5; после ротации — Rich Results Test |
| ImageGallery / ImageObject | добавить ImageObject для каждого нового опубликованного кадра (BN-009, BN-001, BN-023, BN-013, BN-014, BN-018, BN-038, BN-032): `contentUrl`, `caption` = подпись на странице, `datePublished` = дата публикации кадра. Всё внутри ОДНОГО консолидированного ImageGallery (механика bybit-багфикса) |
| dateModified / lastVerified | поднять до даты live-перепроверки (≥2026-06-11) во ВСЕХ местах: exchanges.json lastVerified/updatedAt/offerLastChecked, schema dateModified, og:updated_time, видимые плашки. Сейчас в части данных висит 2026-05-28 — рассинхрон с капсулой («June 11») = противоречие schema↔текст, прямое нарушение citation-чеклиста §4.6 |
| Product.offers | трогать только при изменении verified bonus_amount (гейт сам разрулит) |

### 6.3 ЗАПРЕЩЕНО

1. **aggregateRating с фейковым ratingCount/reviewCount** — снят, возврат запрещён до появления реального механизма сбора отзывов (риск manual action «Spammy structured markup»).
2. **Второй HowTo-блок** в текущей архитектуре (HowTo только для первого флоу — консолидированное решение; KYC-флоу вторым HowTo НЕ эмитить без отдельного решения ROLE 1 + проверки на дубли).
3. Schema-факты, отсутствующие в видимом тексте (противоречие schema↔страница).
4. HowTo с шагами без текста / ImageObject на неопубликованные файлы.

---

## 7. E-E-A-T ТРЕБОВАНИЯ

1. **Автор:** Oleksandr Shadurskyi — AuthorCard + Person schema [DONE]. `[TODO]` Проверить единый slug `/reviewers/...` (Oleksandr vs Alexandr — P3-7): оба упоминания должны вести на один существующий URL.
2. **Даты:** видимая плашка «Last verified: <дата> · method: live registration» [DONE в капсуле]; `[TODO]` синхронизировать все источники дат (§6.2) и убрать 5 остаточных «May 2026» из видимого текста.
3. **Методология видимым текстом:** блок «How We Verified This Offer» (§4.14) + ссылка на /methodology/.
4. **Лог проверок:** таблица Date/What/Result в блоке верификации; пополняется при каждой перепроверке — это «своя статистика», которой нет у конкурентов.
5. **«We tested»-формулировки** (обязательные паттерны, использовать в walkthrough и капсуле): «We registered through this exact link», «captured on our own account», «we re-checked the Rewards Hub on <date>», «our test account received the 20 USDT registration voucher». Запрещено «we tested» без реального артефакта (скрин/дата/лог) — клейм-дисциплина проекта.
6. **Trust-блок:** утверждение «Screenshots captured manually on the live Binance platform» становится правдой только после публикации скрин-пакета — до этого момента walkthrough-секции деплоить с текущей формулировкой нельзя в связке с новым verification-блоком (порядок работ §11 это учитывает).
7. **Честность как ранговый актив:** «most users earn 50–200 USDT» — сохранять во всех ключевых блоках; это одновременно анти-кликбейт-дифференциатор и AI-citation-магнит.

---

## 8. AI-SEARCH ТРЕБОВАНИЯ (июнь 2026)

Контекст: AIO на ~48% запросов; цитата в AIO = +35% кликов; 55% цитат — из верхних 30% страницы; собственные данные = +30–40% видимости; zero-click 58.5% — поэтому даже показ кода CRYPTOBONUSW без клика = конверсия.

| # | Требование | Статус |
|---|---|---|
| 1 | Прямой ответ в первых 100 словах: код + сумма + дата + honest expectation | **[DONE]** — Answer Capsule. Не разбавлять контентом выше неё |
| 2 | Таблицы в верхних 30%: тир-таблица Stage 1/2 (§4.3) + compare-mini | compare-mini [DONE]; тир-таблица **[TODO]** — разместить ВЫШЕ walkthrough |
| 3 | Собственные данные: лог проверок, фактические суммы наших ваучеров, live market-данные с датой среза (§4.8), опционально «мы проверили N кодов из топ-10 — M мёртвых» (вторая волна, отдельная мини-секция/гайд) | **[TODO]** |
| 4 | Дата проверки везде: `(as of June 2026)` при каждом числе, видимый «Last verified», честный dateModified | частично [DONE], рассинхрон дат **[TODO]** §6.2 |
| 5 | Hedged-формулировки для неподтверждённого: «typically 30 days», «historically ~$10 — verify on Binance.US», «no maker fee on most pairs — effective cost is the spread». Категоричные клеймы только для verified-фактов канона | **[TODO]** §4.6/4.7/4.11 |
| 6 | May 2026 core update (анти-thin-affiliate): собственное тестирование НА ВИДУ — скрины с CRYPTOBONUSW в кадре, блок верификации, лог. Это главный страховой полис страницы | **[TODO]** §4.14 + скрины |
| 7 | Site reputation abuse / чистка Binance Square: еженедельный SERP-мониторинг P0-запросов; при выпадении Square-постов — немедленный refresh страницы (обновить дату проверки, добавить 1 свежий факт) и пуш, чтобы занять освободившиеся слоты «свежей» страницей | регламент **[TODO]** §11 P-9 |
| 8 | Entity clarity: Binance — первое слово H1 [DONE]; fact-table с founded/HQ/licences [DONE]; противоречий schema↔текст быть не должно (даты!) | **[TODO]** даты |
| 9 | Извлекаемость кода: CRYPTOBONUSW рядом с цифрой 19,800 и датой минимум в 3 extractable-местах (капсула, тир-таблица, FAQ-ответ №1) — чтобы AI-ответ воспроизводил связку «код+сумма+дата» целиком | **[TODO]** проверка после вёрстки |

---

## 9. ВНУТРЕННЯЯ ПЕРЕЛИНКОВКА (161%-правило кластера)

Страница, ранжирующаяся по main query + хотя бы одному sub-query, цитируется в AI на 161% чаще → кластер должен быть связан явными анкорами в обе стороны.

### 9.1 Исходящие с флагмана (контекстные, в дополнение к существующим 162 ссылкам)

| Куда | Анкор (точный текст) | Из какой секции |
|---|---|---|
| /bonus-codes/binance/ | `current Binance promo code terms` | §4.2 Referral Code (существующий блок «Working promo codes» [DONE] — контент целевой страницы уже приведён к 19,800 ✅ 2026-06-11) |
| /compare/binance-vs-bybit/ | `full Binance vs Bybit bonus comparison` | под compare-mini таблицей |
| /compare/binance-vs-mexc/ | `Binance vs MEXC: which bonus is easier to claim` | под compare-mini |
| /compare/binance-vs-okx/ | `Binance vs OKX comparison` | Alternatives [DONE — есть] |
| /guides/how-to-buy-usdt/ | `how to buy USDT for your first deposit` | §4.6 Conditions (min deposit $50) |
| /guides/best-p2p-crypto-exchanges/ | `best P2P crypto exchanges` | P2P walkthrough [DONE — есть] |
| /exchanges/ (категория) | `all exchange reviews` | хвост [DONE] |
| /methodology/ | `our verification methodology` | блок «How We Verified» §4.14 **[TODO]** |
| /reviewers/<canonical-slug>/ | имя автора | AuthorCard [DONE, проверить slug] |

### 9.2 Входящие на флагман (обязательные, проверить/добавить)

| Откуда | Анкор |
|---|---|
| /bonus-codes/binance/ | `full Binance review and bonus breakdown` |
| /compare/binance-vs-bybit/, /compare/binance-vs-mexc/, /compare/okx-vs-binance/, /compare/coinbase-vs-binance/ | `Binance bonus: up to 19,800 USDT — full terms` |
| Хаб «Best Crypto Exchange Bonuses» (роундап-страница/категория) | `Binance — up to 19,800 USDT (verified June 2026)` — строка таблицы хаба ОБЯЗАНА показывать 19,800, не старые числа |
| /guides/* с упоминанием Binance | `Binance welcome bonus guide` |
| /countries/* где Binance доступна | `Binance bonus terms for new users` (НЕ для US/UK/Canada/Japan страниц) |

### 9.3 Правила

- Анкоры разнообразные (не повторять один exact-match анкор более 2 раз по сайту).
- Ноль ссылок с конфликтующими числами в анкорах/сниппетах целевых страниц — перед деплоем греп «$100», «$600», «100 USDT» по страницам кластера: каждое вхождение либо в контексте Stage 1/истории апгрейда, либо удаляется.
- Geo-ссылки tr/in/id/ng/br/vn/ph = «#» — `[OWNER]` решение по гео-лендингам отдельно (P3-1), в скоуп этого ТЗ не входит.

---

## 10. ЧЕСТНОСТЬ / КОМПЛАЕНС

### 10.1 Запрещённые формулировки

- «Free money», «guaranteed 19,800», «get 19,800 USDT» без «up to» — ВСЕГДА «up to 19,800 USDT».
- «Withdrawable bonus», «cash bonus» — только «vouchers / fee rebates / trial funds».
- «Their offers are smaller» о конкурентах-гайдах — ЗАПРЕЩЕНО. Каноническая формулировка: «**many guides still cite the pre-May 2026 figures ($100–600) — those reflect the older program**» (устаревшие данные в чужих гайдах, не принижение чужих офферов).
- «Lifetime 20% discount» — без верификации только hedged.
- «Fee-free P2P» безусловно — запрещено (P2-8).
- Любые цифры лимитов/тиров не из канона фактов или verified evidence.

### 10.2 Обязательные дисклеймеры

- **Voucher-дисклеймер** при каждом крупном упоминании суммы (капсула [DONE], тир-таблица, FAQ): «paid as vouchers, not withdrawable USDT; vouchers expire 3 days after redemption».
- **Гео-оговорка** рядом с CTA-зонами и в условиях: «Not available to residents of the US, UK, Canada and Japan; bonus eligibility differs from platform availability.»
- **Срок задач:** «tasks must be completed within 14 days of signup».
- **Ожидания:** «most users earn 50–200 USDT» — в капсуле, тир-таблице и vouchers-секции.
- **Риск-дисклеймер** футера/affiliate disclosure — без изменений [DONE], НЕ прятать глубже, чем сейчас (конкуренты прячут в футер — мы держим выше, это E-E-A-T-плюс).
- «Cannot be applied retroactively» у промокод-бокса [DONE] — сохранять.

### 10.3 Данные

- Все факты — только из канона (§0) и verified evidence; новые цифры Stage 2 тиров — только после live-проверки `[OWNER/агент с headless]`.
- Запрещено копировать тир-пороги, «first 1,000 users» и проценты у cryptodealshub/Square как факт — только как hedged-референс «documentation references…» до собственной верификации.

---

## 11. ПЛАН РАБОТ

Порядок исполнения; зависимости указаны. Объёмы — для контент-агента (слова нового текста) и владельца (кадры).

| # | Работа | Объём | Блокирует | Критерий приёмки |
|---|---|---|---|---|
| **P-1** | **Live-перепроверка оффера** (headless-регистрация / Rewards Hub): Stage 2 тир-пороги, «30 days», deposit-условие; закрыть outdated-факты в evidence/binance.json; поднять lastVerified/offerLastChecked/dateModified до даты проверки ВЕЗДЕ (exchanges.json, schema, og:updated_time) `[OWNER+агент]` | 0.5 дня | P-2, P-4, P-7 | evidence: bonus_expiry/deposit confidence ≥0.85 или hedged-формулировки зафиксированы; греп «2026-05-28» и «May 2026» по dist = 0 в видимом тексте |
| **P-2** | **Тир-таблица Stage 1/Stage 2** (§4.3) + блок «$600 → 19,800» (§4.4) | 500–680 слов + 2 таблицы | — (зависит от P-1 для точных тиров; при задержке P-1 публиковать с диапазонами+hedge) | таблица в верхних 30% страницы; все числа = канон/evidence; voucher-дисклеймер под таблицей |
| **P-3** | **Скрин-пакет первой волны, 8 кадров**: BN-009, BN-001, BN-023, BN-013, BN-014, BN-018, BN-038, BN-032 → annotate stage-5 → `[OWNER]` аппрув → public/ → evidence-слоты → ImageObject в schema | 8 кадров, 0.5–1 день | P-5, частично P-7 | каждый кадр: callout по style-guide, alt-текст из §4, слот в evidence status available; Rich Results: HowToStep.image у шагов 2 и 4 |
| **P-4** | **Vouchers vs Cash** (§4.5) + **30-Day Window H3** (§4.6) + KYC-лимиты унификация + P2P hedge (§4.7) | 450–600 слов | — | прямой ответ «No — not withdrawable» первым предложением; «$8,000» в dist = 0; «fee-free» в dist = 0 |
| **P-5** | **Расстановка скринов** по walkthrough/fees/bonus-breakdown/EditorSummary (§4.1, 4.3, 4.7, 4.8) | вёрстка | требует P-3 | walkthrough ≥8/15 шагов со скринами; BN-009 у EditorSummary; подписи и alt по ТЗ |
| **P-6** | **Binance.US секция** (§4.11) + Country-сверка Japan (§4.10) + хвост-гигиена H2/H3 (§4.15) | 200–280 слов | — | excludedCountries синхронны во всех источниках; H2 без двоеточия |
| **P-7** | **Блок «How We Verified This Offer» + лог проверок** (§4.14, §7) | 150–200 слов + таблица | требует P-1 (даты), желательно P-3 (скрины как пруф) | методология + лог ≥3 строк видимым текстом; ссылка на /methodology/; формулировка «screenshots captured manually» подтверждена реальными кадрами |
| **P-8** | **FAQ-ротация** (§5): удалить дубль «Is Binance safe…», 6 замен на PAA | ~600 слов новых ответов | согласован с P-2/P-4 (числа) | FAQ = 30 уникальных вопросов; FAQPage schema валидна; ответы не противоречат капсуле/таблице |
| **P-9** | **Перелинковка** (§9): новые анкоры исходящие + аудит входящих по кластеру, греп конфликтных чисел | 0.5 дня | после P-2 (анкор на тир-таблицу) | все обязательные анкоры стоят; греп «$600»/«100 USDT» по кластеру — только в контексте истории/Stage 1 |
| **P-10** | **QA + деплой + контрольный замер**: `npm run schema:check`, Rich Results Test (Product/FAQPage/HowTo), греп противоречий чисел, Page Quality Model повторный скоринг | 0.5 дня | требует P-1…P-9 | schema:check exit 0; PQM ≥ 90/100; ноль противоречий; деплой по команде `[OWNER]` |
| **P-11** | **Вечный дозор** (регламент): SERP-мониторинг P0-запросов 2×/нед (чистка Square → немедленный refresh+пуш); ежемесячный «June 2026» → актуальный месяц в meta/капсуле; лог проверок пополняется; AIO-цитирование еженедельно | постоянно | после деплоя | записи мониторинга в weekly intelligence brief (ROLE 2/14/15) |

**Критический путь:** P-1 → P-2/P-7 и P-3 → P-5 (две параллельные ветки) → P-8/P-9 → P-10. Реалистичный срок: **2–3 рабочих дня** при параллельной работе контент-агента (P-2, P-4, P-6, P-8) и владельца (P-1 аппрувы, P-3 кадры).

**Сводный list [DONE] — не дублировать:** Title · meta description override · Answer Capsule #quick-answer с «Last verified June 11» · hero unlock-steps + proof-thumb · compare-mini Binance/Bybit/MEXC · HowTo 5 шагов + totalTime PT5M · ratingCount снят · 280M+ синхронизирован (11 вхождений, 185M/200M = 0) · bonus-codes/binance приведён к 19,800 (2026-06-11) · 30 FAQ + FAQPage schema (требуется только ротация) · 8 JSON-LD без дублей · canonical/OG-набор.

---
*ТЗ соответствует и детализирует BINANCE_FLAGSHIP_BLUEPRINT.md. Файлы сайта в рамках этого документа не правились. Любое отклонение от канона фактов — только через обновление evidence + решение ROLE 0/1.*
