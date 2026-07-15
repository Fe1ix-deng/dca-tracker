import { Component } from 'react'
import { rescueRawBackup } from '../utils/backup'

export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props)
    this.state = {
      error: null,
      rescueState: 'idle',
    }
  }

  static getDerivedStateFromError(error) {
    return {
      error,
    }
  }

  componentDidCatch(error, errorInfo) {
    console.error('App render failed', error, errorInfo)
  }

  handleReload = () => {
    window.location.reload()
  }

  handleRescueExport = () => {
    try {
      const payload = rescueRawBackup()
      this.setState({ rescueState: payload ? 'done' : 'empty' })
    } catch (error) {
      console.error('Rescue export failed', error)
      this.setState({ rescueState: 'failed' })
    }
  }

  render() {
    if (!this.state.error) {
      return this.props.children
    }

    const { rescueState } = this.state

    return (
      <div className="flex min-h-dvh items-center justify-center bg-radial px-4 text-white">
        <section className="card w-full max-w-lg p-6 text-center">
          <p className="label">页面遇到错误</p>
          <h1 className="mt-3 text-xl font-semibold text-white">界面没有正常加载</h1>
          <p className="mt-3 text-sm leading-6 text-muted-foreground">
            这通常是一次临时的浏览器运行错误。刷新前建议先导出一份本地数据，以防这次错误和数据有关，刷新后无法恢复。
          </p>
          <button type="button" onClick={this.handleRescueExport} className="control-button mt-5 w-full">
            导出本地数据
          </button>
          {rescueState === 'done' && (
            <p className="mt-2 text-xs text-positive">已尝试导出，请检查下载目录。</p>
          )}
          {rescueState === 'empty' && (
            <p className="mt-2 text-xs text-muted-foreground">本机没有找到可导出的数据。</p>
          )}
          {rescueState === 'failed' && (
            <p className="mt-2 text-xs text-warning">导出失败，请联系开发者并说明当时的操作。</p>
          )}
          <button type="button" onClick={this.handleReload} className="control-button-primary mt-2 w-full">
            刷新页面
          </button>
        </section>
      </div>
    )
  }
}
