import { it, expect } from 'vitest'
import { parseExecutionDate, parseCalendarDate, getLocalDate } from './executionDate'
it.each(['2024-02-29','2024-02-29T23:59:59Z','2024-02-29T01:02:03.123-08:00','2024-02-29T01:02:03+14:00'])('preserves business date %s',value=>expect(parseExecutionDate(value)).toBe('2024-02-29'))
it('trims supported execution date text without changing its business day',()=>{
 expect(parseExecutionDate(' 2024-02-29 ')).toBe('2024-02-29')
 expect(parseExecutionDate(' 2024-02-29T23:59:59.000-08:00 ')).toBe('2024-02-29')
})
it.each(['2023-02-29','2024-02-30','2024-13-01','0000-01-01','2024-02-29T00:00:00','2024-02-29T24:00:00Z','2024-02-29T00:00:00.1Z','2024-02-29T00:00:00+14:01','2024-02-29junk',0])('rejects invalid date %s',value=>expect(parseExecutionDate(value)).toBeNull())
it('separates pure dates and local instants',()=>{expect(parseCalendarDate('2024-02-29T00:00:00Z')).toBeNull();expect(getLocalDate(new Date(2026,9,26))).toBe('2026-10-26')})
