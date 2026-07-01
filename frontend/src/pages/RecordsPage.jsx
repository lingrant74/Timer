import { useState, useEffect, useCallback, useRef } from 'react';
import { getRecords, createRecord, updateRecord, deleteRecord, clearRecords, getRecordColumns, saveRecordColumns } from '../api';
import DataTable from '../components/DataTable';
import ManageColumnsModal from '../components/ManageColumnsModal';

const POLL_INTERVAL = 300000; // 5 minutes

const DEFAULT_COLUMNS = [
  { id: 'address', name: { en: 'Address', zh: '地址' }, type: 'text' },
  { id: 'idNumber', name: { en: 'ID', zh: '编号' }, type: 'text' },
  { id: 'name', name: { en: 'Name', zh: '姓名' }, type: 'text' },
  { id: 'personInCharge', name: { en: 'Person in Charge', zh: '经办人' }, type: 'text' },
  { id: 'handlerSignature', name: { en: 'Handler Signature', zh: '经手签名' }, type: 'text' },
  { id: 'amount', name: { en: 'Amount', zh: '金额' }, type: 'number' },
  { id: 'dueDate', name: { en: 'Due Date', zh: '到期日' }, type: 'date' },
  { id: 'reminder', name: { en: 'Reminder', zh: '提醒' }, type: 'reminder' },
];

export default function RecordsPage({ t, lang, subscriptionId }) {
  const [columns, setColumns] = useState(DEFAULT_COLUMNS);
  const [rows, setRows] = useState([]);
  const [search, setSearch] = useState('');
  const [showManage, setShowManage] = useState(false);
  const [error, setError] = useState(null);
  const debounceTimers = useRef({});

  // Load data from backend
  const loadData = useCallback(async () => {
    try {
      const [cols, records] = await Promise.all([getRecordColumns(), getRecords()]);
      if (cols.length > 0) setColumns(cols);
      setRows(records.map(recordToRow));
      setError(null);
    } catch {
      setError(t.errorBackend);
    }
  }, [t.errorBackend]);

  useEffect(() => {
    loadData();
    const id = setInterval(loadData, POLL_INTERVAL);
    return () => clearInterval(id);
  }, [loadData]);

  // Reload on tab focus
  useEffect(() => {
    function onVisibility() {
      if (document.visibilityState === 'visible') loadData();
    }
    document.addEventListener('visibilitychange', onVisibility);
    return () => document.removeEventListener('visibilitychange', onVisibility);
  }, [loadData]);

  // Convert API record to flat row for UI
  function recordToRow(record) {
    return {
      id: record.id,
      ...record.data,
      reminder: record.reminder || '',
      dueDate: record.dueDate || '',
      customFields: record.customFields || [],
      _subscriptionId: record.subscriptionId,
    };
  }

  // Convert flat row to API shape for saving
  function rowToPayload(row) {
    const { id, customFields, reminder, dueDate, _subscriptionId, ...data } = row;
    return { data, customFields: customFields || [], reminder: reminder || '', dueDate: dueDate || '' };
  }

  // Debounced save for cell edits
  function debouncedSave(rowId, row) {
    if (debounceTimers.current[rowId]) clearTimeout(debounceTimers.current[rowId]);
    debounceTimers.current[rowId] = setTimeout(async () => {
      try {
        await updateRecord(rowId, rowToPayload(row));
      } catch {
        setError(t.errorCreate);
      }
    }, 400);
  }

  const handleAddRow = async () => {
    const emptyData = {};
    columns.forEach((col) => { emptyData[col.id] = ''; });
    try {
      const record = await createRecord({
        data: emptyData,
        customFields: [],
        reminder: '',
        dueDate: '',
        subscriptionId: subscriptionId || null,
      });
      setRows((prev) => [recordToRow(record), ...prev]);
    } catch {
      setError(t.errorCreate);
    }
  };

  const handleCellChange = useCallback((rowId, key, value) => {
    setRows((prev) => {
      const updated = prev.map((row) => (row.id === rowId ? { ...row, [key]: value } : row));
      const row = updated.find((r) => r.id === rowId);
      if (row) debouncedSave(rowId, row);
      return updated;
    });
  }, [columns]);

  const handleCustomFieldChange = useCallback((rowId, fieldIndex, key, value) => {
    setRows((prev) => {
      const updated = prev.map((row) => {
        if (row.id !== rowId) return row;
        const customFields = [...(row.customFields || [])];
        customFields[fieldIndex] = { ...customFields[fieldIndex], [key]: value };
        return { ...row, customFields };
      });
      const row = updated.find((r) => r.id === rowId);
      if (row) debouncedSave(rowId, row);
      return updated;
    });
  }, []);

  const handleAddCustomField = useCallback((rowId) => {
    setRows((prev) => {
      const updated = prev.map((row) => {
        if (row.id !== rowId) return row;
        const customFields = [...(row.customFields || []), { name: '', value: '' }];
        return { ...row, customFields };
      });
      const row = updated.find((r) => r.id === rowId);
      if (row) debouncedSave(rowId, row);
      return updated;
    });
  }, []);

  const handleDeleteCustomField = useCallback((rowId, fieldIndex) => {
    setRows((prev) => {
      const updated = prev.map((row) => {
        if (row.id !== rowId) return row;
        const customFields = (row.customFields || []).filter((_, i) => i !== fieldIndex);
        return { ...row, customFields };
      });
      const row = updated.find((r) => r.id === rowId);
      if (row) debouncedSave(rowId, row);
      return updated;
    });
  }, []);

  const handleDelete = async (id) => {
    if (!window.confirm(t.deleteConfirm)) return;
    try {
      await deleteRecord(id);
      setRows((prev) => prev.filter((row) => row.id !== id));
    } catch {
      setError(t.errorCreate);
    }
  };

  const handleClearAll = async () => {
    if (!window.confirm(t.clearConfirm)) return;
    try {
      await clearRecords();
      setRows([]);
    } catch {
      setError(t.errorCreate);
    }
  };

  const handleColumnsChange = async (newColumns) => {
    setColumns(newColumns);
    try {
      await saveRecordColumns(newColumns);
    } catch {
      setError(t.errorCreate);
    }
  };

  const searchLower = search.toLowerCase();
  const filteredRows = rows.filter((row) => {
    if (!searchLower) return true;
    return columns.some((col) => {
      const val = row[col.id];
      return val && String(val).toLowerCase().includes(searchLower);
    });
  });

  const numberCols = columns.filter((col) => col.type === 'number');
  const totalAmount = numberCols.length > 0
    ? rows.reduce((sum, row) => {
        let rowSum = 0;
        numberCols.forEach((col) => {
          const n = parseFloat(row[col.id]);
          if (!isNaN(n)) rowSum += n;
        });
        return sum + rowSum;
      }, 0)
    : null;

  const formattedTotal = totalAmount !== null
    ? totalAmount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
    : null;

  return (
    <div className="page records-page">
      <header className="page-header">
        <h1>{t.recordsTitle}</h1>
        <div className="summary">
          <span className="summary-card">
            {lang === 'zh' ? '行' : 'Rows'} <span className="value">{rows.length}</span>
          </span>
          {formattedTotal !== null && (
            <span className="summary-card">
              {lang === 'zh' ? '合计' : 'Total'} <span className="value">{lang === 'zh' ? '¥' : '$'}{formattedTotal}</span>
            </span>
          )}
        </div>
      </header>

      {error && <div className="banner error">{error}</div>}

      <div className="toolbar">
        <div className="search-wrapper">
          <svg className="search-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
          </svg>
          <input
            type="text"
            className="search-input"
            placeholder={t.searchPlaceholder}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <div className="toolbar-buttons">
          <button className="btn btn-primary" onClick={handleAddRow}>{t.addRow}</button>
          <button className="btn btn-secondary" onClick={() => setShowManage(true)}>{t.manageColumns}</button>
          {rows.length > 0 && (
            <button className="btn btn-danger" onClick={handleClearAll}>{t.clearAll}</button>
          )}
        </div>
      </div>

      {rows.length === 0 && !error ? (
        <div className="empty-state">
          <p>{t.emptyState}</p>
          <p>{t.emptyStateSub}</p>
        </div>
      ) : filteredRows.length === 0 && rows.length > 0 ? (
        <div className="empty-state">
          <p>{t.noMatch}</p>
        </div>
      ) : (
        <DataTable
          columns={columns}
          rows={filteredRows}
          lang={lang}
          t={t}
          onCellChange={handleCellChange}
          onDelete={handleDelete}
          onAddCustomField={handleAddCustomField}
          onCustomFieldChange={handleCustomFieldChange}
          onDeleteCustomField={handleDeleteCustomField}
        />
      )}

      {showManage && (
        <ManageColumnsModal
          columns={columns}
          setColumns={handleColumnsChange}
          lang={lang}
          t={t}
          onClose={() => setShowManage(false)}
        />
      )}
    </div>
  );
}
