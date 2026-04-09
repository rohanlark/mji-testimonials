import { useState, useRef, useEffect } from 'react';

interface EditableTextProps {
  value: string;
  onSave: (value: string) => void;
  onCancel?: () => void;
  /** Called when edit mode starts or ends (e.g. parent can relax layout clipping). */
  onEditingChange?: (editing: boolean) => void;
  placeholder?: string;
  className?: string;
  style?: React.CSSProperties;
  multiline?: boolean;
}

export function EditableText({
  value,
  onSave,
  onCancel,
  onEditingChange,
  placeholder = '',
  className = '',
  style = {},
  multiline = false,
}: EditableTextProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState(value);
  const inputRef = useRef<HTMLInputElement | HTMLTextAreaElement>(null);

  useEffect(() => {
    setEditValue(value);
  }, [value]);

  useEffect(() => {
    onEditingChange?.(isEditing);
  }, [isEditing, onEditingChange]);

  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select?.();
    }
  }, [isEditing]);

  const handleSave = () => {
    const trimmed = editValue.trim();
    if (trimmed !== value) {
      onSave(trimmed);
    } else if (value !== editValue) {
      onSave(value);
    }
    setIsEditing(false);
  };

  const handleCancel = () => {
    setEditValue(value);
    setIsEditing(false);
    onCancel?.();
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !multiline) {
      e.preventDefault();
      handleSave();
    } else if (e.key === 'Escape') {
      e.preventDefault();
      handleCancel();
    }
  };

  if (isEditing) {
    const inputStyle: React.CSSProperties = {
      ...style,
      width: '100%',
      border: '1px solid #007bff',
      borderRadius: 4,
      padding: '0.25rem 0.5rem',
      outline: 'none',
      boxShadow: '0 0 0 2px rgba(0,123,255,0.25)',
    };

    if (multiline) {
      return (
        <textarea
          ref={inputRef as React.RefObject<HTMLTextAreaElement>}
          className={className}
          style={inputStyle}
          value={editValue}
          onChange={(e) => setEditValue(e.target.value)}
          onBlur={handleSave}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          rows={4}
        />
      );
    }

    return (
      <input
        ref={inputRef as React.RefObject<HTMLInputElement>}
        type="text"
        className={className}
        style={inputStyle}
        value={editValue}
        onChange={(e) => setEditValue(e.target.value)}
        onBlur={handleSave}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
      />
    );
  }

  return (
    <span
      className={className}
      style={{
        ...style,
        cursor: 'text',
        borderBottom: '1px dashed #ccc',
        minHeight: '1em',
        minWidth: 4,
        display: 'inline-block',
      }}
      onClick={() => {
        setIsEditing(true);
      }}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          setIsEditing(true);
        }
      }}
      aria-label="Click to edit"
    >
      {value || placeholder || ' '}
    </span>
  );
}
