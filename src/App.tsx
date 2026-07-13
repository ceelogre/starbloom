import { useState } from 'react'
import styles from './App.module.css'
import { Button } from './components/Button/Button'
import { Header } from './components/Header/Header'

function App() {
  const [count, setCount] = useState(0)

  return (
    <div className={styles.layout}>
      <Header />
      <main className={styles.main}>
        <section className={styles.hero}>
          <h1 className={styles.title}>Starbloom</h1>
          <p className={styles.subtitle}>
            A TypeScript frontend template with CSS Modules. Edit{' '}
            <code>src/App.tsx</code> to get started.
          </p>
          <div className={styles.actions}>
            <Button onClick={() => setCount((value) => value + 1)}>
              Count is {count}
            </Button>
            <Button variant="secondary">Learn more</Button>
          </div>
          <div className={styles.card}>
            <p className={styles.cardLabel}>Hot reload</p>
            <p className={styles.cardValue}>Ready</p>
          </div>
        </section>
      </main>
    </div>
  )
}

export default App
