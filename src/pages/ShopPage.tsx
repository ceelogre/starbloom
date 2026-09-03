import { useCallback, useEffect, useState } from 'react'
import { useLocation, useNavigate } from 'react-router'
import styles from '../App.module.css'
import { Footer } from '../components/Footer/Footer'
import { OrderFlow, type OrderStep, type StepRequest } from '../components/OrderFlow/OrderFlow'
import { pageTitle } from '../data/brand'

type ShopStart = 'home' | 'category' | 'cart' | 'meat' | 'sausage' | 'how-it-works'

function parseStart(state: unknown): { request: StepRequest | null; scroll: string | null } {
  const start = (state as { start?: ShopStart } | null)?.start
  if (start === 'home') {
    return { request: { step: 'home' }, scroll: null }
  }
  if (start === 'how-it-works') {
    return { request: { step: 'home' }, scroll: 'how-it-works' }
  }
  if (start === 'category' || start === 'cart') {
    return { request: { step: start }, scroll: null }
  }
  if (start === 'meat' || start === 'sausage') {
    return { request: { step: 'product', category: start }, scroll: null }
  }
  return { request: null, scroll: null }
}

export function ShopPage() {
  const location = useLocation()
  const navigate = useNavigate()
  const initial = parseStart(location.state)
  const [step, setStep] = useState<OrderStep>('home')
  const [requestedStep, setRequestedStep] = useState<StepRequest | null>(initial.request)
  const [scrollTarget, setScrollTarget] = useState<string | null>(initial.scroll)

  const handleRequestedStepHandled = useCallback(() => {
    setRequestedStep(null)
  }, [])

  useEffect(() => {
    document.title = pageTitle()
  }, [])

  useEffect(() => {
    const next = parseStart(location.state)
    if (!next.request && !next.scroll) {
      return
    }

    setRequestedStep(next.request)
    if (next.scroll) {
      setScrollTarget(next.scroll)
    }
    if (next.request?.step === 'home' && !next.scroll) {
      setScrollTarget(null)
      window.scrollTo({ top: 0, behavior: 'smooth' })
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
      <main className={step === 'home' ? styles.mainHome : styles.main}>
        <OrderFlow
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
