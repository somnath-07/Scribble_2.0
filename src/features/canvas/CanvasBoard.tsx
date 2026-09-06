import { useCallback, useEffect, useRef } from 'react';
import { LOGICAL_CANVAS_HEIGHT, LOGICAL_CANVAS_WIDTH } from '../../../shared/constants';
import type { CanvasCommand, FillCommand, Point, StrokeCommand } from '../../../shared/game-types';

interface Props {
  commands: CanvasCommand[];
  active: boolean;
  tool: 'brush' | 'eraser' | 'fill';
  color: string;
  size: number;
  onStroke: (stroke: StrokeCommand) => void;
  onFill: (fill: FillCommand) => void;
}

function hexToRgba(hex: string): [number, number, number, number] {
  const value = hex.replace('#', '');
  return [Number.parseInt(value.slice(0, 2), 16), Number.parseInt(value.slice(2, 4), 16), Number.parseInt(value.slice(4, 6), 16), 255];
}

export function floodFill(context: CanvasRenderingContext2D, startX: number, startY: number, hex: string): void {
  const width = context.canvas.width;
  const height = context.canvas.height;
  const x = Math.max(0, Math.min(width - 1, Math.round(startX)));
  const y = Math.max(0, Math.min(height - 1, Math.round(startY)));
  const image = context.getImageData(0, 0, width, height);
  const data = image.data;
  const offset = (y * width + x) * 4;
  const target: [number, number, number, number] = [data[offset], data[offset + 1], data[offset + 2], data[offset + 3]];
  const fill = hexToRgba(hex);
  if (target.every((value, index) => value === fill[index])) return;

  const stack = new Int32Array(width * height);
  let stackSize = 0;
  stack[stackSize++] = y * width + x;
  const matches = (pixel: number) => {
    const byte = pixel * 4;
    return data[byte] === target[0] && data[byte + 1] === target[1] && data[byte + 2] === target[2] && data[byte + 3] === target[3];
  };
  const paint = (pixel: number) => {
    const byte = pixel * 4;
    data[byte] = fill[0]; data[byte + 1] = fill[1]; data[byte + 2] = fill[2]; data[byte + 3] = fill[3];
  };
  while (stackSize > 0) {
    const seed = stack[--stackSize];
    if (!matches(seed)) continue;
    const row = Math.floor(seed / width);
    let left = seed % width;
    while (left > 0 && matches(row * width + left - 1)) left -= 1;
    let reachUp = false;
    let reachDown = false;
    for (let column = left; column < width; column += 1) {
      const pixel = row * width + column;
      if (!matches(pixel)) break;
      paint(pixel);
      if (row > 0) {
        const above = pixel - width;
        if (matches(above)) { if (!reachUp) stack[stackSize++] = above; reachUp = true; } else reachUp = false;
      }
      if (row < height - 1) {
        const below = pixel + width;
        if (matches(below)) { if (!reachDown) stack[stackSize++] = below; reachDown = true; } else reachDown = false;
      }
    }
  }
  context.putImageData(image, 0, 0);
}

function drawStroke(context: CanvasRenderingContext2D, stroke: StrokeCommand): void {
  if (!stroke.points.length) return;
  context.save();
  context.strokeStyle = stroke.tool === 'eraser' ? '#ffffff' : stroke.color;
  context.fillStyle = context.strokeStyle;
  context.lineWidth = stroke.size;
  context.lineCap = 'round';
  context.lineJoin = 'round';
  if (stroke.points.length === 1) {
    context.beginPath();
    context.arc(stroke.points[0].x, stroke.points[0].y, stroke.size / 2, 0, Math.PI * 2);
    context.fill();
  } else {
    context.beginPath();
    context.moveTo(stroke.points[0].x, stroke.points[0].y);
    for (const point of stroke.points.slice(1)) context.lineTo(point.x, point.y);
    context.stroke();
  }
  context.restore();
}

function replay(context: CanvasRenderingContext2D, commands: CanvasCommand[]): void {
  context.save();
  context.fillStyle = '#ffffff';
  context.fillRect(0, 0, LOGICAL_CANVAS_WIDTH, LOGICAL_CANVAS_HEIGHT);
  context.restore();
  for (const command of commands) {
    if (command.kind === 'stroke') drawStroke(context, command);
    else floodFill(context, command.x, command.y, command.color);
  }
}

export function CanvasBoard({ commands, active, tool, color, size, onStroke, onFill }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const drawingRef = useRef(false);
  const strokeIdRef = useRef('');
  const pendingRef = useRef<Point[]>([]);
  const lastSentRef = useRef<Point | null>(null);
  const lastFlushRef = useRef(0);
  const pointerIdRef = useRef<number | null>(null);

  useEffect(() => {
    const context = canvasRef.current?.getContext('2d', { willReadFrequently: true });
    if (context) replay(context, commands);
  }, [commands]);

  const pointFromEvent = (event: React.PointerEvent<HTMLCanvasElement>): Point => {
    const rect = event.currentTarget.getBoundingClientRect();
    return {
      x: Math.max(0, Math.min(LOGICAL_CANVAS_WIDTH, (event.clientX - rect.left) * LOGICAL_CANVAS_WIDTH / rect.width)),
      y: Math.max(0, Math.min(LOGICAL_CANVAS_HEIGHT, (event.clientY - rect.top) * LOGICAL_CANVAS_HEIGHT / rect.height)),
    };
  };

  const flush = useCallback(() => {
    if (!pendingRef.current.length || !strokeIdRef.current) return;
    const points = lastSentRef.current ? [lastSentRef.current, ...pendingRef.current] : [...pendingRef.current];
    const chunks: Point[][] = [];
    for (let index = 0; index < points.length; index += 119) chunks.push(points.slice(index, index + 120));
    for (const chunk of chunks) {
      onStroke({ kind: 'stroke', strokeId: strokeIdRef.current, tool: tool === 'eraser' ? 'eraser' : 'brush', color, size, points: chunk });
      lastSentRef.current = chunk.at(-1) ?? lastSentRef.current;
    }
    pendingRef.current = [];
    lastFlushRef.current = performance.now();
  }, [color, onStroke, size, tool]);

  const pointerDown = (event: React.PointerEvent<HTMLCanvasElement>) => {
    if (!active) return;
    event.preventDefault();
    const point = pointFromEvent(event);
    if (tool === 'fill') {
      const context = event.currentTarget.getContext('2d', { willReadFrequently: true });
      if (context) floodFill(context, point.x, point.y, color);
      onFill({ kind: 'fill', x: point.x, y: point.y, color });
      return;
    }
    event.currentTarget.setPointerCapture(event.pointerId);
    pointerIdRef.current = event.pointerId;
    drawingRef.current = true;
    strokeIdRef.current = crypto.randomUUID();
    lastSentRef.current = null;
    pendingRef.current = [point];
    const context = event.currentTarget.getContext('2d');
    if (context) drawStroke(context, { kind: 'stroke', strokeId: strokeIdRef.current, tool: tool === 'eraser' ? 'eraser' : 'brush', color, size, points: [point] });
  };

  const pointerMove = (event: React.PointerEvent<HTMLCanvasElement>) => {
    if (!active || !drawingRef.current || pointerIdRef.current !== event.pointerId) return;
    event.preventDefault();
    const point = pointFromEvent(event);
    const previous = pendingRef.current.at(-1) ?? lastSentRef.current;
    if (previous && Math.hypot(point.x - previous.x, point.y - previous.y) < 0.8) return;
    pendingRef.current.push(point);
    const context = event.currentTarget.getContext('2d');
    if (context && previous) drawStroke(context, { kind: 'stroke', strokeId: strokeIdRef.current, tool: tool === 'eraser' ? 'eraser' : 'brush', color, size, points: [previous, point] });
    if (performance.now() - lastFlushRef.current >= 24) flush();
  };

  const pointerUp = (event: React.PointerEvent<HTMLCanvasElement>) => {
    if (!drawingRef.current || pointerIdRef.current !== event.pointerId) return;
    event.preventDefault();
    flush();
    drawingRef.current = false;
    pointerIdRef.current = null;
    strokeIdRef.current = '';
    lastSentRef.current = null;
    try { event.currentTarget.releasePointerCapture(event.pointerId); } catch { /* pointer capture already released */ }
  };

  return (
    <div className={`canvas-frame ${active ? 'active' : 'readonly'}`}>
      <canvas ref={canvasRef} width={LOGICAL_CANVAS_WIDTH} height={LOGICAL_CANVAS_HEIGHT} data-testid="drawing-canvas" aria-label={active ? 'Drawing canvas. Use mouse, touch, or stylus to draw.' : 'Read-only drawing canvas'} onPointerDown={pointerDown} onPointerMove={pointerMove} onPointerUp={pointerUp} onPointerCancel={pointerUp} />
      {!active && <span className="canvas-readonly" aria-hidden="true">Watching</span>}
    </div>
  );
}
