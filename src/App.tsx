import { useCallback, useState } from 'react'
import styles from './App.module.css'
import { Header } from './components/Header/Header'
import { OrderFlow, type OrderStep } from './components/OrderFlow/OrderFlow'

function App() {
  const [cartCount, setCartCount] = useState(0)
  const [requestedStep, setRequestedStep] = useState<OrderStep | null>(null)

  const handleRequestedStepHandled = useCallback(() => {
    setRequestedStep(null)
  }, [])

  return (
    <div className={styles.layout}>
      <Header
        cartCount={cartCount}
        onCartClick={() => setRequestedStep('cart')}
        onHomeClick={() => setRequestedStep('home')}
      />
      <main className={styles.main}>
        <OrderFlow
          onCartChange={setCartCount}
          requestedStep={requestedStep}
          onRequestedStepHandled={handleRequestedStepHandled}
        />
      </main>
    </div>
  )
}

export default App
