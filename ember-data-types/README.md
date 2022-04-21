## Generics

### Naming

Always utilize the type utilities when constructing these generics, adding their constraints, or setting default values. See the utilities section below.

- `R` refers to `ResolvedRegistry<RegistryMap>`

**Working with a resolveable record type**
- `T` refers to the primary type of record being referenced and satisfies `keyof R['model'] & string`
- `K` refers to the primary record instance being referenced and satisfies `R['model'][T]`
- `F` refers to a field on the primary record instance being referenced and satisfies `keyof R['model'][T] & string`

**Working with relationships:**
- `RT` refers to a record type related to the current record type (`T`)
- `RK` refers to an instance of a record related to the current record (`K`)
- `RF` refers to a field on the related record `RK`. Currently this can be any field, as relationships are not typed in a way in which we have inverse information.

### Ordering

Generics should generally be ordered the same as they are shown in the `Naming` list above, with the exception of public APIs with defaults for the generics.

For instance a Public APIs that requires `R` and defaults it to the `DefaultRegistry` will position `R` after a generic which it does not default. This is both because Typescript enforces that generics with defaults come last, and because it allows consumers to specify the minimum number of generics if they find themselves in a position where they need to specify one at all.

### Utilities

- `RecordType<R>` will give the union of possible types as strings
- `RecordInstance<R, T>` will give the union of possible records in `R` if `T` is a union, or the specific record if `T` is resolveable
- `RecordField<R, T>` will give the union of possible fields on `RecordInstance<R, T>` as strings

### User Facing Generics

Consumers of public APIs should be able to but never required to set generics for any of the named generics
in this document.
