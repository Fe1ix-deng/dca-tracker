// @vitest-environment jsdom
import { render, waitFor, act, screen, fireEvent } from '@testing-library/react'
import { it, expect, beforeEach, vi } from 'vitest'
import App, { rebuildPlanState } from './App'
import { healthyPlan, healthyRecord } from './test/fixtures'
import { STORAGE_KEYS as K } from './utils/storage'
vi.mock('./utils/download',()=>({downloadFile:vi.fn()}))
const capture = vi.hoisted(()=>({current:null}))
vi.mock('./components/Settings',()=>({default:props=>{capture.current=props;return <h2>Settings coordinator fixture</h2>}}))
beforeEach(()=>{vi.restoreAllMocks();localStorage.clear();history.replaceState({},'', '/settings');capture.current=null})
async function start(plans=[healthyPlan],records=[]) {
 const rebuilt=rebuildPlanState(plans[0],records)
 const safePlans=[rebuilt.nextPlan,...plans.slice(1)]
 for(const [key,value] of [[K.plans,safePlans],[K.plan,safePlans[0]],[K.activePlanId,safePlans[0].id],[K.records,rebuilt.nextRecords]])localStorage.setItem(key,JSON.stringify(value))
 render(<App/>);fireEvent.click(screen.getAllByRole('button',{name:'设置',exact:true})[0]);await waitFor(()=>expect(capture.current?.plan?.id).toBe(plans[0].id));return capture.current
}
it('App does not publish or navigate when a later required write fails',async()=>{
 const position=4
 await start();const before=Object.fromEntries([K.plans,K.plan,K.activePlanId,K.records].map(k=>[k,localStorage.getItem(k)]))
 const native=Storage.prototype.setItem;let writes=0
 vi.spyOn(Storage.prototype,'setItem').mockImplementation(function(k,v){if([K.plans,K.plan,K.activePlanId,K.records].includes(k)&&++writes===position)throw Error('fault');return native.call(this,k,v)})
 let result;await act(async()=>{result=await capture.current.onSavePlan({...capture.current.plan,name:'Changed'},{editingPlanId:healthyPlan.id})})
 expect(result.ok).toBe(false);expect(capture.current.plan.name).toBe(healthyPlan.name);expect(location.pathname).toBe('/');expect(localStorage.getItem(K.lastDataChangeAt)).toBeNull()
 for(const [k,v]of Object.entries(before))expect(localStorage.getItem(k)).toBe(v)
})
it('App publishes and marks only after four successful writes, without owning Settings navigation',async()=>{
 await start();let result;await act(async()=>{result=await capture.current.onSavePlan({...capture.current.plan,name:'Saved'},{editingPlanId:healthyPlan.id})})
 expect(result.ok).toBe(true);expect(capture.current.plan.name).toBe('Saved');expect(localStorage.getItem(K.lastDataChangeAt)).not.toBeNull();expect(location.pathname).toBe('/')
})
it('direct App callback cannot rename a linked asset',async()=>{
 await start([healthyPlan],[healthyRecord]);const before=localStorage.getItem(K.records);let result
 await act(async()=>{result=await capture.current.onSavePlan({...capture.current.plan,assets:[{ticker:'QQQ',weight:1}]},{editingPlanId:healthyPlan.id})})
 expect(result.ok).toBe(false);expect(result.errors.some(e=>e.code==='protectedTicker')).toBe(true);expect(localStorage.getItem(K.records)).toBe(before)
})
it('damaged loaded identities remain intact and cannot be automatically rebuilt',async()=>{
 const damaged={...healthyPlan,assets:[...healthyPlan.assets,...healthyPlan.assets]};localStorage.setItem(K.plans,JSON.stringify([damaged]));localStorage.setItem(K.activePlanId,JSON.stringify(damaged.id));localStorage.setItem(K.records,JSON.stringify([healthyRecord]));const before=localStorage.getItem(K.plans)
 render(<App/>);fireEvent.click(screen.getAllByRole('button',{name:'设置',exact:true})[0]);await waitFor(()=>expect(capture.current?.assetIntegrity?.needsRepair).toBe(true));expect(localStorage.getItem(K.plans)).toBe(before)
})
it('a callback retained from a departed Settings context cannot save after returning',async()=>{
 const old=await start();await act(async()=>old.onNavigate('dashboard'));await act(async()=>old.onNavigate('settings'));await waitFor(()=>expect(capture.current).not.toBe(old));const before=localStorage.getItem(K.plans);let result
 await act(async()=>{result=await old.onSavePlan({...old.plan,name:'Stale overwrite'},{editingPlanId:healthyPlan.id})});expect(result.ok).toBe(false);expect(localStorage.getItem(K.plans)).toBe(before)
})
it('saving a healthy plan preserves malformed raw assets in an unrelated repair plan',async()=>{
 const damaged={...healthyPlan,id:'damaged',name:'Damaged',assets:[null,...healthyPlan.assets]};await start([healthyPlan,damaged]);let result;await act(async()=>{result=await capture.current.onSavePlan({...capture.current.plan,name:'Healthy edit'},{editingPlanId:healthyPlan.id})});expect(result.ok).toBe(true);expect(JSON.parse(localStorage.getItem(K.plans)).find(p=>p.id==='damaged').assets[0]).toBeNull()
})
it('orphan records without any matching plan remain visible in a raw repair panel',async()=>{
 localStorage.setItem(K.records,JSON.stringify([{...healthyRecord,planId:'missing-plan'}]));render(<App/>);expect(await screen.findByRole('region',{name:'数据需要修复'})).toHaveTextContent('orphanPlan');expect(JSON.parse(localStorage.getItem(K.records))[0].planId).toBe('missing-plan')
})
it('auto rebuild does not silently correct corrupt structure or numeric input',async()=>{
 const raw={...healthyPlan,currentPeriod:10001,assets:[{...healthyPlan.assets[0],initialAverageCost:'12abc'}]};localStorage.setItem(K.plans,JSON.stringify([raw]));localStorage.setItem(K.activePlanId,JSON.stringify(raw.id));const before=localStorage.getItem(K.plans);render(<App/>);fireEvent.click(screen.getAllByRole('button',{name:'设置',exact:true})[0]);await waitFor(()=>expect(capture.current?.plan?.id).toBe(raw.id));expect(capture.current.plan.currentPeriod).toBe(10001);expect(capture.current.plan.assets[0].initialAverageCost).toBe('12abc');expect(localStorage.getItem(K.plans)).toBe(before)
})
it.each([
 ['initialSharesOriginal', -4],
 ['initialShares', '12abc'],
 ['initialAverageCostOriginal', -10],
])('loading invalid %s preserves storage instead of rebuilding it',async(field,value)=>{
 const raw={...healthyPlan,assets:[{...healthyPlan.assets[0],[field]:value}]}
 localStorage.setItem(K.plans,JSON.stringify([raw]))
 localStorage.setItem(K.activePlanId,JSON.stringify(raw.id))
 const before=localStorage.getItem(K.plans)
 render(<App/>)
 fireEvent.click(screen.getAllByRole('button',{name:'设置',exact:true})[0])
 await waitFor(()=>expect(capture.current?.plan?.id).toBe(raw.id))
 expect(localStorage.getItem(K.plans)).toBe(before)
 expect(screen.getByRole('alert')).toHaveTextContent('计划结构无效')
})
it('valid backup restores damaged identities and is persisted before publishing',async()=>{
 const damaged={...healthyPlan,assets:[...healthyPlan.assets,...healthyPlan.assets]};localStorage.setItem(K.plans,JSON.stringify([damaged]));localStorage.setItem(K.activePlanId,JSON.stringify(damaged.id));render(<App/>);fireEvent.click(screen.getAllByRole('button',{name:'设置',exact:true})[0]);await waitFor(()=>expect(capture.current?.assetIntegrity?.needsRepair).toBe(true));let result;await act(async()=>{result=await capture.current.onImportBackup({plans:[healthyPlan],activePlanId:healthyPlan.id,records:[]})});expect(result?.ok).toBe(true);expect(JSON.parse(localStorage.getItem(K.plans))[0].assets).toHaveLength(1)
})
it('import replaces the whole plan list and selects the imported active plan instead of appending',async()=>{
 await start();const imported=[{...healthyPlan,id:'import-a',name:'Imported A'},{...healthyPlan,id:'import-b',name:'Imported B'}];let result
 await act(async()=>{result=await capture.current.onImportBackup({plans:imported,activePlanId:'import-b',records:[]})})
 expect(result.ok).toBe(true);expect(JSON.parse(localStorage.getItem(K.plans)).map(p=>p.id)).toEqual(['import-a','import-b']);expect(JSON.parse(localStorage.getItem(K.activePlanId))).toBe('import-b');expect(JSON.parse(localStorage.getItem(K.plan)).id).toBe('import-b');expect(localStorage.getItem(K.lastDataChangeAt)).not.toBeNull();expect(await screen.findByRole('heading',{name:'历史记录',exact:true})).toBeVisible();expect(location.pathname).toBe('/')
})
it('failed import leaves Settings and the previous published plans unchanged',async()=>{
 const position=4
 await start();const before=Object.fromEntries([K.plans,K.plan,K.activePlanId,K.records].map(k=>[k,localStorage.getItem(k)]));const native=Storage.prototype.setItem;let writes=0
 vi.spyOn(Storage.prototype,'setItem').mockImplementation(function(k,v){if([K.plans,K.plan,K.activePlanId,K.records].includes(k)&&++writes===position)throw Error('import fault');return native.call(this,k,v)})
 let result;await act(async()=>{result=await capture.current.onImportBackup({plans:[{...healthyPlan,id:'replacement'}],activePlanId:'replacement',records:[]})})
 expect(result.ok).toBe(false);expect(capture.current.plan.id).toBe(healthyPlan.id);expect(location.pathname).toBe('/');expect(localStorage.getItem(K.lastDataChangeAt)).toBeNull();for(const[k,v]of Object.entries(before))expect(localStorage.getItem(k)).toBe(v)
})
