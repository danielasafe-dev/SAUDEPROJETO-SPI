import { useState, type ReactNode } from 'react';
import { ClipboardList } from 'lucide-react';
import Dialog from '@/shared/components/dialog/Dialog';
import type { Patient } from '@/types';
import {
  formatBrazilianState,
  formatCep,
  formatCpf,
  formatDate,
  formatPatientAddress,
  formatPatientSex,
  formatPhone,
  getPatientAgeLabel,
} from '../utils/patientUtils';
import PatientEvaluationsDialog from './PatientEvaluationsDialog';

interface PatientDetailsDialogProps {
  patient: Patient | null;
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

function InfoSection({
  title,
  description,
  children,
}: {
  title: string;
  description: string;
  children: ReactNode;
}) {
  return (
    <section className="space-y-3">
      <div>
        <h4 className="text-sm font-semibold text-gray-900">{title}</h4>
        <p className="text-xs text-gray-500">{description}</p>
      </div>
      {children}
    </section>
  );
}

export default function PatientDetailsDialog({
  patient,
  open,
  onClose,
}: PatientDetailsDialogProps) {
  const [evaluationsOpen, setEvaluationsOpen] = useState(false);

  const handleClose = () => {
    setEvaluationsOpen(false);
    onClose();
  };

  return (
    <>
      <Dialog
        isOpen={open}
        onClose={handleClose}
        title="Detalhes do paciente"
        description="Confira os dados principais e informacoes de acompanhamento do paciente."
        size="lg"
        footer={
          <>
            <button
              type="button"
              onClick={() => setEvaluationsOpen(true)}
              disabled={!patient}
              className="inline-flex items-center gap-2 rounded-lg border border-blue-200 px-4 py-2 text-sm font-medium text-blue-700 transition hover:bg-blue-50 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <ClipboardList className="h-4 w-4" />
              Ver avaliacoes
            </button>
            <button
              type="button"
              onClick={handleClose}
              className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 transition hover:bg-gray-50"
            >
              Fechar
            </button>
          </>
        }
      >
        {patient && (
          <div className="space-y-6">
            <InfoSection
              title="Dados principais"
              description="Informacoes cadastrais exibidas na listagem e utilizadas no atendimento."
            >
              <div className="grid gap-4 md:grid-cols-2">
                <InfoRow label="Nome completo" value={patient.nome} />
                <InfoRow label="CPF" value={formatCpf(patient.cpf)} />
                <InfoRow label="Data de nascimento" value={formatDate(patient.data_nascimento)} />
                <InfoRow label="Idade" value={getPatientAgeLabel(patient)} />
                <InfoRow label="Sexo" value={formatPatientSex(patient.sexo)} />
                <InfoRow label="Responsavel" value={patient.nome_responsavel || 'Nao informado'} />
                <InfoRow label="Telefone" value={formatPhone(patient.telefone)} />
                <InfoRow label="E-mail" value={patient.email || 'Nao informado'} />
                <InfoRow label="Equipe" value={patient.group_nome || 'Nao informado'} />
                <InfoRow label="Cadastro" value={formatDate(patient.criado_em)} />
                <InfoRow label="Observacoes" value={patient.observacoes || 'Nao informado'} />
                <InfoRow label="Identificador" value={`#${patient.id}`} />
              </div>
            </InfoSection>

            <InfoSection
              title="Endereco"
              description="Dados de localizacao informados para contato e acompanhamento."
            >
              <div className="grid gap-4 md:grid-cols-2">
                <InfoRow label="CEP" value={formatCep(patient.cep)} />
                <InfoRow label="Estado" value={formatBrazilianState(patient.estado)} />
                <InfoRow label="Cidade" value={patient.cidade || 'Nao informado'} />
                <InfoRow label="Bairro" value={patient.bairro || 'Nao informado'} />
                <InfoRow label="Rua" value={patient.rua || 'Nao informado'} />
                <InfoRow label="Numero" value={patient.numero || 'Nao informado'} />
                <div className="md:col-span-2">
                  <InfoRow label="Complemento" value={patient.complemento || 'Nao informado'} />
                </div>
                <div className="md:col-span-2">
                  <InfoRow label="Endereco completo" value={formatPatientAddress(patient)} />
                </div>
              </div>
            </InfoSection>
          </div>
        )}
      </Dialog>

      <PatientEvaluationsDialog
        patient={patient}
        open={evaluationsOpen && patient !== null}
        onClose={() => setEvaluationsOpen(false)}
      />
    </>
  );
}
