import { useState, useEffect, useCallback, useRef } from 'react';
import { getRecords, createRecord, updateRecord, deleteRecord, clearRecords, getRecordColumns, saveRecordColumns, linkRecordsSubscription } from '../api';
import DataTable from '../components/DataTable';
import ManageColumnsModal from '../components/ManageColumnsModal';

const POLL_INTERVAL = 300000; // 5 minutes

const DEFAULT_COLUMNS = [
  { id: 'address', name: { en: 'Address', zh: '地址' }, type: 'text' },
  { id: 'idNumber', name: { en: 'ID', zh: '编号' }, type: 'text' },
  { id: 'topCustom1', name: { en: 'Top Field 1', zh: '上方自定义 1' }, type: 'text' },
  { id: 'topCustom2', name: { en: 'Top Field 2', zh: '上方自定义 2' }, type: 'text' },
  { id: 'topCustom3', name: { en: 'Top Field 3', zh: '上方自定义 3' }, type: 'text' },
  { id: 'topCustom4', name: { en: 'Top Field 4', zh: '上方自定义 4' }, type: 'text' },
  { id: 'topCustom5', name: { en: 'Top Field 5', zh: '上方自定义 5' }, type: 'text' },
  { id: 'name', name: { en: 'Name', zh: '姓名' }, type: 'text' },
  { id: 'agentName', name: { en: 'Agent Name', zh: '经纪人姓名' }, type: 'text' },
  { id: 'agentCompany', name: { en: 'Company', zh: '经纪人公司' }, type: 'text' },
  { id: 'agentPhone', name: { en: 'Phone', zh: '电话号码' }, type: 'tel' },
  { id: 'mainCustom1', name: { en: 'Custom 1', zh: '自定义 1' }, type: 'text' },
  { id: 'mainCustom2', name: { en: 'Custom 2', zh: '自定义 2' }, type: 'text' },
  { id: 'mainCustom3', name: { en: 'Custom 3', zh: '自定义 3' }, type: 'text' },
  { id: 'mainCustom4', name: { en: 'Custom 4', zh: '自定义 4' }, type: 'text' },
  { id: 'mainCustom5', name: { en: 'Custom 5', zh: '自定义 5' }, type: 'text' },
  { id: 'personInCharge', name: { en: 'Person in Charge', zh: '经办人' }, type: 'text' },
  { id: 'handlerSignature', name: { en: 'Handler Signature', zh: '经手签名' }, type: 'text' },
  { id: 'remarks', name: { en: 'Remarks', zh: '备注' }, type: 'textarea' },
  { id: 'amount', name: { en: 'Amount', zh: '金额' }, type: 'number' },
  { id: 'paid', name: { en: 'Paid', zh: '已付款' }, type: 'checkbox' },
  { id: 'dueDate', name: { en: 'Due Date', zh: '到期日' }, type: 'date' },
  { id: 'reminder', name: { en: 'Reminder', zh: '提醒' }, type: 'reminder' },
];

export default function RecordsPage({ t, lang, subscriptionId, notificationsEnabled, enableNotifications, pushError, dueWarningSettings }) {
  const [columns, setColumns] = useState(DEFAULT_COLUMNS);
  const [rows, setRows] = useState([]);
  const [search, setSearch] = useState('');
  const [showManage, setShowManage] = useState(false);
  const [error, setError] = useState(null);
  const [saveState, setSaveState] = useState('idle');
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

  useEffect(() => {
    if (!subscriptionId) return;
    linkRecordsSubscription(subscriptionId)
      .then(() => {
        setRows((current) => current.map((row) => ({ ...row, _subscriptionId: subscriptionId })));
      })
      .catch(() => setError(t.errorCreate));
  }, [subscriptionId, t.errorCreate]);

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
    const { id, customFields, reminder, dueDate, _subscriptionId, _isNew, ...data } = row;
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
      setRows((prev) => [{ ...recordToRow(record), _isNew: true }, ...prev]);
    } catch {
      setError(t.errorCreate);
    }
  };

  const handleCellChange = useCallback((rowId, key, value) => {
    setSaveState('dirty');
    setRows((prev) => {
      const updated = prev.map((row) => {
        if (row.id !== rowId) return row;
        if (key === 'paid' && value === true) {
          return { ...row, paid: true, reminder: '' };
        }
        return { ...row, [key]: value };
      });
      const row = updated.find((r) => r.id === rowId);
      if (row) debouncedSave(rowId, row);
      return updated;
    });
  }, [columns]);

  const handleCustomFieldChange = useCallback((rowId, fieldIndex, key, value) => {
    setSaveState('dirty');
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
    setSaveState('dirty');
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
    setSaveState('dirty');
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

  const handleSaveAll = async () => {
    Object.values(debounceTimers.current).forEach(clearTimeout);
    debounceTimers.current = {};
    setSaveState('saving');
    try {
      await Promise.all(rows.map((row) => updateRecord(row.id, rowToPayload(row))));
      setError(null);
      setSaveState('saved');
      setTimeout(() => setSaveState('idle'), 1800);
    } catch {
      setSaveState('dirty');
      setError(t.errorSave || t.errorCreate);
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

  const hasAmountColumn = columns.some((col) => col.id === 'amount');
  const totalAmount = hasAmountColumn
    ? rows.reduce((sum, row) => {
        const amount = parseFloat(row.amount);
        return sum + (Number.isNaN(amount) ? 0 : amount);
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
              {t.amountTotal} <span className="value">{lang === 'zh' ? '¥' : '$'}{formattedTotal}</span>
            </span>
          )}
        </div>
      </header>

      {error && <div className="banner error">{error}</div>}
      {pushError && <div className="banner error">{pushError}</div>}

      <div className="records-notification-row">
        <span>{t.phoneReminders}</span>
        <button
          type="button"
          className={`btn btn-notify ${notificationsEnabled ? 'is-on' : ''}`}
          onClick={enableNotifications}
          disabled={notificationsEnabled}
        >
          {notificationsEnabled ? t.notificationsOn : t.enableNotifications}
        </button>
      </div>

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
          <button
            className={`btn btn-save ${saveState === 'saved' ? 'is-saved' : ''}`}
            onClick={handleSaveAll}
            disabled={rows.length === 0 || saveState === 'saving'}
          >
            {saveState === 'saving' ? t.saving : saveState === 'saved' ? t.saved : t.save}
          </button>
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
          dueWarningSettings={dueWarningSettings}
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
