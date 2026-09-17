export function calculateChange(current, previous, percentagePoints = false) {
  const delta = Math.round((current - previous) * 10) / 10;
  if (percentagePoints) return { delta, rate: null };
  return { delta, rate: previous ? Math.round((delta / previous) * 1000) / 10 : null };
}

export function calculateReportMetrics(rows) {
  const statuses = {};
  const businesses = {};
  const organizations = {};
  let pipeline = 0;
  let converted = 0;

  for (const row of rows) {
    statuses[row.status] = (statuses[row.status] ?? 0) + 1;
    businesses[row.business] = (businesses[row.business] ?? 0) + 1;
    organizations[row.organization] = (organizations[row.organization] ?? 0) + 1;
    pipeline += Number(row.gi ?? 0) + Number(row.revenue ?? 0);
    if (row.status === 'Converted') converted += 1;
  }

  return {
    total: rows.length,
    activity: rows.length - (statuses.Open ?? 0),
    qualified: (statuses.Qualified ?? 0) + (statuses.Converted ?? 0),
    pipeline,
    converted,
    conversionRate: rows.length ? Math.round((converted / rows.length) * 1000) / 10 : 0,
    statuses,
    businesses,
    organizations
  };
}
