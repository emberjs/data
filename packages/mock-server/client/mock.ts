export interface Scaffold {
  status: number;
  headers: Record<string, string>;
  body: Record<string, string> | string | null;
  method: string;
  url: string;
  response: Record<string, unknown>;
}

export type ScaffoldGenerator = () => Scaffold;
export type ResponseGenerator = () => Record<string, unknown>;

export function GET() {}
export function POST() {}
export function PUT() {}
export function PATCH() {}
export function DELETE() {}
export function QUERY() {}

async function mock() {}

mock(GET('/users/1', () => {}));
