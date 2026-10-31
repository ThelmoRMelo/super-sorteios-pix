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

- Raffle buyer data (sorteio_numeros) is owner-only via RLS; public pages read taken numbers through the `numeros_vendidos` RPC so names/phones never leak.
- Public raffle pages load via publishable-key server functions in src/lib/sorteios.functions.ts so SSR can emit per-raffle share tags.
- Draw rules live in src/lib/sorteio-logic.ts (tested) — keep UI free of eligibility logic.
- Reservations and sales serialize on the raffle row in database functions/triggers; public RPCs expose only occupied numbers, and only owners can read buyer details or confirm/cancel orders. This prevents concurrent double allocation across every sale path.
