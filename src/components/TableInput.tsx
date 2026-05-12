import React from 'react';
import type { TwoByTwoTable } from '../utils/epidemiology';
import './TableInput.css';

interface TableInputProps {
  table: TwoByTwoTable;
  onChange: (table: TwoByTwoTable) => void;
  mode: 'epi' | 'screening';
  labels: {
    rowPos: string;
    rowNeg: string;
    colPos: string;
    colNeg: string;
    title: string;
    cellA: string;
    cellB: string;
    cellC: string;
    cellD: string;
    total: string;
  };
}

const TableInput: React.FC<TableInputProps> = ({ table, onChange, labels }) => {
  const { a, b, c, d } = table;

  const handleChange = (key: keyof TwoByTwoTable) => (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    const val = parseInt(e.target.value) || 0;
    onChange({ ...table, [key]: Math.max(0, val) });
  };

  const rowTotalExposed = a + b;
  const rowTotalUnexposed = c + d;
  const colTotalPos = a + c;
  const colTotalNeg = b + d;
  const grandTotal = a + b + c + d;

  return (
    <div className="table-input-wrapper">
      <h3 className="table-title">{labels.title}</h3>
      <div className="contingency-table">
        {/* Header row */}
        <div className="ct-cell ct-corner" />
        <div className="ct-cell ct-header">{labels.colPos}</div>
        <div className="ct-cell ct-header">{labels.colNeg}</div>
        <div className="ct-cell ct-header ct-total-header">{labels.total}</div>

        {/* Row 1: Exposed+ */}
        <div className="ct-cell ct-row-header">{labels.rowPos}</div>
        <div className="ct-cell ct-input-cell">
          <label className="sr-only">{labels.cellA}</label>
          <span className="cell-label">a</span>
          <input
            type="number"
            min="0"
            value={a}
            onChange={handleChange('a')}
            className="cell-input"
            aria-label={labels.cellA}
          />
        </div>
        <div className="ct-cell ct-input-cell">
          <label className="sr-only">{labels.cellB}</label>
          <span className="cell-label">b</span>
          <input
            type="number"
            min="0"
            value={b}
            onChange={handleChange('b')}
            className="cell-input"
            aria-label={labels.cellB}
          />
        </div>
        <div className="ct-cell ct-total-cell">{rowTotalExposed.toLocaleString()}</div>

        {/* Row 2: Exposed- */}
        <div className="ct-cell ct-row-header">{labels.rowNeg}</div>
        <div className="ct-cell ct-input-cell">
          <label className="sr-only">{labels.cellC}</label>
          <span className="cell-label">c</span>
          <input
            type="number"
            min="0"
            value={c}
            onChange={handleChange('c')}
            className="cell-input"
            aria-label={labels.cellC}
          />
        </div>
        <div className="ct-cell ct-input-cell">
          <label className="sr-only">{labels.cellD}</label>
          <span className="cell-label">d</span>
          <input
            type="number"
            min="0"
            value={d}
            onChange={handleChange('d')}
            className="cell-input"
            aria-label={labels.cellD}
          />
        </div>
        <div className="ct-cell ct-total-cell">{rowTotalUnexposed.toLocaleString()}</div>

        {/* Footer totals */}
        <div className="ct-cell ct-total-header">{labels.total}</div>
        <div className="ct-cell ct-total-cell">{colTotalPos.toLocaleString()}</div>
        <div className="ct-cell ct-total-cell">{colTotalNeg.toLocaleString()}</div>
        <div className="ct-cell ct-grand-total">{grandTotal.toLocaleString()}</div>
      </div>
    </div>
  );
};

export default TableInput;
