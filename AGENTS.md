<!-- LOVABLE:BEGIN -->
> [!IMPORTANT]
> This project is connected to [Lovable](https://lovable.dev). Avoid rewriting
> published git history — force pushing, or rebasing/amending/squashing commits
> that are already pushed — as it rewrites history on Lovable's side and the
> user will likely lose their project history.
>
> Commits you push to the connected branch sync back to Lovable and show up in
> the editor, so keep the branch in a working state.
<!-- LOVABLE:END -->

Use the wali kelas teacher record's private `spesimen-ttd` image in monthly attendance PDF exports, matching by NIP (or an unambiguous exact name) and embedding downloaded data URLs; this avoids exposing private file links and signing the wrong teacher's name.

Compute daily KBM input completeness from paginated reports in a dedicated authenticated read, independently of the limited recap list; this prevents recorded periods being mislabeled as missing.

Use the shared role registry and primary-role selector for account validation, menu settings, and profile display; this keeps new roles consistent without granting administrator privileges.

Keep PJJ reports owned by the signed-in creator with RLS-enforced reads and private storage evidence; input lists are always owner-scoped, while only admin/superadmin recap reads span owners.
Use Agenda Guru's authenticated teacher and daily schedule reads for PJJ class selection, and validate the selected slot when saving; this keeps classes, subjects, and periods consistent with teaching assignments.
