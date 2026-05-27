---
description: Per-task reflection. The agent reviews its diff + outcome and appends a memory entry. Invoked automatically after every APPROVED task; also runnable on demand.
argument-hint: '<agent-name> <task-id-or-description>'
---

You are running a reflection cycle for an agent.

Inputs: `$ARGUMENTS` should contain the agent name and the task identifier (or a free-text description if the task is being reflected on out of band).

Workflow:

1. **Read** the agent's definition (`.claude/agents/<agent>.md`) and its current memory (`.claude/memory/<agent>.md`).
2. **Read** the task's diff (`git show <task-commit>` or `git diff <before>..<after>`).
3. **Read** any review output associated with the task (search recent SendMessage history or PR comments).
4. **Ask three questions:**
   - What was surprising or hard?
   - What pattern emerged that should be remembered?
   - Did a recurring problem appear that warrants a self-edit to the agent definition?
5. **Append to memory** — create a new memory file at `.claude/memory/<agent>-<short-slug>.md` with frontmatter:

   ```markdown
   ---
   name: <agent>-<short-slug>
   description: <one-line, specific>
   metadata:
     type: <pattern | gotcha | decision | inventory>
     learned_from_task: <task-id-or-description>
     date: <YYYY-MM-DD>
   ---

   <the memory body>
   ```

   Add a one-line pointer to `.claude/memory/MEMORY.md`.

6. **If a pattern recurred:** open a draft self-edit to `.claude/agents/<agent>.md` (do not commit; surface to principal for review on next session).

7. **Commit** the memory file with `docs(memory): <agent> reflection on <task-slug>`.
