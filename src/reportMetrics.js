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
    pipeline,
    converted,
    conversionRate: rows.length ? Math.round((converted / rows.length) * 1000) / 10 : 0,
    statuses,
    businesses,
    organizations
  };
}
