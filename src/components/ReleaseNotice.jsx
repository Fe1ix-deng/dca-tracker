import { useEffect, useRef, useState } from 'react'
import { Bell, Check, X } from 'lucide-react'
import { CURRENT_RELEASE, shouldShowReleaseNotice } from '../utils/releaseNotice'
import { loadLastReadReleaseVersion, saveLastReadReleaseVersion } from '../utils/storage'

const CONTRACT_DURATION_MS = 180
const RELEASE_READ_EVENT = 'dca-tracker:release-read'

export default function ReleaseNotice() {
  const bellRef = useRef(null)
  const panelRef = useRef(null)
  const [isOpen, setIsOpen] = useState(() => shouldShowReleaseNotice(loadLastReadReleaseVersion()))
  const [isAcknowledging, setIsAcknowledging] = useState(false)

  useEffect(() => {
    if (!isOpen) return undefined

    const onKeyDown = (event) => {
      if (event.key === 'Escape') {
        setIsOpen(false)
        bellRef.current?.focus()
      }
    }

    const onPointerDown = (event) => {
      if (!panelRef.current?.contains(event.target) && !bellRef.current?.contains(event.target)) {
        setIsOpen(false)
      }
    }

    window.addEventListener('keydown', onKeyDown)
    window.addEventListener('pointerdown', onPointerDown)

    return () => {
      window.removeEventListener('keydown', onKeyDown)
      window.removeEventListener('pointerdown', onPointerDown)
    }
  }, [isOpen])

  useEffect(() => {
    const onReleaseRead = () => {
      setIsOpen(false)
      setIsAcknowledging(false)
    }

    window.addEventListener(RELEASE_READ_EVENT, onReleaseRead)
    return () => window.removeEventListener(RELEASE_READ_EVENT, onReleaseRead)
  }, [])

  const closePanel = () => {
    setIsOpen(false)
    bellRef.current?.focus()
  }

  const acknowledge = () => {
    saveLastReadReleaseVersion(CURRENT_RELEASE.version)
    setIsAcknowledging(true)

    window.setTimeout(() => {
      window.dispatchEvent(new Event(RELEASE_READ_EVENT))
      setIsOpen(false)
      setIsAcknowledging(false)
      bellRef.current?.focus()
    }, CONTRACT_DURATION_MS)
  }

  return (
    <div className="release-notice">
      <button
        ref={bellRef}
        type="button"
        aria-label="查看版本更新"
        aria-expanded={isOpen}
        onClick={() => setIsOpen((open) => !open)}
        className="release-notice-bell"
      >
        <Bell size={18} aria-hidden="true" />
      </button>

      {isOpen ? (
        <section
          ref={panelRef}
          aria-label="最近更新"
          className={`release-notice-panel ${isAcknowledging ? 'release-notice-panel-contracting' : ''}`}
        >
          <div className="release-notice-heading">
            <div>
              <p className="mini-kicker">Latest update</p>
              <h3>版本 {CURRENT_RELEASE.version}</h3>
            </div>
            <button
              type="button"
              aria-label="关闭更新说明"
              onClick={closePanel}
              className="release-notice-close"
            >
              <X size={16} aria-hidden="true" />
            </button>
          </div>

          <p className="release-notice-date">{CURRENT_RELEASE.date}</p>

          <ul>
            {CURRENT_RELEASE.items.map((item) => <li key={item}>{item}</li>)}
          </ul>

          <button
            type="button"
            autoFocus
            onClick={acknowledge}
            className="release-notice-acknowledge"
          >
            <Check size={16} aria-hidden="true" />
            已读
          </button>
        </section>
      ) : null}
    </div>
  )
}
