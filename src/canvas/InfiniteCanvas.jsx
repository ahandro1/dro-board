import { useRef, useCallback, useEffect, forwardRef, useImperativeHandle } from 'react'

// InfiniteCanvas: handles pan (drag) and zoom (scroll wheel toward cursor)
const InfiniteCanvas = forwardRef(function InfiniteCanvas(
  { children, pan, zoom, onPanChange, onZoomChange, onBackgroundClick },
  ref
) {
  const containerRef = useRef(null)
  const dragging = useRef(false)
  const lastMouse = useRef({ x: 0, y: 0 })
  const moved = useRef(false)

  useImperativeHandle(ref, () => ({
    centerView() {
      onPanChange({ x: window.innerWidth / 2, y: window.innerHeight / 2 })
      onZoomChange(1, window.innerWidth / 2, window.innerHeight / 2, 1)
    }
  }))

  // Prevent default wheel so browser doesn't scroll the page
  useEffect(() => {
    const el = containerRef.current
    if (!el) return
    const onWheel = (e) => {
      e.preventDefault()
      const rect = el.getBoundingClientRect()
      const mx = e.clientX - rect.left
      const my = e.clientY - rect.top
      const factor = e.deltaY < 0 ? 1.08 : 0.92
      onZoomChange(factor, mx, my)
    }
    el.addEventListener('wheel', onWheel, { passive: false })
    return () => el.removeEventListener('wheel', onWheel)
  }, [onZoomChange])

  const onMouseDown = useCallback((e) => {
    if (e.button !== 0) return
    dragging.current = true
    moved.current = false
    lastMouse.current = { x: e.clientX, y: e.clientY }
    e.currentTarget.style.cursor = 'grabbing'
  }, [])

  const onMouseMove = useCallback((e) => {
    if (!dragging.current) return
    const dx = e.clientX - lastMouse.current.x
    const dy = e.clientY - lastMouse.current.y
    if (Math.abs(dx) > 2 || Math.abs(dy) > 2) moved.current = true
    lastMouse.current = { x: e.clientX, y: e.clientY }
    onPanChange(prev => ({ x: prev.x + dx, y: prev.y + dy }))
  }, [onPanChange])

  const onMouseUp = useCallback((e) => {
    dragging.current = false
    e.currentTarget.style.cursor = 'grab'
    if (!moved.current && onBackgroundClick) onBackgroundClick()
  }, [onBackgroundClick])

  // Touch support
  const lastTouch = useRef(null)
  const onTouchStart = useCallback((e) => {
    if (e.touches.length === 1) {
      lastTouch.current = { x: e.touches[0].clientX, y: e.touches[0].clientY }
    }
  }, [])
  const onTouchMove = useCallback((e) => {
    if (e.touches.length === 1 && lastTouch.current) {
      const dx = e.touches[0].clientX - lastTouch.current.x
      const dy = e.touches[0].clientY - lastTouch.current.y
      lastTouch.current = { x: e.touches[0].clientX, y: e.touches[0].clientY }
      onPanChange(prev => ({ x: prev.x + dx, y: prev.y + dy }))
    }
  }, [onPanChange])

  return (
    <div
      ref={containerRef}
      style={{
        width: '100vw',
        height: '100vh',
        overflow: 'hidden',
        cursor: 'grab',
        position: 'relative',
        userSelect: 'none',
      }}
      onMouseDown={onMouseDown}
      onMouseMove={onMouseMove}
      onMouseUp={onMouseUp}
      onMouseLeave={onMouseUp}
      onTouchStart={onTouchStart}
      onTouchMove={onTouchMove}
    >
      {/* SVG layer for connection lines — sits behind cards, transforms with canvas */}
      <svg
        style={{
          position: 'absolute',
          top: 0, left: 0,
          width: '100%', height: '100%',
          pointerEvents: 'none',
          overflow: 'visible',
        }}
      >
        <g transform={`translate(${pan.x},${pan.y}) scale(${zoom})`} id="lines-layer" />
      </svg>

      {/* Card layer */}
      <div
        style={{
          position: 'absolute',
          top: 0, left: 0,
          width: 0, height: 0,
          transform: `translate(${pan.x}px,${pan.y}px) scale(${zoom})`,
          transformOrigin: '0 0',
          willChange: 'transform',
        }}
      >
        {children}
      </div>
    </div>
  )
})

export default InfiniteCanvas
