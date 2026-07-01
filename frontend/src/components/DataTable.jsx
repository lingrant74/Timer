import TableRow from './TableRow';

export default function DataTable({
  columns, rows, lang, t,
  onCellChange, onDelete,
  onAddCustomField, onCustomFieldChange, onDeleteCustomField,
}) {
  return (
    <>
      {/* Desktop table */}
      <div className="table-card desktop-only">
        <div className="table-scroll">
          <table className="record-table">
            <thead>
              <tr>
                {columns.map((col) => (
                  <th key={col.id}>{col.name[lang] || col.name.en || col.name.zh}</th>
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
          />
        ))}
      </div>
    </>
  );
}
