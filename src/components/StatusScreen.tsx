type StatusScreenProps = {
  readonly message: string
  readonly isError?: boolean
}

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
