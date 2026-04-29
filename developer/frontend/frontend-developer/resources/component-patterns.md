# Component Design Patterns

Reference for frontend component architecture and design patterns.

## Component Architecture

### Composition Patterns

**Container/Presentational Split**:
```jsx
// Container: data fetching, state management
function UserListContainer() {
  const { data, loading, error } = useUsers();
  if (loading) return <Skeleton />;
  if (error) return <ErrorBanner message={error.message} />;
  return <UserList users={data} />;
}

// Presentational: pure rendering, accepts props
function UserList({ users }) {
  return (
    <ul role="list">
      {users.map(user => <UserCard key={user.id} user={user} />)}
    </ul>
  );
}
```

**Compound Components**:
```jsx
// Flexible API via composition
<Select value={selected} onChange={setSelected}>
  <Select.Trigger>{selected || 'Choose...'}</Select.Trigger>
  <Select.Options>
    <Select.Option value="a">Option A</Select.Option>
    <Select.Option value="b">Option B</Select.Option>
  </Select.Options>
</Select>
```

**Render Props / Children as Function**:
```jsx
<DataFetcher url="/api/users">
  {({ data, loading }) => loading ? <Spinner /> : <UserList users={data} />}
</DataFetcher>
```

### Custom Hook Patterns

```jsx
// Encapsulate complex logic in hooks
function useDebounce(value, delay = 300) {
  const [debouncedValue, setDebouncedValue] = useState(value);

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedValue(value), delay);
    return () => clearTimeout(timer);
  }, [value, delay]);

  return debouncedValue;
}

// Composable data fetching
function useApi(url) {
  const [state, setState] = useState({ data: null, loading: true, error: null });

  useEffect(() => {
    let cancelled = false;
    setState(prev => ({ ...prev, loading: true }));

    fetch(url)
      .then(res => res.json())
      .then(data => { if (!cancelled) setState({ data, loading: false, error: null }); })
      .catch(error => { if (!cancelled) setState({ data: null, loading: false, error }); });

    return () => { cancelled = true; };
  }, [url]);

  return state;
}
```

## State Management Patterns

### Local State (useState/useReducer)
- **Use for**: Form inputs, toggles, UI-only state
- **Scope**: Single component

### Lifted State
- **Use for**: State shared between siblings
- **Scope**: Common parent component

### Context
- **Use for**: Theme, auth, locale (infrequently changing)
- **Scope**: Subtree of components
- **Avoid for**: Frequently changing data (causes re-renders)

### External Store (Zustand, Redux, Jotai)
- **Use for**: Complex app state, server cache, cross-cutting concerns
- **Scope**: Application-wide

### Decision Matrix

| State Type | Tool | Example |
|-----------|------|---------|
| UI toggle | useState | Modal open/closed |
| Form data | useReducer | Multi-field form with validation |
| Theme/locale | Context | Dark mode, language |
| Server data | React Query / SWR | API responses with caching |
| Complex app state | Zustand / Redux | Shopping cart, filters |

## Form Patterns

### Controlled Form with Validation

```jsx
function ContactForm({ onSubmit }) {
  const [values, setValues] = useState({ name: '', email: '', message: '' });
  const [errors, setErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);

  function validate(vals) {
    const errs = {};
    if (!vals.name.trim()) errs.name = 'Name is required';
    if (!vals.email.match(/^[^@]+@[^@]+$/)) errs.email = 'Valid email required';
    if (vals.message.length < 10) errs.message = 'Message must be 10+ characters';
    return errs;
  }

  async function handleSubmit(e) {
    e.preventDefault();
    const errs = validate(values);
    setErrors(errs);
    if (Object.keys(errs).length > 0) return;

    setSubmitting(true);
    try {
      await onSubmit(values);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} noValidate>
      <Field label="Name" error={errors.name}>
        <input value={values.name} onChange={e => setValues(v => ({...v, name: e.target.value}))} />
      </Field>
      {/* ... other fields */}
      <button type="submit" disabled={submitting}>
        {submitting ? 'Sending...' : 'Send'}
      </button>
    </form>
  );
}
```

## Error Boundary Pattern

```jsx
class ErrorBoundary extends React.Component {
  state = { hasError: false, error: null };

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, info) {
    logErrorToService(error, info.componentStack);
  }

  render() {
    if (this.state.hasError) {
      return this.props.fallback || <ErrorFallback error={this.state.error} />;
    }
    return this.props.children;
  }
}

// Usage
<ErrorBoundary fallback={<p>Something went wrong</p>}>
  <DashboardWidget />
</ErrorBoundary>
```

## Loading State Patterns

| Pattern | Use When | Example |
|---------|----------|---------|
| Spinner | Short wait (<2s), small area | Button loading |
| Skeleton | Page/section load, known layout | Content cards |
| Progressive | Large data sets, streaming | Infinite scroll |
| Optimistic | High-confidence mutations | Like button, toggle |
| Stale-while-revalidate | Background refresh | Data dashboard |
