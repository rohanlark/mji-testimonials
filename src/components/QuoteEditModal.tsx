import { useState, useEffect } from 'react';
import { Testimonial, MetadataFieldKey, METADATA_FIELD_LABELS } from '../types/testimonial';
import { normalizeAgeValue } from '../lib/metadataNormalize';
import { normalizeQuoteForLayout } from '../lib/quoteNormalize';

interface QuoteEditModalProps {
  testimonial: Testimonial | null;
  open: boolean;
  onClose: () => void;
  onSave: (id: string, partial: Partial<Testimonial>) => void;
}

export function QuoteEditModal({ testimonial, open, onClose, onSave }: QuoteEditModalProps) {
  const [quote, setQuote] = useState('');
  const [year, setYear] = useState('');
  const [country, setCountry] = useState('');
  const [age, setAge] = useState('');
  const [state, setState] = useState('');
  const [visa, setVisa] = useState('');
  const [occupation, setOccupation] = useState('');

  useEffect(() => {
    if (!testimonial || !open) return;
    setQuote(normalizeQuoteForLayout(testimonial.quote));
    setYear(testimonial.year);
    setCountry(testimonial.country);
    setAge(normalizeAgeValue(testimonial.age));
    setState(testimonial.state);
    setVisa(testimonial.visa);
    setOccupation(testimonial.occupation);
  }, [testimonial, open]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  if (!open || !testimonial) return null;

  const handleSave = () => {
    onSave(testimonial.id, {
      quote: normalizeQuoteForLayout(quote),
      year,
      country,
      age: normalizeAgeValue(age),
      state,
      visa,
      occupation,
    });
    onClose();
  };

  const fieldInputs: { key: MetadataFieldKey; value: string; set: (v: string) => void }[] = [
    { key: 'year', value: year, set: setYear },
    { key: 'country', value: country, set: setCountry },
    { key: 'age', value: age, set: setAge },
    { key: 'state', value: state, set: setState },
    { key: 'visa', value: visa, set: setVisa },
    { key: 'occupation', value: occupation, set: setOccupation },
  ];

  return (
    <div
      className="modal-overlay"
      role="dialog"
      aria-modal="true"
      aria-labelledby="quote-edit-title"
      onClick={onClose}
    >
      <div className="modal modal-quote-edit" onClick={(e) => e.stopPropagation()}>
        <h2 id="quote-edit-title" className="modal-title">
          Edit quote
        </h2>
        <p className="modal-hint">Edits apply to this testimonial everywhere it appears.</p>
        <label className="quote-edit-label">
          <span className="quote-edit-label-text">Quote</span>
          <textarea
            className="input-textarea modal-textarea quote-edit-quote"
            value={quote}
            onChange={(e) => setQuote(e.target.value)}
            rows={10}
            autoFocus
          />
        </label>
        <div className="quote-edit-metadata">
          {fieldInputs.map(({ key, value, set }) => (
            <label key={key} className="quote-edit-label quote-edit-label-inline">
              <span className="quote-edit-label-text">{METADATA_FIELD_LABELS[key]}</span>
              <input
                type="text"
                className="quote-edit-input"
                value={value}
                onChange={(e) => set(e.target.value)}
              />
            </label>
          ))}
        </div>
        <div className="modal-actions">
          <button type="button" className="modal-btn-secondary" onClick={onClose}>
            Cancel
          </button>
          <button type="button" className="modal-btn-primary" onClick={handleSave}>
            Save
          </button>
        </div>
      </div>
    </div>
  );
}
