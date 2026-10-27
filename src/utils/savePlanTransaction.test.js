import { it, expect } from 'vitest'
import { persistPlanSave } from './savePlanTransaction'
import { faultStorage, healthyPlan } from '../test/fixtures'
import { STORAGE_KEYS as K } from './storage'
const next={plans:[healthyPlan],activePlanId:healthyPlan.id,plan:healthyPlan,records:[]}
const initial=Object.fromEntries([K.plans,K.activePlanId,K.plan,K.records].map((key,i)=>[key,JSON.stringify(`old-${i}`)]))
it('writes every required key and returns real success',()=>{const s=faultStorage(initial);expect(persistPlanSave({next},s)).toEqual({ok:true});expect(s.calls.map(c=>c[1])).toEqual([K.plans,K.activePlanId,K.plan,K.records]);expect(JSON.parse(s.data.get(K.plans))).toEqual(next.plans)})
it.each([1,2,3,4])('restores exact raw snapshot when write %s fails',position=>{const s=faultStorage(initial,[position]);const result=persistPlanSave({next},s);expect(result.ok).toBe(false);expect(result.rollbackFailed).toBe(false);expect(Object.fromEntries(s.data)).toEqual(initial)})
it('removes absent keys during compensation, not JSON null',()=>{const s=faultStorage({},[4]);expect(persistPlanSave({next},s).ok).toBe(false);expect(s.data.size).toBe(0);expect(s.calls.filter(c=>c[0]==='remove')).toHaveLength(3)})
it('reports compensation failure and permits idempotent retry',()=>{const s=faultStorage(initial,[4,5]);const result=persistPlanSave({next},s);expect(result).toMatchObject({ok:false,rollbackFailed:true});expect(result.error).toMatch(/部分/);expect(persistPlanSave({next},s)).toEqual({ok:true});expect(JSON.parse(s.data.get(K.plans))).toHaveLength(1)})
it('does not begin writes if snapshot read fails',()=>{const s=faultStorage(initial);s.read=()=>{throw Error('read denied')};expect(persistPlanSave({next},s).ok).toBe(false);expect(s.calls).toEqual([])})
it('rejects excess global records without truncating or writing',()=>{const s=faultStorage();expect(persistPlanSave({next:{...next,records:Array(5001).fill({})}},s).ok).toBe(false);expect(s.calls).toEqual([])})
