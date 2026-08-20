import type { NodePlopAPI } from 'plop'

const moduleNamePattern = /^[a-z][a-z0-9]*(?:[-_ ][a-z0-9]+)*$/i

function validateModuleName(value: string): true | string {
  const name = value.trim()

  if (!name)
    return 'Module name is required'

  if (!moduleNamePattern.test(name))
    return 'Use letters and numbers separated by spaces, dashes, or underscores'

  return true
}

export default function configurePlop(plop: NodePlopAPI) {
  plop.setGenerator('module', {
    description: 'Create and register a modular Hono feature',
    prompts: [
      {
        type: 'input',
        name: 'name',
        message: 'Module name',
        validate: validateModuleName,
      },
    ],
    actions: [
      {
        type: 'add',
        path: 'src/modules/{{dashCase name}}/index.ts',
        templateFile: 'plop-templates/module/index.ts.hbs',
        abortOnFail: true,
      },
      {
        type: 'add',
        path: 'src/modules/{{dashCase name}}/{{dashCase name}}.schema.ts',
        templateFile: 'plop-templates/module/schema.ts.hbs',
        abortOnFail: true,
      },
      {
        type: 'add',
        path: 'src/modules/{{dashCase name}}/{{dashCase name}}.repository.ts',
        templateFile: 'plop-templates/module/repository.ts.hbs',
        abortOnFail: true,
      },
      {
        type: 'add',
        path: 'src/modules/{{dashCase name}}/{{dashCase name}}.service.ts',
        templateFile: 'plop-templates/module/service.ts.hbs',
        abortOnFail: true,
      },
      {
        type: 'add',
        path: 'src/modules/{{dashCase name}}/{{dashCase name}}.routes.ts',
        templateFile: 'plop-templates/module/routes.ts.hbs',
        abortOnFail: true,
      },
      {
        type: 'modify',
        path: 'src/app.ts',
        pattern: /(\/\/ plop:module-imports)/,
        template: 'import { create{{pascalCase name}}Module } from \'./modules/{{dashCase name}}\'\n$1',
      },
      {
        type: 'modify',
        path: 'src/app.ts',
        pattern: /( {2}\/\/ plop:module-routes)/,
        template: '  app.route(\'/api/v1/{{dashCase name}}\', create{{pascalCase name}}Module())\n$1',
      },
    ],
  })
}
