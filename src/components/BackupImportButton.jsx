import { useRef } from 'react'
import { FileUp } from 'lucide-react'
import { parseBackupPayload } from '../utils/backup'

export default function BackupImportButton({ onImportBackup, className = 'control-button' }) {
  const fileInputRef = useRef(null)

  const handleImportClick = () => {
    fileInputRef.current?.click()
  }

  const handleImportFile = async (event) => {
    const file = event.target.files?.[0]
    event.target.value = ''

    if (!file) {
      return
    }

    try {
      const content = await file.text()
      const payload = parseBackupPayload(JSON.parse(content))

      if (!payload) {
        window.alert('文件格式不正确，请使用本工具导出的 JSON 备份文件。')
        return
      }

      const confirmed = window.confirm(
        '导入会用备份文件替换当前计划和历史记录；如果当前已有数据，系统会先自动导出一份安全备份，确认继续？',
      )
      if (!confirmed) {
        return
      }

      onImportBackup?.(payload)
    } catch {
      window.alert('文件格式不正确，请使用本工具导出的 JSON 备份文件。')
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={handleImportClick}
        className={className}
      >
        <FileUp size={16} />
        导入备份
      </button>
      <input
        ref={fileInputRef}
        type="file"
        accept=".json"
        onChange={handleImportFile}
        aria-label="选择要导入的 JSON 备份文件"
        className="hidden"
      />
    </>
  )
}
