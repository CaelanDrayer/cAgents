# Algorithm Complexity Patterns

## Inefficient Patterns

### BAD - O(n^2)
```javascript
for (let i = 0; i < users.length; i++) {
  for (let j = 0; j < posts.length; j++) {
    if (posts[j].userId === users[i].id) {
      // ...
    }
  }
}
```

### GOOD - O(n)
```javascript
const postsByUser = posts.reduce((acc, post) => {
  acc[post.userId] = acc[post.userId] || [];
  acc[post.userId].push(post);
  return acc;
}, {});
```

## Check for inefficient patterns:

- Nested loops over same/large datasets
- Linear search when hash lookup possible
- Recursive functions without memoization
- String concatenation in loops (use array.join)

## Memory Leak Detection

### Event listeners not cleaned up
```javascript
componentDidMount() {
  window.addEventListener('resize', this.handleResize);
}
// MISSING: componentWillUnmount cleanup
```

### Timers not cleared
```javascript
const interval = setInterval(() => {}, 1000);
// MISSING: clearInterval
```

### Closure holding references
```javascript
function createHandler() {
  const largeData = fetchLargeData();
  return () => console.log(largeData.length);  // Holds largeData forever
}
```
