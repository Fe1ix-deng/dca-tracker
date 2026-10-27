import { describe, it, expect } from 'vitest'
import { validatePlanDraft } from './planValidation'
import { healthyPlan, openPlan } from '../test/fixtures'
const check = (changes, context) => validatePlanDraft({ ...healthyPlan, ...changes }, context)
const has = (changes, field, context) => expect(check(changes, context).errors.some(e => e.field === field)).toBe(true)
describe('strict draft validation', () => {
  it('accepts inclusive limits and floating point weights', () => {
    expect(check({totalPeriods:'10000'}).isValid).toBe(true)
    expect(check({assets:[.1,.2,.7].map((weight,i)=>({ticker:`T${i}`,weight}))}).isValid).toBe(true)
  })
  it.each(['10001','1.5','0','-1','Infinity','NaN','12abc','1e2',''])('rejects uncorrected periods %s', value => has({totalPeriods:value},'totalPeriods'))
  it.each(['',' ','0','-1','NaN','Infinity','12abc','1e2'])('rejects budget %s', value=>has({totalBudget:value},'totalBudget'))
  it('requires open target but accepts explicit zero and ignores hidden budgets',()=>{
    expect(validatePlanDraft({...openPlan,periodicTarget:''}).isValid).toBe(false)
    expect(validatePlanDraft({...openPlan,periodicTarget:'0',totalBudget:'bad'}).isValid).toBe(true)
  })
  it('rejects record-count shrinkage and excessive plans/assets',()=>{
    has({totalPeriods:1},'totalPeriods',{planRecordCount:2})
    has({},'form',{existingPlanIds:Array.from({length:50},(_,i)=>String(i))})
    expect(check({}, {existingPlanIds:Array.from({length:50},(_,i)=>String(i)),editingPlanId:healthyPlan.id}).isValid).toBe(true)
    has({assets:Array.from({length:101},(_,i)=>({ticker:`T${i}`,weight:1/101}))},'assets')
  })
  it('marks every duplicate row and rejects malformed tickers',()=>{
    const errors=check({assets:[{ticker:'spy',weight:.5},{ticker:' SPY ',weight:.5}]}).errors
    expect(errors.map(e=>e.field)).toEqual(['assets[0].ticker','assets[1].ticker'])
    expect(check({assets:[{ticker:'A'.repeat(20),weight:1}]}).isValid).toBe(true)
    has({assets:[{ticker:'A'.repeat(21),weight:1}]},'assets[0].ticker')
    has({assets:[{ticker:'A/B',weight:1}]},'assets[0].ticker')
  })
  it.each([-1,1.1,'NaN',''])('rejects invalid individual weight %s',weight=>has({assets:[{ticker:'SPY',weight}]},'assets[0].weight'))
  it('uses exact sum tolerance without integer-percent rounding',()=>{
    has({assets:[{ticker:'SPY',weight:.999998}]},'weights')
    expect(check({assets:[{ticker:'SPY',weight:.9999995}]}).isValid).toBe(true)
    has({assets:[{ticker:'SPY',weight:.9999989}]},'weights')
  })
  it('retains all errors in visual order and never mutates input',()=>{
    const draft={...healthyPlan,name:' ',totalBudget:'-12abc',totalPeriods:'1.5',assets:[]}
    const before=JSON.stringify(draft);const result=validatePlanDraft(draft)
    expect(result.errors.map(e=>e.field)).toEqual(['name','totalBudget','totalPeriods','assets'])
    expect(result.firstErrorField).toBe('name');expect(JSON.stringify(draft)).toBe(before)
  })
  it('validates enums, corrupted structure, holdings and visible VA return only',()=>{
    for(const field of ['budgetMode','strategy','market','frequency']) has({[field]:'unknown'},field)
    has({currentPeriod:10001},'currentPeriod')
    has({strategy:'VA',targetAnnualReturn:10.1},'targetAnnualReturn')
    expect(check({strategy:'DCA',targetAnnualReturn:'bad'}).isValid).toBe(true)
    has({assets:[{ticker:'SPY',weight:1,currentShares:'-1'}]},'assets[0].currentShares')
  })
})

it('form and hook normalization retain invalid original numeric values', async()=>{
  const {normalizeFormPlan}=await import('../components/Settings')
  const {normalizePlanState}=await import('../hooks/usePlan')
  const draft={...healthyPlan,totalPeriods:'10001',totalBudget:'-12abc',reserveRatio:0.8,periodicTarget:'',assets:[{ticker:'SPY',weight:1,currentShares:'-3abc',initialAverageCost:'NaN'}]}
  const form=normalizeFormPlan(draft)
  expect(form.totalPeriods).toBe('10001');expect(form.totalBudget).toBe('-12abc');expect(form.assets[0].currentShares).toBe('-3abc')
  expect(normalizePlanState([draft]).plans[0]).toMatchObject({totalPeriods:'10001',reserveRatio:0.8,periodicTarget:''})
})
it('marks duplicate input as a draft error without turning it into loaded repair state',()=>{
 const result=validatePlanDraft({...healthyPlan,assets:[{ticker:'SPY',weight:.5},{ticker:'spy',weight:.5}]});expect(result.errors.every(e=>e.code==='duplicateTicker')).toBe(true)
})
