import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { EditorContent, useEditor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Archive,
  BookOpen,
  CheckCircle2,
  Clock3,
  FileText,
  FlaskConical,
  GitBranch,
  History,
  Lightbulb,
  Loader2,
  MessageSquare,
  Plus,
  Rocket,
  Save,
  Search,
  Sparkles,
  Target,
  Trash2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  archiveIdea,
  convertIdea,
  createIdea,
  createIdeaComment,
  createIdeaItem,
  createIdeaSection,
  createIdeaVersion,
  finalizeIdea,
  getIdea,
  getIdeaComments,
  getIdeas,
  getIdeaVersions,
  previewIdeaConversion,
  requestIdeaAi,
  updateIdea,
  updateIdeaItem,
  updateIdeaSection,
} from "@/lib/idea-api";
import { cn } from "@/lib/utils";

const STAGES = ["CAPTURED", "EXPLORING", "PLANNING", "VALIDATING", "EXPERIMENTING", "FINALIZED", "CONVERTED", "ARCHIVED"];
const TABS = [
  ["overview", "Overview", Lightbulb],
  ["notes", "Notes", BookOpen],
  ["validation", "Validation", FlaskConical],
  ["plan", "Plan", Target],
  ["discussion", "Discussion", MessageSquare],
  ["history", "History", History],
  ["convert", "Convert", Rocket],
];

function textToDoc(text) {
  return {
    type: "doc",
    content: String(text || "")
      .split("\n")
      .map((line) => ({ type: "paragraph", content: line ? [{ type: "text", text: line }] : [] })),
  };
}

function docToText(node) {
  if (!node) return "";
  if (typeof node === "string") return node;
  if (Array.isArray(node)) return node.map(docToText).filter(Boolean).join("\n");
  if (typeof node === "object") {
    if (typeof node.text === "string") return node.text;
    return Object.values(node).map(docToText).filter(Boolean).join("\n");
  }
  return String(node);
}

function formatDate(value) {
  if (!value) return "No date";
  return new Intl.DateTimeFormat(undefined, { month: "short", day: "numeric", year: "numeric" }).format(new Date(value));
}

function StageBadge({ stage }) {
  const tone = {
    CAPTURED: "bg-slate-100 text-slate-700",
    EXPLORING: "bg-cyan-100 text-cyan-700",
    PLANNING: "bg-blue-100 text-blue-700",
    VALIDATING: "bg-amber-100 text-amber-800",
    EXPERIMENTING: "bg-fuchsia-100 text-fuchsia-700",
    FINALIZED: "bg-emerald-100 text-emerald-700",
    CONVERTED: "bg-primary/10 text-primary",
    ARCHIVED: "bg-muted text-muted-foreground",
  }[stage] || "bg-muted text-muted-foreground";
  return <span className={cn("rounded px-2 py-0.5 text-xs font-medium", tone)}>{stage?.replaceAll("_", " ")}</span>;
}

function RichTextEditor({ value, onChange, editable = true }) {
  const editor = useEditor({
    extensions: [StarterKit],
    content: value || textToDoc(""),
    editable,
    editorProps: {
      attributes: {
        class: "prose prose-sm min-h-[280px] max-w-none rounded-md border bg-background px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-ring",
      },
    },
    onUpdate: ({ editor: activeEditor }) => {
      const json = activeEditor.getJSON();
      onChange?.({ contentJson: json, plainText: activeEditor.getText("\n") });
    },
  });

  useEffect(() => {
    if (!editor || !value) return;
    const current = JSON.stringify(editor.getJSON());
    const next = JSON.stringify(value);
    if (current !== next) editor.commands.setContent(value, false);
  }, [editor, value]);

  return <EditorContent editor={editor} />;
}

function EmptyState({ icon: Icon, title, description, action }) {
  return (
    <div className="flex min-h-[220px] flex-col items-center justify-center rounded-md border border-dashed px-6 text-center">
      <Icon className="mb-3 h-8 w-8 text-muted-foreground" />
      <h3 className="text-sm font-semibold">{title}</h3>
      <p className="mt-1 max-w-md text-sm text-muted-foreground">{description}</p>
      {action ? <div className="mt-4">{action}</div> : null}
    </div>
  );
}

function IdeaList({ ideas, activeId, filters, setFilters, onCreate, creating }) {
  const [title, setTitle] = useState("");
  function submit(event) {
    event.preventDefault();
    if (!title.trim()) return;
    onCreate({ title: title.trim() });
    setTitle("");
  }

  return (
    <aside className="flex min-h-0 w-full shrink-0 flex-col overflow-hidden rounded-md border bg-card lg:w-80">
      <div className="border-b p-3">
        <form className="flex gap-2" onSubmit={submit}>
          <Input className="h-9" value={title} placeholder="Capture an idea" onChange={(event) => setTitle(event.target.value)} />
          <Button size="icon" className="h-9 w-9 shrink-0" disabled={creating || !title.trim()} aria-label="Create idea">
            {creating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
          </Button>
        </form>
      </div>

      <div className="space-y-2 border-b p-3">
        <div className="relative">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input className="h-9 pl-8" placeholder="Search ideas" value={filters.search} onChange={(event) => setFilters((current) => ({ ...current, search: event.target.value }))} />
        </div>
        <select className="h-9 w-full rounded-md border bg-background px-3 text-sm" value={filters.stage} onChange={(event) => setFilters((current) => ({ ...current, stage: event.target.value }))}>
          <option value="">All stages</option>
          {STAGES.map((stage) => <option key={stage} value={stage}>{stage.replaceAll("_", " ")}</option>)}
        </select>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto p-2">
        {ideas.map((idea) => (
          <Link
            key={idea.id}
            to={`/ideas/${idea.id}`}
            className={cn("mb-2 block rounded-md border p-3 transition-colors hover:bg-accent", activeId === idea.id && "border-primary bg-primary/5")}
          >
            <div className="mb-2 flex items-start justify-between gap-2">
              <h2 className="line-clamp-2 text-sm font-semibold">{idea.title}</h2>
              <StageBadge stage={idea.stage} />
            </div>
            <p className="line-clamp-2 text-xs text-muted-foreground">{idea.summary || idea.problem || "No summary yet."}</p>
            <div className="mt-3 flex items-center justify-between text-xs text-muted-foreground">
              <span>{idea.owner?.name || "Owner"}</span>
              <span>{formatDate(idea.updatedAt)}</span>
            </div>
          </Link>
        ))}
        {!ideas.length ? <EmptyState icon={Lightbulb} title="No ideas found" description="Capture a rough thought, research question, product bet, or delivery strategy to start shaping it." /> : null}
      </div>
    </aside>
  );
}

function OverviewTab({ idea, draft, setDraft, onSave, saving, onArchive }) {
  return (
    <div className="space-y-4">
      <div className="grid gap-3 md:grid-cols-2">
        <label className="space-y-1 text-sm">
          <span className="font-medium">Title</span>
          <Input value={draft.title} onChange={(event) => setDraft((current) => ({ ...current, title: event.target.value }))} />
        </label>
        <label className="space-y-1 text-sm">
          <span className="font-medium">Stage</span>
          <select className="h-10 w-full rounded-md border bg-background px-3 text-sm" value={draft.stage} onChange={(event) => setDraft((current) => ({ ...current, stage: event.target.value }))}>
            {STAGES.map((stage) => <option key={stage} value={stage}>{stage.replaceAll("_", " ")}</option>)}
          </select>
        </label>
      </div>
      <label className="space-y-1 text-sm">
        <span className="font-medium">Summary</span>
        <Textarea value={draft.summary} onChange={(event) => setDraft((current) => ({ ...current, summary: event.target.value }))} />
      </label>
      <div className="grid gap-3 md:grid-cols-2">
        <label className="space-y-1 text-sm">
          <span className="font-medium">Problem</span>
          <Textarea value={draft.problem} onChange={(event) => setDraft((current) => ({ ...current, problem: event.target.value }))} />
        </label>
        <label className="space-y-1 text-sm">
          <span className="font-medium">Opportunity</span>
          <Textarea value={draft.opportunity} onChange={(event) => setDraft((current) => ({ ...current, opportunity: event.target.value }))} />
        </label>
      </div>
      <div className="grid gap-3 md:grid-cols-[1fr_180px]">
        <label className="space-y-1 text-sm">
          <span className="font-medium">Tags</span>
          <Input value={draft.tags} placeholder="growth, research, platform" onChange={(event) => setDraft((current) => ({ ...current, tags: event.target.value }))} />
        </label>
        <label className="space-y-1 text-sm">
          <span className="font-medium">Confidence</span>
          <Input type="number" min="0" max="100" value={draft.confidence} onChange={(event) => setDraft((current) => ({ ...current, confidence: event.target.value }))} />
        </label>
      </div>
      <div className="flex flex-wrap gap-2">
        <Button className="h-9 rounded px-3 text-sm" onClick={onSave} disabled={saving || !draft.title.trim()}>
          {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
          Save idea
        </Button>
        {idea.stage !== "ARCHIVED" ? (
          <Button variant="outline" className="h-9 rounded px-3 text-sm" onClick={onArchive}>
            <Archive className="mr-2 h-4 w-4" />
            Archive
          </Button>
        ) : null}
      </div>
    </div>
  );
}

function NotesTab({ idea, onSaveSection, onCreateSection, saving }) {
  const [selectedId, setSelectedId] = useState("");
  const selected = idea.sections?.find((section) => section.id === selectedId) || idea.sections?.[0];
  const [draft, setDraft] = useState({ title: "", type: "NOTE", contentJson: textToDoc(""), plainText: "" });

  useEffect(() => {
    if (!selected) return;
    setSelectedId(selected.id);
    setDraft({
      title: selected.title,
      type: selected.type,
      contentJson: selected.contentJson || textToDoc(selected.plainText || ""),
      plainText: selected.plainText || docToText(selected.contentJson),
    });
  }, [selected?.id]);

  if (!selected) {
    return <EmptyState icon={BookOpen} title="No sections yet" description="Create the first workspace note to capture research, strategy, requirements, or roadmap thinking." action={<Button onClick={() => onCreateSection({ title: "Raw notes", type: "NOTE" })}>Create section</Button>} />;
  }

  return (
    <div className="grid gap-4 xl:grid-cols-[220px_1fr]">
      <div className="space-y-2">
        {idea.sections.map((section) => (
          <button key={section.id} className={cn("w-full rounded-md border px-3 py-2 text-left text-sm hover:bg-accent", selected.id === section.id && "border-primary bg-primary/5")} onClick={() => setSelectedId(section.id)}>
            <span className="block font-medium">{section.title}</span>
            <span className="text-xs text-muted-foreground">{section.type}</span>
          </button>
        ))}
        <Button variant="outline" className="h-9 w-full rounded text-sm" onClick={() => onCreateSection({ title: "New note", type: "NOTE" })}>
          <Plus className="mr-2 h-4 w-4" />
          Section
        </Button>
      </div>
      <div className="space-y-3">
        <div className="grid gap-3 md:grid-cols-[1fr_180px_auto]">
          <Input value={draft.title} onChange={(event) => setDraft((current) => ({ ...current, title: event.target.value }))} />
          <select className="h-10 rounded-md border bg-background px-3 text-sm" value={draft.type} onChange={(event) => setDraft((current) => ({ ...current, type: event.target.value }))}>
            {["NOTE", "RESEARCH", "REQUIREMENTS", "STRATEGY", "RISKS", "ROADMAP"].map((type) => <option key={type} value={type}>{type}</option>)}
          </select>
          <Button className="h-10 rounded px-3 text-sm" disabled={saving || !draft.title.trim()} onClick={() => onSaveSection(selected.id, draft)}>
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
          </Button>
        </div>
        <RichTextEditor value={draft.contentJson} onChange={(next) => setDraft((current) => ({ ...current, ...next }))} />
      </div>
    </div>
  );
}

function QuickAdd({ title, fields, onSubmit, pending }) {
  const initial = fields.reduce((acc, field) => ({ ...acc, [field.name]: field.defaultValue || "" }), {});
  const [form, setForm] = useState(initial);
  function submit(event) {
    event.preventDefault();
    if (!form.title?.trim()) return;
    onSubmit(form);
    setForm(initial);
  }
  return (
    <form className="grid gap-2 rounded-md border bg-muted/20 p-3 md:grid-cols-4" onSubmit={submit}>
      {fields.map((field) => {
        if (field.type === "select") {
          return (
            <select key={field.name} className="h-9 rounded-md border bg-background px-3 text-sm" value={form[field.name]} onChange={(event) => setForm((current) => ({ ...current, [field.name]: event.target.value }))}>
              {field.options.map((option) => <option key={option} value={option}>{option}</option>)}
            </select>
          );
        }
        return <Input key={field.name} className="h-9" placeholder={field.placeholder} value={form[field.name]} onChange={(event) => setForm((current) => ({ ...current, [field.name]: event.target.value }))} />;
      })}
      <Button className="h-9 rounded px-3 text-sm" disabled={pending || !form.title?.trim()}>{pending ? <Loader2 className="h-4 w-4 animate-spin" /> : title}</Button>
    </form>
  );
}

function ValidationTab({ idea, onCreateItem, onUpdateItem, pending }) {
  return (
    <div className="space-y-6">
      <section className="space-y-3">
        <h2 className="text-sm font-semibold">Goals</h2>
        <QuickAdd title="Add goal" pending={pending} onSubmit={(payload) => onCreateItem("goals", payload)} fields={[{ name: "title", placeholder: "Goal" }, { name: "metric", placeholder: "Metric" }, { name: "target", placeholder: "Target" }, { name: "status", type: "select", options: ["ACTIVE", "MET", "PAUSED", "DROPPED"], defaultValue: "ACTIVE" }]} />
        <ItemGrid items={idea.goals} empty="No goals yet." onStatus={(item, status) => onUpdateItem("goals", item.id, { status })} statuses={["ACTIVE", "MET", "PAUSED", "DROPPED"]} />
      </section>
      <section className="space-y-3">
        <h2 className="text-sm font-semibold">Requirements and assumptions</h2>
        <QuickAdd title="Add item" pending={pending} onSubmit={(payload) => onCreateItem("requirements", payload)} fields={[{ name: "title", placeholder: "Requirement or assumption" }, { name: "description", placeholder: "Details" }, { name: "type", type: "select", options: ["REQUIREMENT", "ASSUMPTION", "RISK", "TASK", "ROADMAP_ITEM"], defaultValue: "REQUIREMENT" }, { name: "priority", type: "select", options: ["LOW", "MEDIUM", "HIGH", "URGENT"], defaultValue: "MEDIUM" }]} />
        <ItemGrid items={idea.requirements} empty="No requirements yet." />
      </section>
      <section className="space-y-3">
        <h2 className="text-sm font-semibold">Experiments</h2>
        <QuickAdd title="Add experiment" pending={pending} onSubmit={(payload) => onCreateItem("experiments", payload)} fields={[{ name: "title", placeholder: "Experiment" }, { name: "hypothesis", placeholder: "Hypothesis" }, { name: "method", placeholder: "Method" }, { name: "status", type: "select", options: ["PLANNED", "RUNNING", "VALIDATED", "INVALIDATED", "INCONCLUSIVE"], defaultValue: "PLANNED" }]} />
        <ItemGrid items={idea.experiments} empty="No experiments yet." onStatus={(item, status) => onUpdateItem("experiments", item.id, { status })} statuses={["PLANNED", "RUNNING", "VALIDATED", "INVALIDATED", "INCONCLUSIVE"]} />
      </section>
    </div>
  );
}

function ItemGrid({ items = [], empty, onStatus, statuses }) {
  if (!items.length) return <p className="rounded-md border border-dashed px-4 py-6 text-center text-sm text-muted-foreground">{empty}</p>;
  return (
    <div className="grid gap-2 md:grid-cols-2">
      {items.map((item) => (
        <div key={item.id} className="rounded-md border p-3">
          <div className="mb-2 flex items-start justify-between gap-2">
            <h3 className="text-sm font-semibold">{item.title}</h3>
            <span className="rounded bg-muted px-2 py-0.5 text-xs">{item.priority || item.status || item.type}</span>
          </div>
          <p className="text-sm text-muted-foreground">{item.description || item.hypothesis || item.metric || item.target || item.method || "No details yet."}</p>
          {onStatus && statuses ? (
            <select className="mt-3 h-8 rounded border bg-background px-2 text-xs" value={item.status} onChange={(event) => onStatus(item, event.target.value)}>
              {statuses.map((status) => <option key={status} value={status}>{status}</option>)}
            </select>
          ) : null}
        </div>
      ))}
    </div>
  );
}

function PlanTab({ idea, onAi, aiResult, pending }) {
  const readiness = [
    ["Goals", idea.goals?.length || 0],
    ["Requirements", idea.requirements?.length || 0],
    ["Experiments", idea.experiments?.length || 0],
    ["Sections", idea.sections?.length || 0],
  ];
  return (
    <div className="space-y-5">
      <div className="grid gap-3 md:grid-cols-4">
        {readiness.map(([label, value]) => (
          <div key={label} className="rounded-md border p-3">
            <p className="text-xs text-muted-foreground">{label}</p>
            <p className="mt-1 text-2xl font-semibold">{value}</p>
          </div>
        ))}
      </div>
      <div className="rounded-md border p-4">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h2 className="text-sm font-semibold">AI planning assistant</h2>
            <p className="text-sm text-muted-foreground">Suggestions are optional drafts and are never saved automatically.</p>
          </div>
          <Button variant="outline" className="h-9 rounded px-3 text-sm" disabled={pending} onClick={() => onAi("generate-plan")}>
            {pending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Sparkles className="mr-2 h-4 w-4" />}
            Generate plan
          </Button>
        </div>
        {aiResult ? <pre className="mt-4 max-h-56 overflow-auto rounded bg-muted p-3 text-xs">{JSON.stringify(aiResult, null, 2)}</pre> : null}
      </div>
      <ItemGrid items={idea.requirements} empty="Requirements will become implementation tasks during conversion." />
    </div>
  );
}

function DiscussionTab({ comments, onComment, pending }) {
  const [content, setContent] = useState("");
  function submit(event) {
    event.preventDefault();
    if (!content.trim()) return;
    onComment({ content });
    setContent("");
  }
  return (
    <div className="space-y-4">
      <form className="flex gap-2" onSubmit={submit}>
        <Input value={content} placeholder="Add a comment or update" onChange={(event) => setContent(event.target.value)} />
        <Button className="h-10 rounded px-3 text-sm" disabled={pending || !content.trim()}>Comment</Button>
      </form>
      <div className="space-y-2">
        {comments.map((comment) => (
          <div key={comment.id} className="rounded-md border p-3">
            <div className="mb-1 flex items-center justify-between text-xs text-muted-foreground">
              <span>{comment.user?.name || "Teammate"}</span>
              <span>{formatDate(comment.createdAt)}</span>
            </div>
            <p className="text-sm">{comment.content}</p>
          </div>
        ))}
        {!comments.length ? <EmptyState icon={MessageSquare} title="No discussion yet" description="Use comments for async collaboration, decisions, feedback, and status updates." /> : null}
      </div>
    </div>
  );
}

function HistoryTab({ versions, onSnapshot, pending }) {
  return (
    <div className="space-y-4">
      <Button className="h-9 rounded px-3 text-sm" disabled={pending} onClick={() => onSnapshot({ label: `Snapshot ${new Date().toLocaleString()}` })}>
        {pending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <History className="mr-2 h-4 w-4" />}
        Create snapshot
      </Button>
      <div className="space-y-2">
        {versions.map((version) => (
          <div key={version.id} className="rounded-md border p-3">
            <p className="text-sm font-medium">{version.label}</p>
            <p className="text-xs text-muted-foreground">{version.createdBy?.name || "User"} · {formatDate(version.createdAt)}</p>
          </div>
        ))}
        {!versions.length ? <EmptyState icon={History} title="No snapshots yet" description="Create manual snapshots when the idea reaches an important decision point." /> : null}
      </div>
    </div>
  );
}

function ConvertTab({ idea, preview, onPreview, onConvert, onFinalize, pendingPreview, pendingConvert, pendingFinalize }) {
  return (
    <div className="space-y-4">
      <div className="rounded-md border p-4">
        <h2 className="text-sm font-semibold">Conversion readiness</h2>
        <div className="mt-3 grid gap-2 text-sm md:grid-cols-2">
          <StatusLine ok={(idea.goals?.length || 0) > 0} label="Goals defined" />
          <StatusLine ok={(idea.requirements?.length || 0) > 0} label="Requirements defined" />
          <StatusLine ok={idea.stage === "FINALIZED" || idea.stage === "CONVERTED"} label="Idea finalized" />
          <StatusLine ok={!idea.convertedProjectId} label={idea.convertedProjectId ? "Already converted" : "Ready for project creation"} />
        </div>
      </div>
      <div className="flex flex-wrap gap-2">
        {idea.stage !== "FINALIZED" && idea.stage !== "CONVERTED" ? (
          <Button variant="outline" className="h-9 rounded px-3 text-sm" disabled={pendingFinalize} onClick={onFinalize}>
            <CheckCircle2 className="mr-2 h-4 w-4" />
            Finalize idea
          </Button>
        ) : null}
        <Button variant="outline" className="h-9 rounded px-3 text-sm" disabled={pendingPreview} onClick={onPreview}>
          {pendingPreview ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <FileText className="mr-2 h-4 w-4" />}
          Preview conversion
        </Button>
        <Button className="h-9 rounded px-3 text-sm" disabled={pendingConvert || idea.stage !== "FINALIZED"} onClick={onConvert}>
          {pendingConvert ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Rocket className="mr-2 h-4 w-4" />}
          Convert to project
        </Button>
      </div>
      {idea.convertedProject ? (
        <Link className="inline-flex items-center rounded-md border px-3 py-2 text-sm hover:bg-accent" to={`/spaces/${idea.convertedProject.id}/issues`}>
          <GitBranch className="mr-2 h-4 w-4" />
          Open {idea.convertedProject.name}
        </Link>
      ) : null}
      {preview ? <ConversionPreview preview={preview} /> : null}
    </div>
  );
}

function StatusLine({ ok, label }) {
  return <div className="flex items-center gap-2"><span className={cn("h-2 w-2 rounded-full", ok ? "bg-emerald-500" : "bg-amber-500")} />{label}</div>;
}

function ConversionPreview({ preview }) {
  return (
    <div className="grid gap-3 lg:grid-cols-2">
      <div className="rounded-md border p-4">
        <h3 className="text-sm font-semibold">Project</h3>
        <p className="mt-2 text-sm">{preview.project?.name} · {preview.project?.key}</p>
        <p className="mt-1 text-sm text-muted-foreground">{preview.project?.description}</p>
      </div>
      <div className="rounded-md border p-4">
        <h3 className="text-sm font-semibold">Generated work</h3>
        <p className="mt-2 text-sm">{preview.milestones?.length || 0} milestones · {preview.tasks?.length || 0} tasks · {preview.docs?.length || 0} docs</p>
      </div>
      <div className="rounded-md border p-4 lg:col-span-2">
        <h3 className="mb-2 text-sm font-semibold">Initial tasks</h3>
        <div className="grid gap-2 md:grid-cols-2">
          {(preview.tasks || []).slice(0, 8).map((task, index) => <p key={`${task.title}-${index}`} className="rounded bg-muted px-3 py-2 text-sm">{task.title}</p>)}
        </div>
      </div>
    </div>
  );
}

function MetadataPanel({ idea }) {
  const tags = idea.tags || [];
  return (
    <aside className="hidden w-72 shrink-0 rounded-md border bg-card p-4 xl:block">
      <div className="space-y-5">
        <section>
          <p className="text-xs font-medium uppercase text-muted-foreground">Stage</p>
          <div className="mt-2"><StageBadge stage={idea.stage} /></div>
        </section>
        <section>
          <p className="text-xs font-medium uppercase text-muted-foreground">Confidence</p>
          <div className="mt-2 h-2 rounded bg-muted">
            <div className="h-2 rounded bg-primary" style={{ width: `${idea.confidence || 0}%` }} />
          </div>
          <p className="mt-1 text-xs text-muted-foreground">{idea.confidence || 0}%</p>
        </section>
        <section>
          <p className="text-xs font-medium uppercase text-muted-foreground">Collaborators</p>
          <div className="mt-2 space-y-2">
            {(idea.members || []).map((member) => (
              <div key={member.id} className="flex items-center justify-between gap-2 text-sm">
                <span className="truncate">{member.user?.name || member.user?.email}</span>
                <span className="rounded bg-muted px-2 py-0.5 text-xs">{member.role}</span>
              </div>
            ))}
          </div>
        </section>
        <section>
          <p className="text-xs font-medium uppercase text-muted-foreground">Tags</p>
          <div className="mt-2 flex flex-wrap gap-1">
            {tags.length ? tags.map((tag) => <span key={tag} className="rounded bg-muted px-2 py-0.5 text-xs">{tag}</span>) : <span className="text-xs text-muted-foreground">No tags</span>}
          </div>
        </section>
        <section>
          <p className="text-xs font-medium uppercase text-muted-foreground">Activity</p>
          <div className="mt-2 space-y-1 text-sm text-muted-foreground">
            <p><Clock3 className="mr-1 inline h-3 w-3" /> Updated {formatDate(idea.updatedAt)}</p>
            <p>{idea._count?.comments || 0} comments</p>
            <p>{idea._count?.versions || 0} snapshots</p>
          </div>
        </section>
      </div>
    </aside>
  );
}

export default function Ideas() {
  const { ideaId } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [filters, setFilters] = useState({ search: "", stage: "" });
  const [activeTab, setActiveTab] = useState("overview");
  const [draft, setDraft] = useState({ title: "", summary: "", problem: "", opportunity: "", stage: "CAPTURED", confidence: 25, tags: "" });
  const [conversionPreviewData, setConversionPreviewData] = useState(null);
  const [aiResult, setAiResult] = useState(null);

  const ideasQuery = useQuery({ queryKey: ["ideas", filters], queryFn: () => getIdeas(filters) });
  const ideas = ideasQuery.data?.data || [];
  const activeIdeaId = ideaId || ideas[0]?.id || "";
  const ideaQuery = useQuery({ queryKey: ["idea", activeIdeaId], queryFn: () => getIdea(activeIdeaId), enabled: Boolean(activeIdeaId) });
  const idea = ideaQuery.data?.data;
  const commentsQuery = useQuery({ queryKey: ["idea-comments", activeIdeaId], queryFn: () => getIdeaComments(activeIdeaId), enabled: Boolean(activeIdeaId) });
  const versionsQuery = useQuery({ queryKey: ["idea-versions", activeIdeaId], queryFn: () => getIdeaVersions(activeIdeaId), enabled: Boolean(activeIdeaId) });

  const invalidateIdea = () => {
    queryClient.invalidateQueries({ queryKey: ["ideas"] });
    queryClient.invalidateQueries({ queryKey: ["idea", activeIdeaId] });
  };

  useEffect(() => {
    if (!idea) return;
    setDraft({
      title: idea.title || "",
      summary: idea.summary || "",
      problem: idea.problem || "",
      opportunity: idea.opportunity || "",
      stage: idea.stage || "CAPTURED",
      confidence: idea.confidence ?? 25,
      tags: (idea.tags || []).join(", "),
    });
    setConversionPreviewData(null);
  }, [idea?.id]);

  const createIdeaMutation = useMutation({
    mutationFn: createIdea,
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ["ideas"] });
      if (result?.data?.id) navigate(`/ideas/${result.data.id}`);
    },
  });
  const updateIdeaMutation = useMutation({ mutationFn: (payload) => updateIdea(activeIdeaId, payload), onSuccess: invalidateIdea });
  const archiveMutation = useMutation({ mutationFn: () => archiveIdea(activeIdeaId), onSuccess: invalidateIdea });
  const finalizeMutation = useMutation({ mutationFn: () => finalizeIdea(activeIdeaId), onSuccess: invalidateIdea });
  const sectionMutation = useMutation({ mutationFn: ({ sectionId, payload }) => updateIdeaSection(activeIdeaId, sectionId, payload), onSuccess: invalidateIdea });
  const createSectionMutation = useMutation({ mutationFn: (payload) => createIdeaSection(activeIdeaId, payload), onSuccess: invalidateIdea });
  const itemMutation = useMutation({ mutationFn: ({ collection, payload }) => createIdeaItem(activeIdeaId, collection, payload), onSuccess: invalidateIdea });
  const updateItemMutation = useMutation({ mutationFn: ({ collection, itemId, payload }) => updateIdeaItem(activeIdeaId, collection, itemId, payload), onSuccess: invalidateIdea });
  const commentMutation = useMutation({ mutationFn: (payload) => createIdeaComment(activeIdeaId, payload), onSuccess: () => queryClient.invalidateQueries({ queryKey: ["idea-comments", activeIdeaId] }) });
  const versionMutation = useMutation({ mutationFn: (payload) => createIdeaVersion(activeIdeaId, payload), onSuccess: () => queryClient.invalidateQueries({ queryKey: ["idea-versions", activeIdeaId] }) });
  const previewMutation = useMutation({ mutationFn: () => previewIdeaConversion(activeIdeaId), onSuccess: (result) => setConversionPreviewData(result?.data) });
  const convertMutation = useMutation({
    mutationFn: () => convertIdea(activeIdeaId, { plan: conversionPreviewData }),
    onSuccess: (result) => {
      invalidateIdea();
      if (result?.data?.project?.id) navigate(`/spaces/${result.data.project.id}/issues`);
    },
  });
  const aiMutation = useMutation({ mutationFn: (action) => requestIdeaAi(activeIdeaId, action), onSuccess: (result) => setAiResult(result?.data) });

  const content = useMemo(() => {
    if (ideaQuery.isLoading) return <EmptyState icon={Loader2} title="Loading idea" description="Opening the incubation workspace." />;
    if (!activeIdeaId || !idea) return <EmptyState icon={Lightbulb} title="Capture your first idea" description="Create a workspace for raw thinking, research, validation, and project conversion." />;

    const saveOverview = () => updateIdeaMutation.mutate({
      ...draft,
      confidence: Number(draft.confidence),
      tags: draft.tags.split(",").map((tag) => tag.trim()).filter(Boolean),
    });

    const tabProps = {
      overview: <OverviewTab idea={idea} draft={draft} setDraft={setDraft} onSave={saveOverview} saving={updateIdeaMutation.isPending} onArchive={() => archiveMutation.mutate()} />,
      notes: <NotesTab idea={idea} saving={sectionMutation.isPending} onSaveSection={(sectionId, payload) => sectionMutation.mutate({ sectionId, payload })} onCreateSection={(payload) => createSectionMutation.mutate(payload)} />,
      validation: <ValidationTab idea={idea} pending={itemMutation.isPending || updateItemMutation.isPending} onCreateItem={(collection, payload) => itemMutation.mutate({ collection, payload })} onUpdateItem={(collection, itemId, payload) => updateItemMutation.mutate({ collection, itemId, payload })} />,
      plan: <PlanTab idea={idea} onAi={(action) => aiMutation.mutate(action)} aiResult={aiResult} pending={aiMutation.isPending} />,
      discussion: <DiscussionTab comments={commentsQuery.data?.data || []} pending={commentMutation.isPending} onComment={(payload) => commentMutation.mutate(payload)} />,
      history: <HistoryTab versions={versionsQuery.data?.data || []} pending={versionMutation.isPending} onSnapshot={(payload) => versionMutation.mutate(payload)} />,
      convert: <ConvertTab idea={idea} preview={conversionPreviewData} onPreview={() => previewMutation.mutate()} onConvert={() => convertMutation.mutate()} onFinalize={() => finalizeMutation.mutate()} pendingPreview={previewMutation.isPending} pendingConvert={convertMutation.isPending} pendingFinalize={finalizeMutation.isPending} />,
    };
    return tabProps[activeTab];
  }, [activeIdeaId, activeTab, aiResult, archiveMutation.isPending, commentsQuery.data, conversionPreviewData, convertMutation.isPending, draft, idea, ideaQuery.isLoading, itemMutation.isPending, previewMutation.isPending, sectionMutation.isPending, updateIdeaMutation.isPending, updateItemMutation.isPending, versionsQuery.data]);

  return (
    <div className="space-y-3 px-3 py-3 sm:px-4 lg:px-5">
      <div>
        <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">Ideas</h1>
        <p className="mt-1 text-sm text-muted-foreground">Incubate rough thinking, validation, and project bets before execution.</p>
      </div>

      <div className="flex h-[calc(100vh-10.5rem)] min-h-[560px] gap-3 overflow-hidden rounded-none bg-background">
        <IdeaList ideas={ideas} activeId={activeIdeaId} filters={filters} setFilters={setFilters} onCreate={(payload) => createIdeaMutation.mutate(payload)} creating={createIdeaMutation.isPending} />
        <main className="min-w-0 flex-1 overflow-y-auto rounded-md border bg-card">
          {idea ? (
            <div className="sticky top-0 z-10 border-b bg-card/95 px-5 py-4 backdrop-blur">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="min-w-0">
                  <div className="mb-1 flex items-center gap-2">
                    <StageBadge stage={idea.stage} />
                    {idea.convertedProject ? <span className="rounded bg-primary/10 px-2 py-0.5 text-xs text-primary">Converted</span> : null}
                  </div>
                  <h1 className="truncate text-xl font-semibold">{idea.title}</h1>
                </div>
              </div>
              <div className="mt-4 flex gap-1 overflow-x-auto">
                {TABS.map(([id, label, Icon]) => (
                  <button key={id} className={cn("flex h-9 items-center gap-2 rounded px-3 text-sm text-muted-foreground hover:bg-accent hover:text-foreground", activeTab === id && "bg-accent text-foreground")} onClick={() => setActiveTab(id)}>
                    <Icon className="h-4 w-4" />
                    {label}
                  </button>
                ))}
              </div>
            </div>
          ) : null}
          <div className="p-5">{content}</div>
        </main>
        {idea ? <MetadataPanel idea={idea} /> : null}
      </div>
    </div>
  );
}
