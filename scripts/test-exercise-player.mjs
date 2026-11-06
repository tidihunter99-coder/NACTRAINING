import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const component = await readFile("src/components/student/exercise-media.tsx", "utf8");
const styles = await readFile("src/app/globals.css", "utf8");

assert.match(component, /controls muted/);
assert.match(component, /playsInline/);
assert.match(component, /preload="metadata"/);
assert.match(component, /onLoadStart/);
assert.match(component, /Demonstração indisponível/);
assert.match(component, /Tentar novamente/);
assert.match(component, /setReloadAttempt/);
assert.match(component, /attempt=/);
assert.match(styles, /\.student-hero-video[^}]*object-fit: contain/);
console.log("EXERCISE_PLAYER_STATIC_TEST_PASS: vertical media, loading, failure and protected retry controls");
