import { Link } from "react-router-dom";
import { AlertCircle, CheckCircle2, FileText, GitBranch, Layers3, ListChecks, MessageSquare } from "lucide-react";
import { cn } from "@/lib/utils";

export function AuthShell({ title, description, children, footer }) {
  return (
    <div className="relative flex min-h-screen overflow-hidden bg-[#f7f8fa] px-4 py-8 text-[#172b4d]">
      <AuthBackdrop />

      <main className="relative z-10 mx-auto flex min-h-[calc(100vh-4rem)] w-full max-w-md flex-col items-center justify-center gap-8">
        <section
          className="w-full max-w-md rounded border border-[#dfe1e6] bg-white px-10 py-9 shadow-[0_12px_32px_rgba(9,30,66,0.16)]"
        >
          <div className="text-center">
            <h1 className="text-lg font-semibold tracking-normal text-[#172b4d]">{title}</h1>
            {description ? <p className="mt-2 text-sm leading-5 text-[#44546f]">{description}</p> : null}
          </div>
          <div className="mt-6">{children}</div>
          {footer ? <div className="mt-6 border-t border-[#dfe1e6] pt-5 text-center text-sm text-[#44546f]">{footer}</div> : null}
        </section>

        <footer className="text-center text-xs text-[#626f86]">
          <p>One account for spaces, tasks, docs, and delivery planning.</p>
          <div className="mt-2 flex items-center justify-center gap-3">
            <Link to="/login" className="hover:text-[#0c66e4] hover:underline">Login</Link>
            <span aria-hidden="true">.</span>
            <Link to="/signup" className="hover:text-[#0c66e4] hover:underline">Create account</Link>
          </div>
        </footer>
      </main>
    </div>
  );
}

export function AuthNotice({ type = "info", children }) {
  const success = type === "success";
  return (
    <div
      className={cn(
        "flex gap-2 rounded border p-3 text-sm",
        success ? "border-[#7ee2b8] bg-[#dcfff1] text-[#164b35]" : "border-[#ffd5d2] bg-[#ffebe6] text-[#ae2a19]"
      )}
    >
      {success ? <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" /> : <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />}
      <div className="min-w-0">{children}</div>
    </div>
  );
}

export function AuthDivider({ label = "Or" }) {
  return (
    <div className="my-5 flex items-center gap-4 text-xs text-[#626f86]">
      <span className="h-px flex-1 bg-[#dfe1e6]" />
      <span>{label}</span>
      <span className="h-px flex-1 bg-[#dfe1e6]" />
    </div>
  );
}

export function AuthSecondaryButton({ icon: Icon, children, disabled = true }) {
  return (
    <button
      type="button"
      disabled={disabled}
      className="flex h-10 w-full items-center justify-center gap-3 rounded border border-[#dfe1e6] bg-white px-3 text-sm font-semibold text-[#172b4d] shadow-sm transition-colors hover:bg-[#f7f8fa] disabled:cursor-not-allowed disabled:opacity-70"
    >
      {Icon ? <Icon className="h-4 w-4" /> : null}
      {children}
    </button>
  );
}

function AuthBackdrop() {
  return (
    <div className="pointer-events-none absolute inset-0 z-0 overflow-hidden" aria-hidden="true">
      <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(133,184,255,0.16)_1px,transparent_1px),linear-gradient(0deg,rgba(133,184,255,0.16)_1px,transparent_1px)] bg-[size:72px_72px]" />
      <div className="absolute inset-x-0 top-0 h-44 bg-[linear-gradient(180deg,#edf4ff_0%,rgba(247,248,250,0)_100%)]" />
      <div className="absolute inset-x-0 bottom-0 h-52 bg-[linear-gradient(0deg,#deebff_0%,rgba(247,248,250,0)_100%)]" />

      <div className="absolute left-[5vw] top-16 hidden w-72 lg:block">
        <div className="rounded border border-[#cce0ff] bg-white/90 p-3 shadow-[0_12px_34px_rgba(9,30,66,0.12)] backdrop-blur">
          <div className="mb-3 flex items-center gap-2 text-[#0c66e4]">
            <ListChecks className="h-4 w-4" />
            <span className="h-2 w-20 rounded bg-[#0c66e4]" />
          </div>
          <div className="grid grid-cols-3 gap-2">
            <WorkflowColumn color="#0c66e4" />
            <WorkflowColumn color="#22a06b" raised />
            <WorkflowColumn color="#ffab00" />
          </div>
        </div>
      </div>

      <div className="absolute right-[5vw] top-20 hidden w-72 lg:block">
        <div className="rounded border border-[#dfe1e6] bg-white/90 p-4 shadow-[0_12px_34px_rgba(9,30,66,0.12)] backdrop-blur">
          <div className="mb-4 flex items-center justify-between">
            <div className="flex items-center gap-2 text-[#22a06b]">
              <FileText className="h-4 w-4" />
              <span className="h-2 w-24 rounded bg-[#22a06b]" />
            </div>
            <span className="h-6 w-6 rounded border border-[#cce0ff] bg-[#e9f2ff]" />
          </div>
          <div className="space-y-2">
            <span className="block h-2 rounded bg-[#cce0ff]" />
            <span className="block h-2 w-5/6 rounded bg-[#dfe1e6]" />
            <span className="block h-2 w-2/3 rounded bg-[#dfe1e6]" />
          </div>
          <div className="mt-4 grid grid-cols-2 gap-2">
            <span className="h-12 rounded border border-[#dfe1e6] bg-[#f7f8fa]" />
            <span className="h-12 rounded border border-[#dfe1e6] bg-[#fff7d6]" />
          </div>
        </div>
      </div>

      <div className="absolute bottom-28 left-[7vw] hidden w-64 lg:block">
        <div className="rounded border border-[#dfe1e6] bg-white/90 p-4 shadow-[0_12px_34px_rgba(9,30,66,0.12)] backdrop-blur">
          <div className="mb-3 flex items-center gap-2 text-[#626f86]">
            <MessageSquare className="h-4 w-4" />
            <span className="h-2 w-24 rounded bg-[#626f86]" />
          </div>
          <ChatBubble width="w-44" color="bg-[#deebff]" />
          <ChatBubble width="ml-auto w-36" color="bg-[#dcfff1]" />
          <ChatBubble width="w-48" color="bg-[#fff7d6]" />
        </div>
      </div>

      <div className="absolute bottom-28 right-[7vw] hidden w-64 lg:block">
        <div className="relative rounded border border-[#cce0ff] bg-white/90 p-5 shadow-[0_12px_34px_rgba(9,30,66,0.12)] backdrop-blur">
          <div className="mb-5 flex items-center gap-2 text-[#0c66e4]">
            <Layers3 className="h-4 w-4" />
            <span className="h-2 w-20 rounded bg-[#0c66e4]" />
          </div>
          <div className="relative h-28">
            <span className="absolute left-9 top-5 h-px w-28 rotate-12 bg-[#85b8ff]" />
            <span className="absolute left-10 top-16 h-px w-24 -rotate-12 bg-[#85b8ff]" />
            <span className="absolute left-24 top-8 h-px w-16 rotate-45 bg-[#85b8ff]" />
            <SpaceNode className="left-0 top-1 border-[#85b8ff] bg-[#deebff]" />
            <SpaceNode className="right-4 top-2 border-[#7ee2b8] bg-[#dcfff1]" />
            <SpaceNode className="bottom-0 left-12 border-[#f5cd47] bg-[#fff7d6]" />
            <SpaceNode className="bottom-4 right-0 border-[#cce0ff] bg-white" />
          </div>
        </div>
      </div>

      <div className="absolute bottom-8 left-1/2 hidden w-[760px] -translate-x-1/2 xl:block">
        <div className="h-px bg-[#85b8ff]" />
        <div className="mt-4 grid grid-cols-4 gap-4">
          <TimelineItem icon={GitBranch} color="bg-[#0c66e4]" />
          <TimelineItem icon={ListChecks} color="bg-[#22a06b]" />
          <TimelineItem icon={MessageSquare} color="bg-[#ffab00]" />
          <TimelineItem icon={FileText} color="bg-[#bf63f3]" />
        </div>
      </div>
    </div>
  );
}

function WorkflowColumn({ color, raised = false }) {
  return (
    <div className={cn("space-y-2 rounded bg-[#f7f8fa] p-2", raised ? "-translate-y-2 shadow-sm" : "")}>
      <span className="block h-2 w-10 rounded" style={{ backgroundColor: color }} />
      <span className="block h-10 rounded border border-[#dfe1e6] bg-white" />
      <span className="block h-8 rounded border border-[#dfe1e6] bg-white" />
      <span className="block h-12 rounded border border-[#dfe1e6] bg-white" />
    </div>
  );
}

function ChatBubble({ width, color }) {
  return (
    <div className={cn("mb-2 rounded border border-[#dfe1e6] p-2", width, color)}>
      <span className="block h-1.5 rounded bg-white/80" />
      <span className="mt-1.5 block h-1.5 w-2/3 rounded bg-white/80" />
    </div>
  );
}

function SpaceNode({ className }) {
  return <span className={cn("absolute h-12 w-12 rounded border-2 shadow-sm", className)} />;
}

function TimelineItem({ icon: Icon, color }) {
  return (
    <div className="flex items-center gap-2 rounded border border-[#dfe1e6] bg-white/80 px-3 py-2 shadow-sm backdrop-blur">
      <span className={cn("flex h-7 w-7 items-center justify-center rounded text-white", color)}>
        <Icon className="h-4 w-4" />
      </span>
      <span className="h-2 flex-1 rounded bg-[#dfe1e6]" />
    </div>
  );
}
