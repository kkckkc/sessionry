/**
 * Search Bar Component Tests
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { SearchBar } from './SearchBar'

describe('SearchBar', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('renders with placeholder text', () => {
    const onChange = vi.fn()
    const onSearch = vi.fn()

    render(
      <SearchBar
        value=""
        onChange={onChange}
        onSearch={onSearch}
      />
    )

    expect(screen.getByPlaceholderText('Search plugins...')).toBeInTheDocument()
  })

  it('renders with custom placeholder', () => {
    const onChange = vi.fn()
    const onSearch = vi.fn()

    render(
      <SearchBar
        value=""
        onChange={onChange}
        onSearch={onSearch}
        placeholder="Custom placeholder"
      />
    )

    expect(screen.getByPlaceholderText('Custom placeholder')).toBeInTheDocument()
  })

  it('displays the current value', () => {
    const onChange = vi.fn()
    const onSearch = vi.fn()

    render(
      <SearchBar
        value="test query"
        onChange={onChange}
        onSearch={onSearch}
      />
    )

    expect(screen.getByDisplayValue('test query')).toBeInTheDocument()
  })

  it('calls onChange when input changes', () => {
    const onChange = vi.fn()
    const onSearch = vi.fn()

    render(
      <SearchBar
        value=""
        onChange={onChange}
        onSearch={onSearch}
      />
    )

    const input = screen.getByPlaceholderText('Search plugins...')
    fireEvent.change(input, { target: { value: 'new query' } })

    expect(onChange).toHaveBeenCalledWith('new query')
  })

  it('debounces search calls', () => {
    const onChange = vi.fn()
    const onSearch = vi.fn()

    render(
      <SearchBar
        value=""
        onChange={onChange}
        onSearch={onSearch}
        debounceMs={500}
      />
    )

    const input = screen.getByPlaceholderText('Search plugins...')
    
    // Type multiple characters quickly
    fireEvent.change(input, { target: { value: 't' } })
    fireEvent.change(input, { target: { value: 'te' } })
    fireEvent.change(input, { target: { value: 'tes' } })
    fireEvent.change(input, { target: { value: 'test' } })

    // onSearch should not be called yet
    expect(onSearch).not.toHaveBeenCalled()

    // Fast-forward time
    vi.runAllTimers()

    // Now onSearch should be called once with the final value
    expect(onSearch).toHaveBeenCalledTimes(1)
    expect(onSearch).toHaveBeenCalledWith('test')
  })

  it('triggers immediate search on Enter key', () => {
    const onChange = vi.fn()
    const onSearch = vi.fn()

    render(
      <SearchBar
        value="test query"
        onChange={onChange}
        onSearch={onSearch}
      />
    )

    const input = screen.getByPlaceholderText('Search plugins...')
    fireEvent.keyPress(input, { key: 'Enter', code: 'Enter', charCode: 13 })

    expect(onSearch).toHaveBeenCalledWith('test query')
  })

  it('shows clear button when value is not empty', () => {
    const onChange = vi.fn()
    const onSearch = vi.fn()

    render(
      <SearchBar
        value="test"
        onChange={onChange}
        onSearch={onSearch}
      />
    )

    expect(screen.getByLabelText('Clear search')).toBeInTheDocument()
  })

  it('hides clear button when value is empty', () => {
    const onChange = vi.fn()
    const onSearch = vi.fn()

    render(
      <SearchBar
        value=""
        onChange={onChange}
        onSearch={onSearch}
      />
    )

    expect(screen.queryByLabelText('Clear search')).not.toBeInTheDocument()
  })

  it('clears input when clear button is clicked', () => {
    const onChange = vi.fn()
    const onSearch = vi.fn()

    render(
      <SearchBar
        value="test"
        onChange={onChange}
        onSearch={onSearch}
      />
    )

    const clearButton = screen.getByLabelText('Clear search')
    fireEvent.click(clearButton)

    expect(onChange).toHaveBeenCalledWith('')
    expect(onSearch).toHaveBeenCalledWith('')
  })

  it('disables input when disabled prop is true', () => {
    const onChange = vi.fn()
    const onSearch = vi.fn()

    render(
      <SearchBar
        value=""
        onChange={onChange}
        onSearch={onSearch}
        disabled={true}
      />
    )

    expect(screen.getByPlaceholderText('Search plugins...')).toBeDisabled()
  })

  it('disables clear button when disabled prop is true', () => {
    const onChange = vi.fn()
    const onSearch = vi.fn()

    render(
      <SearchBar
        value="test"
        onChange={onChange}
        onSearch={onSearch}
        disabled={true}
      />
    )

    expect(screen.getByLabelText('Clear search')).toBeDisabled()
  })

  it('auto-focuses input when autoFocus is true', () => {
    const onChange = vi.fn()
    const onSearch = vi.fn()

    render(
      <SearchBar
        value=""
        onChange={onChange}
        onSearch={onSearch}
        autoFocus={true}
      />
    )

    const input = screen.getByPlaceholderText('Search plugins...')
    expect(input).toHaveFocus()
  })

  it('displays search hints', () => {
    const onChange = vi.fn()
    const onSearch = vi.fn()

    render(
      <SearchBar
        value=""
        onChange={onChange}
        onSearch={onSearch}
      />
    )

    expect(screen.getByText(/Try searching for "sessionry-plugin"/)).toBeInTheDocument()
  })

  it('cancels pending debounce on clear', () => {
    const onChange = vi.fn()
    const onSearch = vi.fn()

    const { rerender } = render(
      <SearchBar
        value=""
        onChange={onChange}
        onSearch={onSearch}
        debounceMs={500}
      />
    )

    const input = screen.getByPlaceholderText('Search plugins...')
    
    // Type something
    fireEvent.change(input, { target: { value: 'test' } })
    
    // Rerender with value
    rerender(
      <SearchBar
        value="test"
        onChange={onChange}
        onSearch={onSearch}
        debounceMs={500}
      />
    )

    // Clear before debounce completes
    const clearButton = screen.getByLabelText('Clear search')
    fireEvent.click(clearButton)

    // Fast-forward time
    vi.advanceTimersByTime(500)

    // onSearch should be called once for clear, not for the debounced search
    expect(onSearch).toHaveBeenCalledTimes(1)
    expect(onSearch).toHaveBeenCalledWith('')
  })

  it('has proper ARIA labels', () => {
    const onChange = vi.fn()
    const onSearch = vi.fn()

    render(
      <SearchBar
        value="test"
        onChange={onChange}
        onSearch={onSearch}
      />
    )

    expect(screen.getByLabelText('Search plugins')).toBeInTheDocument()
    expect(screen.getByLabelText('Clear search')).toBeInTheDocument()
  })
})
