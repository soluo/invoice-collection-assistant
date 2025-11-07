# Anti-Pattern: Syncing React State with URL Search Params

## ❌ NEVER DO THIS

```tsx
// Dual source of truth - URL AND React state
const [filter, setFilter] = useState(() => searchParams.get("filter") || "");

useEffect(() => {
  setFilter(searchParams.get("filter") || "");
}, [searchParams]); // Syncing URL → state
```

**Problems:**
- Dual source of truth (URL + state)
- Unnecessary useEffect complexity
- Multiple re-renders
- Breaks React Router's design

## ✅ CORRECT APPROACH

```tsx
// URL is the ONLY source of truth
const appliedFilter = searchParams.get("filter") || "";

// Use local state ONLY for form inputs (pre-submission)
const [formFilter, setFormFilter] = useState(appliedFilter);

const handleSubmit = () => {
  setSearchParams({ filter: formFilter }); // Update URL only
};
```

**Benefits:**
- Single source of truth (URL)
- Browser back/forward works automatically
- No synchronization needed
- Simpler, more maintainable

## Rule

**URL search params = Source of truth**
**Local state = Only for controlled inputs before submission**
