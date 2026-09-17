import { snapshot } from './data.js';

const root = document.querySelector('#view-root');
const title = document.querySelector('#view-title');
const dialog = document.querySelector('#detail-dialog');

const fmt = (n) => new Intl.NumberFormat('ko-KR').format(n);
const money = (n) => `${fmt(n)}원`;

function metricCard(label, value, note = '', accent = false) {
  return `<article class="kpi ${accent ? 'accent' : ''}"><div class="kpi-label">${label}</div><div class="kpi-value">${value}</div>${note ? `<div class="panel-note">${note}</div>` : ''}</article>`;
}

function overview() {
  const status = [['Open', snapshot.open, ''], ['Contacted', snapshot.contacted, 'orange'], ['Qualified', snapshot.qualified, 'lime'], ['Converted', snapshot.converted, 'navy'], ['Disqualified', snapshot.disqualified, '']];
  const max = Math.max(...status.map(([, value]) => value));
  return `<div class="kpi-grid">${metricCard('전체 Lead', fmt(snapshot.total), '현재 스냅샷 기준')}${metricCard('전환 Lead', fmt(snapshot.converted), `전환율 ${snapshot.conversionRate}%`, true)}${metricCard('Pipeline GI + 매출', money(snapshot.pipeline), '승인된 Opportunity 기준')}${metricCard('Open / 진행 중', fmt(snapshot.open + snapshot.contacted + snapshot.qualified), 'Open · Contacted · Qualified')}</div>
  <div class="section-grid"><section class="panel"><div class="panel-head"><h3>Lead 상태</h3><span class="panel-note">현재 상태 분포</span></div>${status.map(([name, value, color]) => `<div class="status-row"><span>${name}</span><div class="bar"><i class="${color}" style="width:${Math.max(3, value / max * 100)}%"></i></div><strong>${fmt(value)}</strong></div>`).join('')}</section>
  <section class="panel"><div class="panel-head"><h3>조직별 Summary</h3><span class="panel-note">수치 전체 공개 · 상세는 권한별</span></div><table class="summary-table"><thead><tr><th>Organization Level 2</th><th>Lead</th><th>전환</th><th>전환율</th></tr></thead><tbody>${snapshot.organizations.map((org) => `<tr><td>${org.name}</td><td><button class="table-link" data-org="${org.name}">${fmt(org.total)}<span class="lock">${org.allowed ? '상세' : '잠김'}</span></button></td><td>${fmt(org.converted)}</td><td>${org.rate}%</td></tr>`).join('')}</tbody></table></section></div>
  <div class="section-grid"><section class="panel"><div class="panel-head"><h3>최근 주차 흐름</h3><span class="panel-note">Lead 수 / 전환 수</span></div><div class="chart">${snapshot.weekly.map((item) => `<div class="bar-col"><i style="height:${item.leads / 70 * 100}%"></i><span>${item.period}</span></div>`).join('')}</div></section><section class="panel"><div class="panel-head"><h3>Business별 Lead</h3><span class="panel-note">관심제품에서 자동 분류</span></div>${snapshot.businesses.map((item) => `<div class="business-card"><span class="business-code">${item.name}</span><div><strong>${item.description}</strong><small>전체 비중 ${item.share}%</small></div><b>${fmt(item.value)}</b></div>`).join('')}</section></div>`;
}

function periodView(mode) {
  const data = mode === 'weekly' ? snapshot.weekly : snapshot.monthly;
  title.textContent = mode === 'weekly' ? '주차별 Lead 관리' : '월도별 Lead 관리';
  return `<section class="panel"><div class="panel-head"><h3>${mode === 'weekly' ? 'Monday–Sunday 기준' : 'Lead 생성월 기준'}</h3><span class="panel-note">기준 스냅샷 ${snapshot.date}</span></div><table class="summary-table"><thead><tr><th>기간</th><th>Lead</th><th>Converted</th><th>Pipeline (백만원)</th></tr></thead><tbody>${data.map((item) => `<tr><td>${item.period}</td><td>${fmt(item.leads)}</td><td>${fmt(item.converted)}</td><td>${item.pipeline.toFixed(1)}</td></tr>`).join('')}</tbody></table></section><div class="section-grid"><section class="panel"><div class="panel-head"><h3>전환율 흐름</h3><span class="panel-note">기간별 Converted / Lead</span></div><div class="chart">${data.map((item) => `<div class="bar-col"><i style="height:${item.converted / item.leads * 100 * 2.2}%"></i><span>${item.period}</span></div>`).join('')}</div></section><section class="panel"><div class="panel-head"><h3>데이터 기준</h3></div><p class="panel-note" style="line-height:1.8">기간은 <strong>Lead생성날짜</strong>를 기준으로 계산합니다. 화면의 수치는 선택한 승인 스냅샷에 고정되며, 실제 원본 Lead 행은 Organization Level 2 권한을 확인한 뒤에만 조회됩니다.</p></section></div>`;
}

function businessView() {
  title.textContent = 'Business / 제품 관리';
  return `<div class="section-grid"><section class="panel"><div class="panel-head"><h3>Business 매핑</h3><span class="panel-note">Main Interest Area → Business</span></div>${snapshot.businesses.map((item) => `<div class="business-card"><span class="business-code">${item.name}</span><div><strong>${item.description}</strong><small>업로드 시 미매핑 제품은 반영 전 차단</small></div><b>${fmt(item.value)}</b></div>`).join('')}</section><section class="panel"><div class="panel-head"><h3>업로드 스냅샷</h3><span class="panel-note">승인된 날짜만 선택 가능</span></div><table class="summary-table"><tbody><tr><td>현재 기준일</td><td>${snapshot.date}</td></tr><tr><td>스냅샷 행 수</td><td>${fmt(snapshot.total)} Lead</td></tr><tr><td>원본 파일</td><td>권한 보호됨</td></tr><tr><td>상태</td><td>반영 완료</td></tr></tbody></table></section></div>`;
}

function render(view = 'overview') {
  title.textContent = view === 'overview' ? 'FY26 Lead 현황' : title.textContent;
  root.innerHTML = view === 'overview' ? overview() : view === 'business' ? businessView() : periodView(view);
  document.querySelectorAll('[data-org]').forEach((button) => button.addEventListener('click', () => { if (button.dataset.org !== 'DT Sales') dialog.hidden = false; else window.alert('DT Sales 상세 조회는 권한 확인 후 연결됩니다.'); }));
}

document.querySelectorAll('.nav-item').forEach((button) => button.addEventListener('click', () => { document.querySelectorAll('.nav-item').forEach((item) => item.classList.remove('active')); button.classList.add('active'); render(button.dataset.view); }));
document.querySelector('#snapshot-select').addEventListener('change', (event) => { snapshot.date = event.target.value; render(document.querySelector('.nav-item.active').dataset.view); });
document.querySelectorAll('#dialog-close, #dialog-ok').forEach((button) => button.addEventListener('click', () => { dialog.hidden = true; }));
render();
