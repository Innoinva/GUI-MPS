import React from 'react';
import './Slider.css';

export interface SliderProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'type'> {
  label?: string;
  showValue?: boolean;
  valueSuffix?: string;
}

export const Slider: React.FC<SliderProps> = ({ id, label, showValue = true, value, valueSuffix = '', ...rest }) => {
  const sliderId = React.useId();
  const finalId = id || sliderId;

  return (
    <div className="slider">
      {label ? (
        <label htmlFor={finalId} className="slider__label">
          <span>{label}</span>
          {showValue && typeof value !== 'undefined' ? (
            <span className="slider__value">
              {value}
              {valueSuffix}
            </span>
          ) : null}
        </label>
      ) : null}

      <input id={finalId} className="slider__control" type="range" value={value} {...rest} />
    </div>
  );
};