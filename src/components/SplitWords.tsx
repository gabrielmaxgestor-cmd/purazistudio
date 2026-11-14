import React from 'react';

/** Divide um texto em palavras para animar cada uma subindo (efeito "split text"). */
export const SplitWords: React.FC<{ text: string; attr: string }> = ({ text, attr }) => (
  <>
    {text.split(' ').map((w, i, arr) => (
      <React.Fragment key={i}>
        <span className="inline-block overflow-hidden align-bottom pb-[0.16em] -mb-[0.16em]">
          <span className="inline-block will-change-transform" {...{ [attr]: '' }}>
            {w}
          </span>
        </span>
        {i < arr.length - 1 ? ' ' : ''}
      </React.Fragment>
    ))}
  </>
);
