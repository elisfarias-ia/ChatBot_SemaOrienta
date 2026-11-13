// @ts-check
import { describe, expect, it } from "vitest";
import { normalizeWhitespace, splitText } from "./split-text.js";

describe("normalizeWhitespace", () => {
  it("junta espaços repetidos e limita quebras de linha", () => {
    expect(normalizeWhitespace("  a   b\t\tc\n\n\n\nd  ")).toBe("a b c\n\nd");
  });
});

describe("splitText", () => {
  it("retorna lista vazia para texto vazio", () => {
    expect(splitText("   ", { maxChars: 10 })).toEqual([]);
  });

  it("mantém texto curto em um único trecho", () => {
    expect(splitText("licença ambiental", { maxChars: 50 })).toEqual(["licença ambiental"]);
  });

  it("divide em trechos de até maxChars sem sobreposição", () => {
    expect(splitText("abcdefghij", { maxChars: 4 })).toEqual(["abcd", "efgh", "ij"]);
  });

  it("aplica sobreposição entre trechos vizinhos", () => {
    expect(splitText("abcdefghij", { maxChars: 4, overlap: 2 })).toEqual([
      "abcd",
      "cdef",
      "efgh",
      "ghij",
    ]);
  });

  it("rejeita opções inválidas", () => {
    expect(() => splitText("x", { maxChars: 0 })).toThrow(RangeError);
    expect(() => splitText("x", { maxChars: 4, overlap: 4 })).toThrow(RangeError);
  });
});
