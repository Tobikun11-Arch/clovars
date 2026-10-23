import { Component } from 'react'
import { Button, EmptyState } from './ui'

interface ErrorBoundaryProps {
  children: React.ReactNode
}

interface ErrorBoundaryState {
  error: Error | null
}

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  state: ErrorBoundaryState = { error: null }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { error }
  }

  componentDidCatch(error: Error): void {
    console.error('Clovars renderer crashed', error)
  }

  render(): React.ReactNode {
    if (this.state.error) {
      return (
        <div className="crash">
          <EmptyState
            title="Clovars hit an unexpected error"
            description={this.state.error.message}
            action={
              <Button variant="primary" onClick={() => window.location.reload()}>
                Reload app
              </Button>
            }
          />
        </div>
      )
    }

    return this.props.children
  }
}
