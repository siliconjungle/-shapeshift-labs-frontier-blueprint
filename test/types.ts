import {
  compileBlueprintCatalog,
  compileBlueprintProjection,
  createBlueprint,
  createBlueprintCatalog,
  createBlueprintInstance,
  materializeBlueprintInstance,
  type FrontierBlueprint,
  type FrontierBlueprintCatalog,
  type FrontierBlueprintInstance,
  type FrontierBlueprintMaterialization,
  type FrontierBlueprintProjection
} from '../dist/index.js';

const blueprint: FrontierBlueprint = createBlueprint({
  id: 'card.task.v1',
  template: {
    id: '{{instanceId}}',
    title: { $param: 'title', default: 'Untitled' },
    done: false
  }
});

const instance: FrontierBlueprintInstance = createBlueprintInstance({
  id: 'task-1',
  blueprint,
  params: { title: 'Ship' },
  overrides: { '/done': true }
});

const catalog: FrontierBlueprintCatalog = createBlueprintCatalog({
  blueprints: [blueprint],
  instances: [{
    id: 'task-1',
    blueprint,
    params: { title: 'Ship' },
    overrides: { '/done': true }
  }]
});

const compiled = compileBlueprintCatalog(catalog);
const materialized: FrontierBlueprintMaterialization = materializeBlueprintInstance(compiled, instance);
const projection: FrontierBlueprintProjection = compileBlueprintProjection(compiled, undefined, {
  targetPath: '/tasks'
});

materialized.value satisfies unknown;
projection.patch.length satisfies number;
compiled.getBlueprint('card.task.v1').id satisfies string;
