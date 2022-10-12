import * as ts from 'typescript';

type PredicateType<T> = T extends (value: any) => value is infer U ? U : never;

type DefinedNode = Extract<
  {
    [K in keyof typeof ts]: typeof ts[K] extends (node: ts.Node) => any
      ? PredicateType<typeof ts[K]>
      : never;
  }[keyof typeof ts],
  { kind: ts.SyntaxKind }
>;

type NodeForKind<K> = K extends DefinedNode['kind']
  ? Extract<DefinedNode, { kind: K }>
  : ts.Node;
export function findNodes<K extends ts.SyntaxKind, L extends ts.SyntaxKind>(
  node: ts.Node,
  kind: [K, L],
  max?: number
): NodeForKind<K | L>[];
export function findNodes<K extends ts.SyntaxKind>(
  node: ts.Node,
  kind: [K],
  max?: number
): NodeForKind<K>[];
export function findNodes<K extends ts.SyntaxKind>(
  node: ts.Node,
  kind: K | readonly K[],
  max?: number
): NodeForKind<K>[];
export function findNodes(
  node: ts.Node,
  kind: ts.SyntaxKind | ts.SyntaxKind[],
  max = Infinity
): ts.Node[] {
  if (!node || max == 0) {
    return [];
  }

  const arr: ts.Node[] = [];
  const hasMatch = Array.isArray(kind)
    ? kind.includes(node.kind)
    : node.kind === kind;
  if (hasMatch) {
    arr.push(node);
    max--;
  }
  if (max > 0) {
    for (const child of node.getChildren()) {
      findNodes(child, kind, max).forEach((node) => {
        if (max > 0) {
          arr.push(node);
        }
        max--;
      });

      if (max <= 0) {
        break;
      }
    }
  }

  return arr;
}
