import type { Group } from '@/domains/groups/types';
import type { PatientFormValues } from '../../types';
import { brazilianStateOptions, patientSexOptions } from '../utils/patientUtils';

interface PatientFormFieldsProps {
  values: PatientFormValues;
  onChange: (field: keyof PatientFormValues, value: string) => void;
  onCepBlur?: () => void;
  groups?: Group[];
  showGroupField?: boolean;
  disabled?: boolean;
  cepLookupLoading?: boolean;
  cepLookupMessage?: string;
  cepLookupTone?: 'neutral' | 'success' | 'error';
}

function FieldLabel({
  children,
  required = false,
}: {
  children: string;
  required?: boolean;
}) {
  return (
    <label className="mb-1 block text-sm font-medium">
      {children}
      {required && (
        <span className="ml-1 text-red-500" aria-hidden="true">
          *
        </span>
      )}
    </label>
  );
}

export default function PatientFormFields({
  values,
  onChange,
  onCepBlur,
  groups = [],
  showGroupField = false,
  disabled = false,
  cepLookupLoading = false,
  cepLookupMessage = '',
  cepLookupTone = 'neutral',
}: PatientFormFieldsProps) {
  const cepMessageClassName =
    cepLookupTone === 'error'
      ? 'text-red-600'
      : cepLookupTone === 'success'
        ? 'text-green-600'
        : 'text-gray-500';

  return (
    <div className="grid gap-4 md:grid-cols-2">
      <div className="md:col-span-2">
        <FieldLabel required>Nome completo</FieldLabel>
        <input
          value={values.nome}
          onChange={(event) => onChange('nome', event.target.value)}
          required
          disabled={disabled}
          className="w-full rounded-lg border border-gray-300 px-3 py-2 outline-none focus:ring-2 focus:ring-blue-500 disabled:cursor-not-allowed disabled:bg-gray-100"
          placeholder="Nome completo do paciente"
        />
      </div>

      <div>
        <FieldLabel required>CPF</FieldLabel>
        <input
          value={values.cpf}
          onChange={(event) => onChange('cpf', event.target.value)}
          required
          disabled={disabled}
          className="w-full rounded-lg border border-gray-300 px-3 py-2 outline-none focus:ring-2 focus:ring-blue-500 disabled:cursor-not-allowed disabled:bg-gray-100"
          placeholder="000.000.000-00"
        />
      </div>

      <div>
        <FieldLabel required>Data de nascimento</FieldLabel>
        <input
          type="date"
          value={values.dataNascimento}
          onChange={(event) => onChange('dataNascimento', event.target.value)}
          required
          disabled={disabled}
          className="w-full rounded-lg border border-gray-300 px-3 py-2 outline-none focus:ring-2 focus:ring-blue-500 disabled:cursor-not-allowed disabled:bg-gray-100"
        />
      </div>

      <div>
        <FieldLabel required>Sexo</FieldLabel>
        <select
          value={values.sexo}
          onChange={(event) => onChange('sexo', event.target.value)}
          required
          disabled={disabled}
          className="w-full rounded-lg border border-gray-300 px-3 py-2 outline-none focus:ring-2 focus:ring-blue-500 disabled:cursor-not-allowed disabled:bg-gray-100"
        >
          <option value="">Selecione o sexo</option>
          {patientSexOptions.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </div>

      <div>
        <FieldLabel>Nome do responsavel</FieldLabel>
        <input
          value={values.nomeResponsavel}
          onChange={(event) => onChange('nomeResponsavel', event.target.value)}
          disabled={disabled}
          className="w-full rounded-lg border border-gray-300 px-3 py-2 outline-none focus:ring-2 focus:ring-blue-500 disabled:cursor-not-allowed disabled:bg-gray-100"
          placeholder="Nome do responsavel"
        />
      </div>

      <div>
        <label className="mb-1 block text-sm font-medium">Telefone</label>
        <input
          value={values.telefone}
          onChange={(event) => onChange('telefone', event.target.value)}
          disabled={disabled}
          className="w-full rounded-lg border border-gray-300 px-3 py-2 outline-none focus:ring-2 focus:ring-blue-500 disabled:cursor-not-allowed disabled:bg-gray-100"
          placeholder="(00) 00000-0000"
        />
      </div>

      {showGroupField && (
        <div className="md:col-span-2">
          <FieldLabel required>Equipe</FieldLabel>
          <select
            value={values.groupId}
            onChange={(event) => onChange('groupId', event.target.value)}
            required
            disabled={disabled}
            className="w-full rounded-lg border border-gray-300 px-3 py-2 outline-none focus:ring-2 focus:ring-blue-500 disabled:cursor-not-allowed disabled:bg-gray-100"
          >
            <option value="">Selecione a equipe</option>
            {groups.map((group) => (
              <option key={group.id} value={String(group.id)}>
                {group.nome}
              </option>
            ))}
          </select>
        </div>
      )}

      <div className="md:col-span-2">
        <FieldLabel>E-mail</FieldLabel>
        <input
          type="email"
          value={values.email}
          onChange={(event) => onChange('email', event.target.value)}
          disabled={disabled}
          className="w-full rounded-lg border border-gray-300 px-3 py-2 outline-none focus:ring-2 focus:ring-blue-500 disabled:cursor-not-allowed disabled:bg-gray-100"
          placeholder="paciente@exemplo.com"
        />
      </div>

      <div className="md:col-span-2 border-t border-gray-200 pt-2">
        <p className="text-sm font-semibold text-gray-900">Endereco</p>
        <p className="text-xs text-gray-500">Preencha os dados de localizacao do paciente, se houver.</p>
      </div>

      <div>
        <FieldLabel>CEP</FieldLabel>
        <input
          value={values.cep}
          onChange={(event) => onChange('cep', event.target.value)}
          onBlur={onCepBlur}
          disabled={disabled}
          className="w-full rounded-lg border border-gray-300 px-3 py-2 outline-none focus:ring-2 focus:ring-blue-500 disabled:cursor-not-allowed disabled:bg-gray-100"
          placeholder="00000-000"
        />
        {(cepLookupLoading || cepLookupMessage) && (
          <p className={`mt-1 text-xs ${cepMessageClassName}`}>
            {cepLookupLoading ? 'Buscando endereco pelo CEP...' : cepLookupMessage}
          </p>
        )}
      </div>

      <div>
        <FieldLabel>Estado</FieldLabel>
        <select
          value={values.estado}
          onChange={(event) => onChange('estado', event.target.value)}
          disabled={disabled}
          className="w-full rounded-lg border border-gray-300 px-3 py-2 outline-none focus:ring-2 focus:ring-blue-500 disabled:cursor-not-allowed disabled:bg-gray-100"
        >
          <option value="">Selecione a UF</option>
          {brazilianStateOptions.map((state) => (
            <option key={state.value} value={state.value}>
              {state.label}
            </option>
          ))}
        </select>
      </div>

      <div>
        <FieldLabel>Cidade</FieldLabel>
        <input
          value={values.cidade}
          onChange={(event) => onChange('cidade', event.target.value)}
          disabled={disabled}
          className="w-full rounded-lg border border-gray-300 px-3 py-2 outline-none focus:ring-2 focus:ring-blue-500 disabled:cursor-not-allowed disabled:bg-gray-100"
          placeholder="Cidade"
        />
      </div>

      <div>
        <FieldLabel>Bairro</FieldLabel>
        <input
          value={values.bairro}
          onChange={(event) => onChange('bairro', event.target.value)}
          disabled={disabled}
          className="w-full rounded-lg border border-gray-300 px-3 py-2 outline-none focus:ring-2 focus:ring-blue-500 disabled:cursor-not-allowed disabled:bg-gray-100"
          placeholder="Bairro"
        />
      </div>

      <div>
        <FieldLabel>Rua</FieldLabel>
        <input
          value={values.rua}
          onChange={(event) => onChange('rua', event.target.value)}
          disabled={disabled}
          className="w-full rounded-lg border border-gray-300 px-3 py-2 outline-none focus:ring-2 focus:ring-blue-500 disabled:cursor-not-allowed disabled:bg-gray-100"
          placeholder="Rua"
        />
      </div>

      <div>
        <FieldLabel>Numero</FieldLabel>
        <input
          value={values.numero}
          onChange={(event) => onChange('numero', event.target.value)}
          disabled={disabled}
          className="w-full rounded-lg border border-gray-300 px-3 py-2 outline-none focus:ring-2 focus:ring-blue-500 disabled:cursor-not-allowed disabled:bg-gray-100"
          placeholder="Numero"
        />
      </div>

      <div className="md:col-span-2">
        <FieldLabel>Complemento</FieldLabel>
        <input
          value={values.complemento}
          onChange={(event) => onChange('complemento', event.target.value)}
          disabled={disabled}
          className="w-full rounded-lg border border-gray-300 px-3 py-2 outline-none focus:ring-2 focus:ring-blue-500 disabled:cursor-not-allowed disabled:bg-gray-100"
          placeholder="Apartamento, bloco, ponto de referencia"
        />
      </div>

      <div className="md:col-span-2">
        <FieldLabel>Observacoes</FieldLabel>
        <textarea
          value={values.observacoes}
          onChange={(event) => onChange('observacoes', event.target.value)}
          disabled={disabled}
          rows={4}
          className="w-full rounded-lg border border-gray-300 px-3 py-2 outline-none focus:ring-2 focus:ring-blue-500 disabled:cursor-not-allowed disabled:bg-gray-100"
          placeholder="Informacoes complementares relevantes"
        />
      </div>
    </div>
  );
}
