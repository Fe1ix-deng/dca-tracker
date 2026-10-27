import { it, expect } from 'vitest'
import { inspectAssetIntegrity, validateAssetIdentityChange } from './assetIntegrity'
import { healthyPlan, healthyRecord, futureSplit } from '../test/fixtures'
it('allows unlinked rename/delete and blocks records or future events',()=>{
  const changed={...healthyPlan,assets:[{ticker:'QQQ',weight:1}]}
  expect(validateAssetIdentityChange(healthyPlan,changed,[])).toEqual([])
  expect(validateAssetIdentityChange(healthyPlan,changed,[healthyRecord])).not.toEqual([])
  expect(validateAssetIdentityChange({...healthyPlan,splitEvents:[futureSplit]},changed,[])).not.toEqual([])
})
it('inspects raw duplicates/orphans without mutating or merging',()=>{
  const plans=[{...healthyPlan,assets:[...healthyPlan.assets,{ticker:' spy ',weight:0}],splitEvents:[{...futureSplit,ticker:'QQQ'}]}]
  const records=[healthyRecord,{...healthyRecord,id:'orphan',planId:'missing'}]
  const before=JSON.stringify({plans,records});const result=inspectAssetIntegrity({plans,records})
  expect(result.byPlanId['plan-a'].needsRepair).toBe(true)
  expect(result.issues.map(e=>e.code)).toEqual(expect.arrayContaining(['duplicateTicker','orphanEvent','orphanPlan']))
  expect(JSON.stringify({plans,records})).toBe(before)
})
it('marks duplicate record identities and assets as damaged; healthy other plans stay usable',()=>{
  const records=[healthyRecord,{...healthyRecord}]
  const result=inspectAssetIntegrity({plans:[healthyPlan,{...healthyPlan,id:'other'}],records})
  expect(result.byPlanId['plan-a'].needsRepair).toBe(true);expect(result.byPlanId.other.needsRepair).toBe(false)
})
it('normal backup export refuses damaged identities, healthy backup remains importable',async()=>{
 const {buildBackupPayload,parseBackupPayload}=await import('./backup')
 expect(()=>buildBackupPayload(healthyPlan,[healthyPlan],[{...healthyRecord,assets:[{ticker:'MISSING'}]}])).toThrow(/修复/)
 const healthy=buildBackupPayload(healthyPlan,[healthyPlan],[healthyRecord])
 expect(parseBackupPayload(JSON.parse(JSON.stringify(healthy))).records[0].assets[0].ticker).toBe('SPY')
})
it('invalid split dates and ratios are repair issues before any normalizer can discard them',()=>{
 for(const event of [{...futureSplit,effectiveDate:'2023-02-29'},{...futureSplit,newShares:0},{...futureSplit,oldShares:Infinity}]) {
  const plan={...healthyPlan,splitEvents:[event]};const before=JSON.stringify(plan);const result=inspectAssetIntegrity({plans:[plan],records:[]});expect(result.byPlanId[plan.id].needsRepair).toBe(true);expect(JSON.stringify(plan)).toBe(before)
 }
})
