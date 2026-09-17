import test from 'node:test';
import assert from 'node:assert/strict';
import { calculateReportMetrics } from '../src/reportMetrics.js';

test('calculates PPT-style headline metrics from lead rows', () => {
  const rows = [
    { status: 'Open', business: 'DT', organization: 'DT Sales', gi: 0, revenue: 0 },
    { status: 'Contacted', business: 'GC', organization: 'GC Sales', gi: 0, revenue: 0 },
    { status: 'Qualified', business: 'BS', organization: 'BS Sales', gi: 100, revenue: 80 },
    { status: 'Converted', business: 'ETC', organization: 'ETC Sales', gi: 250, revenue: 200 },
    { status: 'Disqualified', business: 'DT', organization: 'DT Sales', gi: 0, revenue: 0 }
  ];

  assert.deepEqual(calculateReportMetrics(rows), {
    total: 5,
    activity: 3,
    qualified: 2,
    pipeline: 630,
    converted: 1,
    conversionRate: 20,
    statuses: { Open: 1, Contacted: 1, Qualified: 1, Converted: 1, Disqualified: 1 },
    businesses: { DT: 2, GC: 1, BS: 1, ETC: 1 },
    organizations: { 'DT Sales': 2, 'GC Sales': 1, 'BS Sales': 1, 'ETC Sales': 1 }
  });
});
