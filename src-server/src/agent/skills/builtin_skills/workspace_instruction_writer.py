NAME = "workspace-instructions-writer"
DESCRIPTION = """\
Draft workspace instructions from scratch based on the current workspace's goals, conventions, and collaboration needs. Use this skill whenever the user asks to write workspace instructions, create project-level rules, define team directory conventions and collaboration norms, or turn project context into a reusable workspace instruction block.

Typical triggers include:
- asking to write workspace instructions
- asking for project-wide rules or conventions
- asking to capture directory conventions, collaboration norms, or shared context
- asking to turn project goals into reusable instructions for future sessions"""
CONTENT = """\
# Workspace Instructions Writer

Write clear, practical workspace instructions that match the workspace's actual purpose. The goal is not to produce generic policy text, but to give the assistant durable project-level guidance that improves future work in this workspace.

## What this skill does

Help the user create workspace instructions from scratch by:

1. inferring the workspace's purpose from the user's request and any available context
2. identifying the conventions that should live at workspace level rather than in a one-off reply
3. drafting a concise but complete workspace instruction set
4. presenting:
   - a brief analysis of the workspace needs
   - a final instruction block the user can copy directly

## When to use this skill

Use this skill when the user wants to define or formalize workspace-level guidance, especially for a Dais-style environment.

Typical triggers include:

- asking to write workspace instructions
- asking for project-wide rules or conventions
- asking to capture directory conventions, collaboration norms, or shared context
- asking to turn project goals into reusable instructions for future sessions

Do not use this skill for:

- one-off task prompts that are not meant to persist at workspace level
- agent instructions or persona design unless the user explicitly wants workspace-level behavior
- deep codebase implementation work

## Core approach

Follow this sequence:

1. **Understand the workspace goal**
2. **Extract persistent rules**
3. **Separate workspace instructions from agent/task instructions**
4. **Draft the instruction block**
5. **Return analysis + final copyable version**

The key distinction is scope:

- **Workspace instructions** = stable, project-level guidance that should apply broadly
- **Agent instructions** = role/persona/task-specific behavior
- **Task instructions** = temporary requirements for the current request

If something is too temporary, too narrow, or only relevant to one task, do not place it in workspace instructions.

## Information to gather

Before drafting, identify as much of the following as possible from the conversation or workspace context:

- What is this workspace mainly for?
- What kinds of tasks happen here most often?
- Is this a coding workspace, research workspace, writing workspace, operations workspace, or mixed-use workspace?
- Are there important directory conventions?
- Are there naming conventions or file placement expectations?
- Are there shared collaboration norms the assistant should follow?
- Are there domain-specific terms or assumptions that should be treated as background knowledge?
- Is the user optimizing for speed, precision, safety, consistency, or minimal changes?
- Are there explicit things the assistant should avoid doing in this workspace?

If important information is missing, ask focused questions. Keep them short and practical.

## Drafting principles

When writing workspace instructions:

- Prefer concrete rules over abstract values
- Prefer durable guidance over temporary preferences
- Keep the scope at workspace level
- Avoid repeating base-system behavior unless the workspace truly needs a stricter local rule
- Avoid bloated policy text
- Use language that future runs can follow consistently
- Make conventions easy to scan

The instructions should feel like a reliable operating manual for this workspace, not a motivational document.

## Recommended output structure

Always return two sections:

### 1. Analysis

Briefly explain:

- what kind of workspace this appears to be
- which rules belong at workspace level
- any assumptions you made because context was missing

### 2. Final Workspace Instructions

Provide a clean block the user can copy directly.

Use a structure like this when appropriate:

```md
## Project Context
...

## Directory / File Conventions
...

## Working Norms
...

## Constraints / Avoid
...

## Domain Notes
...
"""
