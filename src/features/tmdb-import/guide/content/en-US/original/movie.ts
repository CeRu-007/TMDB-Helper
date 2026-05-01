export const content = `# Primary Facts

## Original Movie Language

The purpose of this field is to try and pair a language with the "original version of the film". Most of the time this is simple, a movie like Avatar is an English film with an English title. However in practice, this can be quite complicated and confusing.

One example is Le fabuleux destin d'Amélie Poulain. This is a French title for a French film, therefore it should be marked as French.

Part of the reason this field exists is to be able to have meta data around the "original entry". It's kind of like setting up a default translation. This relationship can be very confusing at times though.

Bonjour Tristesse was released as an English movie in the United States and United Kingdom. Even though the title is French, we'll mark this one as English.

One last example might be Boy 7, which was released as a Dutch film yet has an English title. Since we're trying to pair this field with the "original version of the film", we'll mark this as Dutch.

## Original Title

The original title is usually the title of the original version of the film when it is first officially released locally.

**Original Version:** The original title should always be the title used in the original version of the film.

**Official Release:** The original title is subject to change until a movie is officially released theatrically, physically or digitally, or until it airs on television. The original title should be the title used for the first official release, not a title only used as a working title before the release or a title only used for festival screenings.

**Local Release:** In some rare cases, a movie will first be released in its original language in a non-producing country under a different title. It's important to remember than we usually favour the original local title.

**Non-Roman Titles:** Unlike some other databases, we do not romanize our original titles. The original title should be in the original script (e.g. Левиафан, 우리들). The romanized original titles can be added as alternative titles.

**Sources:** When the promotional material use slightly different titles (e.g. Twelve Monkeys vs 12 Monkeys), we try to use the title as it is written in the original on-screen opening credits.

**Capitalization:** The guidelines for title capitalization are language dependent. Please familiarize yourself with the rules of the language(s) you are editing.

**Year, Country:** There should be no extra info such as the year of release "Coco (2017)" or a country code "LOL (US)" added to the titles.

**Movie Series:** We usually prioritize the accuracy of the titles over a consistency between the titles of a series.

## Translated Title

The translated title should be the first official translation. In other words, the title of the first—theatrical, physical, digital or TV—release.

The translated titles follow the same rules as the original title. The title should be in the original alphabet and follow the appropriate capitalization rules.

The festival title should be moved to the alternative title section if the movie is first released under a different title.

**Locked Blank:** The translated title field should be left blank and locked when the translated title is the same as the original title. Please do not re-add the original title as a translated title.

The only exception is languages with two different translations (French, Mandarin, Portuguese, Spanish, German and Arabic). They work a little differently. For example, a fr-CA translated title can be added to a French movie if it is different from the original fr-FR title.

**No Official Release:** The translated title field should be left blank if there is no official translation. Please do not add unofficial translations.

**Chinese Titles:** There are four different Chinese translations:
- zh-CN is only the first official title used in Mainland China
- zh-HK is only the first official title used in Hong Kong
- zh-TW is only the first official title used in Taiwan
- zh-SG is only the first official title used in Singapore

## Taglines

A movie tagline is usually a short promotional text used on the poster.

Most movies have multiple taglines. Enter each one separately.

If certain letters or words were capitalized for effect in the original tagline, use the same capitalization here, otherwise use standard sentence capitalization.

The Translated Tagline field is reserved for the tagline used on the official local posters in each country. Please do not add unofficially translated taglines.

Leave the field blank when appropriate. No movie titles. No synopsis. No actors. No genres. No made up taglines.

## Overviews

Overviews should describe the plot of the movie. They should be to the point, spoiler-free and brief. A few lines at most.

- No (actor name) or any other technical info. Do not use the overview field to highlight award nominations or wins.
- Overviews should be objective and neutral. Avoid using words such as fantastic, awful, box office success or flop.
- Overviews should be timely. Avoid words like "new" or "upcoming."
- It is best to leave the title of the movie out of the overview.
- No source (source: moviewebsite.org) or written by credits. Please do not copy/paste overviews from IMDb, Fernsehserien or other websites protected by copyright laws.
- Good sources for overviews usually are the official website, press releases, press kits, and the websites of the production companies and distributors. However, the text should be edited to conform to our rules.
- If you can't find a good overview, please leave the field blank. Do not add text such as "No overview found."
- Links are not allowed. Self-publicity and any suspected wrongdoing will result in a ban.

## Movie Status

- **Rumored:** movies are accepted, but it's better to wait until a movie officially goes into production.
- **In Production:** Principal photography has started or is imminent.
- **Post Production:** Principal photography is completed.
- **Released:** The TMDB-Bot is currently programmed to automatically update the status to "Released" 4 days before the world premiere.

Cancelled movies and rumoured movies without any new news within 2 years will be deleted.

## Adult Movie?

In general, the adult flag is to be used for hardcore pornography.

18+ erotic movies should not be flagged as adult movies (e.g. Fifty Shades of Grey, Nymphomaniac).

Full length movies are set to adult:true if they have a minimum of two hardcore scenes in their original version. Short films are set to adult:true if they have one hardcore scene.

Notable exceptions: movies originally released as regular movies and reviewed as movies by critics.

## Softcore Movie?

We use the "softcore" flag to help identify content that is primarily erotic in nature, but not explicit hardcore pornography. This is the correct flag to set for 18+ erotic movies and TV shows.

Some examples of what we classify as softcore pornography are Japanese pink films (ピンク映画), Vivamax movies released in The Philippines and a specific category of modern erotic movies made in South Korea.

## Convert to Collection?

Collections are a convenient way of grouping sequels together on TMDb. This field should always be set to "No" and locked blank for movies.

## Video?

The video field helps us differentiate types of content that aren't truly movies including but not limited to: official compilations, best of, filmed sport events, music concerts, plays or stand-up show, fitness video, health video, live movie theater events (art, music), and how-to DVDs.

A few notable exceptions allowed as regular movies are:
- Content theatrically released as a proper movie
- Content reviewed like a movie by critics
- Original TV specials or Netflix specials

**Compilations:** We do not allow all kinds of professionally released episode compilations. The type of compilation that are allowed are, for example, random episodes put together into a "movie" (e.g. a Halloween or Christmas themed compilation). However, seasons methodically split into volumes or parts are not allowed.

## Runtime

The runtime must be added for each translation. Only the original runtime since we don't support multiples versions for the moment.

- The runtime should be entered in minutes (e.g. one hour is added as "60").
- The runtime should always be rounded up. A movie that is 93 minutes and 57 seconds should be entered as 94.
- The runtime should always be all the way to the end of the movie, including end credits.

## Budget & Revenue

The budget and revenue are in American Dollar (USD). For example, a 10 million budget should be entered as 10000000.

Both periods and comas are used as a separator between dollar and cents.

**US Movies:** Worldwide box office numbers if they are available. Otherwise US only is fine.

**Non-US Movies:** The local currency can be put into a currency converter to get the value in US dollar.

**Inflation:** The budget and revenue numbers should not be adjusted for inflation.

**Sources:** Recommended resources for box office revenue information: Box Office Mojo and The Numbers.

## Homepage

The movie homepages are supported for all translations. Each language can have its own homepage.

**Official Links:** Only official links are allowed. No third party websites. No IMDb/Wikipedia. No Facebook/Twitter/Instagram or other social media websites.

When there is no official movie website, the producer or main distributor's website is allowed.

Links to streaming services (e.g. Netflix, Hulu, Crackle, YouTube Red, Amazon Video) are only allowed when they are the main (first) distributor.

No promotional links or links to the full—or partial—film.

**Format:** The web address should start with http:// or https://. Dead homepage links should be replaced or removed.

**Adult Pages:** For adult entries, homepage links should not be added.

## Spoken Languages

Only the main languages spoken in the original version. No translated/dubbed languages.

"No Language" should be used for movies without spoken dialogue.

The sign languages keyword can be used when a big part of a movie is told in a sign language.
`
