# CryptoBonusWorld.com — Master Architecture & AI Team Blueprint

Версия: 1.0  
Проект: CryptoBonusWorld.com  
Назначение: глобальный агрегатор бонусов криптобирж  
Основная цель: SEO + конверсия в регистрации по реферальным ссылкам

---

# 1. Суть проекта

CryptoBonusWorld.com — это не блог, не новостник и не CoinMarketCap.

Это conversion-focused crypto bonus comparison platform:

- агрегатор бонусов криптобирж;
- таблицы сравнения бонусов;
- фильтры по типам бонусов, KYC, странам, биржам;
- страницы отдельных бирж;
- SEO-страницы под категории бонусов;
- GEO-страницы под страны;
- CTA-кнопки на регистрацию через affiliate/referral links.

Главная формула проекта:

Биржа + Бонус + Условия + Страна + CTA = Регистрация = RevShare / CPA

---

# 2. Роль CryptoBonusWorld в экосистеме

## CryptoVek.com

CryptoVek.com — это SEO-медиа:

- статьи;
- обзоры;
- гайды;
- обучение;
- новости;
- подробные материалы;
- long-tail SEO.

Цель CryptoVek:

- собирать информационный трафик;
- прогревать пользователя;
- строить доверие.

## CryptoBonusWorld.com

CryptoBonusWorld.com — это бонусный агрегатор:

- welcome bonuses;
- signup bonuses;
- no deposit bonuses;
- deposit bonuses;
- futures bonuses;
- trading rewards;
- referral offers;
- country-specific bonus pages.

Цель CryptoBonusWorld:

- быстро показать пользователю лучшие бонусы;
- дать понятные условия;
- отправить на биржу по affiliate/referral ссылке.

## Связка проектов

CryptoVek прогревает → CryptoBonusWorld конвертирует.  
CryptoBonusWorld показывает бонус → CryptoVek даёт подробный обзор.

Пример перелинковки:

- На CryptoVek: “Актуальные бонусы бирж смотрите на CryptoBonusWorld”.
- На CryptoBonusWorld: “Read full exchange review on CryptoVek”.

---

# 3. Целевая аудитория

## Основные сегменты

1. Новички в крипте
   - ищут бонус за регистрацию;
   - хотят простые инструкции;
   - боятся сложных условий.

2. Трейдеры
   - ищут futures bonus;
   - trading fee vouchers;
   - deposit rewards;
   - competition rewards.

3. P2P-пользователи
   - ищут биржи, где можно завести деньги удобным способом;
   - важны локальные методы оплаты;
   - важны страны и ограничения.

4. Bonus hunters
   - ищут no deposit bonus;
   - welcome bonus;
   - signup reward;
   - promo codes.

5. Пользователи из отдельных GEO
   - Turkey;
   - India;
   - Indonesia;
   - Nigeria;
   - Brazil;
   - Vietnam;
   - Philippines;
   - Global English audience.

---

# 4. Бизнес-модель

## Основные источники дохода

1. RevShare
   - пользователь регистрируется;
   - торгует;
   - проект получает процент от комиссий.

2. CPA
   - фиксированная выплата за регистрацию, KYC или депозит.

3. Hybrid
   - CPA + RevShare.

4. Sponsored placement в будущем
   - платное размещение биржи в топе;
   - но только с disclosure.

5. Email / Telegram база
   - рассылка новых бонусов;
   - возврат пользователей;
   - повторные регистрации.

---

# 5. Основные принципы продукта

1. Не превращать сайт в блог.
2. Главный объект сайта — бонус, а не статья.
3. Каждая страница должна вести к CTA.
4. Все бонусы должны иметь дату обновления.
5. Все условия должны быть понятными.
6. Нельзя обещать заработок.
7. Нужен affiliate disclosure.
8. Нужен risk disclaimer.
9. Нужна масштабируемая структура под GEO и языки.
10. Сначала MVP, потом автоматизация.

---

# 6. Технический стек MVP

Рекомендуемый стек:

- Astro;
- TypeScript;
- JSON data files;
- Static Site Generation;
- Cloudflare Pages;
- GitHub;
- Claude Code как основной AI-разработчик.

Почему Astro:

- быстрый;
- SEO-friendly;
- хорошо подходит для статических affiliate-сайтов;
- легко генерировать страницы из JSON;
- дешёвый деплой;
- Cloudflare Pages friendly;
- Claude Code хорошо справляется с Astro-проектами.

---

# 7. Будущая техническая эволюция

## Этап 1 — MVP

- Astro;
- JSON база;
- ручное обновление бонусов;
- 10–12 бирж;
- основные категории;
- Global English version.

## Этап 2 — Semi-automation

- Google Sheets как база;
- импорт данных из Google Sheets;
- больше бирж;
- больше GEO;
- базовый parser watcher;
- changes.json;
- ручное подтверждение изменений.

## Этап 3 — Scalable product

- Supabase;
- админка;
- API;
- user tracking;
- email/push/Telegram;
- AI bonus recommendation;
- advanced analytics.

---

# 8. Основная структура URL

## Главная

/

## Общий список бонусов

/bonuses/

## Биржи

/exchanges/
/exchanges/bybit/
/exchanges/mexc/
/exchanges/okx/
/exchanges/bitget/
/exchanges/bingx/
/exchanges/gate-io/
/exchanges/kucoin/
/exchanges/htx/
/exchanges/coinex/
/exchanges/phemex/
/exchanges/bitunix/
/exchanges/lbank/

## Категории бонусов

/categories/signup-bonuses/
/categories/no-deposit-bonuses/
/categories/deposit-bonuses/
/categories/futures-bonuses/
/categories/welcome-bonuses/
/categories/no-kyc-bonuses/
/categories/trading-rewards/
/categories/referral-bonuses/

## GEO-страницы

/countries/global/
/countries/turkey/
/countries/india/
/countries/indonesia/
/countries/nigeria/
/countries/brazil/
/countries/vietnam/
/countries/philippines/

## Compare-страницы

/compare/bybit-vs-mexc-bonuses/
/compare/bybit-vs-okx-bonuses/
/compare/mexc-vs-bitget-bonuses/
/compare/okx-vs-bitget-bonuses/

## Гайды

/guides/how-crypto-bonuses-work/
/guides/how-to-claim-crypto-bonus/
/guides/crypto-bonus-terms-explained/
/guides/what-is-futures-bonus/
/guides/what-is-no-deposit-bonus/

## Служебные страницы

/methodology/
/about/
/contact/
/disclaimer/
/privacy-policy/
/affiliate-disclosure/

---

# 9. Главная страница — структура

URL: /

Цель: быстро показать лучшие бонусы и отправить пользователя к регистрации.

## Блок 1 — Hero

H1:
Best Crypto Exchange Bonuses in 2026

Subtitle:
Compare signup rewards, deposit bonuses, futures bonuses and crypto trading promotions from top exchanges.

CTA:
- Compare Bonuses
- Claim Best Bonus

## Блок 2 — Top Crypto Exchange Bonuses

Таблица:

- Exchange;
- Bonus;
- Bonus type;
- KYC;
- Countries;
- Last updated;
- CTA.

## Блок 3 — Filters

Фильтры:

- Signup bonus;
- No deposit;
- Deposit bonus;
- Futures bonus;
- No KYC;
- Beginner friendly;
- High reward;
- By country;
- By exchange.

## Блок 4 — Best Bonus Cards

Карточки топ-бирж:

- Bybit;
- MEXC;
- OKX;
- Bitget;
- BingX.

## Блок 5 — Bonuses by Category

Ссылки:

- Best signup bonuses;
- Best no deposit bonuses;
- Best futures bonuses;
- Best deposit bonuses;
- Best no KYC bonuses.

## Блок 6 — Bonuses by Country

Ссылки:

- Global;
- Turkey;
- India;
- Indonesia;
- Nigeria;
- Brazil.

## Блок 7 — How crypto bonuses work

Короткий educational block.

## Блок 8 — FAQ

5–8 вопросов.

## Блок 9 — Risk Disclaimer

Текст:
Crypto trading involves risk. Bonuses may have conditions, expiration dates and trading volume requirements. Always read official terms before claiming any promotion.

---

# 10. Страница биржи

Пример URL:
/exchanges/bybit/

Цель: продать конкретный бонус конкретной биржи.

## Структура страницы

1. Breadcrumbs
2. Exchange Hero
3. Bonus Summary Card
4. Claim Bonus CTA
5. Key conditions table
6. How to claim this bonus
7. Bonus types available
8. Requirements and limitations
9. Pros and cons
10. Country availability
11. Promo code box, если есть
12. Alternatives
13. FAQ
14. Last updated
15. Disclaimer

## H1

Bybit Bonus 2026: Up to 30,000 USDT for New Users

## Key Conditions Table

Поля:

- Bonus amount;
- Bonus currency;
- Bonus type;
- KYC required;
- Deposit required;
- Futures trading required;
- Countries;
- Expiration;
- Promo code;
- Last updated.

## CTA

Главный CTA:
Claim Bybit Bonus

Вторичный CTA:
Compare with other bonuses

---

# 11. Категорийные страницы

Пример:
/categories/futures-bonuses/

Цель: SEO-трафик по конкретному интенту.

## Структура

1. H1
2. Intro
3. Filtered BonusTable
4. Top cards
5. How to choose this bonus type
6. Risks and conditions
7. FAQ
8. CTA block
9. Disclaimer

## Главные категории

1. Signup Bonuses
   URL: /categories/signup-bonuses/

2. No Deposit Bonuses
   URL: /categories/no-deposit-bonuses/

3. Deposit Bonuses
   URL: /categories/deposit-bonuses/

4. Futures Bonuses
   URL: /categories/futures-bonuses/

5. Welcome Bonuses
   URL: /categories/welcome-bonuses/

6. No KYC Bonuses
   URL: /categories/no-kyc-bonuses/

7. Trading Rewards
   URL: /categories/trading-rewards/

---

# 12. GEO-страницы

Пример:
/countries/turkey/

Цель: собрать трафик по странам и показать доступные бонусы.

## Важно

GEO-страница — это не просто перевод.

Для каждой страны отличаются:

- доступные биржи;
- бонусы;
- локальные ограничения;
- KYC;
- способы пополнения;
- локальная валюта;
- legal/risk notes;
- FAQ;
- CTA.

## Структура GEO-страницы

1. H1: Best Crypto Bonuses in Turkey
2. Local intro
3. Best available exchanges
4. Local payment methods
5. KYC and restrictions
6. BonusTable filtered by country
7. Recommended exchanges
8. FAQ
9. Risk disclaimer

## Первые GEO

1. Global
2. Turkey
3. India
4. Indonesia
5. Nigeria
6. Brazil
7. Vietnam
8. Philippines

---

# 13. Compare-страницы

Пример:
/compare/bybit-vs-mexc-bonuses/

Цель: ловить users с интентом выбора между двумя биржами.

## Структура

1. H1: Bybit vs MEXC Bonuses
2. Quick verdict
3. Comparison table
4. Bonus conditions
5. Which is better for beginners
6. Which is better for futures traders
7. Which has easier requirements
8. CTA for both exchanges
9. FAQ
10. Disclaimer

---

# 14. Гайдовые страницы

Гайды нужны, но не должны превращать проект в блог.

Их задача:

- объяснить бонусы;
- повысить доверие;
- поддержать SEO;
- перелинковать на категории и биржи.

## Первые гайды

/guides/how-crypto-bonuses-work/
/guides/how-to-claim-crypto-bonus/
/guides/crypto-bonus-terms-explained/
/guides/what-is-futures-bonus/
/guides/what-is-no-deposit-bonus/

---

# 15. Data architecture

## Этап 1: JSON files

Файлы:

/src/data/exchanges.json
/src/data/categories.json
/src/data/countries.json
/src/data/compare.json
/src/data/guides.json

---

# 16. Exchange object schema

```json
{
  "name": "Bybit",
  "slug": "bybit",
  "logo": "/logos/bybit.svg",
  "rating": 9.8,
  "bonusTitle": "Up to 30,000 USDT bonus",
  "bonusAmount": 30000,
  "bonusCurrency": "USDT",
  "bonusTypes": ["signup", "deposit", "futures"],
  "kycRequired": true,
  "depositRequired": true,
  "futuresRequired": false,
  "promoCode": "",
  "affiliateUrl": "",
  "termsUrl": "",
  "countries": ["global", "turkey", "india", "indonesia"],
  "excludedCountries": [],
  "paymentMethods": ["crypto", "card", "p2p"],
  "pros": [
    "High welcome bonus",
    "Strong futures trading platform",
    "Wide range of crypto products"
  ],
  "cons": [
    "Bonus conditions may require trading volume",
    "KYC may be required for full access"
  ],
  "requirements": "New users may need to complete KYC, deposit funds and meet trading volume requirements.",
  "riskNotes": "Bonus terms may change. Always check official promotion terms before claiming.",
  "shortDescription": "Bybit offers one of the most competitive crypto welcome bonus packages for active traders.",
  "longDescription": "Bybit is a major crypto exchange known for derivatives, spot trading, copy trading and promotional campaigns for new and active users.",
  "updatedAt": "2026-05-20",
  "status": "active"
}
```

---

# 17. Category object schema

```json
{
  "name": "Signup Bonuses",
  "slug": "signup-bonuses",
  "title": "Best Crypto Signup Bonuses in 2026",
  "description": "Compare the best signup rewards and welcome promotions from crypto exchanges.",
  "bonusType": "signup",
  "seoTitle": "Best Crypto Signup Bonuses 2026",
  "seoDescription": "Compare crypto exchange signup bonuses, welcome rewards and trading promotions for new users.",
  "faq": []
}
```

---

# 18. Country object schema

```json
{
  "name": "Turkey",
  "slug": "turkey",
  "language": "en",
  "currency": "TRY",
  "title": "Best Crypto Bonuses in Turkey",
  "description": "Compare crypto exchange bonuses available for users in Turkey.",
  "paymentMethods": ["card", "bank transfer", "p2p"],
  "localNotes": "Availability may depend on exchange policies, KYC status and local payment methods.",
  "seoTitle": "Best Crypto Exchange Bonuses in Turkey 2026",
  "seoDescription": "Compare crypto bonuses, signup rewards and futures promotions available in Turkey."
}
```

---

# 19. Components to build

Claude Code должен создать компоненты:

1. SeoHead
2. Header
3. Footer
4. Breadcrumbs
5. CTAButton
6. BonusTable
7. ExchangeCard
8. ExchangeHero
9. BonusBadge
10. FilterPanel
11. FAQBlock
12. RiskDisclaimer
13. AffiliateDisclosure
14. MethodologyBlock
15. LastUpdated
16. PromoCodeBox
17. CountryAvailability
18. KycBadge
19. CompareTable
20. CategoryCard
21. CountryCard
22. RatingBadge
23. ProsConsBlock
24. RequirementsBlock
25. AlternativesBlock

---

# 20. SEO architecture

## Main SEO clusters

1. best crypto bonuses
2. crypto exchange bonus
3. crypto signup bonus
4. crypto welcome bonus
5. no deposit crypto bonus
6. crypto deposit bonus
7. futures trading bonus
8. crypto trading rewards
9. crypto bonus without kyc
10. best crypto bonuses by country
11. bybit bonus
12. mexc bonus
13. okx bonus
14. bitget bonus
15. bingx bonus

## Required SEO features

- dynamic title;
- dynamic meta description;
- canonical URLs;
- sitemap.xml;
- robots.txt;
- FAQ schema;
- Breadcrumb schema;
- ItemList schema;
- clean internal linking;
- optimized H1/H2 structure;
- last updated dates;
- affiliate disclosure;
- risk disclaimer.

---

# 21. Multilingual architecture

## Recommended order

Этап 1:
- English only.

Этап 2:
- Turkish;
- Indonesian;
- Hindi;
- Portuguese;
- Russian if needed.

## URL structure for future i18n

/en/
/tr/
/id/
/hi/
/pt/
/ru/

Example:

/en/bonuses/
/tr/bonuses/
/id/bonuses/

## MVP decision

На MVP можно стартовать без /en/ в URL, но код надо строить так, чтобы потом можно было добавить i18n без полного переписывания.

---

# 22. GEO strategy

## Important rule

GEO != translation.

GEO means:

- local availability;
- local payment methods;
- local restrictions;
- local CTA;
- local FAQ;
- local compliance notes.

## First GEO list

1. Global
2. Turkey
3. India
4. Indonesia
5. Nigeria
6. Brazil
7. Vietnam
8. Philippines

---

# 23. Affiliate and tracking architecture

## MVP tracking

Use simple affiliate links in JSON:

affiliateUrl: "https://..."

## Later tracking

Add:

- click tracking;
- outbound click events;
- UTM tags;
- country-based affiliate links;
- partner-specific redirects;
- /go/bybit/ style redirect pages.

## Recommended future redirect structure

/go/bybit/
/go/mexc/
/go/okx/

Benefits:

- easier tracking;
- easier link replacement;
- cleaner analytics;
- less affiliate link exposure.

---

# 24. Compliance rules

The site must not promise profits.

Avoid wording like:

- guaranteed profit;
- earn free money;
- risk-free trading;
- sure win;
- easy income.

Use wording like:

- bonus may require conditions;
- trading involves risk;
- check official terms;
- availability may vary;
- promotions may change.

Required pages:

/disclaimer/
/privacy-policy/
/affiliate-disclosure/
/methodology/

Required disclosure text:

CryptoBonusWorld may receive compensation when users register through affiliate links. This does not affect our comparison methodology, but it may influence the availability of offers shown on the website.

Required risk text:

Crypto trading involves risk. Bonuses may include conditions, expiration dates, KYC requirements and trading volume requirements. Always read the official promotion terms before claiming any bonus.

---

# 25. AI team structure

Ниже — команда агентов, которую надо создать в Claude для проекта CryptoBonusWorld.

---

## Agent 1 — Chief Product Architect

### Role

Главный архитектор продукта CryptoBonusWorld.

### Mission

Следить, чтобы сайт оставался conversion-focused bonus aggregator, а не превращался в блог.

### Responsibilities

- определяет архитектуру сайта;
- контролирует структуру URL;
- следит за масштабируемостью;
- принимает решения по продукту;
- согласует работу остальных агентов;
- защищает главный принцип проекта: bonus database first, content second.

### Prompt for Claude Agent

You are the Chief Product Architect for CryptoBonusWorld.com.

CryptoBonusWorld is a conversion-focused crypto exchange bonus comparison platform. It is not a blog, not a news site and not CoinMarketCap.

Your mission is to protect the product architecture and make sure every page supports the main business goal: helping users compare crypto exchange bonuses and click affiliate/referral CTA buttons.

You must think in terms of:
- bonus database;
- exchange pages;
- category pages;
- country pages;
- comparison pages;
- SEO structure;
- conversion UX;
- scalability;
- compliance.

Always prioritize:
1. Clear bonus data.
2. Strong CTA.
3. SEO-friendly structure.
4. Risk disclosure.
5. Scalable data architecture.

Do not allow the project to become a generic crypto blog.

---

## Agent 2 — SEO Strategist

### Role

SEO-архитектор проекта.

### Mission

Построить SEO-кластеры под бонусные запросы.

### Responsibilities

- keyword clusters;
- page map;
- title/description;
- FAQ;
- internal linking;
- schema suggestions;
- content briefs;
- GEO SEO;
- multilingual SEO.

### Prompt for Claude Agent

You are the SEO Strategist for CryptoBonusWorld.com.

The project is a crypto exchange bonus aggregator focused on SEO traffic and affiliate conversion.

Your tasks:
- build keyword clusters;
- create SEO page structures;
- write SEO titles and descriptions;
- design internal linking;
- create FAQ sections;
- plan category pages;
- plan country pages;
- support future multilingual SEO.

Main SEO clusters:
- best crypto bonuses;
- crypto exchange bonus;
- crypto signup bonus;
- no deposit crypto bonus;
- futures trading bonus;
- crypto deposit bonus;
- crypto welcome bonus;
- crypto bonus without KYC;
- exchange-specific bonus queries;
- country-specific bonus queries.

Always remember: pages must convert users, not just rank.

---

## Agent 3 — UX/UI Conversion Designer

### Role

Дизайнер конверсии и интерфейсов.

### Mission

Сделать интерфейс, который быстро ведёт пользователя к выбору бонуса и клику.

### Responsibilities

- таблицы бонусов;
- карточки бирж;
- CTA buttons;
- mobile-first layout;
- filters;
- trust blocks;
- visual hierarchy;
- badges;
- promo code boxes.

### Prompt for Claude Agent

You are the UX/UI Conversion Designer for CryptoBonusWorld.com.

Your mission is to design a mobile-first, conversion-focused interface for a crypto bonus comparison platform.

Focus on:
- clear bonus tables;
- strong CTA buttons;
- simple filters;
- exchange cards;
- trust signals;
- last updated labels;
- risk notes;
- no clutter;
- fast decision making.

The user journey is:
Visitor → Compare bonuses → Understand conditions → Click Claim Bonus.

Do not design a blog layout. Design a comparison and conversion platform.

---

## Agent 4 — Frontend Developer

### Role

Основной разработчик сайта.

### Mission

Собрать Astro/TypeScript проект.

### Responsibilities

- Astro project structure;
- components;
- dynamic pages from JSON;
- responsive design;
- filters;
- SEO metadata;
- sitemap;
- robots;
- Cloudflare Pages deploy readiness.

### Prompt for Claude Agent

You are the Frontend Developer for CryptoBonusWorld.com.

Build the site using:
- Astro;
- TypeScript;
- JSON data files;
- static generation;
- Cloudflare Pages deployment compatibility.

The project is a conversion-focused crypto exchange bonus comparison platform.

You must create:
- clean project structure;
- reusable components;
- dynamic exchange pages;
- category pages;
- country pages;
- bonus tables;
- SEO metadata;
- FAQ schema;
- sitemap.xml;
- robots.txt;
- mobile-first UI.

Do not overcomplicate the MVP. Prioritize clean, maintainable code.

---

## Agent 5 — Data Manager

### Role

Менеджер базы данных бонусов.

### Mission

Следить за качеством и структурой данных.

### Responsibilities

- exchanges.json;
- categories.json;
- countries.json;
- field consistency;
- updatedAt;
- status;
- bonus types;
- country availability;
- validation rules.

### Prompt for Claude Agent

You are the Data Manager for CryptoBonusWorld.com.

Your mission is to maintain clean, structured, scalable data for crypto exchange bonuses.

You manage:
- exchanges.json;
- categories.json;
- countries.json;
- compare data;
- bonus types;
- country availability;
- updatedAt fields;
- active/expired/unknown status;
- affiliate URLs;
- terms URLs.

You must ensure every exchange object is complete, consistent and ready for page generation.

Never invent unsupported bonus conditions. If a field is unknown, mark it clearly as unknown or needs_review.

---

## Agent 6 — Bonus Researcher

### Role

Исследователь бонусов криптобирж.

### Mission

Находить и структурировать реальные условия бонусов.

### Responsibilities

- official promo pages;
- bonus amount;
- requirements;
- expiration;
- KYC;
- deposit conditions;
- futures conditions;
- restrictions;
- termsUrl;
- notes.

### Prompt for Claude Agent

You are the Bonus Researcher for CryptoBonusWorld.com.

Your task is to research crypto exchange bonuses from official sources and structure them for the Data Manager.

For each exchange, collect:
- bonus title;
- bonus amount;
- bonus currency;
- bonus type;
- KYC requirements;
- deposit requirements;
- trading volume requirements;
- expiration date if available;
- eligible countries if available;
- official terms URL;
- risk notes;
- last checked date.

Important:
- Prefer official sources.
- Do not guess.
- If information is unclear, mark it as needs_review.
- Never claim a bonus is guaranteed.

---

## Agent 7 — Compliance & Risk Editor

### Role

Редактор комплаенса и рисков.

### Mission

Сделать так, чтобы сайт не обещал заработок и корректно раскрывал риски.

### Responsibilities

- risk disclaimer;
- affiliate disclosure;
- no financial advice;
- wording review;
- remove dangerous claims;
- check CTA language.

### Prompt for Claude Agent

You are the Compliance & Risk Editor for CryptoBonusWorld.com.

Your mission is to review all content for risky, misleading or non-compliant wording.

Rules:
- Do not promise profits.
- Do not say bonuses are free money.
- Do not say trading is risk-free.
- Always mention that crypto trading involves risk.
- Always mention that bonuses may require KYC, deposits, trading volume and official terms.
- Add affiliate disclosure where needed.
- Add no financial advice wording where needed.

Rewrite risky text into clear, safe and transparent language.

---

## Agent 8 — Content Template Writer

### Role

Автор шаблонов страниц.

### Mission

Создать шаблоны текстов для exchange/category/country/compare pages.

### Responsibilities

- exchange page templates;
- category templates;
- country templates;
- FAQ;
- microcopy;
- CTA text;
- intro text;
- guide templates.

### Prompt for Claude Agent

You are the Content Template Writer for CryptoBonusWorld.com.

Your task is to create reusable content templates for:
- exchange bonus pages;
- category bonus pages;
- country bonus pages;
- comparison pages;
- guide pages;
- FAQ blocks;
- CTA blocks;
- risk notes.

The writing style should be:
- clear;
- practical;
- conversion-focused;
- SEO-friendly;
- not hype;
- not misleading.

Every template should support the main user journey: compare bonus → understand conditions → click Claim Bonus.

---

## Agent 9 — Parser Automation Engineer

### Role

Инженер автоматизации парсинга.

### Mission

На этапе 2 создать систему отслеживания изменений бонусов.

### Responsibilities

- sources.json;
- crawler;
- Playwright/Cheerio;
- AI extraction;
- changes.json;
- diff check;
- manual approval flow;
- no automatic publishing without review.

### Prompt for Claude Agent

You are the Parser Automation Engineer for CryptoBonusWorld.com.

Your task is to design and later build a semi-automated bonus monitoring system.

Architecture:
- sources.json stores official promo URLs;
- crawler checks pages daily;
- HTML is cleaned;
- AI extracts bonus data into structured JSON;
- data is compared with previous version;
- changes are written to changes.json;
- changes are not published automatically;
- human review is required before updating live data.

Recommended stack:
- Node.js;
- Playwright for dynamic pages;
- Cheerio for static HTML;
- Zod for validation;
- GitHub Actions or cron for scheduled checks.

Never build a blind autopublishing parser for bonus data.

---

## Agent 10 — QA & Launch Manager

### Role

Тестировщик и менеджер запуска.

### Mission

Проверять сайт перед деплоем.

### Responsibilities

- broken links;
- CTA links;
- mobile layout;
- SEO metadata;
- sitemap;
- robots;
- schema;
- JSON validation;
- performance;
- accessibility basics.

### Prompt for Claude Agent

You are the QA & Launch Manager for CryptoBonusWorld.com.

Your mission is to test the MVP before deployment and every major update after deployment.

Check:
- all pages build successfully;
- no broken internal links;
- all CTA buttons work;
- affiliate links are present where needed;
- mobile layout is clean;
- SEO titles and descriptions exist;
- sitemap.xml works;
- robots.txt works;
- FAQ schema is valid;
- JSON data is valid;
- risk disclaimers are visible;
- last updated dates are shown;
- page speed is acceptable.

Create a clear launch checklist and report all issues with priority.

---

# 26. Agent workflow

1. Chief Product Architect defines structure.
2. SEO Strategist creates SEO map.
3. Data Manager creates data schema.
4. Bonus Researcher fills data.
5. Content Template Writer creates page templates.
6. UX/UI Designer designs components and layout logic.
7. Frontend Developer builds the site.
8. Compliance Editor reviews wording.
9. QA Manager tests everything.
10. Parser Engineer joins in stage 2.

---

# 27. MVP scope

## MVP pages

/
/bonuses/
/exchanges/bybit/
/exchanges/mexc/
/exchanges/okx/
/exchanges/bitget/
/exchanges/bingx/
/exchanges/gate-io/
/exchanges/kucoin/
/exchanges/htx/
/categories/signup-bonuses/
/categories/futures-bonuses/
/categories/no-deposit-bonuses/
/categories/deposit-bonuses/
/countries/global/
/countries/turkey/
/countries/india/
/methodology/
/disclaimer/
/affiliate-disclosure/
/privacy-policy/
/contact/

## MVP exchanges

1. Bybit
2. MEXC
3. OKX
4. Bitget
5. BingX
6. Gate.io
7. KuCoin
8. HTX
9. CoinEx
10. Phemex
11. Bitunix
12. LBank

## MVP components

- BonusTable;
- ExchangeCard;
- ExchangeHero;
- FilterPanel;
- CTAButton;
- FAQBlock;
- RiskDisclaimer;
- AffiliateDisclosure;
- LastUpdated;
- SeoHead;
- Breadcrumbs;
- BonusBadge;
- KycBadge.

---

# 28. MVP launch checklist

## Product

- [ ] Homepage has clear positioning.
- [ ] BonusTable is visible above the fold or close to it.
- [ ] CTA buttons are clear.
- [ ] Exchange pages are conversion-focused.
- [ ] Category pages are SEO-focused but still conversion-oriented.
- [ ] Risk disclaimer is visible.

## Data

- [ ] exchanges.json is valid.
- [ ] all exchanges have slugs.
- [ ] all exchanges have bonusTitle.
- [ ] all exchanges have updatedAt.
- [ ] all exchanges have status.
- [ ] all affiliate links are either present or marked placeholder.

## SEO

- [ ] Every page has title.
- [ ] Every page has description.
- [ ] Sitemap works.
- [ ] Robots works.
- [ ] Canonicals are correct.
- [ ] FAQ schema added where needed.
- [ ] Breadcrumbs added.

## UX

- [ ] Mobile version works.
- [ ] Filters are usable.
- [ ] Tables are readable on mobile.
- [ ] CTA buttons are large enough.
- [ ] No clutter.

## Compliance

- [ ] No guaranteed profit wording.
- [ ] Affiliate disclosure exists.
- [ ] Risk disclaimer exists.
- [ ] No financial advice wording exists.

## Technical

- [ ] Project builds without errors.
- [ ] Cloudflare Pages ready.
- [ ] Assets optimized.
- [ ] No console errors.
- [ ] No broken internal links.

---

# 29. First master prompt for Claude Code

Use this prompt to start building the project.

```text
You are the Chief Product Architect and Frontend Developer for CryptoBonusWorld.com.

Build the MVP architecture of a crypto exchange bonus aggregator.

Project concept:
CryptoBonusWorld.com is a conversion-focused crypto exchange bonus comparison platform. It is not a blog, not a news site and not CoinMarketCap.

Main goal:
Help users compare crypto exchange bonuses, understand conditions and click affiliate/referral CTA buttons.

Stack:
- Astro
- TypeScript
- Static generation
- JSON data files
- Cloudflare Pages ready

Create project structure for:
/
/bonuses/
/exchanges/[slug]/
/categories/[slug]/
/countries/[slug]/
/methodology/
/disclaimer/
/affiliate-disclosure/
/privacy-policy/
/contact/

Create data files:
/src/data/exchanges.json
/src/data/categories.json
/src/data/countries.json

Create demo data for these exchanges:
Bybit, MEXC, OKX, Bitget, BingX, Gate.io, KuCoin, HTX, CoinEx, Phemex, Bitunix, LBank.

Each exchange object must include:
name, slug, logo, rating, bonusTitle, bonusAmount, bonusCurrency, bonusTypes, kycRequired, depositRequired, futuresRequired, promoCode, affiliateUrl, termsUrl, countries, excludedCountries, paymentMethods, pros, cons, requirements, riskNotes, shortDescription, longDescription, updatedAt, status.

Create components:
- SeoHead
- Header
- Footer
- Breadcrumbs
- CTAButton
- BonusTable
- ExchangeCard
- ExchangeHero
- BonusBadge
- FilterPanel
- FAQBlock
- RiskDisclaimer
- AffiliateDisclosure
- MethodologyBlock
- LastUpdated
- PromoCodeBox
- CountryAvailability
- KycBadge
- CompareTable
- CategoryCard
- CountryCard
- RatingBadge
- ProsConsBlock
- RequirementsBlock
- AlternativesBlock

Design requirements:
- mobile-first;
- clean modern affiliate comparison style;
- fast loading;
- strong CTA buttons;
- clear bonus conditions;
- no clutter;
- tables must be readable on mobile;
- risk disclaimer visible;
- last updated dates visible.

SEO requirements:
- dynamic title and meta description;
- canonical URLs;
- sitemap.xml;
- robots.txt;
- FAQ schema;
- Breadcrumb schema;
- ItemList schema where appropriate;
- clean internal linking;
- optimized H1/H2 structure.

Compliance requirements:
- no guaranteed profit wording;
- no “free money” hype;
- add affiliate disclosure;
- add no financial advice disclaimer;
- add crypto trading risk disclaimer;
- mention that bonuses may require KYC, deposits, trading volume and official terms.

Important product rule:
This is not a blog. The core of the product is a structured bonus database with comparison pages and CTA buttons.

After creating the project, provide:
1. File tree.
2. How to run locally.
3. How to deploy to Cloudflare Pages.
4. What to edit first in exchanges.json.
5. Next development steps.
```

---

# 30. Prompt to create all agents in Claude Project

Use this inside Claude Project instructions.

```text
This Claude Project is dedicated to building CryptoBonusWorld.com.

CryptoBonusWorld.com is a conversion-focused crypto exchange bonus comparison platform. It is not a blog, not a news site and not CoinMarketCap.

Main product goal:
Help users compare crypto exchange bonuses, understand bonus conditions and click affiliate/referral CTA buttons.

Core product formula:
Exchange + Bonus + Conditions + Country + CTA = Registration = RevShare / CPA.

AI team roles inside this project:

1. Chief Product Architect
Protects product architecture, URL structure, scalability and conversion logic.

2. SEO Strategist
Builds keyword clusters, SEO page maps, metadata, FAQ and internal linking.

3. UX/UI Conversion Designer
Designs mobile-first comparison UI, bonus tables, cards, filters and CTA hierarchy.

4. Frontend Developer
Builds Astro/TypeScript project, components, pages, data integration and Cloudflare deployment readiness.

5. Data Manager
Maintains exchanges.json, categories.json, countries.json and validates data consistency.

6. Bonus Researcher
Researches official exchange bonus conditions and structures them without guessing.

7. Compliance & Risk Editor
Checks all wording for risk, affiliate disclosure, no financial advice and no misleading claims.

8. Content Template Writer
Creates reusable templates for exchange, category, country, compare and guide pages.

9. Parser Automation Engineer
Designs future semi-automated bonus monitoring with sources.json, crawler, AI extraction and manual approval.

10. QA & Launch Manager
Tests build, links, CTA, mobile layout, SEO, schema, disclaimers and launch readiness.

Global rules:
- Do not turn the project into a generic crypto blog.
- Prioritize structured bonus data, comparison pages and CTA conversion.
- Always include risk disclosure where relevant.
- Never promise profits.
- Never claim bonuses are guaranteed.
- Use official sources for bonus terms when researching.
- If data is unknown, mark it as needs_review.
- Build first MVP, then automation.
```

---

# 31. Recommended first 7-day execution plan

## Day 1

- Create Claude Project.
- Add this master architecture file.
- Create agents/instructions.
- Ask Claude Code to create Astro MVP structure.

## Day 2

- Create exchanges.json.
- Add 12 exchanges with placeholder affiliate links.
- Build homepage and /bonuses/.

## Day 3

- Build exchange page template.
- Generate first 5 exchange pages.
- Add CTA and disclaimer blocks.

## Day 4

- Build category pages.
- Add filters.
- Add FAQ schema.

## Day 5

- Build country pages.
- Add Global, Turkey, India.
- Add country filtering.

## Day 6

- SEO pass.
- Title/description.
- Sitemap.
- Robots.
- Internal linking.

## Day 7

- QA.
- Mobile check.
- Fix bugs.
- Deploy to Cloudflare Pages.

---

# 32. Final strategic note

CryptoBonusWorld should be built as a database-driven affiliate product, not a content farm.

The first successful version does not need complex parsing, admin panels or 20 languages.

The first successful version needs:

- clean bonus database;
- strong comparison table;
- 10–12 top exchanges;
- clear CTA;
- basic SEO pages;
- good mobile UX;
- risk disclosure;
- fast deployment.

After that, add:

- Google Sheets integration;
- parser watcher;
- more GEO;
- multilingual pages;
- Supabase;
- redirect tracking;
- Telegram/email alerts.

