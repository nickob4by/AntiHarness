import React from 'react';
import { GripVertical } from 'lucide-react';

export default function ResizeHandle({ onMouseDown, onDoubleClick, isDragging, direction = 'horizontal' }) {
  return (
    <div
      onMouseDown={onMouseDown}
      onDoubleClick={onDoubleClick}
      className={`relative flex items-center justify-center select-none cursor-col-resize group z-20 transition-colors ${
        isDragging ? 'bg-indigo-500 w-1' : 'w-1 bg-border/60 hover:bg-indigo-500/80 hover:w-1.5'
      }`}
      title="Drag to resize pane (Double-click to reset)"
    >
      {/* Invisible wider grab area for easy hovering */}
      <div className="absolute inset-y-0 -left-1.5 -right-1.5 cursor-col-resize" />
      
      {/* Subtle indicator dots on hover/drag */}
      <div className={`opacity-0 group-hover:opacity-100 transition-opacity ${isDragging ? 'opacity-100' : ''}`}>
        <div className="h-6 w-1 rounded-full bg-white/70" />
      </div>
    </div>
  );
}
