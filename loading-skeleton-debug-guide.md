# Debug Guide: Loader works, then blank screen instead of skeleton

**Symptom:** Loader (spinner) appears and disappears correctly. The skeleton never shows. Screen goes blank — either instead of the skeleton, or in the gap before real content renders.

## Start here: Loader and Skeleton are usually two different loading *phases*, not two options for the same one

- **Loader** → app-shell / route level. You don't know the page's layout yet (auth check, initial route resolve, code-split chunk downloading).
- **Skeleton** → content level. The page shell has mounted, you know the layout, and you're waiting on *data* to fill it.

If both are wired to the same boolean, or nested in a way where the outer "loader" condition resolves before the inner "skeleton" condition is ever evaluated correctly, you'll see exactly this bug: loader hides right, and then whatever's rendered next has no valid state to show. Check which level each component actually lives at before chasing the causes below.

---

## Ranked causes — check in this order

### 1. The skeleton's condition can mathematically never become true
The most common version: `loading` and `data` get set together in the same `.then()`, so there's no moment where `!loading && !data` is true — meaning a skeleton gated on "not loading, no data yet" never fires.

```tsx
// Bug: skeleton condition can never trigger, since loading and data
// always flip in the same tick
const [loading, setLoading] = useState(true);
const [data, setData] = useState(null);

useEffect(() => {
  fetchData().then((res) => {
    setData(res);
    setLoading(false);
  });
}, []);

return (
  <>
    {loading && <Loader />}
    {!loading && !data && <Skeleton />}   {/* dead code */}
    {!loading && data && <Content data={data} />}
  </>
);
```

If the fetch throws and isn't caught, `loading` can end up `false` with `data` still `null` — and if the `<Skeleton />` branch above is *also* unreachable for the reason shown, you get a permanent blank screen. This matches "blank screen after loader" almost exactly if there's any unhandled rejection in the fetch chain.

**Check:** does your `.catch()` (if it exists) set an error state, or does it silently do nothing / just flip `loading` false?

### 2. `AnimatePresence mode="wait"` creates a real, deliberate gap
If Loader → Skeleton → Content are siblings inside a Framer Motion `<AnimatePresence mode="wait">`, the library waits for the outgoing component's exit animation to fully finish *before* mounting the next one. That gap is blank by design.

```tsx
// mode="wait" = Loader must fully exit-animate before Skeleton mounts
<AnimatePresence mode="wait">
  {phase === 'loading' && <Loader key="loader" exit={{ opacity: 0 }} />}
  {phase === 'skeleton' && <Skeleton key="skeleton" />}
  {phase === 'content' && <Content key="content" />}
</AnimatePresence>
```

**Check:** search the loading region for `AnimatePresence`. If `mode="wait"` is set and the Loader has an `exit` prop with a non-zero duration, that's your gap.

**Fix:** drop `mode="wait"` (default overlaps enter/exit) or remove the Loader's exit animation so it disappears instantly instead of animating out.

### 3. Skeleton renders, but it's invisible
DOM node exists, but nothing is visible — reads as "blank" to you even though it's technically there.

- **Tailwind + dynamic class names**: `` className={`bg-gray-${shade}00`} `` won't be picked up by Tailwind's JIT compiler since it can't statically analyze an interpolated string. No background color applies. Use a static class or a lookup map instead: `{ light: 'bg-gray-200', dark: 'bg-gray-700' }[shade]`.
- **Zero height**: skeleton bones with no explicit `width`/`height` and no content inside collapse to 0px.
- **Missing keyframes**: if the shimmer/pulse animation references a `@keyframes` name that's misspelled or defined in a stylesheet that isn't imported on this route, the element can get stuck at its animation's `0%` state (often `opacity: 0`).

**Check:** inspect the DOM in devtools during the bug — is a skeleton element present with zero computed height, or present with no background color applied?

### 4. Two independent loading flags, not one source of truth
`isLoading` (spinner) and something like `isFetching` / `showSkeleton` (skeleton) tracked as separate `useState` calls that aren't derived from each other. Timing between the two setState calls isn't guaranteed to line up on the same render.

If you're on React Query / SWR: `isLoading` (no cached data, first fetch) and `isFetching` (any fetch, including background refetch) mean different things — using the wrong one for the skeleton condition is a common mismatch.

### 5. Route-level Suspense fallback resolves before the client component has anything to show
If the outer loader is a route-level `Suspense` fallback and the inner skeleton depends on client state that only gets set inside a `useEffect` (which runs *after* first paint), there's one render where the component has mounted, the Suspense fallback is gone, and the skeleton-triggering state hasn't been set yet. That render paints blank.

**Fix:** initialize the skeleton-controlling state as `true` by default (synchronously, not via effect) so the very first render already shows the skeleton, rather than starting from a state that implies content.

---

## Recommended pattern: one status enum, not multiple booleans

This makes the "gap" structurally impossible — every branch is mutually exclusive off a single variable.

```tsx
type AsyncState<T> =
  | { status: 'loading' }
  | { status: 'success'; data: T }
  | { status: 'empty' }
  | { status: 'error'; message: string };

function useAsyncData<T>(
  fetchFn: () => Promise<T>,
  isEmpty: (data: T) => boolean = () => false
) {
  const [state, setState] = useState<AsyncState<T>>({ status: 'loading' });

  useEffect(() => {
    let cancelled = false;
    setState({ status: 'loading' });

    fetchFn()
      .then((data) => {
        if (cancelled) return;
        setState(isEmpty(data) ? { status: 'empty' } : { status: 'success', data });
      })
      .catch((err) => {
        if (cancelled) return;
        setState({
          status: 'error',
          message: err instanceof Error ? err.message : 'Failed to load',
        });
      });

    return () => {
      cancelled = true;
    };
  }, [fetchFn]);

  return state;
}
```

Rendering — exactly one branch can ever match:

```tsx
const state = useAsyncData(() => fetchLeads(), (data) => data.length === 0);

if (state.status === 'loading') return <LeadsTableSkeleton rows={8} />;
if (state.status === 'error') return <ErrorState message={state.message} onRetry={refetch} />;
if (state.status === 'empty') return <EmptyState message="No leads yet" />;
return <LeadsTable data={state.data} />;
```

Reserve a plain `<Loader />` spinner for a level *above* this — app shell, auth resolution, route transitions — where you genuinely don't know the layout yet. Once you're inside a mounted page, use this pattern instead of a second loader.

---

## Checklist for your coding agent

- [ ] Count the independent loading-related boolean states in the affected component/hook — should be 1 status value, not 2+ separate booleans
- [ ] Search for `AnimatePresence` wrapping the loader/skeleton/content region; check the `mode` prop and whether the loader has an `exit` animation
- [ ] Confirm the `.catch()` (or try/catch) on the data fetch sets a distinct error state — not just `loading = false`
- [ ] Confirm skeleton CSS classes are static strings, not template-interpolated
- [ ] Confirm any skeleton-controlling state is initialized synchronously to its "show skeleton" value, not set later inside a `useEffect`
- [ ] If on React Query/SWR: confirm the skeleton condition uses `isLoading` (first fetch, no cached data) rather than `isFetching` unless background-refetch skeletons are actually intended

If none of these match after checking, paste the actual loading component (or the hook + JSX that renders Loader/Skeleton/Content) and it can be fixed directly instead of diagnosed blind.
