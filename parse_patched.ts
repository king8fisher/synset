import { XMLStream } from "jsr:@dbushell/xml-streamify@^0.3.0/stream";
//import { Node } from "jsr:@dbushell/xml-streamify@^0.3.0/node";
import {
  NodeType,
  ParseOptions,
} from "jsr:@dbushell/xml-streamify@^0.3.0/types";

const ignoreTypes: Partial<Record<NodeType, keyof ParseOptions>> = {
  [NodeType.COMMENT]: "ignoreComments",
  [NodeType.DECLARATION]: "ignoreDeclaration",
  [NodeType.DOCTYPE]: "ignoreDoctype",
} as const;

/**
 * Async generator function for parsing a streamed XML document
 * @param url      URL to fetch and parse
 * @param options  Parsing options {@link ParseOptions}
 * @returns Yields parsed XML nodes {@link Node}
 */
export async function* parse(
  url: string | URL,
  options?: ParseOptions,
): AsyncGenerator<Node, Node | void, void> {
  url = new URL(url);

  const document = new Node("@document");

  try {
    const init = { ...options?.fetchOptions };
    if (options?.signal) {
      init.signal = options.signal;
    }
    const response = await fetch(url, init);
    if (!response.ok || !response.body) {
      throw new Error(`Bad response`);
    }

    const stream = response.body.pipeThrough(new XMLStream(), {
      signal: options?.signal,
    });

    // Set root document as current node
    let node = document;

    for await (const [type, value] of stream) {
      if (options?.signal?.aborted) {
        break;
      }
      // Skip whitespace
      if (type === NodeType.TEXT) {
        if (options?.ignoreWhitespace !== false && value.trim().length === 0) {
          continue;
        }
      }
      // Handle other ignored types
      if (type in ignoreTypes && options?.[ignoreTypes[type]!] === false) {
        const newNode = new Node(type, node, value);
        node.addChild(newNode);
        yield newNode;
        continue;
      }
      // Handle elements
      if (type === NodeType.ELEMENT) {
        const name = value.match(/<\/?([\w:.]+)/)![1];
        // Handle self-closing element
        if (value.endsWith("/>")) {
          const newNode = new Node(name, node, value);
          node.addChild(newNode);
          yield newNode;
          continue;
        }
        // Handle closing element
        if (value.startsWith("</")) {
          yield node;
          node = node.parent!;
          continue;
        }
        // Handle opening element
        const newNode = new Node(name, node, value);
        node.addChild(newNode);
        node = newNode;
        continue;
      }
      // Handle other types
      node.addChild(new Node(type, node, value));
    }
  } catch (err) {
    if (options?.silent === false) {
      throw err;
    }
  }
  return document;
}

/**
 * Module exports an XML Node class.
 *
 * @module
 */
/** XML node with helper methods to read data and traverse the tree */
export class Node {
  #type: string;
  #children: Array<Node>;
  #parent?: Node;
  #attr?: Record<string, string>;
  #raw?: string;

  constructor(type: string, parent?: Node, raw?: string) {
    this.#type = type;
    this.#parent = parent;
    this.#raw = raw;
    this.#children = [];
  }

  get type(): string {
    return this.#type;
  }

  get raw(): string {
    return this.#raw ?? "";
  }

  get parent(): Node | undefined {
    return this.#parent;
  }

  get children(): Array<Node> {
    return this.#children;
  }

  get attributes(): Record<string, string> {
    if (this.#attr) {
      return this.#attr;
    }
    // Setup and parse attributes on first access
    this.#attr = {};
    if (this.raw) {
      const regex = /([\w:.-]+)\s*=\s*["](.*?)["]/g;
      regex.lastIndex = 0;
      let match: RegExpExecArray | null;
      while ((match = regex.exec(this.raw)) !== null) {
        this.#attr[match[1]] = match[2];
      }
    }
    return this.#attr;
  }

  get innerText(): string {
    if (this.children.length) {
      let text = "";
      for (const child of this.children) {
        text += child.innerText;
      }
      return text;
    }
    return (this.raw.match(/<!\[CDATA\[(.*?)]]>/s) ?? [, this.raw])[1];
  }

  addChild(child: Node): void {
    this.#children.push(child);
  }

  /**
   * Returns true if node and parents match the key hierarchy
   * @param keys - XML tag names
   */
  is(...keys: Array<string>): boolean {
    if (!keys.length) return false;
    let parent: Node | undefined;
    for (const key of keys.toReversed()) {
      parent = parent ? parent.parent : this;
      if (parent?.type !== key) {
        return false;
      }
    }
    return true;
  }

  /**
   * Return the first child matching the key
   * @param key - XML tag name
   */
  first(key: string): Node | undefined {
    return this.children.find((n) => n.type === key);
  }

  /**
   * Return all children matching the key hierarchy
   * @param keys - XML tag names
   */
  all(...keys: Array<string>): Array<Node> {
    let nodes: Array<Node> | undefined = this.children;
    let found: Array<Node> = [];
    for (const [i, k] of Object.entries(keys)) {
      if (Number.parseInt(i) === keys.length - 1) {
        found = nodes.filter((n) => n.type === k);
        break;
      }
      nodes = nodes?.find((n) => n.type === k)?.children;
      if (!nodes) return [];
    }
    return found;
  }
}
