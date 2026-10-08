import type { BoardData } from './board-queries';
export type BoardColumns = BoardData['columns'];
export function optimisticMove(
  columns: BoardColumns,
  options: { taskId: string; columnId: string; index: number },
): BoardColumns {
  const task = columns
    .flatMap((column) => column.tasks)
    .find((task) => task.id === options.taskId);
  const target = columns.find((column) => column.id === options.columnId);
  if (!task || !target) return columns;
  return columns.map((column) => {
    const tasks = column.tasks.filter((item) => item.id !== task.id);
    if (column.id === target.id)
      tasks.splice(Math.max(0, Math.min(options.index, tasks.length)), 0, {
        ...task,
        columnId: target.id,
        column: {
          ...task.column,
          id: target.id,
          name: target.name,
          isDone: target.isDone,
        },
      });
    return { ...column, tasks };
  });
}
export function taskNeighbors(
  columns: BoardColumns,
  options: { taskId: string; columnId: string; index: number },
) {
  const tasks =
    columns
      .find((column) => column.id === options.columnId)
      ?.tasks.filter((task) => task.id !== options.taskId) ?? [];
  const index = Math.max(0, Math.min(options.index, tasks.length));
  return { afterId: tasks[index - 1]?.id, beforeId: tasks[index]?.id };
}
export { dueState } from './task-indicators';
