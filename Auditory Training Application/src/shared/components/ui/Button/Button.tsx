import React from 'react';
import './Button.css';

type ButtonVariant = 'primary' | 'secondary' | 'ghost';
type ButtonSize = 'sm' | 'md' | 'lg';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  block?: boolean; // full width
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
}

export const Button: React.FC<ButtonProps> = ({
  variant = 'primary',
  size = 'md',
  block = false,
  leftIcon,
  rightIcon,
  className,
  children,
  disabled,
  ...rest
}) => {
  const classes = [
    'btn',
    `btn--${variant}`,
    `btn--${size}`,
    block ? 'btn--block' : '',
    disabled ? 'btn--disabled' : '',
    className || '',
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <button className={classes} disabled={disabled} {...rest}>
      {leftIcon ? <span className="btn__icon btn__icon--left">{leftIcon}</span> : null}
      <span className="btn__label">{children}</span>
      {rightIcon ? <span className="btn__icon btn__icon--right">{rightIcon}</span> : null}
    </button>
  );
};