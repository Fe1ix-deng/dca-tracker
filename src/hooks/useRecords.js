import { useMemo, useState } from 'react'
import { loadRecords, normalizeRecords, saveRecords } from '../utils/storage'

export function useRecords() {
  const [records, setRecords] = useState(() => loadRecords())

  const addRecord = (record) => {
    setRecords((current) => {
      const nextRecords = normalizeRecords([record, ...current])
      saveRecords(nextRecords)
      return nextRecords
    })
  }

  const replaceRecords = (nextRecords) => {
    const safeRecords = normalizeRecords(nextRecords)
    saveRecords(safeRecords)
    setRecords(safeRecords)
  }

  return useMemo(
    () => ({
      records,
      addRecord,
      replaceRecords,
    }),
    [records],
  )
}
