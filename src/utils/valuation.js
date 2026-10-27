import { canonicalTicker } from './planConstraints'
import { parseCalendarDate, parseExecutionDate, getCreatedLocalDate } from './executionDate'
import { getSplitFactor, adjustAssetForSplit, adjustHoldingForSplit } from './stockSplits'
const number=value=>value === '' || value == null ? NaN : Number(value)
const positive=value=>Number.isFinite(number(value)) && number(value)>0
export const BASIS_REASON='日期或拆合股口径不明确'
export function inspectValuationBasis(plan,ticker,asOfDate) {
 const symbol=canonicalTicker(ticker),events=plan?.splitEvents ?? [],ids=new Set(),signatures=new Set()
 if(!parseCalendarDate(asOfDate)||!Array.isArray(events))return {reliable:false,reason:BASIS_REASON}
 for(const event of events.filter(event=>canonicalTicker(event?.ticker)===symbol)){
  const signature=[canonicalTicker(event?.ticker),event?.effectiveDate,event?.newShares,event?.oldShares].join('|')
  if(!event?.id||ids.has(event.id)||signatures.has(signature)||!parseCalendarDate(event.effectiveDate)||!positive(event.newShares)||!positive(event.oldShares))return {reliable:false,reason:BASIS_REASON}
  ids.add(event.id);signatures.add(signature)
 }
 return {reliable:true,events:events.filter(e=>canonicalTicker(e.ticker)===symbol)}
}
export function resolveHistoricalValuation({plan,records=[],ticker,asOfDate}) {
 const symbol=canonicalTicker(ticker),basis=inspectValuationBasis(plan,symbol,asOfDate)
 const missing={price:null,source:'missing',recordDate:null,asOfDate,factor:null,reliable:false,reason:BASIS_REASON,adjustment:null}
 const candidates=records.filter(r=>r.planId===plan.id).flatMap(record=>(record.assets||[]).filter(a=>canonicalTicker(a.ticker)===symbol).map(asset=>({record,asset,date:parseExecutionDate(record.date)})))
 const valid=candidates.filter(c=>c.date&&c.date<=asOfDate&&positive(c.asset.price)).sort((a,b)=>b.date.localeCompare(a.date)||(Number(b.record.periodIndex)||0)-(Number(a.record.periodIndex)||0)||String(b.record.id).localeCompare(String(a.record.id)))
 const selected=valid[0]
 if(!basis.reliable||!selected)return {...missing,recordDate:candidates.length?parseExecutionDate(candidates[0].record.date):null,reason:candidates.length?BASIS_REASON:'暂无可用价格'}
 const {record,asset,date}=selected,factor=getSplitFactor(symbol,date,basis.events,asOfDate)
 if(!positive(factor))return missing
 const price=adjustAssetForSplit(asset,factor).adjustedPrice
 if(!positive(price))return missing
 return {price,source:asset.priceSource==='auto'?'record-auto':asset.priceSource==='manual'?'record-manual':'record-unknown',recordDate:date,recordId:record.id,asOfDate,factor,reliable:true,reason:'',adjustment:factor===1?null:{factor,asOfDate},lastSuccessfulFetchAt:null,manualEnteredAt:null}
}
export function resolveHolding({plan,records=[],ticker,asOfDate}) {
 const symbol=canonicalTicker(ticker),asset=plan.assets.find(a=>canonicalTicker(a.ticker)===symbol),basis=inspectValuationBasis(plan,symbol,asOfDate)
 const unavailable={shares:null,initialShares:null,reliable:false,reason:BASIS_REASON}
 if(!asset||!basis.reliable)return unavailable
 const entries=records.filter(r=>r.planId===plan.id).flatMap(r=>(r.assets||[]).filter(a=>canonicalTicker(a.ticker)===symbol).map(a=>({asset:a,date:parseExecutionDate(r.date)})))
 if(entries.some(e=>!e.date||e.date>asOfDate||!Number.isFinite(number(e.asset.actualShares))||number(e.asset.actualShares)<0))return unavailable
 const hasOriginal=asset.initialSharesOriginal!=null&&asset.initialSharesOriginal!==''
 const hasInitial=asset.initialShares!=null&&asset.initialShares!==''
 let initial=hasOriginal?number(asset.initialSharesOriginal):hasInitial?number(asset.initialShares):Math.max(0,number(asset.currentShares)-entries.reduce((s,e)=>s+number(e.asset.actualShares),0))
 // A current adjusted position alone cannot establish an original split basis.
 if(!hasOriginal&&basis.events.length&&(!hasInitial||entries.some(e=>e.asset.splitFactor!=null)&&initial>0))return unavailable
 if(!Number.isFinite(initial)||initial<0)return unavailable
 const basisDate=getCreatedLocalDate(plan.createdAt)
 if(initial>0&&basis.events.length&&(!basisDate||basisDate>asOfDate))return unavailable
 const initialFactor=initial>0?getSplitFactor(symbol,basisDate,basis.events,asOfDate):1
 const holding=adjustHoldingForSplit(initial,asset.initialAverageCostOriginal??asset.initialAverageCost,initialFactor)
 const shares=entries.reduce((s,e)=>s+adjustAssetForSplit(e.asset,getSplitFactor(symbol,e.date,basis.events,asOfDate)).adjustedShares,holding.shares)
 return {shares:Number(shares.toFixed(8)),initialShares:holding.shares,initialSharesOriginal:initial,initialAverageCost:holding.averageCost,reliable:Number.isFinite(shares),reason:''}
}
