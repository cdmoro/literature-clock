export function getBooleanSetting(name, defaultValue = false) {
  const urlParams = new URLSearchParams(window.location.search);
  let value = defaultValue;

  if (localStorage.getItem(name)) {
    value = localStorage.getItem(name) === "true";
  }

  if (urlParams.has(name)) {
    value = urlParams.get(name) === "true";
  }

  return value;
}

export function setBooleanSetting(name, value = false, deleteUrlParam = false) {
  document.body.classList.toggle(name, value);
  localStorage.setItem(name, value);

  const urlParams = new URLSearchParams(window.location.search);
  if (deleteUrlParam && urlParams.has(name)) {
    urlParams.delete(name);
    window.location.search = urlParams.toString();
  }
}

export function toggleBooleanSetting(name) {
  const value = !(localStorage.getItem(name) === "true");
  setBooleanSetting(name, value);
  return value;
}

export function updateBooleanSettingButtonStatus(name, value) {
  const button = document.getElementById(name);
  button.classList.toggle("active", value);
}

export function isBooleanSettingTrue(name) {
  return localStorage.getItem(name) === "true";
}

export function getStringSetting(name, defaultValue) {
  const urlParams = new URLSearchParams(window.location.search);
  let value = defaultValue;

  if (localStorage.getItem(name)) {
    value = localStorage.getItem(name);
  }

  if (urlParams.has(name)) {
    value = urlParams.get(name);
  }

  return value;
}

export function setStringSetting(name, value, deleteUrlParam = false) {
  localStorage.setItem(name, value);

  const urlParams = new URLSearchParams(window.location.search);
  if (deleteUrlParam && urlParams.has(name)) {
    urlParams.delete(name);
    window.location.search = urlParams.toString();
  }
}
