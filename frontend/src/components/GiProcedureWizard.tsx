import { useState, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import {
  GI_PROCEDURE_ROOT_ID,
  getGiNode,
  type GiLeafNode,
  type GiProcedureSelection,
  type GiQuestionNode,
} from '@/lib/giDecisionTree';
import { Stethoscope } from 'lucide-react';

type Props = {
  value: GiProcedureSelection | null;
  onChange: (sel: GiProcedureSelection | null) => void;
  symptomNotes: string;
  onSymptomNotesChange: (v: string) => void;
};

const GiProcedureWizard = ({ value, onChange, symptomNotes, onSymptomNotesChange }: Props) => {
  const [nodeId, setNodeId] = useState(GI_PROCEDURE_ROOT_ID);
  const [pathIds, setPathIds] = useState<string[]>([GI_PROCEDURE_ROOT_ID]);

  const reset = useCallback(() => {
    setNodeId(GI_PROCEDURE_ROOT_ID);
    setPathIds([GI_PROCEDURE_ROOT_ID]);
    onChange(null);
  }, [onChange]);

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
      onChange({
        bundleId: leaf.bundleId,
        scenarioId: leaf.scenarioId,
        cptCode: leaf.cptCode,
        title: leaf.title,
        description: leaf.description,
        pathIds: [...pathIds],
      });
    },
    [onChange, pathIds],
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
      </div>

      <div className="rounded-2xl border border-border bg-card/50 p-4 space-y-4">
        <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
          <Stethoscope className="w-4 h-4 text-primary" />
          Find your procedure (GI)
        </div>
        <p className="text-xs text-muted-foreground">
          Answer a few questions. We map your answers to a CPT code used for hospital price data in this demo.
        </p>

        {node && node.kind === 'question' && <QuestionPanel node={node} onPick={opt => goTo(opt.nextId)} />}

        {node && node.kind === 'leaf' && (
          <LeafPanel
            node={node}
            confirmed={value?.bundleId === node.bundleId}
            onConfirm={() => confirmLeaf(node)}
            onPickDifferent={reset}
          />
        )}

        <div className="flex gap-2 pt-2">
          <Button type="button" variant="outline" size="sm" onClick={goBack} disabled={pathIds.length <= 1}>
            Back
          </Button>
          <Button type="button" variant="ghost" size="sm" onClick={reset}>
            Start over
          </Button>
        </div>
      </div>
    </div>
  );
};

function QuestionPanel({ node, onPick }: { node: GiQuestionNode; onPick: (o: { nextId: string }) => void }) {
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
            className="h-auto min-h-11 whitespace-normal text-left justify-start px-4 py-3 border-primary/20 hover:bg-primary/5 hover:border-primary/40"
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
