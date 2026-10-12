// 구독셈 로직 (화면과 분리해서 subs.test.mjs로 검증)
// 요금: 2026-10-12 조사, 영상/cardnews-reel/capture/ep02-prices.md. 출처가 엇갈린 티빙·스포티파이는 뺌
export const PRICED_AT = '2026년 10월';
export const CHICKEN = 20000; // 치킨 환산 기준 (대략값)
export const COFFEE = 4500; // 아이스 아메리카노 환산 기준 (대략값)

export const SERVICES = [
  { id: 'netflix', name: '넷플릭스', emoji: '🎬', plans: [['광고형', 7000], ['스탠다드', 13500], ['프리미엄', 17000]], match: /넷플릭스|netflix/i },
  { id: 'youtube', name: '유튜브 프리미엄', emoji: '▶️', plans: [['일반', 14900], ['라이트', 8500]], match: /유튜브|youtube/i },
  { id: 'coupang', name: '쿠팡 와우', emoji: '🚀', plans: [['월', 7890]], match: /쿠팡|coupang/i },
  { id: 'naver', name: '네이버플러스', emoji: '💚', plans: [['월', 4900]], match: /네이버|naver/i },
  { id: 'disney', name: '디즈니+', emoji: '🏰', plans: [['스탠다드', 9900], ['프리미엄', 13900]], match: /디즈니|disney/i },
];

export function totals(items) {
  const month = items.filter((i) => i.on).reduce((a, i) => a + (Math.max(0, +i.price) || 0), 0);
  return { month, year: month * 12, count: items.filter((i) => i.on).length, chicken: Math.floor((month * 12) / CHICKEN), coffee: Math.floor((month * 12) / COFFEE) };
}

// 결제 문자 OCR 글자 → { amount, service, name }. 누적·잔액·한도 줄의 금액은 건너뜀
const SKIP = /누적|잔액|한도|포인트|남은/;
export function parseReceipt(text) {
  const lines = String(text).split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
  let amount = 0;
  for (const l of lines) {
    if (SKIP.test(l)) continue;
    // 7,000원 / 7.000원 / OCR이 '원'을 8로 읽은 7.0008 → 천 단위 구분 숫자면 '원' 없어도 금액. 아니면 7000원
    const t = l.replace(/\s/g, '');
    const m = t.match(/(\d{1,3}(?:[,.]\d{3})+)/) || t.match(/(\d{3,7})원/);
    if (m) { amount = +m[1].replace(/[,.]/g, ''); break; }
  }
  const service = SERVICES.find((s) => s.match.test(text)) || null;
  // 모르는 가맹점이면 영문 대문자 가맹점 줄(예: SPOTIFY.COM)이나 금액 다음 줄을 이름으로
  let name = service?.name || '';
  if (!service) {
    const cand = lines.find((l) => /^[A-Z][A-Z0-9 .*&-]{2,}$/.test(l)) ||
      lines.find((l) => !/\d/.test(l) && !/발신|승인|카드|일시불|\*/.test(l));
    name = (cand || '').replace(/\.(COM|CO\.KR|NET)$/i, '').trim();
  }
  return { amount, service, name };
}

// 해석 결과를 목록에 반영. 같은 서비스면 새로 만들지 않고 금액만 맞춤 (중복 방지)
export function applyReceipt(items, { amount, service, name }) {
  if (!amount) return { items, msg: '금액을 못 찾았어요. 직접 추가해 주세요.' };
  if (service) {
    const plan = service.plans.find(([, p]) => p === amount);
    const next = items.map((i) => (i.id === service.id ? { ...i, on: true, price: amount, plan: plan ? plan[0] : '직접' } : i));
    return { items: next, msg: `${service.name} ${amount.toLocaleString()}원 반영했어요` };
  }
  const label = name || '새 구독';
  const dup = items.find((i) => i.name === label);
  if (dup) return { items: items.map((i) => (i === dup ? { ...i, on: true, price: amount } : i)), msg: `${label} ${amount.toLocaleString()}원 반영했어요` };
  return { items: [...items, { id: `c${Date.now()}`, name: label, emoji: '🧾', on: true, price: amount, custom: true }], msg: `${label} ${amount.toLocaleString()}원 추가했어요` };
}

export const defaults = () => SERVICES.map((s) => ({ id: s.id, name: s.name, emoji: s.emoji, on: false, price: s.plans[0][1], plan: s.plans[0][0] }));
