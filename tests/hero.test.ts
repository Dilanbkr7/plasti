import assert from "node:assert/strict";
import { test } from "node:test";
import {
  chapterProgress,
  heroChapters,
  heroSettings,
  heroScrollProgress,
} from "../components/hero/hero-content";
import { planterCollection } from "../lib/catalog/planter-collection";

test("hero shows three distinct shapes from the current catalog at its navigation stops", () => {
  assert.deepEqual([0, 0.48, 0.9].map(chapterProgress), [0, 1, 2]);
  assert.equal(new Set(heroChapters.map((c) => c.image)).size, 3);
  for (const chapter of heroChapters)
    assert.ok(
      planterCollection.some(
        (p) =>
          p.slug === chapter.id &&
          chapter.image === `/images/coleccion/${p.slug}.webp`,
      ),
    );
  assert.equal(heroSettings.scrollScrub, true);
  for (let i = 0; i < 100; i++)
    assert.ok(chapterProgress(i / 100) <= chapterProgress((i + 1) / 100));
});
test("hero synchronizes from native scroll geometry after anchor navigation and viewport changes", () => {
  for (const height of [600, 900]) {
    for (const [index, stop] of heroSettings.sceneStops.entries()) {
      const progress = heroScrollProgress(
        -height * 2 * stop,
        height * 3,
        height,
      );
      assert.equal(Math.round(chapterProgress(progress)), index);
    }
    assert.equal(heroScrollProgress(100, height * 3, height), 0);
    assert.equal(heroScrollProgress(-height * 4, height * 3, height), 1);
  }
  assert.equal(heroScrollProgress(-100, 600, 600), 0);
});
test("sticky navigation offsets the hero start without shortening its scroll travel", () => {
  for (const [viewport, header] of [
    [900, 83],
    [640, 56],
  ]) {
    const heroHeight = 3 * viewport - header;
    const stageHeight = viewport - header;
    const travel = heroHeight - stageHeight;
    for (const [index, stop] of heroSettings.sceneStops.entries()) {
      const top = header - travel * stop;
      const progress = heroScrollProgress(top, heroHeight, stageHeight, header);
      assert.equal(Math.round(chapterProgress(progress)), index);
    }
    assert.equal(
      heroScrollProgress(header - travel, heroHeight, stageHeight, header),
      1,
    );
  }
});
