# Literature Clock

A clock that tells the time using quotes from literature. Support for multiple languages, themes, and more! Based on the work of [Johannes Enevoldsen](https://twitter.com/JohsEnevoldsen) ([literature-clock](https://github.com/JohannesNE/literature-clock)) and [Jaap Meijers](http://www.eerlijkemedia.nl/) ([e-reader clock](https://www.instructables.com/id/Literary-Clock-Made-From-E-reader/)).

## Features

- Zen mode: remove all the distractions (perfect for screensaver usage) ([link](https://literatureclock.netlify.app/?zen=true))
- Work mode: only shows quotes that are safe for work ([link](https://literatureclock.netlify.app/?work=true))
- Languages: supports English, Spanish, Portuguese, French and Italian
- Multilanguage: each minute you'll see a quote in a different language, isn't that cool? ([link](https://literatureclock.netlify.app/?locale=multi))
- Themes: the clock has color themes and `special themes` and each theme has light and dark variants
- Progress bar: At the bottom of the page there is a `progress bar`, so you can know when a quote is about to change :D
- Responsive: no matter how long is a quote, it always looks good in desktop and mobile
- All the quote elements have `aria-labels` to improve the Accessibility
- The configurations are saved in the browser's local storage

## Parameteres

The clock can be controlled using URL parameters, these parameters will overwrite the existing configuration

- `zen`: activate Zen mode
- `work`: activate Work mode
- `locale`: set the locale
- `theme`: set the theme
<!-- - `variant`: set the variant (light, dark, or system) -->
- `time`: get the quotes for a particular time ([link](https://literatureclock.netlify.app/?time=12:30))
- `quote`: test a quote before submitting it ([link](https://literatureclock.netlify.app/?quote=Hi%20mom!%20I%27m%20part%20of%20the%20Literature%20Clock!)). You don't need to escape the quote by adding the special characters, just write the quote and the browser will add them.

## Languages

All translations were made from the original CSV English file, sometimes the translation it's not accurate (I used Google Translate, yes, I know), and the time is not highlighted properly, but it's fine, this is something that can be fixed easily, just one quote at a time. Plus, I marked all the *bad* quotes with an asterisk so at some point all of them will be fixed.

In any case, if you want to help you can:

- [Raise an issue to add a new quote](https://github.com/cdmoro/literature-clock/issues/new?template=add-quote.yml&labels=add-quote&title=%5B23%3A28%5D%5Ben%5D+Add+quote) or a new variant for a specific time
- Raise an issue reporting a bug related to a quote (i.e. a typo)
- Contact me and share your thoughts about a quote, the project, or anything you want :D
- Show me your love in the form of [coffees](https://buymeacoffee.com/cdmoro)

## Themes

At the moment, the clock has seven color themes and four special themes, we expect to update or add more themes in the future! Here you can find some examples:

**Base**
| Light  | Dark  |
|---|---|
| ![image](https://github.com/cdmoro/literature-clock/assets/28156761/34b4bf28-22d1-41cc-ba99-0babab41a03c)  | ![image](https://github.com/cdmoro/literature-clock/assets/28156761/364d0788-e829-4d7e-b51a-19711d0964c0)  |

**Pink**
| Light  | Dark  |
|---|---|
| ![image](https://github.com/cdmoro/literature-clock/assets/28156761/4786b773-312c-470a-91d8-e5d650efe42e) | ![image](https://github.com/cdmoro/literature-clock/assets/28156761/793c1102-ca7e-4f89-9acd-7938910d1a81) |


**Orange**
| Light  | Dark  |
|---|---|
| ![image](https://github.com/cdmoro/literature-clock/assets/28156761/35e43ff5-263a-433e-9c44-0f0d33f0d643)  | ![image](https://github.com/cdmoro/literature-clock/assets/28156761/f9ed4700-fda0-4650-ac6e-c0ad8e3ac9a2)  |

**Elegant**
| Light  | Dark  |
|---|---|
| ![image](https://github.com/cdmoro/literature-clock/assets/28156761/4a2f97ce-2c0d-4f8e-88dd-1dc8c1e83caa) | ![image](https://github.com/cdmoro/literature-clock/assets/28156761/f74dfc56-e0e6-445f-a2fe-c01cdcedf7f5)  |

**Festive**
| Light  | Dark  |
|---|---|
| ![image](https://github.com/cdmoro/literature-clock/assets/28156761/e31dfc33-bf30-4025-818b-285479d3af4b) | ![image](https://github.com/cdmoro/literature-clock/assets/28156761/83197165-506b-4d0d-9974-92b066917c35)  |

## Development

The easiest way to run the clock is to run an HTTP server and open `index.html`. If you are a VSCode user, you might want to use the [Live Server](https://marketplace.visualstudio.com/items?itemName=ritwickdey.LiveServer) extension.

## Quotes: CSV to JSON

I used Python to generate the JSON files (one per time if the time has quotes) with the quotes. The script goes through all the CSV files (one per locale) and puts the files in the appropriate folders. Also, the script generates an additional JSON file with statistics about the locale, such as the times with fewer quotes, the author with the most quotes, etc. 

## Contact

Hi! I'm Carlos and you can find me here

- [Twitter](https://twitter.com/CarlosBonadeo)
- [LinkedIn](https://twitter.com/CarlosBonadeo)
