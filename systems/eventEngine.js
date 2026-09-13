'use strict';

const { clamp } = require('../entities/entityFactory.js');

const EVENT_TEMPLATES = [
  {
    id: 'competitor_opening',
    scope: 'district_category',
    cooldownDays: 18,
    trigger: (ctx) => ctx.entryScore >= 58 && ctx.vacancyAvailability >= 0.18,
    weight: (ctx) => 0.25 + (ctx.entryScore - 58) / 85,
    tags: ['competition', 'entry']
  },
  {
    id: 'copycat_menu',
    scope: 'district_category',
    cooldownDays: 12,
    trigger: (ctx) => ctx.imitationPressure >= 52,
    weight: (ctx) => 0.20 + (ctx.imitationPressure - 52) / 90,
    tags: ['competition', 'imitation']
  },
  {
    id: 'supplier_price_spike',
    scope: 'city_ingredient',
    cooldownDays: 20,
    trigger: (ctx) => Number(ctx.supplyTightness || 0) >= 0.65,
    weight: (ctx) => 0.18 + Number(ctx.supplyTightness || 0) * 0.35,
    tags: ['supply', 'price']
  },
  {
    id: 'landlord_negotiation_window',
    scope: 'property',
    cooldownDays: 45,
    trigger: (ctx) => Number(ctx.propertyVacancyDays || 0) >= 28,
    weight: (ctx) => clamp(Number(ctx.propertyVacancyDays || 0) / 120, 0.12, 0.60),
    tags: ['property', 'negotiation']
  },
  {
    id: 'food_safety_inspection',
    scope: 'district',
    cooldownDays: 30,
    trigger: (ctx) => Number(ctx.hygieneRisk || 0) >= 0.35,
    weight: (ctx) => 0.12 + Number(ctx.hygieneRisk || 0) * 0.35,
    tags: ['compliance', 'hygiene']
  }
];

function eligibleEvents(ctx, cooldownState = {}) {
  return EVENT_TEMPLATES.filter((event) => {
    const remaining = Number(cooldownState[event.id] || 0);
    return remaining <= 0 && event.trigger(ctx);
  });
}

function pickEvent(ctx, rng, cooldownState = {}) {
  const rows = eligibleEvents(ctx, cooldownState);
  if (!rows.length) return null;
  const event = rng.weighted(rows, (row) => clamp(row.weight(ctx), 0, 1));
  return event ? { ...event, trigger: undefined, weight: undefined } : null;
}

module.exports = { EVENT_TEMPLATES, eligibleEvents, pickEvent };
