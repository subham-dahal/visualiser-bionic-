type StatusScreenProps = {
  readonly message: string
  readonly isError?: boolean
}

// Full-page message shown while loading, on error, or when there is nothing to draw
function StatusScreen({ message, isError = false }: StatusScreenProps) {
  return (
    <div className="app">
      <header className="app-header">
        <h1>Bionic Visualiser</h1>
      </header>
      <p className={`app-status${isError ? ' app-status--error' : ''}`}>{message}</p>
    </div>
  )
}

export default StatusScreen
