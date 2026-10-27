import {it,expect} from 'vitest'
import {getLastRecordedPrices,resolveMarketPrices,summarizePortfolio,getQuoteDisplayState} from './marketSnapshot'
import {healthyPlan,healthyRecord} from '../test/fixtures'
const asOfDate='2026-03-01'
it('distinguishes first loading and total failure with no usable values from stale reference values',()=>{
 expect(getQuoteDisplayState({loading:true,total:1,succeeded:0,hasUsableValue:false}).text).toBe('正在获取价格；暂无可用价格。')
 expect(getQuoteDisplayState({loading:false,total:1,succeeded:0,hasUsableValue:false}).text).toBe('获取失败，暂无可用价格；请重试或手动输入。')
 expect(getQuoteDisplayState({loading:true,total:1,succeeded:0,hasUsableValue:true}).text).toBe('刷新中，暂用上次获取或记录价格。')
})
it('keeps per-ticker record provenance and the adopted execution date',()=>{
 const plan={...healthyPlan,assets:[...healthyPlan.assets,{ticker:'QQQ'}]};const records=[healthyRecord,{...healthyRecord,id:'later',date:'2026-02-02',assets:[{ticker:'QQQ',price:30,priceSource:'manual'}]}];const map=getLastRecordedPrices(records,{plan,asOfDate});expect(map.SPY).toMatchObject({price:120,recordDate:'2026-01-02',source:'record-unknown'});expect(map.QQQ).toMatchObject({price:30,recordDate:'2026-02-02',source:'record-manual'})
})
it('retains each successful fetch time, fails closed across changed effective events, and honors empty manual override',()=>{
 const plan=healthyPlan,recorded=getLastRecordedPrices([healthyRecord],{plan,asOfDate});const auto={SPY:{price:140,lastSuccessfulFetchAt:'2026-02-01T00:00:00Z',basisKey:'[]',round:1}};expect(resolveMarketPrices({plan,recorded,automatic:auto,manual:{SPY:{raw:'',price:null,edited:true}},asOfDate}).SPY).toMatchObject({price:null,source:'missing'});const changed={...plan,splitEvents:[{id:'s',ticker:'SPY',effectiveDate:'2026-02-15',newShares:2,oldShares:1}]};expect(resolveMarketPrices({plan:changed,recorded,automatic:auto,asOfDate}).SPY).toMatchObject({reliable:false})
})
it('withholds complete total for positive missing/unreliable holdings; zero holdings do not require prices',()=>{
 const assets=[{ticker:'SPY',currentShares:2},{ticker:'QQQ',currentShares:1}];expect(summarizePortfolio(assets,{SPY:{shares:2,reliable:true},QQQ:{shares:1,reliable:true}},{SPY:{price:120,reliable:true},QQQ:{price:null,reliable:false}})).toMatchObject({marketValue:null,knownValue:240,missingCount:1});expect(summarizePortfolio([{ticker:'QQQ',currentShares:0}],{QQQ:{shares:0,reliable:true}},{})).toMatchObject({marketValue:0,missingCount:0})
})
it('detects mixed sources and different successful rounds',()=>{
 const assets=[{ticker:'A'},{ticker:'B'}],holdings={A:{shares:1,reliable:true},B:{shares:1,reliable:true}};expect(summarizePortfolio(assets,holdings,{A:{price:1,reliable:true,source:'auto',round:2},B:{price:2,reliable:true,source:'record-manual'}}).mixed).toBe(true);expect(summarizePortfolio(assets,holdings,{A:{price:1,reliable:true,source:'auto',round:2},B:{price:2,reliable:true,source:'auto',round:1}}).mixed).toBe(true)
})
