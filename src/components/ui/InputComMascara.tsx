import React, { forwardRef, useCallback } from 'react';
import { Input } from '@/components/ui/input';
import { formatIMEI, unformatIMEI } from '@/utils/imeiMask';
import { moedaMask, parseMoeda } from '@/utils/formatUtils';
import { cn } from '@/lib/utils';

interface InputComMascaraProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'onChange' | 'value'> {
  mascara: 'imei' | 'moeda';
  value: string | number;
  onChange: (value: string, rawValue: string | number) => void;
}

const InputComMascara = forwardRef<HTMLInputElement, InputComMascaraProps>(
  ({ mascara, value, onChange, className, ...props }, ref) => {
    
    const handleChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
      const inputValue = e.target.value;
      
      if (mascara === 'imei') {
        const formatted = formatIMEI(inputValue);
        const raw = unformatIMEI(inputValue);
        onChange(formatted, raw);
      } else if (mascara === 'moeda') {
        const formatted = moedaMask(inputValue);
        const raw = parseMoeda(inputValue);
        onChange(formatted, raw);
      }
    }, [mascara, onChange]);

    const getDisplayValue = useCallback(() => {
      if (mascara === 'imei') {
        if (typeof value === 'string') {
          return formatIMEI(value);
        }
        return '';
      } else if (mascara === 'moeda') {
        if (typeof value === 'number') {
          return value > 0 ? moedaMask(value) : '';
        }
        if (typeof value === 'string') {
          return value;
        }
        return '';
      }
      return String(value);
    }, [mascara, value]);

    const getPlaceholder = () => {
      if (props.placeholder) return props.placeholder;
      if (mascara === 'imei') return '00-000000-000000-0';
      if (mascara === 'moeda') return '0,00';
      return '';
    };

    const getMaxLength = () => {
      if (props.maxLength) return props.maxLength;
      if (mascara === 'imei') return 18; // 15 dígitos + 3 hífens
      return undefined;
    };

    return (
      <div className="relative">
        {mascara === 'moeda' && (
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">
            R$
          </span>
        )}
        <Input
          ref={ref}
          type="text"
          value={getDisplayValue()}
          onChange={handleChange}
          placeholder={getPlaceholder()}
          maxLength={getMaxLength()}
          className={cn(
            mascara === 'moeda' && 'pl-10',
            className
          )}
          {...props}
        />
      </div>
    );
  }
);

InputComMascara.displayName = 'InputComMascara';

export { InputComMascara };
export type { InputComMascaraProps };
