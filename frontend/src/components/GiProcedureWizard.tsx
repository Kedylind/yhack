import { useState, useCallback, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import {
  GI_PROCEDURE_ROOT_ID,
  getGiNode,
  getPathIdsToLeaf,
  type GiLeafNode,
  type GiProcedureSelection,
  type GiQuestionNode,
} from '@/lib/giDecisionTree';
import { postGiAssistantSuggest, postGiSymptomRefine, type GiSymptomRefineResponse } from '@/api/client';
import { cn } from '@/lib/utils';
import { MessageCircle, Sparkles, Stethoscope } from 'lucide-react';

type Props = {
  value: GiProcedureSelection | null;
  onChange: (sel: GiProcedureSelection | null) => void;
  symptomNotes: string;
  onSymptomNotesChange: (v: string) => void;
};

type ChatTurn = { role: 'user' | 'assistant'; content: string };

type Flow = 'symptoms' | 'tree';

function buildAssistantBubble(res: GiSymptomRefineResponse): string {
  if (res.phase === 'propose') {
    return res.assistant_message.trim();
  }
  return [res.assistant_message, res.next_question].filter(Boolean).join('\n\n').trim();
}

function normalizeChoiceOptions(res: GiSymptomRefineResponse): string[] {
  const raw = res.choice_options ?? [];
  if (!Array.isArray(raw)) return [];
  const out: string[] = [];
  for (const x of raw) {
    if (typeof x !== 'string') continue;
    const s = x.trim();
    if (!s || out.includes(s)) continue;
    out.push(s);
    if (out.length >= 6) break;
  }
  return out;
}

const GiProcedureWizard = ({ value, onChange, symptomNotes, onSymptomNotesChange }: Props) => {
  const [flow, setFlow] = useState<Flow>('symptoms');
  const [nodeId, setNodeId] = useState(GI_PROCEDURE_ROOT_ID);
  const [pathIds, setPathIds] = useState<string[]>([GI_PROCEDURE_ROOT_ID]);

  const [symptomStarted, setSymptomStarted] = useState(false);
  const [sessionMessages, setSessionMessages] = useState<ChatTurn[]>([]);
  const [symptomReply, setSymptomReply] = useState('');
  const [symptomLoading, setSymptomLoading] = useState(false);
  const [symptomError, setSymptomError] = useState<string | null>(null);
  const [symptomQuickReplies, setSymptomQuickReplies] = useState<string[]>([]);
  const [pendingProposal, setPendingProposal] = useState<GiSymptomRefineResponse | null>(null);

  const [stepAiMessage, setStepAiMessage] = useState('');
  const [stepAiUserText, setStepAiUserText] = useState('');
  const [aiRecommendedNextId, setAiRecommendedNextId] = useState<string | null>(null);
  const [aiConfidence, setAiConfidence] = useState<'high' | 'medium' | 'low' | null>(null);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);

  useEffect(() => {
    setStepAiMessage('');
    setStepAiUserText('');
    setAiRecommendedNextId(null);
    setAiConfidence(null);
    setAiError(null);
  }, [nodeId]);

  const applyLeaf = useCallback(
    (leaf: GiLeafNode, fullPath: string[]) => {
      setNodeId(leaf.id);
      setPathIds(fullPath);
      onChange({
        bundleId: leaf.bundleId,
        scenarioId: leaf.scenarioId,
        cptCode: leaf.cptCode,
        title: leaf.title,
        description: leaf.description,
        pathIds: fullPath,
      });
    },
    [onChange],
  );

  const resetTreeNav = useCallback(() => {
    setNodeId(GI_PROCEDURE_ROOT_ID);
    setPathIds([GI_PROCEDURE_ROOT_ID]);
    onChange(null);
  }, [onChange]);

  const resetSymptomSession = useCallback(() => {
    setSymptomStarted(false);
    setSessionMessages([]);
    setSymptomReply('');
    setSymptomError(null);
    setSymptomQuickReplies([]);
    setPendingProposal(null);
  }, []);

  const reset = useCallback(() => {
    setFlow('symptoms');
    resetTreeNav();
    resetSymptomSession();
    setStepAiMessage('');
    setStepAiUserText('');
    setAiRecommendedNextId(null);
    setAiConfidence(null);
    setAiError(null);
  }, [resetTreeNav, resetSymptomSession]);

  const goToTreeMode = useCallback(() => {
    setFlow('tree');
    setPendingProposal(null);
    resetTreeNav();
  }, [resetTreeNav]);

  const executeSymptomRefine = useCallback(
    async (nextMessages: ChatTurn[]): Promise<boolean> => {
      setSymptomLoading(true);
      setSymptomError(null);
      setPendingProposal(null);
      setSymptomQuickReplies([]);
      try {
        const res = await postGiSymptomRefine({
          messages: nextMessages,
          symptom_notes: symptomNotes,
        });
        const assistantContent = buildAssistantBubble(res);
        setSessionMessages([...nextMessages, { role: 'assistant', content: assistantContent }]);
        if (res.phase === 'propose') {
          setPendingProposal(res);
        } else {
          setSymptomQuickReplies(normalizeChoiceOptions(res));
        }
        return true;
      } catch (e: unknown) {
        let msg = e instanceof Error ? e.message : 'Something went wrong.';
        if (msg.includes('503')) {
          msg = 'AI is not available. Try the guided questions below.';
        }
        setSymptomError(msg);
        setSessionMessages(nextMessages);
        return false;
      } finally {
        setSymptomLoading(false);
      }
    },
    [symptomNotes],
  );

  const startSymptomInterview = useCallback(async () => {
    setSymptomError(null);
    const ok = await executeSymptomRefine([]);
    if (ok) setSymptomStarted(true);
  }, [executeSymptomRefine]);

  const sendSymptomReply = useCallback(async () => {
    const text = symptomReply.trim();
    if (!text || symptomLoading) return;
    setSymptomReply('');
    await executeSymptomRefine([...sessionMessages, { role: 'user', content: text }]);
  }, [sessionMessages, symptomReply, symptomLoading, executeSymptomRefine]);

  const pickSymptomChoice = useCallback(
    async (label: string) => {
      if (symptomLoading) return;
      await executeSymptomRefine([...sessionMessages, { role: 'user', content: label }]);
    },
    [sessionMessages, symptomLoading, executeSymptomRefine],
  );

  const acceptProposal = useCallback(() => {
    if (!pendingProposal?.recommended_leaf_id) return;
    const leaf = getGiNode(pendingProposal.recommended_leaf_id);
    if (!leaf || leaf.kind !== 'leaf') return;
    const path = getPathIdsToLeaf(leaf.id);
    if (!path) return;
    applyLeaf(leaf, path);
    setFlow('tree');
    setPendingProposal(null);
  }, [pendingProposal, applyLeaf]);

  const requestAiSuggestion = useCallback(async () => {
    const n = getGiNode(nodeId);
    if (!n || n.kind !== 'question') return;
    setAiLoading(true);
    setAiError(null);
    setAiRecommendedNextId(null);
    setStepAiMessage('');
    try {
      const res = await postGiAssistantSuggest({
        current_node_id: n.id,
        question_prompt: n.prompt,
        hint: n.hint ?? null,
        options: n.options.map(o => ({ label: o.label, nextId: o.nextId })),
        symptom_notes: symptomNotes,
        user_message: stepAiUserText,
      });
      setStepAiMessage(res.assistant_message);
      setAiRecommendedNextId(res.recommended_next_id);
      setAiConfidence(res.confidence);
    } catch (e: unknown) {
      let msg = e instanceof Error ? e.message : 'Could not get a suggestion.';
      if (msg.includes('503')) {
        msg = 'AI assistant is not available. Use the options below to continue—the tree stays the same.';
      }
      setAiError(msg);
    } finally {
      setAiLoading(false);
    }
  }, [nodeId, symptomNotes, stepAiUserText]);

  const goTo = useCallback(
    (nextId: string) => {
      const next = getGiNode(nextId);
      if (!next) return;
      setPathIds(prev => [...prev, nextId]);
      setNodeId(nextId);
      onChange(null);
    },
    [onChange],
  );

  const goBack = useCallback(() => {
    if (pathIds.length <= 1) {
      reset();
      return;
    }
    const nextPath = pathIds.slice(0, -1);
    const prevId = nextPath[nextPath.length - 1];
    setPathIds(nextPath);
    setNodeId(prevId);
    onChange(null);
  }, [pathIds, onChange, reset]);

  const node = getGiNode(nodeId);

  const confirmLeaf = useCallback(
    (leaf: GiLeafNode) => {
      applyLeaf(leaf, [...pathIds]);
    },
    [applyLeaf, pathIds],
  );

  return (
    <div className="space-y-6">
      <div>
        <Label htmlFor="symptom-notes" className="text-base font-semibold">
          Symptoms or goals <span className="text-muted-foreground font-normal">(optional)</span>
        </Label>
        <Textarea
          id="symptom-notes"
          placeholder="e.g. blood in stool, reflux, follow-up after polyp…"
          value={symptomNotes}
          onChange={e => onSymptomNotesChange(e.target.value)}
          className="mt-2 min-h-[72px] resize-y"
        />
        <p className="text-xs text-muted-foreground mt-2">
          We start from what you feel and what you need—billing codes only come in once we narrow things down for your
          estimate.
        </p>
      </div>

      {flow === 'symptoms' && (
        <div className="rounded-2xl border border-border bg-card/50 p-4 space-y-4">
          <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
            <MessageCircle className="w-4 h-4 text-primary" />
            Symptom conversation
          </div>
          <p className="text-xs text-muted-foreground leading-relaxed">
            Short questions—tap a button when you can, or type if you prefer. We narrow to a procedure for your estimate
            only; this isn’t medical advice.
          </p>

          {!symptomStarted && (
            <Button
              type="button"
              className="bg-primary text-primary-foreground hover:bg-primary-hover"
              disabled={symptomLoading}
              onClick={() => void startSymptomInterview()}
            >
              {symptomLoading ? 'Starting…' : 'Start with AI questions'}
            </Button>
          )}

          {symptomError && <p className="text-xs text-destructive">{symptomError}</p>}

          {symptomStarted && sessionMessages.length > 0 && (
            <div className="rounded-xl border border-border bg-background/80 max-h-[min(360px,50vh)] overflow-y-auto p-3 space-y-3">
              {sessionMessages.map((m, i) => (
                <div
                  key={`${i}-${m.role}`}
                  className={cn(
                    'text-sm leading-relaxed rounded-lg px-3 py-2',
                    m.role === 'assistant'
                      ? 'bg-primary/5 border border-primary/10 text-foreground mr-2 sm:mr-6'
                      : 'bg-muted/60 text-foreground ml-2 sm:ml-6',
                  )}
                >
                  <span className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground block mb-1">
                    {m.role === 'assistant' ? 'Assistant' : 'You'}
                  </span>
                  {m.content ? (
                    m.content
                  ) : (
                    <span className="text-muted-foreground italic">…</span>
                  )}
                </div>
              ))}
            </div>
          )}

          {symptomStarted && !pendingProposal && symptomQuickReplies.length > 0 && (
            <div className="space-y-2 animate-fade-in">
              <p className="text-xs font-medium text-foreground">Pick one (fastest)</p>
              <div className="flex flex-wrap gap-2">
                {symptomQuickReplies.map(opt => (
                  <Button
                    key={opt}
                    type="button"
                    variant="secondary"
                    size="sm"
                    disabled={symptomLoading}
                    className="h-auto min-h-9 max-w-full whitespace-normal text-left justify-start py-2.5 px-3 font-normal leading-snug"
                    onClick={() => void pickSymptomChoice(opt)}
                  >
                    {opt}
                  </Button>
                ))}
              </div>
            </div>
          )}

          {pendingProposal?.recommended_leaf_id && (() => {
            const leaf = getGiNode(pendingProposal.recommended_leaf_id!);
            if (!leaf || leaf.kind !== 'leaf') return null;
            return (
              <div className="rounded-xl border border-primary/25 bg-primary/5 p-4 space-y-3 animate-fade-in">
                <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
                  <Sparkles className="w-4 h-4 text-primary shrink-0" />
                  Most likely procedure for your estimate
                </div>
                <p className="text-xs text-muted-foreground">
                  Confidence: <span className="font-medium text-foreground">{pendingProposal.confidence}</span>
                  {pendingProposal.rationale && (
                    <>
                      {' '}
                      · {pendingProposal.rationale}
                    </>
                  )}
                </p>
                <p className="font-semibold text-foreground">{leaf.title}</p>
                <p className="text-sm text-muted-foreground leading-relaxed">{leaf.description}</p>
                <p className="text-xs text-muted-foreground">
                  CPT <span className="font-mono font-medium text-foreground">{leaf.cptCode}</span>
                </p>
                <div className="flex flex-wrap gap-2 pt-1">
                  <Button
                    type="button"
                    size="sm"
                    className="bg-primary text-primary-foreground hover:bg-primary-hover"
                    onClick={acceptProposal}
                  >
                    Use this for estimates
                  </Button>
                  <Button type="button" size="sm" variant="outline" onClick={() => setPendingProposal(null)}>
                    Not quite — say more
                  </Button>
                </div>
              </div>
            );
          })()}

          {symptomStarted && !pendingProposal && (
            <div className="space-y-2">
              <Label htmlFor="symptom-reply" className="text-xs text-muted-foreground">
                {symptomQuickReplies.length > 0 ? 'Or describe in your own words' : 'Your reply'}
              </Label>
              <Textarea
                id="symptom-reply"
                placeholder={
                  symptomQuickReplies.length > 0
                    ? 'Type here if none of the buttons fit…'
                    : 'Answer in your own words…'
                }
                value={symptomReply}
                onChange={e => setSymptomReply(e.target.value)}
                className="min-h-[72px] resize-y text-sm"
                disabled={symptomLoading}
                onKeyDown={e => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    void sendSymptomReply();
                  }
                }}
              />
              <Button
                type="button"
                size="sm"
                className="bg-primary text-primary-foreground hover:bg-primary-hover"
                disabled={symptomLoading || !symptomReply.trim()}
                onClick={() => void sendSymptomReply()}
              >
                {symptomLoading ? 'Sending…' : 'Send'}
              </Button>
            </div>
          )}

          <div className="flex flex-wrap gap-2 pt-1 border-t border-border">
            <Button type="button" variant="outline" size="sm" onClick={goToTreeMode}>
              Pick guided questions yourself
            </Button>
            {symptomStarted && (
              <Button type="button" variant="ghost" size="sm" onClick={resetSymptomSession}>
                Restart symptom chat
              </Button>
            )}
          </div>
        </div>
      )}

      {flow === 'tree' && (
        <div className="rounded-2xl border border-border bg-card/50 p-4 space-y-4">
          <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
            <Stethoscope className="w-4 h-4 text-primary" />
            Guided procedure finder
          </div>
          <p className="text-xs text-muted-foreground">
            Answer step-by-step questions. We map your answers to a CPT code used for hospital price data in this demo.
          </p>

          {node && node.kind === 'question' && (
            <>
              <div className="rounded-xl border border-primary/20 bg-primary/5 p-4 space-y-3">
                <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
                  <Sparkles className="w-4 h-4 text-primary shrink-0" />
                  AI path helper (optional)
                </div>
                <p className="text-xs text-muted-foreground">
                  Optional hint for this step—suggestions must match a button below.
                </p>
                <Textarea
                  placeholder="e.g. I’m due for routine screening, no symptoms…"
                  value={stepAiUserText}
                  onChange={e => setStepAiUserText(e.target.value)}
                  className="min-h-[64px] resize-y text-sm"
                  disabled={aiLoading}
                />
                <Button
                  type="button"
                  size="sm"
                  variant="secondary"
                  className="w-full sm:w-auto"
                  disabled={aiLoading}
                  onClick={() => void requestAiSuggestion()}
                >
                  {aiLoading ? 'Thinking…' : 'Get AI suggestion'}
                </Button>
                {aiError && <p className="text-xs text-destructive">{aiError}</p>}
                {stepAiMessage && (
                  <div className="rounded-lg bg-card border border-border p-3 text-sm text-foreground leading-relaxed">
                    {stepAiMessage}
                    {aiConfidence && (
                      <span className="block text-xs text-muted-foreground mt-2">Confidence: {aiConfidence}</span>
                    )}
                  </div>
                )}
                {aiRecommendedNextId && (
                  <Button
                    type="button"
                    size="sm"
                    className="bg-primary text-primary-foreground hover:bg-primary-hover"
                    onClick={() => goTo(aiRecommendedNextId)}
                  >
                    Use suggested next step
                  </Button>
                )}
              </div>
              <QuestionPanel
                node={node}
                onPick={opt => goTo(opt.nextId)}
                suggestedNextId={aiRecommendedNextId}
              />
            </>
          )}

          {node && node.kind === 'leaf' && (
            <LeafPanel
              node={node}
              confirmed={value?.bundleId === node.bundleId}
              onConfirm={() => confirmLeaf(node)}
              onPickDifferent={reset}
            />
          )}

          <div className="flex flex-wrap gap-2 pt-2">
            <Button type="button" variant="outline" size="sm" onClick={goBack} disabled={pathIds.length <= 1}>
              Back
            </Button>
            <Button type="button" variant="ghost" size="sm" onClick={reset}>
              Start over
            </Button>
            <Button type="button" variant="ghost" size="sm" onClick={() => setFlow('symptoms')}>
              Back to symptom chat
            </Button>
          </div>
        </div>
      )}
    </div>
  );
};

function QuestionPanel({
  node,
  onPick,
  suggestedNextId,
}: {
  node: GiQuestionNode;
  onPick: (o: { nextId: string }) => void;
  suggestedNextId: string | null;
}) {
  return (
    <div className="space-y-3 animate-fade-in">
      <p className="font-medium text-foreground leading-snug">{node.prompt}</p>
      {node.hint && <p className="text-xs text-muted-foreground">{node.hint}</p>}
      <div className="flex flex-col gap-2">
        {node.options.map(opt => (
          <Button
            key={opt.nextId}
            type="button"
            variant="outline"
            className={cn(
              'h-auto min-h-11 whitespace-normal text-left justify-start px-4 py-3 border-primary/20 hover:bg-primary/5 hover:border-primary/40',
              suggestedNextId === opt.nextId && 'ring-2 ring-primary border-primary/50 bg-primary/5',
            )}
            onClick={() => onPick(opt)}
          >
            {opt.label}
          </Button>
        ))}
      </div>
    </div>
  );
}

function LeafPanel({
  node,
  confirmed,
  onConfirm,
  onPickDifferent,
}: {
  node: GiLeafNode;
  confirmed: boolean;
  onConfirm: () => void;
  onPickDifferent: () => void;
}) {
  return (
    <div className="space-y-3 rounded-xl bg-primary/5 border border-primary/15 p-4 animate-fade-in">
      <p className="text-xs font-semibold uppercase tracking-wide text-primary">Selected procedure</p>
      <p className="font-semibold text-lg">{node.title}</p>
      <p className="text-sm text-muted-foreground leading-relaxed">{node.description}</p>
      <p className="text-xs text-muted-foreground">
        CPT <span className="font-mono font-medium text-foreground">{node.cptCode}</span>
      </p>
      <div className="flex flex-wrap gap-2 pt-1">
        <Button type="button" size="sm" className="bg-primary text-primary-foreground hover:bg-primary-hover" onClick={onConfirm}>
          {confirmed ? 'Confirmed ✓' : 'Use this for estimates'}
        </Button>
        <Button type="button" size="sm" variant="outline" onClick={onPickDifferent}>
          Choose a different path
        </Button>
      </div>
    </div>
  );
}

export default GiProcedureWizard;
