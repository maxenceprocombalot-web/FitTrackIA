// Metro — substitution du programme personnel hors build « perso ».
//
// Le fichier constants/personal-program.ts contient un programme d'entraînement
// CONFIDENTIEL. L'écran qui l'affiche est masqué en production via
// EXPO_PUBLIC_PERSO, mais masquer l'UI ne suffit PAS : expo-router inclut
// statiquement toutes les routes, donc le contenu du fichier se retrouvait
// malgré tout dans le bundle — et serait extractible d'un .ipa publié.
//
// On redirige donc l'import vers un stub vide dès que EXPO_PUBLIC_PERSO !== '1'.
// Le vrai fichier n'entre alors jamais dans le bundle public.
const { getDefaultConfig } = require('expo/metro-config');
const path = require('path');

const config = getDefaultConfig(__dirname);

const REAL = path.resolve(__dirname, 'constants/personal-program.ts');
const STUB = path.resolve(__dirname, 'constants/personal-program.example.ts');
const PERSO_BUILD = process.env.EXPO_PUBLIC_PERSO === '1';

const defaultResolve = config.resolver.resolveRequest;

config.resolver.resolveRequest = (context, moduleName, platform) => {
  const resolve = defaultResolve ?? context.resolveRequest;
  const resolved = resolve(context, moduleName, platform);
  if (!PERSO_BUILD && resolved?.type === 'sourceFile' && path.resolve(resolved.filePath) === REAL) {
    return { type: 'sourceFile', filePath: STUB };
  }
  return resolved;
};

module.exports = config;
