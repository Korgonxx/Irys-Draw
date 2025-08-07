'use client'

import { useEffect, useRef, useState, useCallback } from 'react'
import type { DrawingData } from '@/lib/socket-server'

interface DrawingCanvasProps {
  width?: number
  height?: number
  isDrawer?: boolean
  onDrawingUpdate?: (data: DrawingData) => void
  className?: string
}

interface DrawingTool {
  type: 'pen' | 'eraser'
  color: string
  size: number
}

export function DrawingCanvas({ 
  width = 800, 
  height = 600, 
  isDrawer = false,
  onDrawingUpdate,
  className = '' 
}: DrawingCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [isDrawing, setIsDrawing] = useState(false)
  const [tool, setTool] = useState<DrawingTool>({
    type: 'pen',
    color: '#000000',
    size: 3
  })
  
  const colors = [
    '#000000', '#FF0000', '#00FF00', '#0000FF', '#FFFF00', 
    '#FF00FF', '#00FFFF', '#FFA500', '#800080', '#FFC0CB'
  ]
  
  const sizes = [1, 3, 5, 8, 12, 16]

  const getCanvas = useCallback(() => {
    return canvasRef.current
  }, [])

  const getContext = useCallback(() => {
    const canvas = getCanvas()
    return canvas?.getContext('2d')
  }, [getCanvas])

  const getMousePos = useCallback((e: MouseEvent | React.MouseEvent) => {
    const canvas = getCanvas()
    if (!canvas) return { x: 0, y: 0 }
    
    const rect = canvas.getBoundingClientRect()
    return {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top
    }
  }, [getCanvas])

  const startDrawing = useCallback((e: React.MouseEvent) => {
    if (!isDrawer) return
    
    setIsDrawing(true)
    const pos = getMousePos(e)
    const ctx = getContext()
    
    if (ctx) {
      ctx.beginPath()
      ctx.moveTo(pos.x, pos.y)
      
      const drawingData: DrawingData = {
        type: 'start',
        x: pos.x,
        y: pos.y,
        color: tool.color,
        size: tool.size,
        timestamp: Date.now()
      }
      
      onDrawingUpdate?.(drawingData)
    }
  }, [isDrawer, getMousePos, getContext, tool, onDrawingUpdate])

  const draw = useCallback((e: React.MouseEvent) => {
    if (!isDrawing || !isDrawer) return
    
    const pos = getMousePos(e)
    const ctx = getContext()
    
    if (ctx) {
      ctx.globalCompositeOperation = tool.type === 'eraser' ? 'destination-out' : 'source-over'
      ctx.strokeStyle = tool.color
      ctx.lineWidth = tool.size
      ctx.lineCap = 'round'
      ctx.lineJoin = 'round'
      
      ctx.lineTo(pos.x, pos.y)
      ctx.stroke()
      
      const drawingData: DrawingData = {
        type: 'draw',
        x: pos.x,
        y: pos.y,
        color: tool.color,
        size: tool.size,
        timestamp: Date.now()
      }
      
      onDrawingUpdate?.(drawingData)
    }
  }, [isDrawing, isDrawer, getMousePos, getContext, tool, onDrawingUpdate])

  const stopDrawing = useCallback(() => {
    if (!isDrawer) return
    
    setIsDrawing(false)
    const ctx = getContext()
    
    if (ctx) {
      const drawingData: DrawingData = {
        type: 'end',
        x: 0,
        y: 0,
        color: tool.color,
        size: tool.size,
        timestamp: Date.now()
      }
      
      onDrawingUpdate?.(drawingData)
    }
  }, [isDrawer, getContext, tool, onDrawingUpdate])

  const clearCanvas = useCallback(() => {
    const ctx = getContext()
    if (ctx) {
      ctx.clearRect(0, 0, width, height)
    }
  }, [getContext, width, height])

  const handleRemoteDrawing = useCallback((data: DrawingData) => {
    const ctx = getContext()
    if (!ctx) return

    ctx.globalCompositeOperation = data.color === 'eraser' ? 'destination-out' : 'source-over'
    ctx.strokeStyle = data.color
    ctx.lineWidth = data.size
    ctx.lineCap = 'round'
    ctx.lineJoin = 'round'

    if (data.type === 'start') {
      ctx.beginPath()
      ctx.moveTo(data.x, data.y)
    } else if (data.type === 'draw') {
      ctx.lineTo(data.x, data.y)
      ctx.stroke()
    }
  }, [getContext])

  const exportCanvas = useCallback(() => {
    const canvas = getCanvas()
    return canvas?.toDataURL('image/png')
  }, [getCanvas])

  useEffect(() => {
    const canvas = getCanvas()
    if (!canvas) return

    const handleMouseMove = (e: MouseEvent) => {
      if (isDrawing && isDrawer) {
        const pos = getMousePos(e)
        const ctx = getContext()
        
        if (ctx) {
          ctx.globalCompositeOperation = tool.type === 'eraser' ? 'destination-out' : 'source-over'
          ctx.strokeStyle = tool.color
          ctx.lineWidth = tool.size
          ctx.lineCap = 'round'
          ctx.lineJoin = 'round'
          
          ctx.lineTo(pos.x, pos.y)
          ctx.stroke()
          
          const drawingData: DrawingData = {
            type: 'draw',
            x: pos.x,
            y: pos.y,
            color: tool.color,
            size: tool.size,
            timestamp: Date.now()
          }
          
          onDrawingUpdate?.(drawingData)
        }
      }
    }

    const handleMouseUp = () => {
      stopDrawing()
    }

    canvas.addEventListener('mousemove', handleMouseMove)
    canvas.addEventListener('mouseup', handleMouseUp)
    canvas.addEventListener('mouseleave', handleMouseUp)

    return () => {
      canvas.removeEventListener('mousemove', handleMouseMove)
      canvas.removeEventListener('mouseup', handleMouseUp)
      canvas.removeEventListener('mouseleave', handleMouseUp)
    }
  }, [isDrawing, isDrawer, getMousePos, getContext, tool, onDrawingUpdate, stopDrawing])

  // Expose methods for parent components
  useEffect(() => {
    if (canvasRef.current) {
      (canvasRef.current as any).handleRemoteDrawing = handleRemoteDrawing
      (canvasRef.current as any).clearCanvas = clearCanvas
      (canvasRef.current as any).exportCanvas = exportCanvas
    }
  }, [handleRemoteDrawing, clearCanvas, exportCanvas])

  return (
    <div className={`flex flex-col ${className}`}>
      {/* Drawing Tools */}
      {isDrawer && (
        <div className="flex flex-wrap gap-4 p-4 bg-gray-50 rounded-t-xl border border-b-0 border-gray-200">
          {/* Tool Type */}
          <div className="flex gap-2">
            <button
              onClick={() => setTool(prev => ({ ...prev, type: 'pen' }))}
              className={`px-3 py-2 rounded-lg transition-colors ${
                tool.type === 'pen' 
                  ? 'bg-irys-500 text-white' 
                  : 'bg-white text-gray-700 border border-gray-300'
              }`}
            >
              ✏️ Pen
            </button>
            <button
              onClick={() => setTool(prev => ({ ...prev, type: 'eraser' }))}
              className={`px-3 py-2 rounded-lg transition-colors ${
                tool.type === 'eraser' 
                  ? 'bg-irys-500 text-white' 
                  : 'bg-white text-gray-700 border border-gray-300'
              }`}
            >
              🗑️ Eraser
            </button>
          </div>

          {/* Colors */}
          <div className="flex gap-2">
            {colors.map(color => (
              <button
                key={color}
                onClick={() => setTool(prev => ({ ...prev, color }))}
                className={`w-8 h-8 rounded-lg border-2 transition-transform hover:scale-110 ${
                  tool.color === color ? 'border-gray-800 scale-110' : 'border-gray-300'
                }`}
                style={{ backgroundColor: color }}
              />
            ))}
          </div>

          {/* Brush Sizes */}
          <div className="flex gap-2 items-center">
            <span className="text-sm text-gray-600">Size:</span>
            {sizes.map(size => (
              <button
                key={size}
                onClick={() => setTool(prev => ({ ...prev, size }))}
                className={`w-8 h-8 rounded-lg border-2 flex items-center justify-center transition-colors ${
                  tool.size === size 
                    ? 'border-irys-500 bg-irys-50' 
                    : 'border-gray-300 bg-white'
                }`}
              >
                <div 
                  className="rounded-full bg-gray-800"
                  style={{ 
                    width: Math.max(2, size), 
                    height: Math.max(2, size) 
                  }}
                />
              </button>
            ))}
          </div>

          {/* Clear Button */}
          <button
            onClick={clearCanvas}
            className="px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors"
          >
            Clear
          </button>
        </div>
      )}

      {/* Canvas */}
      <div className="relative">
        <canvas
          ref={canvasRef}
          width={width}
          height={height}
          onMouseDown={startDrawing}
          onMouseMove={draw}
          onMouseUp={stopDrawing}
          className={`border border-gray-300 ${
            isDrawer 
              ? 'cursor-crosshair' 
              : 'cursor-not-allowed'
          } ${isDrawer ? 'rounded-b-xl' : 'rounded-xl'} bg-white`}
          style={{ 
            touchAction: 'none',
            maxWidth: '100%',
            height: 'auto'
          }}
        />
        
        {!isDrawer && (
          <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-10 rounded-xl">
            <div className="bg-white px-4 py-2 rounded-lg shadow-lg">
              <span className="text-gray-600">👀 Watching</span>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}