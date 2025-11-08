import React from 'react';
import './Input.css';

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  hint?: string;
  error?: string;
}

export const Input: React.FC<InputProps> = ({ id, label, hint, error, className, ...rest }) => {
  const inputId = React.useId();
  const finalId = id || inputId;
  const hintId = hint ? `${finalId}-hint` : undefined;
  const errorId = error ? `${finalId}-error` : undefined;

  return (
    <div className={['input', error ? 'input--error' : '', className || ''].filter(Boolean).join(' ')}>
      {label ? (
        <label className="input__label" htmlFor={finalId}>
          {label}
        </label>
      ) : null}

      <input
        id={finalId}
        className="input__control"
        aria-invalid={!!error}
        aria-describedby={[hintId, errorId].filter(Boolean).join(' ') || undefined}
        {...rest}
      />

      {hint && !error ? (
        <div id={hintId} className="input__hint">
          {hint}
        </div>
      ) : null}

      {error ? (
        <div id={errorId} className="input__error">
          {error}
        </div>
      ) : null}
    </div>
  );
};