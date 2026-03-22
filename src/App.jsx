import { BrowserRouter as Router, Routes, Route } from 'react-router-dom'
import HomePage from './pages/HomePage'
import ScannerPage from './pages/ScannerPage'
import CardDetailPage from './pages/CardDetailPage'
import NavigationBar from './components/NavigationBar'
import Header from './components/Header'
import MarketPage from './pages/MarketPage'

export default function App() {
  return (
    <Router>
      <div className="min-h-screen bg-background text-on-background font-body pb-24 pt-36">
        <Header />
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/scan" element={<ScannerPage />} />
          <Route path="/card/:id" element={<CardDetailPage />} />
          <Route path="/market" element={<MarketPage />} />
        </Routes>
        <NavigationBar />
      </div>
    </Router>
  )
}
