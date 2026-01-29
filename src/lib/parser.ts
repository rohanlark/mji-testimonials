import { Testimonial } from '../types/testimonial';

export interface ParseResult {
  testimonials: Testimonial[];
  errors: string[];
}

/**
 * Detects if input is CSV format (has headers) or tab-separated format.
 * 
 * Detection logic:
 * 1. Checks if first line matches CSV header pattern (quote,year,country,...)
 * 2. Falls back to checking for commas without tabs (likely CSV)
 * 3. Defaults to tab-separated format
 */
function detectFormat(input: string): 'csv' | 'tab' {
  const firstLine = input.trim().split('\n')[0];
  
  // Check if first line matches CSV header pattern
  const csvHeaderPattern = /^quote\s*,\s*year\s*,\s*country\s*,\s*age\s*,\s*state\s*,\s*visa\s*,\s*occupation/i;
  if (csvHeaderPattern.test(firstLine)) {
    return 'csv';
  }
  
  // Check if it looks like CSV (has commas and potential quoted fields)
  if (firstLine.includes(',') && (firstLine.includes('"') || !firstLine.includes('\t'))) {
    // If it has commas but no tabs, likely CSV
    if (!firstLine.includes('\t')) {
      return 'csv';
    }
  }
  
  // Default to tab-separated
  return 'tab';
}

/**
 * Parses a CSV line, handling quoted fields and escaped quotes.
 * 
 * Handles:
 * - Quoted fields containing commas: "Field, with comma"
 * - Escaped quotes: "Field with ""escaped"" quotes"
 * - Mixed quoted/unquoted fields
 */
function parseCSVLine(line: string): string[] {
  const fields: string[] = [];
  let currentField = '';
  let insideQuotes = false;
  let i = 0;
  
  while (i < line.length) {
    const char = line[i];
    
    if (char === '"') {
      if (insideQuotes && line[i + 1] === '"') {
        // Escaped quote
        currentField += '"';
        i += 2;
      } else {
        // Toggle quote state
        insideQuotes = !insideQuotes;
        i++;
      }
    } else if (char === ',' && !insideQuotes) {
      // Field separator
      fields.push(currentField.trim());
      currentField = '';
      i++;
    } else {
      currentField += char;
      i++;
    }
  }
  
  // Add last field
  fields.push(currentField.trim());
  
  return fields;
}

/**
 * Parses tab-separated line, handling edge cases.
 * 
 * Supports formats:
 * - "quote (metadata)" - parentheses-wrapped metadata
 * - "quote\tmetadata" - tab-separated
 * - "quote" - quote only (no metadata)
 */
function parseTabLine(line: string): string[] {
  // Handle parentheses-wrapped metadata: "quote (metadata)"
  const parenMatch = line.match(/^(.+?)\s*\((.+)\)\s*$/);
  if (parenMatch) {
    const quote = parenMatch[1].trim();
    const metadata = parenMatch[2];
    // Split metadata by tabs
    const fields = metadata.split('\t').map(f => f.trim());
    return [quote, ...fields];
  }
  
  // Regular tab-separated
  return line.split('\t').map(f => f.trim());
}

/**
 * Extracts quote and metadata from tab-separated format.
 * 
 * Handles various formats:
 * - "quote (metadata)" - parentheses-wrapped metadata (most common)
 * - "quote\tmetadata" - direct tab-separated
 * - "quote" - quote only, no metadata
 * 
 * Returns quote text and metadata array (tab-separated fields).
 */
function extractQuoteAndMetadata(line: string): { quote: string; metadata: string[] } {
  // Try parentheses format first
  const parenMatch = line.match(/^(.+?)\s*\((.+)\)\s*$/);
  if (parenMatch) {
    return {
      quote: parenMatch[1].trim(),
      metadata: parenMatch[2].split('\t').map(f => f.trim())
    };
  }
  
  // Try tab-separated format
  const parts = line.split('\t');
  if (parts.length >= 2) {
    // First part is quote, rest is metadata
    return {
      quote: parts[0].trim(),
      metadata: parts.slice(1).map(f => f.trim())
    };
  }
  
  // Fallback: entire line is quote
  return {
    quote: line.trim(),
    metadata: []
  };
}

/**
 * Normalises metadata array to ensure 6 fields: year, country, age, state, visa, occupation.
 * 
 * Handles:
 * - Missing fields (fills with empty string)
 * - Gender prefixes (Male/Female) - removes from start
 * - Multiple occupation fields - joins with commas
 * - Inconsistent field counts
 */
function normaliseMetadata(metadata: string[]): string[] {
  const normalised: string[] = [];
  
  // Remove gender prefixes if present (Male/Female at start)
  let startIdx = 0;
  if (metadata.length > 0) {
    const first = metadata[0].toLowerCase();
    if (first === 'male' || first === 'female') {
      startIdx = 1;
    }
  }
  
  // Extract 6 fields: year, country, age, state, visa, occupation
  const fields = metadata.slice(startIdx);
  
  // Year (first field, should be numeric)
  normalised[0] = fields[0] || '';
  
  // Country (second field)
  normalised[1] = fields[1] || '';
  
  // Age (third field, may contain "years old")
  normalised[2] = fields[2] || '';
  
  // State (fourth field)
  normalised[3] = fields[3] || '';
  
  // Visa (fifth field)
  normalised[4] = fields[4] || '';
  
  // Occupation (sixth field and beyond, join if multiple)
  normalised[5] = fields.slice(5).join(', ') || '';
  
  return normalised;
}

/**
 * Parses CSV format testimonial data
 */
function parseCSV(input: string): ParseResult {
  const lines = input.trim().split('\n');
  const testimonials: Testimonial[] = [];
  const errors: string[] = [];
  
  if (lines.length < 2) {
    return {
      testimonials: [],
      errors: ['CSV must have at least a header row and one data row']
    };
  }
  
  // Skip header row
  const dataLines = lines.slice(1);
  
  dataLines.forEach((line, index) => {
    const lineNum = index + 2; // +2 because we skipped header and 0-indexed
    
    if (!line.trim()) {
      return; // Skip empty lines
    }
    
    try {
      const fields = parseCSVLine(line);
      
      if (fields.length < 7) {
        errors.push(`Line ${lineNum}: Expected 7 fields, got ${fields.length}`);
        return;
      }
      
      const [quote, year, country, age, state, visa, occupation] = fields;
      
      testimonials.push({
        id: `testimonial-${index}`,
        quote: quote || '',
        year: year || '',
        country: country || '',
        age: age || '',
        state: state || '',
        visa: visa || '',
        occupation: occupation || ''
      });
    } catch (error) {
      errors.push(`Line ${lineNum}: ${error instanceof Error ? error.message : 'Parse error'}`);
    }
  });
  
  return { testimonials, errors };
}

/**
 * Parses tab-separated format testimonial data
 */
function parseTabSeparated(input: string): ParseResult {
  const lines = input.trim().split('\n');
  const testimonials: Testimonial[] = [];
  const errors: string[] = [];
  
  lines.forEach((line, index) => {
    const lineNum = index + 1;
    
    if (!line.trim()) {
      return; // Skip empty lines
    }
    
    try {
      const { quote, metadata } = extractQuoteAndMetadata(line);
      const normalised = normaliseMetadata(metadata);
      
      const [year, country, age, state, visa, occupation] = normalised;
      
      testimonials.push({
        id: `testimonial-${index}`,
        quote: quote || '',
        year: year || '',
        country: country || '',
        age: age || '',
        state: state || '',
        visa: visa || '',
        occupation: occupation || ''
      });
    } catch (error) {
      errors.push(`Line ${lineNum}: ${error instanceof Error ? error.message : 'Parse error'}`);
    }
  });
  
  return { testimonials, errors };
}

/**
 * Main parser function - auto-detects format and parses accordingly.
 * 
 * Process:
 * 1. Detects format (CSV vs tab-separated)
 * 2. Parses accordingly with error recovery
 * 3. Returns testimonials array and any parse errors
 * 
 * Errors are collected but don't stop parsing - allows partial success.
 */
export function parseTestimonials(input: string): ParseResult {
  if (!input || !input.trim()) {
    return {
      testimonials: [],
      errors: ['No input provided']
    };
  }
  
  const format = detectFormat(input);
  
  if (format === 'csv') {
    return parseCSV(input);
  } else {
    return parseTabSeparated(input);
  }
}
