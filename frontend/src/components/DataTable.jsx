import { useMemo, useRef, useState } from 'react';
import TableRow from './TableRow';

const DEFAULT_COLUMN_WIDTH = 160;
const MIN_COLUMN_WIDTH = 90;
const MAX_COLUMN_WIDTH = 520;

function defaultWidthFor(column) {
  if (!column) return DEFAULT_COLUMN_WIDTH;
  if (column.type === 'date') return 300;
  if (column.type === 'textarea') return 230;
  if (column.type === 'reminder') return 190;
  if (column.type === 'number') return 150;
  return DEFAULT_COLUMN_WIDTH;
}

function loadColumnWidths() {
  try {
    return JSON.parse(localStorage.getItem('recordColumnWidths')) || {};
  } catch {
    return {};
  }
}

export default function DataTable({
  columns, rows, lang, t,
  onCellChange, onDelete,
  onAddCustomField, onCustomFieldChange, onDeleteCustomField, dueWarningSettings,
}) {
  const [columnWidths, setColumnWidths] = useState(loadColumnWidths);
  const resizeRef = useRef(null);
  const tableWidth = useMemo(
    () => columns.reduce((sum, column) => sum + (columnWidths[column.id] || defaultWidthFor(column)), 140),
    [columns, columnWidths]
  );

  function startResize(event, columnId) {
    event.preventDefault();
    event.stopPropagation();
    event.currentTarget.setPointerCapture(event.pointerId);
    resizeRef.current = {
      columnId,
      pointerId: event.pointerId,
      startX: event.clientX,
      startWidth: columnWidths[columnId] || defaultWidthFor(columns.find((column) => column.id === columnId)),
    };
  }

  function resizeColumn(event) {
    const resize = resizeRef.current;
    if (!resize || resize.pointerId !== event.pointerId) return;
    const nextWidth = Math.min(
      MAX_COLUMN_WIDTH,
      Math.max(MIN_COLUMN_WIDTH, resize.startWidth + event.clientX - resize.startX)
    );
    setColumnWidths((current) => ({ ...current, [resize.columnId]: nextWidth }));
  }

  function finishResize(event) {
    const resize = resizeRef.current;
    if (!resize || resize.pointerId !== event.pointerId) return;
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
    resizeRef.current = null;
    setColumnWidths((current) => {
      localStorage.setItem('recordColumnWidths', JSON.stringify(current));
      return current;
    });
  }

  return (
    <>
      {/* Desktop table */}
      <div className="table-card desktop-only">
        <div className="table-scroll">
          <table className="record-table" style={{ width: `${tableWidth}px`, minWidth: `${tableWidth}px` }}>
            <colgroup>
              {columns.map((column) => (
                <col key={column.id} style={{ width: `${columnWidths[column.id] || defaultWidthFor(column)}px` }} />
              ))}
              <col style={{ width: '140px' }} />
            </colgroup>
            <thead>
              <tr>
                {columns.map((col) => (
                  <th key={col.id}>
                    <span>{col.name[lang] || col.name.en || col.name.zh}</span>
                    <button
                      type="button"
                      className="column-resize-handle"
                      aria-label={`${t.resizeColumn} ${col.name[lang] || col.name.en || col.name.zh}`}
                      onPointerDown={(event) => startResize(event, col.id)}
                      onPointerMove={resizeColumn}
                      onPointerUp={finishResize}
                      onPointerCancel={finishResize}
                    />
                  </th>
                ))}
                <th className="col-actions">{t.colActions}</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <TableRow
                  key={row.id}
                  row={row}
                  columns={columns}
                  lang={lang}
                  t={t}
                  onCellChange={onCellChange}
                  onDelete={onDelete}
                  onAddCustomField={onAddCustomField}
                  onCustomFieldChange={onCustomFieldChange}
                  onDeleteCustomField={onDeleteCustomField}
                  mode="table"
                  dueWarningSettings={dueWarningSettings}
                />
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Mobile cards */}
      <div className="cards-wrapper mobile-only">
        {rows.map((row) => (
          <TableRow
            key={row.id}
            row={row}
            columns={columns}
            lang={lang}
            t={t}
            onCellChange={onCellChange}
            onDelete={onDelete}
            onAddCustomField={onAddCustomField}
            onCustomFieldChange={onCustomFieldChange}
            onDeleteCustomField={onDeleteCustomField}
            mode="card"
            dueWarningSettings={dueWarningSettings}
          />
        ))}
      </div>
    </>
  );
}
