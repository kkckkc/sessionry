/**
 * Search Bar Component
 * 
 * Search input with debouncing for plugin search.
 */

import React, { useState, useEffect, useCallback, useRef } from 'react'
import { Input } from '@sessionry/components'
import './SearchBar.css'

/**
 * Search Bar Props
 */
export interface SearchBarProps {
  value: string
  onChange: (value: string) => void
  onSearch: (query: string) => void
  placeholder?: string
  debounceMs?: number
  disabled?: boolean
  autoFocus?: boolean
}

/**
 * Search Bar Component
 */
export function SearchBar({
  value,
  onChange,
  onSearch,
  placeholder = 'Search plugins...',
  debounceMs = 500,
  disabled = false,
  autoFocus = false
}: SearchBarProps) {
  const [localValue, setLocalValue] = useState(value)
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null)

  /**
   * Sync local value with prop value
   */
  useEffect(() => {
    setLocalValue(value)
  }, [value])

  /**
   * Debounced search
   */
  const debouncedSearch = useCallback((query: string) => {
    // Clear existing timer
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current)
    }

    // Set new timer
    debounceTimerRef.current = setTimeout(() => {
      onSearch(query)
    }, debounceMs)
  }, [onSearch, debounceMs])

  /**
   * Handle input change
   */
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value
    setLocalValue(newValue)
    onChange(newValue)
    debouncedSearch(newValue)
  }

  /**
   * Handle clear button
   */
  const handleClear = () => {
    setLocalValue('')
    onChange('')
    onSearch('')
    
    // Clear debounce timer
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current)
    }
  }

  /**
   * Handle key press
   */
  const handleKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      // Immediate search on Enter
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current)
      }
      onSearch(localValue)
    }
  }

  /**
   * Cleanup on unmount
   */
  useEffect(() => {
    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current)
      }
    }
  }, [])

  return (
    <div className="search-bar">
      <div className="search-bar__input-wrapper">
        <svg
          className="search-bar__icon"
          width="16"
          height="16"
          viewBox="0 0 16 16"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          aria-hidden="true"
        >
          <path
            d="M7 12C9.76142 12 12 9.76142 12 7C12 4.23858 9.76142 2 7 2C4.23858 2 2 4.23858 2 7C2 9.76142 4.23858 12 7 12Z"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <path
            d="M10.5 10.5L14 14"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
        
        <Input
          type="text"
          value={localValue}
          onChange={handleChange}
          onKeyPress={handleKeyPress}
          placeholder={placeholder}
          disabled={disabled}
          autoFocus={autoFocus}
          className="search-bar__input"
          aria-label="Search plugins"
        />
        
        {localValue && (
          <button
            type="button"
            onClick={handleClear}
            disabled={disabled}
            className="search-bar__clear"
            aria-label="Clear search"
          >
            <svg
              width="16"
              height="16"
              viewBox="0 0 16 16"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                d="M12 4L4 12M4 4L12 12"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </button>
        )}
      </div>
      
      {/* Search hints */}
      <div className="search-bar__hints">
        <span className="search-bar__hint">
          Try searching for "sessionry-plugin" or specific functionality
        </span>
      </div>
    </div>
  )
}
