import { useState } from 'react';
import { Leva } from 'leva';
import { parseTestimonials } from './lib/parser';
import { Testimonial } from './types/testimonial';
import { QuoteRenderer } from './components/QuoteRenderer';
import { ErrorBoundary } from './components/ErrorBoundary';
import './App.css';

function App() {
  const [input, setInput] = useState('');
  const [testimonials, setTestimonials] = useState<Testimonial[]>([]);
  const [errors, setErrors] = useState<string[]>([]);

  const handlePaste = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const text = e.target.value;
    setInput(text);
    
    if (text.trim()) {
      const result = parseTestimonials(text);
      setTestimonials(result.testimonials);
      setErrors(result.errors);
    } else {
      setTestimonials([]);
      setErrors([]);
    }
  };

  const pickRandom = <T,>(arr: T[], n: number): T[] => {
    if (arr.length <= n) return [...arr];
    const shuffled = [...arr].sort(() => Math.random() - 0.5);
    return shuffled.slice(0, n);
  };

  const loadSampleCSV = async () => {
    try {
      const response = await fetch('/src/data/sample-testimonials.csv');
      const text = await response.text();
      setInput(text);
      const result = parseTestimonials(text);
      const selected = pickRandom(result.testimonials, 6);
      setTestimonials(selected);
      setErrors(result.errors);
    } catch (error) {
      console.error('Failed to load sample CSV:', error);
    }
  };

  const loadSampleTab = async () => {
    try {
      const response = await fetch('/src/data/sample-testimonials.txt');
      const text = await response.text();
      setInput(text);
      const result = parseTestimonials(text);
      setTestimonials(result.testimonials);
      setErrors(result.errors);
    } catch (error) {
      console.error('Failed to load sample tab-separated:', error);
    }
  };

  return (
    <div className="app">
      <Leva />
      <header className="app-header">
        <h1>MJI Testimonials Tool</h1>
        <p>Visualize and export worker testimonials</p>
      </header>

      <div className="app-content">
        <div className="input-section">
          <div className="input-header">
            <h2>Paste Testimonial Data</h2>
            <div className="sample-buttons">
              <button onClick={loadSampleCSV}>Load Sample CSV</button>
              <button onClick={loadSampleTab}>Load Sample Tab-Separated</button>
            </div>
          </div>
          <textarea
            className="input-textarea"
            value={input}
            onChange={handlePaste}
            placeholder="Paste CSV or tab-separated testimonial data here..."
            rows={10}
          />
        </div>

        {errors.length > 0 && (
          <div className="errors-section">
            <h3>Parse Errors ({errors.length})</h3>
            <ul>
              {errors.map((error, idx) => (
                <li key={idx} className="error-item">{error}</li>
              ))}
            </ul>
          </div>
        )}

        {testimonials.length > 0 ? (
          <div className="renderer-section">
            <ErrorBoundary>
              <QuoteRenderer testimonials={testimonials} />
            </ErrorBoundary>
          </div>
        ) : (
          <div className="empty-state-section">
            <p className="empty-state">No testimonials parsed yet. Paste data above or load a sample.</p>
          </div>
        )}
      </div>
    </div>
  );
}

export default App;
