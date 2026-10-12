// node subs.test.mjs — 실패하면 에러로 멈춤
import assert from 'node:assert/strict';
import { defaults, totals, parseReceipt, applyReceipt } from './subs.js';

// 채점 기준: 넷플릭스 광고형 + 유튜브 + 쿠팡 = 월 29,790 / 연 357,480
let items = defaults().map((i) => ({ ...i, on: ['netflix', 'youtube', 'coupang'].includes(i.id) }));
assert.deepEqual([totals(items).month, totals(items).year], [29790, 357480]);
assert.equal(totals(items).chicken, 17);

// 테스트 문자 (capture/ep02-test-sms.png 글자 그대로). 누적 금액은 무시해야 함
const sms = '[Web발신]\nOO카드(1234) 승인\n홍*동\n7,000원 일시불\n10/12 09:14\nNETFLIX.COM\n누적 352,180원';
let r = parseReceipt(sms);
assert.equal(r.amount, 7000);
assert.equal(r.service.id, 'netflix');

// 이미 있는 넷플릭스에 반영 → 중복 없이 합계 그대로
const before = items.length;
items = applyReceipt(items, r).items;
assert.equal(items.length, before);
assert.equal(items.find((i) => i.id === 'netflix').plan, '광고형');
assert.equal(totals(items).month, 29790);

// OCR이 쉼표를 마침표로, 띄어쓰기를 섞어 읽어도
assert.equal(parseReceipt('승인 13.500 원\nNETFLIX').amount, 13500);

// 실제 tesseract 결과 (ep02-test-sms.png): '원'을 8로, 쉼표를 마침표로 읽음
r = parseReceipt('오늘 오전 914\n0066발신]\n00카드(1234) 승인\n롱*동\n7.0008 일시불\n10/12 09:14\nNETFLIX.COM\n누적 352.180원');
assert.deepEqual([r.amount, r.service.id], [7000, 'netflix']);

// 모르는 가맹점은 새로 추가, 두 번 올려도 하나
r = parseReceipt('[Web발신]\nOO카드 승인\n11,990원 일시불\nSPOTIFY.COM\n누적 1,000원');
assert.deepEqual([r.amount, r.service, r.name], [11990, null, 'SPOTIFY']);
items = applyReceipt(items, r).items;
items = applyReceipt(items, r).items;
assert.equal(items.filter((i) => i.name === 'SPOTIFY').length, 1);
assert.equal(totals(items).month, 29790 + 11990);

// 금액 없으면 그대로
assert.equal(applyReceipt(items, parseReceipt('안녕하세요')).items, items);
console.log('subs ok');
