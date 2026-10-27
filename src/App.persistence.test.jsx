// @vitest-environment jsdom
import { StrictMode } from 'react'
import { renderHook, act } from '@testing-library/react'
import { it, expect, vi, beforeEach } from 'vitest'
import { usePlan } from './hooks/usePlan'
import { useRecords } from './hooks/useRecords'
import { STORAGE_KEYS as K } from './utils/storage'
import { healthyPlan, healthyRecord } from './test/fixtures'
beforeEach(()=>{window.localStorage.clear();vi.restoreAllMocks()})
it('publishes without extra disk writes and never writes inside StrictMode state updaters',()=>{
 const spy=vi.spyOn(Storage.prototype,'setItem'); const {result}=renderHook(()=>({plans:usePlan(),records:useRecords()}),{wrapper:StrictMode})
 act(()=>result.current.plans.publishPlanState({plans:[healthyPlan],activePlanId:healthyPlan.id}))
 act(()=>result.current.records.publishRecords([healthyRecord]))
 expect(result.current.plans.plan.id).toBe(healthyPlan.id);expect(result.current.records.records).toHaveLength(1);expect(spy).not.toHaveBeenCalled()
})
it('hook writes return actual failure without publishing failed records',()=>{
 const {result}=renderHook(()=>useRecords());vi.spyOn(Storage.prototype,'setItem').mockImplementation(()=>{throw Error('quota')})
 let saved;act(()=>{saved=result.current.addRecord(healthyRecord)})
 expect(saved.ok).toBe(false);expect(result.current.records).toEqual([])
})
it('load preserves damaged identities for repair before normalization/rebuild',()=>{
 const duplicate={...healthyPlan,assets:[...healthyPlan.assets,...healthyPlan.assets]};window.localStorage.setItem(K.plans,JSON.stringify([duplicate]));window.localStorage.setItem(K.activePlanId,JSON.stringify(healthyPlan.id))
 const {result}=renderHook(()=>usePlan());expect(result.current.assetIntegrity.byPlanId[healthyPlan.id].needsRepair).toBe(true);expect(result.current.plans[0].assets).toHaveLength(2)
})

it('record capacity returns failure before any write and allows edits at exactly 5000',()=>{
 const {result}=renderHook(()=>useRecords());const records=Array.from({length:5000},(_,i)=>({...healthyRecord,id:`r${i}`}));act(()=>result.current.publishRecords(records));const spy=vi.spyOn(Storage.prototype,'setItem')
 let saved;act(()=>{saved=result.current.addRecord({...healthyRecord,id:'extra'})});expect(saved.ok).toBe(false);expect(spy).not.toHaveBeenCalled();expect(result.current.records).toHaveLength(5000)
 act(()=>{saved=result.current.replaceRecords(records)});expect(saved.ok).toBe(true)
})

it('coordinator refuses to change a saved plan id and orphan its records',async()=>{
 const {savePlanDraft}=await import('./utils/planSaveCoordinator');const {faultStorage}=await import('./test/fixtures');const storage=faultStorage();const result=savePlanDraft({draft:{...healthyPlan,id:'different-id'},plans:[healthyPlan],records:[healthyRecord],editingPlanId:healthyPlan.id,rebuild:(p,r)=>({nextPlan:p,nextRecords:r}),publish:vi.fn(),adapter:storage});expect(result.ok).toBe(false);expect(storage.calls).toEqual([])
})
it('canonical ticker comparisons preserve holdings while keeping historical ticker text',async()=>{
 const {rebuildPlanState}=await import('./App');const {savePlanDraft}=await import('./utils/planSaveCoordinator');const {faultStorage}=await import('./test/fixtures');const original={...healthyPlan,assets:[{...healthyPlan.assets[0],ticker:'spy',currentShares:2.5,initialShares:0,initialSharesOriginal:0}]};const record={...healthyRecord,assets:[{...healthyRecord.assets[0],ticker:'spy'}]};let saved;const result=savePlanDraft({draft:{...original,assets:[{...original.assets[0],ticker:'SPY'}]},plans:[original],records:[record],editingPlanId:original.id,rebuild:rebuildPlanState,publish:next=>{saved=next},adapter:faultStorage()});expect(result.ok).toBe(true);expect(saved.plan.assets[0].currentShares).toBe(2.5);expect(saved.records[0].assets[0].ticker).toBe('spy')
})
