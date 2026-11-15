import React, { useState } from 'react';
import { getRemember, setRemember } from '../utils/savedAppointments';

interface Props {
  /** chamado quando o cliente liga/desliga (ex.: para atualizar a lista na tela) */
  onChange?: (on: boolean) => void;
  className?: string;
}

/** "Lembrar neste aparelho": liga/desliga a memória dos agendamentos no navegador. */
export const RememberCheckbox: React.FC<Props> = ({ onChange, className = '' }) => {
  const [on, setOn] = useState(getRemember);
  return (
    <label className={`flex items-start gap-3 cursor-pointer select-none ${className}`}>
      <input
        type="checkbox"
        checked={on}
        onChange={(e) => {
          setOn(e.target.checked);
          setRemember(e.target.checked);
          onChange?.(e.target.checked);
        }}
        className="mt-0.5 h-4 w-4 shrink-0 accent-white cursor-pointer"
      />
      <span className="text-xs leading-relaxed text-white/55">
        Lembrar meus agendamentos neste aparelho
        <span className="block text-white/35">Assim você consulta sem digitar o código. Não use em aparelho de outras pessoas.</span>
      </span>
    </label>
  );
};
