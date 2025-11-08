import React from 'react';
import './Card.css';

export interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  title?: string;
  actions?: React.ReactNode;
}

export const Card: React.FC<CardProps> = ({ title, actions, className, children, ...rest }) => {
  return (
    <section className={['card', className || ''].filter(Boolean).join(' ')} {...rest}>
      {(title || actions) && (
        <header className="card__header">
          {title ? <h3 className="card__title">{title}</h3> : <span />}
          {actions ? <div className="card__actions">{actions}</div> : null}
        </header>
      )}
      <div className="card__body">{children}</div>
    </section>
  );
};