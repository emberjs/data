type PossibleTypes =
  | "string" | "number" | "boolean" | "symbol" | "undefined" | "object" | "function"
  | 'Array'
  | 'Date'
  | 'Null';

// TODO: use guardclauses instead of re-assigning the value of type 
//       so that the type usage becomes simpler
export default function typeOf(value: any): string {
  let type: PossibleTypes = typeof value;

  if (type === "object") {
    if (value instanceof Array) {
      type = 'Array';
    } else if (value instanceof Date) {
      type = "Date";
    } else if (value === null) {
      type = "Null";
    } else {
      type = value;
    }
  }

  return type;
}
