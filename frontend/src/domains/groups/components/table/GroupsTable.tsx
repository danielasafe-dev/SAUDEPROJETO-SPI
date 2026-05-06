import { Eye, Pencil, Trash2 } from 'lucide-react';
import type { Group } from '../../types';
import { isAdminDefaultGroup } from '../../utils/systemGroupRules';
import {
  formatGroupDate,
  getGroupStatusBadgeClass,
  getGroupStatusLabel,
} from '../utils/groupUtils';

interface GroupsTableProps {
  groups: Group[];
  onView: (group: Group) => void;
  onEdit: (group: Group) => void;
  onDelete: (group: Group) => void;
}

export default function GroupsTable({
  groups,
  onView,
  onEdit,
  onDelete,
}: GroupsTableProps) {
  if (!groups.length) {
    return (
      <div className="rounded-xl border border-dashed border-gray-300 bg-white px-6 py-10 text-center text-sm text-gray-500">
        Nenhuma equipe encontrada com os filtros atuais.
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-xl border border-gray-200 bg-white">
      <table className="w-full text-sm">
        <thead className="border-b border-gray-200 bg-gray-50">
          <tr>
            <th className="px-4 py-3 text-left font-medium text-gray-600">Equipe</th>
            <th className="px-4 py-3 text-left font-medium text-gray-600">Gestor</th>
            <th className="px-4 py-3 text-left font-medium text-gray-600">Membros</th>
            <th className="px-4 py-3 text-left font-medium text-gray-600">Status</th>
            <th className="px-4 py-3 text-left font-medium text-gray-600">Cadastro</th>
            <th className="px-4 py-3 text-left font-medium text-gray-600">Acoes</th>
          </tr>
        </thead>
        <tbody>
          {groups.map((group) => (
            <tr key={group.id} className="border-b border-gray-100 hover:bg-gray-50">
              <td className="px-4 py-3 font-medium text-gray-900">{group.nome}</td>
              <td className="px-4 py-3 text-gray-600">{group.gestor_nome || 'Nao informado'}</td>
              <td className="px-4 py-3 text-gray-600">{group.quantidade_membros}</td>
              <td className="px-4 py-3">
                <span className={`rounded-full px-2 py-1 text-xs font-bold ${getGroupStatusBadgeClass(group.ativo)}`}>
                  {getGroupStatusLabel(group.ativo)}
                </span>
              </td>
              <td className="px-4 py-3 text-gray-500">{formatGroupDate(group.criado_em)}</td>
              <td className="px-4 py-3">
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => onView(group)}
                    className="inline-flex items-center gap-1 rounded-lg border border-gray-300 px-3 py-1.5 text-xs font-medium text-gray-700 transition hover:bg-gray-50"
                  >
                    <Eye className="h-3.5 w-3.5" />
                    Visualizar
                  </button>
                  {!isAdminDefaultGroup(group) && (
                    <>
                      <button
                        type="button"
                        onClick={() => onEdit(group)}
                        className="inline-flex items-center gap-1 rounded-lg border border-blue-200 px-3 py-1.5 text-xs font-medium text-blue-700 transition hover:bg-blue-50"
                      >
                        <Pencil className="h-3.5 w-3.5" />
                        Editar
                      </button>
                      <button
                        type="button"
                        onClick={() => onDelete(group)}
                        className="inline-flex items-center gap-1 rounded-lg border border-red-200 px-3 py-1.5 text-xs font-medium text-red-700 transition hover:bg-red-50"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                        Excluir
                      </button>
                    </>
                  )}
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
