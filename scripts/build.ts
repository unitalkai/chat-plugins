import { consola } from "consola";
import { cloneDeep, merge } from "lodash-es";
import { resolve } from "node:path";
import fs from "node:fs";

import { formatAndCheckSchema } from "./check";
import {
  config,
  localesDir,
  meta,
  plugins, pluginsDataDir,
  pluginsDir,
  publicDir,
} from "./const";
import { checkDir, findDuplicates, readJSON, writeJSON } from "./utils";
import {custom} from "zod";

const build = async () => {
  checkDir(publicDir);

  const pluginsIndex = {
    ...meta,
    plugins: [],
  };

  const list = {};

  for (const file of plugins) {
    if (file.isFile() && fs.existsSync(resolve(pluginsDir, file.name))) {
      const data = readJSON(resolve(pluginsDir, file.name));
      const plugin = formatAndCheckSchema(data);
      if (!list[config.entryLocale]) list[config.entryLocale] = [];
      list[config.entryLocale].push(plugin);
      for (const locale of config.outputLocales) {
        if (!list[locale]) list[locale] = [];
        const localeFilePath = resolve(
          localesDir,
          file.name.replace(".json", `.${locale}.json`)
        );
        if (fs.existsSync(localeFilePath)) {
          const localeData = readJSON(localeFilePath);
          list[locale].push(merge(cloneDeep(plugin), localeData));
        }
      }
    }
  }

  for (const locale of [config.entryLocale, ...config.outputLocales]) {
    // @ts-ignore
    pluginsIndex.plugins = list[locale].sort(
      (a, b) => new Date(b.createdAt) - new Date(a.createdAt)
    );
    pluginsIndex.plugins = pluginsIndex.plugins.map(plugin=>{
      let customPlugin = plugin;
      customPlugin.manifest = `https://chat-plugins-git-scripted-kayros.vercel.app/manifest-${plugin.identifier}.json`
      return customPlugin
    });
    let tags: string[] = [];

    pluginsIndex.plugins.forEach((plugin) => {
      tags = [...tags, ...plugin.meta.tags];
    });

    tags = findDuplicates(tags);

    pluginsIndex.tags = tags;

    const name =
      locale === config.entryLocale ? `index.json` : `index.${locale}.json`;
    writeJSON(resolve(publicDir, name), pluginsIndex, false);
    consola.success(`build ${name}`);
  }

  for (const plugin of pluginsIndex.plugins){

    const avatarPath = resolve(pluginsDataDir, plugin.identifier,'avatar.webp');
    if(fs.existsSync(avatarPath)){
      const name = `avatar-${plugin.identifier}.webp`;
      fs.cpSync(avatarPath, resolve(publicDir, name))
      consola.success(`build ${name}`);
    }
    const manifestPath = resolve(pluginsDataDir, plugin.identifier,'manifest.json');
    if(fs.existsSync(manifestPath)){
      const manifestData = await readJSON(manifestPath);
      const name = `manifest-${plugin.identifier}.json`;
      writeJSON(resolve(publicDir, name), manifestData, false);
      consola.success(`build ${name}`);
    }

  }
};

await build();
