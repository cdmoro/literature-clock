# Literature Clock

A clock for book lovers that tells the time using quotes from literature. Support for multiple languages, themes, and more!

Based on the work of [Johannes Enevoldsen](https://twitter.com/JohsEnevoldsen) ([literature-clock](https://github.com/JohannesNE/literature-clock)) and [Jaap Meijers](http://www.eerlijkemedia.nl/) ([e-reader clock](https://www.instructables.com/id/Literary-Clock-Made-From-E-reader/)).

![373910718-c9d2543f-b95c-41d1-bcdc-2c5f7631cd1f](https://github.com/user-attachments/assets/15fedb98-8d39-418a-86fa-a7fd9d0077d2)

## Features

- Zen mode: remove all the distractions ([link](https://literatureclock.netlify.app/?zen=true))
- Work mode: only shows quotes that are safe for work ([link](https://literatureclock.netlify.app/?work=true))
- [Screensaver mode](#screensaver): make the quotes dance around the screen! ([link](https://literatureclock.netlify.app/?screensaver=true))
- Languages: supports English, Spanish, Portuguese, French, and Italian (by default, it will try to use the system language)
  - Random language: see a quote in a different language each minute, isn't that cool? ([link]([https://literatureclock.netlify.app/?locale=random](https://literatureclock.netlify.app/?random-locale=true)))
- [Themes](#themes): the clock has `colour themes` and `special themes` and each theme has light and dark variants, of course
  - Random colour theme: see a different colour theme each minute, isn't that even cooler? ([link](https://literatureclock.netlify.app/?theme=color-system))
- Fade effect
- Share your favourite quotes across your social media!
- Font personalization: if you don't like the default font of a theme, that's perfectly fine, we won't judge you, so you can change it for another using the `font` param!
- Progress bar: why? because it is cute :) (you can disable it if you don't like cute things, no problem)
- Responsive: no matter how long a quote is, it will always look good on desktop and mobile 😎
- Static mode: get rid of all the javascript event listener an control the clock only with query parameters
- All the settings are saved in the browser's local storage and they are updated in the URL without refreshing the page, thanks to History API

## Settings

The clock can be controlled using URL parameters, these parameters will overwrite the existing configuration

- `zen`: enable/disable Zen mode
- `work`: enable/disable Work mode
- `screensaver`: enable/disable Screensaver mode
- `locale`: set the locale
- `random-locale`: set random locale
- `theme`: set the theme
- `font`: set a custom font from Google Fonts (it will be available on the font selector input!)
- `fade`: enable/disable fade effect
- `progressbar`: enable/disable progressbar
- `show-time`: enable/disable the time at the top of the screen
- `static`: get rid of the menu and control the clock only with query parameters!

Developer settings

- `time`: get the quotes for a particular time ([link](https://literatureclock.netlify.app/?time=12:30))
- `quote`: test a quote before submitting it ([link](https://literatureclock.netlify.app/?quote=Hi%20mom!%20I%27m%20part%20of%20the%20Literature%20Clock!)) (it is no necessary to escape the quote by adding the special characters, just write the quote and the browser will add them)
- `index`: get a specific quote from the array of quotes instead of a random one

## Languages

There is support for the following languages (by default, it will try to use the system language):

- English
- Spanish
- Portuguese
- French
- Italian

Want to implement a new language? Sure thing, ping me and let's talk about it!

### About the quotes

Translations

All translations were made from the original CSV English file, sometimes the translations are not accurate (I used Google Translate, yes, I know), but it's fine, this is something that can be fixed easily, just one quote at a time. :) So far, these are the times that don't have quotes:

- 06:07
- 06:18
- 08:21
- 10:28
- 11:46
- 12:31
- 13:36
- 18:44

If you want to help you can:

- [Raise an issue to add a new quote](https://github.com/cdmoro/literature-clock/issues/new?template=add-quote.yml&labels=add-quote&title=%5B23%3A28%5D%5Ben%5D+Add+quote) or a new variant for a specific time
- Raise an issue reporting a bug related to a quote (i.e. a typo)
- Contact me and share your thoughts about a quote, the project, or anything you want :D
- Show me your love in the form of [coffees](https://buymeacoffee.com/cdmoro), [cafecitos](http://cafecito.app/cdmoro)
- Be my [Patreon](https://patreon.com/cdmoro)

## Screensaver

If you want to use this clock as a screensaver there are several ways to address this, although, it depends on the OS. I'm currently using the Mac OS solution and it worked like a charm. You can find more information here:

- Mac OS: Mac OS X Screen Saver powered by a Web View (https://github.com/liquidx/webviewscreensaver)
- Windows: Set Webpage as Screensaver in Windows 10 (https://www.youtube.com/watch?v=UovZwUlwwEs)
- Linux: Live Webpage as a Desktop Wallpaper on KDE Desktop (https://www.youtube.com/watch?v=_v1sJhBu25o)

## Themes

![splash](https://github.com/user-attachments/assets/d882b15c-0947-45ed-8456-25f56fb6083c)

## Development

### Web

To run the project you need to have Python, Node and NPM installed on your system.
  1. Clone the project
  1. Install NPM dependencies
  1. Run `npm run generate-times` to generate all the quote files
  1. Run `npm run dev` and voila! The clock will be automatically opened in your favorite browser.

### About quote generation

I used Python to generate the JSON files (one per time if the time has quotes) with the quotes. The script goes through all the CSV files (one per locale) and puts the files in the appropriate folders. Also, the script generates an additional JSON file with statistics per locale, such as the times with fewer quotes, the author with the most quotes, etc.

To generate the times, simply run `python .\scripts\generate_times.py` in the root folder. By default, the script will generate all the JSON files, if you want to generate the JSON files for a particular locale you can add it as a parameter, i.e. `.\scripts\generate_times.py en-US`.

## Technology stack

This project is possible thanks to the following projects:

- [Vite](https://vite.dev/)
- [Vitest](https://vitest.dev/)
- [Husky](https://typicode.github.io/husky/)
- [Netlify](https://www.netlify.com/)

## Credits

- [html2canvas-pro](https://yorickshan.github.io/html2canvas-pro/)
- [lunarphase-js](https://github.com/jasonsturges/lunarphase-js)
- [Picsum](https://picsum.photos/)

## Contact

Hi! I'm Carlos and you can find me here

- [Twitter](https://twitter.com/CarlosBonadeo)
- [LinkedIn](https://twitter.com/CarlosBonadeo)
