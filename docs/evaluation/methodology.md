# Agent and Skill Evaluation Methodology

## Two goals, one system

Evaluation here serves two goals:

1. **Capability evaluation.** Confirm the Skill meets its requirements: for
   each thing it must do, show that a fresh Agent using it does that thing.
2. **Regression evaluation.** Protect behavior that already works: after any
   change to the Skill, show that what worked before still works.

Both goals use the same building blocks: the same task format, the same
graders, and the same records. They differ in which tasks they run, when they
run, and how a result is read. A task moves from the first goal to the second
when it passes reliably; this step is called **graduation**.

```text
new requirement ───────────────┐
failure seen in a field run ───┴──> capability task (may still fail)
                                          │ passes reliably
                                          v
                                    regression task (runs after every Skill change)
```

A green test run is not evidence of good Agent judgment. An Agent can reach a
passing test through a forbidden shortcut, a needless restart, or a guess, so
every run is graded on how it got there as well as on the result.

## Terms

| Term            | Meaning                                                                                          |
| --------------- | ------------------------------------------------------------------------------------------------ |
| Run             | One Agent session that uses the Skill on one task.                                               |
| Trace           | The session transcript: every command, file edit, tool result, and the final message.            |
| Golden task     | A frozen task with a known right decision, staged from local fixtures.                           |
| Capability task | A golden task used to show the Skill can do something. It may still fail.                        |
| Regression task | A golden task that has graduated: it passes reliably and must keep passing.                      |
| Field run       | A run on real work, started by a person, on the real repository and application.                 |
| Check           | One pass/fail rule applied to a run.                                                             |
| Cohort          | Runs that share the same model, Skill revision, tools, and task version, so they are comparable. |
| Invalid         | A run spoiled by infrastructure (network, browser launch, agent limits), not by the Agent.       |

## Shared building blocks

### Golden tasks

A golden task has a fixture, a prompt, and a list of expectations. The prompt
never reveals the expected answer or any seeded defect. A task is frozen within
a cohort; changing it starts a new cohort.

### Graders

Every run is graded in four groups:

| Group       | Question                                                                        |
| ----------- | ------------------------------------------------------------------------------- |
| Outcome     | Did the requested state or artifact come out right?                             |
| Constraint  | Were protected files, safety rules, and scope preserved?                        |
| Judgment    | Did the Agent read the evidence correctly and choose the right next action?     |
| User-facing | Could a person who does not know the Skill follow the progress and the handoff? |

A run passes only when every group passes. A correct final result does not
excuse a forbidden action or a wrong decision on the way.

Three kinds of grader fill these groups:

- **Trace checks**: a script that reads the trace and grades what is
  objectively visible there, such as forbidden commands, edits to protected
  files, restarts, and missing progress descriptions. It works on any trace.
- **Task checks**: the expectations written for one golden task.
- **Human review**: a person answers the questions a script cannot, such as
  whether a restart had a good reason or whether code is over-engineered.

Grade only decisions that are visible in the trace; never infer hidden
reasoning. A model grader is optional and must agree with human verdicts on
known samples before its results count. Time, tool calls, restarts, and
repeated work are recorded as **metrics**; they show cost and waste but do not
decide pass or fail.

### Records

Every run keeps a record that names its date, model, Skill revision (commit),
run kind (`capability`, `regression`, or `field`), task, validity (`valid`, or
`invalid` with the reason), check results, metrics, and reviewer notes.

- **Golden-task runs** are recorded in the Skill Creator workspace (see
  [Tooling](#tooling-skill-creator-first)): one `iteration-N/` folder per
  round, holding each run's outputs, trace, timing, and `grading.json`.
  Workspaces are not committed; after each round, copy the verdict and the
  supported statement into the Skill's policy.
- **Field runs** are recorded as one JSON line each in the Skill's
  `evals/runs.jsonl`, which is committed.

Never delete an inconvenient record. A record without its Skill revision
cannot be compared with later ones.

## Capability evaluation

**Question:** can the Skill do what it is required to do?

1. Write the Skill's **capability map**: each requirement, and at least one
   golden task that exercises it. Include requirements the Skill may not meet
   yet; a capability task that fails is a finding, not a mistake.
2. Run each task through the Skill Creator loop described under
   [Tooling](#tooling-skill-creator-first): a clean baseline, one fresh Agent
   given the prompt only, the repository change collected as the run's
   outputs, and all four grader groups applied.
3. Repeat to reach the evidence level you want to state.

| Level        | Minimum evidence                                | Allowed statement                                                 |
| ------------ | ----------------------------------------------- | ----------------------------------------------------------------- |
| Defined      | The capability, task, and graders exist         | "The capability has an evaluation design."                        |
| Demonstrated | One valid run passes                            | "The Skill succeeded once on this bounded task."                  |
| Qualified    | Three valid, comparable runs pass in one cohort | "The behavior repeated on this task, runtime, and Skill version." |

Three runs are a local rule, not a success rate; never publish a percentage
from three runs. Invalid runs count neither as passes nor as failures.

Separate Git worktrees can isolate file changes: the staging scripts ran
correctly in one. No Agent run has used a worktree yet, and the browser and
debug session would still be shared, so runs stay one at a time.

## Regression evaluation

**Question:** after a change to the Skill, does behavior that worked before
still work?

Regression protection has two layers, because their costs differ widely.

### Layer 1: deterministic regression

Contract tests (the smoke suite, lint, and framework tests) protect the
mechanisms: the framework runs, fixtures and scripts work, and the Skill
documents still state their key rules. They take seconds, give the same result
every time, and run after every change, including in continuous integration.
They do not test Agent behavior. Anything that can be checked this way belongs
here rather than in an Agent run.

### Layer 2: Agent regression

Graduated golden tasks protect Agent behavior that needs judgment, such as
when to stop or when to restart. Each run takes minutes and its result varies,
so keep this suite small.

- **Graduation.** A capability task joins the regression suite when it reaches
  Qualified: three valid, comparable passes on the current Skill revision.
- **Running.** After each Skill change, run every regression task once on the
  new revision. When a result is unclear, run the same task on the previous
  revision too; Skill Creator calls this the `old_skill` baseline.
- **Reading a failure.** One failure is not yet a regression, because Agent
  runs vary. Run the task twice more on the same revision. Two failures out of
  three is a regression; fix the Skill, or explain why the behavior changed on
  purpose. Never dismiss a failure without the reruns.
- **Changing a requirement.** When a requirement changes on purpose, update the
  task and send it back through graduation.

### Trace checks as regression guards

When a failure is fixed, add a trace check for it if the failure is visible in
the trace. Trace checks run on every scored run, capability, regression, or
field, so a fix that stops holding shows up in the next run of any kind. Read
each result against the Skill revision in force for that run: a check cannot
fail a run that happened before its rule existed.

## Field runs

Field runs are not a goal of their own. They are the best source of **new**
failures, because real applications produce problems no fixture anticipates,
and a poor source of statements, because inputs vary and the network fails.

After each field run:

1. Export the session and run the Skill's trace scorer on it.
2. Answer the Skill's human review questions in a sentence or two.
3. Mark the run `invalid` if infrastructure spoiled it; the scorer's
   infrastructure hints help, but a person decides.
4. Append the record.
5. When a failure appears in more than one run, add it to the Skill's Gotchas,
   add a trace check if it is visible in the trace, and, once it can be
   reproduced on a stable fixture, add a capability task for it.

Step 5 is how a field failure becomes protected behavior: capability task
first, regression task after graduation.

## Tooling: Skill Creator first

Use Anthropic's Skill Creator for every step it covers. Build a custom piece
only where it falls short, and record why. A pilot run of the `hard-path`
golden task on 2026-09-23 established where it does and does not fit a Skill
that edits a shared repository and drives a browser.

| Step                       | Skill Creator piece                                     | What this repository adds, and why                                                                                                          |
| -------------------------- | ------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------- |
| Define tasks               | `evals/evals.json` schema                               | Nothing; the file already follows the schema.                                                                                               |
| Prepare the environment    | None                                                    | `stage.sh` refuses a dirty baseline and stages one task; `unstage.sh` restores the repository. Skill Creator has no environment setup.      |
| Run a fresh Agent          | Executor sub-agent from the "Running test cases" steps  | Runs are launched **one at a time**, not all at once: parallel runs would edit the same repository and share one browser and debug session. |
| Keep the trace             | None                                                    | Nothing to build: Claude Code saves every sub-agent's full trace as `subagents/agent-<id>.jsonl`; copy it into the run folder.              |
| Capture the product        | `outputs/` folder per run                               | `collect-outputs.sh` saves the repository change and an independent re-run into `outputs/`, because the product is a change, not a file.    |
| Record time and tokens     | `timing.json` from the sub-agent result                 | Nothing.                                                                                                                                    |
| Grade expectations         | Grader agent (`agents/grader.md`) → `grading.json`      | Give the grader the raw trace `.jsonl`. It reads it directly; a converted markdown copy lost evidence in the pilot.                         |
| Programmatic checks        | Skill Creator asks for scripts where a check is visible | `score-trace.mjs --merge` adds the trace checks to `grading.json` in its own format.                                                        |
| Compare runs and revisions | `aggregate_benchmark.py`, `old_skill` baseline          | Use only with a baseline and several runs; see the limits below.                                                                            |
| Human review               | Review viewer (`generate_review.py`, `--static`)        | Nothing.                                                                                                                                    |
| Score field runs           | None                                                    | `score-trace.mjs` on the exported session, plus `runs.jsonl`: Skill Creator only evaluates runs it launched.                                |

Skill Creator limits found in the pilot:

- `aggregate_benchmark.py` writes a fixed "3 runs per configuration", leaves
  the model name as a placeholder, and falls back to a character count when it
  cannot find token data. Its delta is meaningful only against a baseline.
  Correct the metadata by hand and read its numbers only for real comparisons.
- The grader expects a `transcript.md` that no Skill Creator step produces.
  The raw `.jsonl` trace works as its transcript and is the more reliable
  evidence, because an Agent's own summary can omit what it did.

Other tools:

| Concern              | Tool                                                                                                           |
| -------------------- | -------------------------------------------------------------------------------------------------------------- |
| Deterministic checks | `npm run test:skills`, `npm run lint`, framework `node --test` suites                                          |
| Browser evidence     | Step Implementor: Playwright CLI (`playwright-cli`, `--debug=cli`); Test Healer: Playwright MCP (`test_debug`) |
| Application checks   | Playwright Test with `playwright-bdd`, TypeScript, ESLint                                                      |

Continuous integration runs the deterministic checks only. Agent runs stay on
demand, because they are probabilistic and cost model time.

## Keeping the evaluation honest

- Test every new check, and the grader agent, against runs whose verdict a
  person already knows, including at least one that should fail.
- Never run a golden task on a dirty baseline. An unrelated change can block
  generation and push the Agent into decisions the task was not built to
  test; such a run is `invalid`.
- Grade successful outcomes and forbidden shortcuts independently.
- Keep golden tasks apart from the examples used while writing the Skill; add
  an unseen holdout set once the task bank is large enough.
- Keep different models, Skill revisions, tools, and task versions in separate
  cohorts.

## Skill-specific policies

Each Skill owns its capability map, regression suite, trace checks, and review
questions:

- Step Implementor: evaluated with Skill Creator's standard loop only; see its
  [evals README](../../.claude/skills/playwright-bdd-step-implementor/evals/README.md).
  The graduation and trace-check rules on this page do not apply to it.
- Test Healer: evaluated with Skill Creator's standard loop only; see its
  [evals README](../../.claude/skills/playwright-bdd-test-healer/evals/README.md).
  The graduation and trace-check rules on this page do not apply to it.
