# Contributing

This document covers everything you need to know before raising a PR.
Read ARCHITECTURE.md first if you haven't already.

---

## Before you start

- Read `ARCHITECTURE.md` — understand the layers before adding to them
- Read `WORKFLOW.md` — understand the order to build them and why
- Read `docs/blocks.md` — check if a shared block already exists before building one
- Use the Claude skills in `skills/` — they generate correct code by default
- If something feels like it doesn't fit, ask before building it wrong

---

## Naming conventions

| Thing | Convention | Example |
|---|---|---|
| Block component | PascalCase | `FormField.vue` |
| Module folder | PascalCase | `ContactCard/` |
| Container | `[Feature]Container` | `ContactCardContainer.vue` |
| Display component | `[Feature]Display` | `ContactDisplay.vue` |
| Edit component | `[Feature]EditForm` | `ContactEditForm.vue` |
| Layout | `[Name]Layout` | `SettingsLayout.vue` |
| Store wrapper | `use[Domain]Store` | `useContactsStore.ts` |
| Reducers file | `[domain]Reducers` | `contactsReducers.ts` |
| Service file | `[domain]Service` | `contactsService.ts` |
| Orchestration composable | `use[Workflow]` | `useContactMerge.ts` |
| Effects composable | `use[Page]Service` | `useContactsPageService.ts` |
| Story file | `[Component].stories.ts` | `ContactDisplay.stories.ts` |
| Test file | `[Subject].test.ts` | `ContactCardContainer.test.ts` |

---

## File placement rules

| File type | Lives in | Coverage in |
|---|---|---|
| shadcn primitive | `src/components/ui/` | — |
| Block | `src/components/blocks/[Name]/` | `stories/blocks/[Name]/` |
| Module dumb component | `src/components/modules/[Name]/` | `stories/modules/[Name]/` |
| Container | `src/components/modules/[Name]/` | `tests/src/components/modules/[Name]/` |
| Layout | `src/components/layouts/[Name]/` | `stories/layouts/[Name]/` |
| Store | `src/stores/[domain]/` | `tests/src/stores/[domain]/` |
| Orchestration composable | `src/composables/orchestration/` | `tests/src/composables/orchestration/` |
| Effects composable | `src/composables/effects/` | `tests/src/composables/effects/` |
| Utility | `src/utils/` | `tests/src/utils/` |

---

## PR checklist

Before opening a PR, verify every item that applies to your change.

### All PRs
- [ ] Code follows naming conventions above
- [ ] No hardcoded colors — CSS variable tokens only
- [ ] No raw Pinia store imports outside of store wrappers
- [ ] No service calls outside of store wrappers
- [ ] No business logic in components

### Adding a block
- [ ] Lives in `src/components/blocks/[Name]/`
- [ ] No store imports
- [ ] Props typed with TypeScript interface
- [ ] Story exists in `stories/blocks/[Name]/`
- [ ] No test file added

### Adding a module dumb component
- [ ] Lives in `src/components/modules/[Name]/`
- [ ] No store imports
- [ ] Story exists in `stories/modules/[Name]/`
- [ ] No test file added

### Adding a container
- [ ] Named `[Feature]Container.vue`
- [ ] Only imports store wrappers — not raw Pinia stores
- [ ] Loading flags composed before passing to children
- [ ] Test exists in `tests/components/modules/[Name]/`
- [ ] No story added
- [ ] If importing two or more stores — extracted to composable instead

### Adding a layout
- [ ] Named slots only — no props
- [ ] No state, no store imports, no logic
- [ ] Story exists in `stories/layouts/[Name]/`
- [ ] No test file added

### Adding a store
- [ ] All four source files exist: wrapper, reducers, service, types
- [ ] All three test files exist: wrapper, reducers, service
- [ ] Wrapper exposes only `computed()` or `readonly()` state
- [ ] Service is not returned or exposed by the wrapper
- [ ] Reducers are pure — no API calls, no side effects
- [ ] No imports from other store wrappers

### Adding a composable
- [ ] Correct folder: `orchestration/` or `effects/`
- [ ] Test exists in `tests/composables/`
- [ ] Mocks store wrappers — not raw Pinia stores
- [ ] No story added

---

## Code review expectations

### Reviewers look for
- Correct layer placement — is this in the right folder?
- Missing coverage — story without a component, container without a test
- Store wrapper violations — direct Pinia access, exposed services
- Hardcoded colors instead of CSS tokens
- Business logic that belongs in a reducer

### What will get a PR rejected
- A container that imports a raw Pinia store
- A dumb component with a test file
- A container with a story file
- A store that exposes its service
- A reducer with a side effect
- A component that calls a service directly

---

## Using Claude skills

The fastest way to write code that passes review is to use the skills:

```
"create a block called StatusBadge"
"add a ContactDisplay component to the ContactCard module"
"create a store for the organisations domain"
"create an orchestration composable for contact import"
```

Skills are in the `skills/` folder. Install them in your Claude
settings before starting work on a new feature.

---

## Questions

If something in this document conflicts with a skill, the skill
takes precedence — it reflects the most recent decisions.

If something feels unclear or wrong, raise it before working around it.
Bad patterns compound quickly in a shared codebase.
