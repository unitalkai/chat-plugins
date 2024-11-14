import { consola } from "consola";
import { cloneDeep, merge } from "lodash-es";
import path, { resolve } from "node:path";
import fs from "node:fs";

import { formatAndCheckSchema } from "./check";
import {
  config,
  localesDir,
  meta,
  plugins,
  pluginsDir,
  publicDir,
} from "./const";
import { checkDir, findDuplicates, readJSON, writeJSON } from "./utils";

const build = async () => {
  checkDir(publicDir);

  const pluginsIndex = {
    ...meta,
    plugins: [],
  };

  const list = {};

  for (const file of plugins) {
    if (file.isFile()) {
      const filePath = path.resolve(pluginsDir, file.name);
      if (filePath) {
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
};

await build();
