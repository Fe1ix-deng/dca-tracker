import { useI18n } from '../i18n/index.jsx'
export const errorMessages = { required: '必填，请输入名称。', positive: '请输入有限且大于 0 的预算。', nonNegative: '请输入有限且不小于 0 的数字，必填项不可空白。', periods: '期数须为 1–10000 的整数，且不能少于已有记录数。', option: '请选择有效选项。', reserve: '保留现金比例须在 0–30% 之间。', annual: '目标年化须大于 -100% 且不超过 1000%。', structure: '计划结构无效，请从有效备份恢复。', assetCount: '请至少添加一个资产，最多 100 个。', ticker: '代码须为 1–20 位字母、数字、点或连字符。', duplicateTicker: '代码重复，请修改未关联的资产行。', weight: '单个权重须为 0–100% 的有限数字。', weightSum: '总权重须等于 100%，当前为 {sum}%。', weightUnknown: '存在无效权重，总权重无法校验。', needsRepair: '数据需要修复，请从有效备份恢复。', protectedTicker: '此资产已有关联历史记录或拆合股事件，本阶段不能更改代码或删除，以免历史失去对应资产。', planCount: '最多保存 50 份计划，请先整理现有计划。' }
export function errorText(error, t) { return t(errorMessages[error.code] || error.code, error.params) }
export default function PlanValidationSummary({ errors, onFocus }) {
 const { t } = useI18n()
 if (!errors.length) return null
 return <div aria-label={t('保存错误摘要')} className="subtle-panel p-4 text-warning"><p>{t('请修正以下 {count} 项错误：', {count:errors.length})}</p><ul className="mt-2 space-y-2">{errors.map((error,i)=><li key={i}><button type="button" className="text-left underline underline-offset-4" onClick={()=>onFocus(error.field)}>{error.field}: {errorText(error,t)}</button></li>)}</ul></div>
}
