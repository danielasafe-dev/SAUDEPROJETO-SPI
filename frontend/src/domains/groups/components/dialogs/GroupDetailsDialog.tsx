import Dialog from '@/shared/components/dialog/Dialog';
import type { Group } from '../../types';
import {
  formatGroupDate,
  getGroupStatusLabel,
} from '../utils/groupUtils';

interface GroupDetailsDialogProps {
  group: Group | null;
  open: boolean;
  onClose: () => void;
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-gray-200 bg-gray-50 px-4 py-3">
      <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">{label}</p>
      <div className="mt-1 text-sm text-gray-800">{value}</div>
    </div>
  );
}

export default function GroupDetailsDialog({
  group,
  open,
  onClose,
}: GroupDetailsDialogProps) {
  return (
    <Dialog
      isOpen={open}
      onClose={onClose}
      title="Detalhes da equipe"
      description="Confira os dados principais da equipe sem editar as informacoes."
      size="lg"
      footer={
        <button
          type="button"
          onClick={onClose}
          className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 transition hover:bg-gray-50"
        >
          Fechar
        </button>
      }
    >
      {group && (
        <div className="grid gap-4 md:grid-cols-2">
          <InfoRow label="Nome da equipe" value={group.nome} />
          <InfoRow label="Gestor responsavel" value={group.gestor_nome || 'Nao informado'} />
          <InfoRow label="Status" value={getGroupStatusLabel(group.ativo)} />
          <InfoRow label="Membros vinculados" value={String(group.quantidade_membros)} />
          <InfoRow label="Cadastro" value={formatGroupDate(group.criado_em)} />
          <InfoRow label="Identificador" value={`#${group.id}`} />
        </div>
      )}
    </Dialog>
  );
}
