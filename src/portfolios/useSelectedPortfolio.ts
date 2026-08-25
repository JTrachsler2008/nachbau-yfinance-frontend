import { useContext } from 'react'
import { SelectedPortfolioContext, type SelectedPortfolioValue } from './SelectedPortfolioContext'

export function useSelectedPortfolio(): SelectedPortfolioValue {
  const value = useContext(SelectedPortfolioContext)
  if (value === null) {
    throw new Error('useSelectedPortfolio wurde ausserhalb von SelectedPortfolioProvider verwendet')
  }
  return value
}
