import {canonicalTicker} from './planConstraints'
import {parseCalendarDate} from './executionDate'
import {inspectValuationBasis,resolveHistoricalValuation,BASIS_REASON} from './valuation'
export function effectiveEventKey(plan,ticker,asOfDate){
 const basis=inspectValuationBasis(plan,ticker,asOfDate)
 return basis.reliable?JSON.stringify(basis.events.filter(e=>e.effectiveDate<=asOfDate).map(e=>[e.id,e.effectiveDate,Number(e.newShares),Number(e.oldShares)]).sort((a,b)=>a[0].localeCompare(b[0]))):null
}
export function getLastRecordedPrices(records,{plan,asOfDate}){
 return Object.fromEntries(plan.assets.map(asset=>[canonicalTicker(asset.ticker),resolveHistoricalValuation({plan,records,ticker:asset.ticker,asOfDate})]))
}
export function resolveMarketPrices({plan,recorded={},automatic={},manual={},requests={},asOfDate}){
 return Object.fromEntries((plan?.assets||[]).map(asset=>{
  const ticker=canonicalTicker(asset.ticker),override=manual[ticker],auto=automatic[ticker],basisKey=effectiveEventKey(plan,ticker,asOfDate)
  let snapshot=override?.edited?{...override,source:override.price>0?'manual':'missing',reliable:override.price>0}:auto?{...auto,source:'auto',reliable:true}:recorded[ticker]||{price:null,source:'missing',reliable:false,reason:'暂无可用价格'}
  if((override?.edited||auto)&&(!parseCalendarDate(asOfDate)||basisKey===null||snapshot.basisKey!==basisKey))snapshot={...snapshot,reliable:false,reason:BASIS_REASON}
  return [ticker,{...snapshot,asOfDate,requestStatus:requests[ticker]?.status||'idle',error:requests[ticker]?.error||''}]
 }))
}
export function summarizePortfolio(assets,holdings,snapshots){
 let knownValue=0,missingCount=0;const origins=new Set()
 for(const asset of assets){
  const ticker=canonicalTicker(asset.ticker),holding=holdings[ticker],snapshot=snapshots[ticker]
  if(!holding?.reliable){missingCount++;continue}
  if(holding.shares===0)continue
  if(!snapshot?.reliable||!(snapshot.price>0)){missingCount++;continue}
  knownValue+=holding.shares*snapshot.price
  origins.add(snapshot.source==='auto'?'auto:'+snapshot.round:snapshot.source)
 }
 return {knownValue,marketValue:missingCount?null:knownValue,missingCount,mixed:origins.size>1}
}
export function getQuoteDisplayState(summary){
 if(summary.loading)return {text:summary.hasUsableValue?'刷新中，暂用上次获取或记录价格。':'正在获取价格；暂无可用价格。'}
 if(summary.total===0)return {text:'暂无可用价格。'}
 if(summary.succeeded===summary.total)return {text:'本次获取 {success}/{total}；行情时间未提供，可能延迟。'}
 if(summary.succeeded>0)return {text:'本次获取 {success}/{total}，部分失败；保留各标的原有来源。'}
 return {text:summary.hasUsableValue?'获取失败，使用上次获取或历史参考价格；缺价请重试或手动输入。':'获取失败，暂无可用价格；请重试或手动输入。'}
}
