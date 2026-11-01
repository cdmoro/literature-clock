import COMMON_SETTINGS from '../strings/common/settings.json';
import WEB_SETTINGS from '../strings/web/settings.json';

const SETTINGS: Record<string, Record<string, string>> = Object.fromEntries(
  Object.entries(COMMON_SETTINGS).map(([locale, strings]) => [
    locale,
    { ...strings, ...WEB_SETTINGS[locale as keyof typeof WEB_SETTINGS] },
  ]),
);

export default SETTINGS;
