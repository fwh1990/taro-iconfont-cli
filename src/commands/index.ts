#!/usr/bin/env node

import fs from 'fs';
import path from 'path';
import glob from 'glob';
import colors from 'colors';
import mkdirp from 'mkdirp';
import { Config, getConfig } from '../libs/getConfig';
import { fetchXml } from 'iconfont-parser';
import { PLATFORM_MAP } from '../libs/maps';
import { filterMiniProgramConfig, filterReactNativeConfig, filterReactWebConfig } from '../libs/filterConfig';
import { generateUsingComponent } from '../libs/generateUsingComponent';
import { getIconNames } from '../libs/getIconNames';
import parseLocalSvg from '../libs/parseLocalSvg';

const basePath = path.join(__dirname, '..');
const miniProgramBasePath = 'node_modules/mini-program-iconfont-cli';
const reactNativeBasePath = 'node_modules/react-native-iconfont-cli';
const reactWebBasePath = 'node_modules/react-iconfont-cli';
const miniProgramDir = fs.existsSync(path.join(basePath, miniProgramBasePath))
  ? path.join(basePath, miniProgramBasePath)
  : path.resolve(miniProgramBasePath);
const reactNativeDir = fs.existsSync(path.join(basePath, reactNativeBasePath))
  ? path.join(basePath, reactNativeBasePath)
  : path.resolve(reactNativeBasePath);
const reactWebDir = fs.existsSync(path.join(basePath, reactWebBasePath))
  ? path.join(basePath, reactWebBasePath)
  : path.resolve(reactWebBasePath);

const config = getConfig();

function getXmlData(config: Config) {
  if (config.symbol_url) {
    return fetchXml(config.symbol_url);
  } else if (config.local_svgs) {
    return parseLocalSvg(config);
  }

  return Promise.reject();
}

getXmlData(config)
  .then((result) => {
    if (!config.platforms.length) {
      console.warn(`\nPlatform is required.\n`);
      return;
    }

    mkdirp.sync(config.save_dir);
    glob.sync(path.resolve(config.save_dir, '*')).forEach((dirOrFile) => {
      if (fs.statSync(dirOrFile).isDirectory()) {
        glob.sync(path.resolve(dirOrFile, '*')).forEach((file) => fs.unlinkSync(file));
        fs.rmdirSync(dirOrFile);
      } else {
        fs.unlinkSync(dirOrFile);
      }
    });

    const iconNames = getIconNames(result, config);

    generateUsingComponent(config, iconNames);

    config.platforms.forEach((platform) => {
      let execFile = PLATFORM_MAP[platform] as string;

      if (!execFile) {
        console.warn(`\nThe platform ${colors.red(platform)} is not exist.\n`);
        return;
      }

      execFile = path.join(...execFile.split('/'));

      console.log(`\nCreating icons for platform ${colors.green(platform)}\n`);

      const execMethod = path.basename(execFile);

      if (execFile.indexOf('mini-program-iconfont-cli') >= 0) {
        execFile = execFile.replace(/mini-program-iconfont-cli/, miniProgramDir);
        require(execFile)[execMethod](result, filterMiniProgramConfig(config, platform));
      } else if (execFile.indexOf('react-native-iconfont-cli') >= 0) {
        const localSvg = [];
        execFile = execFile.replace(/react-native-iconfont-cli/, reactNativeDir);
        require(execFile)[execMethod](result, localSvg, filterReactNativeConfig(config, platform));

        // Remove .d.ts files
        glob.sync(path.resolve(config.save_dir, platform, '*.d.ts')).map((rnFilePath) => {
          fs.unlinkSync(rnFilePath);
        });
      } else {
        execFile = execFile.replace(/react-iconfont-cli/, reactWebDir);
        require(execFile)[execMethod](result, filterReactWebConfig(config, platform));

        // Remove .d.ts files
        glob.sync(path.resolve(config.save_dir, platform, '*.d.ts')).map((h5FilePath) => {
          fs.unlinkSync(h5FilePath);
        });
      }

      generateUsingComponent(config, iconNames, platform);
    });
  })
  .catch((e) => {
    console.error(colors.red(e.message || 'Unknown Error'));
    process.exit(1);
  });
