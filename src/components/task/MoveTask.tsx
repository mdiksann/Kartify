'use client';
import { useState } from 'react';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
export function MoveTask({
  taskId,
  currentColumn,
  columns,
  onMove,
  disabled,
}: {
  taskId: string;
  currentColumn: string;
  columns: { id: string; name: string; tasks: { id: string }[] }[];
  onMove: (taskId: string, columnId: string, index: number) => void;
  disabled: boolean;
}) {
  const [target, setTarget] = useState(currentColumn);
  const [position, setPosition] = useState('0');
  const tasks =
    columns
      .find((column) => column.id === target)
      ?.tasks.filter((task) => task.id !== taskId) ?? [];
  return (
    <div className="mt-6 space-y-3">
      <h3 className="text-sm font-semibold">Move task</h3>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <Label htmlFor="move-column">Column</Label>
          <select
            id="move-column"
            className="mt-2 h-9 w-full rounded-lg border border-gray-300 bg-white px-3 text-sm max-md:min-h-11"
            value={target}
            disabled={disabled}
            onChange={(event) => {
              setTarget(event.target.value);
              setPosition('0');
            }}
          >
            {columns.map((column) => (
              <option key={column.id} value={column.id}>
                {column.name}
              </option>
            ))}
          </select>
        </div>
        <div>
          <Label htmlFor="move-position">Position</Label>
          <select
            id="move-position"
            className="mt-2 h-9 w-full rounded-lg border border-gray-300 bg-white px-3 text-sm max-md:min-h-11"
            value={position}
            disabled={disabled}
            onChange={(event) => setPosition(event.target.value)}
          >
            {Array.from({ length: tasks.length + 1 }, (_, index) => (
              <option key={index} value={index}>
                {index + 1}
              </option>
            ))}
          </select>
        </div>
      </div>
      <Button
        variant="secondary"
        disabled={disabled}
        onClick={() =>
          onMove(taskId, target, Math.min(Number(position), tasks.length))
        }
      >
        Move to column
      </Button>
    </div>
  );
}
