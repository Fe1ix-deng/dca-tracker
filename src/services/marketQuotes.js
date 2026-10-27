import { canonicalTicker } from '../utils/planConstraints'
export async function fetchMarketQuotes(symbols, { signal } = {}) {
  const tickers=[...new Set((symbols||[]).map(canonicalTicker).filter(Boolean))]
  if(!tickers.length)return {quotes:{},asOf:'',failedTickers:[],error:'缺少 ticker，无法获取行情。'}
  const batches=[]
  for(let index=0;index<tickers.length;index+=20)batches.push(tickers.slice(index,index+20))
  const results=await Promise.all(batches.map(async batch=>{
    try {
      const url='/api/quotes?symbols='+encodeURIComponent(batch.join(','))
      const response=signal?await fetch(url,{signal}):await fetch(url)
      const data=await response.json()
      if(signal?.aborted)return {quotes:{},aborted:true}
      const lastSuccessfulFetchAt=new Date().toISOString(),serviceReportedAt=typeof data?.asOf==='string'?data.asOf:''
      const quotes={}
      if(response.ok)for(const ticker of batch){
        const raw=data?.quotes?.[ticker]?.price,price=raw==null||raw===''?NaN:Number(raw)
        if(Number.isFinite(price)&&price>0)quotes[ticker]={price,lastSuccessfulFetchAt,serviceReportedAt}
      }
      return {quotes,asOf:serviceReportedAt,error:response.ok?'':data?.error||'行情服务暂时不可用。'}
    }catch(error){return {quotes:{},aborted:error?.name==='AbortError'||signal?.aborted,error:'网络异常，无法获取最新行情。'}}
  }))
  if(signal?.aborted||results.some(r=>r.aborted))return {quotes:{},asOf:'',failedTickers:[],error:'',aborted:true}
  const quotes=Object.assign({},...results.map(r=>r.quotes)),failedTickers=tickers.filter(t=>!quotes[t])
  return {quotes,failedTickers,asOf:results.map(r=>r.asOf).find(Boolean)||'',error:failedTickers.length?(results.find(r=>r.error)?.error||'部分标的未返回有效价格。'):''}
}
