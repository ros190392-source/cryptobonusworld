import {
  binanceKazakhstanClaims,
  binanceKazakhstanMarketProfile,
} from './binanceReview';
import type { NormalizedClaim } from '../../contracts/portalFactory';

export type BinanceKazakhstanReviewLocale = 'en' | 'ru';

interface LocalizedFactCopy {
  label: string;
  summary: string;
}

interface LocalizedProfileCopy {
  title: string;
  statusLabel: string;
  availabilityLabel: string;
  offerLabel: string;
  limitationHeading: string;
}

export interface BinanceKazakhstanLocalizedFact {
  claim: NormalizedClaim;
  copy: LocalizedFactCopy;
}

export interface BinanceKazakhstanLocalizedView {
  locale: BinanceKazakhstanReviewLocale;
  profile: typeof binanceKazakhstanMarketProfile;
  profileCopy: LocalizedProfileCopy;
  facts: BinanceKazakhstanLocalizedFact[];
}

export interface FactParityIssue {
  code: string;
  message: string;
}

const claimOrder = binanceKazakhstanClaims.map(claim => claim.claimId);

const profileCopy: Record<BinanceKazakhstanReviewLocale, LocalizedProfileCopy> = {
  en: {
    title: 'Binance in Kazakhstan',
    statusLabel: 'Validated review profile',
    availabilityLabel: 'Limited / conditional',
    offerLabel: 'Offer under review',
    limitationHeading: 'Important limitations',
  },
  ru: {
    title: 'Binance в Казахстане',
    statusLabel: 'Проверенный профиль для ревью',
    availabilityLabel: 'Ограниченная / условная доступность',
    offerLabel: 'Предложение на проверке',
    limitationHeading: 'Важные ограничения',
  },
};

const localizedFactCopy: Record<
  BinanceKazakhstanReviewLocale,
  Record<string, LocalizedFactCopy>
> = {
  en: {
    'claim:kz:binance:local-entity-active': {
      label: 'Local entity',
      summary: 'BN KZ Technologies Limited appears as an active AIFC participant in the checked AFSA register record.',
    },
    'claim:kz:binance:current-license': {
      label: 'Current AFSA licence',
      summary: 'The checked AFSA register lists licence AFSA-A-LA-2024-0028 from 25 September 2024.',
    },
    'claim:kz:binance:future-option-license-scope': {
      label: 'Licence scope',
      summary: 'The regulator record lists Future and Option investment types; account-level entitlement remains conditional.',
    },
    'claim:kz:binance:licensed-p2p-route': {
      label: 'Regulated P2P route',
      summary: 'AFSA describes regulated P2P trading through licensed AIFC crypto exchanges.',
    },
    'claim:kz:binance:localized-surface-visible': {
      label: 'Kazakhstan web surface',
      summary: 'A Kazakhstan-targeted Binance landing surface was publicly reachable on the checked date.',
    },
    'claim:kz:binance:registration-visible-untested': {
      label: 'Registration path',
      summary: 'A personal registration path was visible, but account approval was not tested.',
    },
    'claim:kz:binance:personal-kyc-required': {
      label: 'Identity verification',
      summary: 'Binance documentation states that personal identity verification is required for trading-related features.',
    },
    'claim:kz:binance:cbw-offer-binding-absent': {
      label: 'CryptoBonusWorld offer binding',
      summary: 'No owner-approved CBW Binance campaign URL or referral code is attached to this market profile.',
    },
    'claim:kz:binance:freedom-bank-p2p-surface-visible': {
      label: 'Freedom Bank P2P surface',
      summary: 'A Kazakhstan-localized Freedom Bank P2P route is visible, but no active advertiser or executable order was confirmed.',
    },
    'claim:kz:binance:localized-p2p-sell-surface-visible': {
      label: 'Localized P2P sell surface',
      summary: 'A Kazakhstan-localized P2P sell route is visible; current KZT orders and payment-method support remain unconfirmed.',
    },
  },
  ru: {
    'claim:kz:binance:local-entity-active': {
      label: 'Локальная компания',
      summary: 'BN KZ Technologies Limited указана как активный участник МФЦА в проверенной записи реестра AFSA.',
    },
    'claim:kz:binance:current-license': {
      label: 'Действующая лицензия AFSA',
      summary: 'В проверенном реестре AFSA указана лицензия AFSA-A-LA-2024-0028, действующая с 25 сентября 2024 года.',
    },
    'claim:kz:binance:future-option-license-scope': {
      label: 'Объём лицензии',
      summary: 'В записи регулятора указаны типы инвестиций Future и Option; доступ конкретного аккаунта остаётся условным.',
    },
    'claim:kz:binance:licensed-p2p-route': {
      label: 'Регулируемый P2P-маршрут',
      summary: 'AFSA описывает регулируемую P2P-торговлю через лицензированные криптобиржи МФЦА.',
    },
    'claim:kz:binance:localized-surface-visible': {
      label: 'Казахстанская веб-версия',
      summary: 'На дату проверки была доступна публичная страница Binance, ориентированная на Казахстан.',
    },
    'claim:kz:binance:registration-visible-untested': {
      label: 'Регистрация',
      summary: 'Публичный путь регистрации физического лица был виден, но одобрение аккаунта не тестировалось.',
    },
    'claim:kz:binance:personal-kyc-required': {
      label: 'Проверка личности',
      summary: 'Документация Binance указывает, что для торговых функций требуется персональная проверка личности.',
    },
    'claim:kz:binance:cbw-offer-binding-absent': {
      label: 'Привязка предложения CryptoBonusWorld',
      summary: 'К этому профилю рынка не привязаны утверждённая владельцем ссылка кампании Binance или реферальный код CBW.',
    },
    'claim:kz:binance:freedom-bank-p2p-surface-visible': {
      label: 'P2P-страница Freedom Bank',
      summary: 'Доступен локализованный P2P-маршрут Freedom Bank, но активный рекламодатель или исполнимый ордер не подтверждены.',
    },
    'claim:kz:binance:localized-p2p-sell-surface-visible': {
      label: 'Локализованная P2P-продажа',
      summary: 'Доступен локализованный маршрут продажи P2P; текущие KZT-ордера и способы оплаты не подтверждены.',
    },
  },
};

function buildLocalizedView(locale: BinanceKazakhstanReviewLocale): BinanceKazakhstanLocalizedView {
  return {
    locale,
    profile: binanceKazakhstanMarketProfile,
    profileCopy: profileCopy[locale],
    facts: claimOrder.map(claimId => {
      const claim = binanceKazakhstanClaims.find(item => item.claimId === claimId);
      const copy = localizedFactCopy[locale][claimId];

      if (!claim || !copy) {
        throw new Error(`Missing ${locale} fact mapping for ${claimId}.`);
      }

      return { claim, copy };
    }),
  };
}

export const binanceKazakhstanLocalizedViews: Record<
  BinanceKazakhstanReviewLocale,
  BinanceKazakhstanLocalizedView
> = {
  en: buildLocalizedView('en'),
  ru: buildLocalizedView('ru'),
};

export function validateBinanceKazakhstanFactParity(): FactParityIssue[] {
  const issues: FactParityIssue[] = [];
  const english = binanceKazakhstanLocalizedViews.en;
  const russian = binanceKazakhstanLocalizedViews.ru;

  if (english.profile !== russian.profile) {
    issues.push({
      code: 'PROFILE_OBJECT_DIVERGED',
      message: 'Locale views must reference the same immutable market-profile object.',
    });
  }

  const englishIds = english.facts.map(item => item.claim.claimId);
  const russianIds = russian.facts.map(item => item.claim.claimId);

  if (JSON.stringify(englishIds) !== JSON.stringify(russianIds)) {
    issues.push({
      code: 'CLAIM_ORDER_DIVERGED',
      message: 'EN and RU must render the same claim IDs in the same order.',
    });
  }

  const expectedIds = [...claimOrder].sort();
  for (const locale of ['en', 'ru'] as const) {
    const localizedIds = Object.keys(localizedFactCopy[locale]).sort();
    if (JSON.stringify(localizedIds) !== JSON.stringify(expectedIds)) {
      issues.push({
        code: 'LOCALE_COVERAGE_MISMATCH',
        message: `${locale} copy must cover exactly the validated claim set.`,
      });
    }
  }

  english.facts.forEach((englishFact, index) => {
    const russianFact = russian.facts[index];
    if (!russianFact) return;

    const immutableEnglish = {
      claimId: englishFact.claim.claimId,
      predicate: englishFact.claim.predicate,
      value: englishFact.claim.value,
      effectiveAt: englishFact.claim.effectiveAt,
      expiresAt: englishFact.claim.expiresAt,
      confidence: englishFact.claim.confidence,
      approval: englishFact.claim.approval,
      supportingPacketIds: englishFact.claim.supportingPacketIds,
      contradictingPacketIds: englishFact.claim.contradictingPacketIds,
    };
    const immutableRussian = {
      claimId: russianFact.claim.claimId,
      predicate: russianFact.claim.predicate,
      value: russianFact.claim.value,
      effectiveAt: russianFact.claim.effectiveAt,
      expiresAt: russianFact.claim.expiresAt,
      confidence: russianFact.claim.confidence,
      approval: russianFact.claim.approval,
      supportingPacketIds: russianFact.claim.supportingPacketIds,
      contradictingPacketIds: russianFact.claim.contradictingPacketIds,
    };

    if (JSON.stringify(immutableEnglish) !== JSON.stringify(immutableRussian)) {
      issues.push({
        code: 'IMMUTABLE_FACT_DIVERGED',
        message: `Localized rendering changed immutable fact data for ${englishFact.claim.claimId}.`,
      });
    }
  });

  return issues;
}

export const binanceKazakhstanFactParityIssues = validateBinanceKazakhstanFactParity();
export const binanceKazakhstanFactParityPass = binanceKazakhstanFactParityIssues.length === 0;

if (!binanceKazakhstanFactParityPass) {
  throw new Error(
    `Binance Kazakhstan EN/RU fact parity failed: ${binanceKazakhstanFactParityIssues
      .map(issue => `${issue.code}: ${issue.message}`)
      .join('; ')}`,
  );
}
