export function initBooleanSetting(name: string, defaultValue: boolean = false): boolean {
  const urlParams = new URLSearchParams(window.location.search);
  let value = defaultValue;

  if (localStorage.getItem(name)) {
    value = localStorage.getItem(name) === 'true';
  }

  if (urlParams.has(name)) {
    value = urlParams.get(name) === 'true';
  }

  return value;
}

export function setBooleanSetting(name: string, value: boolean = false) {
  document.body.classList.toggle(name, value);
  localStorage.setItem(name, value.toString());
}

export function toggleBooleanSetting(name: string): boolean {
  const value = !(localStorage.getItem(name) === 'true');
  setBooleanSetting(name, value);
  return value;
}

export function updateBooleanSettingButtonStatus(name: string, value: boolean) {
  const button = document.getElementById(name);
  button?.classList.toggle('active', value);
}

export function isBooleanSettingTrue(name: string) {
  return localStorage.getItem(name) === 'true';
}

export function initStringSetting(name: string, defaultValue: string) {
  const urlParams = new URLSearchParams(window.location.search);
  let value = defaultValue;

  if (localStorage.getItem(name)) {
    value = localStorage.getItem(name)!;
  }

  if (urlParams.has(name)) {
    value = urlParams.get(name)!;
  }

  return value;
}

export function getStringSetting(name: string) {
  return localStorage.getItem(name);
}

export function setStringSetting(name: string, value: string) {
  localStorage.setItem(name, value);
}

export function updateURL(name: string, value: string | boolean) {
  const urlParams = new URLSearchParams(window.location.search);

  if (value === false) {
    urlParams.delete(name);
  } else {
    urlParams.set(name, value.toString());
  }

  const url = urlParams.size ? `?${urlParams.toString()}` : '/';
  history.replaceState({}, '', url);
}

export function removeURLParam(name: string) {
  const urlParams = new URLSearchParams(window.location.search);
  urlParams.delete(name);

  const url = urlParams.size ? `?${urlParams.toString()}` : '/';
  history.replaceState({}, '', url);
}
