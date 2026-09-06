import { Brush, Eraser, PaintBucket, RotateCcw, Trash2 } from 'lucide-react';
import { BRUSH_SIZES, COLORS } from '../../../shared/constants';

interface Props {
  tool: 'brush' | 'eraser' | 'fill';
  color: string;
  size: number;
  disabled: boolean;
  onTool: (tool: Props['tool']) => void;
  onColor: (color: string) => void;
  onSize: (size: number) => void;
  onUndo: () => void;
  onClear: () => void;
}

export function DrawingTools({ tool, color, size, disabled, onTool, onColor, onSize, onUndo, onClear }: Props) {
  return (
    <div className="drawing-tools" aria-label="Drawing tools">
      <div className="tool-group">
        <button className={tool === 'brush' ? 'active' : ''} disabled={disabled} onClick={() => onTool('brush')} aria-label="Brush (B)" title="Brush (B)"><Brush /></button>
        <button className={tool === 'eraser' ? 'active' : ''} disabled={disabled} onClick={() => onTool('eraser')} aria-label="Eraser (E)" title="Eraser (E)"><Eraser /></button>
        <button className={tool === 'fill' ? 'active' : ''} disabled={disabled} onClick={() => onTool('fill')} aria-label="Fill bucket (F)" title="Fill bucket (F)"><PaintBucket /></button>
      </div>
      <div className="brush-sizes" aria-label="Brush size">
        {BRUSH_SIZES.map((brushSize, index) => <button key={brushSize} className={size === brushSize ? 'active' : ''} disabled={disabled} onClick={() => onSize(brushSize)} aria-label={`Brush size ${index + 1}`} title={`Size ${brushSize}`}><span style={{ width: Math.max(4, brushSize / 2), height: Math.max(4, brushSize / 2) }} /></button>)}
      </div>
      <div className="color-palette" aria-label="Color palette">
        {COLORS.map((paletteColor) => <button key={paletteColor} className={color === paletteColor ? 'selected' : ''} disabled={disabled} onClick={() => { onColor(paletteColor); if (tool === 'eraser') onTool('brush'); }} aria-label={`Color ${paletteColor}`} style={{ background: paletteColor }} />)}
      </div>
      <div className="tool-group actions">
        <button disabled={disabled} onClick={onUndo} aria-label="Undo (U)" title="Undo (U)"><RotateCcw /></button>
        <button disabled={disabled} onClick={onClear} aria-label="Clear canvas" title="Clear canvas"><Trash2 /></button>
      </div>
    </div>
  );
}
