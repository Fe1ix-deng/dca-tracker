// @vitest-environment jsdom
import {render,screen,waitFor} from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import {it,expect,vi,afterEach} from 'vitest'
import OperationPanel from './OperationPanel'
import {healthyPlan,healthyRecord} from '../test/fixtures'
afterEach(()=>vi.restoreAllMocks())
it('saves the displayed market precision and adds purchases to holdings at the same split valuation day',async()=>{
 vi.spyOn(globalThis,'fetch').mockResolvedValue({ok:true,json:async()=>({quotes:{SPY:{price:12.34567}}})})
 const plan={...healthyPlan,market:'CN',currentPeriod:1,assets:[{...healthyPlan.assets[0],initialSharesOriginal:0,currentShares:10}],splitEvents:[{id:'reverse',ticker:'SPY',effectiveDate:'2026-02-01',newShares:1,oldShares:4}]}
 const record={...healthyRecord,assets:[{ticker:'SPY',price:120,actualShares:10,actualAmount:1200}],totalActualAmount:1200}
 const save=vi.fn(),u=userEvent.setup()
 render(<OperationPanel plan={plan} records={[record]} onSaveRecord={save} onNavigate={()=>{}}/>)
 await waitFor(()=>expect(screen.getByRole('textbox',{name:'SPY 操作价格'})).toHaveValue('12.346'))
 await u.clear(screen.getByRole('textbox',{name:'SPY 实际买入股数'}))
 await u.type(screen.getByRole('textbox',{name:'SPY 实际买入股数'}),'100')
 await u.click(screen.getByRole('button',{name:'确认记录本期操作'}))
 expect(save).toHaveBeenCalledOnce()
 const [saved,nextPlan]=save.mock.calls[0]
 expect(saved.assets[0]).toMatchObject({price:12.346,actualShares:100,actualAmount:1234.6})
 expect(saved.date).toMatch(/^\d{4}-\d{2}-\d{2}$/)
 expect(saved.totalActualAmount).toBe(1234.6)
 expect(nextPlan.assets[0].currentShares).toBe(102.5)
 expect(record.assets[0]).toEqual({ticker:'SPY',price:120,actualShares:10,actualAmount:1200})
})
it('manual invalid/empty input remains missing until explicit successful auto retry and record retains real provenance',async()=>{
 const fetch=vi.spyOn(globalThis,'fetch').mockResolvedValue({ok:true,json:async()=>({quotes:{SPY:{price:150}}})}),save=vi.fn(),u=userEvent.setup();render(<OperationPanel plan={healthyPlan} records={[healthyRecord]} onSaveRecord={save} onNavigate={()=>{}}/>);const input=screen.getByRole('textbox',{name:'SPY 操作价格'});await waitFor(()=>expect(input).toHaveValue('150'));await u.clear(input);await u.type(input,'12abc');await u.tab();expect(input).toHaveValue('12abc');expect(screen.getByRole('button',{name:'确认记录本期操作'})).toBeDisabled();expect(screen.getByText(/暂无可用价格/)).toBeVisible();fetch.mockResolvedValueOnce({ok:false,json:async()=>({})});await u.click(screen.getByRole('button',{name:'自动获取价格'}));await waitFor(()=>expect(screen.getByRole('button',{name:'自动获取价格'})).toBeEnabled());expect(input).toHaveValue('12abc');await u.click(screen.getByRole('button',{name:'自动获取价格'}));await waitFor(()=>expect(input).toHaveValue('150'));await u.click(screen.getByRole('button',{name:'确认记录本期操作'}));expect(save.mock.calls[0][0].assets[0].priceSource).toBe('auto')
})
