const MOON_PHASES = [
  "new",
  "waxing-crescent",
  "first-quarter",
  "waxing-gibbous",
  "full-moon",
  "waning-gibbous",
  "third-quarter",
  "waning-crescent",
];
const moonPhase = MOON_PHASES[Math.floor(Math.random() * MOON_PHASES.length)];
const urlParams = new URLSearchParams(window.location.search);
const testScene = urlParams.get("scene");
const testProgress = urlParams.get("progress");

export function getDayProgress() {
  const now = new Date();
  const seconds =
    now.getHours() * 3600 + now.getMinutes() * 60 + now.getSeconds();
  const progress = (seconds * 100) / 86400;

  return parseFloat(testProgress || progress.toFixed(2));
}

export function getDayParameters() {
  const progress = getDayProgress();
  // 9pm to 5am
  let scene = "night";

  // 5am to 12pm
  if (progress >= 20.83 && progress <= 50) {
    scene = "morning";
  } // 12pm to 5pm
  else if (progress > 50 && progress <= 70.83) {
    scene = "afternoon";
  } // 5pm to 9pm
  else if (progress > 70.83 && progress <= 87.5) {
    scene = "evening";
  }

  const opacity = parseFloat(
    (progress <= 50 ? progress / 50 : 1 - (progress / 50 - 1)).toFixed(2)
  );

  // const actorLeft =
  // progress <= 25 ? (progress * 100) / 25 : ((progress - 25) * 100) / 75;
  const actorLeft =
    progress >= 25 && progress <= 75
      ? ((progress - 25) * 100) / 50
      : progress > 75
      ? ((progress - 75) * 50) / 25
      : ((progress + 25) * 100) / 50;

  return {
    scene: testScene || scene,
    opacity,
    progress,
    actorLeft: parseFloat(actorLeft.toFixed(2)),
  };
}

export function setDayParameters() {
  const { opacity, progress, scene, actorLeft } = getDayParameters();

  if (!document.querySelector(".sun.moon")) {
    const actor = document.createElement("div");
    actor.classList.add("sun", "moon");
    actor.classList.toggle(moonPhase, scene === "night");
    document.querySelector("main")?.appendChild(actor);
  }

  const root = document.querySelector<HTMLElement>(":root");
  root?.style.setProperty("--day-opacity", opacity.toString());
  root?.style.setProperty("--actor-left", actorLeft.toString());
  root?.style.setProperty("--day-progress", progress.toString());
  root?.setAttribute("data-progress", progress.toString());
  root?.setAttribute("data-scene", scene);
}
