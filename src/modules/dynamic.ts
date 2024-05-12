export function getDayProgress() {
  const now = new Date();
  const seconds =
    now.getHours() * 3600 + now.getMinutes() * 60 + now.getSeconds();
  const progress = (seconds * 100) / 86400;

  return parseFloat(progress.toFixed(2));
}

export function getDayParameters() {
  const progress = getDayProgress();
  const actor = progress < 25 ? "moon" : "sun";
  let scene = "night";

  if (progress >= 25 && progress < 50) {
    scene = "sunrise";
  } else if (progress >= 50 && progress < 75) {
    scene = "sunset";
  } else if (progress >= 75) {
    scene = "dusk";
  }

  const opacity = parseFloat(
    (progress <= 50 ? progress / 50 : 1 - (progress / 50 - 1)).toFixed(2)
  );

  const actorLeft =
    progress <= 25 ? (progress * 100) / 25 : ((progress - 25) * 100) / 75;

  return {
    actor,
    scene,
    opacity,
    progress,
    actorLeft,
  };
}

export function setDayParameters() {
  const { opacity, actor, progress, scene, actorLeft } = getDayParameters();

  const root = document.querySelector<HTMLElement>(":root");
  root?.style.setProperty("--dynamic-opacity", opacity.toString());
  root?.style.setProperty("--actor-left", actorLeft.toString());
  root?.setAttribute("data-actor", actor);
  root?.setAttribute("data-progress", progress.toString());
  root?.setAttribute("data-scene", scene);
}
