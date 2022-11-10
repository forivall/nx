import {
  convertNxGenerator,
  formatFiles,
  getProjects,
  getWorkspacePath,
  logger,
  normalizePath,
  ProjectConfiguration,
  readProjectConfiguration,
  Tree,
  updateJson,
  writeJson,
} from '@nrwl/devkit';
import { prompt } from 'enquirer';
import { getRelativeProjectJsonSchemaPath } from 'nx/src/generators/utils/project-configuration';
import { dirname } from 'path';
import { Schema } from './schema';
import { getProjectConfigurationPath } from './utils/get-project-configuration-path';
import { readNxJsonInTree } from '../../utils/ast-utils';
import {
  getRelativeProjectJsonSchemaPath,
  readNxJson,
  readWorkspace,
  updateProjectConfiguration,
} from 'nx/src/generators/utils/project-configuration';

export const SCHEMA_OPTIONS_ARE_MUTUALLY_EXCLUSIVE =
  '--project and --all are mutually exclusive';

export async function validateSchema(schema: Schema) {
  if (schema.project && schema.all) {
    throw SCHEMA_OPTIONS_ARE_MUTUALLY_EXCLUSIVE;
  }

  if (!schema.project && !schema.all) {
    schema.project = (
      await prompt<{ project: string }>([
        {
          message: 'What project should be converted?',
          type: 'input',
          name: 'project',
        },
      ])
    ).project;
  }
}

export async function convertToNxProjectGenerator(host: Tree, schema: Schema) {
  await validateSchema(schema);

  const projects = schema.all
    ? getProjects(host).entries()
    : ([[schema.project, readProjectConfiguration(host, schema.project)]] as [
        string,
        ProjectConfiguration
      ][]);

  for (const [project, configuration] of projects) {
    const configPath = getProjectConfigurationPath(configuration);
    if (host.exists(configPath)) {
      logger.warn(`Skipping ${project} since ${configPath} already exists.`);
      continue;
    }

    let projectJson = {
      name: undefined,
      $schema: getRelativeProjectJsonSchemaPath(host, configuration),
      ...configuration,
      root: undefined,
    };

    if (!projectJson.name) {
      projectJson.name = toProjectName(configuration.root, readNxJson(host));
    }

    writeJson(host, configPath, projectJson);

    const workspacePath = getWorkspacePath(host);
    if (workspacePath) {
      updateJson(host, workspacePath, (value) => {
        value.projects[project] = normalizePath(dirname(configPath));
        return value;
      });
    }
  }

  if (!schema.skipFormat) {
    await formatFiles(host);
  }
}

function toProjectName(directory: string, nxJson: any): string {
  let { appsDir, libsDir } = nxJson?.workspaceLayout || {};
  appsDir ??= 'apps';
  libsDir ??= 'libs';
  const parts = directory.split(/[\/\\]/g);
  if ([appsDir, libsDir].includes(parts[0])) {
    parts.splice(0, 1);
  }
  return parts.join('-').toLowerCase();
}

export default convertToNxProjectGenerator;

export const convertToNxProjectSchematic = convertNxGenerator(
  convertToNxProjectGenerator
);
