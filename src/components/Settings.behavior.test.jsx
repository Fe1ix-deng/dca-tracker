// @vitest-environment jsdom
import { render, screen, waitFor, act, fireEvent } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { it, expect, vi } from 'vitest'
import Settings from './Settings'
import { healthyPlan, healthyRecord, futureSplit } from '../test/fixtures'
const saveButton=()=>screen.getByRole('button',{name:'保存当前计划',exact:true})
it('invalid save remains enabled, reports all errors, focuses actual first field and revalidates without stealing focus',async()=>{
 const onSave=vi.fn();const u=userEvent.setup();render(<Settings plan={null} onSavePlan={onSave}/>)
 expect(saveButton()).toBeEnabled();await u.click(saveButton());expect(screen.getByRole('textbox',{name:'名称',exact:true})).toHaveFocus();expect(screen.getByLabelText('保存错误摘要')).toHaveTextContent('至少添加')
 await u.type(screen.getByRole('textbox',{name:'名称',exact:true}),'Draft');expect(screen.getByRole('textbox',{name:'名称',exact:true})).toHaveFocus();expect(screen.getByLabelText('保存错误摘要')).not.toHaveTextContent('名称：必填')
 const periods=screen.getByRole('textbox',{name:'总期数',exact:true});await u.clear(periods);await u.type(periods,'10001');await u.tab();expect(periods).toHaveValue('10001');expect(periods).toHaveAttribute('aria-invalid','true');expect(onSave).not.toHaveBeenCalled()
})
it.each(['-12abc','Infinity','-1','1e3'])('preserves raw budget %s on blur and mode roundtrip',async raw=>{
 const u=userEvent.setup();render(<Settings plan={healthyPlan}/>);const input=screen.getByRole('textbox',{name:'总预算（美元）',exact:true});await u.clear(input);await u.type(input,raw);await u.tab();expect(input).toHaveValue(raw)
 await u.click(screen.getByRole('radio',{name:/无限定投/}));await u.click(screen.getByRole('radio',{name:/固定预算/}));expect(screen.getByRole('textbox',{name:'总预算（美元）',exact:true})).toHaveValue(raw)
})
it.each([undefined,{ok:false,error:'quota'}])('undefined/failed result keeps draft, focuses error, and never navigates (%s)',async result=>{
 const u=userEvent.setup(),navigate=vi.fn(),save=vi.fn(async()=>result);render(<Settings plan={healthyPlan} onSavePlan={save} onNavigate={navigate}/>)
 await u.click(saveButton());await waitFor(()=>expect(screen.getByLabelText('保存失败')).toHaveFocus());expect(screen.getByRole('textbox',{name:'名称',exact:true})).toHaveValue(healthyPlan.name);expect(navigate).not.toHaveBeenCalled();expect(saveButton()).toBeEnabled()
})
it('pending locks snapshot and retry reuses id; throwing and rollback failures retain draft',async()=>{
 const u=userEvent.setup(),navigate=vi.fn();let finish;const save=vi.fn(()=>new Promise(resolve=>{finish=resolve}));render(<Settings plan={healthyPlan} onSavePlan={save} onNavigate={navigate}/>)
 await u.click(saveButton());expect(screen.getByRole('button',{name:'保存中'})).toBeDisabled();expect(screen.getByRole('textbox',{name:'名称',exact:true})).toBeDisabled();expect(screen.getByRole('button',{name:'填写新计划'})).toBeDisabled()
 await act(async()=>finish({ok:false,error:'部分数据可能已写入',rollbackFailed:true}));expect(screen.getByLabelText('保存失败')).toHaveTextContent('部分');expect(navigate).not.toHaveBeenCalled();await u.click(saveButton());expect(save.mock.calls[0][0].id).toBe(save.mock.calls[1][0].id);await act(async()=>finish({ok:true}));expect(navigate).toHaveBeenCalledTimes(1)
})
it('late callback after plan switch does not navigate or reset the new draft',async()=>{
 let finish;const u=userEvent.setup(),navigate=vi.fn(),save=vi.fn(()=>new Promise(resolve=>{finish=resolve}));const view=render(<Settings plan={healthyPlan} onSavePlan={save} onNavigate={navigate}/>)
 await u.click(saveButton());view.rerender(<Settings plan={{...healthyPlan,id:'other',name:'Other'}} onSavePlan={save} onNavigate={navigate}/>);await act(async()=>finish({ok:true}));expect(screen.getByRole('textbox',{name:'名称',exact:true})).toHaveValue('Other');expect(navigate).not.toHaveBeenCalled()
})
it('late callback after unmount cannot navigate',async()=>{
 let finish;const u=userEvent.setup(),navigate=vi.fn();const view=render(<Settings plan={healthyPlan} onSavePlan={()=>new Promise(resolve=>{finish=resolve})} onNavigate={navigate}/>);await u.click(saveButton());view.unmount();await act(async()=>finish({ok:true}));expect(navigate).not.toHaveBeenCalled()
})
it.each([{records:[healthyRecord]},{records:[]}])('linked ticker and deletion are blocked with nearby reason',async ({records})=>{
 const plan=records.length?healthyPlan:{...healthyPlan,splitEvents:[futureSplit]};render(<Settings plan={plan} records={records}/>);expect(screen.getByRole('textbox',{name:'资产代码 1'})).toBeDisabled();expect(screen.getByRole('button',{name:'删除 SPY'})).toBeDisabled();expect(screen.getByText(/此资产已有关联历史记录或拆合股事件/)).toBeVisible()
})
it('unlinked ticker is editable and duplicate loaded rows remain separate in repair state',async()=>{
 const u=userEvent.setup();const view=render(<Settings plan={healthyPlan}/>);const ticker=screen.getByRole('textbox',{name:'资产代码 1'});await u.clear(ticker);await u.type(ticker,'QQQ');expect(ticker).toHaveValue('QQQ');view.rerender(<Settings plan={{...healthyPlan,assets:[...healthyPlan.assets,...healthyPlan.assets]}}/>);expect(screen.getAllByRole('textbox',{name:/资产代码/})).toHaveLength(2);await u.click(saveButton());expect(screen.getByLabelText('保存错误摘要')).toHaveTextContent('修复')
})
it('invalid new asset is retained with local errors instead of coercing shares',async()=>{
 const u=userEvent.setup();render(<Settings plan={null}/>);await u.click(screen.getByRole('button',{name:'添加标的'}));await u.type(screen.getByRole('textbox',{name:'标的',exact:true}),'SPY');await u.type(screen.getByRole('textbox',{name:'计划开始前持仓股数',exact:true}),'-2abc');await u.click(screen.getByRole('button',{name:'添加到计划'}));expect(screen.getByRole('textbox',{name:'计划开始前持仓股数',exact:true})).toHaveValue('-2abc');expect(screen.getByLabelText('新资产错误')).toHaveTextContent('有限')
})
it('own successful publication does not cancel success navigation',async()=>{
 const u=userEvent.setup(),navigate=vi.fn();let view
 const save=vi.fn(async candidate=>{view.rerender(<Settings plan={candidate} onSavePlan={save} onNavigate={navigate}/>);return {ok:true}})
 view=render(<Settings plan={healthyPlan} onSavePlan={save} onNavigate={navigate}/>);await u.click(saveButton());expect(navigate).toHaveBeenCalledTimes(1)
})
it('throwing storage callback preserves the full draft',async()=>{
 const u=userEvent.setup(),navigate=vi.fn();render(<Settings plan={healthyPlan} onSavePlan={()=>{throw Error('denied')}} onNavigate={navigate}/>);await u.click(saveButton());expect(screen.getByLabelText('保存失败')).toHaveFocus();expect(screen.getByLabelText('保存失败')).toHaveTextContent('denied');expect(navigate).not.toHaveBeenCalled()
})
it('creating a new plan from an existing plan navigates only after its own successful publication',async()=>{
 const u=userEvent.setup(),navigate=vi.fn();let view
 const save=vi.fn(async candidate=>{view.rerender(<Settings plan={candidate} onSavePlan={save} onNavigate={navigate}/>);return {ok:true}})
 view=render(<Settings plan={healthyPlan} onSavePlan={save} onNavigate={navigate}/>);
 await u.click(screen.getByRole('button',{name:'填写新计划'}));await u.type(screen.getByRole('textbox',{name:'名称',exact:true}),'Second plan');await u.click(screen.getByRole('button',{name:'添加标的',exact:true}));await u.type(screen.getByRole('textbox',{name:'标的',exact:true}),'QQQ');await u.click(screen.getByRole('button',{name:'添加到计划',exact:true}));await u.click(saveButton());
 expect(save).toHaveBeenCalledTimes(1);expect(save.mock.calls[0][0].id).not.toBe(healthyPlan.id);expect(navigate).toHaveBeenCalledTimes(1)
})
it('summary action focuses the actual asset error region',async()=>{
 const u=userEvent.setup();render(<Settings plan={null}/>);await u.type(screen.getByRole('textbox',{name:'名称',exact:true}),'Draft');await u.click(saveButton());expect(document.activeElement).toHaveAttribute('data-field','assets');await u.click(screen.getByLabelText('保存错误摘要').querySelector('button'));expect(document.activeElement).toHaveAttribute('data-field','assets')
})
it('valid legacy VA return above slider range stays visible and editable; invalid return focuses numeric field',async()=>{
 const u=userEvent.setup();render(<Settings plan={{...healthyPlan,strategy:'VA',targetAnnualReturn:.8}}/>);const input=screen.getByRole('textbox',{name:'目标年化收益率（小数）',exact:true});expect(input).toHaveValue('0.8');await u.clear(input);await u.type(input,'Infinity');await u.click(saveButton());expect(input).toHaveFocus();expect(input).toHaveValue('Infinity');expect(input).toHaveAccessibleDescription(/年化/)
})
it('corrupt reserve is shown without clamping and its error is near the parameter',async()=>{
 const u=userEvent.setup();render(<Settings plan={{...healthyPlan,reserveRatio:.8}}/>);const input=screen.getByRole('textbox',{name:'保留现金比例（小数）',exact:true});expect(input).toHaveValue('0.8');await u.click(saveButton());expect(input).toHaveFocus();expect(input).toHaveAccessibleDescription(/30%/)
})
it('English validation summary and local errors use translated user-facing copy',async()=>{
 const {I18nProvider}=await import('../i18n/index.jsx');localStorage.setItem('dca-tracker-language','en-US');const u=userEvent.setup();render(<I18nProvider><Settings plan={null}/></I18nProvider>);await u.click(screen.getByRole('button',{name:'Save current plan',exact:true}));expect(screen.getByLabelText('Save errors')).toHaveTextContent('Please enter a name');expect(screen.getByRole('textbox',{name:'Name',exact:true})).toHaveFocus();localStorage.removeItem('dca-tracker-language')
})
it('malformed loaded asset rows remain in repair state without crashing or saving',async()=>{
 const u=userEvent.setup(),save=vi.fn();render(<Settings plan={{...healthyPlan,assets:[null,...healthyPlan.assets]}} onSavePlan={save}/>);await u.click(saveButton());expect(screen.getByLabelText('保存错误摘要')).toHaveTextContent('修复');expect(save).not.toHaveBeenCalled()
})
