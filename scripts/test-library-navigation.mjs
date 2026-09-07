import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { stripTypeScriptTypes } from "node:module";

const source = await readFile(new URL("../lib/trace/library-navigation.ts", import.meta.url), "utf8");
const { libraryReturnPath } = await import(`data:text/javascript;base64,${Buffer.from(stripTypeScriptTypes(source)).toString("base64")}`);
const search = (returnTo) => `?${new URLSearchParams({ returnTo })}`;
assert.equal(libraryReturnPath(""), null);
assert.equal(libraryReturnPath(search("/library/")), "/library/");
assert.equal(libraryReturnPath(search("/library/?q=pepper&learning=ready")), "/library/?q=pepper&learning=ready");
for (const value of ["https://evil.test/library/", "//evil.test/library/", "/library/../", "/library/other/", "javascript:alert(1)", "/session/core-25/"]) {
  assert.equal(libraryReturnPath(search(value)), null, `Reject unexpected return path: ${value}`);
}
console.log("Library return links: local filtered route preserved; external and unexpected paths rejected.");
