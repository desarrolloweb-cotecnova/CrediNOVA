import { useState, useRef, useEffect } from 'react';
import { Pencil, Check, X } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

export interface EditableFieldOption {
  value: string;
  label: string;
}

interface EditableFieldProps {
  /** Etiqueta visible */
  label: string;
  /** Valor actual (como string para mostrar) */
  displayValue: string;
  /** Valor raw para editar (puede diferir del display, ej. fecha ISO vs dd/mm/yyyy) */
  rawValue?: string | number | boolean;
  /** Tipo del input de edición */
  type?: 'text' | 'email' | 'tel' | 'date' | 'number' | 'select' | 'boolean';
  /** Opciones para tipo 'select' */
  options?: EditableFieldOption[];
  /** Callback al guardar; recibe el nuevo valor raw */
  onSave: (value: string | number | boolean) => Promise<void>;
  /** Deshabilitar edición (estado terminal) */
  disabled?: boolean;
  /**
   * Controlado desde el padre: indica que este campo fue modificado en la sesión.
   * Mantenido en el componente padre para sobrevivir re-renders del árbol.
   */
  isModified?: boolean;
}

/**
 * Muestra un campo con ícono de edición (lápiz).
 * Al hacer clic, convierte el campo en un input inline con botones Guardar / Cancelar.
 * Cuando isModified=true, muestra un indicador ámbar de trazabilidad en la etiqueta
 * y colorea el valor para señalar que fue editado por el gestor.
 */
export function EditableField({
  label,
  displayValue,
  rawValue,
  type = 'text',
  options = [],
  onSave,
  disabled = false,
  isModified = false,
}: EditableFieldProps) {
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);

  // Valor local de edición (siempre string para los inputs HTML)
  const initEdit = () => {
    if (rawValue !== undefined && rawValue !== null) {
      if (type === 'boolean') return rawValue ? 'true' : 'false';
      return String(rawValue);
    }
    // Para fecha, si el displayValue está en dd/mm/yyyy convertir a YYYY-MM-DD
    if (type === 'date' && displayValue && displayValue !== 'N/A') {
      const parts = displayValue.split('/');
      if (parts.length === 3) return `${parts[2]}-${parts[1]}-${parts[0]}`;
    }
    return displayValue === 'N/A' ? '' : displayValue;
  };

  const [editValue, setEditValue] = useState<string>('');
  const inputRef = useRef<HTMLInputElement>(null);

  const handleEditStart = () => {
    setEditValue(initEdit());
    setEditing(true);
  };

  useEffect(() => {
    if (editing && inputRef.current) {
      inputRef.current.focus();
    }
  }, [editing]);

  const handleCancel = () => {
    setEditing(false);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      let finalValue: string | number | boolean = editValue;
      if (type === 'number') finalValue = editValue === '' ? 0 : Number(editValue);
      if (type === 'boolean') finalValue = editValue === 'true';
      await onSave(finalValue);
      setEditing(false);
    } finally {
      setSaving(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') handleSave();
    if (e.key === 'Escape') handleCancel();
  };

  return (
    <div className="group">
      {/* Etiqueta con indicador de modificado y lápiz de edición */}
      <div className="flex items-center gap-1.5 mb-0.5">
        <p className="text-sm font-medium text-muted-foreground">{label}</p>

        {/* Indicador de trazabilidad: punto ámbar + texto "editado" */}
        {isModified && !editing && (
          <span
            className="inline-flex items-center gap-1 leading-none"
            title="Campo modificado por el gestor en esta sesión"
          >
            <span className="w-1.5 h-1.5 rounded-full bg-amber-400 shrink-0" />
            <span className="text-[11px] font-medium text-amber-600 dark:text-amber-400">
              editado
            </span>
          </span>
        )}

        {/* Lápiz de edición */}
        {!disabled && !editing && (
          <button
            type="button"
            onClick={handleEditStart}
            className="opacity-0 group-hover:opacity-100 transition-opacity p-0.5 rounded hover:bg-muted text-muted-foreground hover:text-foreground"
            title="Editar campo"
          >
            <Pencil className="h-3 w-3" />
          </button>
        )}
      </div>

      {/* Modo lectura */}
      {!editing && (
        <p
          className={[
            'text-base leading-snug transition-colors',
            isModified ? 'text-amber-700 dark:text-amber-400 font-medium' : '',
            !disabled ? 'cursor-pointer' : '',
            !disabled && !isModified ? 'hover:text-primary' : '',
          ]
            .filter(Boolean)
            .join(' ')}
          onClick={!disabled ? handleEditStart : undefined}
          title={!disabled ? 'Clic para editar' : undefined}
        >
          {displayValue || <span className="text-muted-foreground italic">N/A</span>}
        </p>
      )}

      {/* Modo edición */}
      {editing && (
        <div className="flex items-center gap-1.5 mt-0.5">
          {type === 'select' ? (
            <Select value={editValue} onValueChange={setEditValue}>
              <SelectTrigger className="h-8 text-sm flex-1 min-w-0">
                <SelectValue placeholder="Seleccionar…" />
              </SelectTrigger>
              <SelectContent>
                {options.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          ) : type === 'boolean' ? (
            <Select value={editValue} onValueChange={setEditValue}>
              <SelectTrigger className="h-8 text-sm flex-1 min-w-0">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="true">Sí</SelectItem>
                <SelectItem value="false">No</SelectItem>
              </SelectContent>
            </Select>
          ) : (
            <Input
              ref={inputRef}
              type={type === 'tel' ? 'tel' : type}
              value={editValue}
              onChange={(e) => setEditValue(e.target.value)}
              onKeyDown={handleKeyDown}
              className="h-8 text-sm flex-1 min-w-0 px-2"
              disabled={saving}
            />
          )}

          {/* Guardar */}
          <Button
            type="button"
            size="icon"
            variant="ghost"
            className="h-7 w-7 shrink-0 text-green-600 hover:bg-green-50 dark:hover:bg-green-950/30"
            onClick={handleSave}
            disabled={saving}
            title="Guardar"
          >
            {saving ? (
              <span className="h-3.5 w-3.5 border-2 border-current border-t-transparent rounded-full animate-spin inline-block" />
            ) : (
              <Check className="h-3.5 w-3.5" />
            )}
          </Button>

          {/* Cancelar */}
          <Button
            type="button"
            size="icon"
            variant="ghost"
            className="h-7 w-7 shrink-0 text-destructive hover:bg-destructive/10"
            onClick={handleCancel}
            disabled={saving}
            title="Cancelar"
          >
            <X className="h-3.5 w-3.5" />
          </Button>
        </div>
      )}
    </div>
  );
}

