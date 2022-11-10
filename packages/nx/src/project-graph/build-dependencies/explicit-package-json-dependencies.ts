import { defaultFileRead } from '../file-utils';
import { join } from 'path';
import {
  ProjectFileMap,
  ProjectGraph,
  ProjectGraphProjectNode,
} from '../../config/project-graph';
import { parseJson } from '../../utils/json';
import { getImportPath, joinPathFragments } from '../../utils/path';
import { Workspace } from '../../config/workspace-json-project-json';
import { ExplicitDependencyEntry } from './interfaces';

export function buildExplicitPackageJsonDependencies(
  workspace: Workspace,
  graph: ProjectGraph,
  filesToProcess: ProjectFileMap
) {
  const res: ExplicitDependencyEntry[] = [];
  let packageNameMap = undefined;
  Object.keys(filesToProcess).forEach((source) => {
    Object.values(filesToProcess[source]).forEach((f) => {
      if (isPackageJsonAtProjectRoot(graph.nodes, f.file)) {
        // we only create the package name map once and only if a package.json file changes
        packageNameMap = packageNameMap || createPackageNameMap(workspace);
        processPackageJson(source, f.file, graph, res, packageNameMap);
      }
    });
  });
  return res;
}

function createPackageNameMap(w: Workspace) {
  const res: Record<string, string> = {};
  for (let projectName of Object.keys(w.projects)) {
    try {
      const packageJson = parseJson(
        defaultFileRead(join(w.projects[projectName].root, 'package.json'))
      );
      res[packageJson.name ?? getImportPath(w.npmScope, projectName)] =
        projectName;
    } catch (e) {}
  }
  return res;
}

function isPackageJsonAtProjectRoot(
  nodes: Record<string, ProjectGraphProjectNode>,
  fileName: string
) {
  return Object.values(nodes).find(
    (projectNode) =>
      (projectNode.type === 'lib' || projectNode.type === 'app') &&
      joinPathFragments(projectNode.data.root, 'package.json') === fileName
  );
}

function processPackageJson(
  sourceProject: string,
  fileName: string,
  graph: ProjectGraph,
  collectedDeps: ExplicitDependencyEntry[],
  packageNameMap: { [packageName: string]: string }
) {
  try {
    const deps = readDeps(parseJson(defaultFileRead(fileName)));
    // the name matches the import path
    deps.forEach((d) => {
      // package.json refers to another project in the monorepo
      if (packageNameMap[d]) {
        collectedDeps.push({
          sourceProjectName: sourceProject,
          targetProjectName: packageNameMap[d],
          sourceProjectFile: fileName,
        });
      } else if (graph.externalNodes[`npm:${d}`]) {
        collectedDeps.push({
          sourceProjectName: sourceProject,
          targetProjectName: `npm:${d}`,
          sourceProjectFile: fileName,
        });
      }
    });
  } catch (e) {
    if (process.env.NX_VERBOSE_LOGGING === 'true') {
      console.log(e);
    }
  }
}

function readDeps(packageJsonDeps: any) {
  return [
    ...Object.keys(packageJsonDeps?.dependencies ?? {}),
    ...Object.keys(packageJsonDeps?.devDependencies ?? {}),
    ...Object.keys(packageJsonDeps?.peerDependencies ?? {}),
  ];
}
