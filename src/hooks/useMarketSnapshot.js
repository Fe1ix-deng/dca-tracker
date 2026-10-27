import {useCallback,useEffect,useMemo,useRef,useState} from 'react'
import {fetchMarketQuotes} from '../services/marketQuotes'
import {canonicalTicker} from '../utils/planConstraints'
import {getLocalDate} from '../utils/executionDate'
import {resolveHolding} from '../utils/valuation'
import {effectiveEventKey,getLastRecordedPrices,resolveMarketPrices,summarizePortfolio} from '../utils/marketSnapshot'

export function useMarketSnapshot({plan,records=[],asOfDate=getLocalDate()}){
 const symbols=(plan?.assets||[]).map(a=>canonicalTicker(a.ticker)),key=JSON.stringify([plan?.id,plan?.market,symbols])
 const [state,setState]=useState({key,automatic:{},manual:{},requests:{},round:0,summary:{total:0,succeeded:0,loading:false}})
 const context=useRef(null),revision=useRef({}),controllers=useRef(new Set()),sequence=useRef(0)
 context.current={plan,asOfDate,key,symbols}
 const refresh=useCallback(async selected=>{
  const ctx=context.current,tickers=Array.isArray(selected)?selected:ctx.symbols
  if(!ctx.plan||!tickers.length)return
  const controller=new AbortController(),round=++sequence.current,captured={...revision.current},basis=Object.fromEntries(tickers.map(t=>[t,effectiveEventKey(ctx.plan,t,ctx.asOfDate)]))
  controllers.current.add(controller)
  setState(s=>{const current=s.key===ctx.key?s:{key:ctx.key,automatic:{},manual:{},requests:{}};return {...current,round,requests:{...current.requests,...Object.fromEntries(tickers.map(t=>[t,{status:'loading',round}]))},summary:{total:tickers.length,succeeded:0,loading:true}}})
  const result=await fetchMarketQuotes(tickers,{signal:controller.signal})
  controllers.current.delete(controller)
  if(context.current.key!==ctx.key||controller.signal.aborted||result.aborted)return
  setState(s=>{
   if(s.key!==ctx.key)return s
   const automatic={...s.automatic},manual={...s.manual},requests={...s.requests}
   let succeeded=0
   for(const ticker of tickers){
    if(requests[ticker]?.round!==round)continue
    if((revision.current[ticker]||0)!==(captured[ticker]||0))continue
    const quote=result.quotes[ticker]
    if(quote){automatic[ticker]={...quote,basisKey:basis[ticker],round};delete manual[ticker];succeeded++}
    requests[ticker]={status:quote?'success':'failed',error:quote?'':result.error,round}
   }
   return {...s,automatic,manual,requests,summary:s.round===round?{total:tickers.length,succeeded,loading:false}:s.summary}
  })
 },[])
 useEffect(()=>{
  revision.current={}
  setState({key,automatic:{},manual:{},requests:{},round:0,summary:{total:0,succeeded:0,loading:false}})
  refresh()
  return ()=>{controllers.current.forEach(c=>c.abort());controllers.current.clear()}
 },[key,refresh])
 const setManual=useCallback((ticker,raw)=>{
  const ctx=context.current;revision.current[ticker]=(revision.current[ticker]||0)+1
  const numeric=raw===''||raw==null?NaN:Number(raw),price=Number.isFinite(numeric)&&numeric>0?numeric:null
  setState(s=>({...s,manual:{...s.manual,[ticker]:{raw,price,edited:true,manualEnteredAt:new Date().toISOString(),basisKey:effectiveEventKey(ctx.plan,ticker,ctx.asOfDate)}},requests:{...s.requests,[ticker]:{status:'idle'}}}))
 },[])
 const current=state.key===key?state:{automatic:{},manual:{},requests:{},summary:{total:0,succeeded:0,loading:false}}
 const recorded=useMemo(()=>plan?getLastRecordedPrices(records,{plan,asOfDate}):{},[plan,records,asOfDate])
 const snapshots=resolveMarketPrices({plan,recorded,automatic:current.automatic,manual:current.manual,requests:current.requests,asOfDate})
 const holdings=useMemo(()=>Object.fromEntries((plan?.assets||[]).map(a=>[canonicalTicker(a.ticker),resolveHolding({plan,records,ticker:a.ticker,asOfDate})])),[plan,records,asOfDate])
 return {snapshots,holdings,portfolio:summarizePortfolio(plan?.assets||[],holdings,snapshots),refresh,setManual,requestSummary:{...current.summary,hasUsableValue:Object.values(snapshots).some(s=>s.reliable&&s.price>0)}}
}
