/**
 * Completa o app.json com o que é de cada conta e não vai para o git:
 *
 *   EAS_PROJECT_ID        id do projeto no EAS (necessário para o push remoto)
 *   EAS_OWNER             dono do projeto no EAS
 *   GOOGLE_SERVICES_JSON  caminho do google-services.json (FCM no Android)
 *   GOOGLE_SERVICES_PLIST caminho do GoogleService-Info.plist (iOS)
 *   APP_BUNDLE_ID         troca com.example.calendo pelo seu identificador
 *
 * Sem nada disso o app roda normalmente (Expo Go / dev build) e só o push
 * remoto fica desligado; os lembretes locais continuam funcionando.
 */
module.exports = ({ config }) => {
  const env = process.env;
  const next = { ...config, ios: { ...config.ios }, android: { ...config.android } };

  if (env.APP_BUNDLE_ID) {
    next.ios.bundleIdentifier = env.APP_BUNDLE_ID;
    next.android.package = env.APP_BUNDLE_ID;
  }
  if (env.GOOGLE_SERVICES_JSON) {
    next.android.googleServicesFile = env.GOOGLE_SERVICES_JSON;
  }
  if (env.GOOGLE_SERVICES_PLIST) {
    next.ios.googleServicesFile = env.GOOGLE_SERVICES_PLIST;
  }
  if (env.EAS_PROJECT_ID) {
    next.extra = { ...next.extra, eas: { projectId: env.EAS_PROJECT_ID } };
  }
  if (env.EAS_OWNER) {
    next.owner = env.EAS_OWNER;
  }

  return next;
};
