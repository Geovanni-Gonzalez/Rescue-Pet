import React from 'react';
import { Label } from './ui/label';
import { Input } from './ui/input';

interface FormFieldProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label: string;
  error?: string;
  helperText?: string;
}

export const FormField = React.forwardRef<HTMLInputElement, FormFieldProps>(
  ({ label, error, helperText, className, ...props }, ref) => {
    return (
      <div className="space-y-2">
        <Label htmlFor={props.id || props.name} className={error ? 'text-red-500' : ''}>
          {label}
        </Label>
        <Input
          ref={ref}
          className={`${error ? 'border-red-500 focus-visible:ring-red-500' : ''} ${className || ''}`}
          {...props}
        />
        {helperText && !error && <p className="text-xs text-muted-foreground">{helperText}</p>}
        {error && <p className="text-sm text-red-500">{error}</p>}
      </div>
    );
  }
);
FormField.displayName = 'FormField';
