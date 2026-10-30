---
name: plan-to-issues
description: Split this repo's plan.md into GitHub issues with gh, one per unit of work, after a human has reviewed the split. Use when a plan is ready and has no issues yet.
---

# plan-to-issues

Turns `plan.md` into GitHub issues that workers can pick up cold. Easiest with `gh`, authenticated,
in a shell this agent can run.

## Steps

1. Read `plan.md`, `AGENTS.md` and `docs/adr/`.
2. Draft the split as a table: title · plan section · scope · done when · blocked by.
   One issue per unit of work.
3. **Stop and show the table to the human.** Publish nothing until they approve it.
4. Ask the human what every issue here must carry (fields, labels, wording), unless it is
   already written down in this session or in the repo. The shape below is the one the human
   approved for morning-digest; start from it.
5. Create each issue in dependency order, so blocked-by can cite real numbers:

   ```sh
   gh label create "plan:<plan>"   # once per plan, if it doesn't exist
   gh issue create --title "<title>" --label "plan:<plan>" --body-file <tmp.md>
   ```

## Issue shape

Every issue carries the label `plan:<plan>` (the `plan:` key in `plan.md`'s frontmatter) and
this body. The reviewer sorts by the first line, so it is always first:

```md
Source: plan.md § <n>

## Scope

<what this issue changes, and what it leaves to other issues>

## Done when

<the plan's "Done when", checkable>

## Blocked by

<#n, … or —; say what is needed to start and what is needed to close, if they differ>
```

- One issue per unit of work. Splitting a section is fine (the source line repeats); inventing
  one is not.
- A "Done when" that waits on someone outside the lane (a reviewer, a deploy) names that event:
  "the reviewer has looked", not "the link is sent". The issue stays open until it happens, and
  whatever depends on it (a clean-up) is blocked by it.
- Commit with `closes #n` only when the commit itself makes "Done when" hold; GitHub closes
  the issue on push, so add the closing comment right after.

6. Record every issue URL from gh's output (not from memory) and reply with the list.

Closing one, with the closing comment from AGENTS.md:

```sh
gh issue close <n> -c "<closing comment>"
```

## No `gh`

Steps 1–4 hold either way. GitHub reachable another way (a connector, the REST API, the web UI):
the same issues, made that way. GitHub issues out of reach altogether: write them as files in
`docs/issues/`, format in ADR 0004, then commit and push.

## Don'ts

- Don't paste the whole plan into one issue, and don't keep issues only in chat.
- Don't invent sections the plan doesn't have. If the plan is unclear, ask.
