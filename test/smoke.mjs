import assert from 'node:assert';
import { applyPatch } from '@shapeshift-labs/frontier';
import {
  compileBlueprintCatalog,
  compileBlueprintOverridePatch,
  compileBlueprintPatch,
  compileBlueprintProjection,
  commitBlueprintInstance,
  commitBlueprintPatch,
  createBlueprint,
  createBlueprintCatalog,
  createBlueprintInstance,
  createBlueprintProof,
  createBlueprintRegistryGraph,
  decodeBlueprintJsonl,
  encodeBlueprintJsonl,
  materializeBlueprintInstance,
  redactBlueprintValue,
  validateBlueprintCatalog
} from '../dist/index.js';

const enemy = createBlueprint({
  id: 'enemy.slime.v1',
  version: '1',
  template: {
    id: '{{instanceId}}',
    type: 'enemy',
    hp: { $param: 'hp', default: 20 },
    sprite: 'slime',
    tags: ['hostile', '{{param.biome}}'],
    loot: { coin: 2, rareDrop: 'gel' },
    scene: {
      id: '{{id.root}}',
      mode: '2d',
      local: {
        x: { $param: 'x', default: 0 },
        y: { $param: 'y', default: 0 }
      },
      userData: { entityId: '{{instanceId}}' }
    }
  },
  params: { biome: 'cave' },
  variants: {
    elite: {
      params: { hp: 40 },
      overrides: {
        '/sprite': 'slime-elite',
        '/loot/coin': 8
      }
    }
  },
  resources: ['sprite:slime'],
  dependencies: ['tileset:cave'],
  metadata: { secretToken: 'do-not-leak' }
});

const instance = createBlueprintInstance({
  id: 'enemy-42',
  blueprint: enemy,
  variant: 'elite',
  params: { x: 12, y: 4 },
  overrides: { '/hp': 35 },
  removals: ['/loot/rareDrop'],
  idMap: { root: 'scene-node-42' }
});

const catalog = createBlueprintCatalog({
  id: 'game.blueprints',
  blueprints: [enemy],
  instances: [instance],
  generatedAt: 100
});
const compiled = compileBlueprintCatalog(catalog);
assert.strictEqual(compiled.validation.valid, true);
assert.strictEqual(compiled.getBlueprint('enemy.slime.v1').id, enemy.id);
assert.strictEqual(compiled.getInstance('enemy-42').id, instance.id);

const materialized = materializeBlueprintInstance(compiled, instance, { includeInstanceMetadata: true });
assert.strictEqual(materialized.value.id, 'enemy-42');
assert.strictEqual(materialized.value.hp, 35);
assert.strictEqual(materialized.value.sprite, 'slime-elite');
assert.strictEqual(materialized.value.loot.coin, 8);
assert.strictEqual(Object.prototype.hasOwnProperty.call(materialized.value.loot, 'rareDrop'), false);
assert.strictEqual(materialized.value.scene.id, 'scene-node-42');
assert.strictEqual(materialized.value.scene.local.x, 12);
assert.strictEqual(materialized.value.$blueprint.id, 'enemy.slime.v1');
assert.ok(materialized.overridePaths.includes('/hp'));

const onePatch = compileBlueprintPatch(compiled, instance, { targetPath: '/entities/enemy-42', includeMaterialization: true });
assert.deepStrictEqual(onePatch.patch[0][1], ['entities', 'enemy-42']);
assert.strictEqual(onePatch.patch[0][2].hp, 35);
assert.strictEqual(onePatch.materialization.value.scene.id, 'scene-node-42');

const projection = compileBlueprintProjection(compiled, undefined, {
  targetPath: '/entities',
  includeMaterializations: true
});
assert.deepStrictEqual(projection.patch[0][1], ['entities', 'enemy-42']);
assert.strictEqual(projection.valuesById['enemy-42'].hp, 35);
assert.strictEqual(projection.materializations.length, 1);

let state = {
  blueprintInstances: { 'enemy-42': instance },
  entities: {}
};
state = applyPatch(state, projection.patch);
assert.strictEqual(state.entities['enemy-42'].sprite, 'slime-elite');

const edit = compileBlueprintOverridePatch(compiled, instance, [
  [0, ['hp'], 9],
  [1, ['loot', 'coin']]
], {
  instancePath: '/blueprintInstances/enemy-42',
  effectivePath: '/entities/enemy-42'
});
assert.strictEqual(edit.instance.overrides['/hp'], 9);
assert.ok(edit.instance.removals.includes('/loot/coin'));
assert.deepStrictEqual(edit.effectivePatch[0][1], ['entities', 'enemy-42', 'hp']);
state = applyPatch(state, edit.patch);
assert.strictEqual(state.blueprintInstances['enemy-42'].overrides['/hp'], 9);
assert.strictEqual(state.entities['enemy-42'].hp, 9);

const fakeStateTarget = {
  patch: null,
  commitPatch(patch) {
    this.patch = patch;
    return { changed: patch.length > 0 };
  }
};
assert.strictEqual(commitBlueprintInstance(fakeStateTarget, compiled, instance, { targetPath: '/entities/enemy-42' }).changed, true);
assert.deepStrictEqual(fakeStateTarget.patch[0][1], ['entities', 'enemy-42']);

const fakeSceneTarget = {
  patch: null,
  commit(patch) {
    this.patch = patch;
    return { changed: patch.length > 0, patch };
  }
};
commitBlueprintPatch(fakeSceneTarget, [[0, ['nodes', materialized.value.scene.id], materialized.value.scene]]);
assert.deepStrictEqual(fakeSceneTarget.patch[0][1], ['nodes', 'scene-node-42']);

const graph = createBlueprintRegistryGraph(compiled, { includeInstances: true, generatedAt: 110 });
assert.ok(graph.entries.some((entry) => entry.kind === 'blueprint' && entry.id === 'blueprint:enemy.slime.v1'));
assert.ok(graph.entries.some((entry) => entry.kind === 'blueprint-instance' && entry.id === 'blueprint-instance:enemy-42'));
assert.ok(graph.edges.some((edge) => edge.kind === 'depends-on' && edge.to === 'tileset:cave'));

const invalid = validateBlueprintCatalog(createBlueprintCatalog({
  blueprints: [enemy],
  instances: [{ id: 'bad', blueprint: 'missing' }]
}));
assert.strictEqual(invalid.valid, false);

const jsonl = encodeBlueprintJsonl([materialized, projection]);
assert.strictEqual(decodeBlueprintJsonl(jsonl).length, 2);
assert.notStrictEqual(createBlueprintProof(catalog, { generatedAt: 1 }).hash.length, 0);
assert.strictEqual(JSON.stringify(redactBlueprintValue(catalog)).includes('do-not-leak'), false);
