import { useCallback, useMemo, useRef, useState } from 'react'
import { loadRecords, saveRecords } from '../utils/storage'
import { BACKUP_LIMITS } from '../utils/planConstraints'

export function useRecords() {
  const [records, setRecords] = useState(() => loadRecords())
  const [storageError, setStorageError] = useState('')

  const recordsRef = useRef(records)
  recordsRef.current = records
  const publishRecords = useCallback(nextRecords => {
    recordsRef.current = nextRecords
    setRecords(nextRecords)
    setStorageError('')
  }, [])
  const replaceRecords = useCallback(nextRecords => {
    if (!Array.isArray(nextRecords) || nextRecords.length > BACKUP_LIMITS.maxRecords) {
      const result = { ok: false, error: '记录超过 5000 条，请先导出并整理记录。' }
      setStorageError(result.error)
      return result
    }
    const result = saveRecords(nextRecords)
    setStorageError(result.ok ? '' : result.error)
    if (result.ok) publishRecords(nextRecords)
    return result
  }, [publishRecords])
  const addRecord = useCallback(record => replaceRecords([record, ...recordsRef.current]), [replaceRecords])

  return useMemo(
    () => ({
      records,
      publishRecords,
      addRecord,
      replaceRecords,
      storageError,
    }),
    [records, storageError, publishRecords, addRecord, replaceRecords],
  )
}
