import { useCallback, useEffect, useState } from 'react'
import { useLocation, useNavigate } from 'react-router'
import styles from '../App.module.css'
import { Footer } from '../components/Footer/Footer'
import { Header } from '../components/Header/Header'
import { OrderFlow, type OrderStep, type StepRequest } from '../components/OrderFlow/OrderFlow'
import { pageTitle } from '../data/brand'

type ShopStart = 'category' | 'cart' | 'meat' | 'sausage'

function startRequest(state: unknown): StepRequest | null {
  const start = (state as { start?: ShopStart } | null)?.start
  if (start === 'category' || start === 'cart') {
    return { step: start }
  }
  if (start === 'meat' || start === 'sausage') {
    return { step: 'product', category: start }
  }
  return null
}

export function ShopPage() {
  const location = useLocation()
  const navigate = useNavigate()
  const [cartCount, setCartCount] = useState(0)
  const [step, setStep] = useState<OrderStep>('home')
  const [requestedStep, setRequestedStep] = useState<StepRequest | null>(() =>
    startRequest(location.state),
  )
  const [scrollTarget, setScrollTarget] = useState<string | null>(null)

  const handleRequestedStepHandled = useCallback(() => {
    setRequestedStep(null)
  }, [])

  useEffect(() => {
    document.title = pageTitle()
  }, [])

  useEffect(() => {
    if (!startRequest(location.state)) {
      return
    }

    navigate('.', { replace: true, state: {} })
  }, [location.state, navigate])

  useEffect(() => {
    if (!scrollTarget || step !== 'home') {
      return
    }

    document.getElementById(scrollTarget)?.scrollIntoView({ behavior: 'smooth' })
    setScrollTarget(null)
  }, [scrollTarget, step])

  function goHome() {
    setScrollTarget(null)
    window.scrollTo({ top: 0, behavior: 'smooth' })
    setRequestedStep({ step: 'home' })
  }

  return (
    <div className={styles.layout}>
      <Header
        cartCount={cartCount}
        onCartClick={() => setRequestedStep({ step: 'cart' })}
        onHomeClick={goHome}
        onHowItWorksClick={() => {
          setScrollTarget('how-it-works')
          setRequestedStep({ step: 'home' })
        }}
      />
      <main className={step === 'home' ? styles.mainHome : styles.main}>
        <OrderFlow
          onCartChange={setCartCount}
          onStepChange={setStep}
          requestedStep={requestedStep}
          onRequestedStepHandled={handleRequestedStepHandled}
        />
      </main>
      <Footer
        onStartOrder={() => setRequestedStep({ step: 'category' })}
        onStartMeat={() => setRequestedStep({ step: 'product', category: 'meat' })}
        onStartSausage={() => setRequestedStep({ step: 'product', category: 'sausage' })}
        onHomeClick={goHome}
        onHowItWorksClick={() => {
          setScrollTarget('how-it-works')
          setRequestedStep({ step: 'home' })
        }}
      />
    </div>
  )
}
