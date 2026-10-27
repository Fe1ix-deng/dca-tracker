import {useI18n} from '../i18n/index.jsx'
const sources={auto:'自动获取参考价','record-auto':'自动记录价格','record-manual':'手动记录价格','record-unknown':'记录价格（来源未知）',manual:'本次手动输入',missing:'暂无可用价格'}
export default function PriceProvenance({snapshot,holding,compact=false}){
 const {t,language}=useI18n()
 if(!snapshot)return null
 const time=value=>{const date=new Date(value);return Number.isFinite(date.getTime())?new Intl.DateTimeFormat(language,{dateStyle:'medium',timeStyle:'short'}).format(date)+' · '+Intl.DateTimeFormat().resolvedOptions().timeZone:t('时间未知')}
 if(compact)return <div className="mt-2 text-xs font-normal text-muted-foreground">
  <p>{t(sources[snapshot.source]||sources.missing)}{snapshot.recordDate ? ' · '+snapshot.recordDate : snapshot.source==='auto' ? ' · '+t('可能延迟') : ''}</p>
  {(!snapshot.reliable&&snapshot.reason==='日期或拆合股口径不明确')||holding?.reliable===false?<p className="text-warning">{t('不可可靠估值：日期或拆合股口径不明确。')}</p>:null}
 </div>
 return <div className="mt-2 space-y-1 text-xs font-normal text-muted-foreground">
  <p>{t(sources[snapshot.source]||sources.missing)}</p>
  {snapshot.recordDate?<p>{t('采用记录执行日：{date}',{date:snapshot.recordDate})}</p>:null}
  {snapshot.lastSuccessfulFetchAt?<p>{t('最后成功获取时间：{time}',{time:time(snapshot.lastSuccessfulFetchAt)})}</p>:null}
  {snapshot.manualEnteredAt?<p>{t('本次输入时间：{time}',{time:time(snapshot.manualEnteredAt)})}</p>:null}
  {snapshot.source==='auto'?<p>{t('行情时间未提供，可能延迟。')}</p>:null}
  {snapshot.adjustment?<p>{t('历史参考价已按截至 {date} 生效的拆/合股换算（累计因子 {factor}）。',{date:snapshot.adjustment.asOfDate,factor:snapshot.adjustment.factor})}</p>:null}
  {(!snapshot.reliable&&snapshot.reason==='日期或拆合股口径不明确')||holding?.reliable===false?<p className="text-warning">{t('不可可靠估值：日期或拆合股口径不明确。')}</p>:null}
  {snapshot.requestStatus==='loading'?<p>{t(snapshot.reliable&&snapshot.price>0?'刷新中，暂用上次获取或记录价格。':'正在获取价格；暂无可用价格。')}</p>:null}
  {snapshot.requestStatus==='failed'?<p className="text-warning">{t('本标的获取失败，未更新价格及成功时间。')}</p>:null}
 </div>
}
