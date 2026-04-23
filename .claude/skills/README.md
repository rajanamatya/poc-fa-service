# Skills

This folder contains Claude skills for this project. Skills are
instruction files that teach Claude to generate code that follows
our conventions automatically. They are version controlled alongside
the codebase — when conventions change, skills change in the same PR.

---

## What is a skill

A skill is a `SKILL.md` file inside a named folder under `.claude/skills/`.
Claude picks up skills automatically from this directory when using Claude Code.
You do not need to reference a skill by name — Claude selects the right one
based on your request.

---

## Installing skills

Skills in this project are local — no installation needed. Because the skills
live in `.claude/skills/`, Claude Code picks them up automatically when you
open this project. They are version controlled alongside the codebase so the
whole team gets them without any manual steps.

---

## Available skills

| Skill folder | What it does | When Claude uses it |
|---|---|---|
| [`vue-project-setup`](vue-project-setup/SKILL.md) | Scaffolds a Vue 3 SPA — Vue Router, Pinia, shadcn-vue, Storybook, Vitest | "set up a new project", "create a new app", "bootstrap" |
| [`vue-block`](vue-block/SKILL.md) | Creates a dumb block component + story | "create a block", "add a FormField" |
| [`vue-module-dumb`](vue-module-dumb/SKILL.md) | Creates display and edit form components + stories | "create a display component", "add an edit form" |
| [`vue-layout`](vue-layout/SKILL.md) | Creates a slot-based layout + story | "create a layout", "add a page layout" |
| [`vue-story`](vue-story/SKILL.md) | Creates a Storybook story for any component | "add a story", "write stories for" |
| [`vue-smart-container`](vue-smart-container/SKILL.md) | Creates a container + test | "create a container", "connect to the store" |
| [`vue-store`](vue-store/SKILL.md) | Creates a full domain store + tests | "create a store", "add a domain" |
| [`vue-composable`](vue-composable/SKILL.md) | Creates an orchestration or effects composable + test | "create a composable", "coordinate two stores" |
| [`aws-deploy`](aws-deploy/SKILL.md) | Scaffolds CDK stacks, Lambda functions, shared API types, and deploys to AWS | "deploy to AWS", "set up CDK", "add a Lambda", "move off localStorage" |

---

## Usage examples

Each skill is triggered naturally by describing what you want:

```
"Create a block called StatusBadge that shows a coloured label"

"Add a ContactDisplay and ContactEditForm to the ContactCard module"

"Create a store for the organisations domain"

"Add an orchestration composable to coordinate contacts and organisations"

"Deploy to AWS — the app is working locally with localStorage"
```

You do not need to say "use the vue-block skill" — Claude infers
the right skill from your description.

---

## Updating skills

When the team changes a convention:

1. Update the relevant `SKILL.md` in this folder
2. Commit and push — teammates get the update automatically on next pull
3. Update `docs/ARCHITECTURE.md` and `docs/DECISIONS.md` if the
   change is significant enough to document

The skills are the source of truth for code generation conventions.
If a skill conflicts with a doc, update the doc to match the skill.

---

## Adding a new skill

When a new repeatable pattern emerges in the codebase:

1. Create a new folder in `.claude/skills/` named `[purpose]/`
2. Add a `SKILL.md` following the structure of existing skills
3. Include in the frontmatter:
   - `name` — short identifier
   - `description` — what it does AND when to trigger it
4. Add the skill to the table above
5. Raise a PR so the team can review and install it

A good skill:
- Has a single clear purpose
- Produces complete, ready-to-use output
- Enforces conventions without branching logic
- Includes required output checklist so nothing gets skipped

---

## Skill structure reference

```
.claude/skills/
└── skill-name/
    ├── SKILL.md          # required — instructions for Claude
    └── references/       # optional — supporting docs Claude can read
        └── example.md
```

Every skill follows the same `SKILL.md` format:

```markdown
---
name: skill-name
description: What it does and when to trigger it.
---

# Skill Title

Brief description.

## Required output
What must exist when the task is complete.

## Rules
Conventions this skill enforces.

## Templates
Code templates Claude follows.

## File structure output
Where files land in the project.
```
