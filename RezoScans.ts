import {
  Source,
  Manga,
  Chapter,
  ChapterDetails,
  HomeSection,
  SearchRequest,
  PagedResults,
  SourceInfo,
  MangaUpdates,
  TagType,
  TagSection
} from "paperback-extensions-common";

import { parseSearch, isLastPage, parseViewMore } from "./RezoScansParser";

const DOMAIN = 'https://rezoscan.org/';

export const RezoScansInfo: SourceInfo = {
  version: '1.0.0',
  name: 'RezoScans',
  icon: 'icon.png', // Add a 512x512 icon.png to your repo if possible
  author: 'YourName',
  authorWebsite: 'https://github.com/yourusername',
  description: 'Custom extension for RezoScans (Manhwa/Manga)',
  websiteBaseURL: DOMAIN,
  contentRating: ContentRating.MATURE,
  sourceTags: [
    {
      text: "Recommended",
      type: TagType.BLUE
    }
  ]
};

export class RezoScans extends Source {
  baseUrl = DOMAIN;
  requestManager = createRequestManager({
    requestsPerSecond: 5,
    requestTimeout: 20000
  });

  override getMangaShareUrl(mangaId: string): string {
    return `${DOMAIN}series/${mangaId}`;
  }

  async getMangaDetails(mangaId: string): Promise<Manga> {
    const url = `${DOMAIN}series/${mangaId}`;
    const request = createRequestObject({
      url: url,
      method: "GET",
    });
    const response = await this.requestManager.schedule(request, 1);
    let $ = this.cheerio.load(response.data);
    // Parse title, image, description, genres, etc.
    let titles = [$('h1.page-title').text().trim()];
    let image = $('div.summary_image img').attr('src') ?? "";
    let desc = $('div.summary__content').text().trim();
    let status = $('div.post-status').text().includes('Ongoing') ? 1 : 0;
    let tags: TagSection[] = [];
    let genres = $('div.genres-content a').toArray().map(x => createTag({ id: $(x).attr('href') ?? '', label: $(x).text() }));
    if (genres.length > 0) {
      tags.push(createTagSection({ id: 'genres', label: 'Genres', tags: genres }));
    }

    return createManga({
      id: mangaId,
      titles: titles,
      image: image,
      status: status,
      desc: desc,
      tags: tags
    });
  }

  async getChapters(mangaId: string): Promise<Chapter[]> {
    const url = `${DOMAIN}series/${mangaId}`;
    const request = createRequestObject({
      url: url,
      method: "GET",
    });
    const response = await this.requestManager.schedule(request, 1);
    let $ = this.cheerio.load(response.data);
    let chapters: Chapter[] = [];
    for (let obj of $("li.wp-manga-chapter").toArray()) {
      let chapNum = parseFloat($(obj).text().trim().replace(/[^0-9.]/g, '')) || 0;
      let chapId = $('a', obj).attr('href')?.split('/').pop() ?? '';
      chapters.push(createChapter({
        id: chapId,
        chapNum: chapNum,
        name: $(obj).text().trim(),
        mangaId: mangaId,
        langCode: 'en'
      }));
    }
    return chapters;
  }

  async getChapterDetails(mangaId: string, chapterId: string): Promise<ChapterDetails> {
    const url = `${DOMAIN}chapter/${chapterId}`;
    const request = createRequestObject({
      url: url,
      method: "GET",
    });
    const response = await this.requestManager.schedule(request, 1);
    let $ = this.cheerio.load(response.data);
    let pages: string[] = [];
    for (let obj of $(".reading-content img").toArray()) {
      let page = $(obj).attr('data-src') || $(obj).attr('src') || '';
      if (page) pages.push(page.trim());
    }
    return createChapterDetails({
      id: chapterId,
      mangaId: mangaId,
      pages: pages,
      longStrip: false
    });
  }

  async getHomePageSections(sectionCallback: (section: HomeSection) => void): Promise<void> {
    let sections = [createHomeSection({
      id: 'latest',
      title: "Latest Updates",
      view_more: true,
    })];
    for (let section of sections) {
      sectionCallback(section);
      let url = `${DOMAIN}latest/`;
      const request = createRequestObject({
        url: url,
        method: "GET"
      });
      const response = await this.requestManager.schedule(request, 1);
      let $ = this.cheerio.load(response.data);
      section.items = // Parse manga tiles from HTML
      sectionCallback(section);
    }
  }

  // Add methods for search, view more, etc., as needed
  // For full implementation, see Paperback docs or example repos
}
