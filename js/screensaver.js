export function screensaver() {
  const quote = document.getElementById('quote');
  quote.style.transition = `transform 2s linear`;

  const getRandomNumber = (min, max) => Math.random() * (max - min) + min;
  const scale = getRandomNumber(0.5, 1);
  const windowHeight = window.innerHeight - 110 - 30;
  const windowWidth = window.innerWidth - 30;
  const quoteHeight = quote.offsetHeight * scale;
  const quoteWidth = quote.offsetWidth * scale;

  const xRange = (windowWidth - quoteWidth) / 2;
  const yRange = (windowHeight - quoteHeight) / 2;

  quote.style.transform = `scale(${scale}) translate(${getRandomNumber(xRange * -1, xRange)}px, ${getRandomNumber(yRange * -1, yRange)}px)`;
}
