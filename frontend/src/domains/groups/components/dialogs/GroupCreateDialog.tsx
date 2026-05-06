import { useEffect, useState } from 'react';
import type { User } from '@/types';
import Dialog from '@/shared/components/dialog/Dialog';
import type { CreateGroupInput } from '../../api';
import type { GroupFormValues } from '../../types';
import GroupFormFields from '../forms/GroupFormFields';
import {
  buildGroupFormValues,
  mapGroupFormToInput,
  validateGroupForm,
} from '../utils/groupUtils';

interface GroupCreateDialogProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (data: CreateGroupInput) => Promise<void>;
  managers: User[];
  requireManager: boolean;
}

export default function GroupCreateDialog({
  open,
  onClose,
  onSubmit,
  managers,
  requireManager,
}: GroupCreateDialogProps) {
  const [values, setValues] = useState<GroupFormValues>(buildGroupFormValues());
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (open) {
      setValues(buildGroupFormValues());
      setLoading(false);
      setError('');
    }
  }, [open]);

  const handleChange = (field: keyof GroupFormValues, value: string) => {
    setValues((current) => ({ ...current, [field]: value }));
  };

  const handleSubmit = async (event: { preventDefault: () => void }) => {
    event.preventDefault();
    setLoading(true);
    setError('');

    try {
      const validationError = validateGroupForm(values, managers, requireManager);
      if (validationError) {
        throw new Error(validationError);
      }

      await onSubmit(mapGroupFormToInput(values));
      onClose();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Erro ao criar equipe');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog
      isOpen={open}
      onClose={onClose}
      title="Nova equipe"
      description="Preencha os dados principais para cadastrar uma nova equipe."
      size="lg"
      closeDisabled={loading}
      footer={
        <>
          <button
            type="button"
            onClick={onClose}
            disabled={loading}
            className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 transition hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
          >
            Cancelar
          </button>
          <button
            type="submit"
            form="create-group-form"
            disabled={loading}
            className="rounded-lg bg-green-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-green-700 disabled:opacity-50"
          >
            {loading ? 'Salvando...' : 'Salvar equipe'}
          </button>
        </>
      }
    >
      <form id="create-group-form" onSubmit={handleSubmit} className="space-y-4">
        <GroupFormFields
          values={values}
          onChange={handleChange}
          managers={managers}
          disabled={loading}
          showManagerField={requireManager}
          managerHint={requireManager ? undefined : 'Essa equipe sera criada com o gestor logado como responsavel.'}
        />

        {error && (
          <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-600">
            {error}
          </div>
        )}
      </form>
    </Dialog>
  );
}
