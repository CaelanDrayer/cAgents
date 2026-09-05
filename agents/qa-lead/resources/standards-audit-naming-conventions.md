# Naming Conventions by Language

Language-specific naming rules for consistent code style.

## JavaScript/TypeScript

```javascript
// Classes: PascalCase
class UserService {}

// Functions/variables: camelCase
function getUserById() {}
const userName = "John";

// Constants: UPPER_SNAKE_CASE
const MAX_RETRIES = 3;

// Private: prefix with underscore
class Example {
  _privateMethod() {}
}

// Boolean variables: is/has/should prefix
const isActive = true;
const hasPermission = false;
```

## Python

```python
# Classes: PascalCase
class UserService:
    pass

# Functions/variables: snake_case
def get_user_by_id():
    pass

user_name = "John"

# Constants: UPPER_SNAKE_CASE
MAX_RETRIES = 3

# Private: prefix with underscore
def _private_function():
    pass
```

## Go

```go
// Exported: PascalCase
type UserService struct{}
func GetUserById() {}

// Unexported: camelCase
type userHelper struct{}
func getUserById() {}

// Constants: PascalCase or camelCase
const MaxRetries = 3
const maxRetries = 3 // unexported
```

## Common Patterns

### Boolean Variables
```javascript
// Good: is/has/should/can prefix
const isActive = true;
const hasPermission = false;
const shouldRefresh = true;
const canEdit = false;

// Bad: unclear meaning
const active = true;
const permission = false;
```

### Collections
```javascript
// Good: plural names
const users = [];
const itemList = [];
const userMap = {};

// Bad: singular for collections
const user = [];
```

### Functions
```javascript
// Good: verb + noun
function getUserById() {}
function validateEmail() {}
function calculateTotal() {}

// Bad: ambiguous
function user() {}
function email() {}
function total() {}
```

## Anti-Patterns

```javascript
// Avoid single-letter variables (except loop counters)
const x = getUserData();  // Bad
const userData = getUserData();  // Good

// Avoid generic names
const temp = calculate();  // Bad
const subtotal = calculate();  // Good

// Avoid abbreviations
const usrNm = "John";  // Bad
const userName = "John";  // Good

// Avoid misleading names
const userList = {};  // Bad (it's an object)
const userMap = {};  // Good
```
