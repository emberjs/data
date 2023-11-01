export interface FieldSchema {
  type: string | null;
  name: string;
  kind: 'attribute' | 'resource' | 'collection' | 'derived' | 'object' | 'array';
  options?: Record<string, unknown>;
}
export type Schema = Map<string, FieldSchema> & { $name?: string };
export type Schemas = Map<string, Schema>;

async function digestMessage(message: string) {
  const msgUint8 = new TextEncoder().encode(message); // encode as (utf-8) Uint8Array
  const hashBuffer = await crypto.subtle.digest("SHA-256", msgUint8); // hash the message
  const hashArray = Array.from(new Uint8Array(hashBuffer)); // convert buffer to byte array
  const hashHex = hashArray
    .map((b) => b.toString(16).padStart(2, "0"))
    .join(""); // convert bytes to hex string
  return hashHex;
}

export default async function parseAQL(aql: string, schemas: Schemas) {
  if (!aql) {
    throw new Error('You must provide a query to parse');
  }

  const currentPath: string[] = [];
  const contexts: Record<string, unknown>[] = [];
  const fields: Record<string, Set<string>> = {};
  const includes: string[] = [];
  const query: Record<string, unknown> = {};
  const statements: string[] = [];

  // debug
  let seen = '';

  // previous statement was `QUERY`
  let isParsingQuery = false;

  // previous statement was the primary resource type
  let isParsingQueryBody = false;
  let primaryResourceType: string | null = null;

  // previous statement was `data`
  let isParsingData = false;

  // previous statement was `=`
  let isParsingValue = false;
  let isInQuotedContext = false;

  // detected '#' comment control character
  let continueToNextLine = false;

  // situationally we know the next control character MUST match a specific value
  let expectedControlToken: string | null = null;

  // maybe unused?
  let isParsingStatement = false;

  // The schema for the current context if any
  let currentSchema: Schema | null = null;

  // the current {} context
  let currentContext: Record<string, unknown> | null = null;

  // the current statement to append new chars to as they are read in
  let currentStatement: string | null = null;
  let currentStatementParts: string[] = [];

  function printState() {
    console.dir({
      primaryResourceType,
      currentPath,
      fields,
      includes,
      seen,
      query,
      statements,
      isParsingData,
      isParsingStatement,
      isParsingQueryBody,
      isInQuotedContext,
      isParsingQuery,
      isParsingValue,
      currentContext,
      currentStatement,
      currentStatementParts,
      continueToNextLine,
      expectedControlToken,
    }, { depth: null });
  }

  function handleExpectedControlChar(controlChar: '\n' | ';' | ' ' | '}' | '{' | '#') {
    if (expectedControlToken) {
      if (controlChar === expectedControlToken) {
        expectedControlToken = null;
      } else if (expectedControlToken === '{' && (controlChar === ';' || controlChar === '}')) {
        throw new Error(`Unexpected token ${controlChar}, expected ${expectedControlToken}`);
      } else if (expectedControlToken === '}') {
        throw new Error(`Unexpected token ${controlChar}, expected ${expectedControlToken}`);
      }
    }
  }

  function addStatementToContext(lastStatement: string) {
    if (!lastStatement || !currentContext) {
      throw new Error('Unexpected Statement End');
    }
    // the key should be a field in the schema
    if (!currentSchema) {
      throw new Error('No schema defined');
    }
    const field = currentSchema.get(lastStatement);
    if (!field) {
      throw new Error(`No field defined for ${lastStatement}`);
    }

    const name = currentSchema.$name;
    if (!name) {
      throw new Error('No schema name defined');
    }
    fields[name] = fields[name] || new Set();
    fields[name].add(field.name);
    return field;
  }

  function handleOpenContext() {
    if (!isParsingQueryBody && expectedControlToken === '{') {
      isParsingQueryBody = true;
      currentContext = query;
      contexts.push(currentContext);
    } else {
      const lastStatement = statements.at(-1);
      if (!lastStatement || !currentContext) {
        throw new Error('Unexpected token {');
      }
      if (isParsingData && currentContext !== query) {
        const field = addStatementToContext(lastStatement);

        if (field.kind === 'resource' || field.kind === 'collection') {
          const schema = schemas.get(field.type!);
          if (!schema) {
            throw new Error(`No schema defined for ${field.type}`);
          }
          currentPath.push(field.name);
          schema.$name = field.type!;
          currentSchema = schema;
          includes.push(currentPath.join('.'));
        }
      }
      const newContext = {};
      currentContext[lastStatement] = newContext;
      contexts.push(newContext);
      currentContext = newContext;
    }
  }

  function handleCloseContext() {
    if (contexts.length === 0) {
      throw new Error('Unexpected token }');
    }
    contexts.pop();
    if (currentPath.length) {
      currentPath.pop();
    }
    currentContext = contexts.at(-1) || null;
    if (currentContext === query) {
      isParsingData = false;
    }
  }

  function handleStatementEnd(stmt: string, controlChar: '\n' | ';' | ' ' | '}' | '{' | '#') {
    const isStatementTerminus = controlChar !== ' ';
    if (!isParsingQuery) {
      if (stmt === 'QUERY') {
        isParsingQuery = true;
        currentStatement = null;
        return;
      }
      throw new Error(`Unexpected statement ${stmt} outside of QUERY context`);
    }

    if (!isParsingQueryBody) {
      const schema = schemas.get(stmt);
      if (!schema) {
        throw new Error(`No schema defined for primary resource ${stmt}`);
      }
      schema.$name = stmt;
      currentSchema = schema;
      primaryResourceType = stmt;
      fields[stmt] = fields[stmt] || new Set();
      currentStatement = null;
      expectedControlToken = '{';
      return;
    }

    if (currentContext === query && stmt === 'data') {
      isParsingData = true;
      statements.push(stmt);
      currentStatement = null;
      expectedControlToken = '{';
      return;
    }

    if (isParsingData && isStatementTerminus) {
      addStatementToContext(stmt);
    }

    statements.push(stmt);
    currentStatement = null;
  }

  function processStatement(controlChar: '\n' | ';' | ' ' | '}' | '{' | '#') {
    // printState();
    if (currentStatement) {
      handleStatementEnd(currentStatement, controlChar);
    } else if (controlChar === '{') {
      handleOpenContext();
    } else if (controlChar === '}') {
      handleCloseContext();
    } else if (currentStatement && controlChar === ' ') {
      currentStatementParts.push(currentStatement);
      currentStatement = null;
    }

    handleExpectedControlChar(controlChar);

    isParsingStatement = false;
    isInQuotedContext = false;
    isParsingValue = false;
  }

  for (const char of aql) {
    // seen += char;
    if (char === '\n') {
      if (expectedControlToken) {
        throw new Error(`Unexpected end of line, expected ${expectedControlToken}`);
      }
      processStatement(char);
      continueToNextLine = false;
      continue;
    }

    if (continueToNextLine) {
      continue;
    }

    if (!isInQuotedContext && char === '#') {
      if (expectedControlToken) {
        throw new Error(`Unexpected end of line, expected ${expectedControlToken}`);
      }
      processStatement(char);
      continueToNextLine = true;
      continue;
    }

    if (!isInQuotedContext && (char === ';' || char === ' ' || char === '}' || char === '{')) {
      processStatement(char);
      continue;
    }

    if (!currentStatement) {
      currentStatement = char;
    } else {
      currentStatement += char;
    }
  }

  if (Object.keys(fields).length) {
    query.fields = {};
    Object.keys(fields).forEach((key) => {
      const props =  Array.from(fields[key]);
      if (props.length === 0) {
        return;
      }
      (query.fields as Record<string, string|string[]>)[key] = props.length > 1 ? props : props[0];
    });
  }
  if (includes.length) {
    query.include = includes.length > 1 ? includes : includes[0];
  }
  delete query.data;
  const id = await digestMessage(aql);
  const persisted = {
    'q:id': id,
    'q:type': primaryResourceType,
    'q:search': query,
  }

  console.dir(persisted, { depth: null });
  return persisted;
}
