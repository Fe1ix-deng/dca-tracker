// @vitest-environment jsdom
import {render,screen,within,waitFor} from '@testing-library/react'
import {it,expect,vi,afterEach} from 'vitest'
import Dashboard from './Dashboard'
import {healthyPlan,healthyRecord} from '../test/fixtures'
afterEach(()=>vi.restoreAllMocks())
it('wires mixed provenance beside the total and withholds value/profit for missing positive holdings',async()=>{
 vi.spyOn(globalThis,'fetch').mockResolvedValue({ok:true,json:async()=>({quotes:{SPY:{price:130}}})});const plan={...healthyPlan,assets:[{...healthyPlan.assets[0],initialSharesOriginal:0,currentShares:2.5},{ticker:'QQQ',weight:0,initialSharesOriginal:1,currentShares:1,initialAverageCost:20}]};const record={...healthyRecord,assets:[...healthyRecord.assets,{ticker:'QQQ',price:30,actualShares:0,actualAmount:0,priceSource:'manual'}]};const view=render(<Dashboard plan={plan} records={[record]}/>);await waitFor(()=>expect(screen.getByText('使用混合来源或不同时间的价格。')).toBeVisible());expect(screen.getByText(/手动记录价格/)).toBeVisible();const noPrice={...record,assets:[healthyRecord.assets[0]]};view.rerender(<Dashboard plan={plan} records={[noPrice]}/>);expect(screen.getByText(/估值不完整：/)).toBeVisible();const region=screen.getByRole('region',{name:'组合估值'});expect(within(region).getAllByText('--')).toHaveLength(2)
})
