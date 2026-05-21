import { useEffect, useState } from 'react'
import { Routes, Route } from 'react-router-dom'

function App() {
  return (
    <Routes>
      <Route path="/" element={<HomePage />} />
    </Routes>
  )
}

function HomePage() {
  const [status, setStatus] = useState<string | null>(null)

  useEffect(() => {
    fetch('http://localhost:3000/health')
      .then((res) => res.json())
      .then((data) => setStatus(data.status))
      .catch(() => setStatus('error'))
  }, [])

  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold mb-4">Helpdesk</h1>
      <p>
        Server status:{' '}
        <span className={status === 'ok' ? 'text-green-600' : 'text-red-600'}>
          {status ?? 'checking...'}
        </span>
      </p>
    </div>
  )
}

export default App
