import { useState, useEffect } from 'react';
import { calcScore, getClassification } from '../utils/scoring';
import type { EvaluationAnswers, Question } from '../types';
import QuestionCard from '../components/QuestionCard';
import ScoreChart from '../components/ScoreChart';
import { createEvaluation } from '@/domains/dashboard/api';
import { getForms } from '@/domains/forms/api';
import type { Formulario } from '@/domains/forms/types';
import Dialog from '@/shared/components/dialog/Dialog';
import { getGroups } from '@/domains/groups/api';
import type { Group } from '@/domains/groups/types';
import { createPatient, getReusablePatients, type CreatePatientInput } from '@/domains/patients/api';
import PatientCreateDialog from '@/domains/patients/components/dialogs/PatientCreateDialog';
import type { Patient } from '@/types';
import { SPI_QUESTIONS } from '../utils/questions';
import EvaluationReferralDecision from '../components/EvaluationReferralDecision';

interface EvaluationFormPageProps {
  embedded?: boolean;
  onCancel?: () => void;
}

interface ResultData {
  evaluationId: string;
  score: number;
  pesoTotal: number;
  classification: string;
  color: string;
  cls: string;
  answers: Record<string, number>;
  questions: { id: string; name: string }[];
}
const DEFAULT_FORM_ID = 'default';

export default function EvaluationFormPage({ embedded = false, onCancel }: EvaluationFormPageProps) {
  const [formularios, setFormularios] = useState<Formulario[]>([]);
  const [groups, setGroups] = useState<Group[]>([]);
  const [selectedFormId, setSelectedFormId] = useState<string | null>(null);
  const [activeQuestions, setActiveQuestions] = useState<Question[]>([]);
  const [formIdToSend, setFormIdToSend] = useState<string | undefined>(undefined);

  const [mode, setMode] = useState<'existing' | 'new'>('existing');
  const [existingPatientId, setExistingPatientId] = useState<string | null>(null);
  const [createdPatient, setCreatedPatient] = useState<Patient | null>(null);
  const [selectedGroupId, setSelectedGroupId] = useState<string | null>(null);
  const [patientDialogOpen, setPatientDialogOpen] = useState(false);
  const [answers, setAnswers] = useState<EvaluationAnswers>({});
  const [observations, setObservations] = useState('');
  const [observationsManuallyEdited, setObservationsManuallyEdited] = useState(false);
  const [copyFeedback, setCopyFeedback] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [resultData, setResultData] = useState<ResultData | null>(null);

  useEffect(() => {
    getForms().catch(() => []).then(setFormularios);
    getGroups()
      .catch(() => [])
      .then((items) => {
        setGroups(items);
        if (items.length === 1) {
          setSelectedGroupId(items[0].id);
        }
      });
  }, []);

  function selectForm(formId: string) {
    setSelectedFormId(formId);
    setAnswers({});
    setError('');
    setObservations('');
    setObservationsManuallyEdited(false);
    setCopyFeedback('');

    if (formId === DEFAULT_FORM_ID) {
      setActiveQuestions(SPI_QUESTIONS);
      setFormIdToSend(undefined);
    } else {
      const form = formularios.find((f) => f.id === formId);
      if (form) {
        if (form.groupId) {
          setSelectedGroupId(form.groupId);
        }
        const questions: Question[] = form.perguntas
          .sort((a, b) => a.ordem - b.ordem)
          .map((p, idx) => {
            const maxScore = Math.max(2, Math.round(p.peso));
            return {
              id: p.id ?? String(idx + 1),
              ordem: p.ordem || idx + 1,
              name: p.texto,
              options: Array.from({ length: maxScore }, (_, i) => ({
                score: i + 1,
                text: i === 0 ? 'Nao apresenta' : i === maxScore - 1 ? 'Sempre apresenta' : `Nivel ${i + 1}`,
              })),
            };
          });
        setActiveQuestions(questions);
        setFormIdToSend(formId);
      }
    }
  }

  function closeResult() {
    setResultData(null);
    onCancel?.();
  }

  const total = activeQuestions.length;
  const answered = Object.keys(answers).length;
  const progress = total > 0 ? (answered / total) * 100 : 0;
  const currentScore = calcScore(answers);
  const currentPesoTotal = activeQuestions.reduce(
    (sum, question) => sum + Math.max(...question.options.map((option) => option.score), 0),
    0
  );
  const selectedForm = formularios.find((f) => f.id === selectedFormId);
  const currentClassification = getObservationClassification(
    currentScore,
    [...(selectedForm?.faixas ?? [])].sort((a, b) => a.scoreMin - b.scoreMin)
  );

  useEffect(() => {
    if (total === 0 || answered < total || observationsManuallyEdited) {
      return;
    }

    setObservations(buildObservationSuggestion(currentScore, currentPesoTotal, currentClassification, answers, activeQuestions));
  }, [answered, total, currentScore, currentPesoTotal, currentClassification, observationsManuallyEdited, answers, activeQuestions]);

  const handleGenerateObservation = () => {
    setObservations(buildObservationSuggestion(currentScore, currentPesoTotal, currentClassification, answers, activeQuestions));
    setObservationsManuallyEdited(false);
    setCopyFeedback('');
  };

  const handleCopyObservation = async () => {
    if (!observations.trim()) {
      return;
    }

    try {
      await navigator.clipboard.writeText(observations);
      setCopyFeedback('Texto copiado');
    } catch {
      setCopyFeedback('Nao foi possivel copiar');
    }
  };

  const handleSubmit = async () => {
    if (mode === 'existing' && !existingPatientId) {
      setError('Selecione um paciente existente.');
      return;
    }
    if (mode === 'new') {
      setError('Cadastre e selecione o novo paciente antes de salvar a avaliacao.');
      return;
    }
    if (answered < total) {
      setError(`Faltam ${total - answered} questao(oes) para responder.`);
      return;
    }
    if (!selectedGroupId) {
      setError('Selecione a equipe responsavel por esta avaliacao.');
      return;
    }

    setError('');
    setLoading(true);
    try {
      const created = await createEvaluation({
        patientId: existingPatientId!,
        respostas: answers,
        formId: formIdToSend,
        groupId: selectedGroupId,
        observacoes: observations.trim() || undefined,
      });
      const score = Number(created.scoreTotal);
      const pesoTotal = Number(created.pesoTotal);
      const form = formularios.find((f) => f.id === selectedFormId);
      const faixas = [...(form?.faixas ?? [])].sort((a, b) => a.scoreMin - b.scoreMin);
      let classification: string;
      let color: string;
      let cls: string;
      if (faixas.length > 0) {
        const idx = faixas.findIndex((f) => score >= f.scoreMin && score <= f.scoreMax);
        const pos = idx === -1 ? faixas.length - 1 : idx;
        classification = faixas[pos]?.rotulo ?? created.classificacao;
        if (pos === 0) { color = '#16a34a'; cls = 'not-tea'; }
        else if (pos === faixas.length - 1) { color = '#dc2626'; cls = 'tea-grave'; }
        else { color = '#ca8a04'; cls = 'tea-leve'; }
      } else {
        const result = getClassification(score);
        classification = result.classification;
        color = result.color;
        cls = result.cls;
      }
      const questions = activeQuestions.map((q) => ({ id: q.id, name: q.name }));
      setResultData({ evaluationId: created.id, score, pesoTotal, classification, color, cls, answers, questions });
    } catch {
      setError('Erro ao salvar avaliacao');
    } finally {
      setLoading(false);
    }
  };

  const handleCreatePatient = async (data: CreatePatientInput) => {
    const patient = await createPatient(data);
    setCreatedPatient(patient);
    setExistingPatientId(patient.id);
    setMode('existing');

    if (!selectedGroupId && patient.group_id) {
      setSelectedGroupId(patient.group_id);
    }
  };

  // Passo 1 — selecionar formulario
  if (selectedFormId === null) {
    return (
      <div className={embedded ? 'space-y-4' : 'mx-auto max-w-3xl space-y-5'}>
        {!embedded && (
          <div>
            <h2 className="text-xl font-bold">Nova Avaliacao</h2>
            <p className="text-sm text-gray-500">Selecione o formulario a ser utilizado</p>
          </div>
        )}

        <div className="rounded-xl border border-gray-200 bg-white p-5 space-y-3">
          <h3 className="text-sm font-semibold text-gray-700">Formulario de avaliacao</h3>

          {formularios.length === 0 ? (
            <p className="text-sm text-gray-400 text-center py-4">
              Nenhum formulario disponivel. Importe um formulario na secao Formularios.
            </p>
          ) : (
            <div className="space-y-2">
              {formularios.map((f) => (
                <button
                  key={f.id}
                  type="button"
                  onClick={() => selectForm(f.id)}
                  className="w-full rounded-lg border border-gray-200 bg-white px-4 py-3 text-left transition hover:border-blue-300 hover:bg-blue-50"
                >
                  <p className="text-sm font-semibold text-gray-800">{f.nome}</p>
                  <p className="text-xs text-gray-400 mt-0.5">
                    {f.perguntas.length} questoes
                    {f.groupNome ? ` · ${f.groupNome}` : ''}
                    {f.descricao ? ` · ${f.descricao}` : ''}
                  </p>
                </button>
              ))}
            </div>
          )}
        </div>

        {embedded && onCancel && (
          <div className="flex justify-end">
            <button
              type="button"
              onClick={onCancel}
              className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
            >
              Cancelar
            </button>
          </div>
        )}
      </div>
    );
  }

  const clsBg = resultData?.cls === 'not-tea'
    ? 'bg-green-100 text-green-700'
    : resultData?.cls === 'tea-leve'
      ? 'bg-amber-100 text-amber-700'
      : 'bg-red-100 text-red-700';

  // Passo 2 — paciente + perguntas juntos
  return (
    <>
      <Dialog
        isOpen={resultData !== null}
        onClose={closeResult}
        title="Resultado da Avaliacao"
        size="xl"
      >
        {resultData && (
          <div className="space-y-5">
            <div className="rounded-xl border border-gray-200 bg-white p-8 text-center">
              <p className="mb-2 text-sm text-gray-500">Pontuacao Total (max. {resultData.pesoTotal})</p>
              <p className="text-5xl font-extrabold" style={{ color: resultData.color }}>
                {resultData.score}
              </p>
              <p className={`mt-3 inline-block rounded-full px-4 py-2 text-sm font-bold ${clsBg}`}>
                {resultData.score}/{resultData.pesoTotal} — {resultData.classification}
              </p>
            </div>

            <ScoreChart respostas={resultData.answers} questions={resultData.questions} />

            <EvaluationReferralDecision evaluationId={resultData.evaluationId} />

            <div className="rounded-xl border border-gray-200 bg-white p-4">
              <h3 className="mb-3 text-sm font-semibold text-gray-700">Detalhamento por Dimensao</h3>
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4">
                {resultData.questions.map((q, idx) => {
                  const v = resultData.answers[q.id] || 0;
                  const labels = ['Normal', 'Leve', 'Moderado', 'Grave'];
                  return (
                    <div key={q.id} className="flex items-center gap-2 rounded-lg bg-gray-50 p-2">
                      <span className="w-5 text-xs font-bold text-gray-500">#{idx + 1}</span>
                      <span className={`flex h-6 w-8 flex-shrink-0 items-center justify-center rounded-full text-xs font-bold text-white ${
                        v <= 2 ? 'bg-green-500' : v === 3 ? 'bg-amber-500' : 'bg-red-500'
                      }`}>
                        {v}
                      </span>
                      <span className="truncate text-xs" title={q.name}>{q.name}</span>
                      <span className="ml-auto text-xs text-gray-400">{labels[v - 1]}</span>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="flex justify-end">
              <button
                type="button"
                onClick={closeResult}
                className="rounded-lg bg-blue-600 px-6 py-2 text-sm font-medium text-white hover:bg-blue-700"
              >
                Fechar
              </button>
            </div>
          </div>
        )}
      </Dialog>

      <div className={embedded ? 'space-y-5' : 'mx-auto max-w-3xl space-y-5'}>
        {/* Cabecalho */}
        <div className="flex items-center justify-between">
          <div>
            {!embedded && <h2 className="text-xl font-bold">Nova Avaliacao</h2>}
            <p className="text-sm text-gray-500">
              {formularios.find((f) => f.id === selectedFormId)?.nome}
              {' '}·{' '}
              <button
                type="button"
                onClick={() => { setSelectedFormId(null); setAnswers({}); setObservations(''); setObservationsManuallyEdited(false); setCopyFeedback(''); setError(''); }}
                className="text-blue-600 hover:underline"
              >
                trocar formulario
              </button>
            </p>
          </div>
          <div className="text-sm font-medium text-gray-500">{answered}/{total}</div>
        </div>

        {/* Barra de progresso */}
        <div className="h-2 w-full rounded-full bg-gray-200">
          <div
            className="h-2 rounded-full bg-blue-600 transition-all duration-300"
            style={{ width: `${progress}%` }}
          />
        </div>

        {/* Paciente */}
        <div className="grid grid-cols-2 gap-2 rounded-xl border border-gray-200 bg-gray-50 p-1">
          <button
            type="button"
            onClick={() => { setMode('existing'); setError(''); }}
            className={`rounded-lg px-3 py-2 text-sm font-semibold transition ${
              mode === 'existing'
                ? 'bg-white text-blue-700 shadow-sm'
                : 'text-gray-600 hover:bg-white/70'
            }`}
          >
            Paciente existente
          </button>
          <button
            type="button"
            onClick={() => { setMode('new'); setError(''); setPatientDialogOpen(true); }}
            className={`rounded-lg px-3 py-2 text-sm font-semibold transition ${
              mode === 'new'
                ? 'bg-white text-blue-700 shadow-sm'
                : 'text-gray-600 hover:bg-white/70'
            }`}
          >
            Novo paciente
          </button>
        </div>

        {mode === 'existing' ? (
          <ExistingPatientSelector value={existingPatientId} createdPatient={createdPatient} onChange={setExistingPatientId} />
        ) : (
          <div className="rounded-lg border border-dashed border-blue-200 bg-blue-50 p-4">
            <p className="text-sm font-semibold text-blue-800">Cadastrar paciente durante a avaliacao</p>
            <p className="mt-1 text-xs text-blue-700">O cadastro sera salvo normalmente e tambem aparecera na tela de pacientes.</p>
            <button
              type="button"
              onClick={() => setPatientDialogOpen(true)}
              className="mt-3 rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-blue-700"
            >
              Abrir cadastro de paciente
            </button>
          </div>
        )}

        <div className="space-y-1">
          <label className="block text-sm font-medium text-gray-700">Equipe responsavel pela avaliacao</label>
          <select
            value={selectedGroupId ?? ''}
            onChange={(event) => setSelectedGroupId(event.target.value || null)}
            className="w-full rounded-lg border border-gray-300 px-3 py-2 outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">Selecione a equipe</option>
            {groups.map((group) => (
              <option key={group.id} value={group.id}>
                {group.nome}
              </option>
            ))}
          </select>
          <p className="text-xs text-gray-500">O paciente pode ser reutilizado, mas a avaliacao ficara vinculada a esta equipe.</p>
        </div>

        {/* Perguntas */}
        <div className="space-y-3">
          {activeQuestions.map((q, idx) => (
            <QuestionCard
              key={q.id}
              question={q}
              displayNumber={idx + 1}
              value={answers[q.id] as number | undefined}
              onChange={(score) => setAnswers((prev) => ({ ...prev, [q.id]: score }))}
            />
          ))}
        </div>

        <div className="rounded-xl border border-gray-200 bg-white p-5">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <label className="block text-sm font-semibold text-gray-700">Observacao do avaliador</label>
              <p className="mt-1 text-xs text-gray-500">
                Texto sugerido automaticamente com base na pontuacao. Pode ser editado antes de salvar.
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={handleGenerateObservation}
                disabled={answered < total}
                className="rounded-lg border border-blue-200 px-3 py-1.5 text-xs font-semibold text-blue-700 transition hover:bg-blue-50 disabled:cursor-not-allowed disabled:opacity-50"
              >
                Gerar texto
              </button>
              <button
                type="button"
                onClick={handleCopyObservation}
                disabled={!observations.trim()}
                className="rounded-lg border border-gray-300 px-3 py-1.5 text-xs font-semibold text-gray-700 transition hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
              >
                Copiar
              </button>
            </div>
          </div>
          {answered < total ? (
            <p className="mt-3 rounded-lg bg-amber-50 px-3 py-2 text-xs font-medium text-amber-800">
              Responda todas as perguntas para gerar a sugestao completa.
            </p>
          ) : null}
          <textarea
            value={observations}
            onChange={(event) => {
              setObservations(event.target.value.slice(0, 2000));
              setObservationsManuallyEdited(true);
              setCopyFeedback('');
            }}
            rows={7}
            className="mt-2 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="Registre aqui algo relevante que nao entrou nas perguntas da avaliacao."
          />
          <div className="mt-1 flex items-center justify-between gap-3 text-xs">
            <span className={copyFeedback.includes('copiado') ? 'text-green-600' : 'text-gray-400'}>
              {copyFeedback}
            </span>
            <span className="text-gray-400">{observations.length}/2000</span>
          </div>
        </div>

        {error && (
          <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600">
            {error}
          </div>
        )}

        <div className={`flex ${embedded ? 'justify-end gap-3 pb-2' : 'justify-center pb-8'}`}>
          {embedded && onCancel && (
            <button
              type="button"
              onClick={onCancel}
              disabled={loading}
              className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
            >
              Cancelar
            </button>
          )}
          <button
            type="button"
            onClick={handleSubmit}
            disabled={loading}
            className="rounded-xl bg-green-600 px-8 py-3 text-sm font-semibold text-white shadow-lg shadow-green-600/20 transition hover:bg-green-700 disabled:opacity-50"
          >
            {loading ? 'Salvando...' : 'Salvar Avaliacao'}
          </button>
        </div>
      </div>

      <PatientCreateDialog
        open={patientDialogOpen}
        onClose={() => setPatientDialogOpen(false)}
        groups={groups}
        defaultGroupId={selectedGroupId ? String(selectedGroupId) : groups.length === 1 ? String(groups[0].id) : ''}
        requireGroupSelection={groups.length > 0}
        onSubmit={handleCreatePatient}
      />
    </>
  );
}

function getObservationClassification(
  score: number,
  ranges: { scoreMin: number; scoreMax: number; rotulo: string }[]
) {
  if (ranges.length > 0) {
    const match = ranges.find((range) => score >= range.scoreMin && score <= range.scoreMax);
    return match?.rotulo ?? ranges.at(-1)?.rotulo ?? getClassification(score).classification;
  }

  return getClassification(score).classification;
}

function buildObservationSuggestion(
  score: number,
  pesoTotal: number,
  classification: string,
  answers: EvaluationAnswers,
  questions: Question[]
) {
  const normalizedClassification = classification.toLocaleLowerCase('pt-BR');
  const intensityText = normalizedClassification.includes('grave')
    ? 'maior intensidade de sinais no instrumento aplicado'
    : normalizedClassification.includes('leve') || normalizedClassification.includes('moderado')
      ? 'presenca de sinais em intensidade leve a moderada no instrumento aplicado'
      : 'baixa intensidade de sinais no instrumento aplicado';

  const highlightedDimensions = questions
    .map((question) => ({
      name: question.name,
      score: answers[question.id] ?? 0,
    }))
    .filter((item) => item.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, 3)
    .map((item) => `${item.name} (${item.score})`);

  const dimensionsText = highlightedDimensions.length > 0
    ? `Os maiores escores apareceram em: ${highlightedDimensions.join(', ')}.`
    : 'Nao ha dimensoes destacadas ate o momento.';

  return [
    `A avaliacao apresentou pontuacao total de ${score}/${pesoTotal}, com classificacao "${classification}".`,
    `De forma geral, o resultado sugere ${intensityText}.`,
    dimensionsText,
    'Este texto e uma observacao generica de apoio ao registro e nao substitui analise clinica, historico do paciente, observacao direta ou avaliacao multiprofissional.',
    'Recomenda-se correlacionar a pontuacao com os dados coletados durante o atendimento e registrar condutas conforme o fluxo da equipe.',
  ].join('\n\n');
}

function ExistingPatientSelector({
  value,
  createdPatient,
  onChange,
}: {
  value: string | null;
  createdPatient: Patient | null;
  onChange: (id: string) => void;
}) {
  const [patients, setPatients] = useState<Patient[]>([]);
  const [show, setShow] = useState(false);
  const [search, setSearch] = useState('');

  useEffect(() => {
    getReusablePatients().then(setPatients);
  }, []);

  useEffect(() => {
    if (!createdPatient) return;
    setPatients((current) => {
      const withoutDuplicate = current.filter((patient) => patient.id !== createdPatient.id);
      return [createdPatient, ...withoutDuplicate];
    });
  }, [createdPatient]);

  const filtered = patients.filter((p) => p.nome.toLowerCase().includes(search.toLowerCase()));
  const selected = patients.find((p) => p.id === value);

  return (
    <div className="relative">
      <input
        value={selected?.nome || search}
        onChange={(e) => { setSearch(e.target.value); setShow(true); }}
        onFocus={() => setShow(true)}
        onBlur={() => setTimeout(() => setShow(false), 200)}
        className="w-full rounded-lg border border-gray-300 px-3 py-2 outline-none focus:ring-2 focus:ring-blue-500"
        placeholder="Buscar paciente..."
      />
      {show && (
        <div className="absolute z-10 mt-1 max-h-44 w-full overflow-auto rounded-lg border border-gray-200 bg-white shadow-lg">
          {filtered.length === 0 && (
            <div className="p-3 text-center text-sm text-gray-400">Nenhum paciente encontrado</div>
          )}
          {filtered.map((p) => (
            <button
              key={p.id}
              type="button"
              className={`w-full px-3 py-2 text-left text-sm hover:bg-blue-50 ${p.id === value ? 'bg-blue-50 font-medium text-blue-700' : ''}`}
              onMouseDown={() => { onChange(p.id); setShow(false); setSearch(''); }}
            >
              {p.nome}{p.idade ? ` — ${p.idade} anos` : ''}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
