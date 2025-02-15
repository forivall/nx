import {
  createNonNxProjectDirectory,
  runCLI,
  runCommand,
  tmpProjPath,
  updateFile,
  getPackageManagerCommand,
  getSelectedPackageManager,
  getPublishedVersion,
} from '@nrwl/e2e/utils';
import { Workspaces } from 'nx/src/config/workspaces';

describe('add-nx-to-monorepo', () => {
  const packageManagerCommand = getPackageManagerCommand({
    packageManager: getSelectedPackageManager(),
  }).runUninstalledPackage;

  it('should not throw', () => {
    if (packageManagerCommand) {
      // Arrange
      createNonNxProjectDirectory();
      updateFile(
        'packages/package-a/package.json',
        JSON.stringify({
          name: 'package-a',
          scripts: {
            serve: 'some serve',
            build: 'some build',
            test: 'some test',
          },
        })
      );
      updateFile(
        'packages/package-b/package.json',
        JSON.stringify({
          name: 'package-b',
          scripts: {
            lint: 'some lint',
          },
        })
      );

      // Act
      const output = runCommand(
        `${packageManagerCommand} add-nx-to-monorepo@${getPublishedVersion()} -y`
      );
      // Assert
      expect(output).toContain('🎉 Done!');
    }
  });

  it('should build', () => {
    if (packageManagerCommand) {
      // Arrange
      createNonNxProjectDirectory();
      updateFile(
        'packages/package-a/package.json',
        JSON.stringify({
          name: 'package-a',
          scripts: {
            build: 'echo "build successful"',
          },
        })
      );

      // Act
      runCommand(
        `${packageManagerCommand} add-nx-to-monorepo@${getPublishedVersion()} -y`
      );
      const output = runCLI('build package-a');
      // Assert
      expect(output).toContain('build successful');
    }
  });
});
