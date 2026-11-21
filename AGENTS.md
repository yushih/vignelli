# Working on Vignelli

Use [SPEC.md](SPEC.md) as the source of truth for user-visible behavior.

1. Find the acceptance check that covers the request. For a new or changed behavior, update the spec first. For a bug covered by an existing check, use that check as written.
2. Make the smallest change that satisfies the check. Edit the sources in `extension/` and generate `extension/dist/` with the build.
3. Run `npm run build` from `extension/` for extension changes. Reload the unpacked extension and exercise the affected checks on an ordinary webpage. Report what you verified and any checks you could not run.

Keep small changes in this single spec. Implementation-only edits can use the existing checks.
