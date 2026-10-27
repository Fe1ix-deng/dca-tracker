import { describe, it, expect } from 'vitest'
import { resolveHistoricalValuation, resolveHolding, inspectValuationBasis } from './valuation'
const event=(newShares,oldShares,effectiveDate='2026-02-01',id=effectiveDate)=>({id,ticker:'SPY',newShares,oldShares,effectiveDate})
const plan={id:'p',createdAt:'2026-01-01T00:00:00.000Z',assets:[{ticker:'SPY',initialSharesOriginal:0,currentShares:10}],splitEvents:[]}
const record={id:'r',planId:'p',date:'2026-01-10',periodIndex:0,assets:[{ticker:'SPY',price:120,actualShares:10,actualAmount:1199.99}]}
const asOfDate='2026-03-01'
describe('historical valuation uses the same explicit basis as holdings',()=>{
 it.each([[ [event(2,1)],2,60,20],[[event(1,4)],.25,480,2.5],[[event(2,1),event(1,4,'2026-02-02')],.5,240,5]])('preserves value across events %j', (splitEvents,factor,price,shares)=>{
  const p={...plan,splitEvents};const original=JSON.stringify([p,record]);const snapshot=resolveHistoricalValuation({plan:p,records:[record],ticker:'SPY',asOfDate});const holding=resolveHolding({plan:p,records:[record],ticker:'SPY',asOfDate});expect(snapshot).toMatchObject({price,factor,reliable:true,recordDate:'2026-01-10',source:'record-unknown'});expect(holding).toMatchObject({shares,reliable:true});expect(price*shares).toBe(1200);expect(snapshot.adjustment).toBeTruthy();expect(JSON.stringify([p,record])).toBe(original)
 })
 it('excludes future events and treats event-day records as post-event',()=>{
  const p={...plan,splitEvents:[event(2,1,'2026-01-10'),event(4,1,'2026-03-02')]};expect(resolveHistoricalValuation({plan:p,records:[record],ticker:'SPY',asOfDate})).toMatchObject({price:120,factor:1});expect(resolveHolding({plan:p,records:[record],ticker:'SPY',asOfDate}).shares).toBe(10)
 })
 it('ignores absent or wrong adjusted caches when original price is explainable',()=>{
  const p={...plan,splitEvents:[event(2,1)]};for(const asset of [record.assets[0],{...record.assets[0],adjustedPrice:999,adjustedShares:999,splitFactor:999}])expect(resolveHistoricalValuation({plan:p,records:[{...record,assets:[asset]}],ticker:'SPY',asOfDate}).price).toBe(60)
 })
 it.each([{...record,date:'2026-02-30'},{...record,date:'2026-04-01'},{...record,assets:[{ticker:'SPY',adjustedPrice:60}]}])('does not present unexplained data as a factor-one quote',r=>{expect(resolveHistoricalValuation({plan,records:[r],ticker:'SPY',asOfDate}).reliable).toBe(false)})
 it.each([[event(0,1)],[event(2,1,'bad')],[event(2,1),event(2,1)]])('rejects raw damaged/duplicate events before normalization',splitEvents=>{expect(inspectValuationBasis({...plan,splitEvents},'SPY',asOfDate).reliable).toBe(false)})
 it('does not infer an original positive holding from a split-adjusted current position',()=>{
  const p={...plan,assets:[{ticker:'SPY',currentShares:20}],splitEvents:[event(2,1)]};expect(resolveHolding({plan:p,records:[record],ticker:'SPY',asOfDate}).reliable).toBe(false)
 })
 it('selects each ticker own latest dated valid raw price, with stable same-day ties',()=>{
  const records=[record,{...record,id:'z',periodIndex:2,assets:[{ticker:'SPY',price:130,priceSource:'manual'}]},{...record,id:'a',periodIndex:2,assets:[{ticker:'SPY',price:125}]},{...record,date:'2026-02-01',assets:[{ticker:'QQQ',price:10}]},{...record,date:'2026-02-02',assets:[{ticker:'SPY',price:0}]}];expect(resolveHistoricalValuation({plan,records:records.reverse(),ticker:'SPY',asOfDate})).toMatchObject({price:130,recordDate:'2026-01-10',source:'record-manual'})
 })
})
it('keeps fractional original holdings and does not invent a date for positive holdings across events',()=>{
 const p={...plan,assets:[{ticker:'SPY',initialSharesOriginal:.12345678,initialAverageCostOriginal:120,currentShares:.12345678}],splitEvents:[event(1,4)]};expect(resolveHolding({plan:p,records:[],ticker:'SPY',asOfDate})).toMatchObject({shares:.0308642,reliable:true});expect(resolveHolding({plan:{...p,createdAt:''},records:[],ticker:'SPY',asOfDate}).reliable).toBe(false)
})
it('does not let a damaged unrelated ticker event invalidate this ticker',()=>{
 const p={...plan,splitEvents:[event(2,1),{id:'bad-qqq',ticker:'QQQ',effectiveDate:'bad',newShares:0,oldShares:1}]}
 expect(resolveHistoricalValuation({plan:p,records:[record],ticker:'SPY',asOfDate}).reliable).toBe(true)
})
